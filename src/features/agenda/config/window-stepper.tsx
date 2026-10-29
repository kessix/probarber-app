import { AppText, Card, Stepper } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAccount, useShop } from '@/features/account/account-context';

const MAX_WINDOW_DAYS = 14;

/** Quantos dias à frente o cliente pode agendar (1 a 14). Salva ao tocar. */
export function WindowStepper() {
  const shop = useShop();
  const { updateShop } = useAccount();
  const days = shop.bookingWindowDays;
  return (
    <Card style={{ gap: Spacing.two }}>
      <Stepper
        label="Dias à frente"
        value={days}
        min={1}
        max={MAX_WINDOW_DAYS}
        format={(n) => `${n} ${n === 1 ? 'dia' : 'dias'}`}
        onChange={(bookingWindowDays) => void updateShop({ bookingWindowDays })}
      />
      <AppText variant="caption">
        Seus clientes podem agendar de hoje até {days} {days === 1 ? 'dia' : 'dias'} à frente. O máximo é {MAX_WINDOW_DAYS}.
      </AppText>
    </Card>
  );
}
