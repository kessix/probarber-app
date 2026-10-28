import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Photo, Screen, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAccount, useShop } from '@/features/account/account-context';
import { maskPhone } from '@/lib/money';
import { SITE_URL, slugError, slugify } from '@/lib/slug';
import { supabase } from '@/lib/supabase';
import { pickAndUploadImage } from '@/lib/upload';

const host = SITE_URL.replace('https://', '');

/** Cadastro básico da barbearia e dados de contato que aparecem para o cliente. */
export default function DadosBarbeariaScreen() {
  const shop = useShop();
  const { updateShop } = useAccount();

  const [name, setName] = useState(shop.name);
  const [slug, setSlug] = useState(shop.slug);
  const [phone, setPhone] = useState(maskPhone(shop.phone ?? ''));
  const [address, setAddress] = useState(shop.address ?? '');
  const [instagram, setInstagram] = useState(shop.instagram ?? '');
  const [facebook, setFacebook] = useState(shop.facebook ?? '');
  const [google, setGoogle] = useState(shop.googleReviewUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const slugProblem = slug ? slugError(slug) : null;
  const phoneDigits = phone.replace(/\D/g, '');

  async function changeLogo() {
    setUploading(true);
    const url = await pickAndUploadImage({ shopId: shop.id, name: 'logo', aspect: [1, 1], width: 600 });
    if (url) await updateShop({ logoUrl: url });
    setUploading(false);
  }

  async function save() {
    if (name.trim().length < 2) return Alert.alert('Falta o nome', 'Digite o nome da barbearia.');
    if (slugProblem || !slug) return Alert.alert('Endereço do link inválido', slugProblem ?? 'Digite o endereço do link.');
    if (phoneDigits && (phoneDigits.length < 10 || phoneDigits.length > 11)) {
      return Alert.alert('Telefone inválido', 'Digite o DDD e o número, como (11) 91234-5678.');
    }

    if (slug !== shop.slug) {
      const { data } = await supabase.from('barbershops').select('id').eq('slug', slug).maybeSingle();
      if (data) return Alert.alert('Endereço em uso', 'Já existe uma barbearia com esse endereço. Escolha outro.');
      const proceed = await new Promise<boolean>((resolve) =>
        Alert.alert(
          'Trocar o endereço do link?',
          `O link antigo (${host}/${shop.slug}) deixa de funcionar. Quem salvou ou divulgou o link precisa receber o novo.`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Trocar', onPress: () => resolve(true) },
          ],
        ),
      );
      if (!proceed) return;
    }

    setSaving(true);
    const ok = await updateShop({
      name: name.trim(),
      slug,
      phone: phoneDigits || null,
      address: address.trim() || null,
      instagram: instagram.trim() || null,
      facebook: facebook.trim() || null,
      googleReviewUrl: google.trim() || null,
    });
    setSaving(false);
    if (ok) router.back();
  }

  return (
    <Screen edges={[]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable accessibilityRole="button" onPress={changeLogo} disabled={uploading} style={styles.logoRow}>
            <Photo uri={shop.logoUrl} size={88} icon="storefront-outline" rounded />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="title">{uploading ? 'Enviando…' : shop.logoUrl ? 'Trocar logo' : 'Adicionar logo'}</AppText>
              <AppText variant="caption">A logo aparece no topo da página de agendamento dos seus clientes.</AppText>
            </View>
          </Pressable>

          <View style={styles.group}>
            <AppText variant="label">Cadastro</AppText>
            <TextField label="Nome da barbearia" value={name} onChangeText={setName} autoCapitalize="words" maxLength={80} />
            <TextField
              label="Endereço do link"
              value={slug}
              onChangeText={(t) => setSlug(slugify(t))}
              autoCapitalize="none"
              autoCorrect={false}
              error={slugProblem}
              hint={`${host}/${slug || 'seu-endereco'}`}
            />
          </View>

          <View style={styles.group}>
            <AppText variant="label">Contato</AppText>
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
          </View>

          <View style={styles.group}>
            <AppText variant="label">Redes sociais</AppText>
            <TextField
              label="Instagram"
              value={instagram}
              onChangeText={setInstagram}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Exemplo: @doisirmaosbarber"
            />
            <TextField
              label="Facebook"
              value={facebook}
              onChangeText={setFacebook}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Exemplo: facebook.com/doisirmaos"
            />
            <TextField
              label="Avaliações do Google"
              value={google}
              onChangeText={setGoogle}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="Link da sua página de avaliações no Google"
              hint="No Google Maps, abra sua barbearia, toque em Compartilhar e cole o link aqui."
            />
          </View>

          <Button label={saving ? 'Salvando…' : 'Salvar'} disabled={saving || uploading} onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.four },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  group: { gap: Spacing.three },
});
