import { SystemPageShell } from "../../../components/system-page-shell";

export default function SettingsParamsPage() {
  return (
    <div className="space-y-6">
      <SystemPageShell
        title="参数配置管理"
        description="维护全局参数与业务配置项的占位页面。"
      />
    </div>
  );
}
