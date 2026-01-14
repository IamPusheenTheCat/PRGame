-- =====================================================
-- 修复被踢出成员无法收到通知的问题
-- =====================================================

-- 步骤 1: 检查当前配置
-- =====================================================

-- 1.1 检查 pr_members 是否在 realtime publication 中
SELECT 
  '1. Realtime Publication Check' as step,
  schemaname, 
  tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'pr_members';
-- 期望：应该有一行输出 (public, pr_members)

-- 1.2 检查 replica identity（必须是 FULL 才能在 DELETE 时获取 old 数据）
SELECT 
  '2. Replica Identity Check' as step,
  c.relname as table_name,
  CASE c.relreplident
    WHEN 'd' THEN 'DEFAULT (只有主键)'
    WHEN 'n' THEN 'NOTHING (无数据)'
    WHEN 'f' THEN 'FULL (所有列) ✅'
    WHEN 'i' THEN 'INDEX'
  END as replica_identity
FROM pg_class c
WHERE c.relname = 'pr_members';
-- 期望：replica_identity = 'FULL (所有列) ✅'

-- 1.3 检查 RLS 策略
SELECT 
  '3. RLS Policy Check' as step,
  policyname,
  cmd as command,
  roles
FROM pg_policies 
WHERE tablename = 'pr_members'
ORDER BY cmd;
-- 期望：至少有 SELECT 策略允许读取


-- 步骤 2: 修复配置
-- =====================================================

-- 2.1 启用 Realtime（如果还没有启用）
DO $$
BEGIN
  -- 尝试添加到 realtime publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE pr_members;
    RAISE NOTICE '✅ pr_members 已添加到 realtime publication';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE '✅ pr_members 已经在 realtime publication 中';
  END;
END $$;

-- 2.2 设置 Replica Identity 为 FULL
-- 这样在 DELETE 时可以获取被删除行的所有数据
ALTER TABLE pr_members REPLICA IDENTITY FULL;
-- 注意：这会增加一些存储开销，但对于小表来说影响很小

-- 2.3 验证修复
SELECT 
  '4. Verification' as step,
  'pr_members Realtime enabled' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'pr_members'
    ) THEN '✅ YES'
    ELSE '❌ NO'
  END as status;

SELECT 
  '4. Verification' as step,
  'pr_members Replica Identity FULL' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_class 
      WHERE relname = 'pr_members' 
      AND relreplident = 'f'
    ) THEN '✅ YES'
    ELSE '❌ NO'
  END as status;


-- 步骤 3: 测试配置
-- =====================================================

-- 3.1 查看当前所有成员
SELECT 
  '5. Current Members' as step,
  m.id,
  m.user_id,
  u.name as user_name,
  g.name as group_name
FROM pr_members m
JOIN pr_users u ON u.id = m.user_id
JOIN pr_groups g ON g.id = m.group_id
ORDER BY g.name, u.name;

-- 3.2 模拟删除（不要真的运行，只是看看会返回什么）
-- DELETE FROM pr_members WHERE user_id = 'xxx' RETURNING *;


-- 步骤 4: 其他表也启用 Realtime
-- =====================================================

-- 确保所有相关表都启用了 Realtime
DO $$
BEGIN
  -- pr_groups
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE pr_groups;
    RAISE NOTICE '✅ pr_groups 已添加到 realtime publication';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE '✅ pr_groups 已经在 realtime publication 中';
  END;

  -- pr_punishments
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE pr_punishments;
    RAISE NOTICE '✅ pr_punishments 已添加到 realtime publication';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE '✅ pr_punishments 已经在 realtime publication 中';
  END;

  -- pr_records
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE pr_records;
    RAISE NOTICE '✅ pr_records 已添加到 realtime publication';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE '✅ pr_records 已经在 realtime publication 中';
  END;
END $$;

-- 为其他表也设置 FULL replica identity
ALTER TABLE pr_groups REPLICA IDENTITY FULL;
ALTER TABLE pr_punishments REPLICA IDENTITY FULL;
ALTER TABLE pr_records REPLICA IDENTITY FULL;


-- 步骤 5: 最终验证
-- =====================================================

SELECT 
  '6. Final Check - All Tables' as step,
  tablename,
  CASE 
    WHEN tablename IN (
      SELECT tablename FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime'
    ) THEN '✅ Realtime Enabled'
    ELSE '❌ Not Enabled'
  END as realtime_status,
  CASE c.relreplident
    WHEN 'f' THEN '✅ FULL'
    WHEN 'd' THEN '⚠️ DEFAULT'
    ELSE '❌ ' || c.relreplident
  END as replica_identity
FROM information_schema.tables t
LEFT JOIN pg_class c ON c.relname = t.table_name
WHERE t.table_schema = 'public'
AND t.table_name LIKE 'pr_%'
AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;


-- =====================================================
-- 使用说明
-- =====================================================

-- 1. 在 Supabase Dashboard 的 SQL Editor 中运行此脚本
-- 2. 检查所有输出，确保看到 ✅ 标记
-- 3. 如果看到 ❌ 标记，说明配置有问题
-- 4. 运行后，重启你的 App 测试踢出功能

-- =====================================================
-- 预期输出示例
-- =====================================================

-- 1. Realtime Publication Check
-- step                          | schemaname | tablename
-- ----------------------------- | ---------- | ----------
-- 1. Realtime Publication Check | public     | pr_members

-- 2. Replica Identity Check
-- step                      | table_name | replica_identity
-- ------------------------- | ---------- | -----------------
-- 2. Replica Identity Check | pr_members | FULL (所有列) ✅

-- 4. Verification
-- step           | check_name                        | status
-- -------------- | --------------------------------- | ------
-- 4. Verification| pr_members Realtime enabled       | ✅ YES
-- 4. Verification| pr_members Replica Identity FULL  | ✅ YES

-- 6. Final Check - All Tables
-- step                          | tablename      | realtime_status      | replica_identity
-- ----------------------------- | -------------- | -------------------- | ----------------
-- 6. Final Check - All Tables   | pr_groups      | ✅ Realtime Enabled  | ✅ FULL
-- 6. Final Check - All Tables   | pr_members     | ✅ Realtime Enabled  | ✅ FULL
-- 6. Final Check - All Tables   | pr_punishments | ✅ Realtime Enabled  | ✅ FULL
-- 6. Final Check - All Tables   | pr_records     | ✅ Realtime Enabled  | ✅ FULL

