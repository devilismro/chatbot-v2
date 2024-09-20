export const serializeChatHistory = (chatHistory) => {
    return chatHistory
      .map((chatMessage) => {
        if (chatMessage.role === "user") {
          return `Human: ${chatMessage.content}`;
        } else if (chatMessage.role === "assistant") {
          return `Assistant: ${chatMessage.content}`;
        } else {
          return `${chatMessage.content}`;
        }
      })
      .join("\n");
  };
  