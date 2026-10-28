import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Screen } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAccount } from '@/features/account/account-context';
import { RECURSOS, type Recurso } from '@/features/recursos';

function RecursoRow({ recurso }: { recurso: Recurso }) {
  return (
    <Link href={recurso.href ?? { pathname: '/recurso/[id]', params: { id: recurso.id } }} asChild>
      <Pressable accessibilityRole="button">
        <Card style={styles.row}>
          <View style={styles.icon}>
            <Ionicons name={recurso.icon} size={22} color={Colors.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="title">{recurso.title}</AppText>
            <AppText variant="caption">{recurso.description}</AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
        </Card>
      </Pressable>
    </Link>
  );
}

export default function RecursosScreen() {
  const { account, signOut } = useAccount();
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View>
          <AppText variant="label">Menu</AppText>
          <AppText variant="display">Recursos</AppText>
        </View>

        <Link href="/agenda/configuracao" asChild>
          <Pressable accessibilityRole="button">
            <Card selected style={styles.featured}>
              <View style={styles.icon}>
                <Ionicons name="calendar-outline" size={24} color={Colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="title">Configuração da agenda</AppText>
                <AppText variant="caption">
                  Defina como seus clientes agendam e pagam: comum, com pagamento obrigatório ou opcional.
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
            </Card>
          </Pressable>
        </Link>

        <View style={styles.list}>
          {RECURSOS.map((r) => (
            <RecursoRow key={r.id} recurso={r} />
          ))}
        </View>

        <View style={styles.account}>
          {account.status === 'ready' ? (
            <AppText variant="caption" style={{ textAlign: 'center' }}>
              {account.shop.name} · {account.email}
            </AppText>
          ) : null}
          <Button variant="ghost" label="Sair da conta" onPress={signOut} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three },
  featured: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  list: { gap: Spacing.two },
  account: { gap: Spacing.two, marginTop: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  icon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
