import { SystemPageShell } from "../../../components/system-page-shell";

export default function SettingsParamsPage() {
  return (
    <SystemPageShell
      title="参数配置管理"
      path="/system/settings/params"
      description="维护全局参数与业务配置项的占位页面。"
    />
  );
}
