import { SystemPageShell } from "../../../components/system-page-shell";

export default function DeviceTypePage() {
  return (
    <div className="space-y-6">
      <SystemPageShell
        title="设备类型管理"
        description="用于维护设备类型与型号的占位页面，后续可以扩展分类树、属性配置等功能。"
      />
    </div>
  );
}
