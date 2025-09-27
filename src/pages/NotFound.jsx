import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <div className="not-found">
      <div className="not-found-container">
        <div className="not-found-content">
          <h1 className="not-found-title">404</h1>
          <h2 className="not-found-subtitle">Page Not Found</h2>
          <p className="not-found-description">
            Oops! The page you're looking for doesn't exist. It might have been moved, deleted, or you entered the wrong URL.
          </p>
          <div className="not-found-actions">
            <Link to="/" className="btn btn-primary">
              Go Home
            </Link>
            <button 
              onClick={() => window.history.back()} 
              className="btn btn-secondary"
            >
              Go Back
            </button>
          </div>
        </div>
        <div className="not-found-illustration">
          <div className="error-404">
            <div className="error-circle">
              <span>4</span>
            </div>
            <div className="error-circle">
              <span>0</span>
            </div>
            <div className="error-circle">
              <span>4</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFound
