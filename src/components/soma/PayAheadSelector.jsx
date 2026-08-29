import React, { useState, useEffect } from 'react';
import { resolveMembershipPrice } from '../../lib/pricing.js';
import { formatKES } from '../../lib/currency.js';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { EASE } from '../../lib/motion';

export default function PayAheadSelector({ tierKey = 'JUA', foundingEligible = false, onSelect }) {
  const { t } = useTranslation();
  const [term, setTerm] = useState(1);
  const terms = [1,3,6,12];
  const labels = { 1: t('join.monthly'), 3: t('join.threeMonths'), 6: t('join.sixMonths'), 12: t('join.twelveMonths') };
  const savings = { 1: '0%', 3: '10%', 6: '15%', 12: '25%' };
  
  useEffect(() => { 
    const result = resolveMembershipPrice(tierKey, term, { foundingEligible });
    onSelect?.(term, result); 
  }, [term, tierKey, foundingEligible, onSelect]);

  const currentPrice = resolveMembershipPrice(tierKey, term, { foundingEligible });
  const monthlyEquiv = Math.round(currentPrice.termTotal / term);
  const normalMonthly = resolveMembershipPrice(tierKey, 1, { foundingEligible: false }).termTotal;
  const normalTotal = normalMonthly * term;
  const totalSaving = normalTotal - currentPrice.termTotal;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
        <div style={{ fontSize:11, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--soma-forest)', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--soma-gold)', boxShadow:'0 0 8px rgba(244,180,0,0.32)' }} />
          {t('payAhead.title')}
        </div>
        {foundingEligible && <span style={{ fontSize:10, fontWeight:800, background:'linear-gradient(135deg, #F4B400, #FFD54F)', color:'#183D2D', padding:'4px 8px', borderRadius:9999, letterSpacing:'0.05em' }}>FOUNDING RATE</span>}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {terms.map((m) => {
          const r = resolveMembershipPrice(tierKey, m, { foundingEligible });
          const active = term===m;
          const isBestValue = m === 12;
          return (
            <motion.button 
              key={m} 
              onClick={() => setTerm(m)} 
              aria-label={labels[m]} 
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ 
                padding:14, 
                borderRadius:14, 
                border: active ? '2px solid var(--soma-gold)' : '1px solid var(--soma-line-light)', 
                background: active ? 'linear-gradient(135deg, #183D2D 0%, #1e4d3a 100%)' : '#fff', 
                color: active ? '#fff' : 'var(--soma-forest)', 
                textAlign:'center',
                position:'relative',
                overflow:'hidden',
                boxShadow: active ? '0 8px 20px rgba(24,61,45,0.15), inset 0 1px 0 rgba(255,255,255,0.10)' : '0 2px 8px rgba(24,61,45,0.04)',
                transition:'all 0.2s ease',
                cursor:'pointer'
              }}
            >
              {isBestValue && <div style={{ position:'absolute', top:6, right:6, background:'var(--soma-gold)', color:'#183D2D', fontSize:8, fontWeight:800, padding:'2px 6px', borderRadius:9999, letterSpacing:'0.05em' }}>BEST</div>}
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', opacity: active ? 0.8 : 0.7 }}>{labels[m]}</div>
              <div style={{ fontSize:15, fontWeight:800, marginTop:6, letterSpacing:'-0.02em' }}>{formatKES(r.termTotal)}</div>
              <div style={{ fontSize:10, opacity: active ? 0.7 : 0.6, marginTop:2 }}>{formatKES(Math.round(r.termTotal/m))}/mo</div>
              {m !== 1 && <div style={{ fontSize:10, fontWeight:700, marginTop:6, background: active ? 'rgba(244,180,0,0.20)' : 'rgba(244,180,0,0.12)', color: active ? '#FFD54F' : 'var(--soma-gold)', padding:'3px 6px', borderRadius:9999, display:'inline-block' }}>Save {savings[m]}</div>}
            </motion.button>
          );
        })}
      </div>

      <motion.div
        key={`${tierKey}-${term}`}
        initial={{ opacity:0, y:8 }}
        animate={{ opacity:1, y:0 }}
        transition={{ duration:0.4, ease:EASE }}
        style={{ background:'linear-gradient(135deg, var(--soma-ivory) 0%, #FFF7E6 100%)', border:'1px solid rgba(244,180,0,0.18)', borderRadius:12, padding:14, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}
      >
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--soma-forest)', letterSpacing:'0.04em' }}>{tierKey} · {labels[term]} · {formatKES(currentPrice.termTotal)}</div>
          <div style={{ fontSize:11, color:'#5a6b63', marginTop:2 }}>{formatKES(monthlyEquiv)}/month · {foundingEligible ? 'Founding rate locked' : 'Standard rate'}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          {totalSaving > 0 && <div style={{ fontSize:11, fontWeight:800, color:'#16A34A' }}>Save {formatKES(totalSaving)}</div>}
          <div style={{ fontSize:10, color:'var(--soma-warm-gray)' }}>vs monthly</div>
        </div>
      </motion.div>

      <div style={{ fontSize:11, color:'var(--soma-warm-gray)', lineHeight:1.5, display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.6)', padding:'8px 10px', borderRadius:8, border:'1px solid rgba(38,51,44,0.06)' }}>
        <span style={{ width:14, height:14, borderRadius:'50%', background:'var(--soma-primary)', color:'#fff', display:'grid', placeItems:'center', fontSize:9, flexShrink:0 }}>✓</span>
        {t('payAhead.note')}
      </div>
    </div>
  );
}
