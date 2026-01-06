# 惩罚轮盘 App 实现指南

## 技术栈

- **前端**: React Native (Expo)
- **后端**: Supabase (PostgreSQL + Auth + Realtime)
- **AI**: DeepSeek API (惩罚智能匹配)
- **支付**: Stripe 或 RevenueCat

---

## 第一阶段：项目初始化

### 1.1 创建 React Native 项目

```bash
npx create-expo-app punishment-roulette --template blank-typescript
cd punishment-roulette
```

### 1.2 安装核心依赖

```bash
# 导航
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context

# Supabase
npm install @supabase/supabase-js

# UI 组件
npm install react-native-reanimated react-native-gesture-handler
npx expo install expo-linear-gradient expo-blur

# 状态管理
npm install zustand

# 其他
npx expo install expo-secure-store expo-haptics
```

### 1.3 创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com) 创建新项目
2. 获取 `Project URL` 和 `anon key`
3. 创建 `.env` 文件配置环境变量

---

## 第二阶段：数据库设计

### 2.1 数据表结构

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_initials TEXT, -- 名字缩写
  instruments TEXT[], -- 乐器数组，可多选
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 群组表
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '🎸',
  invite_code CHAR(4) UNIQUE NOT NULL,
  admin_id UUID REFERENCES users(id) NOT NULL,
  max_punishments_per_person INTEGER DEFAULT 5,
  expires_at TIMESTAMP WITH TIME ZONE,
  allow_anonymous_unlock BOOLEAN DEFAULT TRUE,
  ai_matching_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 群组成员表
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  has_completed_setup BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- 惩罚项目表
CREATE TABLE punishments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id), -- 写惩罚的人
  target_id UUID REFERENCES users(id), -- 被惩罚的人
  title TEXT NOT NULL,
  description TEXT,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 惩罚记录表（执行历史）
CREATE TABLE punishment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  punishment_id UUID REFERENCES punishments(id),
  punished_user_id UUID REFERENCES users(id),
  late_minutes INTEGER,
  mood TEXT, -- 心情
  preference TEXT, -- 偏好
  user_message TEXT, -- 用户输入的话
  ai_reason TEXT, -- AI 推荐理由
  is_completed BOOLEAN DEFAULT FALSE,
  guessed_author_id UUID REFERENCES users(id),
  guess_correct BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 解锁记录表
CREATE TABLE unlock_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.2 Row Level Security (RLS) 策略

```sql
-- 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE punishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE punishment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE unlock_records ENABLE ROW LEVEL SECURITY;

-- 示例策略：用户只能看到自己所在群组的数据
CREATE POLICY "Users can view own group members"
ON group_members FOR SELECT
USING (user_id = auth.uid() OR group_id IN (
  SELECT group_id FROM group_members WHERE user_id = auth.uid()
));
```

### 2.3 数据库函数

```sql
-- 生成4位唯一邀请码
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS CHAR(4) AS $$
DECLARE
  code CHAR(4);
  exists BOOLEAN;
BEGIN
  LOOP
    code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
    SELECT EXISTS(SELECT 1 FROM groups WHERE invite_code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 检查用户是否可以添加惩罚
CREATE OR REPLACE FUNCTION can_add_punishment(
  p_group_id UUID,
  p_author_id UUID,
  p_target_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  max_count INTEGER;
  current_count INTEGER;
BEGIN
  SELECT max_punishments_per_person INTO max_count FROM groups WHERE id = p_group_id;
  SELECT COUNT(*) INTO current_count FROM punishments 
  WHERE group_id = p_group_id AND author_id = p_author_id AND target_id = p_target_id;
  RETURN current_count < max_count;
END;
$$ LANGUAGE plpgsql;
```

---

## 第三阶段：前端架构

### 3.1 目录结构

```
src/
├── app/                    # Expo Router 页面
│   ├── (auth)/            # 认证流程
│   │   ├── welcome.tsx
│   │   ├── login.tsx
│   │   └── join-create.tsx
│   ├── (main)/            # 主功能
│   │   ├── (tabs)/
│   │   │   ├── round-table.tsx
│   │   │   ├── roll.tsx
│   │   │   ├── history.tsx
│   │   │   └── settings.tsx
│   │   ├── add-punishment.tsx
│   │   ├── late-selection.tsx
│   │   └── punishment-result.tsx
│   └── _layout.tsx
├── components/
│   ├── ui/                # 通用 UI 组件
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Avatar.tsx
│   │   └── Input.tsx
│   ├── MemberAvatar.tsx   # 成员头像（名字/缩写）
│   ├── RoundTable.tsx     # 圆桌会议组件
│   ├── RouletteWheel.tsx  # 轮盘组件
│   └── TabBar.tsx
├── hooks/
│   ├── useSupabase.ts
│   ├── useGroup.ts
│   └── useRealtime.ts
├── stores/
│   ├── authStore.ts       # 用户状态
│   └── groupStore.ts      # 群组状态
├── lib/
│   ├── supabase.ts        # Supabase 客户端
│   ├── openai.ts          # OpenAI 客户端
│   └── utils.ts
├── types/
│   └── database.ts        # 数据库类型定义
└── constants/
    ├── colors.ts
    └── instruments.ts
```

### 3.2 核心组件实现

#### MemberAvatar 组件

```tsx
// components/MemberAvatar.tsx
import { View, Text } from 'react-native';

interface MemberAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  gradientIndex?: number;
  status?: 'completed' | 'pending' | 'you';
}

const GRADIENTS = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
  ['#a18cd1', '#fbc2eb'],
];

export function MemberAvatar({ name, size = 'md', gradientIndex = 0, status }: MemberAvatarProps) {
  // 超过8个字符显示首字母缩写
  const displayName = name.length > 8 
    ? name.split(/(?=[A-Z])/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : name;

  const sizes = {
    sm: { container: 44, font: 13 },
    md: { container: 56, font: 16 },
    lg: { container: 64, font: 18 },
  };

  return (
    <View style={{
      width: sizes[size].container,
      height: sizes[size].container,
      borderRadius: sizes[size].container / 2,
      background: `linear-gradient(135deg, ${GRADIENTS[gradientIndex][0]}, ${GRADIENTS[gradientIndex][1]})`,
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Text style={{ color: '#fff', fontSize: sizes[size].font, fontWeight: '700' }}>
        {displayName}
      </Text>
    </View>
  );
}
```

---

## 第四阶段：核心功能实现

### 4.1 用户认证流程

```tsx
// stores/authStore.ts
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (name: string, instruments: string[]) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  
  login: async (name, instruments) => {
    // 获取或生成设备 ID
    let deviceId = await SecureStore.getItemAsync('device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      await SecureStore.setItemAsync('device_id', deviceId);
    }
    
    // 创建或更新用户
    const { data, error } = await supabase
      .from('users')
      .upsert({ 
        device_id: deviceId, 
        name,
        avatar_initials: name.length > 8 ? getInitials(name) : name,
        instruments 
      })
      .select()
      .single();
    
    if (data) set({ user: data });
  },
}));
```

### 4.2 群组管理

```tsx
// hooks/useGroup.ts
import { supabase } from '@/lib/supabase';

export function useGroup() {
  // 创建群组
  const createGroup = async (config: CreateGroupConfig) => {
    const inviteCode = await generateInviteCode();
    
    const { data: group } = await supabase
      .from('groups')
      .insert({
        name: config.name,
        emoji: config.emoji,
        invite_code: inviteCode,
        admin_id: config.adminId,
        max_punishments_per_person: config.maxPunishments,
        expires_at: config.expiresAt,
      })
      .select()
      .single();
    
    // 自动加入群组
    await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: config.adminId,
    });
    
    return group;
  };
  
  // 加入群组
  const joinGroup = async (inviteCode: string, userId: string) => {
    const { data: group } = await supabase
      .from('groups')
      .select()
      .eq('invite_code', inviteCode.toUpperCase())
      .single();
    
    if (!group) throw new Error('群组不存在');
    
    await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: userId,
    });
    
    return group;
  };
  
  return { createGroup, joinGroup };
}
```

### 4.3 实时订阅

```tsx
// hooks/useRealtime.ts
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useRealtimeGroup(groupId: string) {
  useEffect(() => {
    const channel = supabase
      .channel(`group:${groupId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_members',
        filter: `group_id=eq.${groupId}`,
      }, (payload) => {
        // 处理成员变化
        console.log('Member changed:', payload);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'punishments',
        filter: `group_id=eq.${groupId}`,
      }, (payload) => {
        // 处理惩罚项目变化
        console.log('Punishment changed:', payload);
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);
}
```

### 4.4 AI 惩罚匹配 (DeepSeek)

```tsx
// lib/deepseek.ts

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

export async function matchPunishment(params: {
  punishments: Punishment[];
  mood: string;
  preference: string;
  userMessage: string;
  userName: string;
}) {
  const prompt = `
你是一个派对惩罚游戏的AI助手。用户 ${params.userName} 今天迟到了，需要接受惩罚。

用户当前心情：${params.mood}
用户偏好：${params.preference}
用户说：${params.userMessage}

可选的惩罚项目：
${params.punishments.map((p, i) => `${i + 1}. ${p.title}: ${p.description || '无描述'}`).join('\n')}

请根据用户的心情和偏好，选择最合适的惩罚项目。返回 JSON 格式：
{
  "selected_index": 数字（从0开始），
  "reason": "推荐理由（轻松有趣的语气，50字以内）"
}
`;

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}
```

---

## 第五阶段：支付集成

### 5.1 RevenueCat 配置

```tsx
// lib/purchases.ts
import Purchases from 'react-native-purchases';

export async function initPurchases() {
  Purchases.configure({
    apiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
  });
}

export async function purchaseUnlock(groupId: string) {
  try {
    const offerings = await Purchases.getOfferings();
    const unlockProduct = offerings.current?.availablePackages.find(
      p => p.identifier === 'unlock_punishments'
    );
    
    if (unlockProduct) {
      const { customerInfo } = await Purchases.purchasePackage(unlockProduct);
      
      // 记录解锁
      await supabase.from('unlock_records').insert({
        group_id: groupId,
        user_id: currentUserId,
      });
      
      return true;
    }
  } catch (error) {
    console.error('Purchase failed:', error);
    return false;
  }
}
```

---

## 第六阶段：测试与部署

### 6.1 测试清单

- [ ] 用户注册/登录流程
- [ ] 创建群组 & 生成邀请码
- [ ] 加入群组 & 实时同步
- [ ] 添加惩罚项目 & 数量限制
- [ ] 选择迟到者 & AI 匹配
- [ ] 轮盘抽取动画
- [ ] 猜测作者功能
- [ ] 支付解锁流程
- [ ] 群组过期处理

### 6.2 部署步骤

```bash
# 1. 构建 iOS
eas build --platform ios --profile production

# 2. 构建 Android
eas build --platform android --profile production

# 3. 提交到 App Store / Google Play
eas submit --platform ios
eas submit --platform android
```

### 6.3 环境变量

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx
EXPO_PUBLIC_DEEPSEEK_API_KEY=sk-xxx
EXPO_PUBLIC_REVENUECAT_API_KEY=xxx
```

> **DeepSeek API**: 访问 [platform.deepseek.com](https://platform.deepseek.com) 获取 API Key，价格比 OpenAI 便宜很多

---

## 开发时间估算

| 阶段 | 任务 | 预计时间 |
|-----|------|---------|
| 1 | 项目初始化 & 基础配置 | 1 天 |
| 2 | 数据库设计 & Supabase 配置 | 1 天 |
| 3 | UI 组件开发 | 3-4 天 |
| 4 | 核心功能实现 | 5-7 天 |
| 5 | AI 集成 & 支付集成 | 2 天 |
| 6 | 测试 & 优化 | 2-3 天 |
| **总计** | | **14-18 天** |

---

## 注意事项

1. **设备认证**: 使用设备 ID 而非传统账号系统，简化用户体验
2. **实时同步**: 使用 Supabase Realtime 确保多人同步
3. **隐私保护**: 解锁记录不暴露给其他用户
4. **动画性能**: 轮盘动画使用 `react-native-reanimated` 确保流畅
5. **离线处理**: 考虑网络不稳定时的本地缓存策略

