import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** S12: error boundary. Plain message + reload; no data loss claims beyond truth. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("UI error", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen min-h-dvh items-center justify-center bg-bg p-6">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-semibold text-text">Something broke</h1>
            <p className="mt-2 text-base text-text-secondary">
              An unexpected UI error occurred. Your data is safe.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 h-9 rounded-control border border-border-strong bg-surface px-4 text-base font-medium text-text hover:bg-surface-subtle"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
