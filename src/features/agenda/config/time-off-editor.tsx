import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Chip } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { addDays, startOfToday, toDateKey, weekdayInitial } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useRemote } from '@/lib/use-remote';

const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const DAYS_SHOWN = 14; // é o máximo que a agenda pode ficar aberta

/** Fechar a agenda em dias específicos (folga, feriado). Cada toque grava na hora. */
export function TimeOffEditor({ professionalId }: { professionalId: string }) {
  const today = useMemo(() => startOfToday(), []);
  const days = useMemo(() => Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(today, i)), [today]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('time_off')
      .select('starts_on, ends_on')
      .eq('professional_id', professionalId)
      .gte('ends_on', toDateKey(today))
      .returns<{ starts_on: string; ends_on: string }[]>();
    if (error) throw error;
    // Só dias avulsos podem ser reabertos por aqui; períodos longos criados em outro lugar aparecem fechados.
    return new Set(data.filter((r) => r.starts_on === r.ends_on).map((r) => r.starts_on));
  }, [professionalId, today]);
  const { data: closed, error, reload } = useRemote(load);

  async function toggle(key: string, isClosed: boolean) {
    setBusy(key);
    const result = isClosed
      ? await supabase.from('time_off').delete().eq('professional_id', professionalId).eq('starts_on', key).eq('ends_on', key)
      : await supabase.from('time_off').insert({ professional_id: professionalId, starts_on: key, ends_on: key });
    setBusy(null);
    if (result.error) Alert.alert('Não foi possível salvar', 'Tente de novo.');
    else reload();
  }

  if (error) return <AppText variant="caption">Não foi possível carregar os dias fechados.</AppText>;
  if (!closed) return <AppText variant="caption">Carregando…</AppText>;

  return (
    <View style={{ gap: Spacing.two }}>
      <View style={styles.grid}>
        {days.map((d) => {
          const key = toDateKey(d);
          const isClosed = closed.has(key);
          return (
            <Chip
              key={key}
              selected={isClosed}
              onPress={() => (busy ? undefined : void toggle(key, isClosed))}
              label={`${WEEKDAYS_SHORT[d.getDay()] ?? weekdayInitial(d)} ${d.getDate()}${isClosed ? ' ✕' : ''}`}
            />
          );
        })}
      </View>
      <AppText variant="caption">
        Toque nos dias em que você não vai atender. Eles ficam marcados com ✕ e somem da agenda dos clientes.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
