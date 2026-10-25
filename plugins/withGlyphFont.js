// Ships the fonts in assets/fonts (icon font and UI text fonts) as Android font assets, so React Native can use
// them as fontFamily "<file name>" (it resolves families to assets/fonts/<family>.ttf).
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

module.exports = (config) =>
  withDangerousMod(config, [
    'android',
    (c) => {
      const src = path.join(c.modRequest.projectRoot, 'assets/fonts');
      const dest = path.join(c.modRequest.platformProjectRoot, 'app/src/main/assets/fonts');
      fs.mkdirSync(dest, { recursive: true });
      for (const f of fs.readdirSync(src).filter((n) => n.endsWith('.ttf'))) fs.copyFileSync(path.join(src, f), path.join(dest, f));
      return c;
    },
  ]);
