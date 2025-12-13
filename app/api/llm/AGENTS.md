## 目录与职责
- `agents.ts`：封装中医问诊 agent 的流式调用与记忆清除接口，统一 token 注入、SSE 解析与错误处理。

## 使用说明
- `streamAgentReply`：在浏览器端发起 SSE 流请求，需传入 prompt 以及 `onChunk` 回调，函数会返回 `AbortController` 用于中断生成流程。
- `clearAgentMemory`：调用后端 `DELETE /llm/agents/memory`，成功时返回是否清除了历史记忆，并附带后端提示文案。
