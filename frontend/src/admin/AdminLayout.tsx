import { ReactNode } from 'react';
import { theme } from '../theme';

interface AdminLayoutProps {
  children: ReactNode;
}

// Rahmen für die Admin-Ansicht; hier Farben/Abstände zentral anpassen
const AdminLayout = ({ children }: AdminLayoutProps) => {
  return (
    <div style={{ padding: theme.spacing(2), maxWidth: 1200, margin: '0 auto' }}>
      {children}
    </div>
  );
};

export default AdminLayout;
