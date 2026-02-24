import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { sendChat, type ChatMessage } from "@/lib/ai-client";
import { useMemo, useState } from "react";

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const DEFAULT_SYSTEM_PROMPT =
  "You are an assistant for a personal knowledge management app. Keep responses concise and practical.";

export function AssistantPage() {
  const [provider, setProvider] = useState<"ollama" | "vertex">("ollama");
  const [model, setModel] = useState("qwen3:8b");
  const [prompt, setPrompt] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chatHistory = useMemo<ChatMessage[]>(
    () =>
      messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    [messages],
  );

  const send = async () => {
    const value = prompt.trim();
    if (!value || isSending) {
      return;
    }

    const userMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: value,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setPrompt("");
    setError(null);
    setIsSending(true);

    try {
      const result = await sendChat({
        provider,
        model: model.trim() || undefined,
        systemPrompt: systemPrompt.trim() || undefined,
        messages: [...chatHistory, { role: "user", content: value }],
      });

      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.reply,
        },
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to call AI backend",
      );
      setMessages(nextMessages);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="h-[calc(100svh-41px)] p-6">
      <Card className="h-full py-0">
        <CardContent className="flex h-full min-h-0 flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-2 text-lg font-semibold">Assistant</h2>

            <select
              value={provider}
              onChange={(event) =>
                setProvider(event.target.value as "ollama" | "vertex")
              }
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              <option value="ollama">Ollama</option>
              <option value="vertex">Vertex (future)</option>
            </select>

            <Input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="Model (e.g. qwen3:8b)"
              className="max-w-52"
            />
          </div>

          <textarea
            value={systemPrompt}
            onChange={(event) => setSystemPrompt(event.target.value)}
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-16 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            placeholder="System prompt"
          />

          <div className="bg-muted/20 flex-1 space-y-2 overflow-y-auto rounded-md border p-3">
            {messages.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Start chatting. Later this interface will also support RAG and
                action tools (create/edit tasks, notes, people, companies).
              </p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "bg-background border"
                  }`}
                >
                  {message.content}
                </div>
              ))
            )}
          </div>

          {error ? <p className="text-destructive text-xs">{error}</p> : null}

          <div className="flex items-center gap-2">
            <Input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void send();
                }
              }}
              placeholder="Ask something..."
              disabled={isSending}
            />
            <Button
              onClick={() => void send()}
              disabled={isSending || prompt.trim().length === 0}
            >
              {isSending ? "Sending..." : "Send"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
