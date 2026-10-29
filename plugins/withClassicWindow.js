// The app uses a classic (non edge-to-edge) Android window: content sits between opaque system bars and the window
// resizes when the keyboard opens, so the focused field is scrolled into view natively.
const { withAndroidManifest, withAndroidStyles, withGradleProperties } = require('@expo/config-plugins');

module.exports = (config) => {
  config = withGradleProperties(config, (c) => {
    const props = c.modResults.filter((p) => !(p.type === 'property' && p.key === 'edgeToEdgeEnabled'));
    props.push({ type: 'property', key: 'edgeToEdgeEnabled', value: 'false' });
    c.modResults = props;
    return c;
  });
  // Opaque black system bars instead of the transparent ones of edge-to-edge.
  config = withAndroidStyles(config, (c) => {
    const app = c.modResults.resources.style.find((st) => st.$.name === 'AppTheme');
    if (app) {
      const set = (name, value) => {
        app.item = app.item.filter((i) => i.$.name !== name);
        app.item.push({ $: { name }, _: value });
      };
      set('android:statusBarColor', '#000000');
      set('android:navigationBarColor', '#000000');
    }
    return c;
  });
  return withAndroidManifest(config, (c) => {
    const activities = c.modResults.manifest.application[0].activity ?? [];
    const main = activities.find((a) => a.$['android:name'] === '.MainActivity');
    if (main) main.$['android:windowSoftInputMode'] = 'adjustResize';
    return c;
  });
};
