import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
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
      {label ? <AppText variant="label">{label}</AppText> : null}
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

/** Ajuste de número com - e +. `format` mostra o valor (ex.: "09:00"). */
export function Stepper({
  label,
  value,
  min,
  max,
  step: size = 1,
  format = String,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  /** De quanto em quanto o valor muda a cada toque. */
  step?: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const step = (delta: number) => onChange(Math.min(max, Math.max(min, value + delta * size)));
  return (
    <View style={styles.stepperRow}>
      <AppText variant="body" style={{ flex: 1 }}>
        {label}
      </AppText>
      <Pressable
        accessibilityLabel={`Diminuir ${label}`}
        disabled={value - size < min}
        onPress={() => step(-1)}
        style={[styles.stepperButton, value - size < min && { opacity: 0.35 }]}>
        <Text style={styles.stepperSign}>−</Text>
      </Pressable>
      <Text style={styles.stepperValue}>{format(value)}</Text>
      <Pressable
        accessibilityLabel={`Aumentar ${label}`}
        disabled={value + size > max}
        onPress={() => step(1)}
        style={[styles.stepperButton, value + size > max && { opacity: 0.35 }]}>
        <Text style={styles.stepperSign}>+</Text>
      </Pressable>
    </View>
  );
}

/** Linha com texto e interruptor. */
export function ToggleRow({
  label,
  hint,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.stepperRow}>
      <View style={{ flex: 1 }}>
        <AppText variant="body">{label}</AppText>
        {hint ? <AppText variant="caption">{hint}</AppText> : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ true: Colors.goldDark, false: Colors.bg3 }}
        thumbColor={value ? Colors.gold : Colors.muted}
      />
    </View>
  );
}

/** Botão de opção (selecionada fica dourada). */
export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && { color: '#1a1206' }]}>{label}</Text>
    </Pressable>
  );
}

/** Foto quadrada ou retangular, com ícone quando não há imagem. */
export function Photo({
  uri,
  size = 56,
  icon = 'image-outline',
  rounded = false,
}: {
  uri: string | null | undefined;
  size?: number;
  icon?: keyof typeof Ionicons.glyphMap;
  rounded?: boolean;
}) {
  const radius = rounded ? size / 2 : Radius.md;
  return (
    <View style={[styles.photo, { width: size, height: size, borderRadius: radius }]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" />
      ) : (
        <Ionicons name={icon} size={size * 0.4} color={Colors.muted} />
      )}
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
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperSign: { fontFamily: Fonts.semibold, fontSize: 20, lineHeight: 24, color: Colors.gold },
  stepperValue: { minWidth: 64, textAlign: 'center', fontFamily: Fonts.semibold, fontSize: 15, color: Colors.fg },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg3,
  },
  chipSelected: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  chipText: { fontFamily: Fonts.medium, fontSize: 13, color: Colors.muted },
  photo: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
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
