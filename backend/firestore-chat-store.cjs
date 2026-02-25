const fs = require("node:fs");
const path = require("node:path");

let envCache = null;

function readDotEnv() {
  if (envCache) {
    return envCache;
  }

  const envPath = path.join(__dirname, "..", ".env");

  try {
    const content = fs.readFileSync(envPath, "utf-8");
    const result = {};

    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        return;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      const unquoted = rawValue.replace(/^"|"$/g, "").replace(/^'|'$/g, "");
      result[key] = unquoted;
    });

    envCache = result;
    return result;
  } catch {
    envCache = {};
    return envCache;
  }
}

function getConfigValue(key) {
  if (typeof process.env[key] === "string" && process.env[key].trim()) {
    return process.env[key].trim();
  }

  const env = readDotEnv();
  if (typeof env[key] === "string" && env[key].trim()) {
    return env[key].trim();
  }

  return null;
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }

  if (typeof value === "string") {
    return { stringValue: value };
  }

  if (typeof value === "boolean") {
    return { booleanValue: value };
  }

  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return { integerValue: String(value) };
    }

    return { doubleValue: value };
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => toFirestoreValue(item)),
      },
    };
  }

  if (typeof value === "object") {
    const fields = {};

    Object.entries(value).forEach(([key, nestedValue]) => {
      if (nestedValue === undefined) {
        return;
      }

      fields[key] = toFirestoreValue(nestedValue);
    });

    return {
      mapValue: {
        fields,
      },
    };
  }

  return { stringValue: String(value) };
}

function getProjectId() {
  return (
    getConfigValue("FIREBASE_PROJECT_ID") ||
    getConfigValue("VITE_FIREBASE_PROJECT_ID")
  );
}

function getConversationDocumentUrl(projectId, userId, conversationId) {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId,
  )}/databases/(default)/documents/users/${encodeURIComponent(
    userId,
  )}/assistantChats/${encodeURIComponent(conversationId)}`;
}

function fromFirestoreValue(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(value, "stringValue")) {
    return value.stringValue;
  }

  if (Object.prototype.hasOwnProperty.call(value, "booleanValue")) {
    return value.booleanValue;
  }

  if (Object.prototype.hasOwnProperty.call(value, "nullValue")) {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(value, "integerValue")) {
    const parsed = Number(value.integerValue);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (Object.prototype.hasOwnProperty.call(value, "doubleValue")) {
    return value.doubleValue;
  }

  if (Object.prototype.hasOwnProperty.call(value, "timestampValue")) {
    return value.timestampValue;
  }

  if (value.arrayValue && Array.isArray(value.arrayValue.values)) {
    return value.arrayValue.values.map((item) => fromFirestoreValue(item));
  }

  if (value.mapValue && value.mapValue.fields) {
    const result = {};
    Object.entries(value.mapValue.fields).forEach(([key, nestedValue]) => {
      result[key] = fromFirestoreValue(nestedValue);
    });
    return result;
  }

  return null;
}

function fromFirestoreDocument(document) {
  if (!document || typeof document !== "object") {
    return null;
  }

  const fields =
    document.fields && typeof document.fields === "object"
      ? document.fields
      : {};

  const parsed = {};
  Object.entries(fields).forEach(([key, value]) => {
    parsed[key] = fromFirestoreValue(value);
  });

  return parsed;
}

async function persistAssistantChatRecord(payload) {
  const {
    authToken,
    userId,
    conversationId,
    conversationTitle,
    provider,
    model,
    systemPrompt,
    messages,
    reply,
  } = payload;

  if (!authToken || !userId || !conversationId) {
    return { saved: false, reason: "missing-auth-or-identifiers" };
  }

  const projectId = getProjectId();

  if (!projectId) {
    return { saved: false, reason: "missing-project-id" };
  }

  const updatedAt = new Date().toISOString();
  const transcript = [
    ...messages,
    {
      role: "assistant",
      content: reply,
    },
  ];

  const documentBody = {
    fields: {
      id: toFirestoreValue(conversationId),
      title: toFirestoreValue(conversationTitle || "New chat"),
      provider: toFirestoreValue(provider || "ollama"),
      model: toFirestoreValue(model || null),
      systemPrompt: toFirestoreValue(systemPrompt || ""),
      userId: toFirestoreValue(userId),
      updatedAt: toFirestoreValue(updatedAt),
      messageCount: toFirestoreValue(transcript.length),
      lastUserMessage: toFirestoreValue(
        messages
          .slice()
          .reverse()
          .find((message) => message?.role === "user")?.content || "",
      ),
      lastAssistantMessage: toFirestoreValue(reply),
      transcript: toFirestoreValue(transcript),
    },
  };

  const documentUrl = getConversationDocumentUrl(
    projectId,
    userId,
    conversationId,
  );

  const response = await fetch(documentUrl, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(documentBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to persist assistant chat: ${errorText}`);
  }

  return {
    saved: true,
  };
}

async function upsertAssistantChat(payload) {
  const {
    authToken,
    userId,
    conversationId,
    title,
    pinned,
    updatedAt,
    provider,
    model,
    systemPrompt,
    transcript,
  } = payload;

  if (!authToken || !userId || !conversationId) {
    return { saved: false, reason: "missing-auth-or-identifiers" };
  }

  const projectId = getProjectId();
  if (!projectId) {
    return { saved: false, reason: "missing-project-id" };
  }

  const messages = Array.isArray(transcript) ? transcript : [];
  const documentBody = {
    fields: {
      id: toFirestoreValue(conversationId),
      title: toFirestoreValue(title || "New chat"),
      pinned: toFirestoreValue(Boolean(pinned)),
      provider: toFirestoreValue(provider || "ollama"),
      model: toFirestoreValue(model || null),
      systemPrompt: toFirestoreValue(systemPrompt || ""),
      userId: toFirestoreValue(userId),
      updatedAt: toFirestoreValue(updatedAt || new Date().toISOString()),
      messageCount: toFirestoreValue(messages.length),
      lastUserMessage: toFirestoreValue(
        messages
          .slice()
          .reverse()
          .find((message) => message?.role === "user")?.content || "",
      ),
      lastAssistantMessage: toFirestoreValue(
        messages
          .slice()
          .reverse()
          .find((message) => message?.role === "assistant")?.content || "",
      ),
      transcript: toFirestoreValue(messages),
    },
  };

  const response = await fetch(
    getConversationDocumentUrl(projectId, userId, conversationId),
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(documentBody),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upsert assistant chat: ${errorText}`);
  }

  return { saved: true };
}

async function deleteAssistantChat(payload) {
  const { authToken, userId, conversationId } = payload;

  if (!authToken || !userId || !conversationId) {
    return { deleted: false, reason: "missing-auth-or-identifiers" };
  }

  const projectId = getProjectId();
  if (!projectId) {
    return { deleted: false, reason: "missing-project-id" };
  }

  const response = await fetch(
    getConversationDocumentUrl(projectId, userId, conversationId),
    {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete assistant chat: ${errorText}`);
  }

  return { deleted: true };
}

async function listAssistantChats(payload) {
  const { authToken, userId } = payload;

  if (!authToken || !userId) {
    return { chats: [], reason: "missing-auth-or-identifiers" };
  }

  const projectId =
    getConfigValue("FIREBASE_PROJECT_ID") ||
    getConfigValue("VITE_FIREBASE_PROJECT_ID");

  if (!projectId) {
    return { chats: [], reason: "missing-project-id" };
  }

  const listUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId,
  )}/databases/(default)/documents/users/${encodeURIComponent(
    userId,
  )}/assistantChats?pageSize=100`;

  const response = await fetch(listUrl, {
    method: "GET",
    headers: {
      authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch assistant chats: ${errorText}`);
  }

  const data = await response.json();
  const documents = Array.isArray(data.documents) ? data.documents : [];
  const chats = documents
    .map((document) => fromFirestoreDocument(document))
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = new Date(left.updatedAt || 0).getTime();
      const rightTime = new Date(right.updatedAt || 0).getTime();
      return rightTime - leftTime;
    });

  return { chats };
}

module.exports = {
  deleteAssistantChat,
  listAssistantChats,
  persistAssistantChatRecord,
  upsertAssistantChat,
};
