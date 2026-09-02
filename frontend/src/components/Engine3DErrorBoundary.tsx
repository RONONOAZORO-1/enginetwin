import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class Engine3DErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('EngineTwin 3D visualization failed:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card" style={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 14, marginBottom: 6 }}>3D visualization unavailable.</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
              Simulation and analytical dashboard remain fully operational.
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
