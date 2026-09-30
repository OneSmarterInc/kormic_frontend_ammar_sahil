/** Pair only recorded correlation IDs; never guess from adjacent timestamps. */
export function decodePayload(value) {
  if (typeof value !== 'string' || !/^[\[{]/.test(value.trim())) return value;
  try { return JSON.parse(value); } catch { return value; }
}
const typeOf = row => row.action_type || 'EVENT';
export function modelCallCounts(events) {
  const counts = {qwen:0, claude:0, unknown:0}, seen = new Set();
  const starts = events.filter(event => event.action_type === 'MODEL_START');
  for (const event of starts) {
    const key = `${event.student_id || ''}:${event.run_id || ''}:${event.inputs?.call_id || event.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const identity = `${event.inputs?.provider || ''} ${event.inputs?.model || ''}`.toLowerCase();
    counts[/claude|anthropic/.test(identity) ? 'claude' : /qwen/.test(identity) ? 'qwen' : 'unknown']++;
  }
  // Older direct Claude requests used tool events, without a MODEL_START.
  for (const event of events.filter(event => event.action_type === 'TOOL_CALL_START' && ['claude_information','claude_web_search'].includes(event.target))) {
    if (starts.some(start => start.run_id === event.run_id && start.inputs?.exchange_id && start.inputs.exchange_id === event.inputs?.exchange_id)) continue;
    const key = `direct:${event.id}`;
    if (!seen.has(key)) { counts.claude++; seen.add(key); }
  }
  return counts;
}
export const eventError = row => row.outputs?.error || row.outputs?.result?.error || (typeOf(row).includes('ERROR') ? 'The operation failed without an error message.' : '');
export const isCapacityWait = row => /waiting for shared .*capacity|waiting for .*capacity/i.test(String(eventError(row)));
export const isWarningEvent = row => isCapacityWait(row) || (
  /^TOOL_/.test(typeOf(row)) && /(?:official (?:page|website).*HTTP (?:401|403|429)|robots(?:\.txt| policy).*?(?:disallows|HTTP (?:401|403|429))|website currently disallows automated access|resolve the university for this turn before consulting it|copy an exact institution identity quote|official identity quote must be copied)/i.test(String(eventError(row)))
);
export const isErrorEvent = row => Boolean(eventError(row)) && !isWarningEvent(row);
export const isConversation = row => /COMMUNICATION|CONVERSATION/.test(typeOf(row));
const validTarget = value => value && !['unknown', 'unknown_tool'].includes(value);
export function interactionKey(row) {
  const type = typeOf(row);
  const base = `${row.student_id || ''}:${row.run_id || ''}`;
  if (/^TOOL_(CALL_START|RESULT|ERROR)$/.test(type) && row.run_id) {
    return `tool:${base}:${row.inputs?.call_id || row.run_id}`;
  }
  const exchange = row.inputs?.exchange_id || row.outputs?.exchange_id;
  if (/^AGENT_COMMUNICATION_(START|REPLY|ERROR)$/.test(type) && exchange) return `exchange:${base}:${exchange}`;
  return `event:${row.id}`;
}
export function buildInteractions(logs) {
  const groups = new Map(), studentAgents = new Map();
  for (const row of logs) {
    const owner = `${row.student_id || ''}:${row.run_id || ''}`;
    if (/student agent/i.test(row.actor_agent || '')) studentAgents.set(owner, row.actor_agent);
    if (isConversation(row) && /student agent/i.test(row.target || '')) studentAgents.set(owner, row.target);
    const key = interactionKey(row);
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  const result = [];
  for (const [key, rows] of groups) {
    const requests = rows.filter(row => /^(TOOL_CALL_START|AGENT_COMMUNICATION_START)$/.test(typeOf(row)));
    const responses = rows.filter(row => /^(TOOL_RESULT|TOOL_ERROR|AGENT_COMMUNICATION_REPLY|AGENT_COMMUNICATION_ERROR)$/.test(typeOf(row)));
    // Ambiguous legacy correlations remain separate rather than inventing a pair.
    const pairs = requests.length === 1 && responses.length === 1 &&
      (key.startsWith('exchange:') || requests[0].actor_agent === responses[0].actor_agent) &&
      (!key.startsWith('tool:') || !validTarget(responses[0].target) || requests[0].target === responses[0].target);
    for (const events of pairs ? [rows] : rows.map(row => [row])) {
      const request = events.find(row => /^(TOOL_CALL_START|AGENT_COMMUNICATION_START)$/.test(typeOf(row)));
      const response = events.find(row => /^(TOOL_RESULT|TOOL_ERROR|AGENT_COMMUNICATION_REPLY|AGENT_COMMUNICATION_ERROR)$/.test(typeOf(row)));
      const row = request || response || events[0];
      const type = typeOf(row), tool = type.includes('TOOL'), conversation = isConversation(row);
      const origin = !request && response && conversation ? row.target : row.actor_agent;
      const destination = !request && response && conversation ? row.actor_agent : row.target;
      const caller = origin || 'Agent not recorded';
      const receiver = validTarget(destination) ? destination : tool ? 'Tool name not recorded' : 'Recipient not recorded';
      result.push({key: pairs ? key : `event:${row.id}`, events, request, response, row, tool, conversation,
        caller, receiver, studentAgent: studentAgents.get(`${row.student_id || ''}:${row.run_id || ''}`),
        failed: events.some(isErrorEvent),
        latestId: Math.max(...events.map(event => event.id)),
        operation: row.inputs?.operation || row.outputs?.operation || (validTarget(destination) ? destination : ''),
        mode: row.inputs?.mode || row.outputs?.mode,
      });
    }
  }
  return result.sort((a,b) => b.latestId-a.latestId);
}
export function requestData(interaction) {
  const row = interaction.request || (!interaction.response ? interaction.row : null);
  if (!row) return undefined;
  const inputs = row.inputs || {};
  if (Object.hasOwn(inputs, 'arguments')) return decodePayload(inputs.arguments);
  if (Object.hasOwn(inputs, 'payload')) return decodePayload(inputs.payload);
  return Object.fromEntries(Object.entries(inputs).filter(([key]) => !['call_id','parent_call_id','exchange_id','mode','operation'].includes(key)));
}
export function responseData(interaction) {
  const outputs = (interaction.response || interaction.row).outputs;
  if (!outputs || !Object.keys(outputs).length) return undefined;
  if (Object.hasOwn(outputs, 'result')) return decodePayload(outputs.result);
  if (Object.hasOwn(outputs, 'reply')) return decodePayload(outputs.reply);
  if (Object.hasOwn(outputs, 'content')) return outputs.content;
  return Object.fromEntries(Object.entries(outputs).filter(([key]) => !['exchange_id','mode','operation'].includes(key)));
}

export function toolAction(name = '') {
  if (/^(propose_|prepare_)/.test(name)) return 'Change proposal';
  if (/search|find_|list_|lookup/.test(name)) return 'Search / lookup';
  if (/delete|remove|discard/.test(name)) return 'Removal';
  if (/update|resolve|merge|apply/.test(name)) return 'Update';
  if (/create|add_|save|submit/.test(name)) return 'Add / save';
  if (/validate|verify|check/.test(name)) return 'Validation';
  if (/read|retrieve|get_|inspect/.test(name)) return 'Read information';
  if (/extract|analyze|analyse/.test(name)) return 'Analysis';
  return 'Tool execution';
}

export function activitySummary(event) {
  if(isCapacityWait(event)) return `${event.actor_agent || 'Agent'} is waiting for available model capacity; this is a retryable pause.`;
  if(isWarningEvent(event)) return `${event.actor_agent || 'Agent'} could not use ${(event.target || 'the tool').replaceAll('_',' ')}; a retry or fallback is needed.`;
  if(isErrorEvent(event)) return `${event.actor_agent || 'Agent'} could not complete ${(event.target || 'the step').replaceAll('_',' ')}.`;
  if (typeof event.outputs?.summary === 'string') return event.outputs.summary;
  const actor=event.actor_agent || 'Agent', target=(event.target || 'step').replaceAll('_',' ');
  const summaries={
    RUN_COMPLETE:`${actor} finished and returned the response to ${target}.`,
    RUN_START:`${actor} is starting the requested task.`,
    BACKGROUND_JOB_LINKED:`${actor} queued research with ${target}.`,
    MODEL_START:`${actor} called ${event.inputs?.provider === 'qwen' ? 'Qwen' : event.inputs?.provider === 'claude' ? 'Claude' : 'the model'}${event.inputs?.model ? ` (${event.inputs.model})` : ''}.`,
    MODEL_END:`${actor} finished the model request.`,
    MODEL_OUTPUT:`${actor} prepared a response for ${target}.`,
    REASONING_SUMMARY:`${actor} provided a reasoning summary.`,
    TOOL_CALL_INTENT:`${actor} selected ${target} as the next tool.`,
    TOOL_CALL_START:`${actor} started ${target}.`,
    TOOL_RESULT:`${actor} received the result from ${target}.`,
    AGENT_COMMUNICATION_START:`${actor} sent a request to ${target}.`,
    AGENT_COMMUNICATION_REPLY:`${actor} returned a response to ${target}.`,
    AGENT_CONVERSATION_MESSAGE:`${actor} saved a message for ${target}.`,
    AGENT_STEP_START:`${actor} started ${target}.`,
    AGENT_STEP_RESULT:`${actor} completed ${target}.`,
    OBJECT_CREATED:`${actor} created ${target}.`,
    OBJECT_UPDATED:`${actor} updated ${target}.`,
  };
  return summaries[event.action_type] || (event.action_type?.includes('ERROR')?`${actor} encountered an error during ${target}.`:`${actor}: ${(event.action_type || 'activity').toLowerCase().replaceAll('_',' ')} · ${target}.`);
}

/** One panel per user message; older records fall back to their recorded run. */
export function buildWorkflows(logs) {
  const runs=new Map();
  for(const event of logs){
    const messageId=event.message_id || event.inputs?.message_id;
    const key=messageId?`message:${event.student_id || ''}:${messageId}`:event.task_id?`task:${event.student_id || ''}:${event.task_id}`:event.run_id?`run:${event.student_id || ''}:${event.run_id}`:`event:${event.id}`;
    runs.set(key,[...(runs.get(key)||[]),event]);
  }
  return [...runs].map(([key,events])=>{
    events.sort((a,b)=>a.id-b.id);
    const acceptedRuns=new Set(events.filter(event=>event.target==='submit_research' && event.outputs?.result?.accepted===true).map(event=>event.run_id));
    const recoveredErrors=events.filter(event=>isErrorEvent(event) && event.target==='submit_research' && acceptedRuns.has(event.run_id) && events.some(later=>later.run_id===event.run_id && later.id>event.id && later.target==='submit_research' && later.outputs?.result?.accepted===true));
    const interactions=buildInteractions(events);
    const lead=interactions.find(item=>item.conversation && item.request) || interactions[interactions.length-1];
    return {...lead,key:`workflow:${key}`,events,workflow:true, studentAgent:events.find(event=>/\(student agent\)/i.test(event.actor_agent || ''))?.actor_agent || events.find(event=>/student agent/i.test(event.actor_agent || ''))?.actor_agent || lead.studentAgent, caller:events.find(event=>event.action_type==='RUN_START')?.actor_agent || events.find(event=>/agent/i.test(event.actor_agent || ''))?.actor_agent || (lead.caller==='Student'?'Student Agent':lead.caller), activityType:events.find(event=>event.activity_type)?.activity_type || events.find(event=>event.inputs?.activity_type)?.inputs.activity_type, recoveredErrors, messageId:events.find(event=>event.message_id || event.inputs?.message_id)?.message_id || events.find(event=>event.inputs?.message_id)?.inputs.message_id, userMessage:events.find(event=>event.user_message)?.user_message || events.find(event=>event.action_type==='RUN_START')?.inputs?.message || '', runCount:new Set(events.map(event=>event.run_id).filter(Boolean)).size,
      tool:interactions.some(item=>item.tool),conversation:interactions.some(item=>item.conversation),
      latestId:events[events.length-1].id,failed:events.some(event=>isErrorEvent(event) && !recoveredErrors.includes(event))};
  }).sort((a,b)=>b.latestId-a.latestId);
}
