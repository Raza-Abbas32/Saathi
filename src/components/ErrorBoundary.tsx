import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-saathi-50 p-4">
          <div className="hero-box p-8 max-w-md text-center">
            <div className="w-16 h-16 rounded-2xl bg-saathi-50 flex items-center justify-center mx-auto mb-5 overflow-hidden">
              <img src="/Logo/Logo.png" alt="Saathi logo" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-xl font-bold text-saathi-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-saathi-600 text-sm mb-6">
              The app encountered an unexpected error. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
