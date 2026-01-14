-- =====================================================
-- 检查和启用 Supabase Realtime 订阅
-- =====================================================

-- 1. 检查当前哪些表启用了 realtime
SELECT 
  schemaname, 
  tablename 
FROM 
  pg_publication_tables 
WHERE 
  pubname = 'supabase_realtime';

-- 2. 如果表没有在 realtime publication 中，添加它们
ALTER PUBLICATION supabase_realtime ADD TABLE pr_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE pr_members;
ALTER PUBLICATION supabase_realtime ADD TABLE pr_punishments;
ALTER PUBLICATION supabase_realtime ADD TABLE pr_records;
ALTER PUBLICATION supabase_realtime ADD TABLE pr_suggestions;

-- 3. 如果上面的命令报错 "table already member of publication"，
--    说明 realtime 已经启用，可以忽略错误

-- 4. 验证配置
SELECT 
  schemaname, 
  tablename 
FROM 
  pg_publication_tables 
WHERE 
  pubname = 'supabase_realtime'
  AND schemaname = 'public'
  AND tablename LIKE 'pr_%'
ORDER BY tablename;

-- 期望输出应该包含：
-- pr_groups
-- pr_members
-- pr_punishments
-- pr_records
-- pr_suggestions

