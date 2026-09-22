import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarRange,
  Table as TableIcon,
  TrendingUp,
  Users,
} from "lucide-react";

import PageHeader from "../../components/layout/PageHeader";
import Card, { CardBody, CardHeader } from "../../components/common/Card";
import { Field, Select } from "../../components/common/Input";
import Button from "../../components/common/Button";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import EmptyState from "../../components/common/EmptyState";

import { getEscalationMetrics, listUniversities } from "../../api/superuserApi";
import { useAsync } from "../../hooks/useAsync";

const WEEK_OPTIONS = [4, 8, 12, 26, 52];

const GROUP_ORDER = ["money", "admissions", "international", "campus_life"];
const GROUP_META = {
  money: { label: "Money", color: "#2a78d6" },
  admissions: { label: "Admissions", color: "#eb6834" },
  international: { label: "International", color: "#1baf7a" },
  campus_life: { label: "Campus Life", color: "#eda100" },
};
const UNGROUPED_COLOR = "#cbd5e1";
const UNGROUPED_LABEL = "Ungrouped";

export default function EscalationMetricsPage() {
  const [universityId, setUniversityId] = useState("");
  const [weeks, setWeeks] = useState(12);
  const [showTable, setShowTable] = useState(false);

  const { data: universitiesData } = useAsync(() => listUniversities(), []);
  const universities = universitiesData?.universities || [];

  const { data, loading, error, refetch } = useAsync(
    () => getEscalationMetrics({ universityId: universityId || undefined, weeks }),
    [universityId, weeks]
  );

  const weekRows = data?.weeks || [];

  const summary = useMemo(() => summarize(weekRows), [weekRows]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-2 pb-8">
      <PageHeader
        title="Escalation Metrics"
        description="Weekly escalation volume across universities, broken down by knowledge group."
      />

      {/* Filters — one row above everything they scope */}
      <Card className="rounded-2xl">
        <CardBody className="flex flex-wrap items-end gap-4 py-4">
          <div className="w-full max-w-xs">
            <Field label="University">
              <Select
                value={universityId}
                onChange={(e) => setUniversityId(e.target.value)}
              >
                <option value="">All universities</option>
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="w-full max-w-[160px]">
            <Field label="Time range">
              <Select
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
              >
                {WEEK_OPTIONS.map((w) => (
                  <option key={w} value={w}>
                    Last {w} weeks
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Button
            variant="secondary"
            icon={showTable ? BarChart3 : TableIcon}
            onClick={() => setShowTable((v) => !v)}
            className="ml-auto"
          >
            {showTable ? "Show charts" : "Show table"}
          </Button>
        </CardBody>
      </Card>

      {loading ? (
        <Spinner label="Loading escalation metrics..." />
      ) : error ? (
        <ErrorBanner error={error} onDismiss={refetch} />
      ) : weekRows.length === 0 ? (
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title="No escalations in this range"
            description="Nothing was escalated to a human contact for the selected university and time range."
          />
        </Card>
      ) : (
        <>
          {/* Stat tiles */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              icon={AlertTriangle}
              color="blue"
              label="Total escalations"
              value={summary.total.toLocaleString()}
              subtitle={`${weekRows.length} week${weekRows.length === 1 ? "" : "s"} with data`}
            />
            <StatTile
              icon={TrendingUp}
              color="orange"
              label="Weekly average"
              value={summary.weeklyAverage.toFixed(1)}
              subtitle="escalations / week"
            />
            <StatTile
              icon={Users}
              color="green"
              label="Escalations / student"
              value={summary.perStudentAverage.toFixed(2)}
              subtitle="weighted by weekly students"
            />
            <StatTile
              icon={CalendarRange}
              color="purple"
              label="Peak week"
              value={summary.peak ? formatWeekLabel(summary.peak.week_start) : "—"}
              subtitle={summary.peak ? `${summary.peak.total_escalations} escalations` : ""}
            />
          </div>

          {showTable ? (
            <MetricsTable weeks={weekRows} />
          ) : (
            <>
              <Card>
                <CardHeader
                  icon={BarChart3}
                  title="Escalations by week"
                  subtitle="Stacked by knowledge group. Hover a bar for the weekly breakdown."
                />
                <CardBody>
                  <StackedBarChart weeks={weekRows} />
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  icon={TrendingUp}
                  title="Escalations per student"
                  subtitle="Weekly rate — excludes escalations with no known student from the denominator."
                />
                <CardBody>
                  <TrendLineChart weeks={weekRows} />
                </CardBody>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ===================================================== */
/* Stat tile */
/* ===================================================== */

const STAT_COLOR_STYLES = {
  blue: { bg: "bg-blue-50", text: "text-blue-600" },
  green: { bg: "bg-green-50", text: "text-green-600" },
  orange: { bg: "bg-orange-50", text: "text-orange-600" },
  purple: { bg: "bg-purple-50", text: "text-purple-600" },
};

function StatTile({ icon: Icon, color, label, value, subtitle }) {
  const style = STAT_COLOR_STYLES[color] || STAT_COLOR_STYLES.blue;
  return (
    <Card className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${style.bg}`}>
          <Icon className={`h-6 w-6 ${style.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-3xl font-bold leading-none text-ink-900">{value}</h3>
          <p className="mt-1 text-sm font-semibold text-ink-700">{label}</p>
          {subtitle && <p className={`mt-2 text-xs font-medium ${style.text}`}>{subtitle}</p>}
        </div>
      </div>
    </Card>
  );
}

/* ===================================================== */
/* Table view — the accessible fallback for both charts */
/* ===================================================== */

function MetricsTable({ weeks }) {
  return (
    <Card>
      <CardHeader icon={TableIcon} title="Weekly detail" subtitle="Every value shown in the charts, in one table." />
      <CardBody className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
              <th className="py-3 pr-4">Week of</th>
              <th className="py-3 pr-4 text-right">Total</th>
              <th className="py-3 pr-4 text-right">Students</th>
              <th className="py-3 pr-4 text-right">Per student</th>
              {GROUP_ORDER.map((slug) => (
                <th key={slug} className="py-3 pr-4 text-right">
                  {GROUP_META[slug].label}
                </th>
              ))}
              <th className="py-3 pr-4 text-right">{UNGROUPED_LABEL}</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => {
              const byGroup = w.by_group || {};
              const grouped = GROUP_ORDER.reduce((sum, slug) => sum + (byGroup[slug] || 0), 0);
              const ungrouped = Math.max(0, (w.total_escalations || 0) - grouped);
              return (
                <tr key={w.week_start} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 pr-4 font-medium text-ink-800">{formatWeekLabel(w.week_start)}</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-ink-800">{w.total_escalations}</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-ink-600">{w.distinct_students}</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-ink-600">
                    {Number(w.escalations_per_student ?? 0).toFixed(2)}
                  </td>
                  {GROUP_ORDER.map((slug) => (
                    <td key={slug} className="py-3 pr-4 text-right tabular-nums text-ink-600">
                      {byGroup[slug] || 0}
                    </td>
                  ))}
                  <td className="py-3 pr-4 text-right tabular-nums text-ink-400">{ungrouped}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}

/* ===================================================== */
/* Stacked bar chart — total escalations by week, by group */
/* ===================================================== */

const VIEW_W = 1000;
const VIEW_H = 300;
const PAD = { top: 28, right: 16, bottom: 36, left: 40 };

function StackedBarChart({ weeks }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const plotW = VIEW_W - PAD.left - PAD.right;
  const plotH = VIEW_H - PAD.top - PAD.bottom;

  const rawMax = Math.max(1, ...weeks.map((w) => w.total_escalations || 0));
  const yMax = niceMax(rawMax);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(yMax * f));

  const bandW = plotW / weeks.length;
  const barW = Math.min(24, bandW * 0.55);

  const bars = weeks.map((w, i) => {
    const byGroup = w.by_group || {};
    const groupedTotal = GROUP_ORDER.reduce((sum, slug) => sum + (byGroup[slug] || 0), 0);
    const ungrouped = Math.max(0, (w.total_escalations || 0) - groupedTotal);

    const segments = [
      ...GROUP_ORDER.map((slug) => ({
        slug,
        label: GROUP_META[slug].label,
        color: GROUP_META[slug].color,
        value: byGroup[slug] || 0,
      })),
      { slug: "__ungrouped", label: UNGROUPED_LABEL, color: UNGROUPED_COLOR, value: ungrouped },
    ].filter((s) => s.value > 0);

    const x = PAD.left + bandW * i + (bandW - barW) / 2;
    let cursorY = PAD.top + plotH; // baseline

    const rendered = segments.map((seg, segIndex) => {
      const h = (seg.value / yMax) * plotH;
      const y = cursorY - h;
      const isTop = segIndex === segments.length - 1;
      cursorY = y;
      return { ...seg, x, y, h, isTop };
    });

    return { week: w, x, bandCenter: PAD.left + bandW * i + bandW / 2, segments: rendered };
  });

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        height={VIEW_H}
        preserveAspectRatio="none"
        role="img"
        aria-label="Escalations per week, stacked by knowledge group"
      >
        {/* Gridlines */}
        {yTicks.map((t) => {
          const y = PAD.top + plotH - (t / yMax) * plotH;
          return (
            <g key={t}>
              <line x1={PAD.left} x2={VIEW_W - PAD.right} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={PAD.left - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="#94a3b8">
                {t.toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {bars.map((bar, i) => (
          <g
            key={bar.week.week_start}
            onPointerEnter={() => setHoverIndex(i)}
            onPointerLeave={() => setHoverIndex((v) => (v === i ? null : v))}
            style={{ cursor: "pointer" }}
          >
            {/* Wide, invisible hit target */}
            <rect x={PAD.left + bandW * i} y={PAD.top} width={bandW} height={plotH} fill="transparent" />
            {bar.segments.map((seg) =>
              seg.isTop ? (
                <path key={seg.slug} d={topRoundedRectPath(seg.x, seg.y, barW, Math.max(seg.h, 1), 4)} fill={seg.color} opacity={hoverIndex === null || hoverIndex === i ? 1 : 0.45} />
              ) : (
                <rect
                  key={seg.slug}
                  x={seg.x}
                  y={seg.y}
                  width={barW}
                  height={Math.max(seg.h, 1)}
                  fill={seg.color}
                  opacity={hoverIndex === null || hoverIndex === i ? 1 : 0.45}
                />
              )
            )}
            <text
              x={bar.bandCenter}
              y={VIEW_H - PAD.bottom + 18}
              textAnchor="middle"
              fontSize="11"
              fill="#64748b"
            >
              {formatWeekLabel(bar.week.week_start)}
            </text>
          </g>
        ))}

        {/* Baseline */}
        <line x1={PAD.left} x2={VIEW_W - PAD.right} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke="#cbd5e1" strokeWidth="1" />

        {/* Tooltip */}
        {hoverIndex !== null && <BarTooltip bar={bars[hoverIndex]} plotTop={PAD.top} />}
      </svg>

      <Legend
        items={[...GROUP_ORDER.map((s) => ({ label: GROUP_META[s].label, color: GROUP_META[s].color })), { label: UNGROUPED_LABEL, color: UNGROUPED_COLOR }]}
      />
    </div>
  );
}

function BarTooltip({ bar, plotTop }) {
  const total = bar.segments.reduce((s, seg) => s + seg.value, 0);
  const rows = [...bar.segments].reverse();
  const boxW = 190;
  const boxH = 24 + rows.length * 16 + 10;
  let boxX = bar.bandCenter - boxW / 2;
  boxX = Math.max(6, Math.min(VIEW_W - boxW - 6, boxX));
  const boxY = Math.max(4, plotTop - boxH - 6);

  return (
    <g pointerEvents="none">
      <rect x={boxX} y={boxY} width={boxW} height={boxH} rx="8" fill="#0f172a" opacity="0.95" />
      <text x={boxX + 12} y={boxY + 18} fontSize="12" fontWeight="600" fill="#ffffff">
        {formatWeekLabel(bar.week.week_start, true)}
      </text>
      {rows.map((r, i) => (
        <g key={r.slug}>
          <line x1={boxX + 12} x2={boxX + 22} y1={boxY + 34 + i * 16} y2={boxY + 34 + i * 16} stroke={r.color} strokeWidth="3" />
          <text x={boxX + 28} y={boxY + 38 + i * 16} fontSize="11" fill="#cbd5e1">
            {r.label}
          </text>
          <text x={boxX + boxW - 12} y={boxY + 38 + i * 16} textAnchor="end" fontSize="11" fontWeight="600" fill="#ffffff">
            {r.value}
          </text>
        </g>
      ))}
      <text x={boxX + 12} y={boxY + boxH - 6} fontSize="11" fill="#94a3b8">
        Total
      </text>
      <text x={boxX + boxW - 12} y={boxY + boxH - 6} textAnchor="end" fontSize="11" fontWeight="700" fill="#ffffff">
        {total}
      </text>
    </g>
  );
}

/* ===================================================== */
/* Trend line chart — escalations per student */
/* ===================================================== */

function TrendLineChart({ weeks }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const plotW = VIEW_W - PAD.left - PAD.right;
  const plotH = VIEW_H - PAD.top - PAD.bottom;

  const values = weeks.map((w) => Number(w.escalations_per_student ?? 0));
  const rawMax = Math.max(0.1, ...values);
  const yMax = niceMaxDecimal(rawMax);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => yMax * f);

  const stepX = weeks.length > 1 ? plotW / (weeks.length - 1) : 0;
  const points = weeks.map((w, i) => {
    const x = weeks.length > 1 ? PAD.left + stepX * i : PAD.left + plotW / 2;
    const y = PAD.top + plotH - (values[i] / yMax) * plotH;
    return { x, y, week: w, value: values[i] };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${PAD.top + plotH} L${points[0].x},${PAD.top + plotH} Z`;

  const last = points[points.length - 1];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        height={VIEW_H}
        preserveAspectRatio="none"
        role="img"
        aria-label="Escalations per student, per week"
      >
        {yTicks.map((t, i) => {
          const y = PAD.top + plotH - (t / yMax) * plotH;
          return (
            <g key={i}>
              <line x1={PAD.left} x2={VIEW_W - PAD.right} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={PAD.left - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="#94a3b8">
                {t.toFixed(2)}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="#2a78d6" opacity="0.1" />
        <path d={linePath} fill="none" stroke="#2a78d6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* End marker + direct label */}
        <circle cx={last.x} cy={last.y} r="4" fill="#2a78d6" stroke="#ffffff" strokeWidth="2" />
        <text x={Math.min(last.x, VIEW_W - PAD.right - 4)} y={Math.max(last.y - 12, PAD.top + 10)} textAnchor="end" fontSize="12" fontWeight="600" fill="#0f172a">
          {last.value.toFixed(2)}
        </text>

        {/* Hover targets + x labels */}
        {points.map((p, i) => (
          <g key={p.week.week_start}>
            <rect
              x={p.x - (stepX || plotW) / 2}
              y={PAD.top}
              width={stepX || plotW}
              height={plotH}
              fill="transparent"
              onPointerEnter={() => setHoverIndex(i)}
              onPointerLeave={() => setHoverIndex((v) => (v === i ? null : v))}
              style={{ cursor: "pointer" }}
            />
            <text x={p.x} y={VIEW_H - PAD.bottom + 18} textAnchor="middle" fontSize="11" fill="#64748b">
              {formatWeekLabel(p.week.week_start)}
            </text>
          </g>
        ))}

        {hoverIndex !== null && (
          <>
            <line
              x1={points[hoverIndex].x}
              x2={points[hoverIndex].x}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="#94a3b8"
              strokeWidth="1"
            />
            <circle cx={points[hoverIndex].x} cy={points[hoverIndex].y} r="4" fill="#2a78d6" stroke="#ffffff" strokeWidth="2" />
            <LineTooltip point={points[hoverIndex]} plotTop={PAD.top} />
          </>
        )}
      </svg>
    </div>
  );
}

function LineTooltip({ point, plotTop }) {
  const boxW = 150;
  const boxH = 48;
  let boxX = point.x - boxW / 2;
  boxX = Math.max(6, Math.min(VIEW_W - boxW - 6, boxX));
  const boxY = Math.max(4, plotTop - boxH - 6);

  return (
    <g pointerEvents="none">
      <rect x={boxX} y={boxY} width={boxW} height={boxH} rx="8" fill="#0f172a" opacity="0.95" />
      <text x={boxX + 12} y={boxY + 18} fontSize="11" fill="#cbd5e1">
        {formatWeekLabel(point.week.week_start, true)}
      </text>
      <text x={boxX + 12} y={boxY + 36} fontSize="14" fontWeight="700" fill="#ffffff">
        {point.value.toFixed(2)} / student
      </text>
    </g>
  );
}

/* ===================================================== */
/* Legend */
/* ===================================================== */

function Legend({ items }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 px-1">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-xs font-medium text-ink-600">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </div>
      ))}
    </div>
  );
}

/* ===================================================== */
/* Utilities */
/* ===================================================== */

function summarize(weeks) {
  const total = weeks.reduce((s, w) => s + (w.total_escalations || 0), 0);
  const weeklyAverage = weeks.length ? total / weeks.length : 0;

  const weightedNumerator = weeks.reduce(
    (s, w) => s + Number(w.escalations_per_student ?? 0) * (w.distinct_students || 0),
    0
  );
  const weightedDenominator = weeks.reduce((s, w) => s + (w.distinct_students || 0), 0);
  const perStudentAverage = weightedDenominator ? weightedNumerator / weightedDenominator : 0;

  const peak = weeks.reduce(
    (best, w) => (!best || (w.total_escalations || 0) > best.total_escalations ? w : best),
    null
  );

  return { total, weeklyAverage, perStudentAverage, peak };
}

function formatWeekLabel(weekStart, long = false) {
  const d = new Date(`${weekStart}T00:00:00`);
  if (Number.isNaN(d.getTime())) return weekStart;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: long ? "numeric" : undefined,
  });
}

function niceMax(v) {
  if (v <= 0) return 4;
  const exp = Math.floor(Math.log10(v));
  const base = 10 ** exp;
  const norm = v / base;
  let niceNorm;
  if (norm <= 1) niceNorm = 1;
  else if (norm <= 2) niceNorm = 2;
  else if (norm <= 5) niceNorm = 5;
  else niceNorm = 10;
  return Math.max(4, niceNorm * base);
}

function niceMaxDecimal(v) {
  if (v <= 0) return 1;
  const steps = [0.25, 0.5, 1, 1.5, 2, 3, 4, 5, 8, 10, 15, 20];
  return steps.find((s) => s >= v) || Math.ceil(v);
}

function topRoundedRectPath(x, y, w, h, r) {
  const radius = Math.min(r, h, w / 2);
  return `M${x},${y + h} L${x},${y + radius} Q${x},${y} ${x + radius},${y} L${x + w - radius},${y} Q${x + w},${y} ${x + w},${y + radius} L${x + w},${y + h} Z`;
}
