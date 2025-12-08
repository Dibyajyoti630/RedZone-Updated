import ShieldIcon from './icons/ShieldIcon.jsx'
import AdminIcon from './icons/AdminIcon.jsx'
import DashboardIcon from './icons/DashboardIcon.jsx'

import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'

export default function NavBar({ isAuthenticated = false, isAdmin = false, onLogout }) {
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navRef = useRef(null);
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 760);
    };
    
    // Initial check
    checkScreenSize();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkScreenSize);
    
    // Close menu if window is resized to desktop
    const closeMenuOnResize = () => {
      checkScreenSize();
      if (window.innerWidth >= 760) {
        setIsMenuOpen(false);
      }
    };
    
    window.addEventListener('resize', closeMenuOnResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkScreenSize);
      window.removeEventListener('resize', closeMenuOnResize);
    };
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className="navbar">
      <div className="container nav-content" ref={navRef}>
        <div className="brand">
          <div className="logo">
            <ShieldIcon className="shield" size={18} />
          </div>
          <span className="brand-name">RedZone</span>
        </div>

        <input 
          id="nav-toggle" 
          type="checkbox" 
          className="nav-toggle" 
          aria-label="Toggle navigation" 
          checked={isMenuOpen}
          onChange={toggleMenu}
        />
        <label 
          htmlFor="nav-toggle" 
          className={`hamburger ${isMenuOpen ? 'active' : ''}`} 
          aria-label={isMenuOpen ? "Close menu" : "Open menu"} 
          aria-controls="nav-menu" 
          aria-expanded={isMenuOpen}
        >
          <span />
          <span />
          <span />
        </label>

        <nav id="nav-menu" className={`nav-links nav-center ${isMenuOpen ? 'active' : ''}`}>
          {isAuthenticated && (
            <Link to="/dashboard" onClick={closeMenu}><DashboardIcon /> <span>Dashboard</span></Link>
          )}
          {isAdmin && (
            <Link to="/admin" onClick={closeMenu}><AdminIcon /> <span>Admin</span></Link>
          )}
          {isSmallScreen && (
            <>
              <Link to="/" className="mobile-auth-link" onClick={closeMenu}>Home</Link>
              {!isAuthenticated && (
                <>
                  <Link to="/login" className="mobile-auth-link" onClick={closeMenu}>Login</Link>
                  <Link to="/signup" className="mobile-auth-link" onClick={closeMenu}>Sign Up</Link>
                </>
              )}
            </>
          )}
        </nav>

        <div className="nav-right">
          {isAuthenticated ? (
            <>
              <button onClick={() => { onLogout(); closeMenu(); }} className="btn btn-ghost">Logout</button>
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