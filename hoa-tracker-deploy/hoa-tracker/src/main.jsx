import React from 'react'
import ReactDOM from 'react-dom/client'
import HOATracker from './HOATracker.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("App crash:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "system-ui, sans-serif", background: "#1a1a18", color: "#fff", padding: 40
        }}>
          <div style={{ maxWidth: 500, textAlign: "center" }}>
            <h1 style={{ fontSize: 24, marginBottom: 16 }}>Something went wrong</h1>
            <pre style={{
              background: "#2a2a28", padding: 16, borderRadius: 8, fontSize: 13,
              textAlign: "left", overflow: "auto", whiteSpace: "pre-wrap", color: "#f87171"
            }}>
              {this.state.error?.toString()}
            </pre>
            <button
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              style={{
                marginTop: 20, padding: "10px 24px", background: "#fff", color: "#1a1a18",
                border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer"
              }}
            >
              Reset App and Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HOATracker />
    </ErrorBoundary>
  </React.StrictMode>,
)
