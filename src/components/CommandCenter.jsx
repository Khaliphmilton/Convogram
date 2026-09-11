import { useState } from "react";
import { Bell, Bookmark, CalendarDays, Check, ChevronRight, Clock3, EyeOff, Flag, Hash, Heart, Languages, Lock, Megaphone, Moon, Pin, Radio, Shield, SlidersHorizontal, Sparkles, Star, Tag, UserCheck, UserPlus, Volume2, WandSparkles, X, Zap } from "lucide-react";

const groups = [
  { title: "Social", items: [["Saved", Bookmark], ["Favorites", Star], ["Close Friends", UserCheck], ["Following", UserPlus], ["Topics", Hash], ["Memories", CalendarDays]] },
  { title: "Creator", items: [["Creator Studio", WandSparkles], ["Analytics", Zap], ["Live", Radio], ["Broadcast channels", Megaphone], ["Scheduled posts", Clock3], ["Drafts", Pin]] },
  { title: "Safety & privacy", items: [["Privacy", Lock], ["Safety center", Shield], ["Muted words", Volume2], ["Blocked accounts", EyeOff], ["Reports", Flag], ["Notifications", Bell]] },
];

export function CommandCenter({ onClose, onCreate }) {
  const [tab, setTab] = useState("all");
  const [message, setMessage] = useState("");
  const [toggles, setToggles] = useState({ private:false, activity:true, read:true, autoplay:true, translation:true, data:false, sensitive:false });
  const all = groups.flatMap(g => g.items.map(([label, Icon]) => ({ label, Icon, group:g.title })));
  const visible = tab === "all" ? all : all.filter(x => x.group === tab);
  const toggle = key => setToggles(x => ({...x,[key]:!x[key]}));
  return <div className="command-backdrop" onClick={onClose}><section className="command-center" onClick={e=>e.stopPropagation()}>
    <header><div><span className="eyebrow">CONVOGRAM CONTROL CENTER</span><h2>More of your social world.</h2><p>One place for creation, discovery, safety and personalization.</p></div><button onClick={onClose}><X/></button></header>
    <div className="command-tabs">{["all","Social","Creator","Safety & privacy"].map(x=><button className={tab===(x==='all'?'all':x)?"active":""} onClick={()=>setTab(x==='all'?'all':x)} key={x}>{x}</button>)}</div>
    <div className="command-grid">{visible.map(({label,Icon,group})=><button key={label} onClick={()=>{setMessage(`${label} is ready to be connected to your Convogram account.`);}}><span className="command-icon"><Icon size={18}/></span><span><b>{label}</b><small>{group}</small></span><ChevronRight size={16}/></button>)}</div>
    <div className="settings-card"><div><span className="eyebrow">QUICK SETTINGS</span><h3>Your experience</h3></div>{[["private","Private account",Lock],["activity","Show activity status",Heart],["read","Read receipts",Check],["autoplay","Autoplay videos",Zap],["translation","Translate posts",Languages],["data","Data saver",SlidersHorizontal],["sensitive","Sensitive content warning",Shield]].map(([key,label,Icon])=><label key={key}><span><Icon size={16}/>{label}</span><input type="checkbox" checked={toggles[key]} onChange={()=>toggle(key)}/><i className={toggles[key]?"on":""}/></label>)}</div>
    <div className="command-footer"><button className="secondary-button" onClick={()=>setMessage("Profile and account settings opened.")}>Account settings</button><button className="primary-button" onClick={()=>{onCreate?.();onClose?.();}}>Create something <Sparkles size={16}/></button></div>
    {message && <div className="command-toast">{message}</div>}
  </section></div>;
}
