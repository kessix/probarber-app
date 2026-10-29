import { Ionicons } from '@expo/vector-icons';
import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Photo, Screen, TextField } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useAccount, useShop } from '@/features/account/account-context';
import { IntervalPicker } from '@/features/agenda/config/interval-picker';
import { WindowStepper } from '@/features/agenda/config/window-stepper';
import { WorkingHoursEditor } from '@/features/agenda/config/working-hours-editor';
import { useProfessional } from '@/features/agenda/use-professional';
import { formatBRL } from '@/lib/format';
import { maskPhone } from '@/lib/money';
import { SITE_URL } from '@/lib/slug';
import { supabase } from '@/lib/supabase';
import { pickAndUploadImage } from '@/lib/upload';
import { useRemote } from '@/lib/use-remote';

type Step = 'agenda' | 'servicos' | 'marca' | 'pronto';
const STEPS: Step[] = ['agenda', 'servicos', 'marca', 'pronto'];

// Sugestões para começar rápido; o barbeiro ajusta preço e duração depois.
const SUGGESTIONS = [
  { name: 'Corte', price_cents: 4500, duration_minutes: 40 },
  { name: 'Barba', price_cents: 3500, duration_minutes: 30 },
  { name: 'Corte + barba', price_cents: 7000, duration_minutes: 70 },
];

type Service = { id: string; name: string; price_cents: number; duration_minutes: number; photo_url: string | null };

/** Passo a passo depois de criar a barbearia: horário de atendimento, serviços e o link pronto para divulgar. */
export default function ConfiguracaoInicialScreen() {
  const [step, setStep] = useState<Step>('agenda');
  const number = STEPS.indexOf(step) + 2; // o passo 1 (nome e link) é o cadastro

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View>
          <AppText variant="label">Passo {number} de 5</AppText>
          <AppText variant="display">
            {step === 'agenda'
              ? 'Seu horário'
              : step === 'servicos'
                ? 'Seus serviços'
                : step === 'marca'
                  ? 'Sua marca'
                  : 'Tudo pronto!'}
          </AppText>
        </View>

        {step === 'agenda' ? <AgendaStep onNext={() => setStep('servicos')} /> : null}
        {step === 'servicos' ? <ServicesStep onNext={() => setStep('marca')} /> : null}
        {step === 'marca' ? <BrandStep onNext={() => setStep('pronto')} /> : null}
        {step === 'pronto' ? <DoneStep /> : null}
      </ScrollView>
    </Screen>
  );
}

function AgendaStep({ onNext }: { onNext: () => void }) {
  const shop = useShop();
  const { data: professional, error, reload } = useProfessional(shop.id);

  return (
    <>
      <AppText variant="body" muted>
        Já deixamos de segunda a sábado, das 09:00 às 18:00, com almoço das 12:00 às 13:00. Ajuste do seu jeito; você
        pode mudar tudo depois em Recursos. Se mexer nos dias, toque em Salvar horários antes de continuar.
      </AppText>

      {error ? (
        <AppText variant="caption">Não foi possível carregar a agenda. Feche e abra o app de novo.</AppText>
      ) : !professional ? (
        <AppText variant="caption">Carregando…</AppText>
      ) : (
        <>
          <View style={styles.group}>
            <AppText variant="label">Dias e horários</AppText>
            <WorkingHoursEditor professionalId={professional.id} />
          </View>
          <View style={styles.group}>
            <AppText variant="label">Intervalo entre horários</AppText>
            <IntervalPicker
              professionalId={professional.id}
              value={professional.slotIntervalMinutes}
              onChanged={reload}
            />
          </View>
          <View style={styles.group}>
            <AppText variant="label">Agenda aberta para os clientes</AppText>
            <WindowStepper />
          </View>
          <Button label="Continuar" onPress={onNext} />
        </>
      )}
    </>
  );
}

function ServicesStep({ onNext }: { onNext: () => void }) {
  const shop = useShop();
  const { finishOnboarding } = useAccount();
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('services')
      .select('id, name, price_cents, duration_minutes, photo_url')
      .eq('barbershop_id', shop.id)
      .order('sort_order')
      .order('created_at')
      .returns<Service[]>();
    if (error) throw error;
    return data;
  }, [shop.id]);
  const { data: services, error, reload } = useRemote(load);

  // Ao voltar do cadastro de um serviço, a lista se atualiza.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  async function addSuggestions() {
    setBusy(true);
    const { error: err } = await supabase
      .from('services')
      .insert(SUGGESTIONS.map((s) => ({ ...s, barbershop_id: shop.id })));
    setBusy(false);
    if (err) Alert.alert('Não foi possível adicionar', 'Tente de novo.');
    else reload();
  }

  async function finish() {
    setBusy(true);
    await finishOnboarding();
    setBusy(false);
    onNext();
  }

  const hasServices = (services?.length ?? 0) > 0;

  return (
    <>
      <AppText variant="body" muted>
        São os serviços que seu cliente escolhe ao agendar. Comece com o básico; foto e preço por dia da semana você
        ajusta depois em Serviços.
      </AppText>

      {error ? (
        <AppText variant="caption">Não foi possível carregar os serviços. Tente de novo.</AppText>
      ) : !services ? (
        <AppText variant="caption">Carregando…</AppText>
      ) : (
        <>
          {services.map((s) => (
            <Card key={s.id} style={styles.row}>
              <Photo uri={s.photo_url} icon="cut-outline" />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="title">{s.name}</AppText>
                <AppText variant="caption">
                  {s.duration_minutes} min · {formatBRL(s.price_cents / 100)}
                </AppText>
              </View>
            </Card>
          ))}

          {!hasServices ? (
            <Button
              label={busy ? 'Adicionando…' : 'Usar sugestões: Corte, Barba e Corte + barba'}
              disabled={busy}
              onPress={addSuggestions}
            />
          ) : null}
          <Link href="/servicos/novo" asChild>
            <Button variant={hasServices ? 'primary' : 'ghost'} label="Adicionar serviço" onPress={() => undefined} />
          </Link>
          {hasServices ? (
            <Button variant="ghost" label={busy ? 'Concluindo…' : 'Concluir'} disabled={busy} onPress={finish} />
          ) : (
            <Button variant="ghost" label="Fazer isso depois" disabled={busy} onPress={finish} />
          )}
        </>
      )}
    </>
  );
}

function BrandStep({ onNext }: { onNext: () => void }) {
  const shop = useShop();
  const { updateShop } = useAccount();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState(maskPhone(shop.phone ?? ''));
  const [address, setAddress] = useState(shop.address ?? '');
  const phoneDigits = phone.replace(/\D/g, '');

  async function changeLogo() {
    setUploading(true);
    const url = await pickAndUploadImage({ shopId: shop.id, name: 'logo', aspect: [1, 1], width: 600 });
    if (url) await updateShop({ logoUrl: url });
    setUploading(false);
  }

  async function next() {
    if (phoneDigits && (phoneDigits.length < 10 || phoneDigits.length > 11)) {
      return Alert.alert('Telefone inválido', 'Digite o DDD e o número, como (11) 91234-5678.');
    }
    const patch = { phone: phoneDigits || null, address: address.trim() || null };
    if (patch.phone !== shop.phone || patch.address !== shop.address) {
      setSaving(true);
      const ok = await updateShop(patch);
      setSaving(false);
      if (!ok) return;
    }
    onNext();
  }

  return (
    <>
      <AppText variant="body" muted>
        A logo e os contatos aparecem no topo do seu link de agendamento. Tudo aqui é opcional e dá para mudar depois em
        Configurações.
      </AppText>

      <Pressable accessibilityRole="button" onPress={changeLogo} disabled={uploading} style={styles.row}>
        <Photo uri={shop.logoUrl} size={88} icon="storefront-outline" rounded />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="title">{uploading ? 'Enviando…' : shop.logoUrl ? 'Trocar logo' : 'Adicionar logo'}</AppText>
          <AppText variant="caption">Escolha uma imagem da galeria (até 2 MB).</AppText>
        </View>
      </Pressable>

      <TextField
        label="Telefone / WhatsApp"
        value={phone}
        onChangeText={(t) => setPhone(maskPhone(t))}
        keyboardType="phone-pad"
        placeholder="Exemplo: (11) 91234-5678"
      />
      <TextField
        label="Endereço"
        value={address}
        onChangeText={setAddress}
        placeholder="Exemplo: Rua das Flores, 120 - Centro"
        maxLength={200}
      />

      <Button label={saving ? 'Salvando…' : 'Continuar'} disabled={saving || uploading} onPress={next} />
      <Button variant="ghost" label="Pular" disabled={saving || uploading} onPress={onNext} />
    </>
  );
}

function DoneStep() {
  const shop = useShop();
  const url = `${SITE_URL}/${shop.slug}`;
  return (
    <>
      <AppText variant="body" muted>
        Sua agenda está no ar. Divulgue o link na bio do Instagram e no WhatsApp: o cliente agenda sozinho.
      </AppText>
      <Card selected style={styles.row}>
        <Ionicons name="link-outline" size={22} color={Colors.gold} />
        <AppText variant="title" style={{ flex: 1 }} selectable>
          {url}
        </AppText>
      </Card>
      <Button
        label="Compartilhar link"
        onPress={() => Share.share({ message: `Agende seu horário na ${shop.name}: ${url}` })}
      />
      <AppText variant="caption">
        Em Configurações você completa o cadastro com Instagram, Facebook e avaliações do Google. Em Recursos, define como o cliente paga.
      </AppText>
      <Button variant="ghost" label="Abrir minha agenda" onPress={() => router.replace('/')} />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingTop: Spacing.five, paddingBottom: Spacing.five, gap: Spacing.four },
  group: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
});
