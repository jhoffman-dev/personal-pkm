const {
  generateChatReply,
  generateChatReplyStream,
} = require("../../ai-service.cjs");

function createAiGateway() {
  return {
    generateReply: generateChatReply,
    generateReplyStream: generateChatReplyStream,
  };
}

module.exports = {
  createAiGateway,
};
