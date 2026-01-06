import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Card, MemberAvatar, SafeArea } from '../components/ui';
import Colors from '../constants/colors';
import { useGroupStore } from '../stores/groupStore';
import { suggestPunishment } from '../lib/deepseek';
import { Punishment } from '../types/database';

type RootStackParamList = {
  PunishmentRoll: { lateUserId: string; lateUserName: string };
  PunishmentResult: { punishment: Punishment; recordId: string; aiReason?: string };
  RoundTable: undefined;
};

export function PunishmentRollScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'PunishmentRoll'>>();
  const { lateUserId, lateUserName } = route.params;

  const { currentGroup, punishments } = useGroupStore();

  const [userMessage, setUserMessage] = useState('');
  const [isRolling, setIsRolling] = useState(false);
  const [phase, setPhase] = useState<'input' | 'rolling' | 'result'>('input');

  const spinAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // 获取目标用户的可用惩罚
  const availablePunishments = punishments.filter(
    (p) => p.target_id === lateUserId && !p.is_used
  );

  const handleStartRoll = async () => {
    if (availablePunishments.length === 0) {
      return;
    }

    setIsRolling(true);
    setPhase('rolling');

    // 开始旋转动画
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 缩放动画
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ])
    ).start();

    let selectedPunishment: Punishment;
    let aiReason: string | undefined;

    try {
      // 尝试使用 AI 推荐
      if (userMessage.trim() && currentGroup?.ai_matching_enabled) {
        const result = await suggestPunishment(
          availablePunishments,
          userMessage.trim()
        );
        selectedPunishment = result.punishment;
        aiReason = result.reason;
      } else {
        // 随机选择
        const randomIndex = Math.floor(Math.random() * availablePunishments.length);
        selectedPunishment = availablePunishments[randomIndex];
      }
    } catch (error) {
      // AI 失败，回退到随机
      const randomIndex = Math.floor(Math.random() * availablePunishments.length);
      selectedPunishment = availablePunishments[randomIndex];
    }

    // 模拟抽取过程
    setTimeout(() => {
      spinAnim.stopAnimation();
      scaleAnim.stopAnimation();
      setIsRolling(false);

      // TODO: 创建惩罚记录
      navigation.replace('PunishmentResult', {
        punishment: selectedPunishment,
        recordId: '', // 实际应该创建记录后返回 ID
        aiReason,
      });
    }, 2500);
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <SafeArea>
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={styles.content}>
        {/* Header */}
        {phase === 'input' && (
          <View style={styles.header}>
            <Button
              title="返回"
              variant="ghost"
              onPress={() => navigation.goBack()}
            />
            <View style={{ width: 60 }} />
          </View>
        )}

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Target User */}
          <View style={styles.targetSection}>
            <MemberAvatar name={lateUserName} id={lateUserId} size="xl" />
            <Text style={styles.targetName}>{lateUserName}</Text>
            <Text style={styles.targetLabel}>
              {phase === 'rolling' ? '正在抽取惩罚...' : '准备接受惩罚'}
            </Text>
          </View>

          {/* Rolling Animation */}
          {phase === 'rolling' && (
            <Animated.View
              style={[
                styles.wheelContainer,
                {
                  transform: [{ rotate: spin }, { scale: scaleAnim }],
                },
              ]}
            >
              <View style={styles.wheel}>
                <FontAwesome name="random" size={48} color={Colors.primary} />
              </View>
            </Animated.View>
          )}

          {/* Input Phase */}
          {phase === 'input' && (
            <Card style={styles.inputCard}>
              <Text style={styles.inputTitle}>许个愿吧</Text>
              <Text style={styles.inputSubtitle}>
                说说你今天想要什么惩罚？AI 会帮你找最合适的
              </Text>
              <TextInput
                style={styles.messageInput}
                value={userMessage}
                onChangeText={setUserMessage}
                placeholder="例如：来个轻松点的吧..."
                placeholderTextColor={Colors.text.muted}
                multiline
                numberOfLines={3}
              />
              <Text style={styles.inputHint}>
                留空则随机抽取
              </Text>
            </Card>
          )}

          {/* Punishment Count */}
          {phase === 'input' && (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{availablePunishments.length}</Text>
                <Text style={styles.statLabel}>可抽惩罚</Text>
              </View>
            </View>
          )}
        </View>

        {/* Action Button */}
        {phase === 'input' && (
          <Button
            title="开始抽取"
            onPress={handleStartRoll}
            disabled={availablePunishments.length === 0}
            icon={<FontAwesome name="random" size={14} color="#fff" />}
            size="lg"
            style={styles.actionButton}
          />
        )}

        {phase === 'rolling' && (
          <Text style={styles.rollingText}>命运之轮正在转动...</Text>
        )}
        </View>
      </TouchableWithoutFeedback>
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
    justifyContent: 'space-between',
    paddingTop: 16,
    marginBottom: 24,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  targetName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
  },
  targetLabel: {
    fontSize: 15,
    color: Colors.text.tertiary,
    marginTop: 8,
  },
  wheelContainer: {
    marginBottom: 40,
  },
  wheel: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.glass.backgroundStrong,
    borderWidth: 4,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputCard: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  inputTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  inputSubtitle: {
    fontSize: 14,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: 20,
  },
  messageInput: {
    width: '100%',
    backgroundColor: Colors.glass.background,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 13,
    color: Colors.text.muted,
    marginTop: 4,
  },
  actionButton: {
    marginBottom: 40,
  },
  rollingText: {
    fontSize: 16,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: 40,
  },
});
