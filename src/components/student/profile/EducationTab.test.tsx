import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Tables } from '@/integrations/supabase/types';
import { EducationTab } from './EducationTab';

const mocks = vi.hoisted(() => ({ update: vi.fn(), toast: vi.fn(), order: vi.fn(), invalidate: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({
  select: () => ({ eq: () => ({ order: mocks.order }) }),
  update: mocks.update,
}) } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mocks.invalidate }) }));

const student = {
  id: 'student-1', coursefinder_fields_required: false,
  country_of_education: 'Ghana', highest_education_level: 'Secondary',
  secondary_board: 'WAEC', secondary_qualification: 'WASSCE', secondary_school_name: 'Accra High',
  secondary_school_country: 'Ghana', secondary_school_state: 'Greater Accra', secondary_school_city: 'Accra',
  secondary_start_month: 9, secondary_start_year: 2015, secondary_end_month: 6, secondary_end_year: 2018,
  secondary_language_of_instruction: 'English', secondary_grades_band: '70-79%', secondary_final_grade: '',
  waec_scratch_card_pin: 'PIN', waec_scratch_card_serial: 'SERIAL', work_experience: [],
} as unknown as Tables<'students'>;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.order.mockResolvedValue({ data: [], error: null });
  mocks.update.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
});
afterEach(cleanup);

const save = async () => act(async () => { await userEvent.click(screen.getByRole('button', { name: 'Save secondary school details' })); });

describe('secondary profile saving', () => {
  it.each([false, undefined])('lets legacy students save without the new final grade (flag %s)', async (flag) => {
    render(<EducationTab student={{ ...student, coursefinder_fields_required: flag } as Tables<'students'>} />);
    expect(screen.getByLabelText('Final grade (optional)')).not.toBeRequired();
    await save();
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ secondary_final_grade: '' })));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Academic details saved' }));
  });

  it('requires a new student to provide their final grade', async () => {
    render(<EducationTab student={{ ...student, coursefinder_fields_required: true }} />);
    await save();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: expect.stringContaining('secondary final grade') }));
  });

  it('saves a new Cambridge student in Ghana without a WAEC card', async () => {
    render(<EducationTab student={{ ...student, coursefinder_fields_required: true, secondary_board: 'Cambridge',
      secondary_qualification: 'A levels', secondary_final_grade: 'AAB', waec_scratch_card_pin: '', waec_scratch_card_serial: '' }} />);
    expect(screen.queryByLabelText('WAEC results scratch-card PIN *')).not.toBeInTheDocument();
    await save();
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ waec_scratch_card_pin: null, waec_scratch_card_serial: null })));
  });

  it('still requires both WAEC credentials for a new WAEC applicant', async () => {
    render(<EducationTab student={{ ...student, coursefinder_fields_required: true, secondary_final_grade: 'Aggregate 12',
      waec_scratch_card_pin: '', waec_scratch_card_serial: '' }} />);
    await save();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: expect.stringContaining('WAEC scratch-card PIN, WAEC scratch-card serial number') }));
  });

  it('does not turn incomplete new profiles into valid profiles', async () => {
    render(<EducationTab student={{ ...student, coursefinder_fields_required: true, secondary_final_grade: 'Aggregate 12' }} />);
    fireEvent.change(screen.getByLabelText('School name *'), { target: { value: '' } });
    await save();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: expect.stringContaining('secondary school name') }));
  });

  it('lets legacy students edit a degree without the newly introduced final grade', async () => {
    mocks.order.mockResolvedValue({ data: [{ id: 'degree-1', level: 'degree', institution_name: 'University of Ghana',
      country: 'Ghana', state_region: 'Accra', city: 'Legon', degree_title: 'BSc', final_grade: '', grade_scale: '4.0',
      gpa: 3.4, language_of_instruction: 'English', start_date: '2018-09-01', end_date: '2022-07-01' }], error: null });
    render(<EducationTab student={student} />);
    const edit = await screen.findByRole('button', { name: 'Edit degree' });
    await act(async () => { await userEvent.click(edit); });
    expect(screen.getByLabelText('Final grade (optional)', { selector: '#degree-final_grade' })).not.toBeRequired();
    await act(async () => { await userEvent.click(screen.getByRole('button', { name: 'Save entry' })); });
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ degree_title: 'BSc', final_grade: '' })));
  });
});
