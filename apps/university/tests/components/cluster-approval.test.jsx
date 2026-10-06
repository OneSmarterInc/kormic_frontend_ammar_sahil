import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import AutoDiscoverClustersModal from '../../src/components/university/AutoDiscoverClustersModal';

const { getClusters, approve } = vi.hoisted(() => ({
  getClusters: vi.fn(),
  approve: vi.fn(),
}));

vi.mock('../../src/api/universityAdminApi', () => ({
  getAutoDiscoverClusters: getClusters,
  approveAutoDiscoverCluster: approve,
}));
vi.mock('../../src/components/common/Modal', () => ({
  default: ({ open, children }) => open ? <div>{children}</div> : null,
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

afterEach(() => vi.clearAllMocks());

test('shows a failed cluster scrape and queues a retry without waiting for extraction', async () => {
  const cluster = {
    category: 'fees', label: 'Fees', knowledge_group_slug: 'money', url_count: 1, urls: [],
    approved: {
      approved_by: 'Officer', approved_at: null,
      scrape_job: { id: 7, status: 'failed', error_message: 'Worker stopped', progress_completed: 0, progress_total: 1 },
    },
  };
  getClusters.mockResolvedValueOnce({ clusters: [cluster] }).mockResolvedValueOnce({
    clusters: [{ ...cluster, approved: { ...cluster.approved, scrape_job: {
      id: 8, status: 'queued', progress_completed: 0, progress_total: 1,
    } } }],
  });
  approve.mockResolvedValue({ scrape_job: { id: 8, status: 'queued' } });

  const onUrlsChanged = vi.fn();
  render(<AutoDiscoverClustersModal jobId={4} open onClose={() => {}} onUrlsChanged={onUrlsChanged} />);
  expect(await screen.findByText('Worker stopped')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Retry scrape' }));

  await waitFor(() => expect(approve).toHaveBeenCalledWith(4, 'fees'));
  expect(await screen.findByText('0 of 1 pages processed')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'In progress' })).toBeDisabled();
  expect(onUrlsChanged).toHaveBeenCalledOnce();
});
