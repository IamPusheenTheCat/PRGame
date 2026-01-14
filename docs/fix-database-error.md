# 🔧 修复 "could not find pr_users" 错误

## 问题原因

这个错误通常是因为：
1. **表还没有在 Supabase 中创建**
2. **表名拼写错误**（pr_user vs pr_users）
3. **RLS 策略阻止访问**

---

## ✅ 解决方案

### 步骤 1: 检查表是否存在

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard/project/ipnrutklzumiicsnacib)
2. 进入 **SQL Editor**
3. 运行以下查询：

```sql
-- 检查所有 pr_ 开头的表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'pr_%';
```

**如果返回空结果** → 表还没有创建，继续步骤 2

**如果看到 pr_users** → 表已存在，检查步骤 3

---

### 步骤 2: 创建所有表

1. 在 Supabase SQL Editor 中
2. 复制整个 `app/supabase/schema.sql` 文件内容
3. 粘贴到 SQL Editor
4. 点击 **Run** 执行

**⚠️ 重要**：确保执行完整的 schema.sql，包括：
- ✅ pr_users
- ✅ pr_groups  
- ✅ pr_members
- ✅ pr_punishments
- ✅ pr_records
- ✅ pr_unlocks
- ✅ pr_suggestions
- ✅ 所有 RLS 策略
- ✅ 所有索引

---

### 步骤 3: 验证表结构

运行检查脚本：

```sql
-- 检查 pr_users 表结构
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'pr_users';
```

应该看到这些列：
- id (uuid)
- device_id (text)
- name (text)
- avatar_initials (text)
- instruments (text[])
- punctuality (text)
- created_at (timestamp)

---

### 步骤 4: 检查 RLS 策略

```sql
-- 检查 RLS 是否启用
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'pr_users';

-- 检查策略
SELECT * FROM pg_policies 
WHERE tablename = 'pr_users';
```

确保有这些策略：
- `pr_users_select` - SELECT 权限
- `pr_users_insert` - INSERT 权限  
- `pr_users_update` - UPDATE 权限

---

### 步骤 5: 测试连接

在 App 中测试：
1. 重新启动 App
2. 尝试登录/注册
3. 检查控制台日志

如果还有错误，查看具体错误信息。

---

## 🚨 常见错误

### 错误 1: "relation pr_users does not exist"
**原因**：表没有创建  
**解决**：运行完整的 schema.sql

### 错误 2: "permission denied for table pr_users"
**原因**：RLS 策略问题  
**解决**：检查并重新创建 RLS 策略

### 错误 3: "column punctuality does not exist"
**原因**：表结构过旧  
**解决**：运行 ALTER TABLE 添加列，或删除表重新创建

---

## 📋 快速修复 SQL

如果表不存在，运行这个：

```sql
-- 快速创建 pr_users 表（如果不存在）
CREATE TABLE IF NOT EXISTS pr_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_initials TEXT,
  instruments TEXT[] DEFAULT '{}',
  punctuality TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE pr_users ENABLE ROW LEVEL SECURITY;

-- 创建策略
CREATE POLICY "pr_users_select" ON pr_users FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pr_users_insert" ON pr_users FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "pr_users_update" ON pr_users FOR UPDATE TO anon, authenticated USING (true);
```

---

## ✅ 验证清单

- [ ] 所有表都已创建（pr_users, pr_groups, pr_members, etc.）
- [ ] RLS 已启用
- [ ] 策略已创建
- [ ] 索引已创建
- [ ] App 可以连接 Supabase
- [ ] 可以创建用户
- [ ] 可以查询数据

完成这些步骤后，错误应该就解决了！🎉


