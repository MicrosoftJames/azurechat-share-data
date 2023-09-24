import { userHashedId } from "@/features/auth/helpers";
import { CosmosDBChatMessageHistory } from "@/features/langchain/memory/cosmosdb/cosmosdb";
import { LangChainStream, StreamingTextResponse } from "ai";
import { loadQAMapReduceChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { BufferWindowMemory } from "langchain/memory";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { insertPromptAndResponse } from "../chat-services/chat-service";
import { initAndGuardChatSession } from "../chat-services/chat-thread-service";
import { transformConversationStyleToTemperature } from "../chat-services/utils";
import { PromptGPTProps } from "../chat-services/models";
import { findRelevantDocuments } from "./chat-data-utils";

export const ChatDataSingleDocument = async (props: PromptGPTProps) => {
  const { lastHumanMessage, id, chatThread } = await initAndGuardChatSession(
    props
  );

  const chatModel = new ChatOpenAI({
    temperature: transformConversationStyleToTemperature(
      chatThread.conversationStyle
    ),
    streaming: true,
  });

  const cog_search_filter = `user eq '${await userHashedId()}' and chatThreadId eq '${id}'`
  const relevantDocuments = await findRelevantDocuments(
    lastHumanMessage.content,
    cog_search_filter
  );

  const chain = loadQAMapReduceChain(chatModel, {
    combinePrompt: defineSystemPrompt(),
  });

  const { stream, handlers } = LangChainStream({
    onCompletion: async (completion: string) => {
      await insertPromptAndResponse(id, lastHumanMessage.content, completion, []);
    },
  });

  const userId = await userHashedId();

  const memory = new BufferWindowMemory({
    k: 100,
    returnMessages: true,
    memoryKey: "history",
    chatHistory: new CosmosDBChatMessageHistory({
      sessionId: id,
      userId: userId,
    }),
  });

  chain.call(
    {
      input_documents: relevantDocuments,
      question: lastHumanMessage.content,
      memory: memory,
    },
    [handlers]
  );

  return new StreamingTextResponse(stream);
};

const defineSystemPrompt = () => {
  const system_combine_template = `Given the following context and a question, create a final answer. 
  If the context is empty or If you don't know the answer, politely decline to answer the question. Don't try to make up an answer.
  ----------------
  context: {summaries}`;

  const combine_messages = [
    SystemMessagePromptTemplate.fromTemplate(system_combine_template),
    HumanMessagePromptTemplate.fromTemplate("{question}"),
  ];
  const CHAT_COMBINE_PROMPT =
    ChatPromptTemplate.fromPromptMessages(combine_messages);

  return CHAT_COMBINE_PROMPT;
};
