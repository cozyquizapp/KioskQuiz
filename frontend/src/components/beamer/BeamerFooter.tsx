import * as React from 'react';

type Props = {
  message?: string;
  detail?: string;
  status?: 'active' | 'locked' | 'info' | 'final';
};

const BeamerFooter: React.FC<Props> = ({ message, detail, status = 'info' }) => {
  if (!message && !detail) return null;
  return (
    <footer className={`beamer-footer status-${status}`}>
      <div className="beamer-footer-message">{message}</div>
      {detail && <div className="beamer-footer-detail">{detail}</div>}
    </footer>
  );
};

export default BeamerFooter;

