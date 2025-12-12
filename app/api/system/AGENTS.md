## 目录与职责
- `params.ts`：封装系统参数配置相关接口，提供查询、创建、更新与删除 key/value 的方法，统一处理返回结果与错误提示。

## 使用说明
1. **分页查询**
   ```ts
   import { searchParams } from "@/app/api/system/params";

   const { list, extra } = await searchParams({ page: 0, size: 10, key: "device" });
   ```
2. **批量写入/更新**
   ```ts
   import { createParamGroup, updateParamGroup } from "@/app/api/system/params";

   await createParamGroup({
     key: "device_arg",
     values: [{ value: "BloodPressure", description: "血压" }],
   });

   await updateParamGroup({
     key: "device_arg",
     values: [{ id: 1, value: "BloodOxygen", description: "血氧" }],
   });
   ```
3. **删除**
   ```ts
   import { deleteParamGroup, deleteParamValue } from "@/app/api/system/params";

   await deleteParamGroup("device_arg");
   await deleteParamValue(12);
   ```
