import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import { AlertCircle, CheckCircle2, FileDown, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';

const TEMPLATE = `brand_name,generic_name,manufacturer,category,strength,dosage_form,barcode,sku,rack_location,strips_per_box,units_per_strip,purchase_price,mrp,selling_price,reorder_level,description
Napa 500,Paracetamol,Beximco,Analgesics,500 mg,Tablet,8941100500123,NAPA500,A-01,20,10,0.80,1.20,1.10,100,Paracetamol tablet
`;

interface Result { success:number; failed:number; errors:Array<{row:number;message:string}> }
export default function UploadMedicinesPage(){
  const inputRef=useRef<HTMLInputElement>(null); const [file,setFile]=useState<File|null>(null); const [uploading,setUploading]=useState(false); const [error,setError]=useState(''); const [result,setResult]=useState<Result|null>(null);
  const select=(f?:File)=>{setError('');setResult(null);if(!f)return;if(!f.name.toLowerCase().endsWith('.csv')){setError('Please select a CSV file.');return}setFile(f)};
  const download=()=>{const blob=new Blob([TEMPLATE],{type:'text/csv'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='medicine_upload_template.csv';a.click();URL.revokeObjectURL(url)};
  const upload=async()=>{if(!file)return;setUploading(true);setError('');setResult(null);try{const fd=new FormData();fd.append('file',file);const r=await api.post<Result>('/api/medicines/import',fd);setResult(r)}catch(e){setError(e instanceof Error?e.message:'Upload failed')}finally{setUploading(false)}};
  return <div className="space-y-5">
    <div className="card p-6"><div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between"><div><h3 className="font-semibold text-lg">Admin Medicine Import</h3><p className="text-sm text-gray-500 mt-1">Bulk upload up to 5,000 medicines per CSV. SKU and barcode are unique.</p></div><button className="btn-secondary" onClick={download}><FileDown className="w-4 h-4"/>Download Template</button></div>
      <div onDrop={e=>{e.preventDefault();select(e.dataTransfer.files[0])}} onDragOver={e=>e.preventDefault()} onClick={()=>inputRef.current?.click()} className="mt-6 border-2 border-dashed rounded-xl p-10 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-colors">
        <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e=>select(e.target.files?.[0])}/>
        <Upload className="w-10 h-10 mx-auto text-primary-500"/><p className="font-medium mt-3">Drop CSV here or click to browse</p><p className="text-xs text-gray-500 mt-1">Maximum file size 5 MB</p>
      </div>
      {file&&<div className="mt-4 flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"><div className="flex items-center gap-3"><FileSpreadsheet className="w-5 h-5 text-green-600"/><div><p className="text-sm font-medium">{file.name}</p><p className="text-xs text-gray-500">{(file.size/1024).toFixed(1)} KB</p></div></div><button className="p-2" onClick={()=>{setFile(null);setResult(null);if(inputRef.current)inputRef.current.value=''}}><X className="w-4 h-4"/></button></div>}
      {error&&<div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 flex gap-2 text-sm"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0"/>{error}</div>}
      <div className="flex justify-end mt-5"><button className="btn-primary" disabled={!file||uploading} onClick={upload}>{uploading?<Loader2 className="w-4 h-4 animate-spin"/>:<Upload className="w-4 h-4"/>}Upload Medicines</button></div>
    </div>
    {result&&<div className="card p-6"><div className="flex items-center gap-3"><CheckCircle2 className="w-7 h-7 text-green-600"/><div><h3 className="font-semibold">Import completed</h3><p className="text-sm text-gray-500">{result.success} created, {result.failed} failed</p></div></div>{result.errors.length>0&&<div className="mt-4 max-h-72 overflow-auto border rounded-lg"><table className="w-full text-sm"><thead className="sticky top-0 bg-gray-50 dark:bg-gray-800"><tr><th className="text-left px-3 py-2">CSV Row</th><th className="text-left px-3 py-2">Reason</th></tr></thead><tbody>{result.errors.map((e,i)=><tr key={i} className="border-t"><td className="px-3 py-2">{e.row}</td><td className="px-3 py-2 text-red-600">{e.message}</td></tr>)}</tbody></table></div>}</div>}
    <div className="card p-5"><h3 className="font-semibold">Required columns</h3><p className="text-sm text-gray-500 mt-2"><code>brand_name</code> and <code>generic_name</code> are required. Recommended columns: manufacturer, category, strength, dosage_form, barcode, sku, rack_location, strips_per_box, units_per_strip, purchase_price, mrp, selling_price, reorder_level, description.</p><p className="text-xs text-gray-400 mt-3">Prices are stored per base unit (tablet/capsule/piece). Box and strip sales are calculated from the conversion fields.</p></div>
  </div>
}
