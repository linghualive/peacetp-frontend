import { SystemPageShell } from "../../components/system-page-shell";

export default function SystemSettingsPage() {
  return (
    <div className="space-y-6">
      <SystemPageShell
        title="系统管理"
        description="系统参数、文件与其他后台配置的占位页面。"
      />
    </div>
  );
}
