import { SystemPageShell } from "../../../components/system-page-shell";

export default function DeviceTypePage() {
  return (
    <SystemPageShell
      title="设备类型管理"
      path="/system/device/type"
      description="用于维护设备类型与型号的占位页面，后续可以扩展分类树、属性配置等功能。"
    />
  );
}
