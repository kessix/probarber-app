import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Chip, Screen } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useAgenda } from '@/features/agenda/agenda-context';
import { AppointmentCard } from '@/features/agenda/appointment-card';
import type { Appointment } from '@/features/agenda/types';
import {
  addDays,
  formatBRL,
  formatDayLong,
  formatDayShort,
  fromDateKey,
  startOfToday,
  toDateKey,
  weekdayInitial,
} from '@/lib/format';

type View_ = 'dia' | 'pendencias' | 'cancelados';
type PendingFilter = 'hoje' | 'proximos' | 'anteriores';

const byDateTime = (a: Appointment, b: Appointment) =>
  `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`);

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="title" gold>
        {value}
      </AppText>
    </View>
  );
}

export default function AgendaScreen() {
  const { appointments, refresh } = useAgenda();
  const [refreshing, setRefreshing] = useState(false);
  const today = useMemo(() => startOfToday(), []);
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), [today]);
  const [selected, setSelected] = useState(toDateKey(today));
  const [view, setView] = useState<View_>('dia');
  const [pendingFilter, setPendingFilter] = useState<PendingFilter>('hoje');

  const active = appointments.filter((a) => a.status !== 'cancelado');
  const pending = active.filter((a) => a.payment.status === 'pendente').sort(byDateTime);
  const todayKey = toDateKey(today);
  const pendingToday = pending.filter((a) => a.date === todayKey);
  const pendingNext = pending.filter((a) => a.date > todayKey);
  // Atendimentos de dias passados que ainda não foram recebidos.
  const pendingPast = pending.filter((a) => a.date < todayKey).sort((a, b) => byDateTime(b, a));
  const pendingList =
    pendingFilter === 'hoje' ? pendingToday : pendingFilter === 'proximos' ? pendingNext : pendingPast;
  const cancelled = appointments.filter((a) => a.status === 'cancelado').sort((a, b) => byDateTime(b, a));
  const dayActive = appointments.filter((a) => a.date === selected && a.status !== 'cancelado').sort(byDateTime);
  const dayList = dayActive;

  const received = dayActive
    .filter((a) => a.payment.status === 'pago')
    .reduce((sum, a) => sum + a.price, 0);
  const toReceive = dayActive
    .filter((a) => a.payment.status === 'pendente')
    .reduce((sum, a) => sum + a.price, 0);

  const list = view === 'dia' ? dayList : view === 'pendencias' ? pendingList : cancelled;
  const selectedDate = fromDateKey(selected);
  const dayLabel =
    selected === toDateKey(today)
      ? 'Hoje'
      : selected === toDateKey(addDays(today, 1))
        ? 'Amanhã'
        : 'Dia selecionado';

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={Colors.gold}
            onRefresh={async () => {
              setRefreshing(true);
              await refresh();
              setRefreshing(false);
            }}
          />
        }>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <AppText variant="label">Agenda</AppText>
            <AppText variant="display" style={styles.dateTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {view === 'dia' ? formatDayLong(selectedDate) : view === 'pendencias' ? 'Pendências' : 'Cancelados'}
            </AppText>
            <AppText variant="caption">
              {view === 'dia'
                ? dayLabel
                : view === 'pendencias'
                  ? 'Pagamentos a receber na barbearia'
                  : 'Agendamentos cancelados'}
            </AppText>
          </View>
          <Link href="/agenda/configuracao" asChild>
            <Pressable accessibilityLabel="Configuração da agenda" style={styles.iconButton}>
              <Ionicons name="options-outline" size={22} color={Colors.gold} />
            </Pressable>
          </Link>
        </View>

        <View style={styles.segment}>
          <Pressable
            onPress={() => setView('dia')}
            style={[styles.segmentItem, view === 'dia' && styles.segmentOn]}>
            <AppText variant="body" style={[styles.segmentText, view === 'dia' && styles.segmentTextOn]}>
              Dia
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => setView('pendencias')}
            style={[styles.segmentItem, view === 'pendencias' && styles.segmentOn]}>
            <AppText
              variant="body"
              style={[styles.segmentText, view === 'pendencias' && styles.segmentTextOn]}>
              Pendências ({pending.length})
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => setView('cancelados')}
            style={[styles.segmentItem, view === 'cancelados' && styles.segmentOn]}>
            <AppText
              variant="body"
              style={[styles.segmentText, view === 'cancelados' && styles.segmentTextOn]}>
              Cancelados ({cancelled.length})
            </AppText>
          </Pressable>
        </View>

        {view === 'pendencias' ? (
          <View style={styles.filters}>
            <Chip
              label={`Hoje (${pendingToday.length})`}
              selected={pendingFilter === 'hoje'}
              onPress={() => setPendingFilter('hoje')}
            />
            <Chip
              label={`Próximos dias (${pendingNext.length})`}
              selected={pendingFilter === 'proximos'}
              onPress={() => setPendingFilter('proximos')}
            />
            <Chip
              label={`Anteriores (${pendingPast.length})`}
              selected={pendingFilter === 'anteriores'}
              onPress={() => setPendingFilter('anteriores')}
            />
          </View>
        ) : null}

        {view === 'dia' ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.days}>
              {days.map((d) => {
                const key = toDateKey(d);
                const on = key === selected;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    onPress={() => setSelected(key)}
                    style={[styles.day, on && styles.dayOn]}>
                    <AppText variant="caption" style={on && styles.dayTextOn}>
                      {weekdayInitial(d)}
                    </AppText>
                    <AppText variant="title" style={on && styles.dayTextOn}>
                      {d.getDate()}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.stats}>
              <Stat label="Atendimentos" value={String(dayActive.length)} />
              <Stat label="Recebido" value={formatBRL(received)} />
              <Stat label="A receber" value={formatBRL(toReceive)} />
            </View>
          </>
        ) : null}

        <View style={styles.list}>
          {list.length === 0 ? (
            <AppText variant="body" muted style={styles.empty}>
              {view === 'dia'
                ? 'Nenhum agendamento neste dia.'
                : view === 'pendencias'
                  ? pendingFilter === 'hoje'
                    ? 'Nenhuma pendência para hoje.'
                    : pendingFilter === 'proximos'
                      ? 'Nenhuma pendência nos próximos dias.'
                      : 'Nenhuma pendência anterior. Tudo recebido!'
                  : 'Nenhum agendamento cancelado.'}
            </AppText>
          ) : (
            list.map((a) => (
              <AppointmentCard
                key={a.id}
                appointment={a}
                dateLabel={view !== 'dia' ? formatDayShort(fromDateKey(a.date)) : undefined}
              />
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  // Título menor que o padrão (30): a data inteira cabe em uma linha.
  dateTitle: { fontSize: 22, lineHeight: 28 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 3,
  },
  segmentItem: { flex: 1, paddingVertical: 8, borderRadius: Radius.sm, alignItems: 'center' },
  segmentOn: { backgroundColor: Colors.goldSoft },
  segmentText: { fontFamily: Fonts.medium, color: Colors.muted },
  segmentTextOn: { color: Colors.gold },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  days: { gap: Spacing.two },
  day: {
    width: 52,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg2,
  },
  dayOn: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  dayTextOn: { color: '#1a1206' },
  stats: { flexDirection: 'row', gap: Spacing.two },
  stat: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg2,
    gap: 2,
  },
  list: { gap: Spacing.two },
  empty: { textAlign: 'center', paddingVertical: Spacing.five },
});
