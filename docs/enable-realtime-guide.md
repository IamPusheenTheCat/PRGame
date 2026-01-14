# 启用 Supabase Realtime 实时订阅指南

## 问题描述
新成员加入群组后，其他成员的页面不会自动更新，需要手动刷新。

## 原因
Supabase Realtime 订阅可能未正确配置。

---

## 解决方案

### 方法 1：通过 Supabase Dashboard 检查（推荐）

1. **登录 Supabase Dashboard**
   - 访问：https://supabase.com/dashboard
   - 选择你的项目

2. **检查 Realtime 是否启用**
   - 左侧菜单：`Database` → `Replication`
   - 查找 `supabase_realtime` publication
   - 确认以下表已启用 Realtime：
     - ✅ `pr_groups`
     - ✅ `pr_members`
     - ✅ `pr_punishments`
     - ✅ `pr_records`
     - ✅ `pr_suggestions`

3. **如果表没有启用**
   - 点击每个表旁边的开关
   - 或使用下面的 SQL 方法

### 方法 2：通过 SQL 启用

1. **打开 SQL Editor**
   - Supabase Dashboard → `SQL Editor`
   - 创建新查询

2. **运行检查和启用脚本**
   ```sql
   -- 检查当前配置
   SELECT schemaname, tablename 
   FROM pg_publication_tables 
   WHERE pubname = 'supabase_realtime' 
   AND schemaname = 'public'
   AND tablename LIKE 'pr_%';
   
   -- 启用 Realtime（如果没有启用）
   ALTER PUBLICATION supabase_realtime ADD TABLE pr_groups;
   ALTER PUBLICATION supabase_realtime ADD TABLE pr_members;
   ALTER PUBLICATION supabase_realtime ADD TABLE pr_punishments;
   ALTER PUBLICATION supabase_realtime ADD TABLE pr_records;
   ALTER PUBLICATION supabase_realtime ADD TABLE pr_suggestions;
   ```

3. **验证配置**
   - 重新运行第一个查询
   - 确认所有 `pr_` 表都显示在结果中

---

## 测试 Realtime 是否工作

### 测试步骤

1. **准备两个设备**
   - 设备 A：已加入群组的用户（管理员或普通成员）
   - 设备 B：新用户

2. **设备 A 操作**
   - 打开 App
   - 进入圆桌页面
   - 保持页面打开

3. **设备 B 操作**
   - 打开 App
   - 输入名字和图标
   - 输入邀请码加入群组

4. **预期结果**
   - ✅ **设备 A 自动刷新**：新成员出现在圆桌上
   - ✅ **无需手动刷新**
   - ✅ **控制台显示**：`[Realtime] Group members changed: INSERT`

### 如果不工作

检查控制台日志：

```
[Realtime] Setting up subscription for group: xxx
[Realtime] Subscription status: SUBSCRIBED
```

如果看不到 `SUBSCRIBED`，可能的原因：
1. Realtime 未在 Supabase 启用
2. 网络连接问题
3. Supabase 项目配置问题

---

## 代码更新

已优化 `useRealtime` hook：

### 主要改进

1. **添加订阅状态日志**
   ```typescript
   .subscribe((status) => {
     console.log('[Realtime] Subscription status:', status);
   });
   ```

2. **减少重新订阅**
   - 只依赖 `groupId`，避免频繁重建订阅
   - 使用 `useRef` 管理 channel 生命周期

3. **更详细的变化日志**
   ```typescript
   (payload) => {
     console.log('[Realtime] Group members changed:', payload.eventType);
     loadMembers(groupId);
   }
   ```

---

## 常见问题

### Q1: 订阅建立了但不触发更新？
**A:** 检查 Row Level Security (RLS) 策略，确保用户有权限查询变更：
```sql
-- 检查 pr_members 的 SELECT 策略
SELECT * FROM pg_policies WHERE tablename = 'pr_members';
```

### Q2: 本地测试时 Realtime 不工作？
**A:** 
- 确保设备连接到互联网
- Realtime 需要 WebSocket 连接
- 检查防火墙/代理设置

### Q3: 只有部分表的变化能订阅到？
**A:** 
- 逐个检查每个表的 Realtime 配置
- 运行 `check-realtime-setup.sql`

---

## 验证清单

在提交到 App Store 前，确保：

- [ ] 在 Supabase Dashboard 确认所有 `pr_` 表启用了 Realtime
- [ ] 运行 `check-realtime-setup.sql` 验证配置
- [ ] 测试新成员加入时，现有成员能自动看到更新
- [ ] 测试添加惩罚时，其他成员能自动看到更新
- [ ] 测试成员被踢出时，其他成员能自动看到更新
- [ ] 检查控制台日志确认订阅状态为 `SUBSCRIBED`

---

## 相关文件

- `/app/src/hooks/useRealtime.ts` - Realtime 订阅实现
- `/app/supabase/schema.sql` - 数据库配置（包含 Realtime 设置）
- `/docs/check-realtime-setup.sql` - 检查和启用脚本

