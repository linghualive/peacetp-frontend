"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  History,
  Loader2,
  RefreshCw,
  SendHorizontal,
  Sparkles,
  UserRound,
} from "lucide-react";

import {
  clearAgentMemory,
  streamAgentReply,
  type StreamChunk,
} from "@/app/api/llm/agents";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Textarea } from "@/app/components/ui/textarea";
import { cn } from "@/app/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
};

const QUICK_PROMPTS = [
  "最近总是头晕乏力、睡不好，该怎么调理？",
  "女性经期前容易心烦、胸闷，有什么食疗建议？",
  "孩子体质偏寒，换季时容易咳嗽，应注意哪些起居？",
];

const markdownComponents: Components = {
  p: ({ children }) => (
    <p className="leading-relaxed text-zinc-700 [&:not(:last-child)]:mb-2">{children}</p>
  ),
  strong: ({ children }) => <strong className="text-zinc-900">{children}</strong>,
  em: ({ children }) => <em className="text-primary/80">{children}</em>,
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-5 text-zinc-700">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5 text-zinc-700">{children}</ol>
  ),
  code: ({ inline, children }) =>
    inline ? (
      <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[13px] text-zinc-900">
        {children}
      </code>
    ) : (
      <pre className="overflow-x-auto rounded-2xl bg-zinc-900/90 p-4 text-[13px] text-zinc-100">
        <code>{children}</code>
      </pre>
    ),
};

const createMessageId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`;

export default function TcmConsultPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isClearingMemory, setIsClearingMemory] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const streamControllerRef = useRef<AbortController | null>(null);
  const streamingAssistantIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      streamControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [messages]);

  const applyToStreamingAssistant = useCallback(
    (updater: (message: ChatMessage) => ChatMessage) => {
      const targetId = streamingAssistantIdRef.current;
      if (!targetId) {
        return;
      }
      setMessages((prev) =>
        prev.map((message) => (message.id === targetId ? updater(message) : message)),
      );
    },
    [],
  );

  const resetStreamingState = useCallback(() => {
    setIsStreaming(false);
    streamingAssistantIdRef.current = null;
    streamControllerRef.current = null;
  }, []);

  const handleChunk = useCallback(
    (chunk: StreamChunk) => {
      if (chunk.code !== 0 || chunk.data.event === "error") {
        const fallback =
          chunk.data.content || chunk.msg || "问诊助手暂时无法回复，请稍后再试。";
        applyToStreamingAssistant((message) => ({
          ...message,
          content: fallback,
          isStreaming: false,
        }));
        setErrorMessage(chunk.msg || fallback);
        resetStreamingState();
        return;
      }

      if (chunk.data.event === "token") {
        applyToStreamingAssistant((message) => ({
          ...message,
          content: `${message.content}${chunk.data.content}`,
        }));
        return;
      }

      if (chunk.data.event === "complete") {
        applyToStreamingAssistant((message) => ({
          ...message,
          content: chunk.data.content || message.content,
          isStreaming: false,
        }));
        resetStreamingState();
      }
    },
    [applyToStreamingAssistant, resetStreamingState],
  );

  const handleStreamError = useCallback(
    (error: Error) => {
      applyToStreamingAssistant((message) => ({
        ...message,
        content: message.content || error.message,
        isStreaming: false,
      }));
      setErrorMessage(error.message);
      resetStreamingState();
    },
    [applyToStreamingAssistant, resetStreamingState],
  );

  const startStreaming = useCallback(
    (prompt: string) => {
      const userMessage: ChatMessage = {
        id: createMessageId(),
        role: "user",
        content: prompt,
      };
      const assistantId = createMessageId();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      streamingAssistantIdRef.current = assistantId;
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);
      setErrorMessage(null);
      setInfoMessage(null);

      streamControllerRef.current?.abort();
      const controller = streamAgentReply({
        prompt,
        onChunk: handleChunk,
        onError: handleStreamError,
      });
      streamControllerRef.current = controller;
    },
    [handleChunk, handleStreamError],
  );

  const handleSubmit = useCallback(
    (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (isStreaming) {
        return;
      }
      const trimmed = inputValue.trim();
      if (!trimmed) {
        setErrorMessage("请先输入想要咨询的症状或关键信息。");
        return;
      }
      setInputValue("");
      startStreaming(trimmed);
    },
    [inputValue, isStreaming, startStreaming],
  );

  const handleQuickPrompt = (prompt: string) => {
    if (isStreaming) {
      return;
    }
    setInputValue(prompt);
  };

  const handleStop = () => {
    streamControllerRef.current?.abort();
    applyToStreamingAssistant((message) => ({
      ...message,
      isStreaming: false,
    }));
    resetStreamingState();
  };

  const handleResetConversation = () => {
    streamControllerRef.current?.abort();
    streamingAssistantIdRef.current = null;
    setMessages([]);
    setInputValue("");
    setErrorMessage(null);
    setInfoMessage("已清空当前对话，欢迎继续提问。");
    setIsStreaming(false);
  };

  const handleClearMemory = async () => {
    if (isClearingMemory) {
      return;
    }
    setIsClearingMemory(true);
    setErrorMessage(null);
    try {
      const { msg } = await clearAgentMemory();
      setInfoMessage(msg || "服务器端聊天记忆已清除。");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "记忆清除失败，请稍后再试。";
      setErrorMessage(message);
    } finally {
      setIsClearingMemory(false);
    }
  };

  const isInputDisabled = isStreaming || !inputValue.trim();

  const lastUpdateLabel = useMemo(() => {
    if (!messages.length) {
      return "尚未开始对话";
    }
    const lastAssistant = [...messages].reverse().find((msg) => msg.role === "assistant");
    if (!lastAssistant) {
      return "等待助手回复";
    }
    return `最近回复：${new Date().toLocaleTimeString()}`;
  }, [messages]);

  return (
    <div className="flex h-full flex-col gap-6">

      <section className="flex min-h-0 flex-1 flex-col rounded-3xl border bg-white shadow-sm">
        <header className="flex flex-col gap-3 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">中医问诊</h2>
            <p className="text-sm text-zinc-500">{lastUpdateLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleResetConversation}
              disabled={isStreaming}
            >
              <RefreshCw className="size-4" />
              清空当前会话
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearMemory}
              disabled={isClearingMemory || isStreaming}
            >
              {isClearingMemory ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  清理中…
                </>
              ) : (
                <>
                  <History className="size-4" />
                  清除历史记忆
                </>
              )}
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          <div
            ref={scrollContainerRef}
            className="flex-1 space-y-4 overflow-y-auto px-6 py-6"
            aria-live="polite"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-12 text-center">
                <Sparkles className="size-10 text-primary" />
                <h3 className="mt-4 text-lg font-semibold text-zinc-900">
                  让问诊助手了解你的情况
                </h3>
                <p className="mt-2 max-w-2xl text-sm text-zinc-500">
                  描述症状、体质或生活习惯，助手会根据传统中医理论给出结构化建议与日常调理提示。
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      isUser ? "flex-row-reverse text-right" : "flex-row",
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-2xl text-base font-semibold",
                        isUser
                          ? "bg-primary/15 text-primary"
                          : "bg-emerald-50 text-emerald-600",
                      )}
                    >
                      {isUser ? <UserRound className="size-5" /> : <Bot className="size-5" />}
                    </div>
                    <div
                      className={cn(
                        "max-w-3xl rounded-2xl border px-5 py-4 text-sm shadow-sm",
                        isUser
                          ? "bg-primary/5 text-zinc-800"
                          : "bg-white text-zinc-700",
                      )}
                    >
                      {message.content ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={markdownComponents}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-11/12 rounded-xl" />
                          <Skeleton className="h-4 w-9/12 rounded-xl" />
                        </div>
                      )}
                      {message.isStreaming && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-primary">
                          <Loader2 className="size-4 animate-spin" />
                          回答生成中…
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t bg-white px-6 py-4">
            <div className="flex flex-wrap gap-2 pb-3">
              {QUICK_PROMPTS.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleQuickPrompt(prompt)}
                  disabled={isStreaming}
                >
                  {prompt}
                </Button>
              ))}
            </div>

            {errorMessage && (
              <Alert variant="destructive" className="mb-3">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            {infoMessage && (
              <Alert variant="success" className="mb-3">
                <AlertDescription>{infoMessage}</AlertDescription>
              </Alert>
            )}

            <form className="space-y-3" onSubmit={handleSubmit}>
              <Textarea
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="描述症状、体质、生活作息等信息，Shift+Enter 换行"
                rows={4}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSubmit();
                  }
                }}
                aria-label="输入想要咨询的内容"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-zinc-500">
                  模型建议仅供参考，如症状严重请及时就医。
                </div>
                <div className="flex items-center gap-2">
                  {isStreaming && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleStop}
                    >
                      停止生成
                    </Button>
                  )}
                  <Button type="submit" disabled={isInputDisabled}>
                    {isStreaming ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        回答中…
                      </>
                    ) : (
                      <>
                        <SendHorizontal className="size-4" />
                        发送
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
