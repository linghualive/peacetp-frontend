## 目录与职责
- `main/page.tsx`：系统首页看板，展示概览卡片与说明块，并内置骨架加载示例。
- `device/page.tsx`：设备管理占位页，使用 `SystemPageShell` 提供路径 `/system/device` 的统一壳。
- `identity/page.tsx`：用户管理占位页。
- `profile/page.tsx`：个人中心页，后续可扩展头像、联系方式等模块。
- `settings/page.tsx`：系统参数与文件管理的聚合占位入口。

所有页面都依赖 `SystemPageShell`，从而自动获得 Sidebar、Header、背景及 `isLoading` 骨架支持。

## 扩展约定
- 若在 `system` 下新增子域目录，请保持 `SystemPageShell` 包裹，便于统一导航状态。
- 数据加载前后务必通过 `isLoading` 或自定义 skeleton 维持体验一致性。
