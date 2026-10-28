import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Screen } from '@/components/ui';
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

type View_ = 'dia' | 'pendencias';

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
  const { appointments, settings, refresh } = useAgenda();
  const [refreshing, setRefreshing] = useState(false);
  const today = useMemo(() => startOfToday(), []);
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), [today]);
  const [selected, setSelected] = useState(toDateKey(today));
  const [view, setView] = useState<View_>('dia');

  const withPayments = settings.bookingMode !== 'comum';
  const active = appointments.filter((a) => a.status !== 'cancelado');
  const pending = active.filter((a) => a.payment.status === 'pendente').sort(byDateTime);
  const dayList = appointments.filter((a) => a.date === selected).sort(byDateTime);
  const dayActive = dayList.filter((a) => a.status !== 'cancelado');

  const received = dayActive
    .filter((a) => a.payment.status === 'pago')
    .reduce((sum, a) => sum + a.price, 0);
  const toReceive = dayActive
    .filter((a) => a.payment.status === 'pendente')
    .reduce((sum, a) => sum + a.price, 0);
  const expected = dayActive.reduce((sum, a) => sum + a.price, 0);

  const list = view === 'dia' ? dayList : pending;
  const selectedDate = fromDateKey(selected);

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
            <AppText variant="display">
              {view === 'dia' ? (selected === toDateKey(today) ? 'Hoje' : 'Dia selecionado') : 'Pendências'}
            </AppText>
            <AppText variant="caption">
              {view === 'dia' ? formatDayLong(selectedDate) : 'Pagamentos a receber na barbearia'}
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
          {withPayments || pending.length > 0 ? (
            <Pressable
              onPress={() => setView('pendencias')}
              style={[styles.segmentItem, view === 'pendencias' && styles.segmentOn]}>
              <AppText
                variant="body"
                style={[styles.segmentText, view === 'pendencias' && styles.segmentTextOn]}>
                Pendências ({pending.length})
              </AppText>
            </Pressable>
          ) : null}
        </View>

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
              {withPayments ? (
                <>
                  <Stat label="Recebido" value={formatBRL(received)} />
                  <Stat label="A receber" value={formatBRL(toReceive)} />
                </>
              ) : (
                <Stat label="Previsto" value={formatBRL(expected)} />
              )}
            </View>
          </>
        ) : null}

        <View style={styles.list}>
          {list.length === 0 ? (
            <AppText variant="body" muted style={styles.empty}>
              {view === 'dia' ? 'Nenhum agendamento neste dia.' : 'Nenhuma pendência. Tudo recebido!'}
            </AppText>
          ) : (
            list.map((a) => (
              <AppointmentCard
                key={a.id}
                appointment={a}
                dateLabel={view === 'pendencias' ? formatDayShort(fromDateKey(a.date)) : undefined}
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
