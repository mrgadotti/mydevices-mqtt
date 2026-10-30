// Packages the embedded Mosquitto broker. It is cross-compiled with the NDK (native/build-broker.sh) into
// libmosquitto_exec.so and dropped into the app's jniLibs; the "lib*.so" name makes Gradle package it and, with legacy
// packaging, extract it into nativeLibraryDir, the only place an app may execute a file from. The local-broker Expo
// module (modules/local-broker) spawns it as a child process.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { withAndroidManifest, withDangerousMod, withGradleProperties } = require('@expo/config-plugins');

const ABIS = ['arm64-v8a'];
const LIB = 'libmosquitto_exec.so';

function newestMtime(target) {
  let newest = 0;
  const walk = (p) => {
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (path.basename(p) === 'build') return;
      for (const f of fs.readdirSync(p)) walk(path.join(p, f));
    } else newest = Math.max(newest, st.mtimeMs);
  };
  walk(target);
  return newest;
}

function ensureBinary(root, abi) {
  const nativeDir = path.join(root, 'native');
  const script = path.join(nativeDir, 'build-broker.sh');
  const cacheDir = path.join(nativeDir, 'build', 'out');
  const built = path.join(cacheDir, abi, LIB);
  const sourcesTime = Math.max(
    fs.statSync(script).mtimeMs,
    newestMtime(path.join(nativeDir, 'mosquitto')),
    newestMtime(path.join(nativeDir, 'cjson')),
  );
  if (!fs.existsSync(built) || fs.statSync(built).mtimeMs < sourcesTime) {
    const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(os.homedir(), 'Android', 'Sdk');
    execFileSync('bash', [script, abi, cacheDir], { stdio: 'inherit', env: { ...process.env, ANDROID_HOME: sdk } });
  }
  return built;
}

module.exports = (config) => {
  config = withDangerousMod(config, [
    'android',
    (c) => {
      for (const abi of ABIS) {
        const built = ensureBinary(c.modRequest.projectRoot, abi);
        const dest = path.join(c.modRequest.platformProjectRoot, 'app/src/main/jniLibs', abi, LIB);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(built, dest);
      }
      return c;
    },
  ]);

  config = withGradleProperties(config, (c) => {
    const props = c.modResults;
    const existing = props.find((p) => p.type === 'property' && p.key === 'expo.useLegacyPackaging');
    if (existing) existing.value = 'true';
    else props.push({ type: 'property', key: 'expo.useLegacyPackaging', value: 'true' });
    return c;
  });

  return withAndroidManifest(config, (c) => {
    const manifest = c.modResults.manifest;
    const permissions = manifest['uses-permission'] ?? (manifest['uses-permission'] = []);
    for (const name of [
      'android.permission.INTERNET',
      'android.permission.ACCESS_WIFI_STATE',
      'android.permission.CHANGE_WIFI_MULTICAST_STATE',
      'android.permission.WAKE_LOCK',
    ]) {
      if (!permissions.some((p) => p.$['android:name'] === name)) permissions.push({ $: { 'android:name': name } });
    }
    return c;
  });
};
