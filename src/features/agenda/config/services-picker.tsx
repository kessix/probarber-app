import { Link } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';

import { AppText, Button, Card, ToggleRow } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useRemote } from '@/lib/use-remote';

type Item = { id: string; name: string; active: boolean; attended: boolean };

/** Marca quais serviços o profissional atende. Sem nenhum serviço, leva a cadastrar. */
export function ServicesPicker({ shopId, professionalId }: { shopId: string; professionalId: string }) {
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (): Promise<Item[]> => {
    const [services, links] = await Promise.all([
      supabase
        .from('services')
        .select('id, name, active')
        .eq('barbershop_id', shopId)
        .order('sort_order')
        .order('created_at')
        .returns<{ id: string; name: string; active: boolean }[]>(),
      supabase
        .from('service_professionals')
        .select('service_id')
        .eq('professional_id', professionalId)
        .returns<{ service_id: string }[]>(),
    ]);
    if (services.error) throw services.error;
    if (links.error) throw links.error;
    const attended = new Set(links.data.map((l) => l.service_id));
    return services.data.map((s) => ({ ...s, attended: attended.has(s.id) }));
  }, [shopId, professionalId]);
  const { data: items, error, reload } = useRemote(load);

  async function toggle(item: Item) {
    setBusy(true);
    const result = item.attended
      ? await supabase.from('service_professionals').delete().eq('service_id', item.id).eq('professional_id', professionalId)
      : await supabase.from('service_professionals').insert({ service_id: item.id, professional_id: professionalId });
    setBusy(false);
    if (result.error) Alert.alert('Não foi possível salvar', 'Tente de novo.');
    else reload();
  }

  if (error) return <AppText variant="caption">Não foi possível carregar os serviços.</AppText>;
  if (!items) return <AppText variant="caption">Carregando…</AppText>;

  if (items.length === 0) {
    return (
      <Card selected style={{ gap: Spacing.three }}>
        <AppText variant="title">Você ainda não tem serviços</AppText>
        <AppText variant="caption">
          Cadastre os serviços que você faz, com preço e duração, para os clientes poderem agendar. Depois volte aqui
          e marque quais você atende.
        </AppText>
        <Link href="/servicos/novo" asChild>
          <Button label="Cadastrar serviços" onPress={() => undefined} />
        </Link>
      </Card>
    );
  }

  const none = items.every((i) => !i.attended);
  return (
    <View style={{ gap: Spacing.two }}>
      <Card style={{ gap: Spacing.three }}>
        {items.map((item) => (
          <ToggleRow
            key={item.id}
            label={item.name}
            hint={item.active ? undefined : 'Serviço desativado'}
            value={item.attended}
            disabled={busy}
            onValueChange={() => void toggle(item)}
          />
        ))}
      </Card>
      {none ? (
        <AppText variant="caption" style={{ color: '#e0746b' }}>
          Nenhum serviço marcado: seus clientes não conseguem agendar até você marcar pelo menos um.
        </AppText>
      ) : null}
      <Link href="/servicos" asChild>
        <Button variant="ghost" label="Gerenciar catálogo de serviços" onPress={() => undefined} />
      </Link>
    </View>
  );
}
