import { Component, type ReactNode } from "react";

export default class PageErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div
          role="alert"
          className="mx-auto grid min-h-[70vh] max-w-lg place-content-center gap-4 px-4 pt-24 text-center"
        >
          <h1 className="font-heading text-2xl font-bold text-white">
            This page could not be loaded
          </h1>
          <p className="text-slate-400">
            A file may be unavailable or the app may have been updated. Reload to try again.
          </p>
          <button
            className="rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
          <a href="/" className="text-cyan-300">
            Return home
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}
