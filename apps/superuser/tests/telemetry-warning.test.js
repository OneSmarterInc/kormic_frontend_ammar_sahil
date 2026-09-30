import test from 'node:test';
import assert from 'node:assert/strict';
import {isErrorEvent, isWarningEvent, buildWorkflows} from '../src/pages/admin/telemetryInteractions.js';

test('blocked official pages and resolution prerequisites are warnings', () => {
  for (const error of ['Official page unavailable: HTTP 403; content type text/html.', 'Resolve the university for this turn before consulting it.', 'Website robots policy disallows this page']) {
    const event = {id:1, run_id:'run', action_type:'TOOL_ERROR', outputs:{error}};
    assert.equal(isWarningEvent(event),true);
    assert.equal(isErrorEvent(event),false);
    assert.equal(buildWorkflows([event])[0].failed,false);
  }
});

test('unexpected tool and run failures still count as errors', () => {
  for (const action_type of ['TOOL_ERROR','RUN_ERROR']) {
    assert.equal(isErrorEvent({action_type,outputs:{error:'Database connection lost'}}),true);
  }
});
