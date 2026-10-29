// Release builds minify with R8, which strips Room's generated WorkDatabase_Impl that Notifee's WorkManager needs at
// startup ("Failed to create an instance of class androidx.work.impl.WorkDatabase"). Keep the classes involved.
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

const MARK = '# mqtt-iot keep rules';
const RULES = `${MARK}
-keep class * extends androidx.room.RoomDatabase { *; }
-keep class androidx.work.** { *; }
-keep class app.notifee.** { *; }
-dontwarn app.notifee.**
`;

module.exports = (config) =>
  withDangerousMod(config, [
    'android',
    (c) => {
      const file = path.join(c.modRequest.platformProjectRoot, 'app/proguard-rules.pro');
      const text = fs.readFileSync(file, 'utf8');
      if (!text.includes(MARK)) fs.writeFileSync(file, `${text.trimEnd()}\n\n${RULES}`);
      return c;
    },
  ]);
