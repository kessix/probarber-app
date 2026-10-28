import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
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

export function TextField({
  label,
  hint,
  error,
  ...input
}: TextInputProps & { label: string; hint?: string; error?: string | null }) {
  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        placeholderTextColor={Colors.muted}
        selectionColor={Colors.gold}
        style={[styles.input, error ? { borderColor: Colors.red } : null]}
        {...input}
      />
      {error ? (
        <AppText variant="caption" style={{ color: Colors.red }}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption">{hint}</AppText>
      ) : null}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonGhost,
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.8 },
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
  field: { gap: 6 },
  input: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.fg,
    backgroundColor: Colors.bg2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 13,
  },
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
