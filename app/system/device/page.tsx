import { SystemPageShell } from "../../components/system-page-shell";

export default function SystemDevicePage() {
  return (
    <div className="space-y-6">
      <SystemPageShell
        title="设备管理"
        description="设备管理模块的占位页面，可在此引入设备概览、统计或快捷入口等内容。"
      />
    </div>
  );
}
