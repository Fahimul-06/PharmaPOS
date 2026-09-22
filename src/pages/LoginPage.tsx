import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Loader2, Lock, Mail, Pill, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn(email, password);
    if (result.error) setError(result.error);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg shadow-primary-600/30 mb-4"><Pill className="w-8 h-8 text-white" /></div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PharmaPOS</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Production Pharmacy Inventory & POS</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-5 p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-sm">
            <ShieldCheck className="w-5 h-5 shrink-0" /> Accounts are created by an administrator. Public sign-up is disabled.
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="label">Email</label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="email" className="input pl-10" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@pharmacy.com" autoComplete="email" required /></div></div>
            <div><label className="label">Password</label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type={showPassword ? 'text' : 'password'} className="input pl-10 pr-10" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" minLength={8} required /><button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
            {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}
            <button className="btn-primary w-full" disabled={loading}>{loading && <Loader2 className="w-4 h-4 animate-spin" />} Sign In</button>
          </form>
        </div>
      </div>
    </div>
  );
}
