import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Card, Screen } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useAgenda } from '@/features/agenda/agenda-context';
import { BOOKING_MODES } from '@/features/agenda/types';

export default function ConfiguracaoAgendaScreen() {
  const { settings, setBookingMode } = useAgenda();
  const withPayment = settings.bookingMode !== 'comum';

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View>
          <AppText variant="label">Agenda</AppText>
          <AppText variant="display">Como o cliente agenda</AppText>
        </View>

        <View style={styles.group}>
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
        </View>

        {withPayment ? (
          <View style={styles.group}>
            <AppText variant="label">Pagamento online</AppText>
            <Card style={styles.pix}>
              <Ionicons name="qr-code-outline" size={22} color={Colors.gold} />
              <View style={{ flex: 1 }}>
                <AppText variant="title">Pix</AppText>
                <AppText variant="caption">O pagamento online é feito somente por Pix.</AppText>
              </View>
            </Card>
          </View>
        ) : null}

        <AppText variant="caption" style={styles.note}>
          A mudança vale para os novos agendamentos. Os que já estão marcados continuam como foram feitos.
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
