import React from 'react';

const TIERS = [
  { key:'JUA', label:'SOMA JUA', sub:'Move · Energise · Shine', price:'12,000', features:['8 group yoga classes a month','Member rates on everything else'] },
  { key:'AMANI', label:'SOMA AMANI', sub:'Move into balance', price:'18,500', features:['Unlimited group yoga','Meditation and breathwork','SOMA DAILY included','Member rates on everything else'] },
  { key:'UZIMA', label:'SOMA UZIMA', sub:'Yoga and recovery, complete', price:'28,500', badge:'BEST VALUE', features:['Unlimited yoga and meditation','SOMA DAILY included','2 sixty-minute massages','1 private yoga or therapy session','Priority booking · 2 guest passes','15% off everything else'] },
  { key:'FAMILY', label:'SOMA FAMILY', sub:'One household, one plan', price:'35,000', features:['2 adults, unlimited yoga',"1 children's or teen programme",'Meditation and breathwork','SOMA DAILY included','10% off everything else'] },
];

export default function MembershipComparison() {
  return (
    <div style={{ border:'1px solid var(--soma-line-light)', borderRadius:16, overflow:'hidden', background:'#fff' }}>
      <div style={{ padding:14, background:'var(--soma-ivory)', borderBottom:'1px solid var(--soma-line-light)', fontSize:11, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--soma-forest)' }}>Membership comparison — each level includes everything in the tier below it, plus more</div>
      <div style={{ display:'grid', gridTemplateColumns:'180px repeat(4,1fr)', fontSize:12, gap:0 }}>
        <div style={{ padding:12, fontWeight:700, background:'var(--soma-cream)', borderRight:'1px solid var(--soma-line-light)' }}>Feature</div>
        {TIERS.map(t => <div key={t.key} style={{ padding:12, textAlign:'center', fontWeight:800, background: t.badge ? 'var(--soma-forest)' : 'var(--soma-cream)', color: t.badge ? '#fff':'var(--soma-forest)' }}>{t.label}<div style={{ fontSize:11, fontWeight:400, opacity:0.8 }}>{t.sub}</div></div>)}
        {[
          { label:'Group yoga / month', vals:['8','Unlimited','Unlimited','Unlimited (2 adults)'] },
          { label:'Meditation & breathwork', vals:['—','Included','Included','Included'] },
          { label:'SOMA DAILY', vals:['—','Included','Included','Included'] },
          { label:'Massages (60min)', vals:['—','—','2/mo','—'] },
          { label:'Private session', vals:['—','—','1/mo','—'] },
          { label:'Discount on else', vals:['Member rates','Member rates','15% off','10% off'] },
        ].map(row => (
          <React.Fragment key={row.label}>
            <div style={{ padding:10, borderTop:'1px solid var(--soma-line-light)', background:'var(--soma-ivory)', fontWeight:600 }}>{row.label}</div>
            {row.vals.map((v,i) => <div key={i} style={{ padding:10, textAlign:'center', borderTop:'1px solid var(--soma-line-light)', borderLeft:'1px solid var(--soma-line-light)' }}>{v}</div>)}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
