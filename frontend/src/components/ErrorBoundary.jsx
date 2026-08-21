import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught runtime error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-darkBg text-primaryText p-6">
          <div className="max-w-md w-full glass-card rounded-3xl p-8 border border-urgentRed/40 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-urgentRed/10 border border-urgentRed/30 flex items-center justify-center mx-auto text-urgentRedText">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-primaryText">Something Went Wrong</h2>
              <p className="text-xs text-secondaryText">
                An unhandled rendering exception occurred. The error details have been logged below.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-secondaryBg/90 border border-cardBorder rounded-xl p-4 text-left font-mono text-[11px] text-urgentRedText max-h-40 overflow-y-auto">
                <p className="font-bold">{this.state.error.toString()}</p>
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="btn-danger w-full py-3 font-extrabold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
