## 目录与职责
- `types.ts`：封装设备类型的分页、创建、更新、删除与详情接口，统一转换字段命名并抛出易读错误。

## 使用说明
```ts
import {
  pageDeviceTypes,
  createDeviceType,
  updateDeviceType,
  deleteDeviceType,
} from "@/app/api/device/types";

const { list, extra } = await pageDeviceTypes({ page: 0, size: 10 });
await createDeviceType({ name: "血压监测", argTemplate: "BloodPressure,BloodOxygen" });
await updateDeviceType({ id: 1, name: "血氧检测", description: "更新模板" });
await deleteDeviceType(2);
```
