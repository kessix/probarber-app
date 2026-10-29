import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Card, Screen } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useShop } from '@/features/account/account-context';
import { useAgenda } from '@/features/agenda/agenda-context';
import { IntervalPicker } from '@/features/agenda/config/interval-picker';
import { ServicesPicker } from '@/features/agenda/config/services-picker';
import { TimeOffEditor } from '@/features/agenda/config/time-off-editor';
import { WindowStepper } from '@/features/agenda/config/window-stepper';
import { WorkingHoursEditor } from '@/features/agenda/config/working-hours-editor';
import { BOOKING_MODES } from '@/features/agenda/types';
import { useProfessional } from '@/features/agenda/use-professional';

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <AppText variant="label">{title}</AppText>
      {hint ? <AppText variant="caption">{hint}</AppText> : null}
      {children}
    </View>
  );
}

export default function ConfiguracaoAgendaScreen() {
  const { settings, setBookingMode } = useAgenda();
  const shop = useShop();
  const { data: professional, error, reload } = useProfessional(shop.id);
  const withPayment = settings.bookingMode !== 'comum';

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View>
          <AppText variant="label">Agenda</AppText>
          <AppText variant="display">Configuração</AppText>
        </View>

        {error ? (
          <AppText variant="caption">Não foi possível carregar a agenda. Volte e abra de novo.</AppText>
        ) : !professional ? (
          <AppText variant="caption">Carregando…</AppText>
        ) : (
          <>
            <Section
              title="Horário de atendimento"
              hint="Toque em um dia para ajustar o início, o almoço e o fim. Dias fechados não recebem agendamentos.">
              <WorkingHoursEditor professionalId={professional.id} />
            </Section>

            <Section title="Intervalo entre horários" hint="De quanto em quanto tempo começa um horário na agenda.">
              <IntervalPicker
                professionalId={professional.id}
                value={professional.slotIntervalMinutes}
                onChanged={reload}
              />
            </Section>

            <Section title="Fechar dias ou horários">
              <TimeOffEditor professionalId={professional.id} />
            </Section>

            <Section title="Agenda aberta para os clientes">
              <WindowStepper />
            </Section>

            <Section title="Serviços que você atende" hint="Só os serviços marcados aparecem para o cliente agendar.">
              <ServicesPicker shopId={shop.id} professionalId={professional.id} />
            </Section>
          </>
        )}

        <Section title="Como o cliente paga">
          {BOOKING_MODES.map((mode) => {
            const on = settings.bookingMode === mode.id;
            return (
              <Pressable
                key={mode.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => setBookingMode(mode.id)}>
                <Card selected={on} style={styles.option}>
                  <Ionicons
                    name={on ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={on ? Colors.gold : Colors.muted}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="title">{mode.title}</AppText>
                    <AppText variant="caption">{mode.description}</AppText>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </Section>

        {withPayment ? (
          <Section title="Pagamento online">
            <Card style={styles.pix}>
              <Ionicons name="qr-code-outline" size={22} color={Colors.gold} />
              <View style={{ flex: 1 }}>
                <AppText variant="title">Pix</AppText>
                <AppText variant="caption">Por enquanto, o pagamento online é feito somente por Pix.</AppText>
              </View>
            </Card>
          </Section>
        ) : null}

        <AppText variant="caption" style={styles.note}>
          As mudanças valem para os novos agendamentos. Os que já estão marcados continuam como foram feitos.
        </AppText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.four },
  group: { gap: Spacing.two },
  option: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  pix: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  note: { textAlign: 'center' },
});
