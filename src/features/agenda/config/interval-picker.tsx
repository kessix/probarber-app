import { Alert, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const INTERVALS = [10, 15, 20, 30, 45, 60];

/** De quanto em quanto tempo começa um horário na agenda. Salva ao tocar. */
export function IntervalPicker({
  professionalId,
  value,
  onChanged,
}: {
  professionalId: string;
  value: number;
  onChanged: () => void;
}) {
  async function choose(minutes: number) {
    const { error } = await supabase
      .from('professionals')
      .update({ slot_interval_minutes: minutes })
      .eq('id', professionalId);
    if (error) Alert.alert('Não foi possível salvar', 'Tente de novo.');
    else onChanged();
  }

  return (
    <View style={styles.chips}>
      {INTERVALS.map((minutes) => (
        <Chip key={minutes} label={`${minutes} min`} selected={value === minutes} onPress={() => void choose(minutes)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
