import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchFoundingStatus } from '../../lib/somaApi.js';
import { useTranslation } from 'react-i18next';

export default function FoundingBanner() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchFoundingStatus().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);
  if (loading) return <div style={{ textAlign:'center', padding:12, fontSize:12, color:'#5a6b63' }}>{t('payAhead.checking')}</div>;
  if (!data) return null;
  if (!data.eligible) {
    return (
      <div style={{ background:'#F5EFE0', border:'1px solid var(--soma-line-light)', borderRadius:12, padding:14, textAlign:'center', fontSize:12, color:'#5a6b63' }}>
        {t('founding.offerEnded')} — {data.reason === 'cap_reached' ? t('founding.reasonCap') : t('founding.reasonWindow')}. {t('fundingBanner.normalRates')}
      </div>
    );
  }
  return (
    <div style={{ background:'linear-gradient(135deg, #FFF7E6 0%, #FFFBF0 100%)', border:'1px solid rgba(244,180,0,0.22)', borderRadius:16, padding:16, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
      <div>
        <div style={{ fontFamily:'var(--font-display)', fontSize:15, color:'var(--soma-forest)', fontWeight:600 }}>{t('join.foundingTitle')}</div>
        <div style={{ fontSize:12, color:'#5a6b63', marginTop:4 }}>{t('founding.slotsRemaining', { remaining: data.remainingSlots, days: data.daysRemaining, count: data.count, cap: data.cap })}</div>
      </div>
      <Link to="/founding" style={{ background:'var(--soma-gold)', color:'var(--soma-forest)', padding:'10px 16px', borderRadius:9999, fontSize:11, fontWeight:800, letterSpacing:'0.06em', textTransform:'uppercase' }}>{t('fundingBanner.viewRates')} →</Link>
    </div>
  );
}
