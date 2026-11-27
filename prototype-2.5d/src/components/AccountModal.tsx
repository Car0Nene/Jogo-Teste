import React, { FormEvent, useEffect, useState, useSyncExternalStore } from 'react';
import { Crown, History, Trophy, UserRound, X } from 'lucide-react';
import { FIGHTERS } from '../data/fighters';
import { accountService, LeaderboardRow, RecentMatch } from '../services/account';
import { FighterPortrait } from './FighterBadgeSvg';

interface AccountModalProps { onClose: () => void }

type Tab = 'perfil' | 'ranking' | 'historico';

const OUTCOME: Record<RecentMatch['outcome'], { label: string; cls: string }> = {
  win: { label: 'VITÓRIA', cls: 'text-emerald-300' },
  loss: { label: 'DERROTA', cls: 'text-rose-300' },
  draw: { label: 'EMPATE', cls: 'text-stone-300' },
};

const MODE_LABEL: Record<RecentMatch['mode'], string> = { cpu: 'Arcade', story: 'História', online: 'Online' };

function when(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function AccountModal({ onClose }: AccountModalProps) {
  const account = useSyncExternalStore(accountService.subscribe, accountService.getSnapshot, accountService.getSnapshot);
  const [tab, setTab] = useState<Tab>('perfil');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ranking, setRanking] = useState<LeaderboardRow[] | null>(null);
  const [rankError, setRankError] = useState('');
  const [recent, setRecent] = useState<RecentMatch[] | null>(null);

  useEffect(() => { void accountService.open(); }, []);

  useEffect(() => {
    if (tab !== 'ranking' || !account.configured) return;
    let alive = true;
    setRankError('');
    accountService.leaderboard(20)
      .then((rows) => alive && setRanking(rows))
      .catch((e) => alive && setRankError(String((e as Error).message || e)));
    return () => { alive = false; };
  }, [tab, account.configured, account.stats?.matchesPlayed]);

  useEffect(() => {
    if (tab !== 'historico' || !account.email) return;
    let alive = true;
    accountService.recentMatches(10)
      .then((rows) => alive && setRecent(rows))
      .catch(() => alive && setRecent([]));
    return () => { alive = false; };
  }, [tab, account.email, account.stats?.matchesPlayed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      if (account.email) await accountService.saveNickname(nickname);
      else if (creating) await accountService.signUp(email, password, nickname);
      else await accountService.signIn(email, password);
      setPassword('');
    } catch (cause) { setError(String((cause as Error).message || cause)); }
    finally { setBusy(false); }
  }

  const st = account.stats;
  const rate = st && st.matchesPlayed ? Math.round((st.wins / st.matchesPlayed) * 100) : 0;
  const tabBtn = (id: Tab, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 border-b-2 text-sm font-semibold ${tab === id ? 'border-amber-300 text-amber-200' : 'border-transparent text-stone-400 hover:text-stone-200'}`}
      aria-pressed={tab === id}
    >
      {icon}{label}
    </button>
  );

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="account-title">
    <section className="relative max-h-[92dvh] w-full max-w-xl overflow-y-auto border border-amber-400/50 bg-[#100d18] p-5 text-stone-100 shadow-2xl sm:p-7">
      <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-3 top-3 rounded p-2 hover:bg-white/10"><X size={20}/></button>
      <h2 id="account-title" className="pr-10 font-display text-3xl font-extrabold text-amber-300">Minha Conta</h2>

      {account.configured && (
        <nav className="mt-3 flex border-b border-white/10">
          {tabBtn('perfil', 'Perfil', <UserRound size={15}/>)}
          {tabBtn('ranking', 'Ranking', <Trophy size={15}/>)}
          {account.email && tabBtn('historico', 'Últimas lutas', <History size={15}/>)}
        </nav>
      )}

      {tab === 'perfil' && <>
        <p className="mt-3 whitespace-pre-line text-sm text-stone-300">{account.status}</p>
        {account.syncStatus && <p className="mt-2 text-xs text-amber-200">{account.syncStatus}</p>}
        {account.configured && account.email ? <>
          {st && <div className="mt-4 flex items-center gap-4 border border-white/10 bg-black/25 p-3">
            <FighterPortrait id={st.selectedFighter} size="lg"/>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-2xl font-extrabold">{st.nickname}</div>
              <div className="text-xs text-stone-400">Último lutador: {FIGHTERS[st.selectedFighter]?.name ?? st.selectedFighter}</div>
              <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                <Stat n={st.matchesPlayed} label="lutas"/>
                <Stat n={st.wins} label="vitórias" cls="text-emerald-300"/>
                <Stat n={st.losses} label="derrotas" cls="text-rose-300"/>
                <Stat n={`${rate}%`} label="aprov."/>
              </div>
              <div className="mt-2 text-xs text-amber-200">Online: {st.onlineWins} V · {st.onlineLosses} D{st.onlineDraws ? ` · ${st.onlineDraws} E` : ''}</div>
            </div>
          </div>}
          <form onSubmit={submit} className="mt-4 space-y-3">
            <label className="block text-sm">Apelido (aparece no ranking e no online)<input value={nickname || account.nickname || ''} onChange={e => setNickname(e.target.value)} maxLength={32} className="mt-1 min-h-11 w-full border border-white/20 bg-black/30 px-3" /></label>
            <button disabled={busy} className="min-h-11 w-full bg-amber-400 px-4 font-bold text-stone-950 disabled:opacity-50">Salvar apelido</button>
          </form>
          <p className="mt-3 text-xs text-stone-400">Conectado como {account.email}</p>
          <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await accountService.signOut(); } catch (e) { setError(String(e)); } finally { setBusy(false); } }} className="mt-3 min-h-11 w-full border border-white/20 px-4 text-sm">Sair da conta</button>
        </> : account.configured && <form onSubmit={submit} className="mt-5 space-y-3">
          {creating && <label className="block text-sm">Apelido<input value={nickname} onChange={e => setNickname(e.target.value)} maxLength={32} required placeholder="Como a família te chama" className="mt-1 min-h-11 w-full border border-white/20 bg-black/30 px-3" /></label>}
          <label className="block text-sm">E-mail<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 min-h-11 w-full border border-white/20 bg-black/30 px-3" /></label>
          <label className="block text-sm">Senha<input type="password" autoComplete={creating ? 'new-password' : 'current-password'} minLength={6} value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 min-h-11 w-full border border-white/20 bg-black/30 px-3" /></label>
          <button disabled={busy} className="min-h-11 w-full bg-amber-400 px-4 font-bold text-stone-950 disabled:opacity-50">{busy ? 'Aguarde…' : creating ? 'Criar conta' : 'Entrar'}</button>
          <button type="button" onClick={() => setCreating(!creating)} className="min-h-11 w-full text-sm text-amber-200 underline">{creating ? 'Já tenho uma conta' : 'Criar uma conta'}</button>
          <p className="text-xs text-stone-500">Sem conta o jogo funciona igual; a conta guarda vitórias, histórico e coloca você no ranking da família.</p>
        </form>}
      </>}

      {tab === 'ranking' && <div className="mt-4">
        <h3 className="flex items-center gap-2 font-display text-xl font-extrabold"><Crown size={18} className="text-amber-300"/> Ranking da família</h3>
        <p className="text-xs text-stone-400">Vitória online vale 3 pontos; vitória contra a CPU vale 1.</p>
        {rankError && <p className="mt-3 text-sm text-rose-300">{rankError}</p>}
        {!ranking && !rankError && <p className="mt-3 text-sm text-stone-400">Carregando…</p>}
        {ranking && ranking.length === 0 && <p className="mt-3 text-sm text-stone-400">Ninguém pontuou ainda. A primeira vitória deixa você no topo!</p>}
        {ranking && ranking.length > 0 && <ol className="mt-3 space-y-1.5">
          {ranking.map((r, i) => {
            const pts = r.online_wins * 3 + r.wins;
            const me = account.nickname && r.nickname === account.nickname;
            return <li key={`${r.nickname}-${i}`} className={`flex items-center gap-3 border p-2 ${me ? 'border-amber-300/60 bg-amber-400/10' : 'border-white/10 bg-black/25'}`}>
              <span className={`w-7 text-center font-display text-xl font-extrabold ${i === 0 ? 'text-amber-300' : i < 3 ? 'text-stone-200' : 'text-stone-500'}`}>{i + 1}</span>
              <FighterPortrait id={r.selected_fighter} size="sm"/>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{r.nickname}</div>
                <div className="text-[11px] text-stone-400">{r.wins}V · {r.losses}D · online {r.online_wins}V/{r.online_losses}D</div>
              </div>
              <span className="font-display text-xl font-extrabold text-amber-200">{pts}<span className="ml-0.5 text-[10px] text-stone-400">pts</span></span>
            </li>;
          })}
        </ol>}
      </div>}

      {tab === 'historico' && <div className="mt-4">
        {!recent && <p className="text-sm text-stone-400">Carregando…</p>}
        {recent && recent.length === 0 && <p className="text-sm text-stone-400">Nenhuma luta registrada ainda.</p>}
        {recent && recent.length > 0 && <ul className="space-y-1.5">
          {recent.map((m, i) => <li key={i} className="flex items-center gap-3 border border-white/10 bg-black/25 p-2 text-sm">
            <FighterPortrait id={m.selected_fighter} size="sm"/>
            <div className="min-w-0 flex-1">
              <div><strong className={OUTCOME[m.outcome].cls}>{OUTCOME[m.outcome].label}</strong> <span className="text-stone-400">· {MODE_LABEL[m.mode] ?? m.mode}</span></div>
              <div className="truncate text-[11px] text-stone-400">
                {FIGHTERS[m.selected_fighter]?.name}{m.opponent_fighter ? ` × ${FIGHTERS[m.opponent_fighter]?.name}` : ''}{m.opponent_name ? ` (${m.opponent_name})` : ''}
              </div>
            </div>
            <span className="text-[11px] text-stone-500">{when(m.created_at)}</span>
          </li>)}
        </ul>}
      </div>}

      {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
      {!account.configured && <p className="mt-4 border border-white/10 bg-black/20 p-3 text-xs leading-relaxed text-stone-400">A conexão com Supabase ainda não está configurada. O jogo funciona normalmente; login e sincronização ficam disponíveis quando as chaves públicas forem configuradas em <code>supabase-config.js</code>.</p>}
      <button type="button" onClick={onClose} className="mt-5 min-h-11 w-full border border-white/15 px-4 text-sm">Voltar ao jogo</button>
    </section>
  </div>;
}

function Stat({ n, label, cls = 'text-white' }: { n: number | string; label: string; cls?: string }) {
  return <div className="border border-white/10 bg-black/30 px-1 py-1">
    <div className={`font-display text-xl font-extrabold leading-none ${cls}`}>{n}</div>
    <div className="text-[10px] text-stone-400">{label}</div>
  </div>;
}
