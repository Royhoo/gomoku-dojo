import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { bootAuth, getAccount } from "./core/auth";
import { adoptCloudProgress } from "./core/cloudProgress";
import "./styles/global.css";

const root = document.getElementById("root");
if (!root) throw new Error("找不到 #root 挂载点");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/**
 * 登录态在渲染之后异步处理，不阻塞首屏：
 * 本机进度本来就能独立工作，没必要为了等一次网络请求把页面空着。
 * 兑换成功后会写入订阅源，界面自己刷新。
 */
void (async () => {
  await bootAuth();
  if (getAccount()) await adoptCloudProgress();
})();
