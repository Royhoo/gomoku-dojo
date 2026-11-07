import { HashRouter, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { LearnPage } from "./pages/LearnPage";
import { PlayPage } from "./pages/PlayPage";

/**
 * 一律用 HashRouter，两个原因：
 *  - App 版（Capacitor）跑在 file:// 下，history 路由会直接失效，白屏或点链接 404
 *  - 网页版托管在纯静态服务上，没有「找不到路由就回落到 index.html」的配置，
 *    直接访问 /learn/huayue 或在该地址刷新会拿到服务端 404
 * 代价是地址里多一个 #，换来的是任何入口、任何刷新都不会白屏。
 */
const Router = HashRouter;

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
