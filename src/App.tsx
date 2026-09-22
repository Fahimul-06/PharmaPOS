import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import AppShell from '@/components/AppShell';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import POSPage from '@/pages/POSPage';
import MedicinesPage from '@/pages/MedicinesPage';
import UploadMedicinesPage from '@/pages/UploadMedicinesPage';
import InventoryPage from '@/pages/InventoryPage';
import ReportsPage from '@/pages/ReportsPage';
import AuditLogPage from '@/pages/AuditLogPage';
import AdminUsersPage from '@/pages/AdminUsersPage';
import { Loader2 } from 'lucide-react';

const ROLE_PAGES: Record<string, string[]> = {
  admin: ['dashboard', 'pos', 'medicines', 'upload-medicines', 'inventory', 'reports', 'audit', 'settings'],
  manager: ['dashboard', 'pos', 'medicines', 'inventory', 'reports'],
  pharmacist: ['dashboard', 'pos', 'medicines'],
  cashier: ['dashboard', 'pos'],
  inventory: ['dashboard', 'medicines', 'upload-medicines', 'inventory'],
};

function currentHashPage() {
  return window.location.hash.replace(/^#\/?/, '') || 'dashboard';
}

function Content() {
  const { profile, loading } = useAuth();
  const [activePage, setActivePage] = useState(currentHashPage);

  useEffect(() => {
    const onHash = () => setActivePage(currentHashPage());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
  if (!profile) return <LoginPage />;

  const allowed = ROLE_PAGES[profile.role] ?? ['dashboard'];
  const page = allowed.includes(activePage) ? activePage : 'dashboard';
  const navigate = (next: string) => {
    if (!allowed.includes(next)) return;
    window.location.hash = `/${next}`;
    setActivePage(next);
  };

  const render = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage />;
      case 'pos': return <POSPage />;
      case 'medicines': return <MedicinesPage />;
      case 'upload-medicines': return <UploadMedicinesPage />;
      case 'inventory': return <InventoryPage />;
      case 'reports': return <ReportsPage />;
      case 'audit': return <AuditLogPage />;
      case 'settings': return <AdminUsersPage />;
      default: return <DashboardPage />;
    }
  };

  return <AppShell activePage={page} onPageChange={navigate}>{render()}</AppShell>;
}

export default function App() {
  return <ThemeProvider><AuthProvider><Content /></AuthProvider></ThemeProvider>;
}
