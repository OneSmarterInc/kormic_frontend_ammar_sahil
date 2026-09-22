import { Link, useNavigate } from "react-router-dom";
import { Building2, LogOut } from "lucide-react";
import clsx from "clsx";

import Badge from "../common/Badge";
import { useAuth } from "../../context/AuthContext";
import { roleHome } from "../../lib/constants";

export default function TopBar({ universityName, withSidebar = false }) {
  const { status, user, logout } = useAuth();

  const navigate = useNavigate();

  const authenticated = status === "authenticated";

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header
        className={clsx(
          "fixed top-0 z-30 h-12 w-full border-b border-ink-200 bg-white shadow-sm",
          withSidebar && "lg:pl-64"
        )}
      >
      <div
        className="
          flex
          h-full
          items-center
          justify-between
          gap-3
          px-4

        "
      >

        {/* Dashboard */}

        <div
           className="
             flex min-w-0 flex-1 items-center
            pl-3
           "
         >

          {authenticated && universityName && (
            <span
              className="
                flex
                min-w-0
                items-center
                gap-1.5
                text-sm
                font-semibold
                text-ink-800
              "
            >
              <Building2 className="h-4 w-4 shrink-0 text-brand-600" />
              <span className="truncate">{universityName}</span>
            </span>
          )}

        </div>

        {/* Right Side */}

        <div
          className="
            flex
            shrink-0
            items-center
            justify-end
            gap-3
            sm:gap-6
          "
        >

          {authenticated ? (
            <>

              {/* Notification */}

              {/* <button
                className="
                  relative
                  rounded-full
                  p-2
                  transition-all
                  duration-300
                  hover:bg-ink-100
                "
              >

                <Bell className="h-4 w-4 text-ink-600" />

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

              </button> */}

              {/* User */}

              <div className="hidden min-w-0 max-w-[160px] flex-col items-end leading-tight sm:flex">
                <span
                  className="
                    w-full
                    truncate
                    text-right
                    text-sm
                    font-semibold
                    text-ink-800
                  "
                >
                  {user.name}
                </span>

                {user.email && (
                  <span className="w-full truncate text-right text-xs text-ink-400">
                    {user.email}
                  </span>
                )}
              </div>

              {/* University Badge */}

              <span className="hidden sm:inline-flex">
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
              </span>

              {/* Divider */}

              <div className="hidden h-6 w-px bg-ink-200 sm:block" />

              {/* Logout */}

              <button
                onClick={handleLogout}
                aria-label="Log out"
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

                <LogOut className="h-3.5 w-3.5 shrink-0" />

                <span className="hidden sm:inline">Log out</span>

              </button>

            </>
          ) : (
            <>
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

              {/* University registration is superuser-only — not offered from this frontend.
              <Link
                to="/register"
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
                Register
              </Link>
              */}
            </>
          )}

        </div>

      </div>

    </header>
  );
}
