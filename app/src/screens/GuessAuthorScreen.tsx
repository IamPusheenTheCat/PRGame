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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Card, MemberAvatar, SafeArea } from '../components/ui';
import Colors from '../constants/colors';
import { useAuthStore } from '../stores/authStore';
import { useGroupStore } from '../stores/groupStore';
import { Punishment } from '../types/database';

type RootStackParamList = {
  GuessAuthor: { punishment: Punishment; recordId: string };
  RoundTable: undefined;
};

export function GuessAuthorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'GuessAuthor'>>();
  const { punishment, recordId } = route.params;

  const { user } = useAuthStore();
  const { members } = useGroupStore();

  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);
  const [hasGuessed, setHasGuessed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // 排除自己，只能从其他成员中猜测
  const otherMembers = members.filter((m) => m.user?.id !== user?.id);

  const handleGuess = () => {
    if (!selectedAuthorId) {
      Alert.alert('提示', '请选择一个猜测的作者');
      return;
    }

    const correct = selectedAuthorId === punishment.author_id;
    setIsCorrect(correct);
    setHasGuessed(true);

    // TODO: 更新记录
  };

  const handleFinish = () => {
    navigation.navigate('RoundTable');
  };

  const getAuthorName = () => {
    const author = members.find((m) => m.user?.id === punishment.author_id);
    return author?.user?.name || '未知';
  };

  if (hasGuessed) {
    return (
      <SafeArea>
        <View style={styles.resultContent}>
          <View style={[styles.resultIcon, isCorrect ? styles.correctIcon : styles.wrongIcon]}>
            <FontAwesome
              name={isCorrect ? 'check' : 'times'}
              size={48}
              color="#fff"
            />
          </View>

          <Text style={styles.resultTitle}>
            {isCorrect ? '猜对了！' : '猜错了~'}
          </Text>

          <Text style={styles.resultSubtitle}>
            {isCorrect
              ? '你果然了解你的队友！'
              : `正确答案是：${getAuthorName()}`}
          </Text>

          <Card style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{isCorrect ? '+10' : '+0'}</Text>
                <Text style={styles.statLabel}>积分</Text>
              </View>
            </View>
          </Card>

          <Button
            title="完成"
            onPress={handleFinish}
            style={styles.finishButton}
          />
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
          <Text style={styles.headerTitle}>猜猜作者</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Question */}
        <View style={styles.questionSection}>
          <Text style={styles.questionEmoji}>🤔</Text>
          <Text style={styles.questionTitle}>你猜是谁写的？</Text>
          <Card style={styles.punishmentPreview}>
            <Text style={styles.previewTitle}>{punishment.title}</Text>
          </Card>
        </View>

        {/* Members List */}
        <View style={styles.membersContainer}>
          {otherMembers.map((member, index) => {
            const memberUser = member.user;
            if (!memberUser) return null;

            const isSelected = selectedAuthorId === memberUser.id;

            return (
              <TouchableOpacity
                key={member.id}
                style={[styles.memberCard, isSelected && styles.memberCardSelected]}
                onPress={() => setSelectedAuthorId(memberUser.id)}
              >
                <MemberAvatar
                  name={memberUser.name}
                  id={memberUser.id}
                  size="md"
                  gradientIndex={index}
                />
                <Text style={styles.memberName}>{memberUser.name}</Text>
                {isSelected ? (
                  <View style={styles.checkmark}>
                    <FontAwesome name="check" size={12} color="#fff" />
                  </View>
                ) : (
                  <View style={styles.radioOuter} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Guess Button */}
        <Button
          title="确认猜测"
          onPress={handleGuess}
          disabled={!selectedAuthorId}
          icon={<FontAwesome name="question" size={14} color="#fff" />}
          style={styles.guessButton}
        />

        {/* Skip */}
        <Button
          title="不猜了，直接完成"
          variant="ghost"
          onPress={handleFinish}
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
  questionSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  questionEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  questionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
  },
  punishmentPreview: {
    width: '100%',
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    textAlign: 'center',
  },
  membersContainer: {
    gap: 12,
    marginBottom: 32,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glass.background,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 16,
    gap: 16,
  },
  memberCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}15`,
  },
  memberName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border.default,
  },
  guessButton: {
    marginBottom: 12,
  },
  // Result styles
  resultContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  resultIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  correctIcon: {
    backgroundColor: Colors.success,
  },
  wrongIcon: {
    backgroundColor: Colors.danger,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  resultSubtitle: {
    fontSize: 16,
    color: Colors.text.tertiary,
    marginBottom: 32,
    textAlign: 'center',
  },
  statsCard: {
    width: '100%',
    marginBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.success,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.text.muted,
    marginTop: 4,
  },
  finishButton: {
    width: '100%',
  },
});
