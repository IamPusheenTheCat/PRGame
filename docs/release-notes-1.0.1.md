# 📱 版本 1.0.1 发布说明

## 发布日期
2026-01-08

## 版本信息
- **版本号**: 1.0.1
- **Build Number**: 4
- **Bundle ID**: com.taoranmr.punishmentroulette

---

## 🆕 新功能

### 付费意愿追踪
- 📊 添加了用户付费意愿追踪功能
- 💡 当用户点击"确认支付"按钮时，系统会在后端记录这一行为
- 🔒 完全在后台运行，不影响用户体验

---

## 🐛 Bug 修复

### iPad 支持问题
- ✅ 修复了 App Store 审核时 iPad 兼容性问题
- ✅ 明确设置应用为 iPhone 专用（`UIDeviceFamily: [1]`）
- ✅ 确保应用不会在 iPad App Store 中显示

---

## 🔧 技术改进

### 数据库
- 在 `pr_users` 表添加了 `showed_payment_intent` 字段
- 优化了用户数据追踪能力

### 代码优化
- 更新了 TypeScript 类型定义
- 改进了 authStore 的功能
- 优化了 UnlockScreen 的用户体验

---

## 📋 审核信息（给 Apple 审核员）

```
Version 1.0.1 Update:

Changes in this version:
1. Fixed iPad compatibility issue - app is now iPhone-only as intended
2. Added backend analytics for better understanding user preferences
3. Bug fixes and performance improvements

No new features that require testing.
Test account is not required - users can create their own profiles.
```

---

## 🚀 发布清单

- [x] 更新版本号到 1.0.1
- [x] 更新 buildNumber 到 4
- [x] 添加 iPad 设备限制配置
- [x] 实现付费意愿追踪功能
- [x] 更新数据库 schema
- [ ] 运行数据库迁移脚本
- [ ] 构建 iOS 版本
- [ ] 提交到 App Store
- [ ] 等待审核

---

## 📊 期望数据收集

通过这个版本，我们将能够：
- 了解有多少用户对付费功能感兴趣
- 为未来的定价策略提供数据支持
- 优化付费功能的设计和展示

---

## 🔄 下一步

1. 在 Supabase 运行迁移脚本
2. 构建新版本
3. 提交到 App Store Connect
4. 监控审核状态


