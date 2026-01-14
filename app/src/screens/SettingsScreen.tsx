import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, SafeArea, MemberAvatar, Button } from '../components/ui';
import Colors from '../constants/colors';
import { useAuthStore } from '../stores/authStore';
import { useGroupStore } from '../stores/groupStore';

type RootStackParamList = {
  Settings: undefined;
  RoundTable: undefined;
  JoinCreate: undefined;
  Login: undefined;
  Welcome: undefined;
  Unlock: undefined;
};

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout } = useAuthStore();
  const { currentGroup, userGroups, members, leaveGroup, kickMember, transferAdmin, updateGroupSettings, switchGroup, loadMembers, loadPunishments, clearGroup } = useGroupStore();

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedNewAdmin, setSelectedNewAdmin] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  // 群组切换
  const [showGroupSwitcher, setShowGroupSwitcher] = useState(false);

  // 设置相关状态
  const [showPunishmentModal, setShowPunishmentModal] = useState(false);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [tempMaxPunishments, setTempMaxPunishments] = useState(currentGroup?.max_punishments_per_person || 3);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = user?.id === currentGroup?.admin_id;
  
  // 获取除自己以外的其他成员
  const otherMembers = members.filter(m => m.user_id !== user?.id);

  // 离开群组后的导航处理
  const navigateAfterLeave = () => {
    // 检查是否还有其他群组
    const remainingGroups = userGroups.filter(g => g.id !== currentGroup?.id);
    if (remainingGroups.length > 0) {
      // 还有其他群组，跳转到圆桌（会自动切换到第一个剩余群组）
      navigation.reset({
        index: 0,
        routes: [{ name: 'RoundTable' }],
      });
    } else {
      // 没有群组了，跳转到加入页面
      navigation.reset({
        index: 0,
        routes: [{ name: 'JoinCreate' }],
      });
    }
  };

  const handleLeaveGroup = () => {
    console.log('[Settings] handleLeaveGroup called', { 
      isAdmin, 
      hasUser: !!user, 
      hasGroup: !!currentGroup,
      otherMembersCount: otherMembers.length 
    });
    
    if (!user || !currentGroup) {
      console.log('[Settings] Missing user or currentGroup');
      Alert.alert('错误', '无法获取用户或群组信息');
      return;
    }
    
    if (isAdmin) {
      // 如果是 admin，需要先选择新 admin
      if (otherMembers.length === 0) {
        // 没有其他成员，直接解散群组
        Alert.alert(
          '解散群组',
          '你是群组中唯一的成员，离开将解散群组。确定要继续吗？',
          [
            { text: '取消', style: 'cancel' },
            {
              text: '解散',
              style: 'destructive',
              onPress: async () => {
                await leaveGroup(currentGroup.id, user.id);
                navigateAfterLeave();
              },
            },
          ]
        );
      } else {
        // 有其他成员，显示选择新 admin 的弹窗
        setShowAdminModal(true);
      }
    } else {
      // 非 admin 直接离开
      console.log('[Settings] Non-admin leaving group');
      Alert.alert(
        '离开群组',
        '确定要离开这个群组吗？你的惩罚记录将会保留。',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '离开',
            style: 'destructive',
            onPress: async () => {
              console.log('[Settings] Leaving group:', currentGroup.id);
              await leaveGroup(currentGroup.id, user.id);
              navigateAfterLeave();
            },
          },
        ]
      );
    }
  };

  const handleTransferAndLeave = async () => {
    if (!selectedNewAdmin || !currentGroup || !user) return;
    
    setIsTransferring(true);
    try {
      // 先转移 admin 权限
      await transferAdmin(currentGroup.id, selectedNewAdmin);
      // 然后离开群组
      await leaveGroup(currentGroup.id, user.id);
      
      setShowAdminModal(false);
      navigateAfterLeave();
    } catch (error: any) {
      Alert.alert('错误', error.message || '操作失败');
    } finally {
      setIsTransferring(false);
    }
  };

  // 切换 AI 匹配
  const handleToggleAI = async (value: boolean) => {
    if (!currentGroup) return;
    try {
      await updateGroupSettings(currentGroup.id, { ai_matching_enabled: value });
    } catch (error: any) {
      Alert.alert('错误', error.message || '更新失败');
    }
  };

  // 保存惩罚数上限
  const handleSaveMaxPunishments = async () => {
    if (!currentGroup) return;
    setIsSaving(true);
    try {
      await updateGroupSettings(currentGroup.id, { max_punishments_per_person: tempMaxPunishments });
      setShowPunishmentModal(false);
    } catch (error: any) {
      Alert.alert('错误', error.message || '更新失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 设置解锁时间
  const handleSetExpiry = async (months: number | null) => {
    if (!currentGroup) return;
    setIsSaving(true);
    try {
      let expires_at: string | null = null;
      if (months !== null) {
        const date = new Date();
        date.setMonth(date.getMonth() + months);
        expires_at = date.toISOString();
      }
      await updateGroupSettings(currentGroup.id, { expires_at });
      setShowExpiryModal(false);
    } catch (error: any) {
      Alert.alert('错误', error.message || '更新失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 格式化过期时间显示
  const formatExpiryDate = () => {
    if (!currentGroup?.expires_at) return '未设置（随时可解锁）';
    const date = new Date(currentGroup.expires_at);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const handleLogout = () => {
    // 检查用户是否是任何群组的管理员
    const adminGroups = userGroups.filter(g => g.admin_id === user?.id);
    
    if (adminGroups.length > 0) {
      Alert.alert(
        '无法退出',
        `你是 ${adminGroups.length} 个群组的管理员。请先在这些群组中移交管理员权限，或离开这些群组后再退出登录。\n\n群组：${adminGroups.map(g => g.name).join('、')}`,
        [{ text: '知道了', style: 'default' }]
      );
      return;
    }

    Alert.alert(
      '退出登录',
      '退出后将清除此设备的账号绑定，下次打开可以输入新的名字。\n\n你的群组和惩罚数据会保留在服务器上。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '退出',
          style: 'destructive',
          onPress: async () => {
            // 离开所有群组
            for (const group of userGroups) {
              await leaveGroup(group.id, user!.id);
            }
            // 清除群组状态
            clearGroup();
            // 退出登录
            await logout();
            // 导航到欢迎页面
            navigation.reset({
              index: 0,
              routes: [{ name: 'Welcome' }],
            });
          },
        },
      ]
    );
  };

  const handleKickMember = async (memberId: string, memberName: string) => {
    if (!currentGroup || !user) return;

    Alert.alert(
      '移除成员',
      `确定要将 ${memberName} 移出群组吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '移除',
          style: 'destructive',
          onPress: async () => {
            try {
              await kickMember(currentGroup.id, memberId);
              Alert.alert('成功', `已将 ${memberName} 移出群组`);
            } catch (error: any) {
              Alert.alert('错误', error.message || '移除成员失败');
            }
          },
        },
      ]
    );
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
          <Text style={styles.headerTitle}>设置</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Group Info */}
        {currentGroup && (
          <Card variant="strong" style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupEmoji}>{currentGroup.emoji}</Text>
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{currentGroup.name}</Text>
                <Text style={styles.groupCode}>邀请码: {currentGroup.invite_code}</Text>
              </View>
              {isAdmin && (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminText}>管理员</Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Group Settings (Admin only) */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>群组设置</Text>

            <Card style={styles.settingCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <FontAwesome name="magic" size={18} color={Colors.info} />
                  <View style={styles.settingText}>
                    <Text style={styles.settingLabel}>AI 智能匹配</Text>
                    <Text style={styles.settingDesc}>根据用户心情推荐惩罚</Text>
                  </View>
                </View>
                <Switch
                  value={currentGroup?.ai_matching_enabled ?? true}
                  onValueChange={handleToggleAI}
                  trackColor={{ false: Colors.glass.background, true: Colors.primary }}
                />
              </View>
            </Card>

            <Card style={styles.settingCard}>
              <TouchableOpacity 
                style={styles.settingRow}
                onPress={() => {
                  setTempMaxPunishments(currentGroup?.max_punishments_per_person || 3);
                  setShowPunishmentModal(true);
                }}
              >
                <View style={styles.settingInfo}>
                  <FontAwesome name="sliders" size={18} color={Colors.warning} />
                  <View style={styles.settingText}>
                    <Text style={styles.settingLabel}>惩罚数上限</Text>
                    <Text style={styles.settingDesc}>
                      每人最多 {currentGroup?.max_punishments_per_person || 3} 个
                    </Text>
                  </View>
                </View>
                <FontAwesome name="chevron-right" size={14} color={Colors.text.muted} />
              </TouchableOpacity>
            </Card>

            <Card style={styles.settingCard}>
              <TouchableOpacity 
                style={styles.settingRow}
                onPress={() => setShowExpiryModal(true)}
              >
                <View style={styles.settingInfo}>
                  <FontAwesome name="calendar" size={18} color={Colors.success} />
                  <View style={styles.settingText}>
                    <Text style={styles.settingLabel}>解锁时间</Text>
                    <Text style={styles.settingDesc}>
                      {formatExpiryDate()}
                    </Text>
                  </View>
                </View>
                <FontAwesome name="chevron-right" size={14} color={Colors.text.muted} />
              </TouchableOpacity>
            </Card>

            <Card style={styles.settingCard}>
              <TouchableOpacity 
                style={styles.settingRow}
                onPress={() => setShowMembersModal(true)}
              >
                <View style={styles.settingInfo}>
                  <FontAwesome name="users" size={18} color={Colors.warning} />
                  <View style={styles.settingText}>
                    <Text style={styles.settingLabel}>管理成员</Text>
                    <Text style={styles.settingDesc}>
                      {members.length} 位成员
                    </Text>
                  </View>
                </View>
                <FontAwesome name="chevron-right" size={14} color={Colors.text.muted} />
              </TouchableOpacity>
            </Card>
          </View>
        )}

        {/* Unlock Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>惩罚表</Text>

          <Card style={styles.settingCard}>
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => navigation.navigate('Unlock')}
            >
              <View style={styles.settingInfo}>
                <FontAwesome name="unlock-alt" size={18} color={Colors.primary} />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>解锁惩罚表</Text>
                  <Text style={styles.settingDesc}>
                    查看谁给谁写了什么惩罚
                  </Text>
                </View>
              </View>
              <FontAwesome name="chevron-right" size={14} color={Colors.text.muted} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>账户</Text>

          <Card style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <FontAwesome name="user" size={18} color={Colors.text.secondary} />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>{user?.name}</Text>
                  <Text style={styles.settingDesc}>
                    {user?.instruments?.join(' · ') || '未选择图标'}
                  </Text>
                </View>
              </View>
            </View>
          </Card>

          {/* 切换群组 - 总是显示 */}
          <Card style={styles.settingCard}>
            <TouchableOpacity 
              style={styles.settingRow} 
              onPress={() => setShowGroupSwitcher(true)}
            >
              <View style={styles.settingInfo}>
                <FontAwesome name="th-large" size={18} color={Colors.info} />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>我的群组</Text>
                  <Text style={styles.settingDesc}>
                    {userGroups.length > 0 ? `${userGroups.length} 个群组` : '查看和管理群组'}
                  </Text>
                </View>
              </View>
              <FontAwesome name="chevron-right" size={14} color={Colors.text.muted} />
            </TouchableOpacity>
          </Card>

          <Card style={styles.settingCard}>
            <TouchableOpacity style={styles.settingRow} onPress={handleLeaveGroup}>
              <View style={styles.settingInfo}>
                <FontAwesome name="sign-out" size={18} color={Colors.warning} />
                <View style={styles.settingText}>
                  <Text style={[styles.settingLabel, { color: Colors.warning }]}>
                    离开此群组
                  </Text>
                  <Text style={styles.settingDesc}>退出当前群组</Text>
                </View>
              </View>
              <FontAwesome name="chevron-right" size={14} color={Colors.text.muted} />
            </TouchableOpacity>
          </Card>

          <Card style={styles.settingCard}>
            <TouchableOpacity style={styles.settingRow} onPress={handleLogout}>
              <View style={styles.settingInfo}>
                <FontAwesome name="power-off" size={18} color={Colors.danger} />
                <View style={styles.settingText}>
                  <Text style={[styles.settingLabel, { color: Colors.danger }]}>
                    退出登录
                  </Text>
                  <Text style={styles.settingDesc}>解除设备绑定，下次可输入新名字</Text>
                </View>
              </View>
              <FontAwesome name="chevron-right" size={14} color={Colors.text.muted} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>关于</Text>

          <Card style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <FontAwesome name="info-circle" size={18} color={Colors.text.secondary} />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>版本</Text>
                  <Text style={styles.settingDesc}>1.0.0</Text>
                </View>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* 选择新管理员弹窗 */}
      <Modal
        visible={showAdminModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAdminModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>选择新管理员</Text>
            <Text style={styles.modalSubtitle}>
              离开前请选择一位成员接管管理员职责
            </Text>

            <ScrollView style={styles.memberList}>
              {otherMembers.map((member) => (
                <TouchableOpacity
                  key={member.user_id}
                  style={[
                    styles.memberItem,
                    selectedNewAdmin === member.user_id && styles.memberItemSelected,
                  ]}
                  onPress={() => setSelectedNewAdmin(member.user_id)}
                >
                  <MemberAvatar
                    name={member.user?.name || '未知'}
                    id={member.user_id}
                    size="md"
                  />
                  <Text style={styles.memberName}>
                    {member.user?.name || '未知成员'}
                  </Text>
                  {selectedNewAdmin === member.user_id && (
                    <FontAwesome name="check-circle" size={20} color={Colors.success} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <Button
                title="取消"
                variant="ghost"
                onPress={() => {
                  setShowAdminModal(false);
                  setSelectedNewAdmin(null);
                }}
                style={styles.modalButton}
              />
              <Button
                title="确认并离开"
                onPress={handleTransferAndLeave}
                loading={isTransferring}
                disabled={!selectedNewAdmin}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* 惩罚数上限弹窗 */}
      <Modal
        visible={showPunishmentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPunishmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>设置惩罚数上限</Text>
            <Text style={styles.modalSubtitle}>
              每位成员可以给他人设置的惩罚数量上限
            </Text>

            <View style={styles.counterContainer}>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => setTempMaxPunishments(Math.max(1, tempMaxPunishments - 1))}
              >
                <FontAwesome name="minus" size={18} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{tempMaxPunishments}</Text>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => setTempMaxPunishments(Math.min(10, tempMaxPunishments + 1))}
              >
                <FontAwesome name="plus" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <Button
                title="取消"
                variant="ghost"
                onPress={() => setShowPunishmentModal(false)}
                style={styles.modalButton}
              />
              <Button
                title="保存"
                onPress={handleSaveMaxPunishments}
                loading={isSaving}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* 解锁时间弹窗 */}
      <Modal
        visible={showExpiryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExpiryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>设置解锁时间</Text>
            <Text style={styles.modalSubtitle}>
              设置后，成员需等待到期后才能查看惩罚作者
            </Text>

            <View style={styles.expiryOptions}>
              <TouchableOpacity
                style={styles.expiryOption}
                onPress={() => handleSetExpiry(null)}
              >
                <FontAwesome name="unlock" size={20} color={Colors.text.secondary} />
                <Text style={styles.expiryOptionText}>不设置（随时可解锁）</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.expiryOption}
                onPress={() => handleSetExpiry(1)}
              >
                <FontAwesome name="calendar" size={20} color={Colors.info} />
                <Text style={styles.expiryOptionText}>1 个月后</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.expiryOption}
                onPress={() => handleSetExpiry(3)}
              >
                <FontAwesome name="calendar" size={20} color={Colors.warning} />
                <Text style={styles.expiryOptionText}>3 个月后</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.expiryOption}
                onPress={() => handleSetExpiry(6)}
              >
                <FontAwesome name="calendar" size={20} color={Colors.success} />
                <Text style={styles.expiryOptionText}>6 个月后</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.expiryOption}
                onPress={() => handleSetExpiry(12)}
              >
                <FontAwesome name="calendar" size={20} color={Colors.primary} />
                <Text style={styles.expiryOptionText}>1 年后</Text>
              </TouchableOpacity>
            </View>

            <Button
              title="取消"
              variant="ghost"
              onPress={() => setShowExpiryModal(false)}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>

      {/* 管理成员弹窗 */}
      <Modal
        visible={showMembersModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMembersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>管理成员</Text>
            <Text style={styles.modalSubtitle}>
              {members.length} 位成员
            </Text>

            <ScrollView style={styles.memberList}>
              {members.map((member) => {
                const memberUser = member.user;
                if (!memberUser) return null;
                
                const isSelf = memberUser.id === user?.id;
                const isMemberAdmin = memberUser.id === currentGroup?.admin_id;

                return (
                  <View
                    key={member.id}
                    style={styles.memberItem}
                  >
                    <MemberAvatar
                      name={memberUser.name}
                      id={memberUser.id}
                      size="md"
                    />
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>
                        {memberUser.name}
                        {isSelf && ' (你)'}
                      </Text>
                      {isMemberAdmin && (
                        <Text style={styles.memberRole}>管理员</Text>
                      )}
                    </View>
                    {!isSelf && !isMemberAdmin && (
                      <TouchableOpacity
                        style={styles.kickButton}
                        onPress={() => {
                          setShowMembersModal(false);
                          handleKickMember(memberUser.id, memberUser.name);
                        }}
                      >
                        <FontAwesome name="times-circle" size={20} color={Colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <Button
              title="关闭"
              variant="ghost"
              onPress={() => setShowMembersModal(false)}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>

      {/* 群组切换弹窗 */}
      <Modal
        visible={showGroupSwitcher}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGroupSwitcher(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>我的群组</Text>
            <Text style={styles.modalSubtitle}>
              {userGroups.length > 0 ? '选择要切换到的群组' : '你还没有加入任何群组'}
            </Text>

            <ScrollView style={styles.memberList}>
              {userGroups.map((group) => (
                <TouchableOpacity
                  key={group.id}
                  style={[
                    styles.groupItem,
                    currentGroup?.id === group.id && styles.groupItemSelected,
                  ]}
                  onPress={async () => {
                    if (group.id !== currentGroup?.id) {
                      await switchGroup(group);
                      await loadMembers(group.id);
                      await loadPunishments(group.id);
                    }
                    setShowGroupSwitcher(false);
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'RoundTable' }],
                    });
                  }}
                >
                  <Text style={styles.groupItemEmoji}>{group.emoji}</Text>
                  <View style={styles.groupItemInfo}>
                    <Text style={styles.groupItemName}>{group.name}</Text>
                    <Text style={styles.groupItemCode}>
                      邀请码: {group.invite_code}
                    </Text>
                  </View>
                  {currentGroup?.id === group.id && (
                    <FontAwesome name="check-circle" size={20} color={Colors.success} />
                  )}
                </TouchableOpacity>
              ))}

              {/* 加入新群组按钮 */}
              <TouchableOpacity
                style={styles.addGroupItem}
                onPress={() => {
                  setShowGroupSwitcher(false);
                  navigation.navigate('JoinCreate', { skipAutoRedirect: true });
                }}
              >
                <View style={styles.addGroupIcon}>
                  <FontAwesome name="plus" size={24} color={Colors.success} />
                </View>
                <View style={styles.groupItemInfo}>
                  <Text style={styles.groupItemName}>加入新群组</Text>
                  <Text style={styles.groupItemCode}>
                    加入或创建一个群组
                  </Text>
                </View>
                <FontAwesome name="chevron-right" size={14} color={Colors.text.muted} />
              </TouchableOpacity>
            </ScrollView>

            <Button
              title="关闭"
              variant="ghost"
              onPress={() => setShowGroupSwitcher(false)}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>
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
    marginBottom: 24,
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
  groupCard: {
    marginBottom: 24,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  groupEmoji: {
    fontSize: 40,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  groupCode: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  adminBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  adminText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.muted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingCard: {
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  settingDesc: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: 24,
  },
  memberList: {
    maxHeight: 300,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.glass.background,
    marginBottom: 8,
  },
  memberItemSelected: {
    backgroundColor: `${Colors.primary}20`,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  memberRole: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 2,
  },
  kickButton: {
    padding: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
  },
  // Counter styles
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginVertical: 32,
  },
  counterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.glass.backgroundStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    minWidth: 60,
    textAlign: 'center',
  },
  // Expiry styles
  expiryOptions: {
    marginTop: 16,
  },
  expiryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.glass.background,
    marginBottom: 8,
  },
  expiryOptionText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  // Group switcher styles
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.glass.background,
    marginBottom: 8,
  },
  groupItemSelected: {
    backgroundColor: `${Colors.primary}20`,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  groupItemEmoji: {
    fontSize: 32,
  },
  groupItemInfo: {
    flex: 1,
  },
  groupItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  groupItemCode: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  addGroupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.glass.background,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.success,
    borderStyle: 'dashed',
  },
  addGroupIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.success}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
