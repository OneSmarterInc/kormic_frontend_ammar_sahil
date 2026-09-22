import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  Check,
  Compass,
  FileText,
  Globe,
  Layers,
  ListChecks,
  Pencil,
  Plus,
  RotateCw,
  Sparkles,
  StopCircle,
  Trash2,
  X,
} from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import Card, { CardBody, CardHeader } from "../../components/common/Card";
import { Input } from "../../components/common/Input";
import Button from "../../components/common/Button";
import Badge, { autoDiscoverStatusTone } from "../../components/common/Badge";
import ErrorBanner from "../../components/common/ErrorBanner";
import EmptyState from "../../components/common/EmptyState";
import Spinner from "../../components/common/Spinner";
import AutoDiscoverResultsModal from "../../components/university/AutoDiscoverResultsModal";
import AutoDiscoverClustersModal from "../../components/university/AutoDiscoverClustersModal";
import ScrapeResultModal from "../../components/university/ScrapeResultModal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import * as universityAdminApi from "../../api/universityAdminApi";
import { useAction, useAsync } from "../../hooks/useAsync";
import { isValidUrl } from "../../lib/validators";

const ACTIVE_JOB_STATUSES = ["queued", "running", "stop_requested"];
const SCRAPE_ACTIVE_STATUSES = ["queued", "running"];
const POLL_INTERVAL_MS = 3000;
const DEFAULT_MAX_PAGES = 1;

export default function ScrapeSourcesPage() {
  const [urls, setUrls] = useState([]);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState("");
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [removingUrl, setRemovingUrl] = useState(null);

  const [editingUrl, setEditingUrl] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [editError, setEditError] = useState("");
  const [selectedUrls, setSelectedUrls] = useState([]);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  const [job, setJob] = useState(null);
  const [jobLoading, setJobLoading] = useState(true);
  const [jobError, setJobError] = useState(null);
  const [maxPages, setMaxPages] = useState(String(DEFAULT_MAX_PAGES));
  const [showResults, setShowResults] = useState(false);
  const [showClusters, setShowClusters] = useState(false);

  const [editingWebsite, setEditingWebsite] = useState(false);
  const [websiteDraft, setWebsiteDraft] = useState("");
  const [websiteError, setWebsiteError] = useState("");

  // { result, title, context } for the shared scrape-result modal, or null.
  const [resultModal, setResultModal] = useState(null);

  const [scrapeJob, setScrapeJob] = useState(null);
  const [scrapeJobLoading, setScrapeJobLoading] = useState(true);
  const [scrapeJobError, setScrapeJobError] = useState(null);
  const notifiedScrapeJobRef = useRef(null);

  const { data, loading, error, refetch } = useAsync(
    universityAdminApi.getScrapeUrls,
    []
  );

  // The website that Auto-discover crawls lives on the university profile.
  const {
    data: profile,
    loading: profileLoading,
    setData: setProfile,
  } = useAsync(universityAdminApi.getProfile, []);

  const websiteUrl = profile?.website_url || "";

  useEffect(() => {
    if (data) setUrls(data.scrape_urls || []);
  }, [data]);

  // Pull the saved-URL list again without flipping the card into its loading
  // spinner — used to reflect URLs a scrape/crawl just added without a page reload.
  const refreshSavedUrls = useCallback(async () => {
    try {
      const res = await universityAdminApi.getScrapeUrls();
      setUrls(res.scrape_urls || []);
    } catch {
      // Keep whatever's already on screen if the refresh fails.
    }
  }, []);

  // Drop any bulk selection that no longer exists after the list changes.
  useEffect(() => {
    setSelectedUrls((prev) => prev.filter((u) => urls.includes(u)));
  }, [urls]);

  // Latest auto-discover job, if any has ever run for this university.
  useEffect(() => {
    let cancelled = false;

    universityAdminApi
      .getLatestAutoDiscoverJob()
      .then((latest) => {
        if (!cancelled) setJob(latest);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status !== 404) setJobError(err);
      })
      .finally(() => {
        if (!cancelled) setJobLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Poll while the job is still active.
  useEffect(() => {
    if (!job || !ACTIVE_JOB_STATUSES.includes(job.status)) return;

    const timer = setTimeout(async () => {
      try {
        const updated = await universityAdminApi.getAutoDiscoverJob(job.id);
        setJob(updated);

        // Crawl just finished — reflect any pages it added to the saved list.
        if (["completed", "stopped"].includes(updated.status)) {
          refreshSavedUrls();
          if (updated.scrape_result) {
            toast.success(
              `Crawl complete — ${updated.scrape_result.total_facts_stored} fact(s) stored`
            );
          }
        }
      } catch (err) {
        setJobError(err);
      }
    }, POLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [job, refreshSavedUrls]);

  // Latest scrape-now job, if any has ever run for this university — lets a
  // reloaded page resume polling without having kept the job id client-side.
  useEffect(() => {
    let cancelled = false;

    universityAdminApi
      .getLatestScrapeJob()
      .then((latest) => {
        if (!cancelled) setScrapeJob(latest);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status !== 404) setScrapeJobError(err);
      })
      .finally(() => {
        if (!cancelled) setScrapeJobLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Poll while the scrape job is queued/running.
  useEffect(() => {
    if (!scrapeJob || !SCRAPE_ACTIVE_STATUSES.includes(scrapeJob.status)) return;

    const timer = setTimeout(async () => {
      try {
        const updated = await universityAdminApi.getScrapeJob(scrapeJob.id);
        setScrapeJob(updated);
      } catch (err) {
        setScrapeJobError(err);
      }
    }, POLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [scrapeJob]);

  // Toast once per job/status transition into a terminal state.
  useEffect(() => {
    if (!scrapeJob) return;
    const key = `${scrapeJob.id}:${scrapeJob.status}`;
    if (notifiedScrapeJobRef.current === key) return;

    if (scrapeJob.status === "completed") {
      notifiedScrapeJobRef.current = key;
      toast.success(`${scrapeJob.result?.total_facts_stored ?? 0} facts stored`);
      // Refresh the saved-URL list so newly scraped pages show without a reload.
      refreshSavedUrls();
    } else if (scrapeJob.status === "failed") {
      notifiedScrapeJobRef.current = key;
      toast.error(scrapeJob.error_message || "Scrape failed");
    }
  }, [scrapeJob, refreshSavedUrls]);

  const {
    execute: persist,
    loading: saving,
    error: saveError,
  } = useAction((next) => universityAdminApi.setScrapeUrls(next));

  const {
    execute: runScrape,
    loading: scraping,
    error: scrapeError,
  } = useAction(universityAdminApi.scrapeNow);

  const { execute: startDiscover, loading: starting } = useAction((n) =>
    universityAdminApi.startAutoDiscover(n)
  );

  const { execute: stopDiscover, loading: stopping } = useAction(() =>
    universityAdminApi.stopAutoDiscoverJob(job.id)
  );

  const { execute: saveWebsite, loading: savingWebsite } = useAction((url) =>
    universityAdminApi.updateProfile({ website_url: url })
  );

  const startEditWebsite = () => {
    setWebsiteDraft(websiteUrl);
    setWebsiteError("");
    setEditingWebsite(true);
  };

  const cancelEditWebsite = () => {
    setEditingWebsite(false);
    setWebsiteError("");
  };

  const handleSaveWebsite = async () => {
    const value = websiteDraft.trim();

    if (value && !isValidUrl(value)) {
      setWebsiteError("Enter a valid URL, including https:// (e.g. https://www.university.edu)");
      return;
    }

    if (value === websiteUrl) {
      cancelEditWebsite();
      return;
    }

    try {
      const updated = await saveWebsite(value);
      setProfile(updated);
      cancelEditWebsite();
      toast.success(value ? "Website URL saved" : "Website URL cleared");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const addUrl = async () => {
    const value = draft.trim();

    if (!value) return;

    if (!isValidUrl(value)) {
      const message = "Enter a valid URL, including https:// (e.g. https://university.edu/admissions)";
      setDraftError(message);
      toast.error(message);
      return;
    }

    if (urls.includes(value)) {
      setDraftError("This URL is already saved.");
      return;
    }

    const next = [...urls, value];

    try {
      const res = await persist(next);
      setUrls(res.scrape_urls);
      setDraft("");
      setDraftError("");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const removeUrl = async () => {
    const url = removingUrl;
    const next = urls.filter((u) => u !== url);

    try {
      const res = await persist(next);
      setUrls(res.scrape_urls);

      if (selectedUrl === url) {
        setSelectedUrl(null);
      }

      toast.success("URL removed");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRemovingUrl(null);
    }
  };

  const startEditUrl = (url) => {
    setEditingUrl(url);
    setEditDraft(url);
    setEditError("");
  };

  const cancelEditUrl = () => {
    setEditingUrl(null);
    setEditError("");
  };

  const saveEditUrl = async () => {
    const value = editDraft.trim();

    if (!value || value === editingUrl) {
      cancelEditUrl();
      return;
    }

    if (!isValidUrl(value)) {
      setEditError("Enter a valid URL, including https:// (e.g. https://university.edu/admissions)");
      return;
    }

    if (urls.includes(value)) {
      setEditError("This URL is already saved.");
      return;
    }

    const next = urls.map((u) => (u === editingUrl ? value : u));

    try {
      const res = await persist(next);
      setUrls(res.scrape_urls);
      if (selectedUrl === editingUrl) setSelectedUrl(value);
      setSelectedUrls((prev) => prev.map((u) => (u === editingUrl ? value : u)));
      cancelEditUrl();
      toast.success("URL updated");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggleSelectUrl = (url) =>
    setSelectedUrls((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );

  const allUrlsSelected = urls.length > 0 && selectedUrls.length === urls.length;

  const toggleSelectAllUrls = () =>
    setSelectedUrls(allUrlsSelected ? [] : [...urls]);

  const bulkDeleteUrls = async () => {
    const removeSet = new Set(selectedUrls);
    const next = urls.filter((u) => !removeSet.has(u));

    try {
      const res = await persist(next);
      setUrls(res.scrape_urls);
      if (removeSet.has(selectedUrl)) setSelectedUrl(null);
      if (removeSet.has(editingUrl)) cancelEditUrl();
      const count = removeSet.size;
      setSelectedUrls([]);
      setBulkConfirmOpen(false);
      toast.success(`${count} URL${count === 1 ? "" : "s"} removed`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleScrapeNow = async () => {
    try {
      const newJob = await runScrape();
      setScrapeJob(newJob);
      setScrapeJobError(null);
    } catch (err) {
      if (err.status === 409) {
        // Another scrape is already in progress — resume polling it instead of erroring out.
        try {
          setScrapeJob(await universityAdminApi.getLatestScrapeJob());
        } catch {
          toast.error(err.message);
        }
        return;
      }
      toast.error(err.message);
    }
  };

  const handleStartDiscover = async () => {
    const parsed = Number(maxPages);
    const value = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;

    try {
      const newJob = await startDiscover(value);
      setJob(newJob);
      setJobError(null);
      toast.success("Crawl started");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleStopDiscover = async () => {
    try {
      const updated = await stopDiscover();
      setJob(updated);
      toast.success("Stop requested");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleApplied = (nextScrapeUrls) => {
    setUrls(nextScrapeUrls);
    setShowResults(false);
  };

  const jobIsActive = !!job && ACTIVE_JOB_STATUSES.includes(job.status);
  const jobHasResults =
    !!job && ["completed", "stopped"].includes(job.status) && job.relevant_count + job.review_count > 0;
  const crawlProgress =
    job && job.pages_discovered > 0
      ? Math.min(100, Math.round((job.pages_crawled / job.pages_discovered) * 100))
      : 0;

  const scrapeJobIsActive = !!scrapeJob && SCRAPE_ACTIVE_STATUSES.includes(scrapeJob.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Sources"
        description="Save your program's official pages — scraping pulls durable facts straight into the knowledge base."
      />

      <Card>
        <CardHeader
          icon={Compass}
          title="Auto-discover"
          subtitle="Crawl your website to find admissions, tuition, and program pages automatically."
          action={
            jobIsActive ? (
              <Button
                variant="secondary"
                icon={StopCircle}
                onClick={handleStopDiscover}
                loading={stopping}
                disabled={job.status === "stop_requested"}
              >
                {job.status === "stop_requested" ? "Stopping..." : "Stop"}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={20}
                  max={400}
                  value={maxPages}
                  onChange={(e) => setMaxPages(e.target.value)}
                  className="max-w-12 hidden"
                  readOnly={true}
                  title="Max pages to crawl (20-400)"
                />
                <Button
                  icon={Sparkles}
                  onClick={handleStartDiscover}
                  loading={starting}
                  disabled={profileLoading || !websiteUrl}
                  title={!websiteUrl ? "Add a website URL below first" : undefined}
                >
                  {job ? "Run again" : "Start crawl"}
                </Button>
              </div>
            )
          }
        />

        <CardBody className="space-y-4">
          {jobError && <ErrorBanner error={jobError} onDismiss={() => setJobError(null)} />}

          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Auto-discover crawls your <strong>university's website</strong> — set the URL
              below to your own official <strong>base URL only</strong> (e.g.{" "}
              <span className="font-mono">https://www.university.edu</span>). Pointing it at
              any other site will fill your knowledge base with wrong facts. This is the same
              Website field as on your University Profile.
            </span>
          </div>

          <div className="rounded-lg border border-ink-100 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
                <Globe className="h-3.5 w-3.5" />
                Website URL
              </span>

              {!editingWebsite && !profileLoading && websiteUrl && (
                <button
                  type="button"
                  onClick={startEditWebsite}
                  className="rounded p-1 text-ink-400 hover:bg-blue-50 hover:text-blue-600"
                  title="Edit website URL"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {profileLoading ? (
              <p className="mt-1 text-sm text-ink-400">Loading…</p>
            ) : editingWebsite ? (
              <div className="mt-2 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Input
                    value={websiteDraft}
                    onChange={(e) => {
                      setWebsiteDraft(e.target.value);
                      setWebsiteError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSaveWebsite();
                      } else if (e.key === "Escape") {
                        cancelEditWebsite();
                      }
                    }}
                    placeholder="https://www.university.edu"
                    type="url"
                    error={websiteError}
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    icon={Check}
                    loading={savingWebsite}
                    onClick={handleSaveWebsite}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    icon={X}
                    onClick={cancelEditWebsite}
                  >
                    Cancel
                  </Button>
                </div>
                {websiteError && <p className="text-xs text-red-600">{websiteError}</p>}
              </div>
            ) : websiteUrl ? (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block truncate text-sm text-ink-700 hover:text-brand-600"
              >
                {websiteUrl}
              </a>
            ) : (
              <button
                type="button"
                onClick={startEditWebsite}
                className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Add website URL
              </button>
            )}
          </div>

          {jobLoading ? (
            <Spinner label="Checking for a previous crawl..." />
          ) : !job ? (
            <EmptyState
              icon={Compass}
              title="No crawl yet"
              description="Start a crawl above to auto-discover pages from your website, then review and add the ones you want."
            />
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={autoDiscoverStatusTone(job.status)}>{job.status.replace("_", " ")}</Badge>
                <span className="truncate text-sm text-ink-500">{job.base_url}</span>
              </div>

              {(job.status === "queued" || job.status === "running" || job.status === "stop_requested") && (
                <div className="space-y-1.5">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-brand-600 transition-all duration-500"
                      style={{ width: `${crawlProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-ink-400">
                    <span className="truncate">
                      {job.current_url || "Starting..."}
                    </span>
                    {/* <span className="shrink-0">
                      {job.pages_crawled} / {job.pages_discovered || "?"} pages
                    </span> */}
                  </div>
                </div>
              )}

              {job.status === "failed" && job.error_message && (
                <ErrorBanner error={job.error_message} />
              )}

              {/* <div className="flex flex-wrap gap-2">
                <Badge tone="success">{job.relevant_count} relevant</Badge>
                <Badge tone="warning">{job.review_count} review</Badge>
                <Badge tone="neutral">{job.excluded_count} excluded</Badge>
                {job.failed_count > 0 && <Badge tone="danger">{job.failed_count} failed</Badge>}
              </div> */}

              {["completed", "stopped"].includes(job.status) && (
                <div className="flex flex-wrap gap-2">
                  {/* <Badge tone="neutral">
                    {job.pages_crawled} {job.pages_crawled === 1 ? "page" : "pages"} crawled
                  </Badge> */}
                  {/* {job.relevant_count > 0 && (
                    <Badge tone="success">{job.relevant_count} relevant</Badge>
                  )} */}
                  {/* {job.review_count > 0 && (
                    <Badge tone="warning">{job.review_count} to review</Badge>
                  )} */}
                  {/* {job.excluded_count > 0 && (
                    <Badge tone="neutral">{job.excluded_count} excluded</Badge>
                  )} */}
                  {/* {job.failed_count > 0 && (
                    <Badge tone="danger">{job.failed_count} failed</Badge>
                  )} */}
                  {/* {job.auto_apply && <Badge tone="brand">auto-applied</Badge>} */}
                </div>
              )}

              {(jobHasResults || job.scrape_result) && (
                <div className="flex flex-wrap gap-2">
                  {jobHasResults && (
                    <>
                      <Button icon={ListChecks} variant="secondary" onClick={() => setShowResults(true)}>
                        Review discovered pages
                      </Button>
                      <Button icon={Layers} variant="secondary" onClick={() => setShowClusters(true)}>
                        Review by department
                      </Button>
                    </>
                  )}

                  {job.scrape_result && (
                    <Button
                      icon={FileText}
                      variant="secondary"
                      onClick={() =>
                        setResultModal({
                          result: job.scrape_result,
                          title: "Last scrape result",
                          context: job.completed_at
                            ? `${job.base_url} · finished ${new Date(job.completed_at).toLocaleString()}`
                            : job.base_url,
                        })
                      }
                    >
                      Last scrape result
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          icon={Globe}
          title="Saved URLs"
          action={
            <div className="flex items-center gap-2">
              {scrapeJobIsActive && (
                <Badge tone={autoDiscoverStatusTone(scrapeJob.status)}>{scrapeJob.status}</Badge>
              )}
              {!scrapeJobIsActive && scrapeJob?.status === "completed" && scrapeJob.result && (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={FileText}
                  onClick={() =>
                    setResultModal({
                      result: scrapeJob.result,
                      title: "Last scrape result",
                      context: `${scrapeJob.result.total_facts_stored} fact(s) across ${scrapeJob.result.results.length} URL(s)`,
                    })
                  }
                >
                  View result
                </Button>
              )}
              <Button
                icon={RotateCw}
                loading={scraping}
                onClick={handleScrapeNow}
                disabled={urls.length === 0 || scrapeJobIsActive || scrapeJobLoading}
              >
                {scrapeJobIsActive ? "Scraping..." : "Scrape now"}
              </Button>
            </div>
          }
        />

        <CardBody className="space-y-4">
          {scrapeError && <ErrorBanner error={scrapeError} />}
          {scrapeJobError && (
            <ErrorBanner error={scrapeJobError} onDismiss={() => setScrapeJobError(null)} />
          )}
          {scrapeJob?.status === "failed" && scrapeJob.error_message && (
            <ErrorBanner error={scrapeJob.error_message} />
          )}
          {saveError && <ErrorBanner error={saveError} />}

          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setDraftError("");
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                addUrl();
              }}
              placeholder="https://university.edu/admissions/international"
              type="url"
              error={draftError}
            />

            <Button
              icon={Plus}
              onClick={addUrl}
              loading={saving}
              disabled={!draft.trim()}
            >
              Add
            </Button>
          </div>

          {draftError && <p className="text-xs text-red-600">{draftError}</p>}

          <p className="text-xs text-ink-400">
            Add pages that belong to your own university's website only — URLs from other
            sites will feed wrong facts into your knowledge base.
          </p>

          {loading ? (
            <Spinner label="Loading saved URLs..." />
          ) : error ? (
            <ErrorBanner error={error} onDismiss={refetch} />
          ) : urls.length === 0 ? (
            <EmptyState
              icon={Globe}
              title="No URLs saved yet"
              description="Add your admissions or program pages above, or use auto-discover, then hit Scrape now."
            />
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 bg-ink-50/60 px-3 py-2">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-ink-600">
                  <input
                    type="checkbox"
                    checked={allUrlsSelected}
                    onChange={toggleSelectAllUrls}
                    className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                  />
                  {selectedUrls.length > 0 ? `${selectedUrls.length} selected` : "Select all"}
                </label>

                {selectedUrls.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    icon={Trash2}
                    loading={saving}
                    onClick={() => setBulkConfirmOpen(true)}
                  >
                    Delete selected ({selectedUrls.length})
                  </Button>
                )}
              </div>

              <ul className="space-y-2">
                {urls.map((url) => {
                  const isSelected = selectedUrl === url;
                  const isChecked = selectedUrls.includes(url);
                  const isEditing = editingUrl === url;

                  return (
                    <li
                      key={url}
                      onClick={() => !isEditing && setSelectedUrl(url)}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-all duration-150 hover:border-blue-500 hover:bg-blue-50/40 hover:shadow-sm ${
                        isEditing ? "cursor-default" : "cursor-pointer"
                      } ${
                        isChecked
                          ? "border-brand-400 bg-brand-50/40"
                          : isSelected
                            ? "border-blue-500 bg-blue-50/50 shadow-sm"
                            : "border-ink-100 bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSelectUrl(url)}
                        className="h-4 w-4 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                      />

                      {isEditing ? (
                        <div
                          className="flex flex-1 flex-col gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-2">
                            <Input
                              value={editDraft}
                              onChange={(e) => {
                                setEditDraft(e.target.value);
                                setEditError("");
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  saveEditUrl();
                                } else if (e.key === "Escape") {
                                  cancelEditUrl();
                                }
                              }}
                              type="url"
                              error={editError}
                              autoFocus
                            />
                            <Button
                              type="button"
                              size="sm"
                              icon={Check}
                              loading={saving}
                              onClick={saveEditUrl}
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              icon={X}
                              onClick={cancelEditUrl}
                            >
                              Cancel
                            </Button>
                          </div>
                          {editError && <p className="text-xs text-red-600">{editError}</p>}
                        </div>
                      ) : (
                        <>
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUrl(url);
                            }}
                            className="flex-1 truncate text-ink-700 hover:text-brand-600"
                          >
                            {url}
                          </a>

                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditUrl(url);
                              }}
                              className="rounded p-1 text-ink-400 hover:bg-blue-50 hover:text-blue-600"
                              title="Edit URL"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRemovingUrl(url);
                              }}
                              className="rounded p-1 text-ink-400 hover:bg-red-50 hover:text-red-600"
                              title="Remove URL"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </CardBody>
      </Card>

      <ScrapeResultModal
        open={!!resultModal}
        onClose={() => setResultModal(null)}
        result={resultModal?.result}
        title={resultModal?.title}
        context={resultModal?.context}
      />

      {job && (
        <AutoDiscoverResultsModal
          jobId={job.id}
          open={showResults}
          onClose={() => setShowResults(false)}
          onApplied={handleApplied}
        />
      )}

      {job && (
        <AutoDiscoverClustersModal
          jobId={job.id}
          open={showClusters}
          onClose={() => setShowClusters(false)}
          onUrlsChanged={refetch}
        />
      )}

      <ConfirmDialog
        open={!!removingUrl}
        title="Remove URL?"
        message={`Remove "${removingUrl}" from your saved URLs? This can't be undone.`}
        confirmLabel="Remove"
        danger
        loading={saving}
        onConfirm={removeUrl}
        onClose={() => setRemovingUrl(null)}
      />

      <ConfirmDialog
        open={bulkConfirmOpen}
        title="Remove selected URLs?"
        message={`Remove ${selectedUrls.length} selected URL${
          selectedUrls.length === 1 ? "" : "s"
        } from your saved URLs? This can't be undone.`}
        confirmLabel={`Remove ${selectedUrls.length}`}
        danger
        loading={saving}
        onConfirm={bulkDeleteUrls}
        onClose={() => setBulkConfirmOpen(false)}
      />
    </div>
  );
}
