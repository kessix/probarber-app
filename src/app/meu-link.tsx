import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Share, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Screen } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useShop } from '@/features/account/account-context';
import { SITE_URL } from '@/lib/slug';

export default function MeuLinkScreen() {
  const shop = useShop();
  const url = `${SITE_URL}/${shop.slug}`;

  return (
    <Screen edges={[]}>
      <View style={styles.content}>
        <View>
          <AppText variant="label">Meu link</AppText>
          <AppText variant="display">Divulgue e receba agendamentos</AppText>
          <AppText variant="body" muted>
            Coloque este link na bio do Instagram e envie no WhatsApp. O cliente agenda sozinho.
          </AppText>
        </View>

        <Card selected style={styles.linkCard}>
          <Ionicons name="link-outline" size={22} color={Colors.gold} />
          <AppText variant="title" style={{ flex: 1 }} selectable>
            {url}
          </AppText>
        </Card>

        <Button
          label="Compartilhar link"
          onPress={() => Share.share({ message: `Agende seu horário na ${shop.name}: ${url}` })}
        />
        <Button variant="ghost" label="Alterar link" onPress={() => router.push('/alterar-link')} />

        <AppText variant="caption">
          O link começa a funcionar imediatamente.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.four },
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
});
