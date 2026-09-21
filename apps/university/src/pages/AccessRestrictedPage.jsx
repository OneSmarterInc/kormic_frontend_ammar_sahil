import { useNavigate } from "react-router-dom";
import { ShieldAlert, LogOut } from "lucide-react";
import UniversityAuthShell from "../components/auth/UniversityAuthShell";
import Button from "../components/common/Button";
import { useAuth } from "../context/AuthContext";

export default function AccessRestrictedPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <UniversityAuthShell
      eyebrow="Access restricted"
      title="This portal is for university admins only"
      subtitle="Your account isn't a university admin account, so it can't access this dashboard. Log out and sign in with a university admin account instead."
    >
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-ink-200 bg-white p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
          <ShieldAlert className="h-6 w-6 text-amber-600" />
        </div>

        <Button className="w-full" icon={LogOut} onClick={handleLogout}>
          Log out
        </Button>
      </div>
    </UniversityAuthShell>
  );
}
