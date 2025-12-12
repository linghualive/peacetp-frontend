## 目录与职责
- `auth-expired-dialog.tsx`：监听全局登录态失效事件，拉起 shadcn Dialog 提示并引导跳转登录页。
- `app-sidebar.tsx`：系统左侧导航与用户信息卡，封装折叠/子菜单逻辑、登出流程以及菜单 profile 骨架。
- `system-page-shell.tsx`：系统内容区的占位卡片，内置骨架态与描述文案，适合在尚未接入真实模块时复用。
- `workspace-tabs.tsx`：系统顶部可关闭标签栏，支持路由联动、最多 8 个动态标签及本地持久化。
- `ui/`：shadcn/ui 基础组件的薄封装，保持统一样式与按需导出；详见 `app/components/ui/AGENTS.md`。

## 使用约定
- 系统级布局由 `app/system/layout.tsx` 统一提供 Sidebar+Tabs，页面内若暂未实现功能，可以通过 `SystemPageShell` 输出规范的占位内容。
- 所有复用能力沉淀在 `components/`，并在本文件登记，避免在页面中复制粘贴 UI 片段。
- 引入 UI 基础组件时统一从 `@/app/components/ui/<component>` 导入，便于风格一致与后续统一升级。
