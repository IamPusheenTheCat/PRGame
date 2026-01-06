import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import Colors from '../../constants/colors';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'strong' | 'highlight';
  highlightColor?: string;
  style?: ViewStyle;
  blurEnabled?: boolean;
}

export function Card({
  children,
  variant = 'default',
  highlightColor,
  style,
  blurEnabled = false,
}: CardProps) {
  const containerStyle = [
    styles.container,
    variant === 'strong' && styles.strong,
    highlightColor && {
      borderColor: highlightColor,
      backgroundColor: `${highlightColor}10`,
    },
    style,
  ];

  if (blurEnabled) {
    return (
      <BlurView intensity={20} tint="dark" style={containerStyle}>
        {children}
      </BlurView>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.glass.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    padding: 16,
  },
  strong: {
    backgroundColor: Colors.glass.backgroundStrong,
    borderColor: Colors.border.default,
  },
});

