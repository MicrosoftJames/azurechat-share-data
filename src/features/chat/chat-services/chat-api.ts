import { ChatDataShared } from "../chat-data/chat-data-shared-api";
import { ChatDataSingleDocument } from "../chat-data/chat-data-single-document-api";
import { ChatSimple } from "../chat-simple/chat-simple-api";
import { PromptGPTProps } from "./models";

export const PromptGPT = async (props: PromptGPTProps) => {
  if (props.chatType === "simple") {
    return await ChatSimple(props);
  } else if (props.chatType === "data") {
    return await ChatDataSingleDocument(props);
  } else if (props.chatType === "shared") {
    return await ChatDataShared(props);
  } else {
    return await ChatSimple(props);
  }
};
