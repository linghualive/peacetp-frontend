## 页面与交互规范
- 系统 `/main` 路由是后台主界面，`/` 是登录页，其他域页面按领域拆分在 `system/*`。
- 所有页面使用 shadcn/ui 提供的组件，禁止自行实现复杂交互，图标统一用 Lucide React。
- 整体视觉：明亮、柔和、轻量并带轻卡通风，组件使用柔和圆角与悬浮卡片感，避免生硬边框。
- 交互遵从 Apple HIG，注意间距、动画与加载体验（骨架屏/遮罩）。

## 目录结构
- `layout.tsx`：Next.js 全局布局，挂载字体、全局样式与 `<body>` 结构。
- `page.tsx`：登录页，实现账号密码登录、token/userProfile 写入与带遮罩的加载体验。
- `api/`：所有前端接口封装，结构与业务域保持一致；详见 `app/api/AGENTS.md`。
- `components/`：共享组件与 UI 基础库；详见 `app/components/AGENTS.md`。
- `hooks/`：自定义 React hooks（响应式判断等）；详见 `app/hooks/AGENTS.md`。
- `lib/`：轻量公共方法（如 `cn` 工具）；详见 `app/lib/AGENTS.md`。
- `system/`：系统域页面（main/device/identity/profile/settings），统一通过 `SystemPageShell` 管理布局；详见 `app/system/AGENTS.md`。
- `tool/`：localStorage 等浏览器工具方法；详见 `app/tool/AGENTS.md`。

## 构建与数据注意事项
- 登录成功后必须把后端返回的 `token` 存到 `localStorage`，并在 `api/http.ts` 的 axios 拦截器里写入 `Authentication/Authorization`。
- 任何数据加载都要暴露与主内容等高的骨架屏，必要时加遮罩防止重复操作。
- 新增接口或工具时需同步在各自目录 `AGENTS.md` 中登记用途与使用方式。
