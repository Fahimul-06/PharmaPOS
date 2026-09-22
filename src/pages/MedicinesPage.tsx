import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Category, Medicine } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import { Edit, Loader2, Package, Plus, Search, ToggleLeft, ToggleRight } from 'lucide-react';

const emptyForm = { brandName:'',genericName:'',manufacturer:'',categoryId:'',strength:'',dosageForm:'',barcode:'',sku:'',rackLocation:'',stripsPerBox:1,unitsPerStrip:1,purchasePrice:0,mrp:0,sellingPrice:0,reorderLevel:10,description:'',isActive:true };

export default function MedicinesPage(){
  const {profile}=useAuth();
  const [rows,setRows]=useState<Medicine[]>([]); const [categories,setCategories]=useState<Category[]>([]); const [q,setQ]=useState(''); const [loading,setLoading]=useState(true); const [modal,setModal]=useState(false); const [editing,setEditing]=useState<Medicine|null>(null); const [form,setForm]=useState({...emptyForm}); const [saving,setSaving]=useState(false); const [error,setError]=useState('');
  const canEdit=['admin','manager','inventory'].includes(profile?.role??'');
  const load=useCallback(async()=>{setLoading(true);try{const [m,c]=await Promise.all([api.get<{data:Medicine[]}>(`/api/medicines?limit=100&q=${encodeURIComponent(q)}`),api.get<{data:Category[]}>('/api/medicines/categories')]);setRows(m.data);setCategories(c.data)}catch(e){setError(e instanceof Error?e.message:'Failed to load')}finally{setLoading(false)}},[q]);
  useEffect(()=>{const t=setTimeout(load,250);return()=>clearTimeout(t)},[load]);
  const openAdd=()=>{setEditing(null);setForm({...emptyForm});setError('');setModal(true)};
  const openEdit=(m:Medicine)=>{setEditing(m);setForm({brandName:m.brandName,genericName:m.genericName,manufacturer:m.manufacturer||'',categoryId:m.category?._id||'',strength:m.strength||'',dosageForm:m.dosageForm||'',barcode:m.barcode||'',sku:m.sku||'',rackLocation:m.rackLocation||'',stripsPerBox:m.stripsPerBox,unitsPerStrip:m.unitsPerStrip,purchasePrice:m.purchasePrice,mrp:m.mrp,sellingPrice:m.sellingPrice,reorderLevel:m.reorderLevel,description:m.description||'',isActive:m.isActive});setError('');setModal(true)};
  const save=async()=>{setSaving(true);setError('');try{const payload={...form,categoryId:form.categoryId||null};if(editing)await api.put(`/api/medicines/${editing._id}`,payload);else await api.post('/api/medicines',payload);setModal(false);await load()}catch(e){setError(e instanceof Error?e.message:'Save failed')}finally{setSaving(false)}};
  const toggle=async(m:Medicine)=>{try{await api.patch(`/api/medicines/${m._id}/status`,{isActive:!m.isActive});await load()}catch(e){setError(e instanceof Error?e.message:'Update failed')}};
  const columns=[
    {key:'medicine',label:'Medicine',render:(m:Medicine)=><div><p className="font-semibold text-gray-900 dark:text-white">{m.brandName} {m.strength}</p><p className="text-xs text-gray-500">{m.genericName} · {m.manufacturer||'—'}</p></div>},
    {key:'sku',label:'SKU / Barcode',render:(m:Medicine)=><div className="text-xs"><p className="font-mono">{m.sku||'—'}</p><p className="text-gray-500 font-mono">{m.barcode||'—'}</p></div>},
    {key:'stock',label:'Stock',render:(m:Medicine)=><span className={(m.stock??0)<=m.reorderLevel?'text-red-600 font-semibold':''}>{m.stock??0}</span>},
    {key:'price',label:'Selling Price',render:(m:Medicine)=>formatCurrency(m.sellingPrice)},
    {key:'status',label:'Status',render:(m:Medicine)=><span className={m.isActive?'badge-success':'badge-gray'}>{m.isActive?'Active':'Inactive'}</span>},
    {key:'actions',label:'Actions',render:(m:Medicine)=>canEdit?<div className="flex gap-1"><button onClick={(e)=>{e.stopPropagation();openEdit(m)}} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="Edit medicine"><Edit className="w-4 h-4"/></button><button onClick={(e)=>{e.stopPropagation();toggle(m)}} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title={m.isActive?'Deactivate':'Activate'}>{m.isActive?<ToggleRight className="w-5 h-5 text-green-600"/>:<ToggleLeft className="w-5 h-5 text-gray-400"/>}</button></div>:null},
  ];
  return <div className="space-y-4">
    <div className="flex flex-col sm:flex-row gap-3 justify-between"><div className="relative max-w-xl w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/><input className="input pl-10" placeholder="Search brand, generic, SKU or barcode..." value={q} onChange={e=>setQ(e.target.value)}/></div>{canEdit&&<button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4"/>Add Medicine</button>}</div>
    {error&&<div className="p-3 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20">{error}</div>}
    <div className="card">{loading?<div className="py-16 grid place-items-center"><Loader2 className="w-8 h-8 animate-spin text-primary-600"/></div>:<DataTable data={rows.map(r=>({...r,id:r._id}))} columns={columns as any} pageSize={20} emptyMessage="No medicines found"/>}</div>
    <Modal isOpen={modal} onClose={()=>setModal(false)} title={editing?'Edit Medicine':'Add Medicine'} size="xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Brand Name"><input className="input" value={form.brandName} onChange={e=>setForm({...form,brandName:e.target.value})}/></Field>
        <Field label="Generic Name"><input className="input" value={form.genericName} onChange={e=>setForm({...form,genericName:e.target.value})}/></Field>
        <Field label="Manufacturer"><input className="input" value={form.manufacturer} onChange={e=>setForm({...form,manufacturer:e.target.value})}/></Field>
        <Field label="Category"><select className="input" value={form.categoryId} onChange={e=>setForm({...form,categoryId:e.target.value})}><option value="">No category</option>{categories.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}</select></Field>
        <Field label="Strength"><input className="input" value={form.strength} onChange={e=>setForm({...form,strength:e.target.value})}/></Field>
        <Field label="Dosage Form"><input className="input" value={form.dosageForm} onChange={e=>setForm({...form,dosageForm:e.target.value})}/></Field>
        <Field label="SKU"><input className="input" value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})}/></Field>
        <Field label="Barcode"><input className="input" value={form.barcode} onChange={e=>setForm({...form,barcode:e.target.value})}/></Field>
        <Field label="Rack"><input className="input" value={form.rackLocation} onChange={e=>setForm({...form,rackLocation:e.target.value})}/></Field>
        <Field label="Strips per Box"><input type="number" min="1" className="input" value={form.stripsPerBox} onChange={e=>setForm({...form,stripsPerBox:Number(e.target.value)})}/></Field>
        <Field label="Units per Strip"><input type="number" min="1" className="input" value={form.unitsPerStrip} onChange={e=>setForm({...form,unitsPerStrip:Number(e.target.value)})}/></Field>
        <Field label="Purchase Price / Base Unit"><input type="number" min="0" step="0.01" className="input" value={form.purchasePrice} onChange={e=>setForm({...form,purchasePrice:Number(e.target.value)})}/></Field>
        <Field label="MRP / Base Unit"><input type="number" min="0" step="0.01" className="input" value={form.mrp} onChange={e=>setForm({...form,mrp:Number(e.target.value)})}/></Field>
        <Field label="Selling Price / Base Unit"><input type="number" min="0" step="0.01" className="input" value={form.sellingPrice} onChange={e=>setForm({...form,sellingPrice:Number(e.target.value)})}/></Field>
        <Field label="Reorder Level"><input type="number" min="0" className="input" value={form.reorderLevel} onChange={e=>setForm({...form,reorderLevel:Number(e.target.value)})}/></Field>
        <div className="md:col-span-2"><Field label="Description"><textarea className="input min-h-20" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></Field></div>
      </div>
      {error&&<div className="mt-4 p-3 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20">{error}</div>}
      <div className="flex justify-end gap-2 mt-6"><button className="btn-secondary" onClick={()=>setModal(false)}>Cancel</button><button className="btn-primary" disabled={saving||!form.brandName||!form.genericName} onClick={save}>{saving&&<Loader2 className="w-4 h-4 animate-spin"/>}{editing?'Save Changes':'Create Medicine'}</button></div>
    </Modal>
  </div>
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <div><label className="label">{label}</label>{children}</div>}
