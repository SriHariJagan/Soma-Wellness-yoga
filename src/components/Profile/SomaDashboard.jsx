import React, { useEffect, useState } from 'react';
import { fetchSomaDashboard } from '../../lib/somaApi.js';
import { formatKES } from '../../lib/currency.js';

export default function SomaDashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    fetchSomaDashboard().then(setData).catch((e) => setErr(e.message));
  }, []);
  if (err) return <div style={{ padding:20, color:'#b00020' }}>{err}</div>;
  if (!data) return <div style={{ padding:20 }}>Loading SOMA dashboard…</div>;
  const { membership, allowances, passes, giftVouchers, appointments, upcomingBookings, resetProgress, packages } = data;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:22, color:'var(--soma-forest)' }}>Your SOMA Wellness</h2>

      {/* Membership */}
      <div style={{ background:'#fff', border:'1px solid var(--soma-line-light)', borderRadius:16, padding:16 }}>
        <div style={{ fontWeight:700, color:'var(--soma-forest)' }}>Active membership / tier</div>
        {membership ? (
          <div style={{ fontSize:13, marginTop:8, lineHeight:1.6 }}>
            <div><strong>{membership.tier || membership.planType}</strong> · {membership.termMonths || membership.planMonths}mo · {formatKES(membership.price)} · {membership.status} {membership.isFounding ? '· Founding (until ' + new Date(membership.founding_rate_expires_at).toLocaleDateString() + ')' : ''}</div>
            <div style={{ marginTop:8, fontSize:12, color:'#5a6b63' }}>Allowance usage this cycle:</div>
            <div style={{ marginTop:4, display:'flex', flexWrap:'wrap', gap:8 }}>
              {allowances.map((a) => (
                <span key={a.key} style={{ background:'var(--soma-ivory)', border:'1px solid var(--soma-line-light)', padding:'6px 10px', borderRadius:9999, fontSize:11, fontWeight:600 }}>{a.key}: {a.display}</span>
              ))}
              {allowances.length===0 && <span style={{ fontSize:11, color:'#5a6b63' }}>No allowances tracked</span>}
            </div>
          </div>
        ) : <div style={{ fontSize:13, color:'#5a6b63', marginTop:8 }}>No active membership. <a href="/classes" style={{ color:'var(--soma-primary)', fontWeight:600 }}>Browse Join →</a></div>}
      </div>

      {/* Passes */}
      <div style={{ background:'#fff', border:'1px solid var(--soma-line-light)', borderRadius:16, padding:16 }}>
        <div style={{ fontWeight:700, color:'var(--soma-forest)' }}>Class passes</div>
        {passes?.length ? passes.map((p) => (
          <div key={p._id} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--soma-line-light)', fontSize:12 }}>
            <span>{p.label} — {p.remainingClasses}/{p.totalClasses} left</span>
            <span style={{ fontWeight:700 }}>{p.status} · {p.daysLeft != null ? p.daysLeft + ' days left' : ''} · expires {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : p.activatedAt ? 'from first use' : 'not yet activated'}</span>
          </div>
        )) : <div style={{ fontSize:12, color:'#5a6b63', marginTop:8 }}>No passes. Purchase 5 for 11K or 10 for 21K.</div>}
      </div>

      {/* RESET */}
      <div style={{ background:'linear-gradient(135deg, #183D2D 0%, #2E7D5B 100%)', color:'#fff', borderRadius:16, padding:16 }}>
        <div style={{ fontWeight:700 }}>SOMA RESET — 6-week tracker</div>
        {resetProgress?.length ? resetProgress.map((r) => (
          <div key={r._id} style={{ marginTop:8, fontSize:12, lineHeight:1.6 }}>
            <div>Yoga {r.yogaSessionsUsed}/{r.yogaSessionsTotal} · Meditation {r.meditationUsed}/{r.meditationTotal} · Massages {r.massagesUsed}/{r.massagesTotal}</div>
            <div>Assessment {r.assessmentDone ? '✓' : '—'} · Home plan {r.homePlanDelivered ? '✓' : '—'} · Review {r.closingReviewDone ? '✓' : '—'} · {r.progressPct ?? ''}%</div>
          </div>
        )) : <div style={{ fontSize:12, opacity:0.85, marginTop:8 }}>No active RESET. 32,000 KES for 12 yoga + 6 meditation + 2 massages + plan + review.</div>}
      </div>

      {/* Packages */}
      <div style={{ background:'#fff', border:'1px solid var(--soma-line-light)', borderRadius:16, padding:16 }}>
        <div style={{ fontWeight:700, color:'var(--soma-forest)' }}>Active packages (expiry from first use)</div>
        {packages?.length ? packages.slice(0,5).map((p) => (
          <div key={p._id} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--soma-line-light)', fontSize:12 }}>
            <span>{p.serviceName} · {p.status}</span>
            <span>{p.remainingSessions ?? ''} left · {p.daysLeft ?? ''} days</span>
          </div>
        )) : <div style={{ fontSize:12, color:'#5a6b63' }}>No packages</div>}
      </div>

      {/* Vouchers */}
      <div style={{ background:'#fff', border:'1px solid var(--soma-line-light)', borderRadius:16, padding:16 }}>
        <div style={{ fontWeight:700, color:'var(--soma-forest)' }}>Gift vouchers — balance & expiry</div>
        {giftVouchers?.length ? giftVouchers.map((v) => (
          <div key={v._id} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--soma-line-light)', fontSize:12 }}>
            <span>{v.code} · {formatKES(v.balance)} / {formatKES(v.amount)}</span>
            <span>{v.status} · exp {new Date(v.expiresAt).toLocaleDateString()}</span>
          </div>
        )) : <div style={{ fontSize:12, color:'#5a6b63' }}>No vouchers. Any value, valid 12 months.</div>}
      </div>

      {/* Bookings */}
      <div style={{ background:'#fff', border:'1px solid var(--soma-line-light)', borderRadius:16, padding:16 }}>
        <div style={{ fontWeight:700, color:'var(--soma-forest)' }}>Upcoming bookings · cancellation fee preview</div>
        {upcomingBookings?.length ? upcomingBookings.map((a) => (
          <div key={a._id} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--soma-line-light)', fontSize:12 }}>
            <span>{a.type} · {new Date(a.slotStart).toLocaleString()} · {formatKES(a.finalPrice)}</span>
            <span style={{ color:'#b00020' }}>Cancel ≥12h free; &lt;12h 50%; no-show 100%</span>
          </div>
        )) : appointments?.length ? <div style={{ fontSize:12, color:'#5a6b63' }}>No upcoming — {appointments.length} total bookings.</div> : <div style={{ fontSize:12, color:'#5a6b63' }}>No bookings yet.</div>}
      </div>
    </div>
  );
}
