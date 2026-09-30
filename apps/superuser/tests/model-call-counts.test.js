import test from 'node:test';
import assert from 'node:assert/strict';
import {modelCallCounts} from '../src/pages/admin/telemetryInteractions.js';

test('counts attempts, deduplicates starts and does not count replies as calls', () => {
  const q={id:1,run_id:'a',action_type:'MODEL_START',inputs:{provider:'qwen',call_id:'q'}};
  const c={id:2,run_id:'a',action_type:'MODEL_START',inputs:{provider:'claude',call_id:'c',exchange_id:'direct'}};
  assert.deepEqual(modelCallCounts([q,q,c,{id:3,run_id:'a',action_type:'TOOL_CALL_START',target:'claude_information',inputs:{exchange_id:'direct'}},
    {id:4,action_type:'MODEL_END'},{id:5,action_type:'MODEL_START',inputs:{}}]),{qwen:1,claude:1,unknown:1});
});
test('legacy direct calls remain attributable and separate runs are not merged', () => {
  assert.deepEqual(modelCallCounts([
    {id:1,run_id:'a',action_type:'TOOL_CALL_START',target:'claude_information'},
    {id:2,run_id:'b',action_type:'MODEL_START',inputs:{provider:'qwen',call_id:'same'}},
    {id:3,run_id:'c',action_type:'MODEL_START',inputs:{provider:'qwen',call_id:'same'}}]),{qwen:2,claude:1,unknown:0});
});
