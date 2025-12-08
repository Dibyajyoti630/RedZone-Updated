function FeatureCard({ icon, title, description }) {
  return (
    <div className="feature-card">
      <div className="feature-icon" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

export default function Features() {
  return (
    <section id="features" className="features">
      <div className="container">
        <h2>Powerful safety tools</h2>
        <p className="section-subtitle">Everything you need to move confidently.</p>
        <div className="features-grid">
          <FeatureCard
            icon={<span className="icon alert" />}
            title="Live Alerts"
            description="Instant notifications when you approach high-risk areas, based on real-time data."
          />
          <FeatureCard
            icon={<span className="icon route" />}
            title="Safe Navigation"
            description="Smart routing that avoids hazardous zones so you reach your destination safely."
          />
          <FeatureCard
            icon={<span className="icon sos" />}
            title="Emergency Contacts"
            description="With one tap, share your live location and alert your trusted contacts."
          />
        </div>
      </div>
    </section>
  )
}


