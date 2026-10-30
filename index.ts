import { registerRootComponent } from 'expo';

import App from './App';
import { registerServiceTask } from './src/background/notifications';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
// The foreground-service task must be registered before the React tree exists.
registerServiceTask();

registerRootComponent(App);
