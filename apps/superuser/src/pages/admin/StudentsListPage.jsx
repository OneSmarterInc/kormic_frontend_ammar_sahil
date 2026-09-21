import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, GraduationCap, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import Card from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import EmptyState from "../../components/common/EmptyState";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import ConfirmModal from "../../components/common/ConfirmModal";
import { deleteStudent, listStudents } from "../../api/superuserApi";
import { useAction, useAsync } from "../../hooks/useAsync";

export default function StudentsListPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleting, setDeleting] = useState(null); // student object or null

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, error, refetch } = useAsync(
    () => listStudents(debouncedSearch),
    [debouncedSearch]
  );

  const students = data?.students || [];

  return (
    <div>
      <PageHeader
        title="Students"
        description="Every student account on the platform — search, review, and manage access."
        action={
          <Link to="/admin/students/new">
            <Button icon={Plus}>Add student</Button>
          </Link>
        }
      />

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
        <Spinner label="Loading students..." />
      ) : error ? (
        <ErrorBanner error={error} onDismiss={refetch} />
      ) : students.length === 0 ? (
        <Card>
          <EmptyState
            icon={GraduationCap}
            title={debouncedSearch ? "No matching students" : "No students yet"}
            description={debouncedSearch ? "Try a different search." : "Students who register will appear here."}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Student</th>
                  <th className="px-4 py-2.5 font-medium">Institution / Major</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">2FA</th>
                  <th className="px-4 py-2.5 font-medium">Joined</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {students.map((s) => (
                  <tr key={s.student_id} className="hover:bg-ink-50/60">
                    <td className="px-4 py-3">
                      <Link to={`/admin/students/${s.student_id}`} className="block">
                        <p className="font-medium text-ink-900">{s.name || "—"}</p>
                        <p className="text-xs text-ink-500">{s.email}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {s.institution || "—"}
                      {s.major ? ` · ${s.major}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={s.is_active ? "success" : "danger"}>
                        {s.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {s.totp_enrolled ? (
                        <Badge tone="brand">
                          <ShieldCheck className="h-3 w-3" /> Enrolled
                        </Badge>
                      ) : (
                        <Badge tone="neutral">Not enrolled</Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-400">
                      {formatDate(s.date_joined)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/admin/students/${s.student_id}`}>
                          <Button variant="ghost" size="sm" icon={Eye} title="View student" />
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Trash2}
                          onClick={() => setDeleting(s)}
                          className="text-red-500 hover:bg-red-50 hover:text-red-600"
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

      <DeleteStudentModal student={deleting} onClose={() => setDeleting(null)} onDeleted={refetch} />
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function DeleteStudentModal({ student, onClose, onDeleted }) {
  const { execute, loading, error } = useAction(() => deleteStudent(student.student_id));

  const handleConfirm = async () => {
    try {
      await execute();
      toast.success("Student deleted");
      onClose();
      onDeleted();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <ConfirmModal
      open={!!student}
      onClose={onClose}
      onConfirm={handleConfirm}
      loading={loading}
      error={error}
      title="Delete student"
      confirmLabel="Delete permanently"
      description={
        student
          ? `This permanently deletes ${student.email}'s login and purges their profile, resumes, GitHub/LinkedIn analyses, fit assessments, roadmaps, and chat history. This can't be undone.`
          : ""
      }
    />
  );
}
