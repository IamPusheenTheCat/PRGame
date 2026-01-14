-- 检查所有表是否存在
SELECT 
    table_name,
    table_schema
FROM 
    information_schema.tables 
WHERE 
    table_schema = 'public' 
    AND table_name LIKE 'pr_%'
ORDER BY 
    table_name;

-- 检查 pr_users 表结构
SELECT 
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'pr_users'
ORDER BY 
    ordinal_position;

-- 检查 RLS 是否启用
SELECT 
    tablename,
    rowsecurity
FROM 
    pg_tables
WHERE 
    schemaname = 'public' 
    AND tablename = 'pr_users';


