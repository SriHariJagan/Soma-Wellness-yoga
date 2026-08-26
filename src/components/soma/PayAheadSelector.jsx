import React, { useState, useEffect } from 'react';
import { resolveMembershipPrice, PAY_AHEAD_PRICING } from '../../lib/pricing.js';
import { formatKES } from '../../lib/currency.js';

export default function PayAheadSelector({ tierKey = 'JUA', foundingEligible = false, onSelect }) {
  const [term, setTerm] = useState(1);
  const terms = [1,3,6,12];
  const labels = {1:'Monthly',3:'3 months 10% off',6:'6 months 15% off',12:'12 months 25% off'};
  useEffect(() => { onSelect?.(term, resolveMembershipPrice(tierKey, term, { foundingEligible })); }, [term, tierKey, foundingEligible]);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--soma-forest)' }}>Pay-ahead — live discount math</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
        {terms.map((t) => {
          const r = resolveMembershipPrice(tierKey, t, { foundingEligible });
          const active = term===t;
          return (
            <button key={t} onClick={() => setTerm(t)} style={{ padding:12, borderRadius:12, border: active ? '2px solid var(--soma-forest)' : '1px solid var(--soma-line-light)', background: active ? 'var(--soma-forest)' : '#fff', color: active ? '#fff' : 'var(--soma-forest)', textAlign:'center' }}>
              <div style={{ fontSize:11, fontWeight:800 }}>{labels[t]}</div>
              <div style={{ fontSize:14, fontWeight:800, marginTop:4 }}>{formatKES(r.termTotal)}</div>
              {foundingEligible && <div style={{ fontSize:10, opacity:0.7 }}>founding rate</div>}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize:11, color:'#5a6b63' }}>Registration KES 3,000 waived on 3+ months. VAT included. From live catalog — no hardcoded totals.</div>
    </div>
  );
}
