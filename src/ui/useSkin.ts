import { useColorScheme } from 'react-native';
import { skinFor, type Skin } from './skin';

/** Skin of the system theme (dark unless the system asks for light). */
export function useSkin(): Skin {
  return skinFor(useColorScheme() === 'light' ? 'light' : 'dark');
}
