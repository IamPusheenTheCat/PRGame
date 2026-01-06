import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, SafeArea } from '../components/ui';
import Colors from '../constants/colors';

type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
};

export function WelcomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const floatAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  const features = [
    { icon: 'users', label: '组队' },
    { icon: 'pencil', label: '设置' },
    { icon: 'random', label: '抽取' },
    { icon: 'check', label: '执行' },
  ];

  return (
    <SafeArea>
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            { transform: [{ translateY: floatAnim }] },
          ]}
        >
          <View style={styles.outerRing} />
          <View style={styles.innerRing} />
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.logo}
          >
            <FontAwesome name="cube" size={42} color="#fff" />
          </LinearGradient>
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>惩罚轮盘</Text>
        <Text style={styles.subtitle}>Punishment Roulette</Text>
        <Text style={styles.tagline}>
          让迟到变得有趣{'\n'}让惩罚充满惊喜
        </Text>

        {/* Features */}
        <View style={styles.features}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <FontAwesome
                  name={feature.icon as any}
                  size={20}
                  color="rgba(255,255,255,0.7)"
                />
              </View>
              <Text style={styles.featureLabel}>{feature.label}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <Button
          title="开始游戏"
          onPress={() => navigation.navigate('Login')}
          size="lg"
          icon={<FontAwesome name="arrow-right" size={14} color="#fff" />}
          style={styles.button}
        />

        {/* Version */}
        <Text style={styles.version}>VERSION 1.0.0</Text>
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 40,
  },
  outerRing: {
    position: 'absolute',
    top: -32,
    left: -32,
    right: -32,
    bottom: -32,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: `${Colors.primary}20`,
  },
  innerRing: {
    position: 'absolute',
    top: -16,
    left: -16,
    right: -16,
    bottom: -16,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.text.muted,
    fontWeight: '500',
    letterSpacing: 1,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 14,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 56,
  },
  features: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 64,
  },
  featureItem: {
    alignItems: 'center',
    gap: 10,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.glass.background,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    fontSize: 11,
    color: Colors.text.muted,
    fontWeight: '500',
  },
  button: {
    width: '100%',
    maxWidth: 280,
  },
  version: {
    fontSize: 11,
    color: Colors.text.disabled,
    marginTop: 40,
    letterSpacing: 2,
  },
});
