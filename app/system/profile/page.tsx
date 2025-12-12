import { SystemPageShell } from "../../components/system-page-shell";

export default function UserProfilePage() {
  return (
    <SystemPageShell
      title="个人信息"
      path="/system/profile"
      description="用于展示当前用户个人信息的占位页面，可在此扩展头像、联系方式、登录记录等模块。"
    />
  );
}
