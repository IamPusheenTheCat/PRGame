import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input, Card, SafeArea } from '../components/ui';
import Colors from '../constants/colors';
import { useAuthStore } from '../stores/authStore';
import { useGroupStore } from '../stores/groupStore';
import { INSTRUMENTS, GENERAL_ICONS } from '../constants/instruments';

type RootStackParamList = {
  CreateGroup: undefined;
  IconSelection: { is_band: boolean };
};

// 乐队专用图标（音乐相关）
const BAND_EMOJIS = ['🎸', '🎤', '🎹', '🎺', '🎷', '🥁', '🎻', '🎵', '🎶', '🎼'];

// 非乐队可用的更多图标
const ALL_EMOJIS = [
  // 音乐相关
  '🎸', '🎤', '🎹', '🎺', '🎷', '🥁', '🎻', '🎵', '🎶', '🎼',
  // 派对/聚会
  '🎉', '🎊', '🥳', '🍻', '🍺', '🍷', '🥂', '🎭', '🎪', '🎯',
  // 运动/活动
  '⚽', '🏀', '🎮', '🎲', '🃏', '♠️', '🎱', '🏆', '🎳', '🎰',
  // 可爱/有趣
  '🦄', '🐱', '🐶', '🦊', '🐼', '🐨', '🦁', '🐯', '🐸', '👻',
  // 其他
  '⭐', '🌟', '💫', '✨', '🔥', '💥', '❤️', '💜', '💙', '🖤',
];

export function CreateGroupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuthStore();
  const { createGroup, isLoading } = useGroupStore();

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎸');
  const [maxPunishments, setMaxPunishments] = useState(5);
  const [isBand, setIsBand] = useState(true);
  const [showBandQuestion, setShowBandQuestion] = useState(true);

  const handleCreate = async () => {
    console.log('[CreateGroup] handleCreate called');
    console.log('[CreateGroup] name:', name, 'user:', user?.id);
    
    if (!name.trim()) {
      Alert.alert('提示', '请输入群组名称');
      return;
    }

    if (!user) {
      Alert.alert('错误', '请先登录');
      return;
    }

    try {
      console.log('[CreateGroup] Creating group...');
      const group = await createGroup(name.trim(), emoji, user.id, maxPunishments, isBand);
      console.log('[CreateGroup] Group created:', group);
      // 导航到 IconSelection
      navigation.navigate('IconSelection', { is_band: isBand });
    } catch (error: any) {
      console.error('[CreateGroup] Error:', error);
      Alert.alert('错误', error.message || '创建群组失败');
    }
  };

  const displayIcons = isBand ? INSTRUMENTS : GENERAL_ICONS;
  const displayEmojis = isBand ? BAND_EMOJIS : ALL_EMOJIS;

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
          <Text style={styles.headerTitle}>创建群组</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Band Question */}
        {showBandQuestion && (
          <Card variant="strong" style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <Text style={styles.questionEmoji}>🎸</Text>
              <Text style={styles.questionTitle}>你们是乐队吗？</Text>
            </View>
            <Text style={styles.questionDesc}>
              这会影响成员可以选择的图标类型
            </Text>
            <View style={styles.questionButtons}>
              <TouchableOpacity
                style={[styles.questionBtn, isBand && styles.questionBtnActive]}
                onPress={() => {
                  setIsBand(true);
                  setShowBandQuestion(false);
                }}
              >
                <Text style={[styles.questionBtnText, isBand && styles.questionBtnTextActive]}>
                  是的！（简单模式）
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.questionBtn, !isBand && styles.questionBtnActive]}
                onPress={() => {
                  setIsBand(false);
                  setShowBandQuestion(false);
                }}
              >
                <Text style={[styles.questionBtnText, !isBand && styles.questionBtnTextActive]}>
                  不是
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Not Band Message */}
        {!isBand && !showBandQuestion && (
          <Card style={styles.notBandCard}>
            <Text style={styles.notBandText}>
              啊，原来你们不是乐队啊。{'\n'}
              没关系，成员们将有 {GENERAL_ICONS.length} 个图标可选！
            </Text>
          </Card>
        )}

        {/* Group Name */}
        <View style={styles.section}>
          <Input
            label="群组名称"
            value={name}
            onChangeText={setName}
            placeholder="例如：摇滚乐队、周末聚会..."
            maxLength={20}
          />
        </View>

        {/* Group Emoji */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>群组图标</Text>
          <View style={styles.emojiGrid}>
            {displayEmojis.map((e) => (
              <TouchableOpacity
                key={e}
                style={[styles.emojiItem, emoji === e && styles.emojiItemSelected]}
                onPress={() => setEmoji(e)}
              >
                <Text style={styles.emojiText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Max Punishments */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>每人惩罚数上限</Text>
          <View style={styles.counterContainer}>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={() => setMaxPunishments(Math.max(1, maxPunishments - 1))}
            >
              <FontAwesome name="minus" size={14} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{maxPunishments}</Text>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={() => setMaxPunishments(Math.min(10, maxPunishments + 1))}
            >
              <FontAwesome name="plus" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Band Toggle (if already answered) */}
        {!showBandQuestion && (
          <Card style={styles.toggleCard}>
            <View style={styles.toggleContent}>
              <View>
                <Text style={styles.toggleLabel}>乐队模式</Text>
                <Text style={styles.toggleDesc}>
                  {isBand ? '成员选择乐器图标' : '成员选择通用图标'}
                </Text>
              </View>
              <Switch
                value={isBand}
                onValueChange={setIsBand}
                trackColor={{ false: Colors.glass.background, true: Colors.primary }}
              />
            </View>
          </Card>
        )}

        {/* Preview Icons */}
        <Card style={styles.previewCard}>
          <Text style={styles.previewLabel}>成员可选图标预览</Text>
          <View style={styles.iconPreviewGrid}>
            {displayIcons.slice(0, 8).map((icon) => (
              <View key={icon.id} style={styles.iconPreviewItem}>
                <FontAwesome name={icon.icon as any} size={20} color={Colors.text.secondary} />
                <Text style={styles.iconPreviewName}>{icon.name}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Create Button */}
        <Button
          title="创建群组"
          onPress={handleCreate}
          loading={isLoading}
          disabled={!name.trim() || showBandQuestion}
          style={styles.createButton}
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
  questionCard: {
    marginBottom: 24,
    alignItems: 'center',
    paddingVertical: 24,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  questionEmoji: {
    fontSize: 32,
  },
  questionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  questionDesc: {
    fontSize: 14,
    color: Colors.text.tertiary,
    marginBottom: 20,
  },
  questionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  questionBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.glass.background,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  questionBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  questionBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  questionBtnTextActive: {
    color: '#fff',
  },
  notBandCard: {
    marginBottom: 24,
    alignItems: 'center',
  },
  notBandText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emojiItem: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.glass.background,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}15`,
  },
  emojiText: {
    fontSize: 24,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  counterButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.glass.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    minWidth: 40,
    textAlign: 'center',
  },
  toggleCard: {
    marginBottom: 24,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  toggleDesc: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  previewCard: {
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  iconPreviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconPreviewItem: {
    alignItems: 'center',
    gap: 6,
    width: 60,
  },
  iconPreviewName: {
    fontSize: 11,
    color: Colors.text.muted,
  },
  createButton: {
    marginTop: 8,
  },
});
