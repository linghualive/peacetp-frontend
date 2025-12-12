## 目录与职责
- `token.ts`：封装 `setToken` / `getToken` / `clearToken`，统一管理 `localStorage` 中的 `peacetp_token`。
- `user-profile.ts`：定义 `UserProfile`/`UserProfileRole` 类型与默认值，并提供 `getUserProfile`、`setUserProfile`、`clearUserProfile` 方法，集中管理 `localStorage` 中的用户信息。

## 对外使用说明
```ts
import { setToken, getToken, clearToken } from "@/app/tool/token";
import { setUserProfile, getUserProfile, clearUserProfile } from "@/app/tool/user-profile";

setToken(token);                    // 登录成功后调用
const token = getToken();           // axios 拦截器中读取
clearToken();                       // 登出/登录失败兜底

setUserProfile(profileFromAPI);     // 登录后缓存
const profile = getUserProfile();   // Sidebar/全局展示
clearUserProfile();                 // 登出或信息失效
```
- 以上方法均在浏览器环境下工作，内部已做 `typeof window` 守卫，可直接在客户端组件或 Axios 拦截器里调用。
