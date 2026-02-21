import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('App crash:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        style: {
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif', background: '#1a1a18', color: '#fff', padding: 40
        }
      },
        React.createElement('div', { style: { maxWidth: 500, textAlign: 'center' } },
          React.createElement('h1', { style: { fontSize: 24, marginBottom: 16 } }, 'Something went wrong'),
          React.createElement('pre', {
            style: {
              background: '#2a2a28', padding: 16, borderRadius: 8, fontSize: 13,
              textAlign: 'left', overflow: 'auto', whiteSpace: 'pre-wrap', color: '#f87171'
            }
          }, String(this.state.error)),
          React.createElement('button', {
            onClick: () => { localStorage.clear(); window.location.reload() },
            style: {
              marginTop: 20, padding: '10px 24px', background: '#fff', color: '#1a1a18',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer'
            }
          }, 'Reset App & Reload')
        )
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(ErrorBoundary, null,
    React.createElement(App)
  )
)

// Register service worker for PWA / offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (reg) => console.log('SW registered:', reg.scope),
      (err) => console.log('SW registration failed:', err)
    )
  })
}
