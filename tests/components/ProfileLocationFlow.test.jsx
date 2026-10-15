import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

// Mirror of ProfilePage's edit-mode wiring: Country → City (cities load
// per country, reset when the country changes).
import CountrySelect from '../../src/components/common/CountrySelect.jsx';
import { CitySelect } from '../../src/components/common/LocationSelects.jsx';
import { countryNameFor } from '../../src/data/countries.js';

function Harness() {
  const [countryCode, setCountryCode] = React.useState('KE');
  const [city, setCity] = React.useState('');
  return (
    <div>
      <CountrySelect
        value={countryCode}
        onChange={(code) => {
          setCountryCode(code);
          setCity('');
        }}
        id="t-country"
      />
      <CitySelect
        key={`ct-${countryCode}`}
        countryCode={countryCode}
        value={city}
        onChange={setCity}
        inputClassName="x"
      />
      <div data-testid="result">{JSON.stringify({ countryCode, country: countryNameFor(countryCode), city })}</div>
    </div>
  );
}

describe('profile location flow (country → city)', () => {
  it('opens the Kenya city list and picks Nairobi', async () => {
    render(<Harness />);
    const cityInput = await screen.findByPlaceholderText('Select city…', {}, { timeout: 15000 });
    fireEvent.click(cityInput);
    const listbox = await screen.findByRole('listbox', {}, { timeout: 15000 });
    const options = within(listbox).getAllByRole('option');
    // All 110 Kenyan cities fit the render cap — alphabetically-late ones
    // like Nairobi must be visible without typing (regression test: the old
    // cap of 60 hid them).
    expect(options.length).toBeGreaterThan(100);
    expect(within(listbox).getByText('Nairobi')).toBeTruthy();
    expect(within(listbox).getByText('Mombasa')).toBeTruthy();

    fireEvent.click(within(listbox).getByText('Nairobi'));
    const r = JSON.parse(screen.getByTestId('result').textContent);
    expect(r.city).toBe('Nairobi');
    expect(r.countryCode).toBe('KE');
  }, 30000);
});
