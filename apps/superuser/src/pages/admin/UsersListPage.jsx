import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import clsx from "clsx";
import { Plus, Search, Settings2, ShieldCheck, Trash2, UsersRound } from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import Card from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import EmptyState from "../../components/common/EmptyState";
import Badge, { roleTone } from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import ConfirmModal from "../../components/common/ConfirmModal";
import { Field, Input } from "../../components/common/Input";
import PasswordInput from "../../components/common/PasswordInput";
import { createSuperuser, deleteUser, listUsers, setUserActive } from "../../api/superuserApi";
import { useAction, useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";

const TABS = [
  { key: "", label: "All" },
  { key: "student", label: "Students" },
  { key: "university", label: "Universities" },
  { key: "institute", label: "Institutes" },
  { key: "superuser", label: "Superusers" },
];

export default function UsersListPage() {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = searchParams.get("role") || "";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, error, refetch, setData } = useAsync(
    () => listUsers({ role: role || undefined, search: debouncedSearch }),
    [role, debouncedSearch]
  );

  // Your own account is managed from Settings, not alongside other users.
  const users = (data?.users || []).filter((u) => u.user_id !== currentUser.id);

  const { execute: toggleActive } = useAction((targetUser) =>
    setUserActive(targetUser.user_id, !targetUser.is_active)
  );

  const handleToggle = async (targetUser) => {
    setTogglingId(targetUser.user_id);
    try {
      const updated = await toggleActive(targetUser);
      setData((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.user_id === updated.user_id ? updated : u)),
      }));
      toast.success(updated.is_active ? "Account activated" : "Account deactivated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  const { execute: removeUser, loading: removing, error: removeError } = useAction((userId) =>
    deleteUser(userId)
  );

  const handleDelete = async () => {
    try {
      await removeUser(deleting.user_id);
      toast.success("User removed");
      setDeleting(null);
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Users & Access"
        description="Every login account on the platform, including students who registered through an institute roster claim."
        action={
          <Button icon={Plus} onClick={() => setCreating(true)}>
            New superuser
          </Button>
        }
      />

      <div className="mb-4 inline-flex rounded-lg bg-ink-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSearchParams(t.key ? { role: t.key } : {})}
            className={clsx(
              "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
              role === t.key ? "bg-white text-brand-700 shadow-sm" : "text-ink-500 hover:text-ink-800"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-6 relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pl-10 pr-4 text-sm transition-all duration-300 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      {loading ? (
        <Spinner label="Loading users..." />
      ) : error ? (
        <ErrorBanner error={error} onDismiss={refetch} />
      ) : users.length === 0 ? (
        <Card>
          <EmptyState icon={UsersRound} title="No users match this view" />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">User</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">2FA</th>
                  <th className="px-4 py-2.5 font-medium">Source</th>
                  <th className="px-4 py-2.5 font-medium">Joined</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {users.map((u) => {
                  return (
                    <tr key={u.user_id} className="hover:bg-ink-50/60">
                      <td className="px-4 py-3">
                        <Link to={`/admin/users/${u.user_id}`} className="block">
                          <p className="font-medium text-ink-900 hover:text-brand-600">{u.name || "—"}</p>
                          <p className="text-xs text-ink-500">{u.email}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={roleTone(u.role)} className="capitalize">
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={u.is_active ? "success" : "danger"}>
                          {u.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {u.totp_enrolled ? (
                          <Badge tone="brand">
                            <ShieldCheck className="h-3 w-3" /> Enrolled
                          </Badge>
                        ) : (
                          <Badge tone="neutral">Not enrolled</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.account_source === "institute_roster" ? (
                          <div>
                            <Badge tone="brand">Institute roster</Badge>
                            {u.source_institute_name && (
                              <p className="mt-1 max-w-[180px] truncate text-xs text-ink-400">
                                {u.source_institute_name}
                              </p>
                            )}
                          </div>
                        ) : (
                          <Badge tone="neutral">Direct</Badge>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-400">
                        {formatDate(u.date_joined)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={togglingId === u.user_id}
                            onClick={() => handleToggle(u)}
                          >
                            {u.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <Link to={`/admin/users/${u.user_id}`}>
                            <Button variant="ghost" size="sm" icon={Settings2} title="Manage account" />
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Trash2}
                            onClick={() => setDeleting(u)}
                            className="text-red-500 hover:bg-red-50 hover:text-red-600"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <CreateSuperuserModal open={creating} onClose={() => setCreating(false)} onCreated={refetch} />

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={removing}
        error={removeError}
        title="Remove user"
        confirmLabel="Remove"
        description={
          deleting
            ? `This removes ${deleting.email}'s login. Any StudentProfile or University row they're linked to is kept — use the Students or Universities page for a full purge.`
            : ""
        }
      />
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function CreateSuperuserModal({ open, onClose, onCreated }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const { execute, loading, error, setError } = useAction(() => createSuperuser({ email, password, name }));

  const reset = () => {
    setEmail("");
    setPassword("");
    setName("");
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await execute();
      toast.success("Superuser created");
      reset();
      onClose();
      onCreated();
    } catch {
      // surfaced via error
    }
  };

  const errors = error?.data && typeof error.data === "object" ? error.data : {};

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New superuser"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Create
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && !errors.email && !errors.password && <ErrorBanner error={error} />}
        <Field label="Full name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Email" required error={errors.email?.[0]}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password" required error={errors.password?.[0]}>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
      </form>
    </Modal>
  );
}
