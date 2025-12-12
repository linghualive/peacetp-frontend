## 用户体验总则
- 所有涉及数据加载的区域都必须搭配骨架屏或加载反馈，避免内容闪烁。

## 项目主要目录
- `app/`：Next.js App Router 根目录，包含所有页面、组件、api 请求封装、工具与域模块。详见 `app/AGENTS.md`。
- `public/`：静态资源（图标、占位图等）的集中存放地，供 Next.js `public` 机制读取。
- `node_modules/`：依赖包目录（只读）；如需新增依赖请通过 `pnpm` 管理。

## 协作提示
- 新增目录或文件时同步补充所在目录的 `AGENTS.md`，描述用途与约定。
- 严格遵循 shadcn/ui 与 Lucide React 作为唯一 UI 与图标来源，保持体验一致性。
