## 目录与职责
- `use-mobile.ts`：导出 `useIsMobile(query?: string)`，用于监听媒体查询并返回布尔值，默认断点为 `max-width: 768px`。

## 使用说明
```ts
import { useIsMobile } from "@/app/hooks/use-mobile";

const isMobile = useIsMobile();          // 使用默认断点
const isTablet = useIsMobile("(max-width: 1024px)");
```
- Hook 内部会在浏览器环境下侦听 `matchMedia`，记得只在客户端组件中调用。
