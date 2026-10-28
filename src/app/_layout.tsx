import { Lexend_400Regular, Lexend_500Medium, Lexend_600SemiBold } from '@expo-google-fonts/lexend';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors, Fonts } from '@/constants/theme';
import { AgendaProvider } from '@/features/agenda/agenda-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Lexend_400Regular,
    Lexend_500Medium,
    Lexend_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <AgendaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: Colors.bg },
          headerStyle: { backgroundColor: Colors.bg },
          headerTintColor: Colors.gold,
          headerTitleStyle: { fontFamily: Fonts.semibold, color: Colors.fg },
          headerShadowVisible: false,
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="agenda/configuracao" options={{ title: 'Configuração da agenda' }} />
        <Stack.Screen name="recurso/[id]" />
      </Stack>
    </AgendaProvider>
  );
}
