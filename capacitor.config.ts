import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor 配置。
 *
 * webDir 指向 build:app 的产物：Vite 在 mode=app 时使用相对路径（base: "./"），
 * 因为 App 里的页面是 file:// 协议，绝对路径会全部 404。
 * 路由同理走 Hash 模式，见 src/app/App.tsx。
 */
const config: CapacitorConfig = {
  appId: "cn.gomokudojo.app",
  appName: "五子棋道场",
  webDir: "dist",
  android: {
    // 教学内容全在本地，不需要任何网络权限也能跑
    allowMixedContent: false,
    backgroundColor: "#FAF8F3",
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
