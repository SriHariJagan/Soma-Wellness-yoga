import React, { useState } from 'react';
import { createAppointment, createQuoteRequest } from '../../lib/somaApi.js';

function HealthDisclosureStep({ onChange }) {
  const [vals, setVals] = useState({ pregnancy:false, recentSurgery:false, injury:false, significantPain:false, heartConcerns:false, otherCondition:'', consentGiven:false, therapyDisclaimerAccepted:false });
  const update = (k,v) => { const nv={...vals,[k]:v}; setVals(nv); onChange?.(nv); };
  return (
    <div style={{ border:'1px solid var(--soma-line-light)', borderRadius:12, padding:14, background:'#FFFDF7', display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ fontSize:12, fontWeight:800, color:'var(--soma-forest)' }}>Health disclosure — required before booking</div>
      <div style={{ fontSize:11, color:'#5a6b63' }}>Please tell us about: pregnancy, recent surgery, injury, significant pain, heart concerns, or any other relevant condition.</div>
      {[
        ['pregnancy','Pregnancy'],
        ['recentSurgery','Recent surgery'],
        ['injury','Injury'],
        ['significantPain','Significant pain'],
        ['heartConcerns','Heart concerns'],
      ].map(([k,label]) => (
        <label key={k} style={{ display:'flex', gap:8, alignItems:'center', fontSize:12 }}>
          <input type="checkbox" checked={vals[k]} onChange={(e)=>update(k,e.target.checked)} /> {label}
        </label>
      ))}
      <label style={{ display:'flex', gap:8, alignItems:'center', fontSize:12 }}>
        <input type="checkbox" checked={vals.hasOther || !!vals.otherCondition} onChange={(e)=>update('otherCondition', e.target.checked ? ' ' : '')} /> Other condition
      </label>
      { (vals.hasOther || vals.otherCondition) && <textarea value={vals.otherCondition} onChange={(e)=>update('otherCondition', e.target.value)} placeholder="Please describe" rows={2} style={{ width:'100%', border:'1px solid var(--soma-line-light)', borderRadius:8, padding:8, fontSize:12 }} />}
      <label style={{ display:'flex', gap:8, alignItems:'flex-start', fontSize:11, background:'#fff', border:'1px solid var(--soma-line-light)', padding:8, borderRadius:8 }}>
        <input type="checkbox" checked={vals.consentGiven} onChange={(e)=>update('consentGiven', e.target.checked)} /> I confirm the above is accurate and consent to SOMA using this to adapt my session.
      </label>
      <label style={{ display:'flex', gap:8, alignItems:'flex-start', fontSize:11, background:'#fff', border:'1px solid var(--soma-line-light)', padding:8, borderRadius:8 }}>
        <input type="checkbox" checked={vals.therapyDisclaimerAccepted} onChange={(e)=>update('therapyDisclaimerAccepted', e.target.checked)} /> Therapy supports wellbeing/function and does not replace medical diagnosis or emergency care; medical clearance may be required — I understand and accept. *
      </label>
      <div style={{ fontSize:10, color:'#5a6b63' }}>* Required before booking therapy. Admin may flag medical clearance.</div>
    </div>
  );
}

export function InstantCheckout({ type, basePrice, title }) {
  const [slot, setSlot] = useState('');
  const [health, setHealth] = useState(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const canSubmit = health?.consentGiven && (type.includes('therapy') ? health.therapyDisclaimerAccepted : true);
  const handleBook = async () => {
    if (!canSubmit) { setMsg('Please complete health disclosure checkboxes'); return; }
    setLoading(true); setMsg('');
    try {
      const res = await createAppointment({ type, slotStart: slot || new Date(Date.now()+86400000).toISOString(), slotEnd: new Date(new Date(slot || Date.now()+86400000).getTime()+60*60000).toISOString(), basePrice, healthDisclosure: health, therapyDisclaimerAccepted: !!health?.therapyDisclaimerAccepted });
      setMsg(`Booked! Final KES ${res.finalPrice} (discount ${Math.round((res.discountPct||0)*100)}%, surcharge ${Math.round((res.surchargePct||0)*100)}%)`);
    } catch (e) { setMsg(e.message); } finally { setLoading(false); }
  };
  return (
    <div style={{ border:'1px solid var(--soma-line-light)', borderRadius:16, padding:16, background:'#fff', display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ fontWeight:700, color:'var(--soma-forest)' }}>{title} — KES {basePrice} · Instant checkout</div>
      <input type="datetime-local" value={slot} onChange={(e)=>setSlot(e.target.value)} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <HealthDisclosureStep onChange={setHealth} />
      <button disabled={loading || !canSubmit} onClick={handleBook} style={{ padding:12, borderRadius:9999, background: canSubmit ? 'var(--soma-forest)' : '#aaa', color:'#fff', fontWeight:800, fontSize:12 }}>{loading ? 'Booking…' : 'Confirm booking'}</button>
      {msg && <div style={{ fontSize:12, padding:8, background:'var(--soma-ivory)', borderRadius:8 }}>{msg}</div>}
      {!canSubmit && <div style={{ fontSize:11, color:'#b00020' }}>Health disclosure + therapy disclaimer must be checked to book.</div>}
    </div>
  );
}

export function QuoteForm({ typeLabel = 'At home / hotel — request a quote' }) {
  const [form, setForm] = useState({ name:'', email:'', phone:'', distanceKm:'', groupSize:1, durationMin:60, venueAddress:'', preferredDate:'', notes:'' });
  const [msg, setMsg] = useState('');
  const submit = async () => {
    setMsg('');
    try { await createQuoteRequest({ ...form, name: form.name, email: form.email, phone: form.phone, type:'home_hotel', distanceKm:Number(form.distanceKm)||0, groupSize:Number(form.groupSize), durationMin:Number(form.durationMin), venueAddress:form.venueAddress, notes:form.notes }); setMsg('Quote requested — we will reply within a day.'); } catch(e){ setMsg(e.message); }
  };
  return (
    <div style={{ border:'1px solid var(--soma-line-light)', borderRadius:16, padding:16, background:'#FFFDF7', display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ fontWeight:700, color:'var(--soma-forest)' }}>{typeLabel}</div>
      <div style={{ fontSize:11, color:'#5a6b63' }}>Price from KES 9,500 — quoted on distance, group size & duration. No fixed checkout.</div>
      <input placeholder="Name *" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <input placeholder="Email *" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <input placeholder="Phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
        <input placeholder="Distance km" value={form.distanceKm} onChange={e=>setForm({...form,distanceKm:e.target.value})} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
        <input type="number" placeholder="Group size" value={form.groupSize} onChange={e=>setForm({...form,groupSize:e.target.value})} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
        <input type="number" placeholder="Duration min" value={form.durationMin} onChange={e=>setForm({...form,durationMin:e.target.value})} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      </div>
      <input placeholder="Venue address" value={form.venueAddress} onChange={e=>setForm({...form,venueAddress:e.target.value})} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <input type="date" value={form.preferredDate} onChange={e=>setForm({...form,preferredDate:e.target.value})} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <textarea placeholder="Notes (headcount, venue, travel, facilitators, equipment, refreshments, reporting)" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <button onClick={submit} style={{ padding:12, borderRadius:9999, background:'var(--soma-forest)', color:'#fff', fontWeight:800 }}>Request quote</button>
      {msg && <div style={{ fontSize:12, background:'#fff', border:'1px solid var(--soma-line-light)', padding:8, borderRadius:8 }}>{msg}</div>}
    </div>
  );
}

export function CorporateQuoteForm() {
  const [form, setForm] = useState({ companyName:'', contactName:'', email:'', phone:'', headcount:'', venue:'', programme:'Single session', notes:'' });
  const [msg, setMsg] = useState('');
  const submit = async () => {
    try { await createQuoteRequest({ ...form, name: form.contactName, type:'corporate', companyName: form.companyName, headcount: Number(form.headcount)||0, venue: form.venue, programme: form.programme, notes: form.notes }); setMsg('Corporate lead created — admin will contact you.'); } catch(e){ setMsg(e.message); }
  };
  return (
    <div style={{ border:'1px solid var(--soma-line-light)', borderRadius:16, padding:16, background:'#fff', display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ fontWeight:700, color:'var(--soma-forest)' }}>Corporate Wellness — quote request</div>
      <div style={{ fontSize:11, color:'#5a6b63' }}>Quote-driven on numbers, venue, travel, facilitators, equipment, refreshments, reporting. Only Single session (KES 18,000 ≤20 people) is instant-bookable.</div>
      <input placeholder="Company name *" value={form.companyName} onChange={e=>setForm({...form,companyName:e.target.value})} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <input placeholder="Contact name" value={form.contactName} onChange={e=>setForm({...form,contactName:e.target.value})} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <input placeholder="Email *" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <input placeholder="Phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <input placeholder="Headcount" value={form.headcount} onChange={e=>setForm({...form,headcount:e.target.value})} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <input placeholder="Venue (SOMA or client offices + address)" value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <select value={form.programme} onChange={e=>setForm({...form,programme:e.target.value})} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }}>
        <option>Single session</option>
        <option>Monthly programme (4 sessions)</option>
        <option>Monthly programme (8 sessions)</option>
        <option>Wellness day</option>
        <option>Annual contract</option>
      </select>
      <textarea placeholder="Notes (facilitators, equipment, refreshments, reporting)" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <button onClick={submit} style={{ padding:12, borderRadius:9999, background:'var(--soma-forest)', color:'#fff', fontWeight:800 }}>Request corporate quote</button>
      {msg && <div style={{ fontSize:12, background:'var(--soma-ivory)', padding:8, borderRadius:8 }}>{msg}</div>}
    </div>
  );
}
