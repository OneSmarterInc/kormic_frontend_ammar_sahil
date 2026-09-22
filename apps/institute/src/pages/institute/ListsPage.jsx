import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Download, FileSpreadsheet, UploadCloud } from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import Card from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import EmptyState from "../../components/common/EmptyState";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { downloadInstituteListFile, listInstituteLists } from "../../api/instituteApi";
import { useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";
import { saveBlob } from "../../utils/download";

export default function ListsPage() {
  const { user } = useAuth();
  const [downloadingListId, setDownloadingListId] = useState(null);

  const { data, loading, error, refetch } = useAsync(
    () => listInstituteLists(user.institute_id),
    [user.institute_id]
  );

  const lists = data?.lists || [];

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

  return (
    <div>
      <PageHeader
        title="Uploaded lists"
        description="Every student roster you've uploaded, and how many rows have claimed so far."
        action={
          <Link to="/institute/upload">
            <Button icon={UploadCloud}>Upload a list</Button>
          </Link>
        }
      />

      {loading ? (
        <Spinner label="Loading lists..." />
      ) : error ? (
        <ErrorBanner error={error} onDismiss={refetch} />
      ) : lists.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileSpreadsheet}
            title="No lists uploaded yet"
            description="Upload your first student roster to start inviting students."
            action={
              <Link to="/institute/upload">
                <Button icon={UploadCloud}>Upload a list</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
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
                      <Link to={`/institute/lists/${l.list_id}`} className="font-medium text-ink-900 hover:text-brand-600">
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
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-400">{formatDate(l.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/institute/lists/${l.list_id}`}>
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
        </Card>
      )}
    </div>
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
