import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Card, MemberAvatar, SafeArea } from '../components/ui';
import Colors from '../constants/colors';
import { useAuthStore } from '../stores/authStore';
import { useGroupStore } from '../stores/groupStore';
import { AISuggestion } from '../types/database';

type RootStackParamList = {
  AddPunishment: { targetUserId: string; targetUserName: string };
  RoundTable: undefined;
};

const QUICK_TEMPLATES = [
  '请所有人喝奶茶',
  '下次排练必须第一个到',
  '唱一首歌',
  '做20个俯卧撑',
  '请大家吃饭',
];

export function AddPunishmentScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AddPunishment'>>();
  const { targetUserId, targetUserName } = route.params;

  const { user } = useAuthStore();
  const { currentGroup, punishments, addPunishment, deletePunishment, isLoading, loadSuggestions, generateSuggestions } = useGroupStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [suggestionPool, setSuggestionPool] = useState<AISuggestion[]>([]); // 建议池
  const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0); // 当前显示的索引
  const [isRefreshing, setIsRefreshing] = useState(false); // 后台刷新中

  // 本地默认建议（用于首次显示，无加载时间）
  const getLocalSuggestion = (): AISuggestion => {
    const templates = [
      { suggestion: '请所有人喝奶茶', reason: '经典惩罚，人人喜欢' },
      { suggestion: '下次排练必须第一个到', reason: '让迟到的人知道什么是准时' },
      { suggestion: '唱一首歌给大家听', reason: '展示你的才艺' },
      { suggestion: '给大家表演一段solo', reason: '用音乐来赎罪' },
      { suggestion: '负责下次排练的饮料', reason: '用行动表示歉意' },
    ];
    const random = templates[Math.floor(Math.random() * templates.length)];
    return {
      id: `local-${Date.now()}`,
      group_id: currentGroup?.id || '',
      target_id: targetUserId,
      suggestion: random.suggestion,
      reason: random.reason,
      generated_at: new Date().toISOString(),
    };
  };

  // 当前显示的建议（永远有值）
  const currentSuggestion = suggestionPool[currentSuggestionIndex] || getLocalSuggestion();

  // 首次加载：先显示本地建议，同时后台加载
  useEffect(() => {
    if (currentGroup && targetUserId) {
      // 立即设置一个本地建议
      setSuggestionPool([getLocalSuggestion()]);
      // 后台加载/生成真正的建议
      loadAndGenerateInBackground();
    }
  }, [currentGroup, targetUserId]);

  // 后台加载并生成建议
  const loadAndGenerateInBackground = async () => {
    if (!currentGroup || isRefreshing) return;
    setIsRefreshing(true);
    try {
      // 先尝试加载已有建议
      let suggestions = await loadSuggestions(currentGroup.id, targetUserId);
      
      // 如果没有，生成新的
      if (suggestions.length === 0) {
        suggestions = await generateSuggestions(currentGroup.id, targetUserId);
      }
      
      if (suggestions.length > 0) {
        // 追加到池子（保留当前显示的）
        setSuggestionPool(prev => {
          const existingTexts = new Set(prev.map(s => s.suggestion));
          const uniqueNew = suggestions.filter(s => !existingTexts.has(s.suggestion));
          return [...prev, ...uniqueNew];
        });
      }
    } catch (error) {
      console.error('Background load error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 换一个建议（即时切换，无等待）
  const handleNextSuggestion = () => {
    const nextIndex = currentSuggestionIndex + 1;
    
    if (nextIndex < suggestionPool.length) {
      // 还有下一个，直接显示
      setCurrentSuggestionIndex(nextIndex);
    } else {
      // 没有了，先显示一个本地建议，同时后台补充
      const localSuggestion = getLocalSuggestion();
      setSuggestionPool(prev => [...prev, localSuggestion]);
      setCurrentSuggestionIndex(nextIndex);
    }
    
    // 如果池子快用完，后台补充
    if (nextIndex >= suggestionPool.length - 2 && !isRefreshing) {
      refreshPoolInBackground();
    }
  };

  // 后台补充建议池
  const refreshPoolInBackground = async () => {
    if (!currentGroup || isRefreshing) return;
    setIsRefreshing(true);
    try {
      console.log('[AI] Background refresh...');
      const newSuggestions = await generateSuggestions(currentGroup.id, targetUserId);
      if (newSuggestions.length > 0) {
        setSuggestionPool(prev => {
          const existingTexts = new Set(prev.map(s => s.suggestion));
          const uniqueNew = newSuggestions.filter(s => !existingTexts.has(s.suggestion));
          return [...prev, ...uniqueNew];
        });
      }
    } catch (error) {
      console.error('Background refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 获取当前用户给目标用户设置的惩罚
  const myPunishmentsForTarget = punishments.filter(
    (p) => p.author_id === user?.id && p.target_id === targetUserId
  );

  const maxPunishments = currentGroup?.max_punishments_per_person || 5;
  const canAddMore = myPunishmentsForTarget.length < maxPunishments;

  const handleAddPunishment = async () => {
    if (!title.trim()) {
      Alert.alert('提示', '请输入惩罚内容');
      return;
    }

    if (!currentGroup || !user) return;

    try {
      await addPunishment(currentGroup.id, user.id, targetUserId, title.trim(), description.trim());
      setTitle('');
      setDescription('');
      Alert.alert('成功', '惩罚项目已添加');
    } catch (error: any) {
      Alert.alert('错误', error.message || '添加失败');
    }
  };

  const handleDeletePunishment = (punishmentId: string) => {
    Alert.alert('确认删除', '确定要删除这个惩罚项目吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePunishment(punishmentId);
          } catch (error: any) {
            Alert.alert('错误', error.message || '删除失败');
          }
        },
      },
    ]);
  };

  const handleQuickTemplate = (template: string) => {
    setTitle(template);
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
          <Text style={styles.headerTitle}>添加惩罚</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Target User */}
        <Card variant="strong" style={styles.targetCard}>
          <View style={styles.targetContent}>
            <MemberAvatar name={targetUserName} id={targetUserId} size="lg" />
            <View style={styles.targetInfo}>
              <Text style={styles.targetLabel}>惩罚对象</Text>
              <Text style={styles.targetName}>{targetUserName}</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {myPunishmentsForTarget.length}/{maxPunishments}
              </Text>
            </View>
          </View>
        </Card>

        {/* Existing Punishments */}
        {myPunishmentsForTarget.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>已添加的惩罚</Text>
            {myPunishmentsForTarget.map((punishment) => (
              <Card key={punishment.id} style={styles.punishmentCard}>
                <View style={styles.punishmentContent}>
                  <View style={styles.punishmentIcon}>
                    <FontAwesome name="bolt" size={16} color={Colors.warning} />
                  </View>
                  <View style={styles.punishmentInfo}>
                    <Text style={styles.punishmentTitle}>{punishment.title}</Text>
                    {punishment.description && (
                      <Text style={styles.punishmentDesc}>{punishment.description}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeletePunishment(punishment.id)}
                  >
                    <FontAwesome name="trash-o" size={16} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Add New Punishment */}
        {canAddMore ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>添加新惩罚</Text>

            {/* AI Suggestions - 只显示一个，永远有内容 */}
            <View style={styles.aiSection}>
              <View style={styles.aiHeader}>
                <View style={styles.aiTitleRow}>
                  <FontAwesome name="magic" size={14} color={Colors.primary} />
                  <Text style={styles.aiLabel}>AI 个性化推荐</Text>
                </View>
              </View>
              
              <View style={styles.singleSuggestionContainer}>
                <TouchableOpacity
                  style={styles.singleSuggestionCard}
                  onPress={() => handleQuickTemplate(currentSuggestion.suggestion)}
                >
                  <View style={styles.suggestionMainContent}>
                    <Text style={styles.singleSuggestionText}>{currentSuggestion.suggestion}</Text>
                    {currentSuggestion.reason && (
                      <Text style={styles.singleSuggestionReason}>{currentSuggestion.reason}</Text>
                    )}
                  </View>
                  <View style={styles.suggestionActions}>
                    <FontAwesome name="plus-circle" size={22} color={Colors.primary} />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.changeSuggestionButton}
                  onPress={handleNextSuggestion}
                >
                  <FontAwesome name="refresh" size={12} color={Colors.text.secondary} />
                  <Text style={styles.changeSuggestionText}>换一个</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Templates */}
            <Text style={styles.templateLabel}>快速模板</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.templateScroll}
              contentContainerStyle={styles.templateContent}
            >
              {QUICK_TEMPLATES.map((template, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.templateButton}
                  onPress={() => handleQuickTemplate(template)}
                >
                  <Text style={styles.templateText}>{template}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Input Fields */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>惩罚内容</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="例如：请所有人喝奶茶"
                placeholderTextColor={Colors.text.muted}
                maxLength={50}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>补充说明（可选）</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="添加更多细节..."
                placeholderTextColor={Colors.text.muted}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </View>

            <Button
              title="添加惩罚"
              onPress={handleAddPunishment}
              loading={isLoading}
              disabled={!title.trim()}
              icon={<FontAwesome name="plus" size={14} color="#fff" />}
            />
          </View>
        ) : (
          <Card style={styles.maxReachedCard}>
            <FontAwesome name="check-circle" size={32} color={Colors.success} />
            <Text style={styles.maxReachedText}>
              已达到惩罚上限 ({maxPunishments}个)
            </Text>
            <Text style={styles.maxReachedSubtext}>
              你可以删除已有的惩罚来添加新的
            </Text>
          </Card>
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
  targetCard: {
    marginBottom: 24,
  },
  targetContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  targetInfo: {
    flex: 1,
  },
  targetLabel: {
    fontSize: 12,
    color: Colors.text.muted,
    marginBottom: 4,
  },
  targetName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  countBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  punishmentCard: {
    marginBottom: 12,
  },
  punishmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  punishmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${Colors.warning}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  punishmentInfo: {
    flex: 1,
  },
  punishmentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  punishmentDesc: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${Colors.danger}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiSection: {
    marginBottom: 20,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  aiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiLabel: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  singleSuggestionContainer: {
    gap: 8,
  },
  singleSuggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glass.background,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  suggestionMainContent: {
    flex: 1,
  },
  singleSuggestionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 22,
  },
  singleSuggestionReason: {
    fontSize: 13,
    color: Colors.primary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  suggestionActions: {
    paddingLeft: 8,
  },
  changeSuggestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  changeSuggestionText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  templateLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  templateScroll: {
    marginBottom: 20,
    marginHorizontal: -24,
  },
  templateContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  templateButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.glass.background,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  templateText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.glass.background,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  maxReachedCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  maxReachedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  maxReachedSubtext: {
    fontSize: 14,
    color: Colors.text.tertiary,
    marginTop: 8,
  },
});
