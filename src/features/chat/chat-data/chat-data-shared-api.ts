"use server";

import { OpenAIStream, StreamingTextResponse, experimental_StreamData } from "ai";
import { insertPromptAndResponse } from "../chat-services/chat-service";
import { initAndGuardChatSession } from "../chat-services/chat-thread-service";
import { PromptGPTProps, MessageReferences, DataSource, DataSourcePrompt } from "../chat-services/models";
import { findRelevantDocuments } from "./chat-data-utils";
import { OpenAIClient }  from "@azure/openai";
import { AzureKeyCredential } from "@azure/openai";
import { getChatMessages } from "@/features/langchain/memory/cosmosdb/cosmosdb-chat-service";
import { CosmosDBDataSourcesContainer } from "@/features/common/cosmos";
import { SqlQuerySpec } from "@azure/cosmos";

export const ChatDataShared = async (props: PromptGPTProps) => {
  const { lastHumanMessage, id, chatThread } = await initAndGuardChatSession(
    props
  );

  const dataSourceSpecificPrompts: DataSourcePrompt = await getDataSourceSpecificPrompts(props.dataSourceId)

  if (!dataSourceSpecificPrompts) {
    throw new Error("No data source found")
  }

  if (!dataSourceSpecificPrompts.theContextContains) {
    throw new Error("No prompt found in the database for 'theContextContains'")
  }

  if (!dataSourceSpecificPrompts.theConversationIsAbout) {
    throw new Error("No prompt found in the database for 'theConversationIsAbout'")
  }

  const previousMessages = await getPreviousMessages(id)
  const relevantDocumentQuery = await getRelevantDocumentQuery(lastHumanMessage.content, previousMessages, dataSourceSpecificPrompts)

  const cog_search_filter = `dataSourceId eq '${props.dataSourceId}'`
  const relevantDocuments = await findRelevantDocuments(
    relevantDocumentQuery,
    cog_search_filter
    );
  
  const data = new experimental_StreamData();
  const references = relevantDocuments.map((doc) => doc.metadata as unknown as string)

  const messageReferences: MessageReferences = {
    messageId: lastHumanMessage.id,
    references: references,
  };

  const messageReferencesJson = JSON.stringify(messageReferences);

  data.append(messageReferencesJson);

  const endpoint = "https://" + process.env.AZURE_OPENAI_API_INSTANCE_NAME + ".openai.azure.com/";
  const openai = new OpenAIClient(endpoint, new AzureKeyCredential(process.env.AZURE_OPENAI_API_KEY))

  // build messages list
  const messages = []
  const systemMessage = getSystemMessageWithContext(buildContextFromRelevantDocuments(relevantDocuments), dataSourceSpecificPrompts)
  messages.push({role: "system", content: systemMessage})
  messages.push(...previousMessages)
  messages.push({role: "user", content: lastHumanMessage.content})

  const events = openai.listChatCompletions(process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME, messages, { stream: true }) as unknown as AsyncIterableIterator<any>;

  const stream = OpenAIStream(
    events, 
    { experimental_streamData: true, 
      onFinal(completion) {
        data.close();
      },
      onCompletion: async (completion: string) => {
        await insertPromptAndResponse(id, lastHumanMessage.content, completion, references);
      }
  });

  return new StreamingTextResponse(stream, {}, data);

}

 const getSystemMessageWithContext = (context: string, dataSourceSpecificPrompts: DataSourcePrompt) => {
  const systemMessage = `Given the following context and a question, create a final answer. 
  The context contains ${dataSourceSpecificPrompts.theContextContains}. 
  If the context is empty or If you don't know the answer, politely decline to answer the question. Don't try to make up an answer.
    
  # Note:
  ${dataSourceSpecificPrompts.rules.map((rule) => {return `- ${rule}`}).join("\n")}
    
  # news articles:
  ${context}
  `
  return systemMessage
 };


const buildContextFromRelevantDocuments = (relevantDocuments: any[]) => {
  const context = relevantDocuments.map((doc) => doc.pageContent).join("\n\n");
  return context;
};

interface OpenAIMessage {
  role: string;
  content: string;
}
const getPreviousMessages = async (threadId: string): Promise<OpenAIMessage[]> => {
  const chatMessages = await getChatMessages(threadId)
  const messages = chatMessages.map((message) => {

    const role = message.data.role === "human" ? "user" : "assistant"
    return { role: role, content: message.data.content }
  })

  return messages;
}

const getOpenAIClient = () => {
  const endpoint = "https://" + process.env.AZURE_OPENAI_API_INSTANCE_NAME + ".openai.azure.com/";
  const openai = new OpenAIClient(endpoint, new AzureKeyCredential(process.env.AZURE_OPENAI_API_KEY))
  return openai
}

const getRelevantDocumentQuery = async (lastHumanMessageContent: string, previousMessages: OpenAIMessage[], dataSourceSpecificPrompts: DataSourcePrompt) => {
  const openai = getOpenAIClient()

  const previousMessageString = previousMessages.map((message) => {return `${message.role}: ${message.content}`}).join("\n\n")
  const systemMessageContent = `You will be given a conversation history and a user question. You will produce a short piece of text 
  that will be used as a semantic search query to find relevant documents. The conversation is about ${dataSourceSpecificPrompts.theConversationIsAbout}. *Do not try to answer the user's question, only produce a query that can be used to find relevant documents*.

  # Conversation history:
  ${previousMessageString}
  `

  const lastHumanMessageContentWithPrompt = `User Message: ${lastHumanMessageContent} \n\n Semantic Search Query:`
  const systemMessage = {role: "system", content: systemMessageContent}
  const messages = [systemMessage, ...previousMessages, {role: "user", content: lastHumanMessageContentWithPrompt}]
  const response = await openai.listChatCompletions(process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME, messages, { temperature: 0.1 });
  let chatbotResponse = "";
  for await (const event of response) {
    for (const choice of event.choices) {
      const delta = choice.delta?.content;
      if (delta !== undefined) {
        chatbotResponse += delta;
      }
    }
  }
  console.log("Semantic search query:", chatbotResponse)
  return chatbotResponse
}

export const getDataSourceSpecificPrompts = async (dataSourceId: string): Promise<DataSourcePrompt> => {
  const container = await CosmosDBDataSourcesContainer.getInstance().getContainer();

  const querySpec: SqlQuerySpec = {
    query: "SELECT * FROM c WHERE c.dataSourceId = @dataSourceId",
    parameters: [
      {
        name: "@dataSourceId",
        value: dataSourceId,
      },
    ],
  };

  const { resources } = await container.items
  .query<DataSourcePrompt>(querySpec)
  .fetchNext();

  return resources[0];
};
