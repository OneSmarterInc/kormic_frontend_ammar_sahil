import { buildWorkflows } from '../../src/pages/admin/telemetryInteractions';
import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { render, screen, waitFor, act, cleanup, within } from '@testing-library/react';
import { groupReplyTools } from '../../src/pages/admin/AgentConversationChat';
import userEvent from '@testing-library/user-event';
import AgentAuditLogPage from '../../src/pages/admin/AgentAuditLogPage';
import AgentRuntimeLogPage from '../../src/pages/admin/AgentRuntimeLogPage';
import client from '../../src/api/client';
import { listAgentAuditLog } from '../../src/api/superuserApi';
vi.mock('../../src/api/client', () => ({ default: { get: vi.fn() } }));
vi.mock('../../src/api/superuserApi', () => ({ listAgentAuditLog: vi.fn() }));
const pagination = {page:1,total:1,has_next:false};
const listing = {results:[{id:'conversation-1',student_name:'Test Student',university_name:'Test University', student_agent:'Cove',university_agent:'Johny',message_count:2}],pagination};
const detail = {student_name:'Test Student',university_name:'Test University',results:[{id:1,actor:'student_agent',actor_name:'Cove',kind:'request',content:'Please share entry requirements.'},{id:2,actor:'university_agent',actor_name:'Johny',kind:'reply',content:'Here are the requirements.'}],pagination:{...pagination,total:2}};
const event = (id, extra={}) => ({id,run_id:'turn-1',student_id:'student-1',actor_agent:'Cove (Student Agent)',target:'GitHub Agent',action_type:'AGENT_COMMUNICATION_START',inputs:{mode:'saved_evidence',operation:'github_evidence'},outputs:{},timestamp:'2026-09-29T10:00:00Z',...extra});
beforeEach(() => {vi.resetAllMocks();});
afterEach(() => {cleanup(); vi.useRealTimers();});

test('tool cards live inside their reply and still expand', async () => {
  const tool={id:3,actor:'university_agent',actor_name:'Johny',kind:'tool',content:'Used retrieve_official_information',metadata:{tool:'retrieve_official_information'}};
  const reply={...detail.results[1],id:4};
  client.get.mockResolvedValueOnce({data:listing}).mockResolvedValueOnce({data:{...detail,results:[detail.results[0],tool,reply]}}).mockResolvedValue({data:{steps:[tool,reply],logs:[],trace_available:true}});
  render(<AgentAuditLogPage/>);
  const user=userEvent.setup();
  await user.click(await screen.findByRole('button',{name:/Test Student.*Test University/}));
  const bubble=await screen.findByRole('group',{name:'Reply from Johny with tools'});
  expect(within(bubble).getByText('Here are the requirements.')).toBeVisible();
  await user.click(within(bubble).getByRole('button',{name:'Show flow for message #3'}));
  expect(await within(bubble).findByRole('region',{name:'Execution flow for message #3'})).toBeVisible();
});

test('does not attach unfinished tools or tools from another exchange', () => {
  const tool={id:3,kind:'tool',actor:'university_agent',actor_name:'Johny',metadata:{exchange_id:'a'}};
  const reply={...detail.results[1],id:4,metadata:{exchange_id:'b'}};
  expect(groupReplyTools([tool,reply])).toHaveLength(2);
  expect(groupReplyTools([tool])).toHaveLength(1);
  expect(groupReplyTools([{...tool,metadata:{}},detail.results[0],reply])).toHaveLength(3);
});
test('conversation card opens delayed chat response without crashing', async () => {
  let resolveDetail;
  client.get.mockResolvedValueOnce({data:listing}).mockImplementationOnce(() => new Promise(resolve => {resolveDetail=resolve;})).mockResolvedValue({data:listing});
  render(<AgentAuditLogPage/>);
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button',{name:/Test Student.*Test University/}));
  expect(screen.getByText('Loading conversation history…')).toBeVisible();
  await act(async () => resolveDetail({data:detail}));
  expect(await screen.findByText('Please share entry requirements.')).toBeVisible();
  expect(screen.getByText('Here are the requirements.')).toBeVisible();
  await user.click(screen.getByRole('button',{name:'Back to conversations'}));
  expect(await screen.findByRole('button',{name:/Test Student.*Test University/})).toBeVisible();
});
test('conversation failure stays recoverable', async () => {
  client.get.mockResolvedValueOnce({data:listing}).mockRejectedValueOnce(new Error('Unavailable'));
  render(<AgentAuditLogPage/>);
  const user=userEvent.setup();
  await user.click(await screen.findByRole('button',{name:/Test Student.*Test University/}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unavailable');
  expect(screen.getByRole('button',{name:'Back to conversations'})).toBeVisible();
});
test('shows both directions and complete details with null legacy payloads', async () => {
  listAgentAuditLog.mockResolvedValue({logs:[event(1),event(2,{actor_agent:'GitHub Agent',target:'Cove (Student Agent)',action_type:'AGENT_COMMUNICATION_REPLY',inputs:null,outputs:{result:{summary:'Saved GitHub projects'}}}),event(3,{inputs:null,outputs:null})],has_more:false});
  render(<AgentRuntimeLogPage/>);
  await userEvent.click(await screen.findByLabelText('Expand live activity'));
  await userEvent.click(await screen.findByText('Agent exchanges and tool results'));
  expect(await screen.findByText('Response recorded')).toBeVisible();
  const user=userEvent.setup();

  expect(screen.getAllByText("Saved GitHub projects", {exact:true})[0]).toBeInTheDocument();
  await user.click(screen.getAllByRole('button',{name:'View this execution'})[0]);
  await waitFor(() => expect(listAgentAuditLog).toHaveBeenLastCalledWith(expect.objectContaining({runId:'turn-1'})));
});
test('drains burst cursor pages without dropping events', async () => {
  vi.useFakeTimers();
  listAgentAuditLog.mockResolvedValueOnce({logs:[event(1)],has_more:false}).mockResolvedValueOnce({logs:[event(2)],has_more:true}).mockResolvedValueOnce({logs:[event(3)],has_more:false});
  render(<AgentRuntimeLogPage/>);
  await act(async () => {await Promise.resolve();});
  await act(async () => {await vi.advanceTimersByTimeAsync(1001);});
  expect(listAgentAuditLog).toHaveBeenLastCalledWith(expect.objectContaining({sinceId:2}));
  expect(screen.getByText(/3 events loaded/)).toBeVisible();
});

test('updates the same workflow as background progress arrives', async () => {
  vi.useFakeTimers();
  listAgentAuditLog.mockResolvedValueOnce({logs:[event(1,{action_type:'MODEL_START'})],has_more:false}).mockResolvedValue({logs:[event(2,{action_type:'AGENT_PROGRESS',outputs:{summary:'Analyzing repository 1 of 8'}})],has_more:false});
  render(<AgentRuntimeLogPage/>);
  await act(async()=>{await Promise.resolve();});
  const card=screen.getByRole('region',{name:'Live activity student-1'});
  await act(async()=>{await vi.advanceTimersByTimeAsync(1001);});
  expect(screen.getByRole('region',{name:'Live activity student-1'})).toBe(card);
  expect(within(card).getAllByText('Analyzing repository 1 of 8').length).toBeGreaterThan(0);
  expect(within(card).getByText('Step 2 · 0 tool calls · 1 model calls · 1 local model calls')).toBeVisible();
});

test('workflow exposes errors in red and distinguishes capacity waits', async () => {
  listAgentAuditLog.mockResolvedValue({logs:[event(1,{action_type:'TOOL_ERROR',target:'read_files',outputs:{error:'Choose one to three paths per call.'}}),event(2,{action_type:'MODEL_ERROR',outputs:{error:'Waiting for shared model capacity'}})],has_more:false});
  render(<AgentRuntimeLogPage/>);
  await userEvent.click(await screen.findByLabelText('Expand live activity'));
  const error=await screen.findByRole('alert');
  expect(error).toHaveTextContent('Choose one to three paths per call.');
  expect(error).toHaveClass('text-rose-700');
  expect(error.closest('li')).toHaveClass('bg-rose-50');
  expect(screen.getByText('Step 2 · 0 tool calls · 0 model calls · 0 local model calls · 1 errors')).toBeVisible();
});

test('separates messages and keeps retries for one message together', async () => {
  listAgentAuditLog.mockResolvedValue({logs:[event(1,{message_id:10,user_message:'Review GitHub'}),event(2,{run_id:'retry',message_id:10,user_message:'Review GitHub'}),event(3,{run_id:'new',message_id:11,user_message:'Find IIT Bombay'})],has_more:false});
  render(<AgentRuntimeLogPage/>);
  await screen.findByText('Step 2 · 0 tool calls · 0 model calls · 0 local model calls');
  expect(screen.queryByText('Task #10')).not.toBeInTheDocument();
  expect(screen.getAllByRole('region',{name:'Live activity student-1'})).toHaveLength(2);
  expect(screen.getByText('Step 2 · 0 tool calls · 0 model calls · 0 local model calls')).toBeVisible();
});

test('successful research submission marks earlier validation attempts addressed', async () => {
  listAgentAuditLog.mockResolvedValue({logs:[event(1,{action_type:'TOOL_ERROR',target:'submit_research',outputs:{result:{error:'Invalid evidence',issues:[{record:'Deadline',problem:'Year missing from quote'}]}}}),event(2,{action_type:'TOOL_RESULT',target:'submit_research',outputs:{result:{accepted:true}}})],has_more:false});
  render(<AgentRuntimeLogPage/>);
  expect(await screen.findByText(/1 validation retries addressed/)).toBeVisible();
  await userEvent.click(screen.getByLabelText('Expand live activity'));
  expect(screen.getByText('Deadline: Year missing from quote')).toBeVisible();
  expect(screen.getByText(/A later submission was accepted/)).toBeVisible();
});

test('status starts collapsed and counts tool calls without counting results twice', async () => {
  listAgentAuditLog.mockResolvedValue({logs:[event(1,{action_type:'TOOL_CALL_START',target:'read_files'}),event(2,{action_type:'TOOL_RESULT',target:'read_files'})],has_more:false});
  render(<AgentRuntimeLogPage/>);
  expect(await screen.findByText('Step 2 · 1 tool calls · 0 model calls · 0 local model calls')).toBeVisible();
  expect(screen.getByLabelText('Workflow steps')).not.toBeVisible();
  await userEvent.click(screen.getByLabelText('Expand live activity'));
  expect(screen.getByLabelText('Workflow steps')).toBeVisible();
  await userEvent.click(screen.getByLabelText('Expand live activity'));
  expect(screen.getByLabelText('Workflow steps')).not.toBeVisible();
});



// Correlation tests include old callback records whose tool name was dropped.
test('pairs legacy tool input and output by run ID and restores the recorded tool name', async () => {
  listAgentAuditLog.mockResolvedValue({logs:[event(10,{action_type:'TOOL_CALL_START',target:'search_university_knowledge',inputs:{payload:{query:'admission'}}}),event(11,{action_type:'TOOL_RESULT',target:'unknown',inputs:{},outputs:{result:'{"answer":"Verified entry requirements"}'}})],has_more:false});
  render(<AgentRuntimeLogPage/>);
  await userEvent.click(await screen.findByLabelText('Expand live activity'));
  await userEvent.click(await screen.findByText('Agent exchanges and tool results'));
  expect(await screen.findByText('Completed')).toBeVisible();
  expect(screen.getByRole('region',{name:'Tool input'})).toHaveTextContent('admission');
  expect(screen.getByRole('region',{name:'Tool output'})).toHaveTextContent('Verified entry requirements');
  expect(screen.queryByText('Agent ID: student:student-1')).not.toBeInTheDocument();
  expect(screen.getByText('Request and response linked')).toBeVisible();
  expect(screen.queryByText('Tool name not recorded')).not.toBeInTheDocument();
});

test('chat opens at latest message and clicking a bubble shows its tool flow', async () => {
  let resolveDetail;
  const flow={steps:[{...detail.results[0]},{id:3,actor:'university_agent',actor_name:'Johny',kind:'tool',content:'Used search_university_knowledge',metadata:{tool:'search_university_knowledge',inputs:{query:'admission'},outputs:{answer:'Verified requirements'}}},detail.results[1]],logs:[],trace_available:true};
  client.get.mockResolvedValueOnce({data:listing}).mockImplementationOnce(()=>new Promise(resolve=>{resolveDetail=resolve;})).mockResolvedValue({data:flow});
  render(<AgentAuditLogPage/>);
  const user=userEvent.setup();
  await user.click(await screen.findByRole('button',{name:/Test Student.*Test University/}));
  const box=screen.getByLabelText('Chat messages');
  Object.defineProperty(box,'scrollHeight',{configurable:true,value:1200});
  await act(async()=>resolveDetail({data:detail}));
  expect(box.scrollTop).toBe(1200);
  expect(client.get).toHaveBeenCalledWith('/agent-queries/conversations/conversation-1/',{params:{latest:1}});
  await user.click(screen.getByRole('button',{name:'Show flow for message #1'}));
  expect(await screen.findByText('What happened in this exchange')).toBeVisible();
  expect(await screen.findByText('Verified requirements')).toBeVisible();
  const flowRegion=screen.getByRole('region',{name:'Execution flow for message #1'});
  expect(within(flowRegion).getByText('Replied')).toBeVisible();
  expect(within(flowRegion).queryByText('Here are the requirements.')).not.toBeInTheDocument();
  expect(screen.getByText('Here are the requirements.')).toBeVisible();
  expect(screen.getByText('admission')).toBeVisible();
  expect(client.get).toHaveBeenLastCalledWith('/agent-queries/conversations/conversation-1/',{params:{message_id:1}});
});

test('interleaved users and messages never share a workflow', () => {
  const logs=[event(1,{message_id:10}),event(2,{message_id:11}),event(3,{message_id:10,student_id:'other'}),event(4,{message_id:10}),event(5,{message_id:11})];
  const flows=buildWorkflows(logs);
  expect(flows).toHaveLength(3);
  expect(flows.find(flow=>flow.messageId===10 && flow.row.student_id==='student-1').events.map(row=>row.id)).toEqual([1,4]);
  expect(flows.find(flow=>flow.messageId===11).events.map(row=>row.id)).toEqual([2,5]);
});

test('expanded steps distinguish agent exchanges, tools and errors', async () => {
  listAgentAuditLog.mockResolvedValue({logs:[event(1),event(2,{action_type:'TOOL_CALL_START',target:'read_repository'}),event(3,{action_type:'TOOL_ERROR',target:'read_repository',outputs:{error:'Repository unavailable'}})],has_more:false});
  render(<AgentRuntimeLogPage/>);
  await userEvent.click(await screen.findByLabelText('Expand live activity'));
  const steps=screen.getByLabelText('Workflow steps').querySelectorAll(':scope > li');
  expect(steps[0]).toHaveClass('bg-emerald-50');
  expect(steps[1]).toHaveClass('bg-sky-50');
  expect(steps[2]).toHaveClass('bg-rose-50');
  expect(screen.getByLabelText('Activity colour legend')).toBeVisible();
});

test('card shows operation and tool while owner stays inside expanded details', async () => {
  listAgentAuditLog.mockResolvedValue({logs:[event(1,{student_name:'Example Owner',action_type:'TOOL_CALL_START',target:'list_universities',inputs:{payload:{query:'IIT Bombay'}}})],has_more:false});
  render(<AgentRuntimeLogPage/>);
  expect(await screen.findByText('Working agent')).toBeVisible();
  expect(screen.getByText('Current operation')).toBeVisible();
  expect(screen.getByText('Most recent tool')).toBeVisible();
  expect(screen.getByText('Example Owner')).not.toBeVisible();
  expect(screen.queryByText('student-1')).not.toBeInTheDocument();
  await userEvent.click(screen.getByLabelText('Expand live activity'));
  expect(screen.getByText('Example Owner')).toBeVisible();
  await userEvent.click(screen.getByText('list_universities · Parameters'));
  expect(screen.getAllByText('IIT Bombay')[0]).toBeVisible();
});
test('hidden telemetry stops requests and resumes from the same event cursor', async () => {
  vi.useFakeTimers();
  let visibility='visible';
  const getter=vi.spyOn(document,'visibilityState','get').mockImplementation(()=>visibility);
  listAgentAuditLog.mockResolvedValueOnce({logs:[event(1)],has_more:false}).mockResolvedValue({logs:[event(2)],has_more:false});
  try {
    render(<AgentRuntimeLogPage/>);
    await act(async()=>{await Promise.resolve();});
    expect(listAgentAuditLog).toHaveBeenCalledTimes(1);
    visibility='hidden';
    await act(async()=>{await vi.advanceTimersByTimeAsync(5000);});
    expect(listAgentAuditLog).toHaveBeenCalledTimes(1);
    visibility='visible';
    await act(async()=>{await vi.advanceTimersByTimeAsync(500);});
    expect(listAgentAuditLog).toHaveBeenLastCalledWith(expect.objectContaining({sinceId:1}));
    expect(screen.getByText('Step 2 · 0 tool calls · 0 model calls · 0 local model calls')).toBeVisible();
  } finally {getter.mockRestore();}
});
