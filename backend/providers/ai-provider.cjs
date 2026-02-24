/**
 * @typedef {{role: "system" | "user" | "assistant", content: string}} ChatMessage
 * @typedef {{provider?: string, model?: string, systemPrompt?: string, temperature?: number, maxTokens?: number}} ChatOptions
 *
 * @typedef {Object} AIProvider
 * @property {string} id
 * @property {(messages: ChatMessage[], options?: ChatOptions) => Promise<string>} generateChat
 */

module.exports = {};
