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
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-6">
          <div className="max-w-md w-full glass-card rounded-3xl p-8 border border-rose-500/30 text-center space-y-6 shadow-2xl shadow-rose-950/20">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-white">Something Went Wrong</h2>
              <p className="text-xs text-slate-400">
                An unhandled rendering exception occurred. The error details have been logged below.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-left font-mono text-[11px] text-rose-300 max-h-40 overflow-y-auto">
                <p className="font-bold">{this.state.error.toString()}</p>
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full py-3 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg flex items-center justify-center gap-2"
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
