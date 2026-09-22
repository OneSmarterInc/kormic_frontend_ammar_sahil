import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Building2, Plus, Search, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import Card from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import EmptyState from "../../components/common/EmptyState";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import ConfirmModal from "../../components/common/ConfirmModal";
import { deleteUniversity, listUniversities } from "../../api/superuserApi";
import { useAction, useAsync } from "../../hooks/useAsync";

export default function UniversitiesListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, error, refetch } = useAsync(
    () => listUniversities(debouncedSearch),
    [debouncedSearch]
  );

  const universities = data?.universities || [];

  const { execute: removeUniversity, loading: removing, error: removeError } = useAction((id) =>
    deleteUniversity(id)
  );

  const handleDelete = async () => {
    try {
      await removeUniversity(deleting.id);
      toast.success("University deleted");
      setDeleting(null);
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Universities"
        description="Every institution registered on the platform — create, edit, or remove."
        action={
          <Link to="/admin/universities/new">
            <Button icon={Plus}>Add university</Button>
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
        <Spinner label="Loading universities..." />
      ) : error ? (
        <ErrorBanner error={error} onDismiss={refetch} />
      ) : universities.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title={debouncedSearch ? "No matching universities" : "No universities yet"}
            description={debouncedSearch ? "Try a different search." : "Add the first university to get started."}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">University</th>
                  <th className="px-4 py-2.5 font-medium">Admin login</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">2FA</th>
                  <th className="px-4 py-2.5 font-medium">Setup</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {universities.map((u) => (
                  <tr key={u.id} className="hover:bg-ink-50/60">
                    <td className="px-4 py-3">
                      <Link to={`/admin/universities/${u.id}/view`} className="block">
                        <p className="font-medium text-ink-900 hover:text-brand-600">{u.name}</p>
                        <p className="flex items-center gap-1 text-xs text-ink-500">
                          <Sparkles className="h-3 w-3 shrink-0 text-brand-500" />
                          {u.agent_name}
                        </p>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      <p>{u.admin_name || "—"}</p>
                      <p className="text-xs text-ink-400">{u.admin_email || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={u.admin_is_active ? "success" : "danger"}>
                        {u.admin_is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {u.admin_totp_enrolled ? (
                        <Badge tone="brand">
                          <ShieldCheck className="h-3 w-3" /> Enrolled
                        </Badge>
                      ) : (
                        <Badge tone="neutral">Not enrolled</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={u.setup_status?.setup_complete ? "success" : "warning"}>
                        {u.setup_status?.completion_percentage ?? 0}%
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/universities/${u.id}`)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Trash2}
                          className="text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => setDeleting(u)}
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
        title="Delete university"
        confirmLabel="Delete permanently"
        description={
          deleting
            ? `This permanently deletes ${deleting.name}. If its admin account still references it, remove or reassign it first via Users & Access.`
            : ""
        }
      />
    </div>
  );
}
