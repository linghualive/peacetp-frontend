## 目录与职责
- `utils.ts`：提供 `cn(...inputs)` 方法，包装 `clsx` + `tailwind-merge`，用于安全地合并 Tailwind class。

## 使用说明
```ts
import { cn } from "@/app/lib/utils";

const className = cn("px-4", props.disabled && "opacity-60");
```
- 新增基础工具时务必评估是否属于 UI/工具层，再在此文件登记用途，保持 `lib` 精简。
