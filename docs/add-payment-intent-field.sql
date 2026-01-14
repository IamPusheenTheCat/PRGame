-- =====================================================
-- 添加用户付费意愿追踪字段
-- =====================================================
-- 在 Supabase SQL Editor 中运行此脚本
-- =====================================================

-- 为 pr_users 表添加 showed_payment_intent 字段
ALTER TABLE pr_users 
ADD COLUMN IF NOT EXISTS showed_payment_intent BOOLEAN DEFAULT FALSE;

-- 添加注释
COMMENT ON COLUMN pr_users.showed_payment_intent IS '是否点击过付费按钮，表示有付费意愿';

-- 为已有用户设置默认值（可选，如果字段已经添加就不需要）
UPDATE pr_users 
SET showed_payment_intent = FALSE 
WHERE showed_payment_intent IS NULL;


