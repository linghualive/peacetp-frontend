import { SystemPageShell } from "../../../components/system-page-shell";

export default function DeviceUserBindingPage() {
  return (
    <SystemPageShell
      title="用户设备绑定"
      path="/system/device/user-binding"
      description="用于管理用户与设备绑定关系的占位页面，可扩展绑定记录及审核流程。"
    />
  );
}
