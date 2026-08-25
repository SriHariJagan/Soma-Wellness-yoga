import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function useScrollToSection(paramName = 'scrollTo') {
  const location = useLocation();
  const target = location.state?.[paramName];

  useEffect(() => {
    if (!target) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToSection(target);
      });
    });
  }, [target]);
}
