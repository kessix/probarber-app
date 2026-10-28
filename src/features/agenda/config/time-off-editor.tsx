import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Chip, Stepper, ToggleRow } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { addDays, formatDayShort, formatMinutes, fromDateKey, startOfToday, toDateKey } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useRemote } from '@/lib/use-remote';

const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const DAYS_SHOWN = 14; // é o máximo que a agenda pode ficar aberta
const STEP = 30;

type Block = { id: string; startsOn: string; endsOn: string; startMin: number | null; endMin: number | null };

type Row = { id: string; starts_on: string; ends_on: string; start_min: number | null; end_min: number | null };

function describe(b: Block) {
  const first = formatDayShort(fromDateKey(b.startsOn));
  const day = b.endsOn === b.startsOn ? first : `${first} a ${formatDayShort(fromDateKey(b.endsOn))}`;
  return b.startMin === null || b.endMin === null
    ? { day, when: 'Dia inteiro' }
    : { day, when: `${formatMinutes(b.startMin)} às ${formatMinutes(b.endMin)}` };
}

/** Fechar a agenda por dia inteiro ou só por alguns horários (folga, feriado, compromisso). */
export function TimeOffEditor({ professionalId }: { professionalId: string }) {
  const today = useMemo(() => startOfToday(), []);
  const days = useMemo(() => Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(today, i)), [today]);

  const [adding, setAdding] = useState(false);
  const [dayKey, setDayKey] = useState(() => toDateKey(today));
  const [wholeDay, setWholeDay] = useState(true);
  const [start, setStart] = useState(14 * 60);
  const [end, setEnd] = useState(16 * 60);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('time_off')
      .select('id, starts_on, ends_on, start_min, end_min')
      .eq('professional_id', professionalId)
      .gte('ends_on', toDateKey(today))
      .order('starts_on')
      .order('start_min', { nullsFirst: true })
      .returns<Row[]>();
    if (error) throw error;
    return data.map((r): Block => ({ id: r.id, startsOn: r.starts_on, endsOn: r.ends_on, startMin: r.start_min, endMin: r.end_min }));
  }, [professionalId, today]);
  const { data: blocks, error, reload } = useRemote(load);

  async function add() {
    setBusy(true);
    const result = await supabase.from('time_off').insert({
      professional_id: professionalId,
      starts_on: dayKey,
      ends_on: dayKey,
      start_min: wholeDay ? null : start,
      end_min: wholeDay ? null : end,
    });
    setBusy(false);
    if (result.error) {
      Alert.alert('Não foi possível salvar', 'Tente de novo.');
      return;
    }
    setAdding(false);
    reload();
  }

  function remove(block: Block) {
    const { day, when } = describe(block);
    Alert.alert('Reabrir a agenda?', `${day} · ${when}`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Reabrir',
        onPress: async () => {
          const result = await supabase.from('time_off').delete().eq('id', block.id);
          if (result.error) Alert.alert('Não foi possível reabrir', 'Tente de novo.');
          else reload();
        },
      },
    ]);
  }

  if (error) return <AppText variant="caption">Não foi possível carregar os fechamentos.</AppText>;
  if (!blocks) return <AppText variant="caption">Carregando…</AppText>;

  return (
    <View style={{ gap: Spacing.two }}>
      {blocks.length === 0 && !adding ? (
        <AppText variant="caption">Nenhum fechamento. Sua agenda segue o horário de atendimento acima.</AppText>
      ) : null}

      {blocks.map((block) => {
        const { day, when } = describe(block);
        return (
          <Card key={block.id} style={styles.blockRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="title">{day}</AppText>
              <AppText variant="caption">{when}</AppText>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Reabrir ${day}`} onPress={() => remove(block)}>
              <AppText variant="caption" style={{ color: Colors.red }}>
                Reabrir
              </AppText>
            </Pressable>
          </Card>
        );
      })}

      {adding ? (
        <Card style={{ gap: Spacing.three }}>
          <AppText variant="title">Novo fechamento</AppText>
          <View style={styles.grid}>
            {days.map((d) => {
              const key = toDateKey(d);
              return (
                <Chip
                  key={key}
                  selected={key === dayKey}
                  onPress={() => setDayKey(key)}
                  label={`${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()}`}
                />
              );
            })}
          </View>
          <ToggleRow label="Dia inteiro" value={wholeDay} onValueChange={setWholeDay} />
          {wholeDay ? null : (
            <>
              <Stepper
                label="Fecha a partir de"
                value={start}
                min={0}
                max={end - STEP}
                step={STEP}
                format={formatMinutes}
                onChange={setStart}
              />
              <Stepper
                label="Reabre às"
                value={end}
                min={start + STEP}
                max={1440}
                step={STEP}
                format={formatMinutes}
                onChange={setEnd}
              />
            </>
          )}
          <Button label={busy ? 'Salvando…' : 'Fechar agenda'} disabled={busy} onPress={add} />
          <Button variant="ghost" label="Cancelar" onPress={() => setAdding(false)} />
        </Card>
      ) : (
        <Button variant="ghost" label="+ Fechar dia ou horário" onPress={() => setAdding(true)} />
      )}

      <AppText variant="caption">
        Feche o dia inteiro ou só alguns horários. Os horários fechados somem da agenda dos clientes; agendamentos já
        marcados não são cancelados.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  blockRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
});
