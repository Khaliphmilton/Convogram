import React from 'react';
import { Plus, Loader, AlertCircle, Heart, Eye, X, MoreHorizontal, MessageCircle, Repeat2, Send, Pause, Play, Volume2, VolumeX, Trash2, ChevronDown } from 'lucide-react';
import { recordMomentView, isMomentLikedByUser, likeMoment, unlikeMoment, getMomentViewers, createMoment, deleteMoment, getViewedMomentIds } from '../lib/moments';
import { getDirectConversation, createConversation, sendMessage } from '../lib/messages';
import { VerifiedBadge } from './VerifiedBadge';
import './MomentsRow.css';

function Avatar({profile, className=''}) { return profile?.avatar_url ? <img src={profile.avatar_url} className={className} alt=""/> : <div className={`${className} fallback-avatar`}>{(profile?.display_name||profile?.username||'C').slice(0,1).toUpperCase()}</div>; }

function groupMoments(items=[], currentUserId) {
  const map=new Map();
  [...items].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)).forEach(moment=>{
    const key=moment.user_id;
    if(!map.has(key)) map.set(key,{userId:key,profile:moment.profiles,moments:[]});
    map.get(key).moments.push(moment);
  });
  const groups=[...map.values()];
  // Always keep the signed-in user's Moment first, regardless of creation time.
  const ownIndex=groups.findIndex(group=>group.userId===currentUserId);
  if(ownIndex>0){
    const [own]=groups.splice(ownIndex,1);
    groups.unshift(own);
  }
  return groups;
}

export function MomentsRow({ moments = [], currentUserId, onAddMoment, loading, error }) {
  const groups=React.useMemo(()=>groupMoments(moments,currentUserId),[moments,currentUserId]);
  const flatMoments=React.useMemo(()=>groups.flatMap(g=>g.moments),[groups]);
  const [selected,setSelected]=React.useState(null),[index,setIndex]=React.useState(0),[liked,setLiked]=React.useState(false),[likeCount,setLikeCount]=React.useState(0),[viewCount,setViewCount]=React.useState(0),[viewers,setViewers]=React.useState([]),[viewersOpen,setViewersOpen]=React.useState(false),[busy,setBusy]=React.useState(false),[paused,setPaused]=React.useState(false),[progress,setProgress]=React.useState(0),[muted,setMuted]=React.useState(true),[reply,setReply]=React.useState(''),[moreOpen,setMoreOpen]=React.useState(false),[videoDuration,setVideoDuration]=React.useState(5),[viewedIds,setViewedIds]=React.useState(new Set());
  const timerRef=React.useRef(null),touchRef=React.useRef({x:0,y:0}),videoRef=React.useRef(null),replyRef=React.useRef(null);
  const isOwner=selected?.user_id===currentUserId;
  const clearTimer=React.useCallback(()=>{if(timerRef.current){clearInterval(timerRef.current);timerRef.current=null;}},[]);

  React.useEffect(()=>{
    let active=true;
    const ids=flatMoments.map(m=>m.id);
    if(!currentUserId||!ids.length){setViewedIds(new Set());return()=>{active=false;};}
    getViewedMomentIds(currentUserId,ids).then(ids=>{if(active)setViewedIds(new Set(ids));}).catch(e=>console.error(e));
    return()=>{active=false;};
  },[currentUserId,flatMoments]);

  const open=React.useCallback(async(moment,i)=>{
    clearTimer();setSelected(moment);setIndex(i);setViewersOpen(false);setMoreOpen(false);setLikeCount(moment.moment_likes?.[0]?.count||0);setViewCount(moment.moment_views?.[0]?.count||0);setLiked(false);setViewers([]);setProgress(0);setPaused(false);setMuted(true);setReply('');setVideoDuration(5);
    try{
      if(moment.user_id!==currentUserId){await recordMomentView(moment.id,currentUserId);setViewedIds(prev=>new Set([...prev,moment.id]));}
      const isLiked=await isMomentLikedByUser(moment.id,currentUserId);setLiked(isLiked);
      if(moment.user_id===currentUserId){const vs=await getMomentViewers(moment.id);setViewers(vs||[]);setViewCount(vs?.length||moment.moment_views?.[0]?.count||0);}
    }catch(e){console.error(e);}
  },[clearTimer,currentUserId]);
  const close=React.useCallback(()=>{clearTimer();setSelected(null);setProgress(0);setViewersOpen(false);setMoreOpen(false);},[clearTimer]);
  const move=React.useCallback(dir=>{const n=index+dir;if(n<0){setProgress(0);return;}if(n>=flatMoments.length){close();return;}open(flatMoments[n],n);},[close,index,flatMoments,open]);
  React.useEffect(()=>()=>clearTimer(),[clearTimer]);
  React.useEffect(()=>{
    if(!selected||paused||viewersOpen||moreOpen)return;
    clearTimer();
    const duration=selected.media_type==='video'?Math.max(1,videoDuration||selected.duration||5):5;
    const step=100/(duration*20);
    timerRef.current=setInterval(()=>setProgress(p=>{const next=p+step;if(next>=100){clearTimer();setTimeout(()=>move(1),0);return 100;}return next;}),50);
    return clearTimer;
  },[selected,index,paused,viewersOpen,moreOpen,videoDuration,move,clearTimer]);

  const toggleLike=async()=>{if(!selected||busy)return;setBusy(true);try{if(liked){await unlikeMoment(selected.id,currentUserId);setLiked(false);setLikeCount(c=>Math.max(0,c-1));}else{await likeMoment(selected.id,currentUserId);setLiked(true);setLikeCount(c=>c+1);}}catch(e){console.error(e);}finally{setBusy(false);}};
  const sendReply=async(text=reply)=>{
    if(!selected||!currentUserId||selected.user_id===currentUserId||busy||!text.trim())return;
    setBusy(true);try{let conversation=await getDirectConversation(currentUserId,selected.user_id);if(!conversation)conversation=await createConversation(currentUserId,'direct',null,null,[selected.user_id]);await sendMessage(conversation.id,currentUserId,text.trim(),'text');setReply('');}catch(e){console.error(e);window.alert('Could not send the reply. Please try again.');}finally{setBusy(false);}
  };
  const quickReact=label=>sendReply(`Story reaction: ${label}`);
  const shareMoment=async()=>{
    if(!selected)return;
    const text=`${selected.profiles?.display_name||'Moment'} shared a Moment${selected.caption?`: ${selected.caption}`:''}`;
    try{if(navigator.share){await navigator.share({title:'Convogram Moment',text,url:selected.media_url});}else if(navigator.clipboard){await navigator.clipboard.writeText(selected.media_url);window.alert('Moment link copied.');}}catch(e){if(e?.name!=='AbortError')console.error(e);}
  };
  const reshareMoment=async()=>{if(!selected||!currentUserId||selected.user_id===currentUserId||busy)return;setBusy(true);try{const originalAuthor=selected.profiles?.username||selected.profiles?.display_name||'user';const caption=selected.caption?`Reshared from @${originalAuthor}: ${selected.caption}`:`Reshared from @${originalAuthor}`;await createMoment(currentUserId,selected.media_url,selected.media_type,caption);window.alert('Moment reshared to your Moments.');}catch(e){console.error(e);window.alert('Could not reshare this Moment. Please try again.');}finally{setBusy(false);}};
  const removeMoment=async()=>{if(!selected||!isOwner||busy)return;if(!window.confirm('Delete this Moment?'))return;setBusy(true);try{await deleteMoment(selected.id);close();window.location.reload();}catch(e){console.error(e);window.alert('Could not delete this Moment.');}finally{setBusy(false);}};
  const handleTouchStart=e=>{touchRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY};setPaused(true);};
  const handleTouchEnd=e=>{setPaused(false);const dx=e.changedTouches[0].clientX-touchRef.current.x;const dy=e.changedTouches[0].clientY-touchRef.current.y;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy))move(dx<0?1:-1);else if(dy>100)close();};
  const handleVideoMetadata=e=>{const d=e.currentTarget.duration;if(Number.isFinite(d)&&d>0)setVideoDuration(d);};
  const submitReply=e=>{e.preventDefault();sendReply();};

  if(error)return <div className="moments-error"><AlertCircle size={24}/><p>Failed to load Moments</p></div>;
  if(loading)return <div className="moments-loading"><Loader className="spinning"/></div>;
  const ownGroup=groups.find(group=>group.userId===currentUserId);
  return <>
    <div className="moments-row">
      {!ownGroup&&<div className="moment-item add-moment" onClick={onAddMoment} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')onAddMoment?.();}}><div className="moment-circle"><Plus size={24}/></div><span className="add-label">Your Moment</span></div>}
      {groups.map(group=>{const latest=group.moments[group.moments.length-1];const unseen=group.moments.some(m=>m.user_id===currentUserId||!viewedIds.has(m.id));return <div key={group.userId} className="moment-item story-card" onClick={()=>{const firstUnseen=group.moments.findIndex(m=>m.user_id===currentUserId||!viewedIds.has(m.id));const target=firstUnseen>=0?firstUnseen:group.moments.length-1;const offset=flatMoments.findIndex(m=>m.id===group.moments[target].id);open(group.moments[target],offset);}} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')open(latest,flatMoments.findIndex(m=>m.id===latest.id));}}><div className={`moment-ring ${unseen?'unseen':''}`}><img src={latest.media_url} alt="Moment" className="moment-preview"/></div><div className="moment-overlay"><Avatar profile={group.profile} className="moment-avatar"/><span className="moment-name">{group.userId===currentUserId?'Your Moment':(group.profile?.display_name||group.profile?.username||'Moment')}<VerifiedBadge verified={group.profile?.is_verified} verificationStatus={group.profile?.verification_status} size={13}/></span></div></div>;})}
      {ownGroup&&<button className="moment-add-overlay" onClick={onAddMoment} aria-label="Add another Moment"><Plus size={18}/></button>}
    </div>
    {selected&&<div className="story-viewer" onClick={close}>
      <div className="story-shell" onClick={e=>e.stopPropagation()} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="story-progress">{flatMoments.map((m,i)=><span key={m.id}><i className={i<index?'done':''} style={{width:i<index?'100%':i===index?`${progress}%`:'0%'}}/></span>)}</div>
        <div className="story-head">
          <Avatar profile={selected.profiles} className="story-avatar"/>
          <div className="story-author"><b>{selected.profiles?.display_name||'Moment'}<VerifiedBadge verified={selected.profiles?.is_verified} verificationStatus={selected.profiles?.verification_status} size={16}/></b><small>@{selected.profiles?.username||''} · 24h</small></div>
          <button className="story-icon" onClick={()=>setPaused(p=>!p)} aria-label={paused?'Play story':'Pause story'}>{paused?<Play size={18}/>:<Pause size={18}/>}</button>
          {selected.media_type==='video'&&<button className="story-icon" onClick={()=>setMuted(m=>!m)} aria-label={muted?'Unmute story':'Mute story'}>{muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button>}
          <button className="story-icon" onClick={e=>{e.stopPropagation();setMoreOpen(v=>!v)}} aria-label="Story options"><MoreHorizontal size={20}/></button>
          <button className="story-icon" onClick={close} aria-label="Close story"><X size={21}/></button>
        </div>
        <div className="story-media">
          <button className="story-tap story-tap-left" onClick={()=>move(-1)} aria-label="Previous story"/>
          <button className="story-tap story-tap-center" onClick={()=>setPaused(p=>!p)} aria-label="Pause or play story"/>
          <button className="story-tap story-tap-right" onClick={()=>move(1)} aria-label="Next story"/>
          {selected.media_type==='video'?<video ref={videoRef} src={selected.media_url} autoPlay={!paused} muted={muted} playsInline onLoadedMetadata={handleVideoMetadata} onEnded={()=>move(1)}/>:<img src={selected.media_url} alt={selected.caption||'Moment'}/>} 
        </div>
        {selected.caption&&<div className="story-caption">{selected.caption}</div>}
        {!isOwner&&<div className="story-reactions"><button onClick={()=>quickReact('Like')} disabled={busy}>Like</button><button onClick={()=>quickReact('Love')} disabled={busy}>Love</button><button onClick={()=>quickReact('Celebrate')} disabled={busy}>Celebrate</button></div>}
        <div className="story-bottom">
          {!isOwner?<form className="story-reply-form" onSubmit={submitReply}><input ref={replyRef} value={reply} onChange={e=>setReply(e.target.value)} placeholder="Reply to this Moment" maxLength={500}/><button type="submit" disabled={busy||!reply.trim()} aria-label="Send reply"><Send size={18}/></button></form>:<div className="story-owner-actions"><button onClick={toggleLike} className={liked?'liked':''}><Heart size={21} fill={liked?'currentColor':'none'}/><span>{likeCount}</span></button><button onClick={()=>setViewersOpen(v=>!v)}><Eye size={21}/><span>{viewCount}</span></button><button onClick={shareMoment}><Send size={20}/><span>Share</span></button></div>}
          {!isOwner&&<div className="story-secondary-actions"><button onClick={shareMoment}><Send size={19}/><span>Share</span></button><button onClick={reshareMoment} disabled={busy}><Repeat2 size={19}/><span>Reshare</span></button></div>}
        </div>
        {moreOpen&&<div className="story-menu" onClick={e=>e.stopPropagation()}><button onClick={shareMoment}><Send size={18}/>Share</button>{isOwner&&<button className="danger" onClick={removeMoment} disabled={busy}><Trash2 size={18}/>Delete Moment</button>}<button onClick={()=>setMoreOpen(false)}><ChevronDown size={18}/>Close menu</button></div>}
        {isOwner&&viewersOpen&&<div className="story-sheet"><div className="sheet-title"><b>Views</b><span>{viewCount}</span><button onClick={()=>setViewersOpen(false)}><X size={18}/></button></div><div className="story-comments">{viewers.length?viewers.map(v=><div className="story-comment" key={v.id}><Avatar profile={v.profiles} className="comment-avatar"/><div><b>{v.profiles?.username||v.profiles?.display_name||'viewer'}<VerifiedBadge verified={v.profiles?.is_verified} verificationStatus={v.profiles?.verification_status} size={15}/></b><small>Viewed your Moment</small></div></div>):<div className="sheet-empty">No viewers yet.</div>}</div></div>}
      </div>
    </div>}
  </>;
}
