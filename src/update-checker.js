const REPO = "Khaliphmilton/Convogram";
const RELEASES_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const CURRENT_VERSION_URL = "/app-version.json";
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DISMISSED_KEY = "convogram_update_dismissed";

function compareVersions(a, b) {
  const pa = String(a || "0").replace(/^v/i, "").split(".").map(Number);
  const pb = String(b || "0").replace(/^v/i, "").split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const x = Number.isFinite(pa[i]) ? pa[i] : 0;
    const y = Number.isFinite(pb[i]) ? pb[i] : 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

function releaseToVersion(tag) {
  const match = String(tag || "").match(/convogram-build-(\d+)/i);
  return match ? `1.0.${match[1]}` : String(tag || "").replace(/^v/i, "");
}

function injectStyles() {
  if (document.getElementById("convogram-update-styles")) return;
  const style = document.createElement("style");
  style.id = "convogram-update-styles";
  style.textContent = `
    #convogram-update-banner{position:fixed;left:12px;right:12px;bottom:calc(76px + env(safe-area-inset-bottom));z-index:100000;background:#0b1c31;color:#fff;border:1px solid rgba(125,170,220,.32);border-radius:18px;padding:14px 15px;box-shadow:0 16px 48px rgba(0,0,0,.42);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    #convogram-update-banner .cub-title{font-weight:800;font-size:15px;margin-bottom:4px}
    #convogram-update-banner .cub-notes{font-size:12px;line-height:1.45;color:rgba(255,255,255,.72);white-space:pre-line;max-height:72px;overflow:auto}
    #convogram-update-banner .cub-actions{display:flex;gap:8px;margin-top:11px}
    #convogram-update-banner button{border:0;border-radius:11px;padding:9px 13px;font-weight:750;font-size:12px;cursor:pointer}
    #convogram-update-banner .cub-update{background:#fff;color:#071426}
    #convogram-update-banner .cub-later{background:rgba(255,255,255,.09);color:#fff}
  `;
  document.head.appendChild(style);
}

function showUpdate(release, currentVersion) {
  const version = releaseToVersion(release.tag_name);
  if (!release?.tag_name || compareVersions(version, currentVersion) <= 0) return;
  const dismissed = localStorage.getItem(DISMISSED_KEY);
  if (dismissed === version && !release.prerelease) return;
  injectStyles();
  document.getElementById("convogram-update-banner")?.remove();
  const banner = document.createElement("section");
  banner.id = "convogram-update-banner";
  const notes = String(release.body || "New improvements and fixes are ready.").trim().slice(0, 700);
  const apk = (release.assets || []).find((asset) => /\.apk$/i.test(asset.name));
  const downloadUrl = apk?.browser_download_url || release.html_url;
  banner.innerHTML = `<div class="cub-title">Convogram ${version} is available</div><div class="cub-notes"></div><div class="cub-actions"><button class="cub-update">Update now</button><button class="cub-later">Later</button></div>`;
  banner.querySelector(".cub-notes").textContent = notes;
  banner.querySelector(".cub-update").addEventListener("click", () => { window.open(downloadUrl, "_blank", "noopener,noreferrer"); });
  banner.querySelector(".cub-later").addEventListener("click", () => { localStorage.setItem(DISMISSED_KEY, version); banner.remove(); });
  document.body.appendChild(banner);

  if (release.prerelease) return;
  try {
    if (window.Capacitor?.isNativePlatform?.() && window.Capacitor?.getPlatform?.() === "android") {
      import("@capacitor/local-notifications").then(async ({ LocalNotifications }) => {
        const permission = await LocalNotifications.checkPermissions();
        if (permission.display !== "granted") return;
        await LocalNotifications.schedule({ notifications: [{
          id: Math.floor(Date.now() / 1000) % 2147483647,
          title: "Convogram update available",
          body: `Version ${version} is ready. Tap to update Convogram.`,
          channelId: "convogram_notifications",
          smallIcon: "ic_stat_convogram",
          extra: { type: "app_update", version, downloadUrl },
        }] });
      }).catch(() => {});
    }
  } catch (_) {}
}

async function checkForUpdate() {
  try {
    const current = await fetch(CURRENT_VERSION_URL, { cache: "no-store" }).then((r) => r.ok ? r.json() : null);
    const currentVersion = current?.version || "1.0.0";
    const release = await fetch(RELEASES_URL, { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" }).then((r) => r.ok ? r.json() : null);
    if (release) showUpdate(release, currentVersion);
  } catch (_) {}
}

if (typeof window !== "undefined") {
  window.setTimeout(checkForUpdate, 3500);
  window.setInterval(checkForUpdate, CHECK_INTERVAL_MS);
}
