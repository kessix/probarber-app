import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { Colors, Fonts } from '@/constants/theme';
import { useShop } from '@/features/account/account-context';

export default function TabsLayout() {
  const shop = useShop();
  // Barbearia recém-criada: antes da agenda, o passo a passo de horário e serviços.
  if (!shop.onboarded) return <Redirect href="/configuracao-inicial" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.muted,
        tabBarStyle: { backgroundColor: Colors.bg2, borderTopColor: Colors.border },
        tabBarLabelStyle: { fontFamily: Fonts.medium, fontSize: 11 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="recursos"
        options={{
          title: 'Recursos',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color as string} />,
        }}
      />
    </Tabs>
  );
}
