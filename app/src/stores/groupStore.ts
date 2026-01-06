import { create } from 'zustand';
import { supabase, generateUniqueInviteCode } from '../lib/supabase';
import {
  Group,
  GroupMember,
  Punishment,
  PunishmentRecord,
  AISuggestion,
} from '../types/database';
import { generatePersonalizedSuggestions, UserProfile } from '../lib/deepseek';

interface GroupState {
  currentGroup: Group | null;
  userGroups: Group[];  // 用户所属的所有群组
  members: GroupMember[];
  punishments: Punishment[];
  punishmentRecords: PunishmentRecord[];
  suggestions: Map<string, AISuggestion[]>;  // targetId -> suggestions
  isLoading: boolean;

  // Actions
  createGroup: (name: string, emoji: string, adminId: string, maxPunishments: number, isBand: boolean) => Promise<Group>;
  joinGroup: (inviteCode: string, userId: string) => Promise<Group>;
  leaveGroup: (groupId: string, userId: string) => Promise<void>;
  loadGroup: (groupId: string) => Promise<void>;
  loadUserGroups: (userId: string) => Promise<Group[]>;  // 加载用户所有群组
  switchGroup: (group: Group) => void;  // 切换当前群组
  loadMembers: (groupId: string) => Promise<void>;
  loadPunishments: (groupId: string) => Promise<void>;
  loadPunishmentRecords: (groupId: string) => Promise<void>;
  
  // 惩罚操作
  addPunishment: (groupId: string, authorId: string, targetId: string, title: string, description?: string) => Promise<Punishment>;
  deletePunishment: (punishmentId: string) => Promise<void>;
  
  // 成员设置完成
  markSetupComplete: (groupId: string, userId: string) => Promise<void>;
  
  // 转移管理员权限
  transferAdmin: (groupId: string, newAdminId: string) => Promise<void>;
  
  // 更新群组设置
  updateGroupSettings: (groupId: string, settings: Partial<{
    ai_matching_enabled: boolean;
    max_punishments_per_person: number;
    expires_at: string | null;
  }>) => Promise<void>;
  
  // 解锁相关
  hasUnlocked: boolean;
  checkUnlockStatus: (groupId: string, userId: string) => Promise<boolean>;
  unlockPunishments: (groupId: string, userId: string) => Promise<void>;
  getPunishmentsWithAuthors: (groupId: string) => Promise<any[]>;
  
  // AI 建议相关
  loadSuggestions: (groupId: string, targetId: string) => Promise<AISuggestion[]>;
  generateSuggestions: (groupId: string, targetId: string) => Promise<AISuggestion[]>;
  
  // 清除状态
  clearGroup: () => void;
}

export const useGroupStore = create<GroupState>((set, get) => ({
  currentGroup: null,
  userGroups: [],
  members: [],
  punishments: [],
  punishmentRecords: [],
  suggestions: new Map(),
  isLoading: false,
  hasUnlocked: false,

  createGroup: async (name: string, emoji: string, adminId: string, maxPunishments: number, isBand: boolean) => {
    set({ isLoading: true });

    try {
      const inviteCode = await generateUniqueInviteCode();

      const { data: group, error } = await supabase
        .from('pr_groups')
        .insert({
          name,
          emoji,
          admin_id: adminId,
          invite_code: inviteCode,
          max_punishments_per_person: maxPunishments,
          is_band: isBand,
        })
        .select()
        .single();

      if (error) throw error;
      if (!group) throw new Error('Failed to create group');

      // 管理员自动加入群组
      await supabase.from('pr_members').insert({
        group_id: group.id,
        user_id: adminId,
        has_completed_setup: false,
      });

      // 添加到用户群组列表
      const { userGroups } = get();
      set({ 
        currentGroup: group, 
        userGroups: [...userGroups, group],
        isLoading: false 
      });
      
      // 加载成员
      await get().loadMembers(group.id);
      
      return group;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  joinGroup: async (inviteCode: string, userId: string) => {
    set({ isLoading: true });

    try {
      // 查找群组
      const { data: group, error: groupError } = await supabase
        .from('pr_groups')
        .select('*')
        .eq('invite_code', inviteCode.toUpperCase())
        .single();

      if (groupError || !group) {
        throw new Error('群组不存在');
      }

      // 检查是否已经是成员
      const { data: existingMember } = await supabase
        .from('pr_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', userId)
        .single();

      if (!existingMember) {
        // 加入群组
        const { error: joinError } = await supabase.from('pr_members').insert({
          group_id: group.id,
          user_id: userId,
          has_completed_setup: false,
        });

        if (joinError) throw joinError;
      }

      // 添加到用户群组列表
      const { userGroups } = get();
      const updatedGroups = userGroups.some(g => g.id === group.id)
        ? userGroups
        : [...userGroups, group];
      
      set({ currentGroup: group, userGroups: updatedGroups, isLoading: false });
      
      // 加载成员
      await get().loadMembers(group.id);
      
      return group;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  leaveGroup: async (groupId: string, userId: string) => {
    await supabase
      .from('pr_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    // 从用户群组列表中移除
    const { userGroups, currentGroup } = get();
    const updatedGroups = userGroups.filter(g => g.id !== groupId);
    
    // 如果离开的是当前群组，切换到其他群组或清空
    const newCurrentGroup = currentGroup?.id === groupId 
      ? (updatedGroups[0] || null)
      : currentGroup;

    set({ 
      currentGroup: newCurrentGroup, 
      userGroups: updatedGroups,
      members: newCurrentGroup ? [] : [],
      punishments: [],
    });
  },

  loadGroup: async (groupId: string) => {
    const { data: group } = await supabase
      .from('pr_groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (group) {
      set({ currentGroup: group });
    }
  },

  loadUserGroups: async (userId: string) => {
    console.log('[GroupStore] Loading user groups for:', userId);
    
    // 先获取用户所属的群组ID
    const { data: memberships, error: memberError } = await supabase
      .from('pr_members')
      .select('group_id')
      .eq('user_id', userId);

    if (memberError || !memberships || memberships.length === 0) {
      console.log('[GroupStore] No groups found for user');
      set({ userGroups: [] });
      return [];
    }

    const groupIds = memberships.map(m => m.group_id);
    
    // 获取群组详情
    const { data: groups, error: groupError } = await supabase
      .from('pr_groups')
      .select('*')
      .in('id', groupIds);

    if (groupError) {
      console.error('[GroupStore] Load groups error:', groupError);
      return [];
    }

    console.log('[GroupStore] Found groups:', groups?.length);
    set({ userGroups: groups || [] });
    return groups || [];
  },

  switchGroup: (group: Group) => {
    console.log('[GroupStore] Switching to group:', group.name);
    set({ 
      currentGroup: group,
      members: [],
      punishments: [],
      punishmentRecords: [],
      hasUnlocked: false,
    });
  },

  loadMembers: async (groupId: string) => {
    const { data: members } = await supabase
      .from('pr_members')
      .select(`
        *,
        user:pr_users(*)
      `)
      .eq('group_id', groupId);

    if (members) {
      set({ members });
    }
  },

  loadPunishments: async (groupId: string) => {
    const { data: punishments } = await supabase
      .from('pr_punishments')
      .select(`
        *,
        author:pr_users!pr_punishments_author_id_fkey(*),
        target:pr_users!pr_punishments_target_id_fkey(*)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (punishments) {
      set({ punishments });
    }
  },

  loadPunishmentRecords: async (groupId: string) => {
    const { data: records } = await supabase
      .from('pr_records')
      .select(`
        *,
        punishment:pr_punishments(*),
        punished_user:pr_users(*)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (records) {
      set({ punishmentRecords: records });
    }
  },

  addPunishment: async (groupId: string, authorId: string, targetId: string, title: string, description?: string) => {
    const { data: punishment, error } = await supabase
      .from('pr_punishments')
      .insert({
        group_id: groupId,
        author_id: authorId,
        target_id: targetId,
        title,
        description: description || null,
      })
      .select()
      .single();

    if (error) throw error;
    if (!punishment) throw new Error('Failed to add punishment');

    // 更新本地状态
    set((state) => ({
      punishments: [punishment, ...state.punishments],
    }));

    return punishment;
  },

  deletePunishment: async (punishmentId: string) => {
    await supabase.from('pr_punishments').delete().eq('id', punishmentId);

    set((state) => ({
      punishments: state.punishments.filter((p) => p.id !== punishmentId),
    }));
  },

  markSetupComplete: async (groupId: string, userId: string) => {
    await supabase
      .from('pr_members')
      .update({ has_completed_setup: true })
      .eq('group_id', groupId)
      .eq('user_id', userId);

    // 更新本地状态
    set((state) => ({
      members: state.members.map((m) =>
        m.user_id === userId ? { ...m, has_completed_setup: true } : m
      ),
    }));
  },

  updateGroupSettings: async (groupId: string, settings: Partial<{
    ai_matching_enabled: boolean;
    max_punishments_per_person: number;
    expires_at: string | null;
  }>) => {
    console.log('[GroupStore] Updating group settings:', settings);
    
    const { error } = await supabase
      .from('pr_groups')
      .update(settings)
      .eq('id', groupId);

    if (error) {
      console.error('[GroupStore] Update settings error:', error);
      throw new Error('更新设置失败');
    }

    // 更新本地状态
    const { currentGroup } = get();
    if (currentGroup) {
      set({ currentGroup: { ...currentGroup, ...settings } });
    }
    
    console.log('[GroupStore] Settings updated successfully');
  },

  transferAdmin: async (groupId: string, newAdminId: string) => {
    console.log('[GroupStore] Transferring admin to:', newAdminId);
    
    const { error } = await supabase
      .from('pr_groups')
      .update({ admin_id: newAdminId })
      .eq('id', groupId);

    if (error) {
      console.error('[GroupStore] Transfer admin error:', error);
      throw new Error('转移管理员权限失败');
    }

    // 更新本地状态
    const { currentGroup } = get();
    if (currentGroup) {
      set({ currentGroup: { ...currentGroup, admin_id: newAdminId } });
    }
    
    console.log('[GroupStore] Admin transferred successfully');
  },

  checkUnlockStatus: async (groupId: string, userId: string) => {
    console.log('[GroupStore] Checking unlock status...');
    
    const { data, error } = await supabase
      .from('pr_unlocks')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[GroupStore] Check unlock error:', error);
    }

    const hasUnlocked = !!data;
    set({ hasUnlocked });
    return hasUnlocked;
  },

  unlockPunishments: async (groupId: string, userId: string) => {
    console.log('[GroupStore] Unlocking punishments...');
    
    const { error } = await supabase
      .from('pr_unlocks')
      .insert({
        group_id: groupId,
        user_id: userId,
      });

    if (error) {
      console.error('[GroupStore] Unlock error:', error);
      throw new Error('解锁失败');
    }

    set({ hasUnlocked: true });
    console.log('[GroupStore] Punishments unlocked successfully');
  },

  getPunishmentsWithAuthors: async (groupId: string) => {
    console.log('[GroupStore] Getting punishments with authors...');
    
    const { data, error } = await supabase
      .from('pr_punishments')
      .select(`
        *,
        author:author_id(id, name, instruments),
        target:target_id(id, name, instruments)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GroupStore] Get punishments error:', error);
      throw new Error('获取惩罚列表失败');
    }

    return data || [];
  },

  loadSuggestions: async (groupId: string, targetId: string) => {
    console.log('[GroupStore] Loading suggestions for target:', targetId);
    
    const { data, error } = await supabase
      .from('pr_suggestions')
      .select('*')
      .eq('group_id', groupId)
      .eq('target_id', targetId)
      .order('generated_at', { ascending: false });

    if (error) {
      console.error('[GroupStore] Load suggestions error:', error);
      return [];
    }

    // 更新本地缓存
    const { suggestions } = get();
    const newSuggestions = new Map(suggestions);
    newSuggestions.set(targetId, data || []);
    set({ suggestions: newSuggestions });

    return data || [];
  },

  generateSuggestions: async (groupId: string, targetId: string) => {
    console.log('[GroupStore] Generating suggestions for target:', targetId);
    
    const { members, punishments, punishmentRecords } = get();
    
    // 找到目标用户
    const targetMember = members.find(m => m.user_id === targetId);
    if (!targetMember || !targetMember.user) {
      console.error('[GroupStore] Target user not found');
      return [];
    }

    const targetUser = targetMember.user;

    // 收集用户画像信息
    // 1. 已收到的惩罚
    const receivedPunishments = punishments
      .filter(p => p.target_id === targetId)
      .map(p => p.title);

    // 2. 给别人写的惩罚
    const givenPunishments = punishments
      .filter(p => p.author_id === targetId)
      .map(p => p.title);

    // 3. 给AI说的话（从惩罚记录中获取）
    const aiMessages = punishmentRecords
      .filter(r => r.punished_user_id === targetId && r.user_message)
      .map(r => r.user_message as string);

    // 4. 守时习惯（从 onboarding 获取）
    const punctuality = targetUser.punctuality as 'punctual' | 'late' | undefined;

    const profile: UserProfile = {
      name: targetUser.name,
      instruments: targetUser.instruments || [],
      onboardingResponse: punctuality, // 传递守时习惯
      receivedPunishments,
      givenPunishments,
      aiMessages,
    };

    // 调用 AI 生成建议
    const newSuggestions = await generatePersonalizedSuggestions(profile, 3);
    console.log('[GroupStore] AI returned suggestions:', newSuggestions);
    
    if (newSuggestions.length === 0) {
      console.log('[GroupStore] No suggestions generated');
      return [];
    }

    // 转换为带临时ID的格式，以便UI显示
    const suggestionsWithId = newSuggestions.map((s, index) => ({
      id: `temp-${Date.now()}-${index}`,
      group_id: groupId,
      target_id: targetId,
      suggestion: s.suggestion,
      reason: s.reason,
      generated_at: new Date().toISOString(),
    }));

    // 尝试保存到数据库（可选，失败不影响显示）
    try {
      // 先删除旧的建议
      await supabase
        .from('pr_suggestions')
        .delete()
        .eq('group_id', groupId)
        .eq('target_id', targetId);

      // 插入新建议
      const { data: inserted, error } = await supabase
        .from('pr_suggestions')
        .insert(suggestionsWithId.map(s => ({
          group_id: s.group_id,
          target_id: s.target_id,
          suggestion: s.suggestion,
          reason: s.reason,
        })))
        .select();

      if (!error && inserted) {
        console.log('[GroupStore] Saved to database:', inserted.length);
        // 用数据库返回的数据（有真实ID）
        const { suggestions } = get();
        const updatedSuggestions = new Map(suggestions);
        updatedSuggestions.set(targetId, inserted);
        set({ suggestions: updatedSuggestions });
        return inserted;
      }
    } catch (dbError) {
      console.log('[GroupStore] Database save failed, using local suggestions:', dbError);
    }

    // 数据库保存失败时，使用本地生成的建议
    const { suggestions } = get();
    const updatedSuggestions = new Map(suggestions);
    updatedSuggestions.set(targetId, suggestionsWithId);
    set({ suggestions: updatedSuggestions });

    console.log('[GroupStore] Using local suggestions:', suggestionsWithId.length);
    return suggestionsWithId;
  },

  clearGroup: () => {
    set({
      currentGroup: null,
      userGroups: [],
      members: [],
      punishments: [],
      punishmentRecords: [],
      suggestions: new Map(),
      hasUnlocked: false,
    });
  },
}));
