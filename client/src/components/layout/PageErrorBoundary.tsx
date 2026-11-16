import { Component, type ErrorInfo, type ReactNode } from 'react'
import '@/components/site/not-found.css'

interface State {
  failed: boolean
  /** A short reference for this failure, shown on screen and logged with the error. */
  ref: string | null
}

/**
 * When a page breaks: a plain apology in serif, a reference in mono that
 * matches the console log, and Retry. The rest of the app (top bar, dock)
 * keeps working around it.
 */
export class PageErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false, ref: null }

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true, ref: `NG-${Date.now().toString(36).toUpperCase()}` }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[page error ${this.state.ref ?? ''}]`, error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="nf" role="alert">
        <p className="ed-label">Something broke</p>
        <h1 className="ed-display-serif nf-title">Sorry, this page tripped over itself.</h1>
        <p className="ed-lead nf-lead">It isn&rsquo;t anything you did. Trying again usually fixes it. If it keeps happening, tell us the reference below.</p>
        <code className="nf-id">Reference {this.state.ref}</code>
        <div className="nf-actions">
          <button type="button" className="ed-btn ed-btn-clay" onClick={() => window.location.reload()}>
            Retry
          </button>
          <a href="/hub" className="ed-link">
            Back to Today
          </a>
        </div>
      </div>
    )
  }
}
