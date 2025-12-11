import { SystemPageShell } from "../../../components/system-page-shell";

export default function IdentityUsersPage() {
  return (
    <SystemPageShell
      title="用户管理"
      path="/system/identity/users"
      description="维护系统用户、分组与账号状态的占位页面。"
    />
  );
}
