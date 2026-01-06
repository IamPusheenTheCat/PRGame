import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeArea } from '../components/ui';
import Colors from '../constants/colors';

// 平台安全的 Haptics
const triggerHaptic = async (style: 'light' | 'medium' = 'light') => {
  if (Platform.OS === 'web') return;
  try {
    const Haptics = await import('expo-haptics');
    if (style === 'light') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  } catch (e) {
    // Haptics not available
  }
};

const { width } = Dimensions.get('window');

type RootStackParamList = {
  Onboarding: undefined;
  Welcome: undefined;
};

const ONBOARDING_KEY = 'has_seen_onboarding';
const PUNCTUALITY_KEY = 'user_punctuality'; // 保存用户的守时习惯选择

// 对话内容
const DIALOGUES = {
  greeting: {
    text: '啊，你来啦！\n都等你好久了！',
    emoji: '👋',
  },
  question: {
    text: '准备好今天的乐队排练了吗？\n\n什么，你说总有些迟到的家伙？',
    emoji: '🤔',
  },
  responseYes: {
    text: '别担心，我会帮你\n教训一下那些迟到的家伙！\n\n从今天起，\n让他们付出点代价吧！',
    emoji: '😈',
  },
  responseLate: {
    text: '我懂的，毕竟难免有时候会迟到嘛。\n其实我也经常迟到啦～\n但朋友们等太久会伤心的！\n\n从今天开始，你想养成一个好习惯吗？\n\n我可以帮你把按时排练变成\n没那么难办到的事情！',
    emoji: '🥺',
  },
};

export function OnboardingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [step, setStep] = useState(0);
  const [userChoice, setUserChoice] = useState<'yes' | 'late' | null>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const emojiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 每次 step 变化时播放动画
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    emojiAnim.setValue(0);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(emojiAnim, {
        toValue: 1,
        tension: 40,
        friction: 5,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [step]);

  const handleNext = () => {
    triggerHaptic('light');
    setStep(1);
  };

  const handleChoice = async (choice: 'yes' | 'late') => {
    triggerHaptic('medium');
    setUserChoice(choice);
    // 保存守时习惯选择，供后续注册时使用
    try {
      const punctuality = choice === 'yes' ? 'punctual' : 'late';
      await AsyncStorage.setItem(PUNCTUALITY_KEY, punctuality);
      console.log('[Onboarding] Saved punctuality:', punctuality);
    } catch (e) {
      console.log('[Onboarding] Failed to save punctuality:', e);
    }
    setStep(2);
  };

  const handleFinish = async () => {
    triggerHaptic('light');
    // 标记已看过引导
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (e) {
      console.log('[Onboarding] Failed to save state:', e);
    }
    navigation.replace('Welcome');
  };

  const getCurrentDialogue = () => {
    if (step === 0) return DIALOGUES.greeting;
    if (step === 1) return DIALOGUES.question;
    if (step === 2) {
      return userChoice === 'yes' ? DIALOGUES.responseYes : DIALOGUES.responseLate;
    }
    return DIALOGUES.greeting;
  };

  const dialogue = getCurrentDialogue();

  return (
    <SafeArea>
      {/* Background decoration */}
      <View style={styles.bgDecoration}>
        <View style={[styles.bgCircle, styles.bgCircle1]} />
        <View style={[styles.bgCircle, styles.bgCircle2]} />
        <View style={[styles.bgCircle, styles.bgCircle3]} />
      </View>

      <View style={styles.content}>
        {/* Progress dots */}
        <View style={styles.progressContainer}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                step >= i && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        {/* Main dialogue area */}
        <View style={styles.dialogueContainer}>
          {/* Emoji */}
          <Animated.View
            style={[
              styles.emojiContainer,
              {
                transform: [
                  { scale: emojiAnim },
                  {
                    rotate: emojiAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['-10deg', '0deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.emoji}>{dialogue.emoji}</Text>
          </Animated.View>

          {/* Text bubble */}
          <Animated.View
            style={[
              styles.bubbleContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.bubble}>
              <Text style={styles.dialogueText}>{dialogue.text}</Text>
            </View>
            <View style={styles.bubbleTail} />
          </Animated.View>
        </View>

        {/* Actions */}
        <Animated.View
          style={[
            styles.actions,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          {step === 0 && (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextButtonText}>下一页</Text>
                <FontAwesome name="arrow-right" size={14} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {step === 1 && (
            <View style={styles.choiceContainer}>
              <TouchableOpacity
                style={styles.choiceButton}
                onPress={() => handleChoice('yes')}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  style={styles.choiceButtonGradient}
                >
                  <Text style={styles.choiceButtonText}>是的！</Text>
                  <Text style={styles.choiceEmoji}>😤</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.choiceButton, styles.choiceButtonSecondary]}
                onPress={() => handleChoice('late')}
              >
                <Text style={styles.choiceButtonTextSecondary}>我也会迟到...</Text>
                <Text style={styles.choiceEmoji}>😅</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && (
            <TouchableOpacity style={styles.nextButton} onPress={handleFinish}>
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextButtonText}>开始使用</Text>
                <FontAwesome name="rocket" size={14} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Skip button */}
        {step < 2 && (
          <TouchableOpacity style={styles.skipButton} onPress={handleFinish}>
            <Text style={styles.skipText}>跳过</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  bgDecoration: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.03,
  },
  bgCircle1: {
    width: 400,
    height: 400,
    backgroundColor: Colors.primary,
    top: -100,
    right: -100,
  },
  bgCircle2: {
    width: 300,
    height: 300,
    backgroundColor: Colors.info,
    bottom: 100,
    left: -100,
  },
  bgCircle3: {
    width: 200,
    height: 200,
    backgroundColor: Colors.warning,
    bottom: -50,
    right: 50,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 60,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.glass.backgroundStrong,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  dialogueContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emojiContainer: {
    marginBottom: 32,
  },
  emoji: {
    fontSize: 80,
  },
  bubbleContainer: {
    width: '100%',
    alignItems: 'center',
  },
  bubble: {
    backgroundColor: Colors.glass.backgroundStrong,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    paddingVertical: 28,
    paddingHorizontal: 32,
    maxWidth: 320,
  },
  bubbleTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.glass.backgroundStrong,
    marginTop: -1,
  },
  dialogueText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '500',
  },
  actions: {
    paddingBottom: 24,
  },
  nextButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  choiceContainer: {
    gap: 12,
  },
  choiceButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  choiceButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  choiceButtonSecondary: {
    backgroundColor: Colors.glass.background,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  choiceButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  choiceButtonTextSecondary: {
    fontSize: 17,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  choiceEmoji: {
    fontSize: 20,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  skipText: {
    fontSize: 14,
    color: Colors.text.muted,
  },
});

// 检查是否需要显示引导页
export async function checkShouldShowOnboarding(): Promise<boolean> {
  try {
    const hasSeenOnboarding = await AsyncStorage.getItem(ONBOARDING_KEY);
    return hasSeenOnboarding !== 'true';
  } catch {
    return true;
  }
}
