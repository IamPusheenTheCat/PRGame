import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useGroupStore } from '../stores/groupStore';
import { useAuthStore } from '../stores/authStore';

/**
 * 实时订阅群组数据变化
 * onKicked: 当前用户被踢出时的回调
 */
export function useRealtime(groupId: string | null, onKicked?: () => void) {
  const { loadMembers, loadPunishments, loadGroup } = useGroupStore();
  const { user } = useAuthStore();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!groupId) {
      console.log('[Realtime] No groupId, skipping subscription');
      return;
    }

    console.log('[Realtime] Setting up subscription for group:', groupId);

    const channel = supabase
      .channel(`group:${groupId}`, {
        config: {
          broadcast: { self: false },
        },
      })
      // 监听群组设置变化（如解锁时间、AI匹配等）
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pr_groups',
          filter: `id=eq.${groupId}`,
        },
        (payload) => {
          console.log('[Realtime] Group settings changed:', payload);
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
        async (payload) => {
          console.log('[Realtime] ========================================');
          console.log('[Realtime] Group members changed event received');
          console.log('[Realtime] Event type:', payload.eventType);
          console.log('[Realtime] Payload:', JSON.stringify(payload, null, 2));
          console.log('[Realtime] Current user ID:', user?.id);
          console.log('[Realtime] Payload old user_id:', payload.old?.user_id);
          console.log('[Realtime] ========================================');
          
          // 检查是否是当前用户被删除
          if (payload.eventType === 'DELETE') {
            console.log('[Realtime] DELETE event detected');
            
            if (user) {
              console.log('[Realtime] User exists:', user.id);
              
              // 方法1: 检查 payload.old
              if (payload.old?.user_id === user.id) {
                console.log('[Realtime] ⚠️ Current user was kicked (payload.old match)');
                if (onKicked) {
                  console.log('[Realtime] Calling onKicked callback');
                  onKicked();
                }
                return;
              }
              
              // 方法2: 重新加载成员列表并检查
              console.log('[Realtime] Checking if current user still in member list...');
              const members = await loadMembers(groupId);
              console.log('[Realtime] Loaded members:', members.length);
              
              const isStillMember = members.some(m => m.user_id === user.id);
              console.log('[Realtime] Is current user still a member?', isStillMember);
              
              if (!isStillMember) {
                console.log('[Realtime] ⚠️ Current user was kicked (not in member list)');
                if (onKicked) {
                  console.log('[Realtime] Calling onKicked callback');
                  onKicked();
                }
                return;
              }
            } else {
              console.log('[Realtime] No user logged in');
            }
          }
          
          // 对于其他事件，正常重新加载
          console.log('[Realtime] Reloading members for other changes');
          await loadMembers(groupId);
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
        (payload) => {
          console.log('[Realtime] Punishments changed:', payload.eventType);
          loadPunishments(groupId);
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('[Realtime] Cleaning up subscription for group:', groupId);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [groupId, user?.id]); // 依赖 groupId 和 userId
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

