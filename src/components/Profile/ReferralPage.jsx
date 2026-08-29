import s from "./Dashboard.shared.module.css";
import styles from "./ReferralPage.module.css";

export default function ReferralPage({ student }) {
  const code    = student?.referralCode   ?? "—";
  const link    = student?.referralLink   ?? "#";
  const invited = student?.referralStats?.invited ?? 0;
  const joined  = student?.referralStats?.joined  ?? 0;
  const earned  = student?.referralStats?.earned  ?? 0;

  function copy() {
    navigator.clipboard?.writeText(link).catch(() => {});
  }

  return (
    <div>
      <p className={s.pageTitle}>Referral program</p>

      <div className={styles.refBox}>
        <div className={styles.refLabel}>Your referral code</div>
        <div className={styles.refCode}>{code}</div>
        <div className={styles.refSub}>Share and earn KES 500 credit for every friend who joins</div>
        <div className={styles.shareRow}>
          <button className={s.btnSm} onClick={copy}><i className="ti ti-copy" aria-hidden="true" /> Copy link</button>
          <a href={`mailto:?subject=Join yoga with my referral&body=Use code ${code}: ${link}`}>
            <button className={s.btnSm}><i className="ti ti-mail" aria-hidden="true" /> Email</button>
          </a>
        </div>
        <div className={styles.refStats}>
          <div className={styles.refStat}><div className={styles.refStatNum}>{invited}</div><div className={styles.refStatLbl}>Invited</div></div>
          <div className={styles.refStat}><div className={styles.refStatNum}>{joined}</div><div className={styles.refStatLbl}>Joined</div></div>
          <div className={styles.refStat}><div className={styles.refStatNum}>KES {earned?.toLocaleString("en-KE")}</div><div className={styles.refStatLbl}>Earned</div></div>
        </div>
      </div>
    </div>
  );
}
