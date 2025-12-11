import { SystemPageShell } from "../../components/system-page-shell";

export default function SystemIdentityPage() {
  return (
    <SystemPageShell
      title="用户管理"
      path="/system/identity"
      description="统一的用户与权限管理占位页面，可在此呈现角色概览或常用操作。"
    />
  );
}
