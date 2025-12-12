## 组件清单
- `button.tsx`：基于 shadcn Button，统一色板/尺寸；用于所有交互按钮。
- `card.tsx`：Card 容器与子组件，提供柔和圆角与阴影，用于登录卡片、面板等。
- `collapsible.tsx`：封装 Radix Collapsible，Sidebar 折叠菜单依赖此组件。
- `input.tsx` / `label.tsx`：表单输入与文本标签的标准样式。
- `separator.tsx`：水平/垂直分割线。
- `sheet.tsx`：抽屉式浮层组件（暂未使用，可用于移动端导航）。
- `sidebar.tsx`：shadcn Sidebar 全量实现，提供 `SidebarProvider`、`SidebarTrigger` 等工具。
- `skeleton.tsx`：统一骨架屏组件，使用 `cn` 组合 class。
- `tooltip.tsx`：基于 Radix Tooltip 的提示层。

## 使用方式
- 通过绝对路径导入，例如 `import { Button } from "@/app/components/ui/button";`。
- 若需新增组件，请沿用 shadcn CLI 生成的结构，并在此文件增加说明。
