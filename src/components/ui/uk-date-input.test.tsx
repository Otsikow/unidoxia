import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UKDateInput } from './uk-date-input';

function DateForm() {
  const [value, setValue] = useState('2000-02-29');
  return <form aria-label="Dates"><label htmlFor="birth">Date of birth</label>
    <UKDateInput id="birth" value={value} onValueChange={setValue} required bounds={{ min: '1950-01-01', max: '2011-12-31' }} />
    <output>{value}</output>
  </form>;
}

describe('UK date entry', () => {
  it('displays saved dates in UK order and blocks invalid and out-of-range entry', () => {
    render(<DateForm />);
    const input = screen.getByLabelText('Date of birth');
    expect(input).toHaveValue('29/02/2000');
    expect(input).toBeValid();
    fireEvent.change(input, { target: { value: '31/12/2011' } });
    expect(screen.getByRole('status')).toHaveTextContent('2011-12-31');
    expect(input).toBeValid();
    for (const value of ['01/01/2012', '31/12/1949', '31/02/2000', '']) {
      fireEvent.change(input, { target: { value } });
      expect(input).toBeInvalid();
    }
  });
});
