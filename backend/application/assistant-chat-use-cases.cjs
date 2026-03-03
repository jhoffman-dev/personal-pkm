function createAssistantChatUseCases(dependencies) {
  const { aiGateway, chatRepository, logger = console } = dependencies;

  async function listChats(input) {
    const result = await chatRepository.listChats({
      authToken: input.authToken,
      userId: input.userId,
    });

    return { chats: result.chats };
  }

  async function upsertChat(input) {
    await chatRepository.upsertChat({
      authToken: input.authToken,
      userId: input.userId,
      conversationId: input.conversationId,
      title: input.title,
      pinned: input.pinned,
      updatedAt: input.updatedAt,
      provider: input.provider,
      model: input.model,
      systemPrompt: input.systemPrompt,
      transcript: input.transcript,
    });

    return { ok: true };
  }

  async function deleteChat(input) {
    await chatRepository.deleteChat({
      authToken: input.authToken,
      userId: input.userId,
      conversationId: input.conversationId,
    });

    return { ok: true };
  }

  async function reply(input) {
    const result = await aiGateway.generateReply({
      provider: input.provider,
      model: input.model,
      googleAiStudioApiKey: input.googleAiStudioApiKey,
      systemPrompt: input.systemPrompt,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
      messages: input.messages,
    });

    try {
      await chatRepository.persistChatRecord({
        authToken: input.authToken,
        userId: input.userId,
        conversationId: input.conversationId,
        conversationTitle: input.conversationTitle,
        provider: result.provider,
        model: result.model,
        systemPrompt: input.systemPrompt,
        messages: input.messages,
        reply: result.reply,
      });
    } catch (persistError) {
      const persistMessage =
        persistError instanceof Error
          ? persistError.message
          : "Unknown persistence error";
      logger.warn(`[pkm-ai] failed to persist chat: ${persistMessage}`);
    }

    return result;
  }

  async function* streamReply(input) {
    let reply = "";

    for await (const chunk of aiGateway.generateReplyStream({
      provider: input.provider,
      model: input.model,
      googleAiStudioApiKey: input.googleAiStudioApiKey,
      systemPrompt: input.systemPrompt,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
      messages: input.messages,
    })) {
      if (typeof chunk.delta === "string") {
        reply += chunk.delta;
      }

      yield chunk;
    }

    try {
      await chatRepository.persistChatRecord({
        authToken: input.authToken,
        userId: input.userId,
        conversationId: input.conversationId,
        conversationTitle: input.conversationTitle,
        provider: input.provider,
        model: input.model || null,
        systemPrompt: input.systemPrompt,
        messages: input.messages,
        reply,
      });
    } catch (persistError) {
      const persistMessage =
        persistError instanceof Error
          ? persistError.message
          : "Unknown persistence error";
      logger.warn(
        `[pkm-ai] failed to persist streamed chat: ${persistMessage}`,
      );
    }
  }

  return {
    listChats,
    upsertChat,
    deleteChat,
    reply,
    streamReply,
  };
}

module.exports = {
  createAssistantChatUseCases,
};
