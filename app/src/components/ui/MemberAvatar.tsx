import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { getDisplayName, getAvatarGradientIndex } from '../../lib/utils';

interface MemberAvatarProps {
  name: string;
  id?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  gradientIndex?: number;
  status?: 'completed' | 'pending' | 'you' | 'admin';
  showBadge?: boolean;
  style?: ViewStyle;
}

const SIZES = {
  xs: { container: 20, font: 8, badge: 10, badgeFont: 6 },
  sm: { container: 44, font: 13, badge: 18, badgeFont: 8 },
  md: { container: 56, font: 16, badge: 20, badgeFont: 9 },
  lg: { container: 64, font: 18, badge: 22, badgeFont: 10 },
  xl: { container: 80, font: 22, badge: 26, badgeFont: 11 },
};

export function MemberAvatar({
  name,
  id,
  size = 'md',
  gradientIndex,
  status,
  showBadge = true,
  style,
}: MemberAvatarProps) {
  const displayName = getDisplayName(name);
  const colorIndex = gradientIndex ?? (id ? getAvatarGradientIndex(id) : 0);
  const gradient = Colors.avatarGradients[colorIndex % Colors.avatarGradients.length];
  const sizeConfig = SIZES[size];

  const getBorderStyle = () => {
    if (!status) return {};
    switch (status) {
      case 'completed':
        return { borderWidth: 3, borderColor: Colors.success };
      case 'pending':
        return { borderWidth: 3, borderColor: Colors.warning };
      case 'you':
        return { borderWidth: 3, borderColor: Colors.info };
      case 'admin':
        return { borderWidth: 3, borderColor: Colors.warning };
      default:
        return {};
    }
  };

  const renderBadge = () => {
    if (!showBadge || !status) return null;

    let badgeContent: React.ReactNode = null;
    let badgeColor = '';

    switch (status) {
      case 'completed':
        badgeColor = Colors.success;
        badgeContent = <FontAwesome name="check" size={sizeConfig.badgeFont} color="#fff" />;
        break;
      case 'you':
        badgeColor = Colors.info;
        badgeContent = <Text style={[styles.badgeText, { fontSize: sizeConfig.badgeFont }]}>你</Text>;
        break;
      case 'admin':
        badgeColor = Colors.warning;
        badgeContent = <FontAwesome name="star" size={sizeConfig.badgeFont} color="#fff" />;
        break;
      default:
        return null;
    }

    return (
      <View
        style={[
          styles.badge,
          {
            width: sizeConfig.badge,
            height: sizeConfig.badge,
            borderRadius: sizeConfig.badge / 2,
            backgroundColor: badgeColor,
          },
        ]}
      >
        {badgeContent}
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={gradient as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.avatar,
          {
            width: sizeConfig.container,
            height: sizeConfig.container,
            borderRadius: sizeConfig.container / 2,
          },
          getBorderStyle(),
        ]}
      >
        <Text
          style={[
            styles.text,
            { fontSize: sizeConfig.font },
          ]}
          numberOfLines={1}
        >
          {displayName}
        </Text>
      </LinearGradient>
      {renderBadge()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  text: {
    color: '#fff',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background.primary,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
  },
});

