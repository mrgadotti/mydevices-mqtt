import { NavigationContainer, DarkTheme, DefaultTheme, type NavigationState } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'react-native';
import React, { useEffect, useState } from 'react';
import { loadSettings, useSettings } from './src/i18n';
import { View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionBar } from './src/ui/ActionBar';
import { startBackground } from './src/background/service';
import { BrokerFormScreen } from './src/ui/BrokerFormScreen';
import { BrokersListScreen } from './src/ui/BrokersListScreen';
import { DashboardScreen } from './src/ui/DashboardScreen';
import { IconSelectorScreen } from './src/ui/IconSelectorScreen';
import { SettingsScreen } from './src/ui/SettingsScreen';
import { JsEditorScreen } from './src/ui/JsEditorScreen';
import { MetricFormScreen } from './src/ui/MetricFormScreen';
import type { RootStackParamList } from './src/ui/navigation';
import { appStore } from './src/ui/store';
import { useSkin } from './src/ui/useSkin';
import { ToastProvider } from './src/ui/toast';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** The app is not edge-to-edge: its content ends above the system navigation bar. */
function Root({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const skin = useSkin();
  return <View style={{ flex: 1, backgroundColor: skin.background, paddingBottom: insets.bottom }}>{children}</View>;
}

/** Changing the language or the theme remounts the tree so every text is read again; the screen stack is restored from here. */
let savedNavigation: NavigationState | undefined;

function Navigation() {
  const skin = useSkin();
  const base = skin.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, background: skin.listBackground, card: skin.background, primary: skin.brand, text: skin.text9, border: skin.background } };
  return (
    <NavigationContainer theme={theme} initialState={savedNavigation} onStateChange={(st) => (savedNavigation = st)}>
      {/* The status bar is opaque black (classic window), so its icons stay light in both themes. */}
      <StatusBar barStyle="light-content" />
      <Stack.Navigator
        screenOptions={{
          header: (props) => <ActionBar {...props} />,
          contentStyle: { backgroundColor: skin.listBackground },
          navigationBarColor: skin.background,
        }}
      >
        <Stack.Screen name="Brokers" component={BrokersListScreen} />
        <Stack.Screen name="BrokerForm" component={BrokerFormScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="MetricForm" component={MetricFormScreen} />
        <Stack.Screen name="IconSelector" component={IconSelectorScreen} />
        <Stack.Screen name="JsEditor" component={JsEditorScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const { language, theme } = useSettings();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void loadSettings().then(() => setReady(true));
    void appStore.getState().load().then(startBackground);
  }, []);

  return (
    <SafeAreaProvider>
      <Root>
      <ToastProvider>
        {ready ? <Navigation key={`${language}/${theme}`} /> : null}
      </ToastProvider>
      </Root>
    </SafeAreaProvider>
  );
}
