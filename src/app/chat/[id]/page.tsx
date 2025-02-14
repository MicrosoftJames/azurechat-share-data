import { FindDataSources } from "@/features/chat/chat-services/chat-document-service";
import { FindAllChats } from "@/features/chat/chat-services/chat-service";
import { FindChatThreadByID } from "@/features/chat/chat-services/chat-thread-service";
import { ChatUI } from "@/features/chat/chat-ui/chat-ui";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home({ params }: { params: { id: string } }) {
  const [items, thread, dataSources] = await Promise.all([
    FindAllChats(params.id),
    FindChatThreadByID(params.id),
    FindDataSources(),
  ]);

  if (thread.length === 0) {
    notFound();
  }

  return <ChatUI chats={items} chatThread={thread[0]} dataSources={dataSources} />;
}
