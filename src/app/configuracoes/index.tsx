import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Card, Screen } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';

type Item = {
  href: '/configuracoes/barbearia' | '/configuracoes/bloqueados' | '/configuracoes/conta';
  title: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>['name'];
};

const ITEMS: Item[] = [
  {
    href: '/configuracoes/barbearia',
    title: 'Dados da barbearia',
    description: 'Logo, nome, link, telefone, endereço e redes sociais.',
    icon: 'storefront-outline',
  },
  {
    href: '/configuracoes/bloqueados',
    title: 'Clientes bloqueados',
    description: 'Quem não pode mais agendar com você.',
    icon: 'ban-outline',
  },
  {
    href: '/configuracoes/conta',
    title: 'Informações da conta',
    description: 'Seu e-mail de acesso e sair da conta.',
    icon: 'person-circle-outline',
  },
];

export default function ConfiguracoesScreen() {
  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View>
          <AppText variant="label">Menu</AppText>
          <AppText variant="display">Configurações</AppText>
        </View>
        {ITEMS.map((item) => (
          <Link key={item.href} href={item.href} asChild>
            <Pressable accessibilityRole="button">
              <Card style={styles.row}>
                <View style={styles.icon}>
                  <Ionicons name={item.icon} size={22} color={Colors.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="title">{item.title}</AppText>
                  <AppText variant="caption">{item.description}</AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
              </Card>
            </Pressable>
          </Link>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three },
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
