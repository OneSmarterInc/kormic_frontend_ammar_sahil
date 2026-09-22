import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";

function relativeTime(value) {
  if (!value) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(value).toLocaleDateString();
}

export default function NotificationBell({ client, navigate, pollMs = 30000 }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef(null);

  const refreshCount = useCallback(async () => {
    try {
      const { data } = await client.get("/notifications/unread-count/");
      setUnreadCount(Number(data?.unread_count || 0));
    } catch {
      // Notification failures must never make the portal unusable.
    }
  }, [client]);

  const refreshList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await client.get("/notifications/?page=1&page_size=20");
      setItems(Array.isArray(data?.results) ? data.results : []);
      setUnreadCount(Number(data?.unread_count || 0));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    refreshCount();
    const timer = window.setInterval(refreshCount, pollMs);
    return () => window.clearInterval(timer);
  }, [pollMs, refreshCount]);

  useEffect(() => {
    if (!open) return;
    refreshList();
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, refreshList]);

  const markRead = async (notification) => {
    if (!notification.read_at) {
      try {
        const { data } = await client.post(`/notifications/${notification.id}/read/`);
        setItems((current) => current.map((item) => item.id === notification.id ? data : item));
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch {
        return;
      }
    }
    const route = notification?.data?.route;
    setOpen(false);
    if (route && navigate) navigate(route);
  };

  const markAllRead = async () => {
    try {
      await client.post("/notifications/read-all/");
      const now = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || now })));
      setUnreadCount(0);
    } catch {
      // Keep the current state if the request fails.
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-full p-2 transition-all duration-200 hover:bg-ink-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
      >
        <Bell className="h-5 w-5 text-ink-600" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-brand-600 px-1 text-center text-[10px] font-bold leading-[18px] text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink-900">Notifications</p>
              <p className="text-xs text-ink-500">{unreadCount ? `${unreadCount} unread` : "You're all caught up"}</p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-ink-500">Loading notifications…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-500">No notifications yet.</p>
            ) : (
              items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => markRead(item)}
                  className={[
                    "block w-full border-b border-ink-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-ink-50",
                    item.read_at ? "bg-white" : "bg-brand-50/60",
                  ].join(" ")}
                >
                  <div className="flex gap-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read_at ? "bg-transparent" : "bg-brand-600"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-ink-900">{item.title}</p>
                        <span className="shrink-0 text-[11px] text-ink-400">{relativeTime(item.created_at)}</span>
                      </div>
                      {item.body && <p className="mt-1 line-clamp-3 text-xs leading-5 text-ink-600">{item.body}</p>}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
