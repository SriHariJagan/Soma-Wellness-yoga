import React from 'react';
import { useTranslation } from 'react-i18next';

export default function MembershipComparison() {
  const { t } = useTranslation();
  const tiersData = t('home.pricing.members', { returnObjects: true });
  const tiers = tiersData && typeof tiersData === 'object' ? tiersData : {};
  const list = [
    { key: 'jua', price: '12,000' },
    { key: 'amani', price: '18,500', badgeKey: null },
    { key: 'uzima', price: '28,500', badgeKey: 'home.pricing.badgeBest' },
    { key: 'family', price: '35,000' },
  ];

  const rows = [
    { label: t('membershipCompare.groupYoga'), vals: ['8', t('common.unlimited') || 'Unlimited', t('common.unlimited') || 'Unlimited', `${t('common.unlimited') || 'Unlimited'} (2)`] },
    { label: t('membershipCompare.meditation'), vals: ['—', t('membershipCompare.included'), t('membershipCompare.included'), t('membershipCompare.included')] },
    { label: t('join.somaDaily').split('·')[0].trim(), vals: ['—', t('membershipCompare.included'), t('membershipCompare.included'), t('membershipCompare.included')] },
    { label: t('membershipCompare.massages'), vals: ['—', '—', '2/mo', '—'] },
    { label: t('membershipCompare.privateSession'), vals: ['—', '—', '1/mo', '—'] },
    { label: t('membershipCompare.discountElse'), vals: [t('membershipCompare.memberRates'), t('membershipCompare.memberRates'), '15% off', '10% off'] },
  ];

  return (
    <div style={{ border:'1px solid var(--soma-line-light)', borderRadius:16, overflow:'hidden', background:'#fff' }}>
      <div style={{ padding:14, background:'var(--soma-ivory)', borderBottom:'1px solid var(--soma-line-light)', fontSize:11, fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--soma-forest)' }}>{t('membershipCompare.title')}</div>
      <div style={{ display:'grid', gridTemplateColumns:'180px repeat(4,1fr)', fontSize:12, gap:0 }}>
        <div style={{ padding:12, fontWeight:700, background:'var(--soma-cream)', borderRight:'1px solid var(--soma-line-light)' }}>{t('membershipCompare.feature')}</div>
        {list.map((l) => {
          const tier = tiers?.[l.key];
          const isBadge = !!l.badgeKey;
          return (
            <div key={l.key} style={{ padding:12, textAlign:'center', fontWeight:800, background: isBadge ? 'var(--soma-forest)' : 'var(--soma-cream)', color: isBadge ? '#fff':'var(--soma-forest)' }}>
              {tier?.name || l.key}
              <div style={{ fontSize:11, fontWeight:400, opacity:0.8 }}>{tier?.sub || ''}</div>
            </div>
          );
        })}
        {rows.map(row => (
          <React.Fragment key={row.label}>
            <div style={{ padding:10, borderTop:'1px solid var(--soma-line-light)', background:'var(--soma-ivory)', fontWeight:600 }}>{row.label}</div>
            {row.vals.map((v,i) => <div key={i} style={{ padding:10, textAlign:'center', borderTop:'1px solid var(--soma-line-light)', borderLeft:'1px solid var(--soma-line-light)' }}>{v}</div>)}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
