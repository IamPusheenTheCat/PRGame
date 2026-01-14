import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Card, MemberAvatar, SafeArea } from '../components/ui';
import Colors from '../constants/colors';
import { useAuthStore } from '../stores/authStore';
import { useGroupStore } from '../stores/groupStore';
import { INSTRUMENTS, GENERAL_ICONS } from '../constants/instruments';
import { requestRatingIfAppropriate } from '../lib/rating';

type RootStackParamList = {
  Unlock: undefined;
  RoundTable: undefined;
};

interface PunishmentWithAuthor {
  id: string;
  title: string;
  description?: string;
  is_used: boolean;
  author: { id: string; name: string; instruments?: string[] };
  target: { id: string; name: string; instruments?: string[] };
}

export function UnlockScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, recordPaymentIntent } = useAuthStore();
  const { 
    currentGroup, 
    hasUnlocked, 
    checkUnlockStatus, 
    unlockPunishments, 
    getPunishmentsWithAuthors 
  } = useGroupStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [punishments, setPunishments] = useState<PunishmentWithAuthor[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // 检查是否已过期
  const isExpired = currentGroup?.expires_at 
    ? new Date(currentGroup.expires_at) <= new Date()
    : true; // 未设置过期时间则默认可解锁

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!currentGroup || !user) return;
    
    setIsLoading(true);
    try {
      const unlocked = await checkUnlockStatus(currentGroup.id, user.id);
      
      if (unlocked) {
        const data = await getPunishmentsWithAuthors(currentGroup.id);
        setPunishments(data);
      }
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!isExpired) {
      Alert.alert('提示', '群组还未到解锁时间');
      return;
    }
    
    // 显示付费确认
    Alert.alert(
      '解锁惩罚表',
      '支付 $3 解锁查看所有惩罚项目的作者？\n\n（演示模式：点击确认即可解锁）',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认支付',
          onPress: async () => {
            setIsUnlocking(true);
            try {
              // 🎯 记录用户的付费意愿（在后台记录，不阻塞主流程）
              recordPaymentIntent().catch(err => 
                console.error('Failed to record payment intent:', err)
              );
              
              // 模拟付费延迟
              await new Promise(resolve => setTimeout(resolve, 1500));
              
              await unlockPunishments(currentGroup!.id, user!.id);
              
              // 加载带作者信息的惩罚列表
              const data = await getPunishmentsWithAuthors(currentGroup!.id);
              setPunishments(data);
              
              // 🌟 请求用户评分（在后台进行，不阻塞主流程）
              requestRatingIfAppropriate().catch(err =>
                console.error('Failed to request rating:', err)
              );
              
              Alert.alert('成功', '解锁成功！现在可以查看所有惩罚的作者了');
            } catch (error: any) {
              Alert.alert('错误', error.message || '解锁失败');
            } finally {
              setIsUnlocking(false);
            }
          },
        },
      ]
    );
  };

  const getIconName = (iconId: string) => {
    const allIcons = [...INSTRUMENTS, ...GENERAL_ICONS];
    return allIcons.find(i => i.id === iconId)?.name || '';
  };

  const formatExpiryDate = () => {
    if (!currentGroup?.expires_at) return null;
    const date = new Date(currentGroup.expires_at);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  if (isLoading) {
    return (
      <SafeArea>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeArea>
    );
  }

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
          <Text style={styles.headerTitle}>解锁惩罚表</Text>
          <View style={{ width: 40 }} />
        </View>

        {!hasUnlocked ? (
          // 未解锁状态
          <View style={styles.lockedContent}>
            <View style={styles.lockIconContainer}>
              <FontAwesome name="lock" size={60} color={Colors.text.muted} />
            </View>
            
            <Text style={styles.lockedTitle}>惩罚作者已隐藏</Text>
            <Text style={styles.lockedSubtitle}>
              支付解锁后可以查看每个惩罚是谁写的
            </Text>

            {/* 过期状态 */}
            <Card style={styles.statusCard}>
              <View style={styles.statusRow}>
                <FontAwesome 
                  name={isExpired ? 'check-circle' : 'clock-o'} 
                  size={20} 
                  color={isExpired ? Colors.success : Colors.warning} 
                />
                <View style={styles.statusText}>
                  <Text style={styles.statusLabel}>
                    {isExpired ? '可以解锁' : '等待解锁'}
                  </Text>
                  <Text style={styles.statusDesc}>
                    {isExpired 
                      ? '群组已满足解锁条件'
                      : `将于 ${formatExpiryDate()} 可解锁`
                    }
                  </Text>
                </View>
              </View>
            </Card>

            {/* 价格信息 */}
            <Card variant="strong" style={styles.priceCard}>
              <Text style={styles.priceLabel}>解锁价格</Text>
              <Text style={styles.priceValue}>$3</Text>
              <Text style={styles.priceNote}>一次付费，永久查看</Text>
            </Card>

            {/* 隐私提示 */}
            <View style={styles.privacyNote}>
              <FontAwesome name="eye-slash" size={14} color={Colors.text.muted} />
              <Text style={styles.privacyText}>
                其他成员不会知道你是否解锁
              </Text>
            </View>

            {/* 解锁按钮 */}
            <Button
              title={isExpired ? '立即解锁' : '尚未到期'}
              onPress={handleUnlock}
              loading={isUnlocking}
              disabled={!isExpired}
              icon={<FontAwesome name="unlock" size={14} color="#fff" />}
              size="lg"
              style={styles.unlockButton}
            />
          </View>
        ) : (
          // 已解锁状态 - 显示惩罚列表
          <View style={styles.unlockedContent}>
            <View style={styles.unlockedHeader}>
              <FontAwesome name="unlock" size={24} color={Colors.success} />
              <Text style={styles.unlockedTitle}>已解锁</Text>
            </View>
            <Text style={styles.unlockedSubtitle}>
              共 {punishments.length} 个惩罚项目
            </Text>

            {/* 惩罚列表 */}
            {punishments.map((punishment) => (
              <Card key={punishment.id} style={styles.punishmentCard}>
                <View style={styles.punishmentHeader}>
                  <View style={styles.punishmentTarget}>
                    <MemberAvatar
                      name={punishment.target?.name || '未知'}
                      id={punishment.target?.id}
                      size="sm"
                    />
                    <Text style={styles.targetName}>
                      给 {punishment.target?.name || '未知'}
                    </Text>
                  </View>
                  {punishment.is_used && (
                    <View style={styles.usedBadge}>
                      <Text style={styles.usedText}>已使用</Text>
                    </View>
                  )}
                </View>
                
                <Text style={styles.punishmentTitle}>{punishment.title}</Text>
                {punishment.description && (
                  <Text style={styles.punishmentDesc}>{punishment.description}</Text>
                )}
                
                <View style={styles.authorSection}>
                  <FontAwesome name="pencil" size={12} color={Colors.primary} />
                  <Text style={styles.authorLabel}>作者：</Text>
                  <MemberAvatar
                    name={punishment.author?.name || '未知'}
                    id={punishment.author?.id}
                    size="xs"
                  />
                  <Text style={styles.authorName}>
                    {punishment.author?.name || '未知'}
                  </Text>
                </View>
              </Card>
            ))}

            {punishments.length === 0 && (
              <View style={styles.emptyState}>
                <FontAwesome name="inbox" size={48} color={Colors.text.muted} />
                <Text style={styles.emptyText}>还没有惩罚项目</Text>
              </View>
            )}
          </View>
        )}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: Colors.text.tertiary,
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
  // 未解锁状态
  lockedContent: {
    alignItems: 'center',
  },
  lockIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.glass.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  lockedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  lockedSubtitle: {
    fontSize: 15,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: 32,
  },
  statusCard: {
    width: '100%',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusText: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  statusDesc: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  priceCard: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 13,
    color: Colors.text.muted,
    marginBottom: 8,
  },
  priceValue: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.primary,
  },
  priceNote: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginTop: 8,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  privacyText: {
    fontSize: 13,
    color: Colors.text.muted,
  },
  unlockButton: {
    width: '100%',
  },
  // 已解锁状态
  unlockedContent: {
    flex: 1,
  },
  unlockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  unlockedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.success,
  },
  unlockedSubtitle: {
    fontSize: 15,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: 32,
  },
  punishmentCard: {
    marginBottom: 12,
  },
  punishmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  punishmentTarget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  targetName: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  usedBadge: {
    backgroundColor: Colors.glass.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  usedText: {
    fontSize: 11,
    color: Colors.text.muted,
  },
  punishmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  punishmentDesc: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
  },
  authorLabel: {
    fontSize: 13,
    color: Colors.text.muted,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    color: Colors.text.muted,
  },
});

