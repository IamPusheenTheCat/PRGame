# 🔑 生成 App Store Connect API Key

## 为什么使用 API Key？

- ✅ **更安全**：不需要每次输入密码
- ✅ **更方便**：EAS 可以自动使用，无需交互
- ✅ **推荐方式**：Apple 官方推荐

---

## 步骤 1: 生成 API Key

1. **登录 App Store Connect**
   - 访问：https://appstoreconnect.apple.com/
   - 使用 `rt1855@nyu.edu` 登录

2. **进入用户和访问**
   - 点击右上角你的头像
   - 选择 **用户和访问**

3. **创建 API Key**
   - 点击 **密钥** 标签页
   - 点击 **+** 按钮（或 "生成 API 密钥"）

4. **填写信息**
   - **名称**: `EAS Build & Submit`（或任意名称）
   - **访问**: 选择 **App Manager** 或 **Admin**
   - 点击 **生成**

5. **下载 Key 文件**
   - ⚠️ **重要**：只能下载一次！
   - 点击 **下载 API 密钥**
   - 保存 `.p8` 文件到安全位置
   - 记录 **密钥 ID**（10 位字符）

---

## 步骤 2: 配置 EAS

### 方法 A: 自动配置（推荐）

当 EAS 询问时，选择 **Yes**，然后：

1. 输入 **密钥 ID**（10 位字符）
2. 输入 **Issuer ID**（在 App Store Connect → 用户和访问 → 密钥页面顶部）
3. 提供 `.p8` 文件路径

### 方法 B: 手动配置

在 `eas.json` 中添加：

```json
{
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "你的 App ID",
        "appleId": "rt1855@nyu.edu",
        "appleTeamId": "JRXM8D3T9M",
        "ascApiKeyPath": "/path/to/AuthKey_XXXXXXXXXX.p8",
        "ascApiKeyId": "XXXXXXXXXX",
        "ascApiIssuer": "你的 Issuer ID"
      }
    }
  }
}
```

---

## 步骤 3: 使用 API Key 上传

配置完成后，运行：

```bash
eas submit --platform ios --latest
```

EAS 会自动使用 API Key，不再询问密码！

---

## 📋 需要的信息

生成 API Key 后，你需要：

1. **密钥 ID** (Key ID)
   - 10 位字符，如：`ABC123DEF4`
   - 在 App Store Connect 中显示

2. **Issuer ID** (Issuer)
   - UUID 格式，如：`12345678-1234-1234-1234-123456789012`
   - 在密钥页面顶部显示

3. **.p8 文件**
   - 下载的密钥文件
   - 文件名格式：`AuthKey_XXXXXXXXXX.p8`
   - ⚠️ 只能下载一次，请妥善保管！

---

## 🔒 安全建议

- ✅ 将 `.p8` 文件保存在安全位置
- ✅ 不要提交到 Git（已在 `.gitignore` 中）
- ✅ 可以创建多个 Key 用于不同用途
- ✅ 如果泄露，立即撤销并重新生成

---

## ❓ 常见问题

### Q: 找不到 Issuer ID？
**A**: 在 App Store Connect → 用户和访问 → 密钥页面，Issuer ID 显示在页面顶部。

### Q: 可以生成多个 Key 吗？
**A**: 可以，每个 Key 有独立的权限和用途。

### Q: Key 丢失了怎么办？
**A**: 需要撤销旧 Key 并生成新的。旧 Key 无法恢复。

### Q: 权限不够？
**A**: 确保选择 **App Manager** 或 **Admin** 权限。**Developer** 权限可能不够。


