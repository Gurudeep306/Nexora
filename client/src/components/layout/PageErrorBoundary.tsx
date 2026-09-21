import { Component, type ReactNode } from 'react'
import { ErrorState } from '@/components/ui'

export class PageErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return <ErrorState message="This page could not be displayed. Reload to try again." onRetry={() => window.location.reload()} />
    }
    return this.props.children
  }
}
