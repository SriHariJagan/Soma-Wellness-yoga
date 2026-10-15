import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { StateSelect, CitySelect } from '../../src/components/common/LocationSelects.jsx';

describe('StateSelect', () => {
  it('loads and shows Kenya counties', async () => {
    const onChange = vi.fn();
    const onHasStates = vi.fn();
    render(
      <StateSelect countryCode="KE" name="" onChange={onChange} inputClassName="x" onHasStates={onHasStates} />
    );
    const input = await screen.findByRole('combobox');
    fireEvent.focus(input);
    fireEvent.click(input);
    const options = await screen.findAllByRole('option', {}, { timeout: 15000 });
    expect(options.length).toBeGreaterThan(40);
    await waitFor(() => expect(onHasStates).toHaveBeenCalledWith(true), { timeout: 15000 });
  });

  it('hides when no country is selected', async () => {
    const onHasStates = vi.fn();
    const { container } = render(
      <StateSelect countryCode="" name="" onChange={() => {}} inputClassName="x" onHasStates={onHasStates} />
    );
    await waitFor(() => expect(onHasStates).toHaveBeenCalledWith(false), { timeout: 15000 });
    expect(container.querySelector('[role="combobox"]')).toBeNull();
  });
});

describe('CitySelect', () => {
  it('shows Nairobi for Nairobi City county', async () => {
    const onChange = vi.fn();
    render(
      <CitySelect countryCode="KE" stateCode="30" value="" onChange={onChange} inputClassName="x" />
    );
    const input = await screen.findByRole('combobox');
    fireEvent.focus(input);
    fireEvent.click(input);
    const options = await screen.findAllByRole('option', {}, { timeout: 15000 });
    expect(options.map((o) => o.textContent)).toContain('Nairobi');
  });
});
