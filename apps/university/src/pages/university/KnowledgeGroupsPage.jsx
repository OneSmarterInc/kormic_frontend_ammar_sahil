import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Split, Save, List } from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import Card, { CardBody, CardHeader } from "../../components/common/Card";
import { Field, Input } from "../../components/common/Input";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import ErrorBanner from "../../components/common/ErrorBanner";
import Spinner from "../../components/common/Spinner";
import GroupKnowledgeModal from "../../components/university/GroupKnowledgeModal";
import * as universityAdminApi from "../../api/universityAdminApi";
import { useAction, useAsync } from "../../hooks/useAsync";
import { knowledgeGroupTone } from "../../lib/knowledgeGroups";
import { formatDateTime } from "../../lib/text";

export default function KnowledgeGroupsPage() {
  const { data, loading, error, refetch, setData } = useAsync(
    universityAdminApi.listKnowledgeGroups,
    []
  );
  const [viewingGroup, setViewingGroup] = useState(null); // group object or null

  const groups = data?.groups || [];

  const handleUpdated = (updated) => {
    setData((prev) => ({
      groups: prev.groups.map((g) => (g.slug === updated.slug ? updated : g)),
    }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Groups"
        description="Route escalated questions to the right office. Assign facts and queries to a group below, then set who gets contacted for each one."
      />

      {loading ? (
        <Spinner label="Loading knowledge groups..." />
      ) : error ? (
        <ErrorBanner error={error} onDismiss={refetch} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map((group) => (
            <GroupCard
              key={group.slug}
              group={group}
              onUpdated={handleUpdated}
              onViewList={() => setViewingGroup(group)}
            />
          ))}
        </div>
      )}

      <GroupKnowledgeModal
        slug={viewingGroup?.slug}
        label={viewingGroup?.label}
        open={!!viewingGroup}
        onClose={() => setViewingGroup(null)}
      />
    </div>
  );
}

function GroupCard({ group, onUpdated, onViewList }) {
  const [name, setName] = useState(group.escalation_contact_name || "");
  const [email, setEmail] = useState(group.escalation_contact_email || "");

  useEffect(() => {
    setName(group.escalation_contact_name || "");
    setEmail(group.escalation_contact_email || "");
  }, [group.escalation_contact_name, group.escalation_contact_email]);

  const dirty =
    name !== (group.escalation_contact_name || "") || email !== (group.escalation_contact_email || "");

  const { execute, loading, error } = useAction(() =>
    universityAdminApi.updateKnowledgeGroup(group.slug, {
      escalation_contact_name: name,
      escalation_contact_email: email,
    })
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const updated = await execute();
      onUpdated(updated);
      toast.success(`${group.label} contact saved`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Card>
      <CardHeader
        icon={Split}
        title={group.label}
        subtitle={`${group.escalation_count} escalation${group.escalation_count === 1 ? "" : "s"} routed here`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={knowledgeGroupTone(group.slug)}>{group.slug}</Badge>
            <Button type="button" size="sm" variant="secondary" icon={List} onClick={onViewList}>
              View list
            </Button>
          </div>
        }
      />

      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <ErrorBanner error={error} />}

          <Field label="Contact name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bursar Office"
            />
          </Field>

          <Field label="Contact email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="bursar@example.edu"
            />
          </Field>

          <div className="flex items-center justify-between">
            <Button type="submit" size="sm" icon={Save} loading={loading} disabled={!dirty}>
              Save
            </Button>
            {group.updated_at && (
              <span className="text-xs text-ink-400">
                Updated {formatDateTime(group.updated_at)}
              </span>
            )}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
