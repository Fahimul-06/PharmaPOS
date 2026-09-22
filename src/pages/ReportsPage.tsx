import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Sale } from '@/lib/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import { DollarSign, Loader2, Receipt, TrendingDown, TrendingUp, Wallet } from 'lucide-react';

interface ReportResponse {
  data: Sale[];
  summary: { revenue:number;cogs:number;profit:number;discount:number;due:number;count:number;avg:number };
  paymentBreakdown:Array<{_id:string;total:number;count:number}>;
  daily:Array<{_id:string;revenue:number;profit:number;count:number}>;
}
const isoDate=(d:Date)=>d.toISOString().slice(0,10);
export default function ReportsPage(){
  const now=new Date(); const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
  const [from,setFrom]=useState(isoDate(monthStart)); const [to,setTo]=useState(isoDate(now)); const [report,setReport]=useState<ReportResponse|null>(null); const [loading,setLoading]=useState(false); const [error,setError]=useState('');
  const load=useCallback(async()=>{setLoading(true);setError('');try{setReport(await api.get<ReportResponse>(`/api/reports/sales?from=${from}&to=${to}`))}catch(e){setError(e instanceof Error?e.message:'Report failed')}finally{setLoading(false)}},[from,to]);
  useEffect(()=>{load()},[load]);
  const exportCsv=()=>{if(!report)return;const head='invoice,date,customer,cashier,payment,revenue,cogs,gross_profit,discount,due\n';const rows=report.data.map(s=>[s.invoiceNumber,new Date(s.saleDate).toISOString(),s.customer?.name??'Walk-in',s.cashier?.fullName??'',s.paymentMethod,s.total,s.totalCogs,s.grossProfit,s.discount,s.dueAmount].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');const blob=new Blob([head+rows],{type:'text/csv'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`sales-report-${from}-to-${to}.csv`;a.click();URL.revokeObjectURL(url)};
  const cols=[
    {key:'invoice',label:'Invoice',render:(s:Sale)=><span className="font-mono text-sm">{s.invoiceNumber}</span>},
    {key:'date',label:'Date',render:(s:Sale)=>formatDateTime(s.saleDate)},
    {key:'customer',label:'Customer',render:(s:Sale)=>s.customer?.name??'Walk-in'},
    {key:'payment',label:'Payment',render:(s:Sale)=><span className="badge-gray">{s.paymentMethod}</span>},
    {key:'revenue',label:'Revenue',render:(s:Sale)=>formatCurrency(s.total)},
    {key:'cogs',label:'COGS',render:(s:Sale)=>formatCurrency(s.totalCogs)},
    {key:'profit',label:'Gross Profit',render:(s:Sale)=><span className={s.grossProfit>=0?'text-green-600 font-semibold':'text-red-600 font-semibold'}>{formatCurrency(s.grossProfit)}</span>},
    {key:'due',label:'Due',render:(s:Sale)=>formatCurrency(s.dueAmount)},
  ];
  return <div className="space-y-5">
    <div className="card p-4 flex flex-col md:flex-row gap-3 md:items-end md:justify-between"><div className="flex flex-wrap gap-3"><div><label className="label">From</label><input type="date" className="input" value={from} onChange={e=>setFrom(e.target.value)}/></div><div><label className="label">To</label><input type="date" className="input" value={to} onChange={e=>setTo(e.target.value)}/></div><button className="btn-primary self-end" onClick={load}>Apply</button></div><button className="btn-secondary" onClick={exportCsv} disabled={!report}>Export CSV</button></div>
    {error&&<div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600">{error}</div>}
    {loading&&!report?<div className="py-20 grid place-items-center"><Loader2 className="w-8 h-8 animate-spin text-primary-600"/></div>:report&&<>
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-4"><StatCard title="Revenue" value={formatCurrency(report.summary.revenue)} icon={<DollarSign className="w-6 h-6"/>} color="primary"/><StatCard title="COGS" value={formatCurrency(report.summary.cogs)} icon={<TrendingDown className="w-6 h-6"/>} color="warning"/><StatCard title="Gross Profit" value={formatCurrency(report.summary.profit)} icon={<TrendingUp className="w-6 h-6"/>} color="success"/><StatCard title="Invoices" value={report.summary.count} icon={<Receipt className="w-6 h-6"/>} color="accent"/><StatCard title="Discount" value={formatCurrency(report.summary.discount)} icon={<Wallet className="w-6 h-6"/>} color="warning"/><StatCard title="Outstanding Due" value={formatCurrency(report.summary.due)} icon={<Wallet className="w-6 h-6"/>} color="danger"/></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5"><div className="card p-5"><h3 className="font-semibold">Payment Breakdown</h3><div className="mt-4 space-y-3">{report.paymentBreakdown.map(p=><div key={p._id} className="flex justify-between items-center border-b pb-2"><div><p className="font-medium capitalize">{p._id.replace('_',' ')}</p><p className="text-xs text-gray-500">{p.count} invoice(s)</p></div><span className="font-semibold">{formatCurrency(p.total)}</span></div>)}</div></div><div className="card p-5"><h3 className="font-semibold">Daily Summary</h3><div className="mt-4 max-h-60 overflow-auto space-y-2">{report.daily.map(d=><div key={d._id} className="grid grid-cols-3 gap-2 text-sm border-b py-2"><span>{d._id}</span><span className="text-right">{formatCurrency(d.revenue)}</span><span className="text-right text-green-600">{formatCurrency(d.profit)}</span></div>)}</div></div></div>
      <div className="card"><div className="px-5 py-4 border-b"><h3 className="font-semibold">Sales Detail</h3><p className="text-sm text-gray-500">Server-calculated revenue, COGS and gross profit</p></div><DataTable data={report.data.map(s=>({...s,id:s._id}))} columns={cols as any} pageSize={25}/></div>
    </>}
  </div>
}
