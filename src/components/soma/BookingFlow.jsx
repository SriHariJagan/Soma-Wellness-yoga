import React, { useState } from 'react';
import { createAppointment, createQuoteRequest } from '../../lib/somaApi.js';
import { useTranslation } from 'react-i18next';
import CheckoutGate from '../checkout/CheckoutGate.jsx';
import { isLoggedIn } from '../../utils/payment.js';

function HealthDisclosureStep({ onChange }) {
  const { t } = useTranslation();
  const [vals, setVals] = useState({ pregnancy:false, recentSurgery:false, injury:false, significantPain:false, heartConcerns:false, otherCondition:'', consentGiven:false, therapyDisclaimerAccepted:false });
  const update = (k,v) => { const nv={...vals,[k]:v}; setVals(nv); onChange?.(nv); };
  return (
    <div style={{ border:'1px solid var(--soma-line-light)', borderRadius:12, padding:14, background:'#FFFDF7', display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ fontSize:12, fontWeight:800, color:'var(--soma-forest)' }}>{t('booking.healthDisclosure')}</div>
      <div style={{ fontSize:11, color:'#5a6b63' }}>{t('booking.healthDesc')}</div>
      {[
        ['pregnancy', t('booking.pregnancy')],
        ['recentSurgery', t('booking.recentSurgery')],
        ['injury', t('booking.injury')],
        ['significantPain', t('booking.significantPain')],
        ['heartConcerns', t('booking.heartConcerns')],
      ].map(([k,label]) => (
        <label key={k} style={{ display:'flex', gap:8, alignItems:'center', fontSize:12 }}>
          <input type="checkbox" aria-label={label} checked={vals[k]} onChange={(e)=>update(k,e.target.checked)} /> {label}
        </label>
      ))}
      <label style={{ display:'flex', gap:8, alignItems:'center', fontSize:12 }}>
        <input type="checkbox" checked={vals.hasOther || !!vals.otherCondition} onChange={(e)=>update('otherCondition', e.target.checked ? ' ' : '')} /> {t('booking.otherCondition')}
      </label>
      { (vals.hasOther || vals.otherCondition) && <textarea value={vals.otherCondition} onChange={(e)=>update('otherCondition', e.target.value)} placeholder={t('booking.describePlaceholder')} rows={2} style={{ width:'100%', border:'1px solid var(--soma-line-light)', borderRadius:8, padding:8, fontSize:12 }} />}
      <label style={{ display:'flex', gap:8, alignItems:'flex-start', fontSize:11, background:'#fff', border:'1px solid var(--soma-line-light)', padding:8, borderRadius:8 }}>
        <input type="checkbox" checked={vals.consentGiven} onChange={(e)=>update('consentGiven', e.target.checked)} /> {t('booking.consent')}
      </label>
      <label style={{ display:'flex', gap:8, alignItems:'flex-start', fontSize:11, background:'#fff', border:'1px solid var(--soma-line-light)', padding:8, borderRadius:8 }}>
        <input type="checkbox" checked={vals.therapyDisclaimerAccepted} onChange={(e)=>update('therapyDisclaimerAccepted', e.target.checked)} /> {t('booking.therapyDisclaimer')} *
      </label>
      <div style={{ fontSize:10, color:'#5a6b63' }}>{t('booking.requiredNote')}</div>
    </div>
  );
}

export function InstantCheckout({ type, basePrice, title }) {
  const { t } = useTranslation();
  const [slot, setSlot] = useState('');
  const [health, setHealth] = useState(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const canSubmit = health?.consentGiven && (type.includes('therapy') ? health.therapyDisclaimerAccepted : true);
  const doBook = async () => {
    if (!canSubmit) { setMsg(t('booking.completeDisclosure')); return; }
    setLoading(true); setMsg('');
    try {
      const res = await createAppointment({ type, slotStart: slot || new Date(Date.now()+86400000).toISOString(), slotEnd: new Date(new Date(slot || Date.now()+86400000).getTime()+60*60000).toISOString(), basePrice, healthDisclosure: health, therapyDisclaimerAccepted: !!health?.therapyDisclaimerAccepted });
      setMsg(t('booking.bookedSuccess', { price: res.finalPrice, discount: Math.round((res.discountPct||0)*100), surcharge: Math.round((res.surchargePct||0)*100) }));
    } catch (e) { setMsg(e.message); } finally { setLoading(false); }
  };
  const handleBook = () => doBook();
  return (
    <div style={{ border:'1px solid var(--soma-line-light)', borderRadius:16, padding:16, background:'#fff', display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ fontWeight:700, color:'var(--soma-forest)' }}>{title} — KES {basePrice} · {t('booking.instantLabel')}</div>
      <input type="datetime-local" value={slot} onChange={(e)=>setSlot(e.target.value)} aria-label={t('booking.durationMin')} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <HealthDisclosureStep onChange={setHealth} />
      {isLoggedIn() ? (
        <button disabled={loading || !canSubmit} onClick={handleBook} style={{ padding:12, borderRadius:9999, background: canSubmit ? 'var(--soma-forest)' : '#aaa', color:'#fff', fontWeight:800, fontSize:12 }}>{loading ? t('booking.booking') : t('booking.confirmBooking')}</button>
      ) : (
        <CheckoutGate intent={{ name: title || type, price: `KES ${basePrice}`, sub: t('booking.instantLabel'), type: 'appointment' }} onProceed={doBook}>
          <button disabled={loading || !canSubmit} style={{ padding:12, borderRadius:9999, background: canSubmit ? 'var(--soma-forest)' : '#aaa', color:'#fff', fontWeight:800, fontSize:12 }}>{loading ? t('booking.booking') : t('booking.confirmBooking')}</button>
        </CheckoutGate>
      )}
      {msg && <div style={{ fontSize:12, padding:8, background:'var(--soma-ivory)', borderRadius:8 }}>{msg}</div>}
      {!canSubmit && <div style={{ fontSize:11, color:'#b00020' }}>{t('booking.mustCheck')}</div>}
    </div>
  );
}

export function QuoteForm({ typeLabel }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name:'', email:'', phone:'', distanceKm:'', groupSize:1, durationMin:60, venueAddress:'', preferredDate:'', notes:'' });
  const [msg, setMsg] = useState('');
  const submit = async () => {
    setMsg('');
    try { await createQuoteRequest({ ...form, name: form.name, email: form.email, phone: form.phone, type:'home_hotel', distanceKm:Number(form.distanceKm)||0, groupSize:Number(form.groupSize), durationMin:Number(form.durationMin), venueAddress:form.venueAddress, notes:form.notes }); setMsg(t('booking.quoteSuccess')); } catch(e){ setMsg(e.message); }
  };
  return (
    <div style={{ border:'1px solid var(--soma-line-light)', borderRadius:16, padding:16, background:'#FFFDF7', display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ fontWeight:700, color:'var(--soma-forest)' }}>{typeLabel || t('booking.quoteTitle')}</div>
      <div style={{ fontSize:11, color:'#5a6b63' }}>{t('booking.quoteDesc')}</div>
      <input placeholder={t('booking.namePlaceholder')} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} aria-label={t('common.name')} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <input placeholder={t('booking.emailPlaceholder')} value={form.email} onChange={e=>setForm({...form,email:e.target.value})} aria-label={t('common.email')} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <input placeholder={t('booking.phonePlaceholder')} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} aria-label={t('common.phone')} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
        <input placeholder={t('booking.distanceKm')} value={form.distanceKm} onChange={e=>setForm({...form,distanceKm:e.target.value})} aria-label={t('booking.distanceKm')} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
        <input type="number" placeholder={t('booking.groupSize')} value={form.groupSize} onChange={e=>setForm({...form,groupSize:e.target.value})} aria-label={t('booking.groupSize')} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
        <input type="number" placeholder={t('booking.durationMin')} value={form.durationMin} onChange={e=>setForm({...form,durationMin:e.target.value})} aria-label={t('booking.durationMin')} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      </div>
      <input placeholder={t('booking.venueAddress')} value={form.venueAddress} onChange={e=>setForm({...form,venueAddress:e.target.value})} aria-label={t('booking.venueAddress')} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <input type="date" value={form.preferredDate} onChange={e=>setForm({...form,preferredDate:e.target.value})} aria-label={t('booking.preferredDate') || 'Date'} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <textarea placeholder={t('booking.notesPlaceholder')} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3} aria-label={t('common.message')} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <button onClick={submit} style={{ padding:12, borderRadius:9999, background:'var(--soma-forest)', color:'#fff', fontWeight:800 }}>{t('booking.requestQuote')}</button>
      {msg && <div style={{ fontSize:12, background:'#fff', border:'1px solid var(--soma-line-light)', padding:8, borderRadius:8 }}>{msg}</div>}
    </div>
  );
}

export function CorporateQuoteForm() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ companyName:'', contactName:'', email:'', phone:'', headcount:'', venue:'', programme:'Single session', notes:'' });
  const [msg, setMsg] = useState('');
  const submit = async () => {
    try { await createQuoteRequest({ ...form, name: form.contactName, type:'corporate', companyName: form.companyName, headcount: Number(form.headcount)||0, venue: form.venue, programme: form.programme, notes: form.notes }); setMsg(t('booking.corporateSuccess')); } catch(e){ setMsg(e.message); }
  };
  return (
    <div style={{ border:'1px solid var(--soma-line-light)', borderRadius:16, padding:16, background:'#fff', display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ fontWeight:700, color:'var(--soma-forest)' }}>{t('booking.corporateTitle')}</div>
      <div style={{ fontSize:11, color:'#5a6b63' }}>{t('booking.corporateDesc')}</div>
      <input placeholder={t('booking.companyName')} value={form.companyName} onChange={e=>setForm({...form,companyName:e.target.value})} aria-label={t('booking.companyName')} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <input placeholder={t('booking.contactName')} value={form.contactName} onChange={e=>setForm({...form,contactName:e.target.value})} aria-label={t('booking.contactName')} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <input placeholder={t('booking.emailPlaceholder')} value={form.email} onChange={e=>setForm({...form,email:e.target.value})} aria-label={t('common.email')} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <input placeholder={t('booking.phonePlaceholder')} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} aria-label={t('common.phone')} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <input placeholder={t('booking.headcount')} value={form.headcount} onChange={e=>setForm({...form,headcount:e.target.value})} aria-label={t('booking.headcount')} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <input placeholder={t('booking.venuePlaceholder')} value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})} aria-label={t('booking.venuePlaceholder')} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <select value={form.programme} onChange={e=>setForm({...form,programme:e.target.value})} aria-label={t('booking.corporateTitle')} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }}>
        <option>{t('booking.programmeSingle')}</option>
        <option>{t('booking.programmeMonthly4')}</option>
        <option>{t('booking.programmeMonthly8')}</option>
        <option>{t('booking.programmeWellnessDay')}</option>
        <option>{t('booking.programmeAnnual')}</option>
      </select>
      <textarea placeholder={t('booking.notesPlaceholder')} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3} aria-label={t('common.message')} style={{ padding:10, border:'1px solid var(--soma-line-light)', borderRadius:8 }} />
      <button onClick={submit} style={{ padding:12, borderRadius:9999, background:'var(--soma-forest)', color:'#fff', fontWeight:800 }}>{t('booking.requestCorporateQuote')}</button>
      {msg && <div style={{ fontSize:12, background:'var(--soma-ivory)', padding:8, borderRadius:8 }}>{msg}</div>}
    </div>
  );
}
