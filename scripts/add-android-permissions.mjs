import fs from "node:fs";

const path = "android/app/src/main/AndroidManifest.xml";
let xml = fs.readFileSync(path, "utf8");
const permissions = [
  '<uses-permission android:name="android.permission.CAMERA" />',
  '<uses-permission android:name="android.permission.RECORD_AUDIO" />',
  '<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />',
  '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
  '<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />',
  '<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />',
  '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />'
];
const marker = "<application";
const additions = permissions.filter((p) => !xml.includes(p)).join("\n    ");
if (additions && xml.includes(marker)) xml = xml.replace(marker, `${additions}\n    ${marker}`);
fs.writeFileSync(path, xml);


const pluginDir = "android/app/src/main/java/com/convogram/app";
fs.mkdirSync(pluginDir, { recursive: true });
fs.writeFileSync(`${pluginDir}/ConvogramMediaPermissionsPlugin.java`, `package com.convogram.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import android.Manifest;

@CapacitorPlugin(
  name = "ConvogramMediaPermissions",
  permissions = {
    @Permission(alias = "camera", strings = { Manifest.permission.CAMERA }),
    @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
  }
)
public class ConvogramMediaPermissionsPlugin extends Plugin {
  @PluginMethod
  public void requestPermissions(PluginCall call) {
    requestPermissionForAliases(new String[] { "camera", "microphone" }, call, "permissionsCallback");
  }

  @com.getcapacitor.annotation.PermissionCallback
  private void permissionsCallback(PluginCall call) {
    if (getPermissionState("camera") == PermissionState.GRANTED && getPermissionState("microphone") == PermissionState.GRANTED) {
      call.resolve();
    } else {
      call.reject("Microphone/camera permission was denied.");
    }
  }
}
`);

const mainActivityPath = "android/app/src/main/java/com/convogram/app/MainActivity.java";
let mainActivity = fs.readFileSync(mainActivityPath, "utf8");
if (!mainActivity.includes("ConvogramMediaPermissionsPlugin")) {
  if (!mainActivity.includes("import com.getcapacitor.BridgeActivity;")) throw new Error("MainActivity.java did not contain the expected Capacitor import.");
  mainActivity = mainActivity.replace(
    "import com.getcapacitor.BridgeActivity;",
    "import com.getcapacitor.BridgeActivity;\nimport com.convogram.app.ConvogramMediaPermissionsPlugin;"
  );
  if (mainActivity.includes("public void onCreate(Bundle savedInstanceState) {")) {
    mainActivity = mainActivity.replace(
      "public void onCreate(Bundle savedInstanceState) {\n",
      "public void onCreate(Bundle savedInstanceState) {\n        registerPlugin(ConvogramMediaPermissionsPlugin.class);\n"
    );
  } else {
    mainActivity = mainActivity.replace(
      "public class MainActivity extends BridgeActivity {",
      "public class MainActivity extends BridgeActivity {\n    @Override\n    public void onCreate(Bundle savedInstanceState) {\n        registerPlugin(ConvogramMediaPermissionsPlugin.class);\n        super.onCreate(savedInstanceState);\n    }"
    );
  }
  fs.writeFileSync(mainActivityPath, mainActivity);
}
