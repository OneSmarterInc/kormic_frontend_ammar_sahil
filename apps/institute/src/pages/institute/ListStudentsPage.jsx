import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Download, FileSpreadsheet, Landmark, Mail, RefreshCw, Users } from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import Card, { CardBody, CardHeader } from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import EmptyState from "../../components/common/EmptyState";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import ConfirmModal from "../../components/common/ConfirmModal";
import {
  downloadInstituteListFile,
  getInstituteListStudents,
  listInstituteLists,
  sendInstituteListInvites,
  sendInstituteListStudentInvite,
} from "../../api/instituteApi";
import { useAction, useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";
import { saveBlob } from "../../utils/download";

function statusTone(status) {
  switch (status) {
    case "claimed":
      return "success";
    case "invited":
      return "brand";
    default:
      return "neutral";
  }
}

export default function ListStudentsPage() {
  const { user } = useAuth();
  const { listId } = useParams();
  const navigate = useNavigate();
  const [sendingInvites, setSendingInvites] = useState(false);
  const [resendingInvites, setResendingInvites] = useState(false);
  const [invitingStudentId, setInvitingStudentId] = useState(null);
  const [downloadingFile, setDownloadingFile] = useState(false);

  const { data: listsData, loading: listsLoading } = useAsync(
    () => listInstituteLists(user.institute_id),
    [user.institute_id]
  );

  const {
    data: rosterData,
    loading,
    error,
    refetch,
  } = useAsync(() => getInstituteListStudents(listId), [listId]);

  const listMeta = (listsData?.lists || []).find((l) => String(l.list_id) === String(listId));
  const students = rosterData?.students || [];

  const uninvitedCount = students.filter((s) => !s.invited_at).length;
  const invitedCount = students.filter((s) => s.invited_at).length;

  const { execute: sendInvites, loading: sending, error: sendError } = useAction((resend) =>
    sendInstituteListInvites(listId, resend)
  );

  const handleSendInvites = async (resend) => {
    try {
      const result = await sendInvites(resend);
      const queued = result.invites_queued ?? 0;
      const failed = result.invites_failed_to_queue ?? 0;
      if (failed) {
        toast.error(
          String(failed) + ' invite' + (failed === 1 ? '' : 's') +
            ' could not be queued. Check the delivery status below.'
        );
      } else {
        toast.success(
          String(queued) + ' invite' + (queued === 1 ? '' : 's') +
            ' queued for email delivery'
        );
      }
      setSendingInvites(false);
      setResendingInvites(false);
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDownloadFile = async () => {
    if (!listMeta?.source_file_url) return;
    setDownloadingFile(true);
    try {
      const blob = await downloadInstituteListFile(listMeta.source_file_url);
      saveBlob(blob, listMeta.source_file_name || `list-${listId}`);
    } catch (err) {
      toast.error(err.message || "Download failed");
    } finally {
      setDownloadingFile(false);
    }
  };

  const handleSendStudentInvite = async (student) => {
    setInvitingStudentId(student.id);
    try {
      await sendInstituteListStudentInvite(listId, student.id);
      toast.success(`Invite sent to ${student.full_name}`);
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setInvitingStudentId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <button
        onClick={() => navigate("/institute/lists")}
        className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to lists
      </button>

      <PageHeader
        title={`List #${listId}`}
        description={
          listMeta
            ? `Uploaded by ${listMeta.contact_name} (${listMeta.contact_email})`
            : "The roster you uploaded and its claim status."
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              icon={RefreshCw}
              disabled={invitedCount === 0}
              onClick={() => setResendingInvites(true)}
            >
              Resend to invited
            </Button>
            <Button icon={Mail} disabled={uninvitedCount === 0} onClick={() => setSendingInvites(true)}>
              Send invites
            </Button>
          </div>
        }
      />

      {!listsLoading && listMeta && (
        <div className="flex flex-wrap gap-2">
          <Badge tone={listMeta.status === "active" ? "success" : "neutral"} className="capitalize">
            {listMeta.status}
          </Badge>
          <Badge tone="neutral">{listMeta.row_count} total</Badge>
          <Badge tone="success">{listMeta.claimed_count} claimed</Badge>
          <Badge tone="warning">{listMeta.unclaimed_count} unclaimed</Badge>
        </div>
      )}

      {sendError && <ErrorBanner error={sendError} />}

      {listMeta?.source_file_url && (
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <FileSpreadsheet className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-900">
                  {listMeta.source_file_name || "Uploaded file"}
                </p>
                <p className="text-xs text-ink-500">
                  {listMeta.source_file_size != null ? formatFileSize(listMeta.source_file_size) : "Original upload"}
                </p>
              </div>
            </div>
            <Button variant="secondary" icon={Download} loading={downloadingFile} onClick={handleDownloadFile}>
              Download original file
            </Button>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader
          icon={Landmark}
          title="Roster"
          subtitle="Every row from the uploaded CSV, with its invite and claim status."
        />
        <CardBody>
          {loading ? (
            <Spinner label="Loading roster..." />
          ) : error ? (
            <ErrorBanner error={error} onDismiss={refetch} />
          ) : students.length === 0 ? (
            <EmptyState icon={Users} title="No rows on this list" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Student</th>
                    <th className="px-4 py-2.5 font-medium">Field / Degree</th>
                    <th className="px-4 py-2.5 font-medium">Expected grad.</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Invited</th>
                    <th className="px-4 py-2.5 font-medium">Email delivery</th>
                    <th className="px-4 py-2.5 font-medium">Claimed</th>
                    <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {students.map((s) => (
                    <tr key={s.id} className="hover:bg-ink-50/60">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink-900">{s.full_name}</p>
                        <p className="text-xs text-ink-500">{s.email}</p>
                      </td>
                      <td className="px-4 py-3 text-ink-600">
                        {s.field_of_study || "—"}
                        {s.degree_level ? ` · ${s.degree_level}` : ""}
                      </td>
                      <td className="px-4 py-3 text-ink-600">{s.expected_graduation || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone(s.status)} className="capitalize">
                          {s.status}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-400">
                        {formatDate(s.invited_at)}
                      </td>
                      <td className="px-4 py-3">
                        <DeliveryBadge status={s.invite_delivery_status} error={s.invite_delivery_error} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-400">
                        {formatDate(s.claimed_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Mail}
                          loading={invitingStudentId === s.id}
                          disabled={s.status === "claimed" || invitingStudentId !== null}
                          onClick={() => handleSendStudentInvite(s)}
                        >
                          {s.invited_at ? "Resend" : "Invite"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <ConfirmModal
        open={sendingInvites}
        onClose={() => setSendingInvites(false)}
        onConfirm={() => handleSendInvites(false)}
        loading={sending}
        title="Send invites"
        confirmLabel="Send invites"
        tone="primary"
        description={`Emails a claim link to the ${uninvitedCount} row${uninvitedCount === 1 ? "" : "s"} on this list that haven't been invited yet. Already-invited rows are skipped.`}
      />

      <ConfirmModal
        open={resendingInvites}
        onClose={() => setResendingInvites(false)}
        onConfirm={() => handleSendInvites(true)}
        loading={sending}
        title="Resend invites"
        confirmLabel="Resend to all invited"
        tone="danger"
        description={`Re-sends the claim link email to all ${invitedCount} previously-invited row${invitedCount === 1 ? "" : "s"} on this list, including ones who haven't claimed yet.`}
      />
    </div>
  );
}

function DeliveryBadge({ status, error }) {
  if (!status) return <span className="text-xs text-ink-400">—</span>;

  const config = {
    queued: { label: "Queued", classes: "bg-amber-50 text-amber-700 border-amber-200" },
    sent: { label: "Sent", classes: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    failed: { label: "Failed", classes: "bg-red-50 text-red-700 border-red-200" },
  }[status] || { label: status, classes: "bg-ink-50 text-ink-600 border-ink-200" };

  return (
    <span
      title={error || ""}
      className={"inline-flex max-w-44 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold " + config.classes}
    >
      {config.label}
    </span>
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
