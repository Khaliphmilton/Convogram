(() => {
  let bypass = false;
  let busy = false;

  function getPostTrigger(target) {
    const el = target?.closest?.('.top-create, .create-nav, .section-actions button');
    if (!el || el.closest('.cg-composer')) return null;
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const label = (el.getAttribute('aria-label') || '').trim().toLowerCase();
    const isPost = text === 'post' || text === 'create post' || label === 'post' || label === 'create post';
    return isPost ? el : null;
  }

  function removeChooser() { document.getElementById('cg-media-chooser')?.remove(); }

  function openPicker(type, trigger) {
    removeChooser();
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = type === 'video' ? 'video/*' : 'image/*';
    picker.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;';
    document.body.appendChild(picker);
    picker.addEventListener('change', () => {
      const file = picker.files?.[0];
      picker.remove();
      if (!file) { busy = false; return; }
      transferToComposer(file, trigger);
    }, { once: true });
    picker.click();
  }

  function showChooser(trigger) {
    removeChooser();
    const sheet = document.createElement('div');
    sheet.id = 'cg-media-chooser';
    sheet.innerHTML = `
      <div class="cg-media-backdrop"></div>
      <section class="cg-media-sheet" role="dialog" aria-modal="true" aria-label="Create post">
        <div class="cg-media-handle"></div>
        <header class="cg-media-head">
          <div><small>CREATE</small><strong>New post</strong></div>
          <button type="button" class="cg-media-close" aria-label="Close">×</button>
        </header>
        <p class="cg-media-subtitle">Choose what you want to share.</p>
        <div class="cg-media-options">
          <button type="button" data-media="photo">
            <span class="cg-media-icon">▧</span>
            <span><strong>Photo</strong><small>Choose a picture from your device</small></span>
            <b>›</b>
          </button>
          <button type="button" data-media="video">
            <span class="cg-media-icon">▶</span>
            <span><strong>Video</strong><small>Choose a video from your device</small></span>
            <b>›</b>
          </button>
        </div>
        <button type="button" class="cg-media-cancel">Cancel</button>
      </section>`;
    const style = document.createElement('style');
    style.textContent = `
      #cg-media-chooser{position:fixed;inset:0;z-index:10040;font-family:'DM Sans',system-ui,sans-serif;color:#f5f5f5}
      #cg-media-chooser .cg-media-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(6px)}
      #cg-media-chooser .cg-media-sheet{position:absolute;left:0;right:0;bottom:0;background:#080808;border:1px solid #242424;border-bottom:0;border-radius:18px 18px 0 0;padding:9px 14px calc(14px + env(safe-area-inset-bottom));box-shadow:0 -18px 55px rgba(0,0,0,.55)}
      #cg-media-chooser .cg-media-handle{width:36px;height:4px;border-radius:5px;background:#444;margin:2px auto 17px}
      #cg-media-chooser .cg-media-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 2px}
      #cg-media-chooser .cg-media-head div{display:grid;gap:3px}.cg-media-head small{font-size:9px;letter-spacing:.1em;color:#888;font-weight:700}.cg-media-head strong{font-size:20px;line-height:1.15}
      #cg-media-chooser .cg-media-close{width:38px;height:38px;border:1px solid #292929;border-radius:50%;background:#121212;color:#aaa;font-size:24px;line-height:1}
      #cg-media-chooser .cg-media-subtitle{margin:7px 2px 15px;color:#888;font-size:13px}
      #cg-media-chooser .cg-media-options{display:grid;gap:8px}
      #cg-media-chooser .cg-media-options button{display:flex;align-items:center;gap:12px;width:100%;min-height:68px;padding:11px;border:1px solid #242424;border-radius:12px;background:#111;color:#f5f5f5;text-align:left;font:inherit}
      #cg-media-chooser .cg-media-options button:active{background:#171717;transform:scale(.99)}
      #cg-media-chooser .cg-media-icon{width:42px;height:42px;flex:none;display:grid;place-items:center;border-radius:10px;background:#1b1b1b;border:1px solid #303030;font-size:18px;font-weight:700}
      #cg-media-chooser .cg-media-options button>span:nth-child(2){display:grid;gap:3px;flex:1}.cg-media-options strong{font-size:14px}.cg-media-options small{color:#888;font-size:11px;line-height:1.25}.cg-media-options b{color:#666;font-size:22px;font-weight:400}
      #cg-media-chooser .cg-media-cancel{width:100%;height:46px;margin-top:9px;border:1px solid #292929;border-radius:11px;background:#111;color:#ccc;font:inherit;font-size:14px;font-weight:600}
      @media(min-width:700px){#cg-media-chooser .cg-media-sheet{left:50%;right:auto;bottom:22px;width:440px;transform:translateX(-50%);border:1px solid #292929;border-radius:18px}}
    `;
    sheet.appendChild(style);
    document.body.appendChild(sheet);
    sheet.querySelector('.cg-media-backdrop').addEventListener('click', () => { removeChooser(); busy = false; });
    sheet.querySelector('.cg-media-close').addEventListener('click', () => { removeChooser(); busy = false; });
    sheet.querySelector('.cg-media-cancel').addEventListener('click', () => { removeChooser(); busy = false; });
    sheet.querySelector('[data-media="photo"]').addEventListener('click', () => openPicker('photo', trigger));
    sheet.querySelector('[data-media="video"]').addEventListener('click', () => openPicker('video', trigger));
  }

  function transferToComposer(file, trigger) {
    const started = Date.now();
    const timer = setInterval(() => {
      const composer = document.querySelector('.composer');
      const input = composer?.querySelector('input[type="file"]');
      if (input) {
        clearInterval(timer);
        try {
          const dt = new DataTransfer();
          dt.items.add(file);
          input.files = dt.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (error) { console.error('Convogram media transfer failed', error); }
        busy = false;
        return;
      }
      if (Date.now() - started > 4000) { clearInterval(timer); busy = false; }
    }, 30);
    bypass = true;
    trigger.click();
    setTimeout(() => { bypass = false; }, 500);
  }

  document.addEventListener('click', (event) => {
    if (bypass || busy) return;
    const trigger = getPostTrigger(event.target);
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    busy = true;
    showChooser(trigger);
  }, true);
})();
