import { useNavigate } from 'react-router-dom';
import cardStyles from '../shared/ServiceCard.module.css';
import browseStyles from './BrowseMoreCard.module.css';

export default function BrowseMoreCard() {
  const navigate = useNavigate();

  const handleBrowse = () => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/studentdashboard?tab=browseServices");
    } else {
      navigate(`/login?redirectTo=${encodeURIComponent("/studentdashboard?tab=browseServices")}`);
    }
  };

  return (
    <article className={cardStyles.card}>
      <div className={cardStyles.cardBody}>
        <div className={browseStyles.iconWrap}>
          <i className="ti ti-compass" aria-hidden="true" />
        </div>

        <h3 className={cardStyles.cardTitle}>Browse More Services</h3>

        <p className={cardStyles.cardDesc}>
          Explore our complete catalog of yoga services, therapies, workshops, and wellness programs tailored for every journey.
        </p>

        <div className={cardStyles.typeTag}>
          <i className="ti ti-sparkles" aria-hidden="true" />
          <span>Full Catalog</span>
        </div>
      </div>

      <div className={cardStyles.cardFooter}>
        <button
          type="button"
          className={cardStyles.ctaBtn}
          onClick={handleBrowse}
        >
          Browse Services
          <i className="ti ti-arrow-right" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
