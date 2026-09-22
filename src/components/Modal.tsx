import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}
const SIZES={sm:'max-w-md',md:'max-w-lg',lg:'max-w-2xl',xl:'max-w-4xl'};
export default function Modal({open,isOpen,onClose,title,children,size='md'}:ModalProps){
  const visible=open??isOpen??false;if(!visible)return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/50" onClick={onClose}/><div className={`relative w-full ${SIZES[size]} max-h-[90vh] overflow-hidden bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col`}><div className="flex items-center justify-between px-6 py-4 border-b"><h3 className="text-lg font-semibold">{title}</h3><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-5 h-5 text-gray-500"/></button></div><div className="flex-1 overflow-y-auto p-6">{children}</div></div></div>
}
