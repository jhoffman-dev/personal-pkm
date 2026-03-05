const {
  generateChatReply,
  generateChatReplyStream,
  listProviderModels,
} = require("../../ai-service.cjs");

function createAiGateway() {
  return {
    generateReply: generateChatReply,
    generateReplyStream: generateChatReplyStream,
    listModels: listProviderModels,
  };
}

module.exports = {
  createAiGateway,
};
