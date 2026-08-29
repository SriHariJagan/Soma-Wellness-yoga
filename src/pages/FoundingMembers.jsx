import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SomaPageHeader from '../components/soma/SomaPageHeader.jsx';
import { fetchFoundingStatus } from '../lib/somaApi.js';
import PayAheadSelector from '../components/soma/PayAheadSelector.jsx';
import { useTranslation } from 'react-i18next';
import { EASE, usePrefersReducedMotion } from '../lib/motion';
import { resolveMembershipPrice } from '../lib/pricing.js';
import { formatKES } from '../lib/currency.js';
import styles from './FoundingMembers.module.css';

const TIERS = [
  { key:'JUA', label:'SOMA JUA', normal:'12,000', founding:'10,000', save:'17%', icon:'☀️', desc:'8 classes/month · Member rates', popular:false },
  { key:'AMANI', label:'SOMA AMANI', normal:'18,500', founding:'15,000', save:'19%', icon:'🧘', desc:'Unlimited · Daily included', popular:false },
  { key:'UZIMA', label:'SOMA UZIMA', normal:'28,500', founding:'24,000', save:'16%', icon:'✨', desc:'Unlimited + 2 massages + private', popular:true },
  { key:'FAMILY', label:'SOMA FAMILY', normal:'35,000', founding:'28,500', save:'19%', icon:'👨‍👩‍👧‍👦', desc:'2 adults unlimited + Young', popular:false },
];

export default function FoundingMembers() {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion();
  const navigate = useNavigate();
  const [founding, setFounding] = useState(null);
  const [selectedTier, setSelectedTier] = useState('UZIMA');
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [selectedPrice, setSelectedPrice] = useState(null);
  useEffect(() => { fetchFoundingStatus().then(setFounding).catch(()=>{}); }, []);

  const handlePayAheadSelect = useCallback((term, priceInfo) => {
    setSelectedTerm(term);
    setSelectedPrice(priceInfo);
  }, []);

  const handleClaim = useCallback(() => {
    try {
      const isEligible = founding === null ? true : !!founding?.eligible;
      const priceInfo = selectedPrice || resolveMembershipPrice(selectedTier, selectedTerm, { foundingEligible: isEligible });
      const tierInfo = TIERS.find(tier => tier.key === selectedTier);
      const termLabel = `${selectedTerm} month${selectedTerm > 1 ? 's' : ''}`;
      navigate('/payment', {
        state: {
          name: `${tierInfo?.label || selectedTier} · ${termLabel} · Founding`,
          price: formatKES(priceInfo.termTotal),
          time: termLabel,
          tier: selectedTier,
          term: selectedTerm,
          founding: true,
          foundingEligible: isEligible,
          amount: priceInfo.termTotal,
        }
      });
    } catch (err) {
      console.error('Claim error:', err);
      navigate('/contact');
    }
  }, [selectedPrice, selectedTier, selectedTerm, founding, navigate]);
  return (
    <div style={{ background:'var(--soma-cream)' }}>
      <SomaPageHeader
        eyebrow={t('founding.eyebrow')}
        title={t('founding.title')}
        subtitle={t('founding.subtitle')}
        image="https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=900&auto=format&fit=crop"
      />
      <section className={styles.section}>
        {founding ? (
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE }}
            className={styles.heroStats}
          >
            <div className={`${styles.statusCard} ${!founding.eligible ? styles.statusCardEnded : ''}`}>
              <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                <div className={`${styles.statusIcon} ${!founding.eligible ? styles.statusIconEnded : ''}`}>
                  {founding.eligible ? '◈' : '◐'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', color: founding.eligible ? 'var(--soma-primary)' : '#5a6b63', display:'flex', alignItems:'center', gap:8 }}>
                    {founding.eligible ? t('founding.offerLive') : t('founding.offerEnded')}
                    {founding.eligible && <span style={{ width:8, height:8, borderRadius:'50%', background:'#16A34A', boxShadow:'0 0 0 4px rgba(22,163,74,0.15)', animation: reduced ? 'none' : 'pulse 2s infinite' }} />}
                  </div>
                  <div style={{ fontSize:13, color:'#5a6b63', marginTop:8, lineHeight:1.5, fontWeight:500 }}>{t('founding.slotsRemaining', { remaining: founding.remainingSlots, days: founding.daysRemaining, count: founding.count, cap: founding.cap })}</div>
                  {!founding.eligible && <div style={{ fontSize:11, color:'#b00020', marginTop:8, background:'rgba(176,0,32,0.06)', padding:'6px 10px', borderRadius:8, border:'1px solid rgba(176,0,32,0.12)' }}>{founding.reason === 'cap_reached' || founding.reason === 'cap_and_window_exceeded' ? t('founding.reasonCap') : t('founding.reasonWindow')}</div>}
                  {founding.eligible && (
                    <div style={{ marginTop:12, display:'flex', gap:8, alignItems:'center' }}>
                      <div style={{ flex:1, height:6, background:'rgba(38,51,44,0.08)', borderRadius:9999, overflow:'hidden' }}>
                        <motion.div 
                          initial={{ width:0 }}
                          whileInView={{ width: `${Math.min(100, (founding.count/founding.cap)*100)}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay:0.3, ease: EASE }}
                          style={{ height:'100%', background:'linear-gradient(90deg, #F4B400, #FFD54F)', borderRadius:9999 }}
                        />
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, color:'var(--soma-forest)' }}>{founding.count}/{founding.cap}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.infoCard}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <span style={{ width:28, height:28, borderRadius:8, background:'var(--soma-ivory)', color:'var(--soma-primary)', display:'grid', placeItems:'center', fontSize:14, border:'1px solid var(--soma-line-light)' }}>✓</span>
                <span style={{ fontSize:12, fontWeight:800, color:'var(--soma-forest)', letterSpacing:'-0.01em' }}>{t('founding.howItWorks')}</span>
              </div>
              <ul style={{ fontSize:12.5, color:'#5a6b63', lineHeight:1.7, listStyle:'none', padding:0, display:'flex', flexDirection:'column', gap:6 }}>
                {(() => { const pts = t('founding.howPoints', { returnObjects: true }); return (Array.isArray(pts) ? pts : []).map((p,i) => (
                  <motion.li 
                    key={i}
                    initial={{ opacity:0, x:-8 }}
                    whileInView={{ opacity:1, x:0 }}
                    viewport={{ once: true }}
                    transition={{ delay:i*0.08, duration:0.4, ease: EASE }}
                    style={{ display:'flex', gap:8, alignItems:'flex-start' }}
                  >
                    <span style={{ width:18, height:18, borderRadius:'50%', background:'var(--soma-primary)', color:'#fff', display:'grid', placeItems:'center', fontSize:10, fontWeight:700, flexShrink:0, marginTop:1 }}>{i+1}</span> {p}
                  </motion.li>
                )); })()}
              </ul>
            </div>
          </motion.div>
        ) : (
          <div style={{ textAlign:'center', padding:24 }}>
            <div style={{ width:32, height:32, border:'2px solid var(--soma-line)', borderTopColor:'var(--soma-primary)', borderRadius:'50%', margin:'0 auto 12px', animation:'spin 0.8s linear infinite' }} />
            <div style={{ fontSize:13, color:'#5a6b63' }}>{t('common.loading')}</div>
          </div>
        )}

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin:"-40px" }}
          variants={{ hidden:{}, visible:{ transition:{ staggerChildren: reduced?0:0.08, delayChildren: reduced?0:0.1 } } }}
          className={styles.tiersGrid}
        >
          {TIERS.map(tier => {
            const isSelected = selectedTier===tier.key;
            const isPopular = tier.popular;
            return (
              <motion.div 
                key={tier.key} 
                variants={{ hidden:{ opacity:0, y:16, scale:0.97 }, visible:{ opacity:1, y:0, scale:1, transition:{ duration:0.5, ease:EASE } } }}
                whileHover={reduced?{}:{ y:-6, scale: isSelected?1.02:1.015 }}
                whileTap={{ scale:0.98 }}
                onClick={() => setSelectedTier(tier.key)}
                className={`${styles.tierCard} ${isSelected ? styles.tierCardSelected : ''}`}
                style={{ cursor:'pointer' }}
              >
                {isPopular && <div className={styles.tierBadge}>★ POPULAR</div>}
                <div className={styles.tierIcon}>{tier.icon}</div>
                <div style={{ fontSize:13, fontWeight:800, letterSpacing:'0.05em', color: isSelected ? '#fff' : 'var(--soma-forest)', marginTop:2 }}>{tier.label}</div>
                <div style={{ fontSize:11, color: isSelected ? 'rgba(255,255,255,0.72)' : '#5a6b63', marginTop:4, fontWeight:500, lineHeight:1.3 }}>{tier.desc}</div>
                <div style={{ marginTop:12, display:'flex', justifyContent:'center', alignItems:'baseline', gap:6 }}>
                  <span style={{ fontSize:11, color: isSelected ? 'rgba(255,255,255,0.6)' : '#9CA3AF', textDecoration:'line-through' }}>{tier.normal}</span>
                  <span style={{ fontSize:18, fontWeight:800, color: isSelected ? '#FFD54F' : 'var(--soma-primary)', letterSpacing:'-0.02em' }}>{tier.founding}</span>
                  <span style={{ fontSize:10, color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--soma-warm-gray)', fontWeight:600 }}>KES</span>
                </div>
                <div style={{ marginTop:8, display:'inline-flex', alignItems:'center', gap:6, fontSize:11, fontWeight:800, color: isSelected ? '#183D2D' : 'var(--soma-forest)', background: isSelected ? 'linear-gradient(135deg, #F4B400, #FFD54F)' : 'rgba(244,180,0,0.12)', padding:'5px 10px', borderRadius:9999, border:`1px solid ${isSelected ? 'rgba(255,255,255,0.3)' : 'rgba(244,180,0,0.18)'}` }}>
                  <span style={{ width:4, height:4, borderRadius:'50%', background: isSelected ? '#183D2D' : 'var(--soma-gold)' }} /> Save {tier.save}
                </div>
                <div style={{ marginTop:14, width:'100%', padding:'10px', borderRadius:9999, fontSize:11, fontWeight:800, letterSpacing:'0.04em', textAlign:'center', background: isSelected ? '#fff' : 'var(--soma-forest)', color: isSelected ? 'var(--soma-forest)' : '#fff', border:`1px solid ${isSelected ? '#fff' : 'transparent'}`, boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.12)' : 'none' }}>
                  {isSelected ? '✓ Selected' : t('founding.select', { tier: tier.key })}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity:0, y:16 }}
          whileInView={{ opacity:1, y:0 }}
          viewport={{ once: true }}
          transition={{ duration:0.6, ease:EASE }}
          className={styles.payAheadCard}
        >
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <span style={{ width:28, height:28, borderRadius:8, background:'linear-gradient(135deg, #183D2D, #2E7D5B)', color:'#fff', display:'grid', placeItems:'center', fontSize:12 }}>◈</span>
            <div>
              <div style={{ fontSize:13, fontWeight:800, color:'var(--soma-forest)', letterSpacing:'-0.01em' }}>Pay Ahead & Save</div>
              <div style={{ fontSize:11, color:'var(--soma-warm-gray)' }}>Lock your founding rate for 3, 6 or 12 months</div>
            </div>
            <span style={{ marginLeft:'auto', fontSize:10, fontWeight:800, letterSpacing:'0.06em', background:'var(--soma-gold)', color:'var(--soma-forest)', padding:'4px 8px', borderRadius:9999 }}>SAVE UP TO 16%</span>
          </div>
          <PayAheadSelector tierKey={selectedTier} foundingEligible={founding === null ? true : !!founding?.eligible} onSelect={handlePayAheadSelect} />
        </motion.div>

        <motion.div
          initial={{ opacity:0, y:12 }}
          whileInView={{ opacity:1, y:0 }}
          viewport={{ once: true }}
          transition={{ duration:0.6, delay:0.15, ease:EASE }}
          className={styles.ctaSection}
        >
          <motion.button
            onClick={handleClaim}
            className={styles.ctaButton}
            whileHover={reduced ? {} : { y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{ border:'none', cursor:'pointer', fontFamily:'inherit' }}
          >
            {t('founding.claim')} — {selectedTier} · {selectedTerm}mo · {selectedPrice ? formatKES(selectedPrice.termTotal) : formatKES(resolveMembershipPrice(selectedTier, selectedTerm, { foundingEligible: founding === null ? true : !!founding?.eligible }).termTotal)} <span style={{ marginLeft:4 }}>→</span>
          </motion.button>
          <div style={{ marginTop:8, fontSize:11, color:'#5a6b63' }}>
            Or <Link to="/contact" style={{ color:'var(--soma-primary)', fontWeight:700, textDecoration:'underline' }}>contact us</Link> for help
          </div>
          <div style={{ marginTop:10, fontSize:11, color:'#5a6b63', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <span style={{ width:4, height:4, borderRadius:'50%', background:'var(--soma-primary)' }} /> {t('founding.allPrices')} · No hidden fees
          </div>
        </motion.div>
      </section>
    </div>
  );
}
