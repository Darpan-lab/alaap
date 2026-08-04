import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Alaap Uncaught UI Error:", error, errorInfo);
  }

  handleReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(r => r.unregister());
      });
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b0c10',
          color: '#f8fafc',
          fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '12px', fontWeight: 700 }}>Something went wrong loading Alaap</h2>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.05)', 
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '16px 20px', 
            borderRadius: '12px', 
            marginBottom: '24px', 
            maxWidth: '560px', 
            textAlign: 'left', 
            width: '100%' 
          }}>
            <p style={{ color: '#f87171', fontWeight: 600, margin: '0 0 8px 0', fontSize: '0.95rem' }}>
              Error: {this.state.error?.message || 'An unexpected runtime error occurred.'}
            </p>
            {this.state.error?.stack && (
              <pre style={{ 
                color: '#94a3b8', 
                fontSize: '0.75rem', 
                margin: 0, 
                whiteSpace: 'pre-wrap', 
                wordBreak: 'break-all', 
                maxHeight: '120px', 
                overflowY: 'auto',
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '8px 12px',
                borderRadius: '6px'
              }}>
                {this.state.error.stack}
              </pre>
            )}
          </div>
          <button 
            onClick={this.handleReset}
            style={{
              padding: '12px 28px',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '1rem',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
            }}
          >
            Reset Session & Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
console.log("Service Worker Version: 1.1.6");

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

