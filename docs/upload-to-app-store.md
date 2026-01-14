# 📤 上传构建到 App Store Connect

## 方法 1: 使用 EAS Submit（推荐，最简单）

### 步骤 1: 在 App Store Connect 创建 App

1. 登录 [App Store Connect](https://appstoreconnect.apple.com/)
2. 点击 **我的 App** → **+** → **新建 App**
3. 填写信息：
   - **平台**: iOS
   - **名称**: 惩罚轮盘
   - **主要语言**: 简体中文
   - **Bundle ID**: 选择 `com.taoranmr.punishmentroulette`
   - **SKU**: `punishment-roulette-001`（任意唯一标识符）
4. 点击 **创建**

### 步骤 2: 使用 EAS Submit 上传

在终端运行：

```bash
cd /Users/ran/Desktop/usc/聚会惩罚app/app
eas submit --platform ios --latest
```

**会询问你：**
- Apple ID: `rt1855@nyu.edu`
- 密码: 你的 Apple ID 密码或 App-Specific Password

**如果启用了两步验证**，需要生成 App-Specific Password：
1. 访问 https://appleid.apple.com/account/manage
2. 安全 → App 专用密码
3. 生成新密码
4. 使用这个密码代替 Apple ID 密码

### 步骤 3: 等待上传完成

EAS 会自动：
- ✅ 验证构建
- ✅ 上传到 App Store Connect
- ✅ 处理构建（Processing）

---

## 方法 2: 使用 Transporter App（手动上传）

### 步骤 1: 下载 IPA 文件

从之前的构建结果下载：
```
https://expo.dev/artifacts/eas/thXsuDLLEtJ77oJR7CcKHA.ipa
```

或者查看最新的构建：
```bash
cd /Users/ran/Desktop/usc/聚会惩罚app/app
eas build:list --platform ios
```

### 步骤 2: 使用 Transporter 上传

1. **下载 Transporter**（Mac App Store 免费）
   - 搜索 "Transporter"
   - 或访问：https://apps.apple.com/app/transporter/id1450874784

2. **打开 Transporter**

3. **拖拽 IPA 文件**
   - 将 `.ipa` 文件拖到 Transporter 窗口

4. **登录**
   - 使用 `rt1855@nyu.edu` 登录

5. **交付**
   - 点击 **交付** 按钮
   - 等待上传完成

---

## 方法 3: 使用 Xcode（如果你有 Xcode）

1. 打开 Xcode
2. **Window** → **Organizer**
3. 点击 **Distribute App**
4. 选择 **App Store Connect**
5. 选择你的 IPA 文件
6. 按照向导完成

---

## ⚠️ 常见问题

### 问题 1: "App not found in App Store Connect"

**原因**: App 还没有在 App Store Connect 创建

**解决**: 
1. 先创建 App（见方法 1 步骤 1）
2. 等待几分钟让系统同步
3. 再运行 `eas submit`

### 问题 2: "Invalid Bundle ID"

**原因**: Bundle ID 不匹配

**解决**: 
- 确保 App Store Connect 中的 Bundle ID 是 `com.taoranmr.punishmentroulette`
- 检查 `app.json` 中的 `bundleIdentifier` 是否一致

### 问题 3: "需要 App-Specific Password"

**原因**: 启用了两步验证

**解决**: 
1. 生成 App-Specific Password（见方法 1）
2. 使用这个密码代替 Apple ID 密码

### 问题 4: "构建正在处理中"

**正常现象**: 
- 上传后，Apple 需要 10-30 分钟处理构建
- 在 App Store Connect → TestFlight 或 App 信息中查看状态
- 状态会从 "Processing" → "Ready to Submit"

---

## 📋 上传后检查清单

- [ ] 构建已上传到 App Store Connect
- [ ] 构建状态显示 "Ready to Submit"（不是 "Processing"）
- [ ] 在 App Store Connect 中可以看到构建版本号（如 1.0.0 (2)）
- [ ] 准备上传截图和填写 App 信息

---

## 🎯 下一步

上传成功后：

1. **填写 App 信息**
   - 截图（已准备好）
   - 描述（见 `docs/app-store-info.md`）
   - 关键词
   - 隐私政策 URL

2. **选择构建版本**
   - 在 App 信息页面选择刚上传的构建

3. **提交审核**
   - 填写审核信息
   - 提交

---

## 💡 推荐流程

**最快方式**：
```bash
# 1. 确保 App 已在 App Store Connect 创建
# 2. 运行 EAS Submit
cd /Users/ran/Desktop/usc/聚会惩罚app/app
eas submit --platform ios --latest
```

**如果 EAS Submit 有问题**：
- 使用 Transporter App（方法 2）
- 更稳定，但需要手动操作


