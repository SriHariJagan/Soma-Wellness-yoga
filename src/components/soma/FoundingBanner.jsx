import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchFoundingStatus } from '../../lib/somaApi.js';

export default function FoundingBanner() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchFoundingStatus().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);
  if (loading) return <div style={{ textAlign:'center', padding:12, fontSize:12, color:'#5a6b63' }}>Checking founding availability…</div>;
  if (!data) return null;
  if (!data.eligible) {
    return (
      <div style={{ background:'#F5EFE0', border:'1px solid var(--soma-line-light)', borderRadius:12, padding:14, textAlign:'center', fontSize:12, color:'#5a6b63' }}>
        Founding Members offer has ended — {data.reason === 'cap_reached' ? '100 founding slots filled' : '90-day window closed'}. Normal rates apply. Existing founding members keep locked rate 12 months.
      </div>
    );
  }
  return (
    <div style={{ background:'linear-gradient(135deg, #FFF7E6 0%, #FFFBF0 100%)', border:'1px solid rgba(244,180,0,0.22)', borderRadius:16, padding:16, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
      <div>
        <div style={{ fontFamily:'var(--font-display)', fontSize:15, color:'var(--soma-forest)', fontWeight:600 }}>Founding Members — first 100 or first 90 days</div>
        <div style={{ fontSize:12, color:'#5a6b63', marginTop:4 }}>{data.remainingSlots} slots remaining · {data.daysRemaining} days left in window · Rate held 12 months</div>
      </div>
      <Link to="/founding" style={{ background:'var(--soma-gold)', color:'var(--soma-forest)', padding:'10px 16px', borderRadius:9999, fontSize:11, fontWeight:800, letterSpacing:'0.06em', textTransform:'uppercase' }}>View founding rates →</Link>
    </div>
  );
}
