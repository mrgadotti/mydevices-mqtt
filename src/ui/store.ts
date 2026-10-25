import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState as RNAppState } from 'react-native';
import { useStore } from 'zustand';
import { createAppStore, type AppState } from '../store/appStore';
import { Repo } from '../store/repo';

export const appStore = createAppStore(new Repo(AsyncStorage));

// Pending debounced saves must not be lost when the app is sent to the background.
RNAppState.addEventListener('change', (st) => {
  if (st !== 'active') void appStore.getState().flush();
});

export const useApp = <T,>(selector: (s: AppState) => T): T => useStore(appStore, selector);
