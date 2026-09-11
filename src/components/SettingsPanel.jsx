import { ArrowLeft, Bell, ChevronRight, Globe, Lock, LogOut, Palette, Shield, User, Users } from "lucide-react";

const groups = [
  { title: "Account", items: [[User,"Account","Name, username, email and profile information"],[Shield,"Security","Password, two-factor authentication and sessions"]] },
  { title: "Privacy", items: [[Lock,"Privacy","Private account, blocked accounts and visibility controls"],[Users,"Messages & interactions","Who can message, mention and interact with you"]] },
  { title: "Preferences", items: [[Bell,"Notifications","Push, activity and message notification preferences"],[Palette,"Appearance","Theme, display and interface preferences"],[Globe,"Language & accessibility","Language, accessibility and data-saving options"]] },
];

export function SettingsPanel({ onBack, onLogout }) {
  return <section className="settings-page">
    <div className="settings-header"><button className="settings-back" onClick={onBack} aria-label="Back"><ArrowLeft size={20}/></button><div><h1>Settings</h1><p>Control your Convogram experience</p></div></div>
    <div className="settings-hero"><strong>Convogram Settings</strong><span>Privacy, security, appearance and account controls in one place.</span></div>
    <div className="settings-grid">{groups.map(group => <div className="settings-section" key={group.title}><h2>{group.title}</h2>{group.items.map(([Icon,title,description]) => <button className="settings-row" key={title} onClick={() => {}}><span className="settings-icon"><Icon size={19}/></span><span className="settings-row-copy"><strong>{title}</strong><span>{description}</span></span><ChevronRight className="settings-chevron" size={18}/></button>)}</div>)}</div>
    <div className="settings-section settings-danger"><h2>Account actions</h2><button className="settings-row settings-logout" onClick={onLogout}><span className="settings-icon"><LogOut size={19}/></span><span className="settings-row-copy"><strong>Log out</strong><span>Sign out of this Convogram account</span></span><ChevronRight className="settings-chevron" size={18}/></button></div>
    <div className="settings-version">Convogram · A Khaliph Industries Product</div>
  </section>;
}
