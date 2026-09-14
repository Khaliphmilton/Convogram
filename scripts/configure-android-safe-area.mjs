import fs from 'node:fs';
import path from 'node:path';

const activityPath = path.resolve('android/app/src/main/java/com/convogram/app/MainActivity.java');
if (!fs.existsSync(activityPath)) throw new Error('MainActivity.java was not generated.');

let activity = fs.readFileSync(activityPath, 'utf8');
const packageLine = 'package com.convogram.app;';
const imports = [
  'import android.os.Bundle;',
  'import android.os.Build;',
  'import android.view.Window;',
  'import androidx.core.view.WindowCompat;'
];
for (const imp of imports) {
  if (!activity.includes(imp)) activity = activity.replace(packageLine, `${packageLine}\n\n${imp}`);
}

const marker = 'public class MainActivity extends BridgeActivity {';
if (!activity.includes(marker)) throw new Error('MainActivity class marker not found.');

const methodBlock = `
    private void configureConvogramSystemBars() {
        Window window = getWindow();
        // The native Activity owns the system-bar boundaries. Do not draw the
        // WebView underneath Android's status/navigation bars on Android 11-14.
        // This gives Capacitor a viewport that starts below the status bar and
        // ends above the navigation bar, preventing double safe-area math.
        WindowCompat.setDecorFitsSystemWindows(window, true);
        window.setStatusBarColor(android.graphics.Color.rgb(7, 20, 38));
        window.setNavigationBarColor(android.graphics.Color.rgb(7, 20, 38));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.setNavigationBarDividerColor(android.graphics.Color.rgb(7, 20, 38));
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }
        window.getDecorView().setSystemUiVisibility(0);
    }

    // Kept as a no-op compatibility hook: safe-area geometry is intentionally
    // owned by the Activity rather than adding a second WebView padding layer.
    private void configureConvogramWebViewInsets() {
    }
`;

// Replace any previous generated safe-area implementation before installing
// the single, non-edge-to-edge Activity configuration.
activity = activity.replace(/\n    private void configureConvogramSystemBars\(\) \{[\s\S]*?\n    \}\n(?=\s*(?:private|@Override|\}))/m, '\n');
activity = activity.replace(/\n    private void configureConvogramWebViewInsets\(\) \{[\s\S]*?\n    \}\n(?=\s*(?:private|@Override|\}))/m, '\n');
activity = activity.replace(marker, marker + methodBlock);

const onCreate = `    @Override\n    public void onCreate(Bundle savedInstanceState) {\n        configureConvogramSystemBars();\n        super.onCreate(savedInstanceState);\n        configureConvogramWebViewInsets();\n    }\n\n`;

if (activity.includes('public void onCreate(Bundle savedInstanceState)')) {
  activity = activity.replace(/@Override\s+public void onCreate\(Bundle savedInstanceState\)\s*\{[\s\S]*?\n    \}/m, onCreate.trimEnd());
} else {
  activity = activity.replace(marker, marker + '\n' + onCreate);
}

fs.writeFileSync(activityPath, activity);
console.log('Configured Convogram Android safe area: native Activity owns status/navigation bar boundaries; WebView is not edge-to-edge and is not padded a second time.');
