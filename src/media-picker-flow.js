(() => {
  let bypass = false;
  let busy = false;

  function getPostTrigger(target) {
    const el = target?.closest?.('.top-create, .create-nav, .section-actions button');
    if (!el || el.closest('.cg-composer')) return null;
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (el.classList.contains('top-create') || el.classList.contains('create-nav') || text === 'post' || text === 'create post') return el;
    return null;
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
        } catch (error) {
          console.error('Convogram media transfer failed', error);
        }
        busy = false;
        return;
      }
      if (Date.now() - started > 4000) {
        clearInterval(timer);
        busy = false;
      }
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

    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/*,video/*';
    picker.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;';
    document.body.appendChild(picker);

    picker.addEventListener('change', () => {
      const file = picker.files?.[0];
      picker.remove();
      if (!file) {
        busy = false;
        return;
      }
      transferToComposer(file, trigger);
    }, { once: true });

    picker.click();
  }, true);
})();
