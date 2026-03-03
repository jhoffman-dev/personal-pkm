const {
  deleteAssistantChat,
  listAssistantChats,
  persistAssistantChatRecord,
  upsertAssistantChat,
} = require("../../firestore-chat-store.cjs");

function createFirestoreAssistantChatRepository() {
  return {
    listChats: listAssistantChats,
    upsertChat: upsertAssistantChat,
    deleteChat: deleteAssistantChat,
    persistChatRecord: persistAssistantChatRecord,
  };
}

module.exports = {
  createFirestoreAssistantChatRepository,
};
