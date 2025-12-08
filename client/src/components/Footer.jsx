import ShieldIcon from './icons/ShieldIcon.jsx'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <div className="brand">
            <div className="logo"><ShieldIcon className="shield" size={18} /></div>
            <span className="brand-name">RedZone</span>
          </div>
          <p className="muted">Move with confidence. Stay informed. Stay safe.</p>
        </div>

        <div className="footer-links">
          <div>
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#features">Features</a></li>
              <li><a href="#about">About</a></li>
              <li><Link to="/login">Login</Link></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li><a href="dibyajyotinayak063.gmail.com">dibyajyotinayak063.gmail.com</a></li>
              <li><a href="tel:+917328012952">+91 7328012952</a></li>
              <li>GIET University, Gunupur</li>
            </ul>
          </div>
          <div>
            <h4>Follow</h4>
            <div className="socials">
              <a aria-label="Twitter" href="#" className="social-icon twitter" />
              <a aria-label="Instagram" href="#" className="social-icon instagram" />
              <a aria-label="LinkedIn" href="#" className="social-icon linkedin" />
            </div>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container">
          <small>© {new Date().getFullYear()} RedZone. All rights reserved.</small>
        </div>
      </div>
    </footer>
  )
}


