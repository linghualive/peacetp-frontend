import { SystemPageShell } from "../../../components/system-page-shell";

export default function IdentityUsersPage() {
  return (
    <div className="space-y-6">
      <SystemPageShell
        title="用户管理"
        description="维护系统用户、分组与账号状态的占位页面。"
      />
    </div>
  );
}
