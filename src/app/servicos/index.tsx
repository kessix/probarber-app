import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Photo, Pill, Screen } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useShop } from '@/features/account/account-context';
import { formatBRL } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useRemote } from '@/lib/use-remote';

type Service = {
  id: string;
  name: string;
  price_cents: number;
  duration_minutes: number;
  active: boolean;
  photo_url: string | null;
};

export default function ServicosScreen() {
  const shop = useShop();
  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('services')
      .select('id, name, price_cents, duration_minutes, active, photo_url')
      .eq('barbershop_id', shop.id)
      .order('sort_order')
      .order('created_at')
      .returns<Service[]>();
    if (error) throw error;
    return data;
  }, [shop.id]);
  const { data: services, error, reload } = useRemote(load);

  // Ao voltar da edição, a lista se atualiza.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View>
          <AppText variant="label">Catálogo</AppText>
          <AppText variant="display">Serviços</AppText>
          <AppText variant="body" muted>
            É a lista que seus clientes veem ao agendar, com foto, duração e preço.
          </AppText>
        </View>

        <Link href="/servicos/novo" asChild>
          <Button label="Novo serviço" onPress={() => undefined} />
        </Link>

        {error ? (
          <AppText variant="caption">Não foi possível carregar os serviços. Puxe para tentar de novo.</AppText>
        ) : !services ? (
          <AppText variant="caption">Carregando…</AppText>
        ) : services.length === 0 ? (
          <Card style={{ gap: Spacing.two }}>
            <AppText variant="title">Nenhum serviço ainda</AppText>
            <AppText variant="caption">Cadastre o primeiro para seus clientes poderem agendar.</AppText>
          </Card>
        ) : (
          <View style={{ gap: Spacing.two }}>
            {services.map((s) => (
              <Link key={s.id} href={{ pathname: '/servicos/[id]', params: { id: s.id } }} asChild>
                <Pressable accessibilityRole="button">
                  <Card style={[styles.row, !s.active && { opacity: 0.55 }]}>
                    <Photo uri={s.photo_url} icon="cut-outline" />
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText variant="title">{s.name}</AppText>
                      <AppText variant="caption">
                        {s.duration_minutes} min · {formatBRL(s.price_cents / 100)}
                      </AppText>
                      {!s.active ? <Pill tone="muted" label="Desativado" /> : null}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
                  </Card>
                </Pressable>
              </Link>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.four },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
});
