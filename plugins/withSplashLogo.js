// Native splash shown while the app opens: the logo centered on the app background (light or dark).
// There is no splash library, so this writes the drawable the launch theme points at.
const fs = require('fs');
const path = require('path');
const { withDangerousMod, withAndroidStyles } = require('@expo/config-plugins');

const layer = (color) => `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item>
    <shape android:shape="rectangle"><solid android:color="${color}" /></shape>
  </item>
  <item>
    <bitmap android:src="@drawable/splashscreen_image" android:gravity="center" />
  </item>
</layer-list>
`;

module.exports = (config) => {
  config = withDangerousMod(config, [
    'android',
    (c) => {
      const res = path.join(c.modRequest.platformProjectRoot, 'app/src/main/res');
      // Light mode: dark text on the light app background. Night mode: white text on the dark one.
      const variants = [
        ['drawable', 'drawable-nodpi', 'assets/splash-icon-light.png', '#FBFBFB'],
        ['drawable-night', 'drawable-night-nodpi', 'assets/splash-icon.png', '#1D1E22'],
      ];
      for (const [xmlDir, imgDir, src, color] of variants) {
        fs.mkdirSync(path.join(res, imgDir), { recursive: true });
        fs.copyFileSync(path.join(c.modRequest.projectRoot, src), path.join(res, imgDir, 'splashscreen_image.png'));
        fs.mkdirSync(path.join(res, xmlDir), { recursive: true });
        fs.writeFileSync(path.join(res, xmlDir, 'splashscreen_bg.xml'), layer(color));
      }
      // Status bar icon of the notifications: the duck silhouette (Android tints it, only the alpha matters).
      for (const d of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
        fs.mkdirSync(path.join(res, `drawable-${d}`), { recursive: true });
        fs.copyFileSync(path.join(c.modRequest.projectRoot, `assets/notification-icon/${d}.png`), path.join(res, `drawable-${d}`, 'ic_stat_duck.png'));
      }
      return c;
    },
  ]);
  return withAndroidStyles(config, (c) => {
    const styles = c.modResults.resources.style;
    const set = (style, name, value) => {
      style.item = (style.item ?? []).filter((i) => i.$.name !== name);
      style.item.push({ $: { name }, _: value });
    };
    // The launch theme paints the logo as the starting window; AppTheme (set in MainActivity.onCreate)
    // keeps it until React Native draws the first frame, so there is no blank gap in between.
    const app = styles.find((st) => st.$.name === 'AppTheme');
    if (app) set(app, 'android:windowBackground', '@drawable/splashscreen_bg');
    let splash = styles.find((st) => st.$.name === 'Theme.App.SplashScreen');
    if (!splash) {
      splash = { $: { name: 'Theme.App.SplashScreen', parent: 'AppTheme' }, item: [] };
      styles.push(splash);
    }
    set(splash, 'android:windowBackground', '@drawable/splashscreen_bg');
    set(splash, 'android:windowDisablePreview', 'false');
    return c;
  });
};
