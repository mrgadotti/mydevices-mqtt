// Signs release builds with a keystore described in ~/.gradle/gradle.properties (MYDEVICE_STORE_FILE,
// MYDEVICE_STORE_PASSWORD, MYDEVICE_KEY_ALIAS, MYDEVICE_KEY_PASSWORD); the keystore never lives in the repo.
// Without those properties the release build falls back to the debug keystore.
const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = (config) =>
  withAppBuildGradle(config, (c) => {
    let g = c.modResults.contents;
    if (g.includes('MYDEVICE_STORE_FILE')) return c;
    g = g.replace(
      /signingConfigs \{\n/,
      `signingConfigs {
        release {
            if (project.hasProperty('MYDEVICE_STORE_FILE')) {
                storeFile file(MYDEVICE_STORE_FILE)
                storePassword MYDEVICE_STORE_PASSWORD
                keyAlias MYDEVICE_KEY_ALIAS
                keyPassword MYDEVICE_KEY_PASSWORD
            }
        }
`,
    );
    g = g.replace(/(release \{\n\s*\/\/ Caution[^\n]*\n\s*\/\/ see[^\n]*\n\s*)signingConfig signingConfigs\.debug/, "$1signingConfig project.hasProperty('MYDEVICE_STORE_FILE') ? signingConfigs.release : signingConfigs.debug");
    c.modResults.contents = g;
    return c;
  });
