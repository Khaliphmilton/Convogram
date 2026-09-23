import React from "react";
import "./LandingPage.css";

export function LandingPage({ onLogin, onSignup }) {
  return <div className="landing">
    <nav className="landing-nav">
      <div className="landing-brand"><span className="landing-mark">C</span><b>Convogram</b></div>
      <div className="landing-nav-actions"><button className="landing-btn" onClick={onLogin}>Log in</button><button className="landing-btn primary" onClick={onSignup}>Create account</button></div>
    </nav>
    <main>
      <section className="landing-hero">
        <div>
          <div className="landing-kicker">THE SOCIAL SUPERAPP</div>
          <h1>Everything social.<br/>Together.</h1>
          <p className="landing-copy">Share moments, post your life, chat with friends, make calls, discover Shorts and build communities — all from one Convogram account.</p>
          <div className="landing-cta"><button className="primary" onClick={onSignup}>Join Convogram</button><button className="secondary" onClick={onLogin}>I already have an account</button></div>
          <div className="landing-note">Free to join · Built by Khaliph Industries</div>
        </div>
        <div className="landing-preview" aria-hidden="true">
          <div className="phone"><div className="phone-screen"><div className="phone-top"><span>Convogram</span><span>♡</span></div><div className="phone-story"><i className="story-dot"/><i className="story-dot"/><i className="story-dot"/><i className="story-dot"/></div><div className="phone-card"><b>Your feed</b><div className="fake-line"/><div className="fake-line short"/><div className="fake-line" style={{height:150}}/></div><div className="phone-card"><b>People are talking</b><div className="fake-line"/><div className="fake-line short"/></div></div></div>
          <div className="phone-nav"><b>⌂</b><span>▶</span><span>◌</span><span>♧</span><span>●</span></div>
        </div>
      </section>
      <section className="landing-features">
        <article className="landing-feature"><div className="icon">✦</div><h3>Share your world</h3><p>Posts and 24-hour Moments give your people a place to see what you're up to.</p></article>
        <article className="landing-feature"><div className="icon">💬</div><h3>Stay connected</h3><p>Chat, voice calls and video calls keep conversations in one place.</p></article>
        <article className="landing-feature"><div className="icon">⚡</div><h3>Discover what's next</h3><p>Explore Shorts, creators, people and communities beyond your usual feed.</p></article>
      </section>
    </main>
    <footer className="landing-footer"><span>© 2026 <strong>Khaliph Industries</strong></span><span>Convogram · Connect. Create. Discover.</span></footer>
  </div>;
}
