import { useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { BarChart3, Boxes, FileClock, LayoutDashboard, LogOut, Menu, Moon, Package, Pill, Settings, ShoppingCart, Sun, Upload, X } from 'lucide-react';

interface NavItem { id: string; label: string; icon: ReactNode; roles: string[]; }
const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, roles: ['admin','manager','pharmacist','cashier','inventory'] },
  { id: 'pos', label: 'POS / Sales', icon: <ShoppingCart className="w-5 h-5" />, roles: ['admin','manager','pharmacist','cashier'] },
  { id: 'medicines', label: 'Medicines', icon: <Package className="w-5 h-5" />, roles: ['admin','manager','inventory','pharmacist'] },
  { id: 'upload-medicines', label: 'Upload Medicines', icon: <Upload className="w-5 h-5" />, roles: ['admin','inventory'] },
  { id: 'inventory', label: 'Batch Inventory', icon: <Boxes className="w-5 h-5" />, roles: ['admin','manager','inventory'] },
  { id: 'reports', label: 'Sales Reports', icon: <BarChart3 className="w-5 h-5" />, roles: ['admin','manager'] },
  { id: 'audit', label: 'Audit Logs', icon: <FileClock className="w-5 h-5" />, roles: ['admin'] },
  { id: 'settings', label: 'Admin Users', icon: <Settings className="w-5 h-5" />, roles: ['admin'] },
];

const ROLE_COLORS: Record<string,string> = {
  admin:'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', manager:'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', pharmacist:'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400', cashier:'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', inventory:'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
};

export default function AppShell({ activePage, onPageChange, children }: { activePage: string; onPageChange:(page:string)=>void; children:ReactNode }) {
  const { profile, signOut } = useAuth(); const { theme, toggleTheme } = useTheme(); const [sidebarOpen,setSidebarOpen]=useState(false);
  const role=profile?.role ?? 'cashier'; const visible=NAV_ITEMS.filter((i)=>i.roles.includes(role));
  const nav=(id:string)=>{onPageChange(id);setSidebarOpen(false)};
  return <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
    {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={()=>setSidebarOpen(false)} />}
    <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white dark:bg-gray-900 border-r z-40 flex flex-col transition-transform ${sidebarOpen?'translate-x-0':'-translate-x-full lg:translate-x-0'}`}>
      <div className="flex items-center gap-3 px-5 py-5 border-b"><div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center"><Pill className="w-6 h-6 text-white" /></div><div><h1 className="font-bold">PharmaPOS</h1><p className="text-xs text-gray-500">MongoDB Edition</p></div></div>
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">{visible.map((item)=><button key={item.id} onClick={()=>nav(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${activePage===item.id?'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400':'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}>{item.icon}{item.label}</button>)}</nav>
      <div className="border-t p-3"><div className="flex items-center gap-3 px-2 py-2"><div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">{profile?.fullName?.charAt(0).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{profile?.fullName}</p><span className={`inline-flex px-2 py-0.5 rounded-full text-xs capitalize ${ROLE_COLORS[role]}`}>{role}</span><p className="text-xs text-gray-400 mt-1 truncate">{profile?.branch?.name ?? 'All branches'}</p></div></div><button onClick={signOut} className="w-full mt-2 flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"><LogOut className="w-4 h-4" />Sign Out</button></div>
    </aside>
    <div className="flex-1 flex flex-col min-w-0"><header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b px-4 py-3 flex justify-between"><div className="flex items-center gap-3"><button onClick={()=>setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">{sidebarOpen?<X className="w-5 h-5"/>:<Menu className="w-5 h-5"/>}</button><h2 className="text-lg font-semibold">{NAV_ITEMS.find(i=>i.id===activePage)?.label ?? 'Dashboard'}</h2></div><button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">{theme==='light'?<Moon className="w-5 h-5"/>:<Sun className="w-5 h-5"/>}</button></header><main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main></div>
  </div>;
}
