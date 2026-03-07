import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Optional label shown in the error card, e.g. "Import dialog" */
  label?: string;
  /** If provided, called instead of showing the built-in fallback UI */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Generic React error boundary.
 *
 * Catches any render/lifecycle exception thrown by its children and shows a
 * recoverable error card.  Particularly useful around import flows where
 * large-file parsing can surface unexpected runtime errors.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    const { children, label, fallback } = this.props;

    if (!error) return children;

    if (fallback) return fallback(error, this.reset);

    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertTriangle size={32} className="text-amber-500" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {label ? `${label} crashed` : 'Something went wrong'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs break-words">
            {error.message}
          </p>
        </div>
        <button
          onClick={this.reset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
            bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          <RefreshCw size={13} />
          Try again
        </button>
      </div>
    );
  }
}
