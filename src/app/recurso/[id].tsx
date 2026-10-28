import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Screen } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { RECURSOS } from '@/features/recursos';

export default function RecursoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recurso = RECURSOS.find((r) => r.id === id);

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: recurso?.title ?? 'Recurso' }} />
      <View style={styles.center}>
        <View style={styles.icon}>
          <Ionicons name={recurso?.icon ?? 'construct-outline'} size={32} color={Colors.gold} />
        </View>
        <AppText variant="display" style={styles.text}>
          {recurso?.title ?? 'Recurso não encontrado'}
        </AppText>
        {recurso ? (
          <AppText variant="body" muted style={styles.text}>
            {recurso.description}
          </AppText>
        ) : null}
        <AppText variant="label" style={styles.soon}>
          Em breve
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  icon: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    backgroundColor: Colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { textAlign: 'center' },
  soon: { marginTop: Spacing.two },
});
