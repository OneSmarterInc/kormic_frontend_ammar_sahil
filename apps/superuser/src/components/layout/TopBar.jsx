import NotificationBell from "@kormic/portal-core/components/notifications/NotificationBell.jsx";
import { Link, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

import Badge from "../common/Badge";
import { useAuth } from "../../context/AuthContext";
import client from "../../api/client";

export default function TopBar() {
  const { status, user, logout } = useAuth();

  const navigate = useNavigate();

  const authenticated = status === "authenticated";

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header
       className="
         sticky
         top-0
         left-72
         z-30
         ml-72
         h-12
         border-b
         border-ink-200
         bg-white
         shadow-sm
       "
     >
      <div
        className="
          flex
          h-full
          items-center
          justify-between
          px-6
          
        "
      >

        <div className="flex-1" />

        {/* Right Side */}

        <div
          className="
            flex
            items-center
            justify-end
            gap-6
          "
        >

          {authenticated ? (
            <>

              {/* Account-scoped notifications */}
              <NotificationBell client={client} navigate={navigate} />

              {/* User */}

              <span
                className="
                  text-sm
                  font-semibold
                  text-ink-800
                "
              >
                {user.name}
              </span>

              {/* University Badge */}

              <Badge
                tone="brand"
                className="
                  rounded-full
                  px-3
                  py-1
                  text-xs
                  font-semibold
                  capitalize
                "
              >
                {user.role}
              </Badge>

              {/* Divider */}

              <div className="h-6 w-px bg-ink-200" />

              {/* Logout */}

              <button
                onClick={handleLogout}
                className="
                  flex
                  items-center
                  gap-2
                  rounded-lg
                  px-2
                  py-2
                  text-sm
                  font-medium
                  text-ink-600
                  transition-all
                  duration-300
                  hover:text-red-600
                "
              >

                <LogOut className="h-3.5 w-3.5" />

                Log out

              </button>

            </>
          ) : (
            <Link
              to="/login"
              className="
                rounded-lg
                bg-brand-600
                px-4
                py-2
                text-sm
                font-medium
                text-white
              "
            >
              Log in
            </Link>
          )}

        </div>

      </div>

    </header>
  );
}
