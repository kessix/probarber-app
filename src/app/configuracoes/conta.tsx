import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAccount } from '@/features/account/account-context';
import { SITE_URL } from '@/lib/slug';

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <AppText variant="label">{label}</AppText>
      <AppText variant="body" selectable>
        {value}
      </AppText>
    </View>
  );
}

export default function ContaScreen() {
  const { account, signOut } = useAccount();
  if (account.status !== 'ready') return null;

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <AppText variant="label">Configurações</AppText>
          <AppText variant="display">Informações da conta</AppText>
        </View>

        <Card style={{ gap: Spacing.four }}>
          <Info label="E-mail de acesso" value={account.email} />
          <Info label="Barbearia" value={account.shop.name} />
          <Info label="Seu link de agendamento" value={`${SITE_URL.replace('https://', '')}/${account.shop.slug}`} />
        </Card>

        <AppText variant="caption">
          Você entra no app com o código enviado para este e-mail, sem senha.
        </AppText>

        <Button variant="ghost" label="Sair da conta" onPress={signOut} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.four },
});
