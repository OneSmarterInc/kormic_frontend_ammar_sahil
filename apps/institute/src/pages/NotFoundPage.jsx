import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import Button from "../components/common/Button";
import { useAuth } from "../context/AuthContext";
import { roleHome } from "../lib/constants";

export default function NotFoundPage() {
  const { status, user } = useAuth();
  const authenticated = status === "authenticated";
  const homeHref = authenticated ? roleHome(user) : "/";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink-50 px-6 text-center">
      <Compass className="h-10 w-10 text-ink-300" />
      <h1 className="text-2xl font-semibold text-ink-900">Page not found</h1>
      <p className="max-w-sm text-sm text-ink-500">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <Link to={homeHref}>
        <Button>Back to {authenticated ? "dashboard" : "home"}</Button>
      </Link>
    </div>
  );
}
