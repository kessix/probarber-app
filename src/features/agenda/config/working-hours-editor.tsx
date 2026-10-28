import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Stepper, ToggleRow } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { formatMinutes } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useRemote } from '@/lib/use-remote';

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const STEP = 30;

type Day = { open: boolean; start: number; end: number; lunch: boolean; lunchStart: number; lunchEnd: number };

type Row = {
  weekday: number;
  start_min: number;
  lunch_start_min: number | null;
  lunch_end_min: number | null;
  end_min: number;
};

// Ao abrir um dia pela primeira vez: 09:00 às 18:00, almoço das 12:00 às 13:00.
const NEW_DAY: Day = { open: false, start: 540, end: 1080, lunch: false, lunchStart: 720, lunchEnd: 780 };

function fromRows(rows: Row[]): Day[] {
  return WEEKDAYS.map((_, weekday) => {
    const row = rows.find((r) => r.weekday === weekday);
    if (!row) return { ...NEW_DAY };
    return {
      open: true,
      start: row.start_min,
      end: row.end_min,
      lunch: row.lunch_start_min !== null && row.lunch_end_min !== null,
      lunchStart: row.lunch_start_min ?? NEW_DAY.lunchStart,
      lunchEnd: row.lunch_end_min ?? NEW_DAY.lunchEnd,
    };
  });
}

function summary(day: Day) {
  if (!day.open) return 'Fechado';
  const base = `${formatMinutes(day.start)} às ${formatMinutes(day.end)}`;
  return day.lunch ? `${base} · almoço ${formatMinutes(day.lunchStart)} às ${formatMinutes(day.lunchEnd)}` : base;
}

/** Dias da semana com início, almoço e fim do atendimento. Salva todos juntos, no botão. */
export function WorkingHoursEditor({ professionalId }: { professionalId: string }) {
  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('working_hours')
      .select('weekday, start_min, lunch_start_min, lunch_end_min, end_min')
      .eq('professional_id', professionalId)
      .returns<Row[]>();
    if (error) throw error;
    return data;
  }, [professionalId]);
  const { data, error, reload } = useRemote(load);

  const saved = useMemo(() => (data ? fromRows(data) : null), [data]);
  const [edited, setEdited] = useState<Day[] | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  if (error) return <AppText variant="caption">Não foi possível carregar os horários. Volte e abra de novo.</AppText>;
  if (!saved) return <AppText variant="caption">Carregando…</AppText>;

  const days = edited ?? saved;
  const dirty = edited !== null;

  function change(weekday: number, patch: Partial<Day>) {
    setEdited(days.map((d, i) => (i === weekday ? { ...d, ...patch } : d)));
  }

  function copyToAll(weekday: number) {
    const source = days[weekday];
    setEdited(days.map((d) => (d.open ? { ...source } : d)));
  }

  async function save() {
    if (!days.some((d) => d.open)) {
      Alert.alert('Nenhum dia aberto', 'Deixe pelo menos um dia da semana aberto para receber agendamentos.');
      return;
    }
    setSaving(true);
    const open = days.flatMap((d, weekday) =>
      d.open
        ? [
            {
              professional_id: professionalId,
              weekday,
              start_min: d.start,
              lunch_start_min: d.lunch ? d.lunchStart : null,
              lunch_end_min: d.lunch ? d.lunchEnd : null,
              end_min: d.end,
            },
          ]
        : [],
    );
    const closed = days.flatMap((d, weekday) => (d.open ? [] : [weekday]));

    // Grava os dias abertos primeiro; só então remove os fechados (nunca fica sem horário no meio).
    const upsert = await supabase.from('working_hours').upsert(open, { onConflict: 'professional_id,weekday' });
    const remove = closed.length
      ? await supabase.from('working_hours').delete().eq('professional_id', professionalId).in('weekday', closed)
      : null;
    setSaving(false);

    if (upsert.error || remove?.error) {
      Alert.alert('Não foi possível salvar os horários', 'Tente de novo.');
      return;
    }
    setEdited(null);
    reload();
  }

  return (
    <View style={{ gap: Spacing.two }}>
      {days.map((day, weekday) => {
        const isOpen = expanded === weekday;
        return (
          <Card key={weekday} style={{ gap: Spacing.three }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setExpanded(isOpen ? null : weekday)}
              style={styles.header}>
              <View style={{ flex: 1 }}>
                <AppText variant="title">{WEEKDAYS[weekday]}</AppText>
                <AppText variant="caption" style={!day.open && { color: Colors.muted }}>
                  {summary(day)}
                </AppText>
              </View>
              <AppText variant="caption" gold>
                {isOpen ? 'Fechar' : 'Editar'}
              </AppText>
            </Pressable>

            {isOpen ? (
              <View style={{ gap: Spacing.three }}>
                <ToggleRow label="Atende neste dia" value={day.open} onValueChange={(open) => change(weekday, { open })} />

                {day.open ? (
                  <>
                    <Stepper
                      label="Início"
                      value={day.start}
                      min={0}
                      max={(day.lunch ? day.lunchStart : day.end) - STEP}
                      step={STEP}
                      format={formatMinutes}
                      onChange={(start) => change(weekday, { start })}
                    />
                    <ToggleRow label="Intervalo de almoço" value={day.lunch} onValueChange={(lunch) => change(weekday, { lunch })} />
                    {day.lunch ? (
                      <>
                        <Stepper
                          label="Sai para o almoço"
                          value={day.lunchStart}
                          min={day.start + STEP}
                          max={day.lunchEnd - STEP}
                          step={STEP}
                          format={formatMinutes}
                          onChange={(lunchStart) => change(weekday, { lunchStart })}
                        />
                        <Stepper
                          label="Volta do almoço"
                          value={day.lunchEnd}
                          min={day.lunchStart + STEP}
                          max={day.end - STEP}
                          step={STEP}
                          format={formatMinutes}
                          onChange={(lunchEnd) => change(weekday, { lunchEnd })}
                        />
                      </>
                    ) : null}
                    <Stepper
                      label="Fim"
                      value={day.end}
                      min={(day.lunch ? day.lunchEnd : day.start) + STEP}
                      max={1440}
                      step={STEP}
                      format={formatMinutes}
                      onChange={(end) => change(weekday, { end })}
                    />
                    <Button variant="ghost" label="Copiar para os outros dias abertos" onPress={() => copyToAll(weekday)} />
                  </>
                ) : null}
              </View>
            ) : null}
          </Card>
        );
      })}

      <Button
        label={saving ? 'Salvando…' : dirty ? 'Salvar horários' : 'Horários salvos'}
        disabled={!dirty || saving}
        onPress={save}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
});
