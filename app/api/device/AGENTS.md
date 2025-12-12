## 目录与职责
- `types.ts`：封装设备类型的分页、创建、更新、删除与详情接口，统一转换字段命名并抛出易读错误。
- `devices.ts`：封装设备清单的分页、过滤、详情与 CRUD 接口，负责 camelCase 与后端字段的互转，并保持 `args`/`warn_method` 原样传输。

## 使用说明
```ts
import {
  pageDeviceTypes,
  createDeviceType,
  updateDeviceType,
  deleteDeviceType,
} from "@/app/api/device/types";

const { list: typeList, extra } = await pageDeviceTypes({ page: 0, size: 10 });
await createDeviceType({ name: "血压监测", argTemplate: "BloodPressure,BloodOxygen" });
await updateDeviceType({ id: 1, name: "血氧检测", description: "更新模板" });
await deleteDeviceType(2);

import {
  pageDevices,
  createDevice,
  updateDevice,
  deleteDevice,
  type DeviceQuery,
} from "@/app/api/device/devices";

const query: DeviceQuery = { deviceTypeId: 1 };
const { list: devices } = await pageDevices({ page: 0, size: 10, query });
await createDevice({
  machineCode: "MC-001",
  name: "血压仪 A",
  deviceTypeId: 1,
  args: { BloodPressure: "120/80" },
});
await updateDevice({
  id: 3,
  machineCode: "MC-001",
  name: "血压仪 A",
  deviceTypeId: 1,
  warnMethod: { phone: "13800000000" },
});
await deleteDevice(3);
```
