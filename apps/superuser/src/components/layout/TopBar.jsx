import { Link, useNavigate } from "react-router-dom";
import { Bell, LogOut } from "lucide-react";

import Badge from "../common/Badge";
import { useAuth } from "../../context/AuthContext";

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

              {/* Notification */}

              <button
                className="
                  relative
                  rounded-full
                  p-2
                  transition-all
                  duration-300
                  hover:bg-ink-100
                "
              >

                <Bell className="h-5 w-5 text-ink-600" />

                <span
                  className="
                    absolute
                    right-2
                    top-2
                    h-2
                    w-2
                    rounded-full
                    bg-brand-600
                  "
                />

              </button>

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
