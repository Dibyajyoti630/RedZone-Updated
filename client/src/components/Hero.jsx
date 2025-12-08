import ShieldIcon from './icons/ShieldIcon.jsx'
import { Link } from 'react-router-dom'

export default function Hero() {
  return (
    <section id="home" className="hero hero-centered">
      <div className="container">
        <div className="hero-logo">
          <div className="shield-wrap"><ShieldIcon size={72} /></div>
        </div>
        <h1 className="hero-title"><span className="light">RED</span><span className="accent">ZONE</span></h1>
        <p className="hero-subtitle">Emergency Alert System</p>

        <div className="status-cards">
          <div className="status-card">
            <div className="status-icon">✦</div>
            <div className="status-title">Monitoring</div>
            <div className="status-desc">Real-time threat detection</div>
            <div className="status-dot active">Active</div>
          </div>
          <div className="status-card">
            <div className="status-icon">⌖</div>
            <div className="status-title">Location</div>
            <div className="status-desc">GPS tracking enabled</div>
            <div className="status-dot ready">Ready</div>
          </div>
          <div className="status-card">
            <div className="status-icon">▲</div>
            <div className="status-title">Alerts</div>
            <div className="status-desc">Instant notifications</div>
            <div className="status-dot armed">Armed</div>
          </div>
        </div>

        <div className="hero-actions center">
          <Link to="/login" className="btn btn-primary btn-glow">Start Protection</Link>
        </div>
      </div>
    </section>
  )
}


