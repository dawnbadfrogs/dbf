import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-[#1A1D1E] px-4">
        <div className="toon-panel max-w-md p-6 text-center">
          <p className="module-title !text-2xl">Pond hiccup</p>
          <p className="mt-3 text-sm font-semibold text-cartoon-cream/75">
            {this.state.error.message || 'Something broke while rendering.'}
          </p>
          <button
            type="button"
            className="toon-btn mt-5 cursor-pointer bg-pond-green px-4 py-2 text-sm text-cartoon-ink"
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
