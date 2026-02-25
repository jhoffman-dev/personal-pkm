const { createOllamaProvider } = require("./providers/ollama-provider.cjs");
const { createVertexProvider } = require("./providers/vertex-provider.cjs");

const providers = {
  ollama: createOllamaProvider(),
  vertex: createVertexProvider(),
};

function resolveProvider(providerId) {
  if (!providerId) {
    return providers.ollama;
  }

  return providers[providerId] || providers.ollama;
}

async function* generateChatReplyStream(request) {
  const provider = resolveProvider(request.provider);
  const streamOptions = {
    provider: request.provider,
    model: request.model,
    systemPrompt: request.systemPrompt,
    temperature: request.temperature,
    maxTokens: request.maxTokens,
  };

  if (typeof provider.generateChatStream === "function") {
    for await (const chunk of provider.generateChatStream(
      request.messages,
      streamOptions,
    )) {
      yield {
        provider: provider.id,
        model: request.model || null,
        ...chunk,
      };
    }

    return;
  }

  const reply = await provider.generateChat(request.messages, streamOptions);
  yield {
    provider: provider.id,
    model: request.model || null,
    delta: reply,
    done: true,
    reply,
  };
}

async function generateChatReply(request) {
  const provider = resolveProvider(request.provider);
  const reply = await provider.generateChat(request.messages, {
    provider: request.provider,
    model: request.model,
    systemPrompt: request.systemPrompt,
    temperature: request.temperature,
    maxTokens: request.maxTokens,
  });

  return {
    provider: provider.id,
    model: request.model || null,
    reply,
  };
}

module.exports = {
  generateChatReply,
  generateChatReplyStream,
};
