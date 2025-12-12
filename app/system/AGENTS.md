## 目录与职责
- `layout.tsx`：系统路由守卫 + 工作区布局，先在客户端校验 localStorage token，再统一渲染 Sidebar、Workspace Tabs 与右侧内容区。
- `navigation-map.ts`：声明 Sidebar 导航与路由元信息（标题、描述），提供 `findSystemRouteMeta` 供布局/标签栏复用。
- `main/page.tsx`：系统首页看板，展示概览卡片与骨架示例。
- `device/*`、`identity/*`、`settings/*`、`profile/page.tsx`：领域占位页，复用 `SystemPageShell` 输出统一的卡片式内容。

## 扩展约定
- 新增 `system/*` 子路由时，需要同步在 `navigation-map.ts` 中登记路径、标题、描述，以确保 Sidebar 与 Workspace Tabs 行为一致。
- 页面不再重复引入 Sidebar/Tabs，只需在内容区内根据业务渲染区块；若暂未接入真实数据，可以沿用 `SystemPageShell`。
- 数据加载前后务必通过 `isLoading` 或自定义 skeleton 维持体验一致性。
