import { SystemPageShell } from "../../../components/system-page-shell";

export default function DeviceUserBindingPage() {
  return (
    <div className="space-y-6">
      <SystemPageShell
        title="用户设备绑定"
        description="用于管理用户与设备绑定关系的占位页面，可扩展绑定记录及审核流程。"
      />
    </div>
  );
}
