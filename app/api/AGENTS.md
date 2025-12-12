## 目录与职责
- `http.ts`：集中创建 `apiClient`（axios），配置 `baseURL`、超时与请求/响应拦截器，会自动把 `tool/token` 中的 token 写入 `Authentication` 与 `Authorization` 头。
- `auth.ts`：认证相关 DTO/VO 与接口方法，当前包含 `login`、`getCurrentUser` 以及 `LoginRequest`、`LoginResponse`、`CurrentUserResponse` 类型定义。
- `system/`：系统设置相关接口封装，详见子目录 `AGENTS.md`（包含参数配置与文件管理）。
- `identity/`：身份域接口封装，当前提供角色管理，详见子目录 `AGENTS.md`。
- `device/`：设备域接口封装，当前提供设备类型相关方法，详见子目录 `AGENTS.md`。
- `statistics/`：系统级统计接口封装，提供概览、设备类型分布与预警总结，详见子目录 `AGENTS.md`。

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

5. **设备类型管理**
   ```ts
   import {
     pageDeviceTypes,
     createDeviceType,
     updateDeviceType,
     deleteDeviceType,
   } from "@/app/api/device/types";

   const { list } = await pageDeviceTypes({ page: 0, size: 10 });
   await createDeviceType({ name: "血压监测", argTemplate: "BloodPressure,BloodOxygen" });
   await updateDeviceType({ id: 1, name: "血氧监测" });
   await deleteDeviceType(2);
   ```

6. **设备管理**
   ```ts
   import {
     pageDevices,
     createDevice,
     updateDevice,
     deleteDevice,
   } from "@/app/api/device/devices";

   const { list } = await pageDevices({ page: 0, size: 10, query: { name: "血压" } });
   await createDevice({
     machineCode: "MC-001",
     name: "智能血压仪",
     deviceTypeId: 1,
     args: { BloodPressure: "120/80" },
     warnMethod: { phone: "13800000000" },
   });
   await updateDevice({
     id: 8,
     machineCode: "MC-001",
     name: "智能血压仪",
     deviceTypeId: 2,
     warnMethod: { email: "alert@example.com" },
   });
   await deleteDevice(8);
   ```
