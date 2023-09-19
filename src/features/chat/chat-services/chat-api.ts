import { ChatData } from "../chat-data/chat-data-api";
import { ChatSimple } from "../chat-simple/chat-simple-api";
import { PromptGPTProps } from "./models";

export const PromptGPT = async (props: PromptGPTProps) => {
  if (props.chatType === "simple") {
    return await ChatSimple(props);
  } else if (props.chatType === "data") {
    return await ChatData(props);
  } else if (props.chatType === "shared") {
    // upsert the first cosmosdb entry to include dataSourceId
    return await ChatData(props);
  } else {
    return await ChatSimple(props);
  }
};
