# 调试：被踢出成员未收到通知

## 🐛 问题

被移除的成员没有收到提示，不知道自己被移除了。

---

## 🔍 调试步骤

### 步骤 1：检查 Supabase Realtime 配置

1. **登录 Supabase Dashboard**
   - 访问：https://supabase.com/dashboard
   - 选择你的项目

2. **检查 Realtime 是否启用**
   - 左侧菜单：`Database` → `Replication`
   - 找到 `supabase_realtime` publication
   - **确认 `pr_members` 表已启用**

3. **或者运行 SQL 检查**
   ```sql
   -- 检查 pr_members 是否在 realtime publication 中
   SELECT schemaname, tablename 
   FROM pg_publication_tables 
   WHERE pubname = 'supabase_realtime' 
   AND tablename = 'pr_members';
   ```

   **期望输出：**
   ```
   schemaname | tablename
   -----------+-----------
   public     | pr_members
   ```

4. **如果没有输出，运行启用命令**
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE pr_members;
   ```

---

### 步骤 2：检查 RLS 策略

Realtime 需要正确的 Row Level Security 策略才能推送变更。

```sql
-- 检查 pr_members 的 RLS 策略
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'pr_members';
```

**期望输出：** 应该有 SELECT 策略允许所有用户读取

---

### 步骤 3：测试 Realtime 连接

1. **打开被踢用户的设备**
2. **打开控制台（React Native Debugger 或 Expo Go）**
3. **观察日志**

**期望看到的日志：**
```
[Realtime] Setting up subscription for group: xxx
[Realtime] Subscription status: SUBSCRIBED
```

**如果看到：**
```
[Realtime] Subscription status: TIMED_OUT
[Realtime] Subscription status: CHANNEL_ERROR
```
说明 Realtime 连接失败。

---

### 步骤 4：测试踢出功能（详细日志）

我已经添加了详细的调试日志。

**操作：**
1. 设备 A（管理员）踢出设备 B
2. 观察设备 B 的控制台

**期望看到的完整日志：**
```
[Realtime] ========================================
[Realtime] Group members changed event received
[Realtime] Event type: DELETE
[Realtime] Payload: {
  "eventType": "DELETE",
  "old": {
    "id": "xxx",
    "group_id": "xxx",
    "user_id": "被踢用户的ID",
    ...
  }
}
[Realtime] Current user ID: 被踢用户的ID
[Realtime] Payload old user_id: 被踢用户的ID
[Realtime] ========================================
[Realtime] DELETE event detected
[Realtime] User exists: 被踢用户的ID
[Realtime] ⚠️ Current user was kicked (payload.old match)
[Realtime] Calling onKicked callback
[RoundTable] User was kicked from group
```

**如果没有看到任何日志：**
- Realtime 未启用或未连接
- 检查步骤 1 和步骤 3

**如果看到日志但没有 "Current user was kicked"：**
- User ID 不匹配
- 检查 `payload.old?.user_id` 和 `user.id` 是否相同

---

### 步骤 5：检查 Replica Identity

Supabase Realtime 需要表设置为 FULL replica identity 才能在 DELETE 时获取 old 数据。

```sql
-- 检查 pr_members 的 replica identity
SELECT 
  c.relname,
  c.relreplident
FROM pg_class c
WHERE c.relname = 'pr_members';
```

**期望输出：**
- `relreplident = 'f'` (FULL) - ✅ 最佳
- `relreplident = 'd'` (DEFAULT) - ⚠️ 可能有问题

**如果不是 FULL，设置为 FULL：**
```sql
ALTER TABLE pr_members REPLICA IDENTITY FULL;
```

---

## 🔧 修复方案

### 方案 1：启用 Realtime（最可能的问题）

```sql
-- 在 Supabase SQL Editor 运行
ALTER PUBLICATION supabase_realtime ADD TABLE pr_members;
```

### 方案 2：设置 Replica Identity

```sql
-- 在 Supabase SQL Editor 运行
ALTER TABLE pr_members REPLICA IDENTITY FULL;
```

### 方案 3：检查网络连接

- 确保设备连接到互联网
- Realtime 使用 WebSocket，检查防火墙设置
- 尝试重启 App

---

## 📝 测试清单

运行以下 SQL 命令，确保所有配置正确：

```sql
-- 1. 检查 Realtime 是否启用
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'pr_members';
-- 期望：有一行输出

-- 2. 检查 Replica Identity
SELECT c.relname, c.relreplident
FROM pg_class c
WHERE c.relname = 'pr_members';
-- 期望：relreplident = 'f'

-- 3. 检查 RLS 策略
SELECT policyname, cmd
FROM pg_policies 
WHERE tablename = 'pr_members';
-- 期望：至少有一个 SELECT 策略

-- 4. 如果需要，运行修复命令
ALTER PUBLICATION supabase_realtime ADD TABLE pr_members;
ALTER TABLE pr_members REPLICA IDENTITY FULL;
```

---

## 🧪 手动测试步骤

### 准备
- 设备 A：管理员（用于踢人）
- 设备 B：普通成员（将被踢出）
- 打开 React Native Debugger 或 Expo Go 控制台

### 测试
1. 设备 B 进入圆桌页面
2. 设备 B 控制台应显示：
   ```
   [Realtime] Setting up subscription for group: xxx
   [Realtime] Subscription status: SUBSCRIBED
   ```
3. 设备 A 踢出设备 B
4. 设备 B 控制台应显示：
   ```
   [Realtime] ========================================
   [Realtime] Group members changed event received
   [Realtime] Event type: DELETE
   [Realtime] ⚠️ Current user was kicked
   [Realtime] Calling onKicked callback
   ```
5. 设备 B 应弹出提示："已被移除"

### 如果失败
- 复制完整的控制台日志
- 检查上面的 SQL 查询结果
- 确认 Realtime 配置

---

## 🎯 常见原因排查

| 症状 | 可能原因 | 解决方案 |
|------|---------|---------|
| 没有任何 Realtime 日志 | Realtime 未启用 | 运行 `ALTER PUBLICATION supabase_realtime ADD TABLE pr_members` |
| 订阅状态 TIMED_OUT | 网络问题 | 检查网络连接 |
| 收到 DELETE 但没有 old 数据 | Replica Identity 未设置 | 运行 `ALTER TABLE pr_members REPLICA IDENTITY FULL` |
| User ID 不匹配 | 数据不一致 | 检查 user.id 和 payload.old.user_id |
| 收到事件但回调未触发 | onKicked 未传递 | 检查 RoundTableScreen 代码 |

---

## 📞 需要帮助？

如果问题仍然存在，请提供：
1. Supabase SQL 查询结果（上面的 4 个查询）
2. 设备 B 的完整控制台日志
3. 是否看到 "SUBSCRIBED" 状态
4. 是否看到 "DELETE" 事件

---

## ✅ 成功标准

当配置正确时，你应该看到：

```
设备 A 操作：踢出设备 B
         ↓
    < 1 秒后
         ↓
设备 B 控制台：
[Realtime] DELETE event detected
[Realtime] ⚠️ Current user was kicked
         ↓
设备 B 界面：
弹出提示："已被移除"
```

