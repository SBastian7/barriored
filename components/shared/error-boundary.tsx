'use client'

import { Component, ReactNode } from 'react'
import { logError } from '@/lib/logger'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    logError(error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-background">
          <div className="text-center space-y-4 border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white max-w-sm">
            <p className="text-4xl font-heading font-black uppercase tracking-tighter italic">
              Algo salió mal
            </p>
            <p className="text-sm text-black/70">Recarga la página e intenta de nuevo.</p>
            <button
              onClick={() => window.location.reload()}
              className="brutalist-button px-6 py-2 text-sm"
            >
              Recargar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
