import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Card, Chip, Screen, Stepper } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useAccount, useShop } from '@/features/account/account-context';
import { useAgenda } from '@/features/agenda/agenda-context';
import { ServicesPicker } from '@/features/agenda/config/services-picker';
import { TimeOffEditor } from '@/features/agenda/config/time-off-editor';
import { WorkingHoursEditor } from '@/features/agenda/config/working-hours-editor';
import { BOOKING_MODES } from '@/features/agenda/types';
import { useProfessional } from '@/features/agenda/use-professional';
import { supabase } from '@/lib/supabase';

const MAX_WINDOW_DAYS = 14;
const INTERVALS = [10, 15, 20, 30, 45, 60];

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
  const { updateShop } = useAccount();
  const { data: professional, error, reload } = useProfessional(shop.id);
  const withPayment = settings.bookingMode !== 'comum';

  async function setInterval(minutes: number) {
    if (!professional) return;
    const { error: err } = await supabase
      .from('professionals')
      .update({ slot_interval_minutes: minutes })
      .eq('id', professional.id);
    if (err) Alert.alert('Não foi possível salvar', 'Tente de novo.');
    else reload();
  }

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
              <View style={styles.chips}>
                {INTERVALS.map((minutes) => (
                  <Chip
                    key={minutes}
                    label={`${minutes} min`}
                    selected={professional.slotIntervalMinutes === minutes}
                    onPress={() => void setInterval(minutes)}
                  />
                ))}
              </View>
            </Section>

            <Section title="Fechar a agenda em dias específicos">
              <TimeOffEditor professionalId={professional.id} />
            </Section>

            <Section title="Agenda aberta para os clientes">
              <Card style={{ gap: Spacing.two }}>
                <Stepper
                  label="Dias à frente"
                  value={shop.bookingWindowDays}
                  min={1}
                  max={MAX_WINDOW_DAYS}
                  format={(n) => `${n} ${n === 1 ? 'dia' : 'dias'}`}
                  onChange={(bookingWindowDays) => void updateShop({ bookingWindowDays })}
                />
                <AppText variant="caption">
                  Seus clientes podem agendar de hoje até {shop.bookingWindowDays}{' '}
                  {shop.bookingWindowDays === 1 ? 'dia' : 'dias'} à frente. O máximo é {MAX_WINDOW_DAYS}.
                </AppText>
              </Card>
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  option: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  pix: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  note: { textAlign: 'center' },
});
