import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import clsx from "clsx";
import { BrainCircuit, Inbox, Mail, Send } from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Badge, { queryStatusTone } from "../common/Badge";
import ErrorBanner from "../common/ErrorBanner";
import EmptyState from "../common/EmptyState";
import Spinner from "../common/Spinner";
import { Field, Textarea } from "../common/Input";
import * as universityAdminApi from "../../api/universityAdminApi";
import { useAction, useAsync } from "../../hooks/useAsync";
import { formatDateTime } from "../../lib/text";

const SOURCE_LABELS = {
  human_verified: "Human verified",
  seed: "Profile",
  manual: "Manual",
  scraped: "Scraped",
  conversation: "Learned in chat",
};

const TABS = [
  { key: "escalations", label: "Escalations" },
  { key: "facts", label: "Facts" }
];

export default function GroupKnowledgeModal({ slug, label, open, onClose }) {
  const [tab, setTab] = useState("escalations");

  // Reset to the facts tab whenever a different group is opened.
  useEffect(() => {
    if (open) setTab("escalations");
  }, [open, slug]);

  const facts = useAsync(
    (signal) => universityAdminApi.getKnowledgeGroupKnowledge(slug, signal),
    [slug, open],
    { enabled: open && !!slug }
  );

  // Only fetched once the tab is actually opened — the two lists are separate calls.
  const escalations = useAsync(
    (signal) => universityAdminApi.getKnowledgeGroupEscalations(slug, signal),
    [slug, open, tab],
    { enabled: open && !!slug && tab === "escalations" }
  );

  // Both responses carry the same group object; prefer the freshest one loaded.
  const group = escalations.data?.group || facts.data?.group;
  const active = tab === "facts" ? facts : escalations;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`${label} · ${tab === "facts" ? "facts" : "escalations"}`}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="inline-flex rounded-lg bg-ink-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={clsx(
                "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
                tab === t.key ? "bg-white text-brand-700 shadow-sm" : "text-ink-500 hover:text-ink-800"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {active.error && <ErrorBanner error={active.error} onDismiss={active.refetch} />}

        {group && (
          <div className="rounded-lg border border-ink-100 bg-ink-50/60 p-3 text-xs text-ink-500">
            {group.escalation_count} escalation{group.escalation_count === 1 ? "" : "s"} routed here
            {group.escalation_contact_name && (
              <>
                {" "}
                · contact: {group.escalation_contact_name}
                {group.escalation_contact_email && ` (${group.escalation_contact_email})`}
              </>
            )}
          </div>
        )}

        {active.loading ? (
          <Spinner label={tab === "facts" ? "Loading facts..." : "Loading escalations..."} />
        ) : active.error ? null : tab === "facts" ? (
          <FactsList facts={facts.data?.knowledge || []} />
        ) : (
          <EscalationsList
            slug={slug}
            group={group}
            escalations={escalations.data?.escalations || []}
          />
        )}
      </div>
    </Modal>
  );
}

function FactsList({ facts }) {
  if (facts.length === 0) {
    return (
      <EmptyState
        icon={BrainCircuit}
        title="No facts in this group yet"
        description="Assign facts to this group from the Knowledge Base page."
      />
    );
  }

  return (
    <div className="space-y-3">
      {facts.map((fact) => (
        <div key={fact.id} className="rounded-lg border border-ink-100 bg-white p-3">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{SOURCE_LABELS[fact.source_type] || fact.source_type}</Badge>
            {fact.times_used > 0 && (
              <span className="text-xs text-ink-400">used {fact.times_used}×</span>
            )}
          </div>
          <p className="text-sm font-medium text-ink-900">{fact.topic}</p>
          <p className="mt-1 text-sm text-ink-700">{fact.content}</p>
        </div>
      ))}
    </div>
  );
}

function EscalationsList({ slug, group, escalations }) {
  const [selected, setSelected] = useState([]);
  const [composing, setComposing] = useState(false);
  const [message, setMessage] = useState("");

  const pending = escalations.filter((e) => e.status === "pending");
  const hasContactEmail = !!group?.escalation_contact_email;

  useEffect(() => {
    setSelected([]);
    setComposing(false);
    setMessage("");
  }, [slug]);

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // No selection means "every still-pending escalation" — the API's default when
  // escalation_ids is omitted.
  const targetCount = selected.length || pending.length;

  const { execute, loading, error } = useAction(() =>
    universityAdminApi.notifyKnowledgeGroupEscalations(slug, {
      escalationIds: selected,
      message,
    })
  );

  const handleNotify = async () => {
    try {
      const res = await execute();
      toast.success(
        `Digest sent to ${res.to} · ${res.escalation_count} escalation${res.escalation_count === 1 ? "" : "s"
        }`
      );
      setComposing(false);
      setMessage("");
      setSelected([]);
    } catch (err) {
      // 502 means the send itself failed downstream — the request is safe to repeat.
      toast.error(
        err.status === 502 ? "Couldn't send the digest — safe to try again." : err.message
      );
    }
  };

  if (escalations.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No escalations routed here yet"
        description="Questions an agent can't answer confidently and that match this group will show up here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-500">
          {group?.escalation_contact_email
            ? `Each escalation is emailed to ${group.escalation_contact_email} automatically. Nudge to re-send.`
            : "Set a contact email for this group to enable escalation emails."}
        </p>
        <Button
          size="sm"
          variant="secondary"
          icon={Mail}
          onClick={() => setComposing((v) => !v)}
          disabled={!hasContactEmail || pending.length === 0}
        >
          Nudge contact
        </Button>
      </div>

      {composing && (
        <div className="space-y-3 rounded-lg border border-ink-200 bg-white p-3">
          {error && <ErrorBanner error={error} />}
          <p className="text-xs text-ink-500">
            {selected.length > 0
              ? `Re-sending ${selected.length} selected escalation${selected.length === 1 ? "" : "s"}.`
              : `Re-sending all ${pending.length} still-pending escalation${pending.length === 1 ? "" : "s"
              } — tick individual ones below to narrow it down.`}
          </p>
          <Field label="Note" hint="Optional — prepended to the email">
            <Textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Please prioritise these before Friday."
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setComposing(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              icon={Send}
              loading={loading}
              disabled={targetCount === 0}
              onClick={handleNotify}
            >
              Send digest
            </Button>
          </div>
        </div>
      )}

      {escalations.map((esc) => (
        <EscalationCard
          key={esc.id}
          escalation={esc}
          selectable={composing && esc.status === "pending"}
          checked={selected.includes(esc.id)}
          onToggle={() => toggle(esc.id)}
        />
      ))}
    </div>
  );
}

function EscalationCard({ escalation, selectable, checked, onToggle }) {
  const answered = escalation.display_status === "answered";

  return (
    <div className="flex gap-3 rounded-lg border border-ink-100 bg-white p-3">
      {selectable && (
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          aria-label={`Include escalation #${escalation.id} in the digest`}
          className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Badge tone={queryStatusTone(escalation.display_status)}>
            {escalation.display_status}
          </Badge>
          {escalation.priority === "urgent" && <Badge tone="danger">urgent</Badge>}
          <span className="text-xs text-ink-400">#{escalation.id}</span>
          {escalation.student_name && (
            <span className="text-xs text-ink-500">· {escalation.student_name}</span>
          )}
          {escalation.program && (
            <span className="text-xs text-ink-500">· {escalation.program}</span>
          )}
        </div>

        <p className="text-sm font-medium text-ink-900">{escalation.question}</p>

        {escalation.urgency_reason && (
          <p className="mt-1 text-xs text-ink-500">{escalation.urgency_reason}</p>
        )}

        {escalation.routed_to_name && (
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-500">
            <Send className="h-3 w-3 shrink-0" />
            Routed to {escalation.routed_to_name}
            {escalation.routed_to_email && (
              <a
                href={`mailto:${escalation.routed_to_email}`}
                className="text-brand-600 hover:underline"
              >
                {escalation.routed_to_email}
              </a>
            )}
          </p>
        )}

        {answered && escalation.answer && (
          <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            {escalation.answered_by && (
              <span className="font-medium">{escalation.answered_by}: </span>
            )}
            {escalation.answer}
          </div>
        )}

        <p className="mt-1.5 text-xs text-ink-400">{formatDateTime(escalation.timestamp)}</p>
      </div>
    </div>
  );
}
