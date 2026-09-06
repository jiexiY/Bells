import { Component, useSyncExternalStore, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, Check, CircleCheck, Github, Layers3, ShieldCheck } from "lucide-react";
import SlicedWaves from "@/components/SlicedWaves.jsx";
import "./LandingPage.css";

// Keep the registry component unchanged; adapt accessibility and failure handling here.
const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeToMotion(callback: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const prefersReducedMotion = () => window.matchMedia(motionQuery).matches;

class WaveBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

function LandingWaves() {
  const reducedMotion = useSyncExternalStore(subscribeToMotion, prefersReducedMotion, () => true);
  return (
    <div className="bells-landing-waves" aria-hidden="true">
      {!reducedMotion && (
        <WaveBoundary>
          <SlicedWaves
            color1="#F6C945"
            color2="#1671EC"
            color3="#80B7FA"
            lightMode={true}
            columns={14}
            rows={8}
            barThickness={0.1}
            speed={0.35}
            travel={0.7}
            waveSpread={0.9}
            rowOffset={1.0}
            softness={0.05}
            glow={0}
            brightness={1.0}
            contrast={1.0}
            opacity={0.5}
            orientation="horizontal"
            alternate={false}
            mouseInteraction={true}
            mouseStrength={1}
            mouseRadius={0.3}
            grain={true}
            grainIntensity={0.05}
          />
        </WaveBoundary>
      )}
    </div>
  );
}

const features = [
  {
    number: "01", icon: ShieldCheck, title: "Access defined by your role.",
    description: "Role-based access control governs which projects and tasks you can view and which actions you can take.",
  },
  {
    number: "02", icon: Layers3, title: "Everyone owns their part.",
    description: "Managers set direction, team leads assign and review tasks, and contributors deliver their assigned work.",
  },
  {
    number: "03", icon: CircleCheck, title: "Keep the work moving.",
    description: "Follow progress, review submissions, and approve completed work in one place.",
  },
];

export default function LandingPage() {
  return (
    <div className="bells-landing">
      <a className="bells-landing-skip" href="#main">Skip to content</a>
      <header className="bells-landing-header">
        <Link to="/" className="bells-landing-brand" aria-label="Bells home">
          <img src="/brand/bells-icon-rounded.png" alt="" width="36" height="36" />
          <span>Bells<span className="bells-landing-brand-dot">.</span></span>
        </Link>
        <nav className="bells-landing-nav" aria-label="Main navigation">
          <a className="bells-landing-nav-overview" href="#workspace">For the workplace</a>
          <a
            className="bells-landing-github"
            href="https://github.com/jiexiY/Bells"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Bells on GitHub (opens in a new tab)"
            title="Bells on GitHub"
          >
            <Github size={22} strokeWidth={1.7} aria-hidden="true" />
          </a>
        </nav>
      </header>

      <main id="main">
        <section className="bells-landing-hero" aria-labelledby="bells-landing-title">
          <LandingWaves />
          <div className="bells-landing-hero-shade" aria-hidden="true" />
          <div className="bells-landing-hero-content">
            <p className="bells-landing-eyebrow"><span />Less friction. More focus.</p>
            <h1 id="bells-landing-title">A workplace app that<br className="bells-landing-desktop-break" /> actually focuses<br className="bells-landing-desktop-break" /> <span>on the work.</span></h1>
            <p className="bells-landing-intro">Role-based access to the work you’re responsible for.<br className="bells-landing-desktop-break" /> So everyone can focus on their part of the work.</p>
            <div className="bells-landing-actions">
              <Link className="bells-landing-primary" to="/demo">Try the demo <ArrowRight size={18} aria-hidden="true" /></Link>
              <a className="bells-landing-secondary" href="#workspace">Take a look <ArrowDown size={16} aria-hidden="true" /></a>
            </div>
            <p className="bells-landing-demo-note"><Check size={13} aria-hidden="true" />No sign-up needed to explore</p>
          </div>
        </section>

        <section className="bells-landing-product" id="workspace" aria-labelledby="bells-workspace-title">
          <div className="bells-landing-section-caption">
            <h2 id="bells-workspace-title">The right view for each role.</h2>
            <span><span className="bells-landing-status-dot" />Inside Bells</span>
          </div>
          <Link to="/demo" className="bells-landing-preview" aria-label="Explore the Bells workspace in the interactive demo">
            <div className="bells-landing-preview-bar" aria-hidden="true">
              <span className="bells-landing-window-dots"><i /><i /><i /></span>
              <span>bellsapp.site</span>
              <span className="bells-landing-preview-label">Workspace preview</span>
            </div>
            <img
              src="/brand/bells-workspace-preview-light.png"
              alt="Bells manager dashboard showing project totals, team progress, department performance, and contributions from Employee X, Employee Y, Employee Z, and You."
              width="1440"
              height="1050"
              fetchPriority="high"
            />
          </Link>
          <div className="bells-landing-preview-caption"><span>A real workspace. Ready to explore.</span><Link to="/demo">Open interactive demo <ArrowUpRightIcon /></Link></div>
        </section>

        <section className="bells-landing-features" aria-labelledby="bells-features-title">
          <div className="bells-landing-feature-heading">
            <p className="bells-landing-eyebrow">A little structure goes a long way</p>
            <h2 id="bells-features-title">From first task<br />to final approval.</h2>
          </div>
          <div className="bells-landing-feature-grid">
            {features.map(({ number, icon: Icon, title, description }) => (
              <article className="bells-landing-feature" key={number}>
                <div className="bells-landing-feature-top"><Icon size={23} strokeWidth={1.5} aria-hidden="true" /><span>{number}</span></div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bells-landing-closing" aria-label="Explore Bells">
          <div><p>Make room for the work.</p><span>Start with a sample team. See how it all comes together.</span></div>
          <Link to="/demo" className="bells-landing-primary">Try the demo <ArrowRight size={18} aria-hidden="true" /></Link>
        </section>
      </main>

      <footer className="bells-landing-footer">
        <span>Bells<span className="bells-landing-brand-dot">.</span><span className="bells-landing-footer-description"> A clear role. A focused workplace.</span></span>
      </footer>
    </div>
  );
}

function ArrowUpRightIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg>;
}
