## 目录与职责
- `statistics.ts`：封装 `/statistics/**` 相关的三个接口（overview/device type breakdown/warn summary），对外提供类型安全的方法。

## 使用约定
- 所有方法都会在 `code !== 0` 或缺失数据时抛错，调用方需自行处理 toast/空态。
- 优先在页面或 hook 中组合这些方法，避免直接在组件内拼 URL。
