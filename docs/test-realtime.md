# Realtime 功能测试指南

## 📋 需要测试的场景

### 1. 新成员加入群组
**测试步骤：**
- 设备 A：已在圆桌页面
- 设备 B：新用户加入群组
- **预期：** 设备 A 自动显示新成员

### 2. 成员被踢出
**测试步骤：**
- 设备 A：已在圆桌页面
- 设备 B（管理员）：踢出某个成员
- **预期：** 设备 A 自动移除该成员

### 3. 添加惩罚
**测试步骤：**
- 设备 A：已在圆桌页面
- 设备 B：添加惩罚
- **预期：** 设备 A 自动显示惩罚数量变化

### 4. 修改群组设置
**测试步骤：**
- 设备 A：已在设置页面
- 设备 B（管理员）：修改解锁时间
- **预期：** 设备 A 自动显示新设置

---

## 🔍 检查控制台日志

### 正常的日志输出

```
[Realtime] Setting up subscription for group: abc123
[Realtime] Subscription status: SUBSCRIBED
[Realtime] Group members changed: INSERT
[GroupStore] Loading members for group: abc123
```

### 异常的日志

```
❌ [Realtime] Subscription status: TIMED_OUT
❌ [Realtime] Subscription status: CHANNEL_ERROR
```

---

## ⚙️ 在 Supabase 中启用 Realtime

### 步骤 1：运行检查脚本

1. 登录 Supabase Dashboard
2. 打开 SQL Editor
3. 粘贴并运行 `docs/check-realtime-setup.sql`

### 步骤 2：查看结果

应该看到所有表：
```
pr_groups
pr_members
pr_punishments
pr_records
pr_suggestions
```

### 步骤 3：如果表缺失

运行启用命令（在 SQL Editor 中）：
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE pr_members;
```

---

## 🐛 调试技巧

### 1. 检查订阅状态
在 `RoundTableScreen` 添加日志：
```typescript
useEffect(() => {
  console.log('[RoundTable] Members count:', members.length);
  console.log('[RoundTable] Members:', members.map(m => m.user?.name));
}, [members]);
```

### 2. 检查网络
- 确保设备连接到互联网
- Realtime 需要 WebSocket 连接
- 检查防火墙设置

### 3. 手动触发刷新
如果 Realtime 不工作，可以临时添加下拉刷新：
```typescript
// 在 RoundTableScreen 中
const handleRefresh = async () => {
  if (currentGroup) {
    await loadMembers(currentGroup.id);
    await loadPunishments(currentGroup.id);
  }
};
```

---

## ✅ 验证成功标准

- [ ] 新成员加入时，2 秒内自动显示
- [ ] 成员被踢出时，2 秒内自动消失
- [ ] 添加惩罚时，2 秒内自动更新计数
- [ ] 控制台显示 `SUBSCRIBED` 状态
- [ ] 控制台显示变化事件日志

