import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Card, SafeArea } from '../components/ui';
import Colors from '../constants/colors';
import { Punishment } from '../types/database';

type RootStackParamList = {
  PunishmentResult: { punishment: Punishment; recordId: string; aiReason?: string };
  GuessAuthor: { punishment: Punishment; recordId: string };
  RoundTable: undefined;
};

export function PunishmentResultScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'PunishmentResult'>>();
  const { punishment, recordId, aiReason } = route.params;

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleComplete = () => {
    navigation.navigate('GuessAuthor', { punishment, recordId });
  };

  const handleSkipGuess = () => {
    navigation.navigate('RoundTable');
  };

  return (
    <SafeArea>
      <View style={styles.content}>
        {/* Result Card */}
        <Animated.View
          style={[
            styles.resultContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <FontAwesome name="bolt" size={48} color={Colors.warning} />
          </View>

          <Text style={styles.resultLabel}>你的惩罚是</Text>

          <Card variant="strong" style={styles.punishmentCard}>
            <Text style={styles.punishmentTitle}>{punishment.title}</Text>
            {punishment.description && (
              <Text style={styles.punishmentDesc}>{punishment.description}</Text>
            )}
          </Card>

          {aiReason && (
            <Animated.View style={[styles.aiReasonContainer, { opacity: fadeAnim }]}>
              <View style={styles.aiHeader}>
                <FontAwesome name="magic" size={14} color={Colors.info} />
                <Text style={styles.aiLabel}>AI 推荐理由</Text>
              </View>
              <Text style={styles.aiReason}>{aiReason}</Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* Actions */}
        <Animated.View style={[styles.actions, { opacity: fadeAnim }]}>
          <Button
            title="完成惩罚并猜作者"
            onPress={handleComplete}
            icon={<FontAwesome name="question" size={14} color="#fff" />}
            style={styles.primaryButton}
          />

          <Button
            title="跳过猜作者"
            variant="ghost"
            onPress={handleSkipGuess}
          />
        </Animated.View>
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  resultContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${Colors.warning}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  resultLabel: {
    fontSize: 16,
    color: Colors.text.tertiary,
    marginBottom: 16,
  },
  punishmentCard: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 32,
  },
  punishmentTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 32,
  },
  punishmentDesc: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 12,
  },
  aiReasonContainer: {
    width: '100%',
    marginTop: 24,
    backgroundColor: Colors.glass.background,
    borderRadius: 16,
    padding: 16,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  aiLabel: {
    fontSize: 13,
    color: Colors.info,
    fontWeight: '600',
  },
  aiReason: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    marginBottom: 8,
  },
});
