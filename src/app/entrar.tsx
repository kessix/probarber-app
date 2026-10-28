import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Screen, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function friendly(message: string) {
  const m = message.toLowerCase();
  if (m.includes('rate limit') || m.includes('security purposes')) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  }
  if (m.includes('expired') || m.includes('invalid')) return 'Código inválido ou expirado. Confira ou peça um novo.';
  return 'Não foi possível continuar. Verifique a internet e tente de novo.';
}

/** Entrada e cadastro: e-mail + código numérico (o tamanho vem da configuração do Supabase). Quem ainda não tem conta é criado no primeiro código. */
export default function EntrarScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    const address = email.trim().toLowerCase();
    if (!EMAIL.test(address)) {
      setError('Digite um e-mail válido.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: true } });
    setBusy(false);
    if (err) setError(friendly(err.message));
    else {
      setCode('');
      setSentTo(address);
    }
  }

  async function verify() {
    if (!sentTo) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({ email: sentTo, token: code.trim(), type: 'email' });
    setBusy(false);
    // Com sucesso, a sessão muda e o app troca de tela sozinho.
    if (err) setError(friendly(err.message));
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View>
            <AppText variant="label">ProBarber</AppText>
            <AppText variant="display">{sentTo ? 'Digite o código' : 'Entrar ou criar conta'}</AppText>
            <AppText variant="body" muted>
              {sentTo
                ? `Enviamos um código para ${sentTo}. Digite os números que vieram no e-mail.`
                : 'Use seu e-mail. Enviamos um código para você entrar, sem senha.'}
            </AppText>
          </View>

          {sentTo ? (
            <>
              <TextField
                label="Código"
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 8))}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                placeholder="Código do e-mail"
                error={error}
              />
              <Button label={busy ? 'Verificando…' : 'Entrar'} disabled={busy || code.length < 6} onPress={verify} />
              <Button
                variant="ghost"
                label="Usar outro e-mail"
                disabled={busy}
                onPress={() => {
                  setSentTo(null);
                  setError(null);
                }}
              />
              <Button variant="ghost" label="Reenviar código" disabled={busy} onPress={sendCode} />
            </>
          ) : (
            <>
              <TextField
                label="E-mail"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                placeholder="Exemplo: voce@email.com"
                error={error}
              />
              <Button label={busy ? 'Enviando…' : 'Enviar código'} disabled={busy || email.length < 5} onPress={sendCode} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingTop: Spacing.five, gap: Spacing.four },
});
