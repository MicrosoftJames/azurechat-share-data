import { Message } from "ai";
import { ChatMessageModel, ConversationStyle, RAGMessage } from "./models";

export const transformCosmosToAIModel = (
  chats: Array<ChatMessageModel>
): Array<Message | RAGMessage> => {
  return chats.map((chat) => {
    if (chat.hasOwnProperty("metadata")) {
      return {
        role: chat.role,
        content: chat.content,
        id: chat.id,
        createdAt: chat.createdAt,
        metadata: chat.metadata,
      };
    }
    else 
    {
    return {
      role: chat.role,
      content: chat.content,
      id: chat.id,
      createdAt: chat.createdAt,
    };
  }
  });
};

export const transformConversationStyleToTemperature = (
  conversationStyle: ConversationStyle
) => {
  switch (conversationStyle) {
    case "precise":
      return 0.1;
    case "balanced":
      return 0.5;
    case "creative":
      return 1;
    default:
      return 0.5;
  }
};

export const isNotNullOrEmpty = (value?: string) => {
  return value !== null && value !== undefined && value !== "";
};
