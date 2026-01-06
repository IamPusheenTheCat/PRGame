import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useGroupStore } from '../stores/groupStore';

/**
 * 实时订阅群组数据变化
 */
export function useRealtime(groupId: string | null) {
  const { loadMembers, loadPunishments, loadGroup } = useGroupStore();

  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`group:${groupId}`)
      // 监听群组设置变化（如解锁时间、AI匹配等）
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pr_groups',
          filter: `id=eq.${groupId}`,
        },
        () => {
          console.log('Group settings changed');
          loadGroup(groupId);
        }
      )
      // 监听成员变化
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pr_members',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          console.log('Group members changed');
          loadMembers(groupId);
        }
      )
      // 监听惩罚项目变化
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pr_punishments',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          console.log('Punishments changed');
          loadPunishments(groupId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, loadMembers, loadPunishments, loadGroup]);
}

/**
 * 实时订阅惩罚记录变化
 */
export function useRealtimePunishmentRecords(groupId: string | null) {
  const { loadPunishmentRecords } = useGroupStore();

  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`records:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pr_records',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          console.log('Punishment records changed');
          loadPunishmentRecords(groupId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, loadPunishmentRecords]);
}

