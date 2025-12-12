## 目录与职责
- `http.ts`：集中创建 `apiClient`（axios），配置 `baseURL`、超时与请求/响应拦截器，会自动把 `tool/token` 中的 token 写入 `Authentication` 与 `Authorization` 头。
- `auth.ts`：认证相关 DTO/VO 与接口方法，当前包含 `login`、`getCurrentUser` 以及 `LoginRequest`、`LoginResponse`、`CurrentUserResponse` 类型定义。
- `system/`：系统设置相关接口封装，详见子目录 `AGENTS.md`（包含参数配置与文件管理）。
- `identity/`：身份域接口封装，当前提供角色管理，详见子目录 `AGENTS.md`。

## 对外使用说明
1. **统一客户端**  
   ```ts
   import { apiClient } from "@/app/api/http";
   // 仅在需要自定义请求的场景使用，其他情况优先封装成函数。
   await apiClient.get("/demo");
   ```
2. **登录与用户信息**  
   ```ts
   import { login, getCurrentUser } from "@/app/api/auth";

   const { token } = await login({ name, password });
   const profile = await getCurrentUser();
   ```
   - `login` 会在非 `code === 0` 时抛错，调用方负责捕获并展示错误。
   - `getCurrentUser` 同样在异常 code 时抛错，返回数据可直接写入 `tool/user-profile`。

3. **身份域角色管理**
   ```ts
   import {
     pageRoles,
     createRole,
     updateRole,
     deleteRole,
   } from "@/app/api/identity/roles";

   const { list, extra } = await pageRoles({ page: 0, size: 10 });
   await createRole({ name: "内容管理员" });
   await updateRole({ id: 2, name: "超级管理员", description: "拥有全部权限" });
   await deleteRole(3);
   ```

4. **身份域用户管理**
   ```ts
   import {
     pageUsers,
     createUser,
     updateUser,
     deleteUser,
     getUser,
   } from "@/app/api/identity/users";

   const { list } = await pageUsers({ page: 0, size: 20, query: { roleId: 1 } });
   await createUser({ name: "alice", password: "123456", roleId: 2 });
   await updateUser({ id: 5, name: "alice", password: "abcd", roleId: 3 });
   await deleteUser(6);
   const detail = await getUser(7);
   ```
