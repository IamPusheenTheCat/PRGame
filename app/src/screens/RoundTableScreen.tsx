import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Card, MemberAvatar, SafeArea } from '../components/ui';
import Colors from '../constants/colors';
import { useAuthStore } from '../stores/authStore';
import { useGroupStore } from '../stores/groupStore';
import { useRealtime } from '../hooks/useRealtime';
import { INSTRUMENTS, GENERAL_ICONS } from '../constants/instruments';

type RootStackParamList = {
  RoundTable: undefined;
  AddPunishment: { targetUserId: string; targetUserName: string };
  LateSelection: undefined;
  Settings: undefined;
};

export function RoundTableScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuthStore();
  const { currentGroup, members, loadMembers, punishments, loadPunishments } = useGroupStore();

  console.log('[RoundTable] Render - currentGroup:', currentGroup?.name, 'members:', members.length);

  // 开启实时订阅
  useRealtime(currentGroup?.id || null);

  useEffect(() => {
    if (currentGroup?.id) {
      console.log('[RoundTable] Loading members and punishments for group:', currentGroup.id);
      loadMembers(currentGroup.id);
      loadPunishments(currentGroup.id);
    }
  }, [currentGroup?.id]);

  const isAdmin = user?.id === currentGroup?.admin_id;

  const handleShareCode = async () => {
    if (!currentGroup) return;
    try {
      await Share.share({
        message: `快来加入我们的群组「${currentGroup.name}」！\n邀请码：${currentGroup.invite_code}`,
      });
    } catch (error) {
      Alert.alert('分享失败', '请稍后重试');
    }
  };

  const getMemberPunishmentCount = (memberId: string) => {
    return punishments.filter((p) => p.target_id === memberId).length;
  };

  const getMemberInstrumentIcon = (instruments: string[] | undefined) => {
    if (!instruments || instruments.length === 0) return null;
    const allIcons = [...INSTRUMENTS, ...GENERAL_ICONS];
    const icon = allIcons.find((i) => i.id === instruments[0]);
    return icon?.icon;
  };

  const getMemberInstrumentName = (instruments: string[] | undefined) => {
    if (!instruments || instruments.length === 0) return '';
    const allIcons = [...INSTRUMENTS, ...GENERAL_ICONS];
    return instruments
      .map((id) => allIcons.find((i) => i.id === id)?.name)
      .filter(Boolean)
      .join(' · ');
  };

  if (!currentGroup) {
    return (
      <SafeArea>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>群组信息加载中...</Text>
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
          <View style={styles.headerLeft}>
            <Text style={styles.groupEmoji}>{currentGroup.emoji}</Text>
            <View>
              <Text style={styles.groupName}>{currentGroup.name}</Text>
              <Text style={styles.memberCount}>{members.length} 位成员</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <FontAwesome name="cog" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Invite Code */}
        <Card style={styles.codeCard}>
          <View style={styles.codeContent}>
            <View>
              <Text style={styles.codeLabel}>邀请码</Text>
              <Text style={styles.codeValue}>{currentGroup.invite_code}</Text>
            </View>
            <TouchableOpacity style={styles.shareButton} onPress={handleShareCode}>
              <FontAwesome name="share-alt" size={16} color="#fff" />
              <Text style={styles.shareText}>分享</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Round Table */}
        <Card variant="strong" style={styles.tableCard}>
          <Text style={styles.tableTitle}>圆桌成员</Text>
          <Text style={styles.tableSubtitle}>点击成员头像为他们添加惩罚项目</Text>

          <View style={styles.membersGrid}>
            {members.map((member, index) => {
              const memberUser = member.user;
              if (!memberUser) return null;

              const punishmentCount = getMemberPunishmentCount(memberUser.id);
              const isSelf = memberUser.id === user?.id;
              const iconName = getMemberInstrumentIcon(memberUser.instruments);

              return (
                <TouchableOpacity
                  key={member.id}
                  style={styles.memberItem}
                  onPress={() => {
                    if (!isSelf) {
                      navigation.navigate('AddPunishment', {
                        targetUserId: memberUser.id,
                        targetUserName: memberUser.name,
                      });
                    }
                  }}
                  disabled={isSelf}
                >
                  <View style={styles.memberAvatarContainer}>
                    <MemberAvatar
                      name={memberUser.name}
                      id={memberUser.id}
                      size="lg"
                      gradientIndex={index}
                    />
                    {iconName && (
                      <View style={styles.instrumentBadge}>
                        <FontAwesome name={iconName as any} size={10} color="#fff" />
                      </View>
                    )}
                    {punishmentCount > 0 && (
                      <View style={styles.countBadge}>
                        <Text style={styles.countText}>{punishmentCount}</Text>
                      </View>
                    )}
                    {isSelf && (
                      <View style={styles.selfBadge}>
                        <Text style={styles.selfText}>你</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {memberUser.name}
                  </Text>
                  <Text style={styles.memberInstrument} numberOfLines={1}>
                    {getMemberInstrumentName(memberUser.instruments)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Admin Actions */}
        {isAdmin && (
          <Button
            title="开始惩罚轮盘"
            onPress={() => navigation.navigate('LateSelection')}
            icon={<FontAwesome name="play" size={14} color="#fff" />}
            style={styles.startButton}
          />
        )}

        {/* Status Info */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{punishments.length}</Text>
              <Text style={styles.statusLabel}>惩罚项目</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{members.length}</Text>
              <Text style={styles.statusLabel}>成员</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{currentGroup.max_punishments_per_person}</Text>
              <Text style={styles.statusLabel}>上限/人</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: Colors.text.tertiary,
    fontSize: 16,
  },
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
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupEmoji: {
    fontSize: 36,
  },
  groupName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  memberCount: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.glass.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeCard: {
    marginBottom: 24,
  },
  codeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeLabel: {
    fontSize: 12,
    color: Colors.text.muted,
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 4,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  shareText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  tableCard: {
    marginBottom: 24,
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  tableSubtitle: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginBottom: 24,
  },
  membersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  memberItem: {
    alignItems: 'center',
    width: 80,
  },
  memberAvatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  instrumentBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.info,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background.primary,
  },
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  selfBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: Colors.success,
  },
  selfText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  memberInstrument: {
    fontSize: 11,
    color: Colors.text.muted,
    textAlign: 'center',
  },
  startButton: {
    marginBottom: 24,
  },
  statusCard: {
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: Colors.text.muted,
  },
  statusDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.glass.border,
  },
});
