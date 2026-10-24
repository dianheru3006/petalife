import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Petalife] Render failed', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 bg-[#FDFBF7] p-8 text-center">
        <h1 className="font-display text-xl font-extrabold text-[#332D2A]">Aduh, Mochi tersandung 😿</h1>
        <p className="max-w-sm text-sm leading-6 text-[#5A5149]">
          Aplikasi mengalami kendala teknis saat menampilkan layar. Silakan coba muat ulang.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-[44px] rounded-full bg-[#5D4633] px-6 text-sm font-bold text-white"
        >
          Muat ulang Petalife
        </button>
      </main>
    )
  }
}
