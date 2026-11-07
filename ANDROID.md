# 打包成安卓 App

**本地不需要安装 Android Studio、不需要 JDK、不需要 Android SDK。**
编译在 GitHub 的服务器上完成，你只需要下载产出的 APK。

## 整体流程

```
改代码 → git push → GitHub Actions 自动编译 → 下载 APK → 传到手机安装
```

首次编译约 5–8 分钟；之后每次改内容推上去都会自动出新包。

## 一、先拿到 Debug 包（最快能用）

推送任意提交到 `main` 分支就会触发 `.github/workflows/android.yml`。

下载方式二选一：

- **手机上直接下**：打开仓库的 `Releases` 页面，找 `latest` 这个预发布，里面有 `app-debug.apk`
- **电脑上下**：用命令直接拉到项目目录

```bash
gh run download --repo Royhoo/gomoku-dojo --name gomoku-dojo-apk -D ./apk
```

Debug 包可以直接装、可以直接发给朋友。**不能上架应用商店**——但你现在也不需要。

安装时手机会提示「未知来源应用」，允许一次即可。

## 二、正式签名（已完成）

正式签名解决的是「App 能覆盖升级」：同一个包名 + 同一把密钥，才能覆盖安装。
密钥丢了就再也无法更新已装出去的 App，所以**密钥文件必须自己保管**。

> 本项目已经生成过一把密钥并配好了 Secrets，直接推代码就会自动出 `app-release.apk`。
> 下面的流程只在你需要**换一把新密钥**时才要走一遍。

### 口令为什么不走工作流输入

仓库是 public，`workflow_dispatch` 的输入值会以明文出现在公开的 Actions 日志里。
所以口令改从仓库 Secret `KS_PASSWORD` 读取，GitHub 会自动把日志里的值打码。

### 1. 生成密钥库

1. 先在 `Settings` → `Secrets and variables` → `Actions` 里加一个临时 Secret `KS_PASSWORD`（密钥口令）。
2. `Actions` → 左侧「生成签名密钥」→ `Run workflow`，`alias` 填 `gomoku`。
3. 跑完下载 Artifacts 里的 `release-keystore`，解压得到 `release.jks`。
4. **立刻删掉 `KS_PASSWORD` 这个 Secret**。

⚠️ Artifacts 只保留 7 天，请尽快下载并备份到自己的网盘/密码管理器。

### 2. 转成 Base64

```bash
# macOS / Linux
base64 -w0 release.jks > keystore.b64

# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("release.jks")) | Set-Content keystore.b64
```

### 3. 配到仓库 Secrets

仓库 `Settings` → `Secrets and variables` → `Actions` → `New repository secret`，添加四个：

| 名称 | 值 |
|---|---|
| `KEYSTORE_BASE64` | 上一步得到的整行 Base64 文本 |
| `KEYSTORE_PASSWORD` | 生成密钥时用的口令 |
| `KEY_ALIAS` | `gomoku` |
| `KEY_PASSWORD` | 与 `KEYSTORE_PASSWORD` 相同 |

配好后再推一次代码，Actions 会**同时产出** `app-debug.apk` 和 `app-release.apk`（已签名）。

### 4. 当前这把密钥的指纹

SHA1：`85:52:B8:4C:99:F6:0B:FA:29:2E:BC:45:D9:06:47:C1:88:EA:16:33`
（上架应用商店时可能要求填写，用于证明后续版本出自同一把密钥）

## 三、本地构建（可选，不推荐）

只有想在本机出包时才需要：

```bash
npm run build:app
npx cap sync android
cd android && ./gradlew assembleDebug
```

前置条件：JDK 21 + Android SDK（`ANDROID_HOME` 指向 SDK 目录）。

## 四、安装到手机

1. 把 APK 传到手机（微信文件传输助手、数据线、网盘都行）
2. 手机上点开文件，允许「安装未知应用」
3. 安装完成，图标名「五子棋道场」

App **完全离线可用**：课程内容和 AI 全在本地，飞行模式下也能学、能下棋。

## 五、常见问题

**Q：编译失败，报 Gradle 版本或 SDK 不兼容？**
A：这是这条链路的常见摩擦。把报错贴给我，一般需要调整 `android/build.gradle` 里的
`compileSdkVersion` 或 `variables.gradle` 中的版本号，改一次就稳定了。

**Q：安装时提示「应用未安装」或「签名冲突」？**
A：手机上已经装过另一个签名的同包名 App。先卸载旧的再装。

**Q：App 打开是白屏？**
A：说明路由或资源路径不对。检查两点：构建用的是 `npm run build:app`（相对路径），
路由用的是 HashRouter（`src/app/App.tsx` 已按构建模式自动切换）。

**Q：想让 App 显示别的名字或包名？**
A：改 `capacitor.config.ts` 里的 `appName` / `appId`，再改
`android/app/src/main/res/values/strings.xml`，然后 `npx cap sync android`。
包名一旦上架就不能再改。
