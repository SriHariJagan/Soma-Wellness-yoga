import React from 'react';
import s from './YogaAdmin.module.css';
import Badge from './Badge';
import FeedbackBanner from './FeedbackBanner';
import { PageHeader, KpiCard, ChartCard, BarChart } from './ui/Primitives';
import { LuTicketPercent, LuTag, LuGift, LuTrendingUp, LuSparkles } from 'react-icons/lu';

export default function CouponsReferrals({ form, setForm, coupons = [], onSave, feedback }) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const totalRedemptions = coupons.reduce((a, c) => a + (c.usageCount || 0), 0);
  const referralCount = coupons.filter(c => c.isReferral).length;
  const activeCoupons = coupons.filter(c => c.active !== false).length;

  return (
    <div>
      <PageHeader title="Marketing Center" subtitle="Promotions, discount codes & referral loops" />

      {feedback?.message && <FeedbackBanner message={feedback.message} type={feedback.type} />}

      <div className={s.statsGrid} style={{ marginBottom: 20 }}>
        <KpiCard icon={<LuTicketPercent />} accent="orange" label="Active Coupons" value={activeCoupons} spark={[activeCoupons * 0.3 || 1, activeCoupons * 0.5 || 2, activeCoupons * 0.7 || 3, activeCoupons * 0.8 || 4, activeCoupons * 0.9 || 5, activeCoupons || 6]} />
        <KpiCard icon={<LuTrendingUp />} accent="green" label="Total Redemptions" value={totalRedemptions} spark={[totalRedemptions * 0.3 || 1, totalRedemptions * 0.5 || 2, totalRedemptions * 0.7 || 3, totalRedemptions * 0.8 || 4, totalRedemptions * 0.9 || 5, totalRedemptions || 6]} />
        <KpiCard icon={<LuGift />} accent="blue" label="Referral Codes" value={referralCount} spark={[referralCount * 0.3 || 1, referralCount * 0.5 || 2, referralCount * 0.7 || 3, referralCount * 0.8 || 4, referralCount * 0.9 || 5, referralCount || 6]} />
        <KpiCard icon={<LuSparkles />} accent="amber" label="Campaign Reach" value={totalRedemptions * 3 + coupons.length * 10 || 0} spark={[coupons.length || 1, coupons.length * 2 || 2, coupons.length * 3 || 3, coupons.length * 4 || 4, coupons.length * 5 || 5, coupons.length * 6 || 6]} />
      </div>

      <div className={s.grid2}>
        <div className={s.card}>
          <h3 className={s.cardTitle}><span className={s.cardTitleIcon}><LuTag /></span>Generate Coupon Code</h3>
          <form className={s.formStack} onSubmit={onSave}>
            <input type="text" placeholder="Code (e.g. FESTIVE20)" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="Percentage">Percentage (%)</option>
              <option value="Flat">Flat (₹)</option>
            </select>
            <input type="number" placeholder="Discount value" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} />
            <label className={s.checkLabel}>
              <input type="checkbox" checked={form.isReferral} onChange={e => setForm({ ...form, isReferral: e.target.checked })} className={s.checkInput} />
              Designate as Referral Tracking Code
            </label>
            <button type="submit" className={`${s.btn} ${s.btnPrimary}`} style={{ width: 'fit-content' }}><LuSparkles size={14} /> Activate Coupon</button>
          </form>
        </div>

        <ChartCard title="Redemption Trend" subtitle="Coupon usage per month" legend={[{ color: '#F97316', label: 'Redemptions' }]}>
          <div style={{ color: 'var(--text-1)' }}>
            <BarChart labels={months} data={[totalRedemptions * 0.2 || 1, totalRedemptions * 0.3 || 2, totalRedemptions * 0.5 || 3, totalRedemptions * 0.7 || 4, totalRedemptions * 0.9 || 5, totalRedemptions || 6].map(v => v * 4)} color="#F97316" />
          </div>
        </ChartCard>
      </div>

      <div className={s.card}>
        <h3 className={s.cardTitle}><span className={s.cardTitleIcon}><LuTicketPercent /></span>Active Promotions</h3>
        {coupons.length === 0 && <p className={s.cardDesc}>No coupons yet.</p>}
        <div className={s.catalogGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {coupons.map((cp) => (
            <div key={cp._id || cp.code} className={s.couponCard}>
              <div>
                <div className={s.couponCode}>{cp.code}</div>
                <div className={s.couponMeta}>{cp.value}{cp.discountType === 'Percentage' ? '%' : '₹'} Off · {cp.discountType}{cp.usageCount ? ` · used ${cp.usageCount}×` : ''}</div>
              </div>
              <Badge label={cp.isReferral ? 'Referral' : (cp.active === false ? 'Pending' : 'Active')} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
