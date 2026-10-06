import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useAriaChat } from '../src/features/chat/useAriaChat';
import { ariaMessageCache } from '../src/features/chat/chatHistory';
import * as api from '../src/services/api';
import * as cache from '../src/services/studentCache';
import { AuthSession } from '../src/models/onboarding';
import { ScrollView } from 'react-native';
jest.mock('../src/services/api', () => ({getAriaHistory: jest.fn(), getAriaUpdates: jest.fn(), getAgentName: jest.fn(), resumeAriaJob: jest.fn(), getAgentActivity: jest.fn()}));
jest.mock('../src/services/studentCache', () => ({cacheGeneration: () => 0, readCachedChat: jest.fn(), cacheChat: jest.fn(), onStudentCacheClear: jest.fn()}));
jest.mock('../src/features/chat/useChatAttachments', () => ({useChatAttachments: () => ({selectedAttachments: []})}));
jest.mock('../src/features/chat/useChatPdfExport', () => ({useChatPdfExport: () => ({})}));
const session = {access: 'token', user: {student_id: 'one'}} as AuthSession;
beforeEach(() => {
 jest.clearAllMocks(); ariaMessageCache.clear();
 jest.mocked(api.getAgentName).mockResolvedValue({agent_name: 'Cove'});
 jest.mocked(api.resumeAriaJob).mockResolvedValue(undefined);
});
it('shows disk history before server refresh without reporting thinking', async () => {
 jest.mocked(cache.readCachedChat).mockResolvedValue([{id:'1', serverId:1, role:'aria', text:'Saved reply'}]);
 let finish!: (data: api.AriaHistoryResponse) => void;
 jest.mocked(api.getAriaHistory).mockImplementation(() => new Promise(resolve => {finish=resolve;}));
 const {result} = renderHook(() => useAriaChat({session}));
 await waitFor(() => expect(result.current.messages[0]?.text).toBe('Saved reply'));
 expect(result.current.loading).toBe(false);
 expect(result.current.historyLoading).toBe(true);
 const scrollToEnd = jest.fn();
 result.current.messagesScrollRef.current = { scrollToEnd } as unknown as ScrollView;
 await act(async () => finish({messages:[{id:2,sender:'aria',content:'Fresh reply'}]}));
 await waitFor(() => expect(result.current.messages[0]?.text).toBe('Fresh reply'));
 await waitFor(() => expect(scrollToEnd).toHaveBeenCalledWith({animated: false}));
 expect(result.current.loading).toBe(false);
});
it('retains disk history when the server is unavailable', async () => {
 jest.mocked(cache.readCachedChat).mockResolvedValue([{id:'1', serverId:1,role:'aria',text:'Saved reply'}]);
 jest.mocked(api.getAriaHistory).mockRejectedValue(new Error('Server error'));
 const {result} = renderHook(() => useAriaChat({session}));
 await waitFor(() => expect(result.current.historyLoading).toBe(false));
 expect(result.current.messages[0]?.text).toBe('Saved reply');
 expect(result.current.loading).toBe(false);
 expect(result.current.error).toBe('Server error');
});
it('shows thinking only after a running job is confirmed', async () => {
 jest.mocked(cache.readCachedChat).mockResolvedValue([]);
 jest.mocked(api.getAriaHistory).mockResolvedValue({messages:[]});
 jest.mocked(api.getAgentActivity).mockResolvedValue({status:'idle'});
 let activate!: () => void;
 jest.mocked(api.resumeAriaJob).mockImplementation((_s,_signal,onActive) => { activate=onActive!; return new Promise(() => {}); });
 const {result, unmount} = renderHook(() => useAriaChat({session}));
 await waitFor(() => expect(api.resumeAriaJob).toHaveBeenCalled());
 expect(result.current.loading).toBe(false);
 act(() => activate());
 expect(result.current.loading).toBe(true);
 unmount();
});
it('polls only a delta and updates the earlier checking bubble when answered', async () => {
 jest.useFakeTimers();
 try {
  jest.mocked(cache.readCachedChat).mockResolvedValue([]);
  jest.mocked(api.getAriaHistory).mockResolvedValue({messages:[{
   id: 1, sender: 'assistant', content: 'Checking with the university',
   meta: {query_id: 7}, escalation: {query_id: 7, status: 'pending'},
  }]});
  jest.mocked(api.getAriaUpdates).mockResolvedValue({
   messages: [{id: 2, sender: 'assistant', content: 'The university answered',
    meta: {query_id: 7, question: 'Funding?', answer: 'Yes'},
    escalation: {query_id: 7, status: 'resolved'}}],
   escalations: {'7': 'resolved'}, last_id: 2, has_more: false,
  });
  const {result, unmount} = renderHook(() => useAriaChat({session}));
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
  expect(result.current.historyLoading).toBe(false);
  expect(result.current.messages[0]?.escalationStatus).toBe('pending');
  await act(async () => { await jest.advanceTimersByTimeAsync(5000); });
  expect(api.getAriaUpdates).toHaveBeenCalledWith(session, 1, [7]);
  expect(api.getAriaHistory).toHaveBeenCalledTimes(1);
  expect(result.current.messages.map(message => message.text)).toEqual([
   'Checking with the university', 'The university answered',
  ]);
  expect(result.current.messages[0]?.escalationStatus).toBe('resolved');
  unmount();
 } finally { jest.useRealTimers(); }
});
