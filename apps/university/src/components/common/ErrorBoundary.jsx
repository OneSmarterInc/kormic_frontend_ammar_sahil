import { Component } from "react";
import { AlertTriangle } from "lucide-react";
import Button from "./Button";

// React only supports catching render-time errors via a class component's
// componentDidCatch/getDerivedStateFromError — there is no hook equivalent.
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink-50 px-6 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <h1 className="text-lg font-semibold text-ink-900">Something went wrong</h1>
          <p className="max-w-sm text-sm text-ink-500">
            An unexpected error occurred. Try reloading the page — if this keeps happening,
            contact support.
          </p>
          <Button onClick={this.handleReload}>Reload page</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
