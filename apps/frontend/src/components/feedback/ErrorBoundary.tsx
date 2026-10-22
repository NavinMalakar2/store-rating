import { Component, ReactNode } from 'react';
import { ErrorState } from './States';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <ErrorState message="Something went wrong while rendering this page." onRetry={() => window.location.reload()} />;
    return this.props.children;
  }
}
