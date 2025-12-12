## 目录与职责
- `types.ts`：封装设备类型的分页、创建、更新、删除与详情接口，统一转换字段命名并抛出易读错误。
- `devices.ts`：封装设备清单的分页、过滤、详情与 CRUD 接口，负责 camelCase 与后端字段的互转，并保持 `args`/`warn_method` 原样传输。
- `user-devices.ts`：封装用户与设备绑定关系的分页、按用户/设备查看、绑定与解绑接口。
- `warns.ts`：封装设备预警的分页、创建、更新、删除与单条查询接口，并映射预警等级/状态枚举。

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

import {
  bindUserDevice,
  listDevicesByUser,
  listUsersByDevice,
  pageUserDeviceBindings,
  unbindUserDevice,
} from "@/app/api/device/user-devices";

const { list: bindings } = await pageUserDeviceBindings({
  page: 0,
  size: 10,
  query: { userId: 2 },
});
const devices = await listDevicesByUser(2);
const users = await listUsersByDevice(8);
await bindUserDevice({ userId: 2, deviceId: 8 });
await unbindUserDevice(bindings[0]?.id ?? 0);

import {
  createWarn,
  deleteWarn,
  getWarn,
  pageWarns,
  updateWarn,
  type WarnLevel,
  type WarnStatus,
} from "@/app/api/device/warns";

const { list: warns } = await pageWarns({ page: 0, size: 10, query: { status: "WARNING" } });
const created = await createWarn({
  deviceId: 6,
  level: "HIGH",
  status: "WARNING",
  lastUserId: 2,
  warnDescription: "血压阈值超标",
  argsSnapshot: { BloodPressure: "170/110" },
});
await updateWarn({ ...created, status: "HANDLED" });
await deleteWarn(created.id);
const detail = await getWarn(created.id);
```
