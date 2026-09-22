import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import StatCard from '@/components/StatCard';
import { AlertTriangle, DollarSign, Loader2, Package, Receipt, TrendingUp } from 'lucide-react';

interface DashboardData {
  revenue:number; profit:number; invoices:number; due:number; medicineCount:number; lowStock:number; expiring30:number;
  recentSales:Array<{_id:string;invoiceNumber:string;total:number;saleDate:string;paymentMethod:string;customer?:{name:string}|null}>;
}
export default function DashboardPage(){
  const [data,setData]=useState<DashboardData|null>(null); const [error,setError]=useState('');
  useEffect(()=>{api.get<{data:DashboardData}>('/api/dashboard').then(r=>setData(r.data)).catch(e=>setError(e.message))},[]);
  if(error)return <div className="card p-6 text-red-600">{error}</div>;
  if(!data)return <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-600"/></div>;
  return <div className="space-y-6">
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard title="Today's Sales" value={formatCurrency(data.revenue)} icon={<DollarSign className="w-6 h-6"/>} color="primary"/>
      <StatCard title="Today's Gross Profit" value={formatCurrency(data.profit)} icon={<TrendingUp className="w-6 h-6"/>} color="success"/>
      <StatCard title="Invoices" value={data.invoices} icon={<Receipt className="w-6 h-6"/>} color="accent"/>
      <StatCard title="Due Sales" value={formatCurrency(data.due)} icon={<AlertTriangle className="w-6 h-6"/>} color="warning"/>
      <StatCard title="Medicines" value={data.medicineCount} icon={<Package className="w-6 h-6"/>} color="primary"/>
      <StatCard title="Low Stock" value={data.lowStock} icon={<AlertTriangle className="w-6 h-6"/>} color="danger"/>
      <StatCard title="Expiring ≤30 Days" value={data.expiring30} icon={<AlertTriangle className="w-6 h-6"/>} color="warning"/>
    </div>
    <div className="card overflow-hidden"><div className="px-5 py-4 border-b"><h3 className="font-semibold">Recent Sales</h3><p className="text-sm text-gray-500">Latest completed invoices from your branch</p></div><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b text-xs uppercase text-gray-500"><th className="text-left px-4 py-3">Invoice</th><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Customer</th><th className="text-left px-4 py-3">Payment</th><th className="text-right px-4 py-3">Total</th></tr></thead><tbody>{data.recentSales.map(s=><tr key={s._id} className="border-b table-row-hover"><td className="px-4 py-3 font-mono text-sm">{s.invoiceNumber}</td><td className="px-4 py-3 text-sm">{formatDateTime(s.saleDate)}</td><td className="px-4 py-3 text-sm">{s.customer?.name??'Walk-in'}</td><td className="px-4 py-3"><span className="badge-gray">{s.paymentMethod}</span></td><td className="px-4 py-3 text-right font-medium">{formatCurrency(s.total)}</td></tr>)}</tbody></table>{data.recentSales.length===0&&<p className="p-8 text-center text-gray-400">No sales yet today.</p>}</div></div>
  </div>
}
