import { Lexend_400Regular, Lexend_500Medium, Lexend_600SemiBold } from '@expo-google-fonts/lexend';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors, Fonts } from '@/constants/theme';
import { AccountProvider, useAccount } from '@/features/account/account-context';
import { AgendaProvider } from '@/features/agenda/agenda-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Lexend_400Regular,
    Lexend_500Medium,
    Lexend_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  if (!loaded && !error) return null;

  return (
    <AccountProvider>
      <Shell />
    </AccountProvider>
  );
}

/** Escolhe as telas pelo estado da conta: entrar, cadastrar a barbearia ou usar o app. */
function Shell() {
  const { account } = useAccount();
  const status = account.status;

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync();
  }, [status]);

  if (status === 'loading') return null;

  return (
    // Troca de barbearia (ou sair) remonta a agenda e descarta dados da conta anterior.
    <AgendaProvider key={account.status === 'ready' ? account.shop.id : 'none'}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: Colors.bg },
          headerStyle: { backgroundColor: Colors.bg },
          headerTintColor: Colors.gold,
          headerTitleStyle: { fontFamily: Fonts.semibold, color: Colors.fg },
          headerShadowVisible: false,
        }}>
        <Stack.Protected guard={status === 'signedOut'}>
          <Stack.Screen name="entrar" options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={status === 'needsShop'}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={status === 'ready'}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="agenda/configuracao" options={{ title: 'Configuração da agenda' }} />
          <Stack.Screen name="meu-link" options={{ title: 'Meu link' }} />
          <Stack.Screen name="recurso/[id]" />
        </Stack.Protected>
      </Stack>
    </AgendaProvider>
  );
}
