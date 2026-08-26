import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SomaPageHeader from '../components/soma/SomaPageHeader.jsx';
import { fetchFoundingStatus } from '../lib/somaApi.js';
import PayAheadSelector from '../components/soma/PayAheadSelector.jsx';

const TIERS = [
  { key:'JUA', label:'SOMA JUA', normal:'12,000', founding:'10,000', save:'17%' },
  { key:'AMANI', label:'SOMA AMANI', normal:'18,500', founding:'15,000', save:'19%' },
  { key:'UZIMA', label:'SOMA UZIMA', normal:'28,500', founding:'24,000', save:'16%' },
  { key:'FAMILY', label:'SOMA FAMILY', normal:'35,000', founding:'28,500', save:'19%' },
];

export default function FoundingMembers() {
  const [founding, setFounding] = useState(null);
  const [selectedTier, setSelectedTier] = useState('UZIMA');
  useEffect(() => { fetchFoundingStatus().then(setFounding).catch(()=>{}); }, []);
  return (
    <div style={{ background:'var(--soma-cream)' }}>
      <SomaPageHeader
        eyebrow="Founding Members · Limited to 100 or 90 days"
        title="Be among the first<br /><em>100 to call SOMA home.</em>"
        subtitle="Spring Valley, Nairobi · Founding rate held 12 months from joining · Registration waived · Pay-ahead still applies on top."
        image="https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=900&auto=format&fit=crop"
      />
      <section style={{ maxWidth:1440, margin:'0 auto', padding:'24px clamp(20px,4vw,40px)' }}>
        {founding ? (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
            <div style={{ background: founding.eligible ? 'linear-gradient(135deg, #FFF7E6 0%, #FFFBF0 100%)' : '#F5EFE0', border:'1px solid rgba(244,180,0,0.22)', borderRadius:16, padding:16 }}>
              <div style={{ fontSize:11, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', color: founding.eligible ? 'var(--soma-primary)' : '#5a6b63' }}>{founding.eligible ? 'Founding offer live' : 'Founding offer ended'}</div>
              <div style={{ fontSize:12, color:'#5a6b63', marginTop:6 }}>{founding.remainingSlots} slots remaining · {founding.daysRemaining} days left · Count {founding.count}/{founding.cap}</div>
              {!founding.eligible && <div style={{ fontSize:11, color:'#b00020', marginTop:6 }}>Reason: {founding.reason} — founding pricing no longer offered on new signups. Existing founding members keep locked rate 12 months from join date.</div>}
            </div>
            <div style={{ background:'#fff', border:'1px solid var(--soma-line-light)', borderRadius:16, padding:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--soma-forest)' }}>How it works</div>
              <ul style={{ fontSize:12, color:'#5a6b63', marginTop:8, lineHeight:1.6, listStyle:'disc', paddingLeft:16 }}>
                <li>Eligibility = count &lt; 100 <strong>AND</strong> within 90 days of opening — both must hold.</li>
                <li>Once either fails, founding pricing auto-stops for new signups.</li>
                <li>Founding rate held 12 months via <code>founding_rate_expires_at</code>.</li>
                <li>Pay-ahead (3/6/12mo) applies on top of founding monthly as base.</li>
              </ul>
            </div>
          </div>
        ) : <div style={{ textAlign:'center', fontSize:12, color:'#5a6b63' }}>Loading founding status…</div>}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          {TIERS.map(t => (
            <div key={t.key} style={{ background:'#fff', border:'1px solid var(--soma-line-light)', borderRadius:16, padding:16, textAlign:'center' }}>
              <div style={{ fontSize:11, fontWeight:800, color:'var(--soma-forest)' }}>{t.label}</div>
              <div style={{ fontSize:12, color:'#5a6b63', marginTop:6, display:'flex', justifyContent:'center', gap:6, alignItems:'center' }}>
                <span style={{ textDecoration:'line-through', opacity:0.55 }}>{t.normal}</span> → <span style={{ fontWeight:800, color:'var(--soma-primary)' }}>{t.founding}</span>
              </div>
              <div style={{ fontSize:11, fontWeight:800, color:'var(--soma-gold)', marginTop:6, background:'rgba(244,180,0,0.10)', padding:'4px 8px', borderRadius:9999, display:'inline-block' }}>Save {t.save}</div>
              <button onClick={() => setSelectedTier(t.key)} style={{ marginTop:12, width:'100%', padding:'8px 10px', borderRadius:9999, border: selectedTier===t.key ? '2px solid var(--soma-forest)' : '1px solid var(--soma-line-light)', background: selectedTier===t.key ? 'var(--soma-forest)' : '#fff', color: selectedTier===t.key ? '#fff' : 'var(--soma-forest)', fontSize:11, fontWeight:700 }}>Select {t.key}</button>
            </div>
          ))}
        </div>

        <div style={{ marginTop:20, background:'#fff', border:'1px solid var(--soma-line-light)', borderRadius:16, padding:16 }}>
          <PayAheadSelector tierKey={selectedTier} foundingEligible={!!founding?.eligible} onSelect={()=>{}} />
        </div>

        <div style={{ marginTop:16, textAlign:'center' }}>
          <Link to="/contact" style={{ display:'inline-flex', background:'var(--soma-forest)', color:'#fff', padding:'14px 22px', borderRadius:9999, fontSize:12, fontWeight:800, letterSpacing:'0.06em' }}>Claim founding rate →</Link>
        </div>
        <div style={{ marginTop:12, fontSize:11, color:'#5a6b63', textAlign:'center' }}>All prices KES, VAT-inclusive. Admin can edit opening date + 90-day window and view remaining slots + per-member lock expiry.</div>
      </section>
    </div>
  );
}
