import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// 打印配置以便调试
console.log('[Supabase] URL:', supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'NOT SET');
console.log('[Supabase] Key:', supabaseAnonKey ? 'SET (length: ' + supabaseAnonKey.length + ')' : 'NOT SET');

// 自定义存储适配器 - 使用 AsyncStorage（支持 Web）
const AsyncStorageAdapter = {
  getItem: async (key: string) => {
    return await AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    await AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// 生成4位邀请码
export const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除容易混淆的字符
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// 检查邀请码是否存在
export const checkInviteCodeExists = async (code: string): Promise<boolean> => {
  const { data } = await supabase
    .from('pr_groups')
    .select('id')
    .eq('invite_code', code.toUpperCase())
    .single();
  return !!data;
};

// 生成唯一邀请码
export const generateUniqueInviteCode = async (): Promise<string> => {
  let code = generateInviteCode();
  let exists = await checkInviteCodeExists(code);
  
  while (exists) {
    code = generateInviteCode();
    exists = await checkInviteCodeExists(code);
  }
  
  return code;
};

