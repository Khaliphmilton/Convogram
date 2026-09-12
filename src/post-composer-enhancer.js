const STYLE = `
.cg-composer{position:fixed!important;inset:0!important;width:100%!important;height:100dvh!important;max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:#071426!important;color:#fff!important;z-index:10020!important;overflow:hidden!important;display:flex!important;flex-direction:column!important}
.cg-composer .composer-head{position:absolute!important;left:16px!important;right:16px!important;top:max(12px,env(safe-area-inset-top))!important;z-index:20!important;display:flex!important;justify-content:space-between!important;align-items:center!important;pointer-events:none!important}
.cg-composer .composer-head>div{display:none!important}.cg-composer .composer-head button{width:42px!important;height:42px!important;border:1px solid rgba(255,255,255,.1)!important;border-radius:50%!important;background:rgba(7,20,38,.78)!important;color:#fff!important;display:grid!important;place-items:center!important;pointer-events:auto!important;backdrop-filter:blur(10px)!important}
.cg-composer .file-picker{position:absolute!important;left:0!important;top:0!important;width:100%!important;height:100%!important;opacity:0!important;z-index:1!important;pointer-events:none!important}.cg-composer .file-picker input{pointer-events:none!important}.cg-composer .file-picker span,.cg-composer .file-picker svg{display:none!important}
.cg-composer .cg-composer-preview{position:absolute!important;inset:0!important;background:#071426!important;display:none!important;z-index:2!important;overflow:hidden!important}.cg-composer .cg-composer-preview.is-visible{display:block!important}
.cg-composer .cg-preview-stage{position:absolute!important;inset:0!important;display:grid!important;place-items:center!important;overflow:hidden!important;background:#071426!important;padding:78px 18px 150px!important;box-sizing:border-box!important}
.cg-composer .cg-preview-stage img,.cg-composer .cg-preview-stage video{display:block!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;border-radius:16px!important;background:#000!important}
.cg-composer .cg-preview-remove{position:absolute!important;right:16px!important;top:max(12px,env(safe-area-inset-top))!important;width:42px!important;height:42px!important;border:1px solid rgba(255,255,255,.1)!important;border-radius:50%!important;background:rgba(7,20,38,.78)!important;color:#fff!important;font-size:24px!important;z-index:22!important;display:grid!important;place-items:center!important}
.cg-composer .cg-composer-caption{position:absolute!important;left:16px!important;right:16px!important;bottom:max(78px,calc(env(safe-area-inset-bottom) + 64px))!important;z-index:21!important;display:flex!important;gap:10px!important;align-items:flex-end!important}
.cg-composer>textarea{position:static!important;width:100%!important;min-height:48px!important;max-height:110px!important;margin:0!important;padding:13px 15px!important;border:1px solid rgba(255,255,255,.1)!important;border-radius:15px!important;background:rgba(13,28,48,.94)!important;color:#fff!important;font-size:15px!important;line-height:1.35!important;z-index:21!important;resize:none!important;outline:none!important;box-sizing:border-box!important}.cg-composer>textarea::placeholder{color:#8995a6!important}
.cg-composer .cg-change-media{height:48px!important;min-width:48px!important;padding:0 14px!important;border:1px solid rgba(255,255,255,.1)!important;border-radius:15px!important;background:#14243a!important;color:#fff!important;font:inherit!important;font-size:13px!important;font-weight:650!important;white-space:nowrap!important}
.cg-composer .publish{position:absolute!important;right:16px!important;bottom:max(16px,env(safe-area-inset-bottom))!important;width:auto!important;height:48px!important;min-height:48px!important;padding:0 22px!important;margin:0!important;border:0!important;border-radius:15px!important;background:#1683ff!important;color:#fff!important;font-size:15px!important;font-weight:700!important;z-index:22!important}.cg-composer .publish:disabled{opacity:.45!important}
.cg-simple-label{position:absolute!important;left:70px!important;top:max(18px,env(safe-area-inset-top))!important;z-index:21!important;color:#fff!important;font-size:17px!important;font-weight:750!important;line-height:32px!important}
.cg-empty-media{position:absolute;inset:0;display:grid;place-items:center;padding:90px 28px 160px;text-align:center;z-index:4;pointer-events:none}.cg-empty-media>div{max-width:320px}.cg-empty-media strong{display:block;font-size:19px}.cg-empty-media span{display:block;margin-top:7px;color:#8c98a9;font-size:14px;line-height:1.45}
`;

function injectStyle(){if(document.getElementById('cg-composer-enhancer-style'))return;const s=document.createElement('style');s.id='cg-composer-enhancer-style';s.textContent=STYLE;document.head.appendChild(s)}

function enhance(composer){
  if(!composer||composer.dataset.cgEnhanced==='1')return;
  const fileInput=composer.querySelector('input[type="file"]');
  const picker=composer.querySelector('.file-picker');
  const textarea=composer.querySelector('textarea');
  const publish=composer.querySelector('.publish');
  if(!fileInput||!textarea)return;
  composer.dataset.cgEnhanced='1';
  composer.classList.add('cg-composer');

  const preview=document.createElement('div');
  preview.className='cg-composer-preview';
  const stage=document.createElement('div');
  stage.className='cg-preview-stage';
  const remove=document.createElement('button');
  remove.className='cg-preview-remove'; remove.type='button'; remove.setAttribute('aria-label','Remove media'); remove.textContent='×';
  stage.appendChild(remove); preview.appendChild(stage); picker?.insertAdjacentElement('afterend',preview);

  const captionWrap=document.createElement('div');
  captionWrap.className='cg-composer-caption';
  const originalParent=textarea.parentElement;
  if(originalParent===composer) composer.appendChild(captionWrap),captionWrap.appendChild(textarea); else captionWrap.appendChild(textarea);
  const change=document.createElement('button');
  change.type='button'; change.className='cg-change-media'; change.textContent='Media';
  captionWrap.appendChild(change);

  const label=document.createElement('div'); label.className='cg-simple-label'; label.textContent='New post'; composer.appendChild(label);
  const empty=document.createElement('div'); empty.className='cg-empty-media'; empty.innerHTML='<div><strong>Add a photo or video</strong><span>Choose media from your device to preview it here before publishing.</span></div>'; composer.appendChild(empty);

  function clearPreview(){const old=stage.querySelector('img,.cg-video');if(old){if(old.src?.startsWith('blob:'))URL.revokeObjectURL(old.src);old.remove()}preview.classList.remove('is-visible');empty.style.display='grid'}
  function showPreview(file){clearPreview();if(!file)return;const url=URL.createObjectURL(file);let media;if(file.type.startsWith('video/')){media=document.createElement('video');media.className='cg-video';media.controls=true;media.playsInline=true;media.muted=true}else{media=document.createElement('img');media.alt='Post preview'}media.src=url;stage.insertBefore(media,remove);preview.classList.add('is-visible');empty.style.display='none'}
  function chooseMedia(){fileInput.value='';fileInput.click()}

  fileInput.addEventListener('change',()=>showPreview(fileInput.files?.[0]||null));
  remove.addEventListener('click',()=>{fileInput.value='';clearPreview()});
  change.addEventListener('click',chooseMedia);
  if(publish)publish.addEventListener('click',()=>{},true);
  if(fileInput.files?.[0])showPreview(fileInput.files[0]);
}

function scan(){injectStyle();document.querySelectorAll('.composer').forEach(enhance)}
new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});else scan();
