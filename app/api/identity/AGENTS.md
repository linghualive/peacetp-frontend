## 目录与职责
- `roles.ts`：封装身份域的角色接口，提供分页列表与 CRUD 方法，并负责处理基础的错误提示。

## 使用说明
1. **分页加载**
   ```ts
   import { pageRoles } from "@/app/api/identity/roles";

   const { list, extra } = await pageRoles({ page: 0, size: 10 });
   ```
2. **新增/编辑角色**
   ```ts
   import { createRole, updateRole } from "@/app/api/identity/roles";

   await createRole({ name: "运营管理员", description: "负责日常配置" });
   await updateRole({ id: 3, name: "超级管理员", description: "拥有全部权限" });
   ```
3. **删除或获取详情**
   ```ts
   import { deleteRole, getRole } from "@/app/api/identity/roles";

   await deleteRole(6);
   const detail = await getRole(5);
   ```
