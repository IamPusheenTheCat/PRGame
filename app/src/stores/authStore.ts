import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { generateDeviceId } from '../lib/utils';
import { User } from '../types/database';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  login: (name: string, instruments: string[]) => Promise<User>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  recordPaymentIntent: () => Promise<void>;
  logout: () => Promise<void>;
}

const DEVICE_ID_KEY = 'punishment_roulette_device_id';
const PUNCTUALITY_KEY = 'user_punctuality'; // 从 onboarding 保存的守时习惯

// 添加超时工具函数
const withTimeout = async (promiseOrBuilder: any, ms: number): Promise<any> => {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), ms);
  });
  // 处理 Supabase PostgrestBuilder（它有 then 方法但不是真正的 Promise）
  const actualPromise = Promise.resolve(promiseOrBuilder);
  return Promise.race([actualPromise, timeout]);
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    console.log('[Auth] Initializing...');
    try {
      // 获取设备 ID
      let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      console.log('[Auth] Device ID:', deviceId ? 'exists' : 'not found');
      
      if (deviceId) {
        try {
          // 查找已存在的用户，添加 15 秒超时
          console.log('[Auth] Looking up user with device_id:', deviceId);
          const { data: user, error } = await withTimeout(
            supabase
              .from('pr_users')
              .select('*')
              .eq('device_id', deviceId)
              .maybeSingle(), // 使用 maybeSingle 避免在无结果时报错
            15000
          );

          console.log('[Auth] User lookup result:', user ? 'found' : 'not found', error?.message || 'no error');

          if (user && !error) {
            set({ user, isLoading: false, isInitialized: true });
            return;
          }
        } catch (error: any) {
          // 超时或网络错误，继续但不加载用户
          console.log('[Auth] User lookup failed:', error?.message || error);
        }
      }

      set({ isLoading: false, isInitialized: true });
      console.log('[Auth] Initialized without user');
    } catch (error) {
      console.error('[Auth] Failed to initialize:', error);
      set({ isLoading: false, isInitialized: true });
    }
  },

  login: async (name: string, instruments: string[]) => {
    set({ isLoading: true });
    console.log('[Auth] Logging in:', name);

    try {
      // 获取或生成设备 ID
      let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = generateDeviceId();
        await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
        console.log('[Auth] Generated new device ID');
      }

      // 计算头像显示文本
      const avatarInitials = name.length > 8
        ? name.split(/(?=[A-Z])/).map((p) => p[0]).join('').toUpperCase().slice(0, 2) || name.slice(0, 2).toUpperCase()
        : name;

      // 读取 onboarding 时保存的守时习惯
      let punctuality: string | null = null;
      try {
        punctuality = await AsyncStorage.getItem(PUNCTUALITY_KEY);
        console.log('[Auth] Read punctuality from onboarding:', punctuality);
      } catch (e) {
        console.log('[Auth] Failed to read punctuality:', e);
      }

      // 创建或更新用户
      console.log('[Auth] Attempting upsert with device_id:', deviceId);
      
      const { data: user, error } = await withTimeout(
        supabase
          .from('pr_users')
          .upsert(
            {
              device_id: deviceId,
              name,
              avatar_initials: avatarInitials,
              instruments,
              punctuality, // 保存守时习惯
            },
            { onConflict: 'device_id' }
          )
          .select()
          .single(),
        30000 // 增加到 30 秒
      );

      console.log('[Auth] Upsert result - user:', user, 'error:', error);

      if (error) {
        console.error('[Auth] Login error:', JSON.stringify(error, null, 2));
        console.error('[Auth] Error message:', error.message);
        console.error('[Auth] Error code:', error.code);
        console.error('[Auth] Error details:', error.details);
        console.error('[Auth] Error hint:', error.hint);
        throw new Error(error.message || 'Login failed');
      }
      if (!user) throw new Error('Failed to create user - no data returned');

      console.log('[Auth] Login success:', user.id);
      set({ user, isLoading: false });
      return user;
    } catch (error) {
      console.error('[Auth] Login failed:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateUser: async (updates: Partial<User>) => {
    const { user } = get();
    if (!user) return;

    console.log('[Auth] Updating user:', updates);
    const { data, error } = await withTimeout(
      supabase
        .from('pr_users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single(),
      10000
    );

    if (error) throw error;
    if (data) {
      set({ user: data });
      console.log('[Auth] User updated');
    }
  },

  recordPaymentIntent: async () => {
    const { user } = get();
    if (!user) {
      console.log('[Auth] Cannot record payment intent: no user');
      return;
    }

    // 如果已经记录过，就不再重复记录
    if (user.showed_payment_intent) {
      console.log('[Auth] Payment intent already recorded');
      return;
    }

    try {
      console.log('[Auth] Recording payment intent for user:', user.id);
      const { data, error } = await withTimeout(
        supabase
          .from('pr_users')
          .update({ showed_payment_intent: true })
          .eq('id', user.id)
          .select()
          .single(),
        10000
      );

      if (error) {
        console.error('[Auth] Failed to record payment intent:', error);
        throw error;
      }
      
      if (data) {
        set({ user: data });
        console.log('[Auth] Payment intent recorded successfully');
      }
    } catch (error) {
      console.error('[Auth] Error recording payment intent:', error);
      // 不抛出错误，让主流程继续
    }
  },

  logout: async () => {
    console.log('[Auth] Logging out');
    // 清除设备 ID，这样下次可以输入新的名字创建新账号
    await AsyncStorage.removeItem(DEVICE_ID_KEY);
    
    // 保持 isInitialized: true，避免显示加载界面
    set({ user: null, isInitialized: true });
    
    // 清除群组状态
    // 注意：我们不直接 import useGroupStore 来避免循环依赖
    // 而是在 logout 后让 AppNavigator 重新初始化
    console.log('[Auth] Logged out - device ID cleared');
  },
}));
