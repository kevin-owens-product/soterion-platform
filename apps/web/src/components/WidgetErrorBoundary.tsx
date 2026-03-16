import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; name: string; }
interface State { hasError: boolean; }

export class WidgetErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) { console.warn(`[Widget ${this.props.name}] Error:`, err.message); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#0e0e0e', border: '1px solid #1a1a1a', borderRadius: 8, padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#525252', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', height: '100%', minHeight: '200px' }}>
          {this.props.name} — loading...
        </div>
      );
    }
    return this.props.children;
  }
}
