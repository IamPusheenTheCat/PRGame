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
import { Button, Card, MemberAvatar, SafeArea } from '../components/ui';
import Colors from '../constants/colors';
import { useAuthStore } from '../stores/authStore';
import { useGroupStore } from '../stores/groupStore';

type RootStackParamList = {
  LateSelection: undefined;
  PunishmentRoll: { lateUserId: string; lateUserName: string };
  RoundTable: undefined;
};

export function LateSelectionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuthStore();
  const { members, punishments } = useGroupStore();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const getMemberPunishmentCount = (memberId: string) => {
    return punishments.filter((p) => p.target_id === memberId && !p.is_used).length;
  };

  const handleContinue = () => {
    if (!selectedUserId) {
      Alert.alert('提示', '请选择迟到的成员');
      return;
    }

    const selectedMember = members.find((m) => m.user?.id === selectedUserId);
    if (!selectedMember?.user) return;

    const punishmentCount = getMemberPunishmentCount(selectedUserId);
    if (punishmentCount === 0) {
      Alert.alert('提示', '该成员没有可用的惩罚项目');
      return;
    }

    navigation.navigate('PunishmentRoll', {
      lateUserId: selectedUserId,
      lateUserName: selectedMember.user.name,
    });
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
          <Text style={styles.headerTitle}>选择迟到者</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>谁迟到了？</Text>
          <Text style={styles.subtitle}>选择今天迟到的成员开始惩罚轮盘</Text>
        </View>

        {/* Members List */}
        <View style={styles.membersContainer}>
          {members.map((member, index) => {
            const memberUser = member.user;
            if (!memberUser) return null;

            const punishmentCount = getMemberPunishmentCount(memberUser.id);
            const isSelected = selectedUserId === memberUser.id;
            const hasNoPunishments = punishmentCount === 0;

            return (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.memberCard,
                  isSelected && styles.memberCardSelected,
                  hasNoPunishments && styles.memberCardDisabled,
                ]}
                onPress={() => !hasNoPunishments && setSelectedUserId(memberUser.id)}
                disabled={hasNoPunishments}
              >
                <MemberAvatar
                  name={memberUser.name}
                  id={memberUser.id}
                  size="lg"
                  gradientIndex={index}
                />
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, hasNoPunishments && styles.memberNameDisabled]}>
                    {memberUser.name}
                  </Text>
                  <Text style={[styles.memberPunishments, hasNoPunishments && styles.memberPunishmentsDisabled]}>
                    {hasNoPunishments ? '无可用惩罚' : `${punishmentCount} 个惩罚待抽`}
                  </Text>
                </View>
                {isSelected ? (
                  <View style={styles.checkmark}>
                    <FontAwesome name="check" size={14} color="#fff" />
                  </View>
                ) : (
                  <View style={styles.radioOuter}>
                    {!hasNoPunishments && <View style={styles.radioInner} />}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Continue Button */}
        <Button
          title="开始惩罚轮盘"
          onPress={handleContinue}
          disabled={!selectedUserId}
          icon={<FontAwesome name="random" size={14} color="#fff" />}
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
  titleSection: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.text.tertiary,
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
  memberCardDisabled: {
    opacity: 0.5,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  memberNameDisabled: {
    color: Colors.text.muted,
  },
  memberPunishments: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  memberPunishmentsDisabled: {
    color: Colors.text.disabled,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.glass.backgroundStrong,
  },
  continueButton: {
    marginTop: 8,
  },
});
