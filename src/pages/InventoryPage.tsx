import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Batch, BranchRef, Medicine } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import Modal from '@/components/Modal';
import DataTable from '@/components/DataTable';
import { Boxes, Edit3, Loader2, Plus, Search } from 'lucide-react';

export default function InventoryPage(){
  const [batches,setBatches]=useState<Batch[]>([]); const [medicines,setMedicines]=useState<Medicine[]>([]); const [branches,setBranches]=useState<BranchRef[]>([]); const [loading,setLoading]=useState(true); const [search,setSearch]=useState(''); const [showReceive,setShowReceive]=useState(false); const [adjusting,setAdjusting]=useState<Batch|null>(null); const [saving,setSaving]=useState(false); const [error,setError]=useState('');
  const [receive,setReceive]=useState({medicineId:'',branchId:'',batchNumber:'',manufacturingDate:'',expiryDate:'',quantity:1,unit:'unit' as 'unit'|'strip'|'box',costPrice:0,note:''}); const [adjust,setAdjust]=useState({newQuantity:0,reason:''});
  const load=useCallback(async()=>{setLoading(true);try{const [b,m,br]=await Promise.all([api.get<{data:Batch[]}>('/api/inventory/batches'),api.get<{data:Medicine[]}>('/api/medicines?limit=100&active=true'),api.get<{data:BranchRef[]}>('/api/inventory/branches')]);setBatches(b.data);setMedicines(m.data);setBranches(br.data)}catch(e){setError(e instanceof Error?e.message:'Failed to load')}finally{setLoading(false)}},[]);
  useEffect(()=>{load()},[load]);
  const filtered=batches.filter(b=>!search||`${b.medicine.brandName} ${b.medicine.genericName} ${b.batchNumber} ${b.medicine.sku||''}`.toLowerCase().includes(search.toLowerCase()));
  const receiveStock=async()=>{setSaving(true);setError('');try{await api.post('/api/inventory/batches',receive);setShowReceive(false);setReceive({medicineId:'',branchId:'',batchNumber:'',manufacturingDate:'',expiryDate:'',quantity:1,unit:'unit',costPrice:0,note:''});await load()}catch(e){setError(e instanceof Error?e.message:'Receive failed')}finally{setSaving(false)}};
  const saveAdjust=async()=>{if(!adjusting)return;setSaving(true);setError('');try{await api.patch(`/api/inventory/batches/${adjusting._id}/adjust`,adjust);setAdjusting(null);await load()}catch(e){setError(e instanceof Error?e.message:'Adjustment failed')}finally{setSaving(false)}};
  const cols=[
    {key:'medicine',label:'Medicine',render:(b:Batch)=><div><p className="font-medium">{b.medicine.brandName} {b.medicine.strength}</p><p className="text-xs text-gray-500">{b.medicine.genericName}</p></div>},
    {key:'batch',label:'Batch',render:(b:Batch)=><span className="font-mono">{b.batchNumber}</span>},
    {key:'branch',label:'Branch',render:(b:Batch)=>b.branch?.name??'—'},
    {key:'expiry',label:'Expiry',render:(b:Batch)=>{const days=Math.ceil((new Date(b.expiryDate).getTime()-Date.now())/86400000);return <div><p>{formatDate(b.expiryDate)}</p><span className={days<0?'badge-danger':days<=30?'badge-warning':'badge-success'}>{days<0?'Expired':`${days} days`}</span></div>}},
    {key:'qty',label:'Base Stock',render:(b:Batch)=><span className="font-semibold">{b.quantity}</span>},
    {key:'cost',label:'Cost / Unit',render:(b:Batch)=>formatCurrency(b.costPrice)},
    {key:'value',label:'Value',render:(b:Batch)=>formatCurrency(b.costPrice*b.quantity)},
    {key:'action',label:'',render:(b:Batch)=><button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" onClick={()=>{setAdjusting(b);setAdjust({newQuantity:b.quantity,reason:''});setError('')}}><Edit3 className="w-4 h-4"/></button>},
  ];
  return <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><div className="card p-5 sm:col-span-1"><div className="flex items-center gap-3"><div className="p-3 bg-primary-50 rounded-xl text-primary-600"><Boxes className="w-6 h-6"/></div><div><p className="text-sm text-gray-500">Batches</p><p className="text-2xl font-bold">{batches.length}</p></div></div></div><div className="card p-5"><p className="text-sm text-gray-500">Base Units in Stock</p><p className="text-2xl font-bold mt-1">{batches.reduce((s,b)=>s+b.quantity,0)}</p></div><div className="card p-5"><p className="text-sm text-gray-500">Stock Value</p><p className="text-2xl font-bold mt-1">{formatCurrency(batches.reduce((s,b)=>s+b.costPrice*b.quantity,0))}</p></div></div>
    <div className="flex flex-col sm:flex-row gap-3 justify-between"><div className="relative max-w-xl w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/><input className="input pl-10" placeholder="Search medicine or batch..." value={search} onChange={e=>setSearch(e.target.value)}/></div><button className="btn-primary" onClick={()=>{setError('');setShowReceive(true)}}><Plus className="w-4 h-4"/>Receive Stock</button></div>
    {error&&<div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600">{error}</div>}
    <div className="card">{loading?<div className="py-16 grid place-items-center"><Loader2 className="w-8 h-8 animate-spin text-primary-600"/></div>:<DataTable data={filtered.map(b=>({...b,id:b._id}))} columns={cols as any} pageSize={20}/>}</div>
    <Modal isOpen={showReceive} onClose={()=>setShowReceive(false)} title="Receive Batch Stock" size="lg"><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <F label="Medicine"><select className="input" value={receive.medicineId} onChange={e=>setReceive({...receive,medicineId:e.target.value})}><option value="">Select medicine</option>{medicines.map(m=><option key={m._id} value={m._id}>{m.brandName} {m.strength} · {m.genericName}</option>)}</select></F>
      <F label="Branch"><select className="input" value={receive.branchId} onChange={e=>setReceive({...receive,branchId:e.target.value})}><option value="">Assigned/default branch</option>{branches.map(b=><option key={b._id} value={b._id}>{b.name}</option>)}</select></F>
      <F label="Batch Number"><input className="input" value={receive.batchNumber} onChange={e=>setReceive({...receive,batchNumber:e.target.value})}/></F>
      <F label="Manufacturing Date"><input type="date" className="input" value={receive.manufacturingDate} onChange={e=>setReceive({...receive,manufacturingDate:e.target.value})}/></F>
      <F label="Expiry Date"><input type="date" className="input" value={receive.expiryDate} onChange={e=>setReceive({...receive,expiryDate:e.target.value})}/></F>
      <F label="Quantity"><div className="grid grid-cols-[1fr_120px] gap-2"><input type="number" min="1" className="input" value={receive.quantity} onChange={e=>setReceive({...receive,quantity:Number(e.target.value)})}/><select className="input" value={receive.unit} onChange={e=>setReceive({...receive,unit:e.target.value as 'unit'|'strip'|'box'})}><option value="unit">Unit</option><option value="strip">Strip</option><option value="box">Box</option></select></div></F>
      <F label="Cost / Base Unit"><input type="number" min="0" step="0.01" className="input" value={receive.costPrice} onChange={e=>setReceive({...receive,costPrice:Number(e.target.value)})}/></F>
      <F label="Note"><input className="input" value={receive.note} onChange={e=>setReceive({...receive,note:e.target.value})}/></F>
    </div>{error&&<div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg">{error}</div>}<div className="flex justify-end gap-2 mt-6"><button className="btn-secondary" onClick={()=>setShowReceive(false)}>Cancel</button><button className="btn-primary" onClick={receiveStock} disabled={saving||!receive.medicineId||!receive.batchNumber||!receive.expiryDate}>{saving&&<Loader2 className="w-4 h-4 animate-spin"/>}Receive</button></div></Modal>
    <Modal isOpen={!!adjusting} onClose={()=>setAdjusting(null)} title="Adjust Batch Stock"><p className="text-sm text-gray-500 mb-4">{adjusting?.medicine.brandName} · Batch {adjusting?.batchNumber}</p><F label="New Base-Unit Quantity"><input type="number" min="0" className="input" value={adjust.newQuantity} onChange={e=>setAdjust({...adjust,newQuantity:Number(e.target.value)})}/></F><div className="mt-4"><F label="Reason (required)"><textarea className="input min-h-24" value={adjust.reason} onChange={e=>setAdjust({...adjust,reason:e.target.value})}/></F></div>{error&&<div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg">{error}</div>}<div className="flex justify-end gap-2 mt-6"><button className="btn-secondary" onClick={()=>setAdjusting(null)}>Cancel</button><button className="btn-primary" onClick={saveAdjust} disabled={saving||adjust.reason.trim().length<3}>{saving&&<Loader2 className="w-4 h-4 animate-spin"/>}Save Adjustment</button></div></Modal>
  </div>
}
function F({label,children}:{label:string;children:React.ReactNode}){return <div><label className="label">{label}</label>{children}</div>}
