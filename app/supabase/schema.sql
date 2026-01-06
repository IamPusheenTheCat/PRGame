-- =====================================================
-- 🎲 惩罚轮盘 (Punishment Roulette) 数据库 Schema
-- =====================================================
-- 所有表名以 pr_ 前缀开头，便于在 Supabase Table Editor 中识别
-- 在 Supabase SQL Editor 中运行此文件
-- =====================================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- pr_users - 用户表
-- =====================================================
CREATE TABLE IF NOT EXISTS pr_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_initials TEXT,
  instruments TEXT[] DEFAULT '{}',
  punctuality TEXT, -- 'punctual' 或 'late'，用户自认守时习惯
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE pr_users IS '🎲惩罚轮盘 - 用户信息表';
COMMENT ON COLUMN pr_users.device_id IS '设备唯一标识';
COMMENT ON COLUMN pr_users.name IS '用户名称';
COMMENT ON COLUMN pr_users.avatar_initials IS '头像显示文字（名字缩写）';
COMMENT ON COLUMN pr_users.instruments IS '选择的乐器/图标ID数组';
COMMENT ON COLUMN pr_users.punctuality IS '守时习惯: punctual=守时, late=承认迟到';

-- =====================================================
-- pr_groups - 群组表
-- =====================================================
CREATE TABLE IF NOT EXISTS pr_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '🎸',
  invite_code CHAR(4) UNIQUE NOT NULL,
  admin_id UUID REFERENCES pr_users(id) NOT NULL,
  max_punishments_per_person INTEGER DEFAULT 5,
  expires_at TIMESTAMP WITH TIME ZONE,
  allow_anonymous_unlock BOOLEAN DEFAULT TRUE,
  ai_matching_enabled BOOLEAN DEFAULT TRUE,
  is_band BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE pr_groups IS '🎲惩罚轮盘 - 群组信息表';
COMMENT ON COLUMN pr_groups.invite_code IS '4位邀请码';
COMMENT ON COLUMN pr_groups.admin_id IS '群组管理员';
COMMENT ON COLUMN pr_groups.max_punishments_per_person IS '每人最多可设置的惩罚数';
COMMENT ON COLUMN pr_groups.expires_at IS '惩罚表解锁时间';
COMMENT ON COLUMN pr_groups.is_band IS '是否是乐队（影响成员可选图标）';

-- 邀请码索引
CREATE INDEX IF NOT EXISTS idx_pr_groups_invite_code ON pr_groups(invite_code);

-- =====================================================
-- pr_members - 群组成员表
-- =====================================================
CREATE TABLE IF NOT EXISTS pr_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES pr_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES pr_users(id) ON DELETE CASCADE NOT NULL,
  has_completed_setup BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

COMMENT ON TABLE pr_members IS '🎲惩罚轮盘 - 群组成员关系表';
COMMENT ON COLUMN pr_members.has_completed_setup IS '是否已完成惩罚设置';

-- 成员查询索引
CREATE INDEX IF NOT EXISTS idx_pr_members_group ON pr_members(group_id);
CREATE INDEX IF NOT EXISTS idx_pr_members_user ON pr_members(user_id);

-- =====================================================
-- pr_punishments - 惩罚项目表
-- =====================================================
CREATE TABLE IF NOT EXISTS pr_punishments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES pr_groups(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES pr_users(id) NOT NULL,
  target_id UUID REFERENCES pr_users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE pr_punishments IS '🎲惩罚轮盘 - 惩罚项目表';
COMMENT ON COLUMN pr_punishments.author_id IS '惩罚编写者';
COMMENT ON COLUMN pr_punishments.target_id IS '惩罚目标用户';
COMMENT ON COLUMN pr_punishments.is_used IS '是否已被抽中使用';

-- 惩罚查询索引
CREATE INDEX IF NOT EXISTS idx_pr_punishments_group ON pr_punishments(group_id);
CREATE INDEX IF NOT EXISTS idx_pr_punishments_target ON pr_punishments(target_id);
CREATE INDEX IF NOT EXISTS idx_pr_punishments_author ON pr_punishments(author_id);

-- =====================================================
-- pr_records - 惩罚执行记录表
-- =====================================================
CREATE TABLE IF NOT EXISTS pr_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES pr_groups(id) ON DELETE CASCADE NOT NULL,
  punishment_id UUID REFERENCES pr_punishments(id),
  punished_user_id UUID REFERENCES pr_users(id) NOT NULL,
  late_minutes INTEGER,
  mood TEXT,
  preference TEXT,
  user_message TEXT,
  ai_reason TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  guessed_author_id UUID REFERENCES pr_users(id),
  guess_correct BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE pr_records IS '🎲惩罚轮盘 - 惩罚执行历史记录';
COMMENT ON COLUMN pr_records.punished_user_id IS '被惩罚的用户';
COMMENT ON COLUMN pr_records.user_message IS '用户输入的心情/偏好';
COMMENT ON COLUMN pr_records.ai_reason IS 'AI推荐理由';
COMMENT ON COLUMN pr_records.guessed_author_id IS '用户猜测的作者';
COMMENT ON COLUMN pr_records.guess_correct IS '猜测是否正确';

-- 记录查询索引
CREATE INDEX IF NOT EXISTS idx_pr_records_group ON pr_records(group_id);

-- =====================================================
-- pr_unlocks - 解锁记录表
-- =====================================================
CREATE TABLE IF NOT EXISTS pr_unlocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES pr_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES pr_users(id) NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

COMMENT ON TABLE pr_unlocks IS '🎲惩罚轮盘 - 惩罚表解锁记录';
COMMENT ON COLUMN pr_unlocks.unlocked_at IS '解锁时间';

-- =====================================================
-- Row Level Security (RLS) 策略
-- =====================================================

-- 启用 RLS
ALTER TABLE pr_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_punishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_unlocks ENABLE ROW LEVEL SECURITY;

-- pr_users 策略
CREATE POLICY "pr_users_select" ON pr_users FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pr_users_insert" ON pr_users FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "pr_users_update" ON pr_users FOR UPDATE TO anon, authenticated USING (true);

-- pr_groups 策略
CREATE POLICY "pr_groups_select" ON pr_groups FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pr_groups_insert" ON pr_groups FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "pr_groups_update" ON pr_groups FOR UPDATE TO anon, authenticated USING (true);

-- pr_members 策略
CREATE POLICY "pr_members_select" ON pr_members FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pr_members_insert" ON pr_members FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "pr_members_update" ON pr_members FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "pr_members_delete" ON pr_members FOR DELETE TO anon, authenticated USING (true);

-- pr_punishments 策略
CREATE POLICY "pr_punishments_select" ON pr_punishments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pr_punishments_insert" ON pr_punishments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "pr_punishments_update" ON pr_punishments FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "pr_punishments_delete" ON pr_punishments FOR DELETE TO anon, authenticated USING (true);

-- pr_records 策略
CREATE POLICY "pr_records_select" ON pr_records FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pr_records_insert" ON pr_records FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "pr_records_update" ON pr_records FOR UPDATE TO anon, authenticated USING (true);

-- pr_unlocks 策略
CREATE POLICY "pr_unlocks_select" ON pr_unlocks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pr_unlocks_insert" ON pr_unlocks FOR INSERT TO anon, authenticated WITH CHECK (true);

-- =====================================================
-- pr_suggestions - AI惩罚建议表
-- =====================================================
CREATE TABLE IF NOT EXISTS pr_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES pr_groups(id) ON DELETE CASCADE NOT NULL,
  target_id UUID REFERENCES pr_users(id) NOT NULL,
  suggestion TEXT NOT NULL,
  reason TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, target_id, suggestion)
);

COMMENT ON TABLE pr_suggestions IS '🎲惩罚轮盘 - AI个性化惩罚建议';
COMMENT ON COLUMN pr_suggestions.target_id IS '建议针对的目标用户';
COMMENT ON COLUMN pr_suggestions.suggestion IS 'AI生成的惩罚建议';
COMMENT ON COLUMN pr_suggestions.reason IS '为什么这个惩罚适合这个人';

-- 建议查询索引
CREATE INDEX IF NOT EXISTS idx_pr_suggestions_target ON pr_suggestions(group_id, target_id);

-- pr_suggestions 策略
ALTER TABLE pr_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pr_suggestions_select" ON pr_suggestions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pr_suggestions_insert" ON pr_suggestions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "pr_suggestions_delete" ON pr_suggestions FOR DELETE TO anon, authenticated USING (true);

-- =====================================================
-- 启用实时订阅
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE pr_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE pr_members;
ALTER PUBLICATION supabase_realtime ADD TABLE pr_punishments;
ALTER PUBLICATION supabase_realtime ADD TABLE pr_records;
