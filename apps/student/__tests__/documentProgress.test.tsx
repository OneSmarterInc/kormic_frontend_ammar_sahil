import { render, fireEvent } from '@testing-library/react-native';
import { DocumentProgress, documentStatus } from '../src/components/DocumentProgress';
import { normalizeStudentProfile } from '../src/features/profile/normalizeProfile';
it('allows background continuation only after acceptance and hides internal details', () => {
  const next = jest.fn();
  const ui = render(<DocumentProgress status={{stage:'uploading',accepted:false}} filename="cv.pdf" onContinue={next} />);
  expect(ui.getByText('cv.pdf')).toBeTruthy();
  expect(ui.queryByText('Continue in background')).toBeNull();
  ui.rerender(<DocumentProgress status={documentStatus({job_id:'job', status:'processing', progress:{stage:'extracting', label:'private internals'}})} onContinue={next} />);
  expect(ui.getByText('Extracting your profile details…')).toBeTruthy();
  expect(ui.queryByText('private internals')).toBeNull();
  fireEvent.press(ui.getByText('Continue in background'));
  expect(next).toHaveBeenCalledTimes(1);
});
it('combines CV and GitHub skills and distinct projects without duplicates', () => {
  const profile = normalizeStudentProfile({skills:['PYTHON'], evidence:{resume:{name:'CV Name',technical_skills:['Python','SQL'],projects:[{name:'CV project'}]},github:{result:{name:'GitHub Name',frameworks_and_tools:['python','React'],languages:[{name:'TypeScript'}],projects:[{name:'GitHub project'}]}}},linkedin_profile:{name:'LinkedIn Name',skills:['React','Writing']}});
  expect(profile.name).toBe('CV Name');
  expect(profile.skills).toEqual(['Python','SQL','TypeScript','React','Writing']);
  expect(profile.projects.map(item => item.title)).toEqual(['CV project','GitHub project']);
});
