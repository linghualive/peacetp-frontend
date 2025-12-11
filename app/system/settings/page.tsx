import { SystemPageShell } from "../../components/system-page-shell";

export default function SystemSettingsPage() {
  return (
    <SystemPageShell
      title="系统管理"
      path="/system/settings"
      description="系统参数、文件与其他后台配置的占位页面。"
    />
  );
}
