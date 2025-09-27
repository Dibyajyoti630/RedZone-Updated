import ShieldIcon from './icons/ShieldIcon.jsx'
import AdminIcon from './icons/AdminIcon.jsx'
import DashboardIcon from './icons/DashboardIcon.jsx'

import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'

export default function NavBar({ isAuthenticated = false, isAdmin = false, onLogout }) {
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 760);
    };
    
    // Initial check
    checkScreenSize();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkScreenSize);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return (
    <header className="navbar">
      <div className="container nav-content">
        <div className="brand">
          <div className="logo">
            <ShieldIcon className="shield" size={18} />
          </div>
          <span className="brand-name">RedZone</span>
        </div>

        <input id="nav-toggle" type="checkbox" className="nav-toggle" aria-label="Toggle navigation" />
        <label htmlFor="nav-toggle" className="hamburger" aria-label="Open menu" aria-controls="nav-menu" aria-expanded="false">
          <span />
          <span />
          <span />
        </label>

        <nav id="nav-menu" className="nav-links nav-center">
          {isAuthenticated && (
            <>
              <Link to="/dashboard"><DashboardIcon /> <span>Dashboard</span></Link>
            </>
          )}
          {isAdmin && (
            <Link to="/admin"><AdminIcon /> <span>Admin</span></Link>
          )}
          {isSmallScreen && (
            <>
              <Link to="/" className="mobile-auth-link">Home</Link>
              {!isAuthenticated && (
                <>
                  <Link to="/login" className="mobile-auth-link">Login</Link>
                  <Link to="/signup" className="mobile-auth-link">Sign Up</Link>
                </>
              )}
            </>
          )}
        </nav>

        <div className="nav-right">
          {isAuthenticated ? (
            <>
              <button onClick={onLogout} className="btn btn-ghost">Logout</button>
            </>
          ) : (
            <>
              {!isSmallScreen && <Link to="/login" className="btn btn-ghost">Login</Link>}
              {!isSmallScreen && <Link to="/signup" className="btn btn-primary">Sign Up</Link>}
            </>
          )}
        </div>
      </div>
    </header>
  )
}


