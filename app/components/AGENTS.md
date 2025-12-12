## 目录与职责
- `app-sidebar.tsx`：系统左侧导航与用户信息卡，封装折叠/子菜单逻辑、登出流程以及菜单 profile 骨架。
- `system-page-shell.tsx`：右侧主内容的统一壳组件，内置 Header、背景、loading skeleton，并接受 `isLoading`/`children`。
- `workspace-tabs.tsx`：系统顶部可关闭标签栏，支持路由联动、最多 8 个动态标签及本地持久化。
- `ui/`：shadcn/ui 基础组件的薄封装，保持统一样式与按需导出；详见 `app/components/ui/AGENTS.md`。

## 使用约定
- 页面级组件优先组合 `SystemPageShell` + 领域内容，确保布局一致。
- 所有复用能力沉淀在 `components/`，并在本文件登记，避免在页面中复制粘贴 UI 片段。
- 引入 UI 基础组件时统一从 `@/app/components/ui/<component>` 导入，便于风格一致与后续统一升级。
