import { SystemPageShell } from "../../components/system-page-shell";

export default function TcmLandingPage() {
  return (
    <div className="space-y-6">
      <SystemPageShell
        title="中医问诊管理"
        description="中医问诊助手依托大语言模型提供连续对话体验，可通过左侧「中医问诊」菜单进入实际工作台。"
      >
        <p className="text-sm text-zinc-600">
          若后续需要新增报告导出或问诊模板等模块，可继续在此目录下扩展子路由并接入统一的导航配置。
        </p>
      </SystemPageShell>
    </div>
  );
}
