import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  Landmark,
  Pencil,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserRound,
} from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import Card, { CardBody, CardHeader } from "../../components/common/Card";
import { Field, Input, Textarea } from "../../components/common/Input";
import Button from "../../components/common/Button";
import ErrorBanner from "../../components/common/ErrorBanner";
import Spinner from "../../components/common/Spinner";
import EmptyState from "../../components/common/EmptyState";
import Badge from "../../components/common/Badge";
import Modal from "../../components/common/Modal";
import ConfirmModal from "../../components/common/ConfirmModal";
import {
  deleteInstitute,
  downloadInstituteListFile,
  getInstitute,
  listInstituteLists,
  updateInstitute,
} from "../../api/superuserApi";
import { useAction, useAsync } from "../../hooks/useAsync";
import { saveBlob } from "../../utils/download";

export default function InstituteDetailPage() {
  const { instituteId } = useParams();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloadingListId, setDownloadingListId] = useState(null);

  const {
    data: institute,
    loading,
    error: loadError,
    refetch,
    setData: setInstitute,
  } = useAsync(() => getInstitute(instituteId), [instituteId]);

  const { data: listsData, loading: listsLoading, error: listsError } = useAsync(
    () => listInstituteLists(instituteId),
    [instituteId]
  );
  const lists = listsData?.lists || [];

  const { execute: remove, loading: removing, error: removeError } = useAction(() =>
    deleteInstitute(instituteId)
  );

  const handleDelete = async () => {
    try {
      await remove();
      toast.success("Institute deleted");
      navigate("/admin/institutes");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDownload = async (list) => {
    setDownloadingListId(list.list_id);
    try {
      const blob = await downloadInstituteListFile(list.source_file_url);
      saveBlob(blob, list.source_file_name || `list-${list.list_id}`);
    } catch (err) {
      toast.error(err.message || "Download failed");
    } finally {
      setDownloadingListId(null);
    }
  };

  if (loading) return <Spinner label="Loading institute..." />;
  if (loadError) return <ErrorBanner error={loadError} onDismiss={refetch} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <button
        onClick={() => navigate("/admin/institutes")}
        className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to institutes
      </button>

      <PageHeader
        title={institute.name}
        description={institute.admin_email || "No admin email on file"}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              icon={UploadCloud}
              onClick={() => navigate(`/admin/institutes/${instituteId}/upload-list`)}
            >
              Upload student list
            </Button>
            <Button variant="danger" icon={Trash2} onClick={() => setDeleting(true)}>
              Delete
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={institute.admin_is_active ? "success" : "danger"}>
          {institute.admin_is_active ? "Admin active" : "Admin inactive"}
        </Badge>
        <Badge tone={institute.admin_totp_enrolled ? "brand" : "neutral"}>
          <ShieldCheck className="h-3 w-3" />
          {institute.admin_totp_enrolled ? "2FA enrolled" : "2FA not enrolled"}
        </Badge>
      </div>

      <Card>
        <CardHeader
          icon={FileSpreadsheet}
          title="Uploaded lists"
          subtitle="Every roster uploaded for this institute, and how many rows have claimed so far."
          action={
            <Link
              to={`/admin/institutes/${instituteId}/upload-list`}
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Upload another
            </Link>
          }
        />
        <CardBody>
          {listsLoading ? (
            <Spinner label="Loading lists..." />
          ) : listsError ? (
            <ErrorBanner error={listsError} />
          ) : lists.length === 0 ? (
            <EmptyState icon={FileSpreadsheet} title="No lists uploaded yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">List</th>
                    <th className="px-4 py-2.5 font-medium">File</th>
                    <th className="px-4 py-2.5 font-medium">Contact</th>
                    <th className="px-4 py-2.5 font-medium">Claimed</th>
                    <th className="px-4 py-2.5 font-medium">Created</th>
                    <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {lists.map((l) => (
                    <tr key={l.list_id} className="hover:bg-ink-50/60">
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/institutes/${instituteId}/lists/${l.list_id}`}
                          className="font-medium text-ink-900 hover:text-brand-600"
                        >
                          List #{l.list_id}
                        </Link>
                        <p className="text-xs text-ink-500">{l.row_count} rows</p>
                      </td>
                      <td className="px-4 py-3">
                        {l.source_file_url ? (
                          <button
                            type="button"
                            onClick={() => handleDownload(l)}
                            disabled={downloadingListId === l.list_id}
                            className="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:text-brand-700 disabled:text-ink-400"
                          >
                            <Download className="h-3.5 w-3.5 shrink-0" />
                            <span className="max-w-[160px] truncate">{l.source_file_name || "Download"}</span>
                          </button>
                        ) : (
                          <span className="text-ink-400">—</span>
                        )}
                        {l.source_file_size != null && (
                          <p className="text-xs text-ink-400">{formatFileSize(l.source_file_size)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-600">
                        <p>{l.contact_name}</p>
                        <p className="text-xs text-ink-400">{l.contact_email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone="success">{l.claimed_count}</Badge>{" "}
                        <Badge tone="warning">{l.unclaimed_count} pending</Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-400">
                        {formatDate(l.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/admin/institutes/${instituteId}/lists/${l.list_id}`}>
                          <Button variant="ghost" size="sm">
                            View roster
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          icon={Landmark}
          title="Institute details"
          subtitle="Basic profile shown alongside uploaded lists."
          action={
            <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEditing(true)}>
              Edit info
            </Button>
          }
        />
        <CardBody>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Name</dt>
              <dd className="mt-0.5 text-sm text-ink-800">{institute.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Contact email</dt>
              <dd className="mt-0.5 break-words text-sm text-ink-800">{institute.contact_email || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Contact phone</dt>
              <dd className="mt-0.5 text-sm text-ink-800">{institute.contact_phone || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Address</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-sm text-ink-800">{institute.address || "—"}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          icon={UserRound}
          title="Admin account"
          subtitle="The login this institute uses to upload rosters."
          action={
            institute.admin_user_id ? (
              <Link
                to={`/admin/users/${institute.admin_user_id}`}
                className="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Manage in Users & Access
              </Link>
            ) : null
          }
        />
        <CardBody>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Name</dt>
              <dd className="mt-0.5 text-sm text-ink-800">{institute.admin_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Email</dt>
              <dd className="mt-0.5 break-words text-sm text-ink-800">{institute.admin_email || "—"}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <EditInstituteModal
        open={editing}
        institute={institute}
        onClose={() => setEditing(false)}
        onSaved={(updated) => {
          setInstitute(updated);
          setEditing(false);
        }}
      />

      <ConfirmModal
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={handleDelete}
        loading={removing}
        error={removeError}
        title="Delete institute"
        confirmLabel="Delete permanently"
        description={`This permanently deletes ${institute.name}. If it still has an admin account or uploaded lists, remove/reassign the admin via Users & Access first.`}
      />
    </div>
  );
}

function EditInstituteModal({ open, institute, onClose, onSaved }) {
  const [form, setForm] = useState({ name: "", contact_email: "", contact_phone: "", address: "" });

  useEffect(() => {
    if (!institute) return;
    setForm({
      name: institute.name || "",
      contact_email: institute.contact_email || "",
      contact_phone: institute.contact_phone || "",
      address: institute.address || "",
    });
  }, [institute, open]);

  const { execute: save, loading: saving, error: saveError, setError } = useAction(() =>
    updateInstitute(institute.id, form)
  );

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const updated = await save();
      toast.success("Institute saved");
      onSaved(updated);
    } catch {
      // surfaced via error
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Edit institute info"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            Save changes
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {saveError && <ErrorBanner error={saveError} />}
        <Field label="Name">
          <Input value={form.name} onChange={update("name")} />
        </Field>
        <Field label="Contact email">
          <Input type="email" value={form.contact_email} onChange={update("contact_email")} />
        </Field>
        <Field label="Contact phone" hint="Optional">
          <Input value={form.contact_phone} onChange={update("contact_phone")} />
        </Field>
        <Field label="Address" hint="Optional">
          <Textarea rows={3} value={form.address} onChange={update("address")} />
        </Field>
      </form>
    </Modal>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatFileSize(bytes) {
  if (bytes == null || Number.isNaN(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
