import {
  apiClient,
  type ApiActionResult,
  type ApiResponse,
} from "@/app/api/http";
import { emitAuthExpired } from "@/app/lib/auth-events";
import { clearToken, getToken } from "@/app/tool/token";
import { clearUserProfile } from "@/app/tool/user-profile";

const DEFAULT_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type AgentType = "tcm_consultation";

export type StreamEventType = "token" | "complete" | "error";

export interface StreamData {
  event: StreamEventType;
  content: string;
  finished: boolean;
}

export interface StreamChunk {
  code: number;
  msg: string;
  data: StreamData;
}

export type AgentStreamOptions = {
  prompt: string;
  agent?: AgentType;
  onChunk: (chunk: StreamChunk) => void;
  onError?: (error: Error) => void;
};

interface MemoryResponsePayload {
  cleared: boolean;
}

const normalizeUrl = (path: string) => {
  const base = DEFAULT_API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};

const handleUnauthorized = (message?: string) => {
  clearToken();
  clearUserProfile();
  emitAuthExpired({
    message: message || "登录状态已失效，请重新登录后再试。",
  });
};

const safeParseChunk = (raw: string): StreamChunk | null => {
  try {
    const parsed = JSON.parse(raw) as StreamChunk;
    if (
      typeof parsed === "object" &&
      typeof parsed.code === "number" &&
      typeof parsed.msg === "string" &&
      parsed.data &&
      typeof parsed.data.content === "string"
    ) {
      return parsed;
    }
    return null;
  } catch (error) {
    console.warn("Failed to parse llm stream chunk", error);
    return null;
  }
};

const flushSseBuffer = (
  buffer: string,
  emit: (chunk: StreamChunk) => void,
) => {
  let rest = buffer;
  while (true) {
    const match = rest.match(/\r?\n\r?\n/);
    if (!match || match.index === undefined) {
      break;
    }
    const block = rest.slice(0, match.index);
    rest = rest.slice(match.index + match[0].length);
    const lines = block.split(/\r?\n/);
    const dataLines: string[] = [];
    lines.forEach((line) => {
      if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    });
    if (!dataLines.length) {
      continue;
    }
    const payload = dataLines.join("\n");
    const chunk = safeParseChunk(payload);
    if (chunk) {
      emit(chunk);
    }
  }
  return rest;
};

const readErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.clone().json()) as ApiResponse<unknown>;
    if (payload?.msg) {
      return payload.msg;
    }
  } catch {
    try {
      const text = await response.clone().text();
      if (text) {
        return text;
      }
    } catch {
      // noop
    }
  }
  if (response.status === 401) {
    return "登录状态已失效，请重新登录";
  }
  return "LLM 服务调用失败，请稍后再试";
};

const emitError = (options: AgentStreamOptions, error: Error) => {
  if (options.onError) {
    options.onError(error);
  } else {
    console.error("LLM stream failed", error);
  }
};

export function streamAgentReply(options: AgentStreamOptions): AbortController {
  const controller = new AbortController();
  const trimmedPrompt = options.prompt.trim();

  if (!trimmedPrompt) {
    emitError(options, new Error("请输入想要咨询的问题"));
    return controller;
  }

  const token = getToken();
  if (!token) {
    handleUnauthorized("尚未登录或登录态已过期，请重新登录后再提问。");
    emitError(options, new Error("当前未登录，无法发起问诊"));
    return controller;
  }

  void (async () => {
    try {
      const response = await fetch(normalizeUrl("/llm/agents/stream"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          Authentication: token,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          agent: options.agent ?? "tcm_consultation",
        }),
        signal: controller.signal,
      });

      if (response.status === 401) {
        handleUnauthorized(await readErrorMessage(response));
        emitError(options, new Error("登录状态已失效，请重新登录后再试"));
        return;
      }

      if (!response.ok) {
        const message = await readErrorMessage(response);
        emitError(options, new Error(message));
        return;
      }

      if (!response.body) {
        emitError(options, new Error("浏览器暂不支持流式响应"));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        buffer = flushSseBuffer(buffer, options.onChunk);
      }

      if (buffer.trim()) {
        flushSseBuffer(`${buffer}\n\n`, options.onChunk);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      emitError(
        options,
        error instanceof Error ? error : new Error("问诊服务暂时不可用，请稍后再试"),
      );
    }
  })();

  return controller;
}

export async function clearAgentMemory(): Promise<ApiActionResult<MemoryResponsePayload>> {
  const { data } = await apiClient.delete<ApiResponse<MemoryResponsePayload>>(
    "/llm/agents/memory",
  );
  if (data.code !== 0 || !data.data) {
    throw new Error(data.msg || "聊天记忆清除失败，请稍后再试");
  }
  return {
    data: data.data,
    msg: data.msg,
  };
}
