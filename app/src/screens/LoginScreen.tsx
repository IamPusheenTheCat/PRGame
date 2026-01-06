import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input, Card, MemberAvatar, SafeArea } from '../components/ui';
import Colors from '../constants/colors';
import { useAuthStore } from '../stores/authStore';

type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  JoinCreate: undefined;
};

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { login, isLoading } = useAuthStore();
  
  const [name, setName] = useState('');

  const handleContinue = async () => {
    console.log('[Login] handleContinue called, name:', name);
    
    if (!name.trim()) {
      Alert.alert('提示', '请输入你的名字');
      return;
    }

    try {
      console.log('[Login] Logging in...');
      // 先只保存名字，图标等加入群组后再选
      await login(name.trim(), []);
      console.log('[Login] Login success, navigating to JoinCreate');
      // 导航到加入/创建群组页面
      navigation.reset({
        index: 0,
        routes: [{ name: 'JoinCreate' }],
      });
    } catch (error: any) {
      console.error('[Login] Error:', error);
      Alert.alert('错误', error?.message || '登录失败，请重试');
    }
  };

  return (
    <SafeArea>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <FontAwesome name="chevron-left" size={16} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>创建角色</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Avatar Preview */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <MemberAvatar
              name={name || '你'}
              size="xl"
              gradientIndex={0}
            />
            <TouchableOpacity style={styles.cameraButton}>
              <FontAwesome name="camera" size={12} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Name Input */}
        <View style={styles.section}>
          <Input
            label="你的名字"
            value={name}
            onChangeText={setName}
            placeholder="输入你的名字..."
            maxLength={20}
          />
        </View>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.infoContent}>
            <FontAwesome name="info-circle" size={18} color={Colors.info} />
            <Text style={styles.infoText}>
              加入群组后，你可以根据群组类型选择你的专属图标
            </Text>
          </View>
        </Card>

        {/* Preview Card */}
        {name && (
          <Card variant="strong" style={styles.previewCard}>
            <Text style={styles.previewLabel}>预览</Text>
            <View style={styles.previewContent}>
              <MemberAvatar name={name} size="md" />
              <View style={styles.previewInfo}>
                <Text style={styles.previewName}>{name}</Text>
                <Text style={styles.previewInstruments}>
                  图标待选择
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Continue Button */}
        <Button
          title="继续"
          onPress={handleContinue}
          loading={isLoading}
          disabled={!name.trim()}
          style={styles.continueButton}
        />
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarWrapper: {
    position: 'relative',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background.primary,
  },
  section: {
    marginBottom: 24,
  },
  infoCard: {
    marginBottom: 24,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  previewCard: {
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: 12,
    color: Colors.text.muted,
    marginBottom: 12,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  previewInstruments: {
    fontSize: 14,
    color: Colors.text.tertiary,
  },
  continueButton: {
    marginTop: 8,
  },
});
