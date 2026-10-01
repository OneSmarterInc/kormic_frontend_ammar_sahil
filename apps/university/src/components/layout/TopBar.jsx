import { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import NotificationBell from "@kormic/portal-core/components/notifications/NotificationBell.jsx";
import { useNavigate } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import client from "../../api/client";
export default function TopBar({ sidebarOpen, desktop, onToggleSidebar, toggleRef, organizationName }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  async function confirm() {
    setLoggingOut(true);setLogoutError("");
    try {await logout();navigate("/");}catch(error){setLogoutError(error.message || "Unable to log out. Please try again.");}finally{setLoggingOut(false);}
  }
  return <header className={`sticky top-0 z-30 h-16 border-b border-ink-200 bg-white transition-[margin] duration-200 motion-reduce:transition-none ${desktop && sidebarOpen ? 'ml-72' : ''}`}>
    <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-6">
      {onToggleSidebar && <button ref={toggleRef} onClick={onToggleSidebar} aria-label={sidebarOpen ? 'Hide navigation' : 'Open navigation'} aria-controls="university-navigation" aria-expanded={sidebarOpen} className="rounded-lg p-2 text-ink-700 hover:bg-ink-100"><Menu size={22} /></button>}
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-800">{organizationName}</span>
      <div className="flex min-w-0 items-center gap-3 sm:gap-5">
        <NotificationBell client={client} navigate={navigate} />
        <div className="min-w-0"><p className="max-w-36 truncate text-sm font-semibold text-ink-900">{user?.name}</p><p className="text-xs capitalize text-ink-500">{user?.role}</p></div>
        <button onClick={() => setConfirmLogout(true)} aria-label="Log out" className="flex items-center gap-2 rounded-lg p-2 text-sm text-ink-600 hover:bg-ink-100"><LogOut size={18} /><span className="hidden sm:inline">Log out</span></button>
      </div>
    </div>
    <Modal open={confirmLogout} onClose={()=>!loggingOut&&setConfirmLogout(false)} title="Log out?" footer={<><Button variant="secondary" disabled={loggingOut} onClick={()=>setConfirmLogout(false)}>Cancel</Button><Button loading={loggingOut} onClick={confirm}>Log out</Button></>}><p className="text-sm text-ink-600">You’ll need to sign in again to access your workspace.</p>{logoutError&&<p role="alert" className="mt-3 text-sm text-red-700">{logoutError}</p>}</Modal>
  </header>;
}
