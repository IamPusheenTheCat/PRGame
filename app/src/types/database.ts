// 数据库类型定义

export interface User {
  id: string;
  device_id: string;
  name: string;
  avatar_initials: string | null;
  instruments: string[];
  punctuality: 'punctual' | 'late' | null; // 用户自认守时习惯
  showed_payment_intent?: boolean; // 是否点击过付费按钮，表示有付费意愿
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  invite_code: string;
  admin_id: string;
  max_punishments_per_person: number;
  expires_at: string | null;
  allow_anonymous_unlock: boolean;
  ai_matching_enabled: boolean;
  is_band: boolean; // 是否是乐队
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  has_completed_setup: boolean;
  joined_at: string;
  // 关联数据
  user?: User;
}

export interface Punishment {
  id: string;
  group_id: string;
  author_id: string;
  target_id: string;
  title: string;
  description: string | null;
  is_used: boolean;
  created_at: string;
  // 关联数据
  author?: User;
  target?: User;
}

export interface PunishmentRecord {
  id: string;
  group_id: string;
  punishment_id: string;
  punished_user_id: string;
  late_minutes: number | null;
  mood: string | null;
  preference: string | null;
  user_message: string | null;
  ai_reason: string | null;
  is_completed: boolean;
  guessed_author_id: string | null;
  guess_correct: boolean | null;
  created_at: string;
  // 关联数据
  punishment?: Punishment;
  punished_user?: User;
}

export interface UnlockRecord {
  id: string;
  group_id: string;
  user_id: string;
  unlocked_at: string;
}

export interface AISuggestion {
  id: string;
  group_id: string;
  target_id: string;
  suggestion: string;
  reason: string | null;
  generated_at: string;
}

// 创建群组参数
export interface CreateGroupParams {
  name: string;
  emoji: string;
  admin_id: string;
  max_punishments_per_person: number;
  expires_at: string | null;
  allow_anonymous_unlock: boolean;
  ai_matching_enabled: boolean;
  is_band: boolean;
}

// AI 匹配参数
export interface AIMatchParams {
  punishments: Punishment[];
  mood: string;
  preference: string;
  user_message: string;
  user_name: string;
}

// AI 匹配结果
export interface AIMatchResult {
  selected_index: number;
  reason: string;
}

