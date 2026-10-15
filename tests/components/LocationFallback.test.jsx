import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

// Simulate the dataset chunk failing to load (offline / blocked CDN).
vi.mock('../../src/lib/locationData.js', () => ({
  getStatesOfCountry: vi.fn(async () => null),
  getCitiesOf: vi.fn(async () => null),
}));

import { StateSelect, CitySelect } from '../../src/components/common/LocationSelects.jsx';

describe('location fields survive dataset load failure', () => {
  it('StateSelect falls back to a text input', async () => {
    const onChange = vi.fn();
    const onHasStates = vi.fn();
    render(
      <StateSelect countryCode="KE" name="" onChange={onChange} inputClassName="x" onHasStates={onHasStates} />
    );
    const input = await screen.findByPlaceholderText('Enter state');
    expect(input.tagName).toBe('INPUT');
    fireEvent.change(input, { target: { value: 'Custom County' } });
    expect(onChange).toHaveBeenCalledWith('Custom County', 'Custom County');
    await waitFor(() => expect(onHasStates).toHaveBeenCalledWith(true));
  });

  it('CitySelect falls back to a text input', async () => {
    const onChange = vi.fn();
    render(
      <CitySelect countryCode="KE" stateCode="30" value="" onChange={onChange} inputClassName="x" />
    );
    const input = await screen.findByPlaceholderText('Enter city');
    fireEvent.change(input, { target: { value: 'Custom Town' } });
    expect(onChange).toHaveBeenCalledWith('Custom Town');
  });
});
