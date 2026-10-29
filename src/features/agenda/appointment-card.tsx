import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Pill } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { formatBRL } from '@/lib/format';

import { useAgenda } from './agenda-context';
import { PAYMENT_METHOD_LABEL, type Appointment, type PaymentMethod } from './types';

const RECEIVE_METHODS: PaymentMethod[] = ['pix', 'dinheiro', 'cartao'];

function PaymentBadge({ payment }: { payment: Appointment['payment'] }) {
  if (payment.status === 'pago') {
    const where = payment.online ? 'no app' : 'na barbearia';
    return <Pill tone="green" label={`Pago ${where} · ${PAYMENT_METHOD_LABEL[payment.method]}`} />;
  }
  if (payment.status === 'pendente') {
    return <Pill label={payment.online ? 'Aguardando Pix' : 'Pagar na barbearia'} />;
  }
  return null;
}

export function AppointmentCard({
  appointment,
  dateLabel,
}: {
  appointment: Appointment;
  /** Mostrado na visão de pendências, onde os dias se misturam. */
  dateLabel?: string;
}) {
  const { completeAppointment, cancelAppointment, registerPayment, blockClient } = useAgenda();
  const [open, setOpen] = useState(false);
  const { status, payment } = appointment;
  const cancelled = status === 'cancelado';
  const canAct = !cancelled && (status === 'agendado' || payment.status === 'pendente');

  return (
    <Card style={cancelled && { opacity: 0.5 }}>
      <Pressable
        accessibilityRole="button"
        onPress={() => canAct && setOpen((v) => !v)}
        style={styles.row}>
        <View style={styles.timeCol}>
          <AppText variant="title" gold>
            {appointment.time}
          </AppText>
          {dateLabel ? <AppText variant="caption">{dateLabel}</AppText> : null}
        </View>
        <View style={styles.info}>
          <AppText variant="title">{appointment.clientName}</AppText>
          <AppText variant="caption">{appointment.service}</AppText>
          <View style={styles.badges}>
            {status === 'concluido' ? <Pill tone="muted" label="Concluído" /> : null}
            {cancelled ? <Pill tone="muted" label="Cancelado" /> : null}
            {!cancelled ? <PaymentBadge payment={payment} /> : null}
          </View>
        </View>
        <AppText variant="title">{formatBRL(appointment.price)}</AppText>
      </Pressable>

      {open && canAct ? (
        <View style={styles.actions}>
          {payment.status === 'pendente' ? (
            <View style={styles.receive}>
              <AppText variant="label">Receber como</AppText>
              <View style={styles.methods}>
                {RECEIVE_METHODS.map((m) => (
                  <View key={m} style={styles.method}>
                    <Button
                      variant="ghost"
                      label={PAYMENT_METHOD_LABEL[m]}
                      onPress={() => {
                        registerPayment(appointment.id, m);
                        setOpen(false);
                      }}
                    />
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {status === 'agendado' ? (
            <View style={styles.methods}>
              <View style={styles.method}>
                <Button
                  label="Concluir atendimento"
                  onPress={() => {
                    completeAppointment(appointment.id);
                    setOpen(false);
                  }}
                />
              </View>
              <View style={styles.method}>
                <Button variant="ghost" label="Cancelar" onPress={() => cancelAppointment(appointment.id)} />
              </View>
            </View>
          ) : null}
          {appointment.clientId ? (
            <Button
              variant="ghost"
              label="Bloquear cliente"
              onPress={() =>
                Alert.alert(
                  `Bloquear ${appointment.clientName}?`,
                  'Ele não vai mais conseguir agendar pelo seu link. Você pode desbloquear depois em Configurações. Os agendamentos já marcados continuam.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Bloquear',
                      style: 'destructive',
                      onPress: async () => {
                        if (await blockClient(appointment.clientId!)) {
                          Alert.alert('Cliente bloqueado', 'Ele não pode mais agendar pelo seu link.');
                          setOpen(false);
                        }
                      },
                    },
                  ],
                )
              }
            />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  timeCol: { width: 56 },
  info: { flex: 1, gap: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  actions: {
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  receive: { gap: Spacing.two },
  methods: { flexDirection: 'row', gap: Spacing.two },
  method: { flex: 1 },
});
