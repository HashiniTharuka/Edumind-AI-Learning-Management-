"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, BookOpen, Check, Copy, Loader2, SendHorizontal, Sparkles, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { clearChatHistory } from "@/app/actions/ai";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form";

type Source = { lesson: string; title: string };
type Message = { id: string; role: "user" | "assistant"; content: string; sources?: Source[] };

type Props = {
  courseId: string;
  lessonId: string;
  slug: string;
  enabled: boolean;
  initialMessages: Message[];
};

const SUGGESTIONS = [
  "Summarize this lesson in 5 bullet points",
  "Explain the key concept with a simple example",
  "What should I review before the next lesson?",
];

export function TutorChat({ courseId, lessonId, slug, enabled, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function copyMessage(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || streaming) return;
    setInput("");
    setStreaming(true);

    const assistantId = crypto.randomUUID();
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: "user", content: message },
      { id: assistantId, role: "assistant", content: "" },
    ]);
    const patchAssistant = (patch: (msg: Message) => Message) =>
      setMessages((m) => m.map((msg) => (msg.id === assistantId ? patch(msg) : msg)));

    try {
      const res = await fetch(`/api/courses/${courseId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, lessonId }),
      });
      if (!res.ok || !res.body) {
        const { error } = await res.json().catch(() => ({ error: "Something went wrong." }));
        throw new Error(error);
      }

      // Protocol: first line = JSON metadata ({ sources }), the rest = answer text as it streams.
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let headerParsed = false;
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (headerParsed) {
          patchAssistant((msg) => ({ ...msg, content: msg.content + value }));
          continue;
        }
        buffer += value;
        const newline = buffer.indexOf("\n");
        if (newline < 0) continue;
        const { sources } = JSON.parse(buffer.slice(0, newline)) as { sources: Source[] };
        const rest = buffer.slice(newline + 1);
        headerParsed = true;
        patchAssistant((msg) => ({ ...msg, sources, content: rest }));
      }
    } catch (err) {
      setMessages((m) => m.filter((msg) => msg.id !== assistantId));
      toast.error(err instanceof Error ? err.message : "The AI tutor is unavailable.");
    } finally {
      setStreaming(false);
    }
  }

  async function clear() {
    if (!window.confirm("Clear this conversation?")) return;
    const res = await clearChatHistory(courseId);
    if (res.error) toast.error(res.error);
    else setMessages([]);
  }

  if (!enabled) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        <Bot className="mx-auto mb-2 size-8" />
        The AI tutor isn&apos;t configured on this server yet.
      </Card>
    );
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
            <Bot className="size-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">AI Tutor</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.2 text-[10px] font-medium text-success">
                <span className="size-1.5 rounded-full bg-success animate-pulse" /> Grounded
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Answers grounded in this course&apos;s lessons</div>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clear} disabled={streaming} aria-label="Clear conversation">
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      <div ref={scrollRef} className="max-h-[560px] min-h-64 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">Ask anything about this course. Try:</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border px-3 py-1.5 text-xs hover:border-primary hover:text-primary transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className="flex gap-3">
            <span
              className={
                m.role === "user"
                  ? "grid size-7 shrink-0 place-items-center rounded-full bg-muted"
                  : "grid size-7 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"
              }
            >
              {m.role === "user" ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
            </span>
            <div className="min-w-0 flex-1 text-sm group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  {m.role === "user" ? (
                    <p className="whitespace-pre-wrap pt-1">{m.content}</p>
                  ) : m.content ? (
                    <Markdown>{m.content}</Markdown>
                  ) : (
                    <Loader2 className="mt-1.5 size-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {m.role === "assistant" && m.content && (
                  <button
                    type="button"
                    onClick={() => copyMessage(m.id, m.content)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground rounded"
                    title="Copy answer"
                  >
                    {copiedId === m.id ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                  </button>
                )}
              </div>
              {m.sources && m.sources.length > 0 && m.content && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Sources:</span>
                  {m.sources.map((s) => (
                    <Link
                      key={s.lesson}
                      href={`/learn/${slug}/${s.lesson}`}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs hover:text-primary transition-colors"
                    >
                      <BookOpen className="size-3" /> {s.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {messages.length > 0 && !streaming && (
        <div className="flex items-center gap-1.5 border-t bg-muted/20 px-3 py-1.5 overflow-x-auto text-[11px] text-muted-foreground">
          <span className="shrink-0 flex items-center gap-1">
            <Sparkles className="size-3 text-primary" /> Suggestions:
          </span>
          {["Explain simply", "Summarize in 3 bullets", "Give code example", "Quiz me on this"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="shrink-0 rounded-full border bg-card px-2 py-0.5 hover:border-primary hover:text-primary transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ask a question… (Enter to send, Shift+Enter for a new line)"
          rows={1}
          maxLength={2000}
          className="max-h-40 min-h-10 resize-none"
          aria-label="Your question"
        />
        <Button type="submit" disabled={streaming || !input.trim()} aria-label="Send">
          {streaming ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
        </Button>
      </form>
    </Card>
  );
}
