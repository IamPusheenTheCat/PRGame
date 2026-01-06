import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Card, MemberAvatar, SafeArea } from '../components/ui';
import Colors from '../constants/colors';
import { useAuthStore } from '../stores/authStore';
import { useGroupStore } from '../stores/groupStore';

type RootStackParamList = {
  Welcome: undefined;
  JoinCreate: undefined;
  CreateGroup: undefined;
  IconSelection: undefined;
  RoundTable: undefined;
};

export function JoinCreateScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout } = useAuthStore();
  const { joinGroup, isLoading } = useGroupStore();

  const handleGoBack = async () => {
    // 退出登录并返回欢迎页
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
  };
  
  const [mode, setMode] = useState<'select' | 'join'>('select');
  const [inviteCode, setInviteCode] = useState(['', '', '', '']);
  const codeInputRefs = React.useRef<(TextInput | null)[]>([]);

  const handleCodeChange = (index: number, value: string) => {
    const newCode = [...inviteCode];
    newCode[index] = value.toUpperCase();
    setInviteCode(newCode);

    // Auto-focus next input
    if (value && index < 3) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !inviteCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleJoinGroup = async () => {
    console.log('[JoinCreate] handleJoinGroup called');
    
    const code = inviteCode.join('');
    if (code.length !== 4) {
      Alert.alert('提示', '请输入完整的邀请码');
      return;
    }

    if (!user) {
      Alert.alert('错误', '请先登录');
      return;
    }

    try {
      console.log('[JoinCreate] Joining group with code:', code);
      const group = await joinGroup(code, user.id);
      console.log('[JoinCreate] Joined group:', group);
      // 导航到图标选择页面
      navigation.navigate('IconSelection');
    } catch (error: any) {
      console.error('[JoinCreate] Error:', error);
      Alert.alert('错误', error.message || '加入群组失败');
    }
  };

  if (mode === 'join') {
    return (
      <SafeArea>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setMode('select')}
            >
              <FontAwesome name="chevron-left" size={16} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>加入群组</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Code Input */}
          <View style={styles.joinContent}>
            <Text style={styles.joinTitle}>输入邀请码</Text>
            <Text style={styles.joinSubtitle}>
              请输入群主分享给你的4位邀请码
            </Text>

            <View style={styles.codeInputContainer}>
              {inviteCode.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { codeInputRefs.current[index] = ref; }}
                  style={styles.codeInput}
                  value={digit}
                  onChangeText={(value) => handleCodeChange(index, value)}
                  onKeyPress={({ nativeEvent }) =>
                    handleKeyPress(index, nativeEvent.key)
                  }
                  maxLength={1}
                  autoCapitalize="characters"
                  keyboardType="default"
                />
              ))}
            </View>

            <Button
              title="加入群组"
              onPress={handleJoinGroup}
              loading={isLoading}
              disabled={inviteCode.join('').length !== 4}
              style={styles.joinButton}
            />
          </View>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}
          >
            <FontAwesome name="chevron-left" size={16} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>开始游戏</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* User Card */}
        {user && (
          <Card variant="strong" style={styles.userCard}>
            <View style={styles.userCardContent}>
              <MemberAvatar name={user.name} id={user.id} size="lg" />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userInstruments}>
                  {user.instruments?.length > 0 ? user.instruments.join(' · ') : '图标待选择'}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Options */}
        <View style={styles.options}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => setMode('join')}
          >
            <View style={styles.optionIconContainer}>
              <FontAwesome name="sign-in" size={28} color={Colors.info} />
            </View>
            <Text style={styles.optionTitle}>加入群组</Text>
            <Text style={styles.optionDescription}>
              输入邀请码，加入朋友的群组
            </Text>
            <FontAwesome
              name="chevron-right"
              size={14}
              color={Colors.text.muted}
              style={styles.optionArrow}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => navigation.navigate('CreateGroup')}
          >
            <View style={[styles.optionIconContainer, { backgroundColor: `${Colors.primary}15` }]}>
              <FontAwesome name="plus" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.optionTitle}>创建群组</Text>
            <Text style={styles.optionDescription}>
              成为管理员，邀请朋友加入
            </Text>
            <FontAwesome
              name="chevron-right"
              size={14}
              color={Colors.text.muted}
              style={styles.optionArrow}
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    marginBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glass.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  userCard: {
    marginBottom: 32,
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  userInstruments: {
    fontSize: 14,
    color: Colors.text.tertiary,
  },
  options: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: Colors.glass.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    padding: 20,
    position: 'relative',
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: `${Colors.info}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  optionDescription: {
    fontSize: 14,
    color: Colors.text.tertiary,
  },
  optionArrow: {
    position: 'absolute',
    right: 20,
    top: '50%',
  },
  // Join mode styles
  joinContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
  },
  joinTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  joinSubtitle: {
    fontSize: 15,
    color: Colors.text.tertiary,
    marginBottom: 48,
    textAlign: 'center',
  },
  codeInputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 48,
  },
  codeInput: {
    width: 64,
    height: 72,
    backgroundColor: Colors.glass.background,
    borderWidth: 2,
    borderColor: Colors.border.default,
    borderRadius: 16,
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  joinButton: {
    width: '100%',
  },
});
