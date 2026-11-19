import React, { FormEvent, useEffect, useState, useSyncExternalStore } from 'react';
import { X } from 'lucide-react';
import { accountService } from '../services/account';

interface AccountModalProps { onClose: () => void }

export function AccountModal({ onClose }: AccountModalProps) {
  const account = useSyncExternalStore(accountService.subscribe, accountService.getSnapshot, accountService.getSnapshot);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { void accountService.open(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      if (account.email) await accountService.saveNickname(nickname);
      else if (creating) await accountService.signUp(email, password, nickname);
      else await accountService.signIn(email, password);
    } catch (cause) { setError(String((cause as Error).message || cause)); }
    finally { setBusy(false); }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="account-title">
    <section className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto border border-amber-400/50 bg-[#100d18] p-5 text-stone-100 shadow-2xl sm:p-7">
      <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-3 top-3 rounded p-2 hover:bg-white/10"><X size={20}/></button>
      <h2 id="account-title" className="pr-10 font-display text-3xl font-extrabold text-amber-300">Minha Conta</h2>
      <p className="mt-2 whitespace-pre-line text-sm text-stone-300">{account.status}</p>
      {account.syncStatus && <p className="mt-2 text-xs text-amber-200">{account.syncStatus}</p>}
      {account.configured && account.email ? <>
        <p className="mt-5 text-sm">Conectado como <strong>{account.email}</strong></p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block text-sm">Apelido<input value={nickname || account.nickname || ''} onChange={e => setNickname(e.target.value)} maxLength={32} className="mt-1 min-h-11 w-full border border-white/20 bg-black/30 px-3" /></label>
          <button disabled={busy} className="min-h-11 w-full bg-amber-400 px-4 font-bold text-stone-950 disabled:opacity-50">Salvar apelido</button>
        </form>
        {account.progress && <pre className="mt-4 whitespace-pre-wrap border border-white/10 bg-black/20 p-3 text-sm text-stone-300">{account.progress}</pre>}
        <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await accountService.signOut(); } catch (e) { setError(String(e)); } finally { setBusy(false); } }} className="mt-4 min-h-11 w-full border border-white/20 px-4 text-sm">Sair da conta</button>
      </> : account.configured && <form onSubmit={submit} className="mt-5 space-y-3">
        {creating && <label className="block text-sm">Apelido<input value={nickname} onChange={e => setNickname(e.target.value)} maxLength={32} required className="mt-1 min-h-11 w-full border border-white/20 bg-black/30 px-3" /></label>}
        <label className="block text-sm">E-mail<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 min-h-11 w-full border border-white/20 bg-black/30 px-3" /></label>
        <label className="block text-sm">Senha<input type="password" autoComplete={creating ? 'new-password' : 'current-password'} minLength={6} value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 min-h-11 w-full border border-white/20 bg-black/30 px-3" /></label>
        <button disabled={busy} className="min-h-11 w-full bg-amber-400 px-4 font-bold text-stone-950 disabled:opacity-50">{busy ? 'Aguarde…' : creating ? 'Criar conta' : 'Entrar'}</button>
        <button type="button" onClick={() => setCreating(!creating)} className="min-h-11 w-full text-sm text-amber-200 underline">{creating ? 'Já tenho uma conta' : 'Criar uma conta'}</button>
      </form>}
      {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
      {!account.configured && <p className="mt-4 border border-white/10 bg-black/20 p-3 text-xs leading-relaxed text-stone-400">A conexão com Supabase ainda não está configurada. O jogo funciona normalmente; login e sincronização ficam disponíveis quando as chaves públicas forem configuradas em <code>supabase-config.js</code>.</p>}
      <button type="button" onClick={onClose} className="mt-5 min-h-11 w-full border border-white/15 px-4 text-sm">Voltar ao jogo</button>
    </section>
  </div>;
}
