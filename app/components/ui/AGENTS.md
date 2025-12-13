## 组件清单
- `button.tsx`：基于 shadcn Button，统一色板/尺寸；用于所有交互按钮。
- `card.tsx`：Card 容器与子组件，提供柔和圆角与阴影，用于登录卡片、面板等。
- `collapsible.tsx`：封装 Radix Collapsible，Sidebar 折叠菜单依赖此组件。
- `dialog.tsx`：基于 Radix Dialog，提供全局弹窗骨架（含遮罩、标题、描述、操作区）。
- `alert.tsx`：轻量通知条，支持默认/成功/错误三种语义色，适用于提交反馈或列表操作提示。
- `badge.tsx`：胶囊形标签组件，适用于状态/标签展示，可选默认、二级、描边样式。
- `select.tsx`：基于 Radix Select 的下拉选择器，拥有圆角触发器、浮层样式与选中状态，用于筛选与表单字段。
- `input.tsx` / `label.tsx`：表单输入与文本标签的标准样式。
- `textarea.tsx`：多行输入区域，沿用 Input 的玻璃拟态风格与焦点态，支持快捷问诊描述。
- `separator.tsx`：水平/垂直分割线。
- `sheet.tsx`：抽屉式浮层组件（暂未使用，可用于移动端导航）。
- `sidebar.tsx`：shadcn Sidebar 全量实现，提供 `SidebarProvider`、`SidebarTrigger` 等工具。
- `skeleton.tsx`：统一骨架屏组件，使用 `cn` 组合 class。
- `tooltip.tsx`：基于 Radix Tooltip 的提示层。

## 使用方式
- 通过绝对路径导入，例如 `import { Button } from "@/app/components/ui/button";`。
- 若需新增组件，请沿用 shadcn CLI 生成的结构，并在此文件增加说明。
