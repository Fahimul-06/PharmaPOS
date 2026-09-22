import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import DataTable from '@/components/DataTable';
import { Loader2 } from 'lucide-react';

interface AuditRow { _id:string; userName:string; action:string; entity?:string; ipAddress?:string; createdAt:string; newValues?:unknown; oldValues?:unknown }
export default function AuditLogPage(){
  const [rows,setRows]=useState<AuditRow[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState('');
  useEffect(()=>{api.get<{data:AuditRow[]}>('/api/audit?limit=500').then(r=>setRows(r.data)).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[]);
  const cols=[{key:'time',label:'Time',render:(r:AuditRow)=>formatDateTime(r.createdAt)},{key:'user',label:'User',render:(r:AuditRow)=>r.userName||'System'},{key:'action',label:'Action',render:(r:AuditRow)=><span className="badge-gray">{r.action}</span>},{key:'entity',label:'Entity',render:(r:AuditRow)=>r.entity||'—'},{key:'ip',label:'IP',render:(r:AuditRow)=><span className="font-mono text-xs">{r.ipAddress||'—'}</span>}];
  return <div className="space-y-4">{error&&<div className="p-3 bg-red-50 text-red-600 rounded-lg">{error}</div>}<div className="card">{loading?<div className="py-16 grid place-items-center"><Loader2 className="w-8 h-8 animate-spin text-primary-600"/></div>:<DataTable data={rows.map(r=>({...r,id:r._id}))} columns={cols as any} pageSize={25}/>}</div></div>
}
