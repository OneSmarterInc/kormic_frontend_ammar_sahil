import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Landmark,
  Mail,
  ShieldAlert,
  UploadCloud,
  UserRound,
  Users,
} from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import Card, { CardBody, CardHeader } from "../../components/common/Card";
import { Field, Input } from "../../components/common/Input";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import ErrorBanner from "../../components/common/ErrorBanner";
import Spinner from "../../components/common/Spinner";
import { getInstitute, uploadInstituteList } from "../../api/superuserApi";
import { useAction, useAsync } from "../../hooks/useAsync";

const CSV_TEMPLATE_HEADERS = [
  "full_name",
  "email",
  "field_of_study",
  "degree_level",
  "expected_graduation",
  "phone",
  "year_in_college",
  "program_name",
  "city",
  "state",
];

export default function InstituteListUploadPage() {
  const { instituteId } = useParams();
  const navigate = useNavigate();

  const {
    data: institute,
    loading,
    error: loadError,
    refetch,
  } = useAsync(() => getInstitute(instituteId), [instituteId]);

  const [file, setFile] = useState(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactVerification, setContactVerification] = useState("");
  const [result, setResult] = useState(null);

  const { execute, loading: uploading, error, setError } = useAction(() => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("institute_id", instituteId);
    formData.append("contact_name", contactName);
    formData.append("contact_email", contactEmail);
    if (contactVerification.trim()) {
      formData.append("contact_verification", contactVerification.trim());
    }
    return uploadInstituteList(formData);
  });

  const errors = error?.data && typeof error.data === "object" ? error.data : {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError({ message: "Choose a CSV file to upload." });
      return;
    }
    try {
      const res = await execute();
      setResult(res);
      toast.success(`List uploaded — ${res.accepted} row(s) accepted`);
    } catch {
      // surfaced via error
    }
  };

  const reset = () => {
    setFile(null);
    setContactName("");
    setContactEmail("");
    setContactVerification("");
    setResult(null);
    setError(null);
  };

  const downloadTemplate = () => {
    const csv = `${CSV_TEMPLATE_HEADERS.join(",")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_list_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <Spinner label="Loading institute..." />;
  if (loadError) return <ErrorBanner error={loadError} onDismiss={refetch} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <button
        onClick={() => navigate(`/admin/institutes/${instituteId}`)}
        className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to {institute.name}
      </button>

      <PageHeader
        title="Upload student list"
        description={`Bulk-invite students on behalf of ${institute.name}. Each row becomes a claimable invitation the student confirms themselves via a one-time email code — nothing is created under their login until they claim it.`}
      />

      {result ? (
        <ResultSummary result={result} instituteId={instituteId} onUploadAnother={reset} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader
              icon={Landmark}
              title="Institute"
              subtitle="This list is attributed to the institute below."
            />
            <CardBody>
              <div className="flex items-center gap-3 rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                  <Landmark className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-900">{institute.name}</p>
                  <p className="truncate text-xs text-ink-500">{institute.admin_email || "No admin email on file"}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              icon={UserRound}
              title="Contact"
              subtitle="Who at the institute is responsible for this list."
            />
            <CardBody className="space-y-4">
              {error && !Object.keys(errors).length && <ErrorBanner error={error} />}
              <Field label="Contact name" required error={errors.contact_name?.[0]}>
                <Input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Dr. John"
                  required
                />
              </Field>
              <Field label="Contact email" required error={errors.contact_email?.[0]}>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="john@wsfi.edu"
                  required
                />
              </Field>
              <Field label="Contact verification" hint="Optional — how you confirmed this contact is legitimate.">
                <Input
                  value={contactVerification}
                  onChange={(e) => setContactVerification(e.target.value)}
                  placeholder="institutional email domain"
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              icon={FileSpreadsheet}
              title="Roster CSV"
              subtitle="Required columns: full_name, email, field_of_study, degree_level, expected_graduation."
            />
            <CardBody className="space-y-4">
              {errors.file?.[0] && <ErrorBanner error={errors.file[0]} />}
              <FileDropInput file={file} onChange={setFile} />
              <div className="flex items-center justify-between">
                <p className="text-xs text-ink-400">
                  Optional columns: phone, year_in_college, program_name, city, state.
                </p>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  <Download className="h-3.5 w-3.5" /> Download CSV template
                </button>
              </div>
            </CardBody>
          </Card>

          <Button type="submit" className="w-full" loading={uploading} icon={UploadCloud}>
            Upload list
          </Button>
        </form>
      )}
    </div>
  );
}

function FileDropInput({ file, onChange }) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-200 bg-white px-4 py-8 text-center transition-all duration-300 hover:border-brand-400 hover:bg-brand-50/20">
      <UploadCloud className="h-6 w-6 text-brand-500" />
      {file ? (
        <span className="text-sm font-medium text-ink-900">{file.name}</span>
      ) : (
        <span className="text-sm text-ink-500">Click to choose a .csv file, or drag it here</span>
      )}
      <input
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
    </label>
  );
}

function ResultSummary({ result, instituteId, onUploadAnother }) {
  const rejected = result.rejected || [];
  const skipped = result.skipped_claimed || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader icon={CheckCircle2} title="Upload complete" subtitle={`List #${result.list_id}`} />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">{result.accepted} accepted</Badge>
            <Badge tone={rejected.length ? "danger" : "neutral"}>{rejected.length} rejected</Badge>
            <Badge tone={skipped.length ? "warning" : "neutral"}>{skipped.length} claimed snapshots preserved</Badge>
          </div>
          <p className="text-sm text-ink-500">
            Every accepted row is saved as roster history. New/unclaimed students are not notified yet; open the roster to send invite emails.
          </p>
          <Link to={`/admin/institutes/${instituteId}/lists/${result.list_id}`}>
            <Button icon={Mail}>View roster & send invites</Button>
          </Link>
        </CardBody>
      </Card>

      {rejected.length > 0 && (
        <Card>
          <CardHeader
            icon={ShieldAlert}
            title="Rejected rows"
            subtitle="These rows need to be fixed and re-uploaded separately."
          />
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Row</th>
                    <th className="px-4 py-2.5 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {rejected.map((r, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 text-ink-900">{r.row}</td>
                      <td className="px-4 py-3 text-ink-600">{r.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {skipped.length > 0 && (
        <Card>
          <CardHeader
            icon={Users}
            title="Already claimed"
            subtitle="These students already claimed an invitation and were left untouched."
          />
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Row</th>
                    <th className="px-4 py-2.5 font-medium">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {skipped.map((s, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 text-ink-900">{s.row}</td>
                      <td className="px-4 py-3 text-ink-600">{s.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      <Button variant="secondary" className="w-full" onClick={onUploadAnother}>
        Upload another list
      </Button>
    </div>
  );
}
