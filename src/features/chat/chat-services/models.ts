import { AzureCogDocument } from "@/features/langchain/vector-stores/azure-cog-search/azure-cog-vector-store";
import { Message } from "ai";

export const CHAT_DOCUMENT_ATTRIBUTE = "CHAT_DOCUMENT";
export const CHAT_THREAD_ATTRIBUTE = "CHAT_THREAD";
export const MESSAGE_ATTRIBUTE = "CHAT_MESSAGE";

export interface ChatMessageModel {
  id: string;
  createdAt: Date;
  isDeleted: boolean;
  threadId: string;
  userId: string;
  content: string;
  role: ChatRole;
  references: string[];
  type: "CHAT_MESSAGE";
}

export type ConversationStyle = "creative" | "balanced" | "precise";
export type ChatType = "simple" | "data" | "mssql" | "shared"

export type ChatRole = "system" | "user" | "assistant" | "function";

export interface  ChatThreadModel {
  id: string;
  name: string;
  createdAt: Date;
  userId: string;
  useName: string;
  isDeleted: boolean;
  chatType: ChatType;
  conversationStyle: ConversationStyle;
  chatOverFileName: string;
  dataSourceId: string;
  type: "CHAT_THREAD";
}

export interface DataSource {
  displayName: string;
  dataSourceId: string;
}

export interface DataSourcePrompt {
  theConversationIsAbout: string;
  theContextContains: string;
  rules: string[];
}

export interface MessageReferences {
  messageId: string;
  references: string[];
}  

export interface RAGMessage extends Message {
  references: string[];
}

export interface PromptGPTBody {
  id: string; // thread id
  chatType: ChatType;
  conversationStyle: ConversationStyle;
  chatOverFileName: string;
  dataSourceId: string;
  dataSourceName: string;
}

export interface PromptGPTProps extends PromptGPTBody {
  messages: Message[];
}

// document models
export interface FaqDocumentIndex extends AzureCogDocument {
  id: string;
  user: string;
  chatThreadId: string;
  embedding: number[];
  pageContent: string;
  metadata: any;
}

export interface ChatDocumentModel {
  id: string;
  name: string;
  chatThreadId: string;
  userId: string;
  isDeleted: boolean;
  createdAt: Date;
  type: "CHAT_DOCUMENT";
}

export interface ServerActionResponse<T> {
  success: boolean;
  error: string;
  response: T;
}
