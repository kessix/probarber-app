import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type Variant = 'display' | 'title' | 'body' | 'caption' | 'label';

export function AppText({
  variant = 'body',
  gold,
  muted,
  style,
  ...rest
}: TextProps & { variant?: Variant; gold?: boolean; muted?: boolean }) {
  return (
    <Text
      style={[textStyles[variant], gold && { color: Colors.gold }, muted && { color: Colors.muted }, style]}
      {...rest}
    />
  );
}

export function Screen({
  children,
  edges = ['top'],
  style,
}: {
  children: ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView edges={edges} style={[styles.screen, style]}>
      {children}
    </SafeAreaView>
  );
}

export function Card({
  children,
  selected,
  style,
}: {
  children: ReactNode;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, selected && styles.cardSelected, style]}>{children}</View>;
}

export function Pill({
  label,
  tone = 'gold',
}: {
  label: string;
  tone?: 'gold' | 'green' | 'muted';
}) {
  const color = tone === 'green' ? Colors.green : tone === 'muted' ? Colors.muted : Colors.gold;
  const bg = tone === 'green' ? Colors.greenSoft : tone === 'muted' ? Colors.bg3 : Colors.goldSoft;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonGhost,
        pressed && { opacity: 0.8 },
      ]}>
      <Text style={[styles.buttonText, { color: primary ? '#1a1206' : Colors.gold }]}>{label}</Text>
    </Pressable>
  );
}

const textStyles = StyleSheet.create({
  display: { fontFamily: Fonts.serif, fontSize: 30, lineHeight: 36, color: Colors.fg },
  title: { fontFamily: Fonts.semibold, fontSize: 17, lineHeight: 24, color: Colors.fg },
  body: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 21, color: Colors.fg },
  caption: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 17, color: Colors.muted },
  label: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: Colors.gold,
  },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  card: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.three,
  },
  cardSelected: { borderColor: Colors.gold, backgroundColor: Colors.bg3 },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  pillText: { fontFamily: Fonts.medium, fontSize: 11 },
  button: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: { backgroundColor: Colors.gold },
  buttonGhost: { borderWidth: 1, borderColor: Colors.border },
  buttonText: { fontFamily: Fonts.semibold, fontSize: 13 },
});
