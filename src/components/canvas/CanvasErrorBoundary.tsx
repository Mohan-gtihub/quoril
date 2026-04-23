import { Component, type ReactNode } from 'react'

interface State { error: Error | null }

export class CanvasErrorBoundary extends Component<{ children: ReactNode }, State> {
    state: State = { error: null }

    static getDerivedStateFromError(error: Error): State { return { error } }

    componentDidCatch(error: Error, info: unknown) {
        console.error('[Canvas] crashed:', error, info)
    }

    reset = () => this.setState({ error: null })

    render() {
        if (!this.state.error) return this.props.children
        return (
            <div className="w-full h-full flex items-center justify-center p-8 bg-[var(--bg-primary)]">
                <div className="max-w-md text-center space-y-3">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Canvas hit an error</div>
                    <div className="text-xs text-[var(--text-muted)] font-mono break-all">
                        {this.state.error.message}
                    </div>
                    <button
                        onClick={this.reset}
                        className="px-3 py-1.5 text-xs rounded-md bg-[var(--accent-primary)] text-white hover:opacity-90"
                    >
                        Reload canvas
                    </button>
                </div>
            </div>
        )
    }
}
