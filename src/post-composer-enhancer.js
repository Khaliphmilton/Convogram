const STYLE = `
.cg-composer{position:fixed!important;inset:0!important;width:100%!important;height:100dvh!important;max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:#fff!important;color:#111!important;z-index:10020!important;overflow:hidden!important;display:flex!important;flex-direction:column!important}
.cg-composer .composer-head{position:absolute!important;left:16px!important;right:16px!important;top:max(12px,env(safe-area-inset-top))!important;z-index:10!important;display:flex!important;justify-content:space-between!important;align-items:center!important}
.cg-composer .composer-head>div{display:block!important}.cg-composer .composer-head small{display:none!important}.cg-composer .composer-head h2{display:none!important}.cg-composer .composer-head button{width:42px!important;height:42px!important;border:0!important;border-radius:50%!important;background:rgba(0,0,0,.55)!important;color:#fff!important;display:grid!important;place-items:center!important}
.cg-composer .file-picker{position:absolute!important;left:0!important;top:0!important;width:100%!important;height:100%!important;opacity:0!important;z-index:1!important;pointer-events:none!important}.cg-composer .file-picker input{pointer-events:none!important}
.cg-composer .file-picker span,.cg-composer .file-picker svg{display:none!important}
.cg-composer .cg-composer-preview{position:absolute!important;inset:0!important;background:#f4f4f5!important;display:none!important;z-index:2!important;overflow:hidden!important}.cg-composer .cg-composer-preview.is-visible{display:block!important}
.cg-composer .cg-preview-stage{position:absolute!important;inset:0!important;display:grid!important;place-items:center!important;overflow:hidden!important;background:#f4f4f5!important;padding:64px 18px 150px!important;box-sizing:border-box!important}
.cg-composer .cg-preview-stage img,.cg-composer .cg-preview-stage video{display:block!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;border-radius:14px!important;background:#000!important}
.cg-composer .cg-preview-remove{position:absolute!important;right:16px!important;top:max(12px,env(safe-area-inset-top))!important;width:42px!important;height:42px!important;border:0!important;border-radius:50%!important;background:rgba(0,0,0,.55)!important;color:#fff!important;font-size:25px!important;z-index:12!important;display:grid!important;place-items:center!important}
.cg-composer .cg-preview-info{display:none!important}
.cg-composer>textarea{position:absolute!important;left:16px!important;right:16px!important;bottom:max(76px,calc(env(safe-area-inset-bottom) + 62px))!important;width:calc(100% - 32px)!important;min-height:50px!important;max-height:120px!important;margin:0!important;padding:13px 15px!important;border:1px solid rgba(0,0,0,.12)!important;border-radius:14px!important;background:rgba(255,255,255,.94)!important;color:#111!important;font-size:16px!important;line-height:1.35!important;z-index:11!important;resize:none!important;outline:none!important;box-sizing:border-box!important}.cg-composer>textarea::placeholder{color:#777!important}
.cg-composer .publish{position:absolute!important;right:16px!important;bottom:max(16px,env(safe-area-inset-bottom))!important;width:auto!important;height:48px!important;min-height:48px!important;padding:0 24px!important;margin:0!important;border:0!important;border-radius:24px!important;background:#1677ff!important;color:#fff!important;font-size:15px!important;font-weight:700!important;z-index:12!important}.cg-composer .publish:disabled{opacity:.45!important}
.cg-simple-label{position:absolute;left:18px;top:max(14px,env(safe-area-inset-top));z-index:11;font-size:16px;font-weight:700;color:#111;background:rgba(255,255,255,.9);padding:10px 14px;border-radius:20px}
`;

function injectStyle(){if(document.getElementById('cg-composer-enhancer-style'))return;const s=document.createElement('style');s.id='cg-composer-enhancer-style';s.textContent=STYLE;document.head.appendChild(s)}

function enhance(composer){
  if(!composer||composer.dataset.cgEnhanced==='1')return;
  composer.dataset.cgEnhanced='1';
  const fileInput=composer.querySelector('input[type="file"]');
  const picker=composer.querySelector('.file-picker');
  const textarea=composer.querySelector('textarea');
  if(!fileInput||!textarea)return;
  composer.classList.add('cg-composer');

  const preview=document.createElement('div');
  preview.className='cg-composer-preview';
  const stage=document.createElement('div');
  stage.className='cg-preview-stage';
  const remove=document.createElement('button');
  remove.className='cg-preview-remove';
  remove.type='button';
  remove.setAttribute('aria-label','Remove selected media');
  remove.textContent='×';
  stage.appendChild(remove);
  preview.appendChild(stage);
  picker?.insertAdjacentElement('afterend',preview);

  const label=document.createElement('div');
  label.className='cg-simple-label';
  label.textContent='New post';
  composer.appendChild(label);

  function clearPreview(){
    const old=stage.querySelector('img,.cg-video');
    if(old){if(old.src?.startsWith('blob:'))URL.revokeObjectURL(old.src);old.remove()}
    preview.classList.remove('is-visible');
  }

  function showPreview(file){
    clearPreview();
    if(!file)return;
    const url=URL.createObjectURL(file);
    let media;
    if(file.type.startsWith('video/')){
      media=document.createElement('video');
      media.className='cg-video';
      media.controls=true;
      media.playsInline=true;
      media.muted=true;
    }else{
      media=document.createElement('img');
      media.alt='Post preview';
    }
    media.src=url;
    stage.insertBefore(media,remove);
    preview.classList.add('is-visible');
  }

  fileInput.addEventListener('change',()=>showPreview(fileInput.files?.[0]||null));
  remove.addEventListener('click',()=>{fileInput.value='';clearPreview()});
  if(fileInput.files?.[0])showPreview(fileInput.files[0]);
}

function scan(){injectStyle();document.querySelectorAll('.composer').forEach(enhance)}
new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});else scan();
