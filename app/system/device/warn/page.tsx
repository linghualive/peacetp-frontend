import { SystemPageShell } from "../../../components/system-page-shell";

export default function DeviceWarnPage() {
  return (
    <SystemPageShell
      title="设备预警"
      path="/system/device/warn"
      description="监控设备告警事件与处理进度的占位页面，可在此嵌入告警列表或图表。"
    />
  );
}
