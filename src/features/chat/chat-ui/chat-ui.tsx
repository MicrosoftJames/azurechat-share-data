"use client";

import ChatInput from "@/components/chat/chat-input";
import ChatLoading from "@/components/chat/chat-loading";
import ChatRow from "@/components/chat/chat-row";
import { useChatScrollAnchor } from "@/components/hooks/use-chat-scroll-anchor";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import { AI_NAME } from "@/features/theme/customise";
import { Message, useChat } from "ai/react";
import { useSession } from "next-auth/react";
import { FC, FormEvent, useEffect, useRef, useState } from "react";
import {
  IndexDocuments,
  UploadDocument,
} from "../chat-services/chat-document-service";
import {
  ChatMessageModel,
  ChatThreadModel,
  ChatType,
  ConversationStyle,
  DataSource,
  MessageReferences,
  PromptGPTBody,
  RAGMessage,
} from "../chat-services/models";
import { transformCosmosToAIModel } from "../chat-services/utils";
import { EmptyState } from "./chat-empty-state";
import { ChatHeader } from "./chat-header";
import { JSONValue } from "ai";
import { ConversationalRetrievalQAChain } from "langchain/chains";
import { ConsoleCallbackHandler } from "langchain/callbacks";

interface Prop {
  chats: Array<ChatMessageModel>;
  chatThread: ChatThreadModel;
  dataSources: DataSource[];
}

export const ChatUI: FC<Prop> = (props) => {

  const { data: session } = useSession();

  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const [uploadButtonLabel, setUploadButtonLabel] = useState("");

  const [chatBody, setBody] = useState<PromptGPTBody>({
    id: props.chatThread.id,
    chatType: props.chatThread.chatType,
    conversationStyle: props.chatThread.conversationStyle,
    chatOverFileName: props.chatThread.chatOverFileName,
    dataSourceId: props.chatThread.dataSourceId,
    dataSourceName: props.dataSources.find((e) => e.dataSourceId === props.chatThread.dataSourceId)?.displayName!,
  });

  const { toast } = useToast();

  const id = props.chatThread.id;

  const {
    data,
    messages,
    input,
    handleInputChange,
    handleSubmit,
    reload,
    setMessages,
    isLoading,
  } = useChat({
    onError,
    id,
    body: chatBody,
    sendExtraMessageFields: true,
    initialMessages: transformCosmosToAIModel(props.chats),
  });

  function addReferencesToMessageWithId(id: string, references: string[]) {
    // updates messages with the new message
    const newMessages = messages.map((message) => {
      if (message.id === id) {
        const newMessage: RAGMessage = {
          ...message,
          references: references
        };
        return newMessage;
      }
      return message;
    });

    setMessages(newMessages); 
  }

  function getNextMessageId(id: string) {
    // find the id of the next message after this one
    const index = messages.findIndex((message) => message.id === id);
    if (index === -1) {
      return null;
    }
    const nextMessageId = messages[index + 1]?.id;
    return nextMessageId;
  }
    
  useEffect(() => {
    if (data) {
      data.forEach((messageReferencesJsonString: string) => {
        const messageReferences: MessageReferences = JSON.parse(messageReferencesJsonString);
        const messageId = messageReferences.messageId;
        const references = messageReferences.references;
        const nextMessageId = getNextMessageId(messageId);
        if (nextMessageId) {
          addReferencesToMessageWithId(nextMessageId, references);
        }
      });
    }
  }, [data]);

 
  const scrollRef = useRef<HTMLDivElement>(null);
  useChatScrollAnchor(messages, scrollRef);

  function onError(error: Error) {
    toast({
      variant: "destructive",
      description: error.message,
      action: (
        <ToastAction
          altText="Try again"
          onClick={() => {
            reload();
          }}
        >
          Try again
        </ToastAction>
      ),
    });
  }

  const onChatTypeChange = (value: ChatType) => {

    let dataSourceId = "";
    let dataSourceName = "";

    if (value === "shared") {
      dataSourceId = props.dataSources[0].dataSourceId;
      dataSourceName = props.dataSources[0].displayName;
    }

    setBody((e) => ({ ...e, chatType: value, dataSourceId: dataSourceId, dataSourceName: dataSourceName }));
  };

  const onConversationStyleChange = (value: ConversationStyle) => {
    setBody((e) => ({ ...e, conversationStyle: value }));
  };

  const onDataSourceChange = (value: string) => {
    const dataSourceName = props.dataSources.find((e) => e.dataSourceId === value)?.displayName!;
    setBody((e) => ({ ...e, dataSourceId: value, dataSourceName: dataSourceName }));
  };

  const onHandleSubmit = (e: FormEvent<HTMLFormElement>) => {
    handleSubmit(e);
  };

  const onFileChange = async (formData: FormData) => {
    try {
      setIsUploadingFile(true);
      setUploadButtonLabel("Uploading document...");
      formData.append("id", props.chatThread.id);
      const file: File | null = formData.get("file") as unknown as File;
      const uploadResponse = await UploadDocument(formData);

      if (uploadResponse.success) {
        setUploadButtonLabel("Indexing document...");
        const indexResponse = await IndexDocuments(
          file.name,
          uploadResponse.response,
          props.chatThread.id
        );

        if (indexResponse.success) {
          toast({
            title: "File upload",
            description: `${file.name} uploaded successfully.`,
          });
          setUploadButtonLabel("");
          setBody((e) => ({ ...e, chatOverFileName: file.name }));
        } else {
          toast({
            variant: "destructive",
            description: indexResponse.error,
          });
        }
      } else {
        toast({
          variant: "destructive",
          description: "" + uploadResponse.error,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        description: "" + error,
      });
    } finally {
      setIsUploadingFile(false);
      setUploadButtonLabel("");
    }
  };

  const convertToRAGMessage = (message: Message | RAGMessage) => {
    if (message.hasOwnProperty("references")) {
      return message as RAGMessage;
    } else {
      const newMessage: RAGMessage = {
        ...message,
        references: []
      };
      return newMessage;
    }
  };

  const ChatWindow = (
    <div className="h-full rounded-md overflow-y-auto " ref={scrollRef}>
      <div className="flex justify-center p-4">
        <ChatHeader
          chatBody={chatBody}
        />
      </div>
      <div className=" pb-[80px] flex flex-col justify-end flex-1">
        {messages.map((message, index) => (
          <ChatRow
            name={message.role === "user" ? session?.user?.name! : AI_NAME}
            profilePicture={
              message.role === "user" ? session?.user?.image! : "/ai-icon.png"
            }
            message={message.content}
            type={message.role}
            key={index}
            references={
              convertToRAGMessage(message).references
            }
          />
        ))}
        {isLoading && <ChatLoading />}
      </div>
    </div>
  );

  return (
    <div className="h-full relative overflow-hidden flex-1 bg-card rounded-md shadow-md">
      {messages.length !== 0 ? (
        ChatWindow
      ) : (
        <EmptyState
          uploadButtonLabel={uploadButtonLabel}
          isUploadingFile={isUploadingFile}
          onFileChange={onFileChange}
          onConversationStyleChange={onConversationStyleChange}
          onChatTypeChange={onChatTypeChange}
          onDataSourceChange={onDataSourceChange}
          chatType={chatBody.chatType}
          conversationStyle={chatBody.conversationStyle}
          dataSources={props.dataSources}
        />
      )}

      <ChatInput
        isLoading={isLoading}
        value={input}
        handleInputChange={handleInputChange}
        handleSubmit={onHandleSubmit}
      />
    </div>
  );
};
