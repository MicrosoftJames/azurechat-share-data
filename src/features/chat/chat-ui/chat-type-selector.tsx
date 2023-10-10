import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, FileText, MessageCircle } from "lucide-react";
import { FC } from "react";
import { ChatType, DataSource } from "../chat-services/models";

interface Prop {
  chatType: ChatType;
  disable: boolean;
  dataSources?: DataSource[];
  onChatTypeChange?: (value: ChatType) => void;
}

export const ChatTypeSelector: FC<Prop> = (props) => {
  return (
    <Tabs
      defaultValue={props.chatType}
      onValueChange={(value) =>
        props.onChatTypeChange
          ? props.onChatTypeChange(value as ChatType)
          : null
      }
    >
      <TabsList className="grid w-full grid-cols-3 h-12 items-stretch">
        <TabsTrigger
          value="simple"
          className="flex gap-2"
          disabled={props.disable}
        >
          <MessageCircle size={15} /> General
        </TabsTrigger>
        <TabsTrigger
          value="data"
          className="flex gap-2"
          disabled={props.disable}
        >
          <FileText size={15} /> File
        </TabsTrigger>
        <TabsTrigger
          value="shared"
          className="flex gap-2"
          disabled={props.disable || (props.dataSources && props.dataSources.length === 0)}
        >
          <Database size={15} /> Shared
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};
