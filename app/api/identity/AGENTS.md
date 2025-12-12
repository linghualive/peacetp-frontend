## 目录与职责
- `roles.ts`：封装身份域的角色接口，提供分页列表与 CRUD 方法，并负责处理基础的错误提示。
- `users.ts`：封装身份域的用户接口，提供分页搜索、详情、增删改方法，并统一处理请求错误。

## 使用说明
1. **角色管理**
   ```ts
   import {
     pageRoles,
     createRole,
     updateRole,
     deleteRole,
     getRole,
   } from "@/app/api/identity/roles";

   const { list, extra } = await pageRoles({ page: 0, size: 10 });
   await createRole({ name: "运营管理员", description: "负责日常配置" });
   await updateRole({ id: 3, name: "超级管理员", description: "拥有全部权限" });
   await deleteRole(6);
   const detail = await getRole(5);
   ```

2. **用户管理**
   ```ts
   import {
     pageUsers,
     createUser,
     updateUser,
     deleteUser,
     getUser,
   } from "@/app/api/identity/users";

   const { list } = await pageUsers({
     page: 0,
     size: 10,
     query: { name: "张三", roleId: 2 },
   });
   await createUser({
     name: "operator",
     password: "123456",
     roleId: 1,
     phone: "13800000000",
   });
   await updateUser({
     id: 8,
     name: "operator",
     password: "654321",
     roleId: 2,
   });
   await deleteUser(9);
   const detail = await getUser(10);
   ```
