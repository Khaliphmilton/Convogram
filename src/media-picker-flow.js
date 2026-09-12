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

  function removeChooser() {
    document.getElementById('cg-media-chooser')?.remove();
  }

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
      <div class="cg-media-sheet" role="dialog" aria-modal="true" aria-label="Choose media">
        <div class="cg-media-handle"></div>
        <div class="cg-media-title">Create post</div>
        <div class="cg-media-subtitle">Choose what you want to share</div>
        <div class="cg-media-options">
          <button type="button" data-media="photo"><span class="cg-media-icon">▧</span><span><strong>Photo</strong><small>Choose an image</small></span></button>
          <button type="button" data-media="video"><span class="cg-media-icon">▶</span><span><strong>Video</strong><small>Choose a video</small></span></button>
        </div>
        <button type="button" class="cg-media-cancel">Cancel</button>
      </div>`;
    const style = document.createElement('style');
    style.textContent = `
      #cg-media-chooser{position:fixed;inset:0;z-index:10040;font-family:inherit}
      #cg-media-chooser .cg-media-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.62);backdrop-filter:blur(5px)}
      #cg-media-chooser .cg-media-sheet{position:absolute;left:0;right:0;bottom:0;padding:10px 18px calc(18px + env(safe-area-inset-bottom));background:#10141b;color:#fff;border:1px solid rgba(255,255,255,.08);border-bottom:0;border-radius:24px 24px 0 0;box-shadow:0 -12px 40px rgba(0,0,0,.35)}
      #cg-media-chooser .cg-media-handle{width:38px;height:4px;border-radius:4px;background:#59616d;margin:0 auto 18px}
      #cg-media-chooser .cg-media-title{font-size:20px;font-weight:750;letter-spacing:-.2px}
      #cg-media-chooser .cg-media-subtitle{margin-top:4px;color:#8f98a5;font-size:14px}
      #cg-media-chooser .cg-media-options{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0 10px}
      #cg-media-chooser .cg-media-options button{display:flex;align-items:center;gap:12px;text-align:left;min-height:72px;padding:12px;border:1px solid rgba(255,255,255,.09);border-radius:16px;background:#181e27;color:#fff;font:inherit;cursor:pointer}
      #cg-media-chooser .cg-media-options button:active{transform:scale(.98)}
      #cg-media-chooser .cg-media-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:#252d38;font-size:19px;font-weight:700}
      #cg-media-chooser .cg-media-options strong{display:block;font-size:15px}
      #cg-media-chooser .cg-media-options small{display:block;margin-top:3px;color:#8f98a5;font-size:12px}
      #cg-media-chooser .cg-media-cancel{width:100%;height:48px;border:0;border-radius:14px;background:#222a34;color:#fff;font:inherit;font-size:15px;font-weight:650}
      @media(min-width:700px){#cg-media-chooser .cg-media-sheet{left:50%;right:auto;bottom:24px;width:440px;transform:translateX(-50%);border:1px solid rgba(255,255,255,.09);border-radius:24px}}
    `;
    sheet.appendChild(style);
    document.body.appendChild(sheet);
    sheet.querySelector('.cg-media-backdrop').addEventListener('click', () => { removeChooser(); busy = false; });
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
