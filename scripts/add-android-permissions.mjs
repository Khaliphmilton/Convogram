import fs from "node:fs";

const path = "android/app/src/main/AndroidManifest.xml";
let xml = fs.readFileSync(path, "utf8");
const permissions = [
  '<uses-permission android:name="android.permission.CAMERA" />',
  '<uses-permission android:name="android.permission.RECORD_AUDIO" />',
  '<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />',
  '<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />',
  '<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />',
  '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />'
];
const marker = "<application";
const additions = permissions.filter((p) => !xml.includes(p)).join("\n    ");
if (additions && xml.includes(marker)) xml = xml.replace(marker, `${additions}\n    ${marker}`);
fs.writeFileSync(path, xml);
