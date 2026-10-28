import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Photo, Screen, Stepper, TextField, ToggleRow } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useShop } from '@/features/account/account-context';
import { parseReais, reaisInput } from '@/lib/money';
import { supabase } from '@/lib/supabase';
import { pickAndUploadImage } from '@/lib/upload';
import { useRemote } from '@/lib/use-remote';

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

type Form = {
  name: string;
  price: string;
  minutes: number;
  active: boolean;
  photoUrl: string | null;
  /** Preço de cada dia da semana (vazio = vale o preço padrão). */
  dayPrices: string[];
};

const EMPTY: Form = { name: '', price: '', minutes: 40, active: true, photoUrl: null, dayPrices: Array(7).fill('') };

export default function ServicoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const shop = useShop();
  const isNew = id === 'novo';

  const load = useCallback(async (): Promise<Form> => {
    if (isNew) return EMPTY;
    const [service, prices] = await Promise.all([
      supabase
        .from('services')
        .select('name, price_cents, duration_minutes, active, photo_url')
        .eq('id', id)
        .eq('barbershop_id', shop.id)
        .single(),
      supabase
        .from('service_day_prices')
        .select('weekday, price_cents')
        .eq('service_id', id)
        .returns<{ weekday: number; price_cents: number }[]>(),
    ]);
    if (service.error) throw service.error;
    if (prices.error) throw prices.error;
    const dayPrices = Array<string>(7).fill('');
    for (const p of prices.data) dayPrices[p.weekday] = reaisInput(p.price_cents);
    return {
      name: service.data.name,
      price: reaisInput(service.data.price_cents),
      minutes: service.data.duration_minutes,
      active: service.data.active,
      photoUrl: service.data.photo_url,
      dayPrices,
    };
  }, [id, isNew, shop.id]);
  const { data: initial, error } = useRemote(load);

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: isNew ? 'Novo serviço' : 'Editar serviço' }} />
      {error ? (
        <AppText variant="caption" style={{ padding: Spacing.three }}>
          Não foi possível carregar este serviço.
        </AppText>
      ) : !initial ? (
        <AppText variant="caption" style={{ padding: Spacing.three }}>
          Carregando…
        </AppText>
      ) : (
        <ServiceForm shopId={shop.id} serviceId={isNew ? null : id} initial={initial} />
      )}
    </Screen>
  );
}

function ServiceForm({ shopId, serviceId, initial }: { shopId: string; serviceId: string | null; initial: Form }) {
  const [form, setForm] = useState<Form>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  async function pickPhoto() {
    setUploading(true);
    const url = await pickAndUploadImage({ shopId, name: 'services/foto', aspect: [4, 3], width: 900 });
    setUploading(false);
    if (url) set({ photoUrl: url });
  }

  async function save() {
    const name = form.name.trim();
    const cents = parseReais(form.price);
    if (name.length < 2) return Alert.alert('Falta o nome', 'Dê um nome ao serviço, como "Corte".');
    if (cents === null) return Alert.alert('Preço inválido', 'Digite o preço em reais, como 45,00.');

    const dayRows: { weekday: number; price_cents: number }[] = [];
    for (let weekday = 0; weekday < 7; weekday++) {
      const text = form.dayPrices[weekday].trim();
      if (!text) continue;
      const value = parseReais(text);
      if (value === null) return Alert.alert('Preço inválido', `Confira o preço de ${WEEKDAYS[weekday]}.`);
      dayRows.push({ weekday, price_cents: value });
    }

    setSaving(true);
    const fields = {
      name,
      price_cents: cents,
      duration_minutes: form.minutes,
      active: form.active,
      photo_url: form.photoUrl,
    };
    let id = serviceId;
    if (id) {
      const { error } = await supabase.from('services').update(fields).eq('id', id);
      if (error) return fail();
    } else {
      const { data, error } = await supabase
        .from('services')
        .insert({ ...fields, barbershop_id: shopId })
        .select('id')
        .single();
      if (error || !data) return fail();
      id = data.id;
    }

    // Preços por dia: grava os preenchidos e remove os que ficaram vazios.
    if (dayRows.length) {
      const { error } = await supabase
        .from('service_day_prices')
        .upsert(dayRows.map((r) => ({ ...r, service_id: id })), { onConflict: 'service_id,weekday' });
      if (error) return fail();
    }
    const cleared = [0, 1, 2, 3, 4, 5, 6].filter((d) => !dayRows.some((r) => r.weekday === d));
    const { error: clearError } = await supabase
      .from('service_day_prices')
      .delete()
      .eq('service_id', id)
      .in('weekday', cleared);
    if (clearError) return fail();

    setSaving(false);
    router.back();

    function fail() {
      setSaving(false);
      Alert.alert('Não foi possível salvar', 'Verifique a internet e tente de novo.');
    }
  }

  function confirmDelete() {
    if (!serviceId) return;
    Alert.alert(
      'Excluir serviço?',
      'Os agendamentos já feitos continuam na agenda. Se preferir só esconder dos clientes, desative o serviço.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('services').delete().eq('id', serviceId);
            if (error) Alert.alert('Não foi possível excluir', 'Tente de novo.');
            else router.back();
          },
        },
      ],
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" onPress={pickPhoto} disabled={uploading} style={styles.photoRow}>
          <Photo uri={form.photoUrl} size={96} icon="camera-outline" />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="title">{uploading ? 'Enviando…' : form.photoUrl ? 'Trocar foto' : 'Adicionar foto'}</AppText>
            <AppText variant="caption">A foto aparece no catálogo que o cliente vê ao agendar.</AppText>
          </View>
        </Pressable>

        <TextField label="Nome" value={form.name} onChangeText={(name) => set({ name })} placeholder="Exemplo: Corte + barba" maxLength={60} />
        <TextField
          label="Preço padrão (R$)"
          value={form.price}
          onChangeText={(price) => set({ price })}
          keyboardType="decimal-pad"
          placeholder="Exemplo: 45,00"
        />

        <Card>
          <Stepper
            label="Duração"
            value={form.minutes}
            min={5}
            max={480}
            step={5}
            format={(m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}min` : ''}` : `${m} min`)}
            onChange={(minutes) => set({ minutes })}
          />
        </Card>

        <View style={{ gap: Spacing.two }}>
          <AppText variant="label">Preço por dia da semana</AppText>
          <AppText variant="caption">
            Opcional. Preencha só os dias em que o preço muda. Os vazios usam o preço padrão.
          </AppText>
          <Card style={{ gap: Spacing.three }}>
            {WEEKDAYS.map((label, weekday) => (
              <View key={label} style={styles.dayRow}>
                <AppText variant="body" style={{ flex: 1 }}>
                  {label}
                </AppText>
                <View style={{ width: 130 }}>
                  <TextField
                    label=""
                    value={form.dayPrices[weekday]}
                    onChangeText={(text) => set({ dayPrices: form.dayPrices.map((p, i) => (i === weekday ? text : p)) })}
                    keyboardType="decimal-pad"
                    placeholder={form.price ? `Padrão ${form.price}` : 'Padrão'}
                  />
                </View>
              </View>
            ))}
          </Card>
        </View>

        <Card>
          <ToggleRow
            label="Serviço ativo"
            hint="Desativado, ele some do catálogo dos clientes."
            value={form.active}
            onValueChange={(active) => set({ active })}
          />
        </Card>

        <Button label={saving ? 'Salvando…' : 'Salvar serviço'} disabled={saving || uploading} onPress={save} />
        {serviceId ? <Button variant="ghost" label="Excluir serviço" onPress={confirmDelete} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.four },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
