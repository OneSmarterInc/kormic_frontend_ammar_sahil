import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Landmark, Plus, Search, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import Card from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import EmptyState from "../../components/common/EmptyState";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import ConfirmModal from "../../components/common/ConfirmModal";
import { deleteInstitute, listInstitutes } from "../../api/superuserApi";
import { useAction, useAsync } from "../../hooks/useAsync";

export default function InstitutesListPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, error, refetch } = useAsync(
    () => listInstitutes(debouncedSearch),
    [debouncedSearch]
  );

  const institutes = data?.institutes || [];

  const { execute: removeInstitute, loading: removing, error: removeError } = useAction((id) =>
    deleteInstitute(id)
  );

  const handleDelete = async () => {
    try {
      await removeInstitute(deleting.id);
      toast.success("Institute deleted");
      setDeleting(null);
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Institutes"
        description="Feeder institutes that upload student rosters for the claim flow — separate from Universities."
        action={
          <Link to="/admin/institutes/new">
            <Button icon={Plus}>Add institute</Button>
          </Link>
        }
      />

      <div className="mb-6 relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pl-10 pr-4 text-sm transition-all duration-300 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      {loading ? (
        <Spinner label="Loading institutes..." />
      ) : error ? (
        <ErrorBanner error={error} onDismiss={refetch} />
      ) : institutes.length === 0 ? (
        <Card>
          <EmptyState
            icon={Landmark}
            title={debouncedSearch ? "No matching institutes" : "No institutes yet"}
            description={debouncedSearch ? "Try a different search." : "Add the first institute to start collecting student rosters."}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Institute</th>
                  <th className="px-4 py-2.5 font-medium">Admin login</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">2FA</th>
                  <th className="px-4 py-2.5 font-medium">Created</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {institutes.map((inst) => (
                  <tr key={inst.id} className="hover:bg-ink-50/60">
                    <td className="px-4 py-3">
                      <Link to={`/admin/institutes/${inst.id}`} className="block">
                        <p className="font-medium text-ink-900 hover:text-brand-600">{inst.name}</p>
                        <p className="text-xs text-ink-500">{inst.contact_email || inst.id}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      <p>{inst.admin_name || "—"}</p>
                      <p className="text-xs text-ink-400">{inst.admin_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={inst.admin_is_active ? "success" : "danger"}>
                        {inst.admin_is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {inst.admin_totp_enrolled ? (
                        <Badge tone="brand">
                          <ShieldCheck className="h-3 w-3" /> Enrolled
                        </Badge>
                      ) : (
                        <Badge tone="neutral">Not enrolled</Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-400">
                      {formatDate(inst.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/admin/institutes/${inst.id}/upload-list`}>
                          <Button variant="ghost" size="sm" icon={UploadCloud} title="Upload student list" />
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Trash2}
                          className="text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => setDeleting(inst)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={removing}
        error={removeError}
        title="Delete institute"
        confirmLabel="Delete permanently"
        description={
          deleting
            ? `This permanently deletes ${deleting.name}. If it still has an admin account or uploaded lists, remove/reassign the admin via Users & Access first.`
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
