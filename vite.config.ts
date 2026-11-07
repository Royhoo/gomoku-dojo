import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import type { Plugin } from "vite";

/**
 * 把分享码转发给子资源。
 *
 * 托管平台用网关保护静态站点：首次带 `?sharecode=xxx` 访问会下发 Cookie，
 * 之后同源的 /assets/* 才放行。若浏览器没有保存这个 Cookie（隐私模式、
 * 内嵌 WebView、或 HTML 走了缓存没再经过网关），脚本与样式会全部 403，
 * 页面就是一片空白 —— 而且控制台看不出原因。
 *
 * 实测资源地址直接带 `?sharecode=xxx` 同样放行，所以这里把 <script>/<link>
 * 标签改成由内联脚本创建，并把当前的 sharecode 拼上去，不再依赖 Cookie。
 * 只在网页构建生效；App 构建走 file://，没有这回事。
 */
function sharecodeAssetLoader(): Plugin {
  const SCRIPT_TAG = /<script[^>]*\ssrc="[^"]+"[^>]*><\/script>/g;
  const STYLE_TAG = /<link[^>]*\srel="stylesheet"[^>]*>/g;

  return {
    name: "sharecode-asset-loader",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        const scripts = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
        const styles = [...html.matchAll(/<link[^>]*\srel="stylesheet"[^>]*\shref="([^"]+)"/g)].map(
          (m) => m[1],
        );
        if (scripts.length === 0 && styles.length === 0) return html;

        // 先摘掉原来的标签，改由内联脚本按需（带 sharecode）创建
        const stripped = html.replace(SCRIPT_TAG, "").replace(STYLE_TAG, "");

        const loader = [
          "<script>",
          "(function(){",
          'var m=/[?&]sharecode=([^&#]+)/.exec(location.search);',
          'var q=m?"?sharecode="+encodeURIComponent(decodeURIComponent(m[1])):"";',
          `var css=${JSON.stringify(styles)};`,
          `var js=${JSON.stringify(scripts)};`,
          "function addStyle(h){var l=document.createElement('link');l.rel='stylesheet';l.href=h+q;document.head.appendChild(l);}",
          "function addModule(s){var e=document.createElement('script');e.type='module';e.src=s+q;document.head.appendChild(e);}",
          "css.forEach(addStyle);",
          "js.forEach(addModule);",
          "})();",
          "</script>",
        ].join("");

        return stripped.replace("</head>", `${loader}\n  </head>`);
      },
    },
  };
}

// mode === "app" 时产出相对路径，供 Capacitor 打包（file:// 协议）使用
export default defineConfig(({ mode }) => ({
  base: mode === "app" ? "./" : "/",
  plugins: [react(), tailwindcss(), ...(mode === "app" ? [] : [sharecodeAssetLoader()])],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  worker: { format: "es" },
  build: {
    target: "es2020",
    outDir: "dist",
    emptyOutDir: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
}));
