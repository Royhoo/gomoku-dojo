import { BrowserRouter, HashRouter, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { LearnPage } from "./pages/LearnPage";
import { PlayPage } from "./pages/PlayPage";

/**
 * 路由策略跟构建环境走：
 *  - 网页版用 BrowserRouter，地址干净、可直接分享
 *  - App 版（Capacitor）用 HashRouter，因为 file:// 协议下
 *    history 路由会直接失效——打包后白屏或点链接 404 就是它导致的
 */
const Router = import.meta.env.MODE === "app" ? HashRouter : BrowserRouter;

export function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/learn/:openingId/:lessonId/:step" element={<LearnPage />} />
        <Route path="/learn/:openingId/:lessonId" element={<LearnPage />} />
        <Route path="/play" element={<PlayPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </Router>
  );
}
