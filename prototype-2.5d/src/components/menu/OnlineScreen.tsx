import React, { FormEvent, useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, Check, Copy, Crown, Globe, Link2, RefreshCw, Users, Wifi, WifiOff } from 'lucide-react';
import { FIGHTERS, FighterId } from '../../data/fighters';
import { STAGES, StageId } from '../../data/stages';
import { soundEngine } from '../../engine/audio';
import { accountService } from '../../services/account';
import { cleanNick, normalizeCode, onlineSession, OnlinePeer } from '../../services/online';
import { FighterPortrait } from '../FighterBadgeSvg';

const FIGHTER_IDS = Object.keys(FIGHTERS) as FighterId[];
const STAGE_IDS = Object.keys(STAGES) as StageId[];

interface OnlineScreenProps {
  /** código vindo do link de convite (?sala=ABCD) */
  inviteCode: string | null;
  onInviteConsumed: () => void;
  onBack: () => void;
  onHostStart: () => void;
  onOpenAccount: () => void;
}

export function OnlineScreen({ inviteCode, onInviteConsumed, onBack, onHostStart, onOpenAccount }: OnlineScreenProps) {
  const s = useSyncExternalStore(onlineSession.subscribe, onlineSession.getSnapshot, onlineSession.getSnapshot);
  const account = useSyncExternalStore(accountService.subscribe, accountService.getSnapshot, accountService.getSnapshot);
  const [nickDraft, setNickDraft] = useState(() => s.me.nick || onlineSession.defaultNick());
  const [codeDraft, setCodeDraft] = useState(inviteCode ?? '');
  const [copied, setCopied] = useState(false);

  // apelido da conta tem prioridade quando a pessoa entra
  useEffect(() => {
    if (account.nickname && !s.me.nick) setNickDraft(cleanNick(account.nickname));
  }, [account.nickname, s.me.nick]);

  useEffect(() => {
    void onlineSession.enterLobby();
  }, []);

  // link de convite: com apelido já salvo entra direto na sala
  useEffect(() => {
    if (!inviteCode || s.phase !== 'idle') return;
    const nick = cleanNick(nickDraft);
    if (!nick) return;
    onlineSession.setNick(nick);
    void onlineSession.joinRoom(inviteCode);
    onInviteConsumed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteCode]);

  const ensureNick = () => {
    const nick = cleanNick(nickDraft);
    if (!nick) {
      onlineSession.clearMessages();
      return false;
    }
    if (nick !== s.me.nick) onlineSession.setNick(nick);
    return true;
  };

  const create = () => {
    if (!ensureNick()) return;
    soundEngine.playUi('confirm');
    void onlineSession.createRoom();
  };

  const join = (e?: FormEvent, code = codeDraft) => {
    e?.preventDefault();
    if (!ensureNick()) return;
    soundEngine.playUi('confirm');
    void onlineSession.joinRoom(code);
  };

  const leave = () => {
    soundEngine.playUi('select');
    void onlineSession.leaveRoom();
  };

  const back = () => {
    void onlineSession.leaveRoom(true);
    onlineSession.leaveLobby();
    onBack();
  };

  const copyInvite = async () => {
    const link = onlineSession.inviteLink();
    try {
      if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
        await navigator.share({ title: 'Família Fighter', text: `Bora uma luta? Sala ${s.room?.code}`, url: link });
      } else {
        await navigator.clipboard.writeText(link);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* cancelado */
    }
  };

  const inRoom = s.phase === 'room' && s.room;
  const isHost = s.role === 'host';
  const room = s.room;
  const myCard = isHost ? room?.host : room?.guest;
  const otherCard = isHost ? room?.guest : room?.host;
  const nickOk = cleanNick(nickDraft).length > 0;

  return (
    <div className="ff-online fixed inset-0 z-20 overflow-y-auto bg-[#09070e]/88 text-stone-100 animate-screen-in" data-testid="online-screen">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
        <header className="flex items-center gap-3">
          <button type="button" onClick={back} className="flex h-11 w-11 items-center justify-center border border-white/15 bg-black/40 hover:border-amber-300/60" aria-label="Voltar">
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-extrabold italic leading-none text-amber-300 sm:text-4xl">ONLINE CASUAL</h1>
            <p className="mt-1 text-xs text-stone-400">
              Quem cria a sala roda a luta e transmite a tela; quem entra joga daí, como no Remote Play.
            </p>
          </div>
          <span className="hidden items-center gap-1.5 border border-white/10 bg-black/40 px-2.5 py-1.5 text-[11px] text-stone-300 sm:flex">
            <Globe size={13} />
            {s.transport === 'local' ? 'Modo local (mesmo computador)' : s.transport === 'supabase' ? 'Servidor: São Paulo' : 'Conectando…'}
          </span>
        </header>

        {(s.error || s.notice) && (
          <div role="status" className={`border px-3 py-2 text-sm ${s.error ? 'border-rose-400/50 bg-rose-950/40 text-rose-200' : 'border-amber-300/40 bg-amber-950/30 text-amber-100'}`}>
            {s.error || s.notice}
          </div>
        )}

        {!inRoom && (
          <div className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
            <section className="ff-chamfer space-y-4 border border-amber-400/40 bg-[#100d18] p-4 sm:p-5">
              <label className="block text-sm font-semibold">
                Seu apelido
                <input
                  value={nickDraft}
                  onChange={(e) => setNickDraft(e.target.value)}
                  onBlur={() => nickOk && onlineSession.setNick(nickDraft)}
                  maxLength={24}
                  placeholder="Ex.: Tio Carlos"
                  className="mt-1 min-h-11 w-full border border-white/20 bg-black/40 px-3 text-base"
                  data-testid="online-nick"
                />
              </label>
              <p className="text-xs text-stone-400">
                {account.email ? (
                  <>Conectado na conta: as vitórias online entram no <strong className="text-amber-200">ranking da família</strong>.</>
                ) : (
                  <>
                    Jogando como convidado.{' '}
                    <button type="button" onClick={onOpenAccount} className="text-amber-200 underline">
                      Entre na conta
                    </button>{' '}
                    para as vitórias valerem no ranking.
                  </>
                )}
              </p>

              <button
                type="button"
                onClick={create}
                disabled={!nickOk || s.phase === 'connecting'}
                className="ff-chamfer-sm flex min-h-12 w-full items-center justify-center gap-2 bg-amber-400 font-bold text-stone-950 hover:bg-amber-300 disabled:opacity-50"
                data-testid="online-create"
              >
                <Crown size={18} /> Criar sala
              </button>

              <form onSubmit={join} className="flex gap-2">
                <input
                  value={codeDraft}
                  onChange={(e) => setCodeDraft(normalizeCode(e.target.value))}
                  placeholder="CÓDIGO"
                  aria-label="Código da sala"
                  className="min-h-12 w-0 flex-1 border border-white/20 bg-black/40 px-3 text-center font-display text-2xl font-extrabold tracking-[0.4em]"
                  data-testid="online-code"
                />
                <button
                  disabled={!nickOk || codeDraft.length !== 4 || s.phase === 'connecting'}
                  className="min-h-12 border border-amber-300/50 bg-[#1a1526] px-5 font-bold text-amber-200 hover:bg-[#251e36] disabled:opacity-50"
                  data-testid="online-join"
                >
                  Entrar
                </button>
              </form>
              {s.phase === 'connecting' && <p className="text-sm text-amber-200">Conectando…</p>}
            </section>

            <section className="ff-chamfer border border-white/10 bg-[#100d18] p-4 sm:p-5">
              <h2 className="flex items-center gap-2 font-display text-xl font-extrabold text-white">
                <Users size={18} /> Família online agora
              </h2>
              {s.lobby.length === 0 ? (
                <p className="mt-3 text-sm text-stone-400">
                  Ninguém por aqui ainda. Crie uma sala e mande o link no grupo da família!
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {s.lobby.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 border border-white/10 bg-black/30 p-2">
                      <FighterPortrait id={p.fighter} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold">{p.nick}</div>
                        <div className="text-[11px] text-stone-400">
                          {p.state === 'waiting' ? `Esperando na sala ${p.room}` : p.state === 'playing' ? 'Lutando' : 'No menu'}
                        </div>
                      </div>
                      {p.state === 'waiting' && p.room && (
                        <button
                          type="button"
                          onClick={() => join(undefined, p.room ?? '')}
                          disabled={!nickOk}
                          className="min-h-10 bg-amber-400 px-3 text-xs font-bold text-stone-950 disabled:opacity-50"
                        >
                          Desafiar
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-[11px] leading-relaxed text-stone-500">
                Dica: quem tiver o computador mais forte e a internet mais estável cria a sala. Deixe a aba do jogo aberta e em
                primeiro plano durante a luta.
              </p>
            </section>
          </div>
        )}

        {inRoom && room && (
          <div className="space-y-4">
            <section className="ff-chamfer flex flex-wrap items-center gap-3 border border-amber-400/40 bg-[#100d18] p-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Código da sala</div>
                <div className="font-display text-5xl font-extrabold leading-none tracking-[0.25em] text-amber-300" data-testid="online-room-code">
                  {room.code}
                </div>
              </div>
              <button type="button" onClick={copyInvite} className="flex min-h-11 items-center gap-2 border border-white/20 bg-black/40 px-3 text-sm hover:border-amber-300/60">
                {copied ? <Check size={16} /> : <Link2 size={16} />} {copied ? 'Link copiado!' : 'Convidar (copiar link)'}
              </button>
              <div className="ml-auto flex items-center gap-2 text-sm" data-testid="online-link">
                {s.link === 'ok' ? (
                  <span className="flex items-center gap-1.5 text-emerald-300">
                    <Wifi size={16} /> Conexão direta OK{s.pingMs !== null ? ` · ${s.pingMs} ms` : ''}
                  </span>
                ) : s.link === 'failed' ? (
                  <>
                    <span className="flex items-center gap-1.5 text-rose-300">
                      <WifiOff size={16} /> Sem conexão direta
                    </span>
                    <button type="button" onClick={() => onlineSession.retryLink()} className="flex min-h-10 items-center gap-1 border border-white/20 px-2 text-xs">
                      <RefreshCw size={14} /> Tentar de novo
                    </button>
                  </>
                ) : room.guest ? (
                  <span className="text-amber-200">Ligando os dois aparelhos…</span>
                ) : (
                  <span className="text-stone-400">Esperando alguém entrar…</span>
                )}
              </div>
            </section>

            <div className="grid gap-4 md:grid-cols-2">
              <PlayerCard title="1P · Anfitrião" peer={room.host} mine={isHost} />
              {room.guest ? (
                <PlayerCard title="2P · Convidado" peer={room.guest} mine={!isHost} />
              ) : (
                <div className="ff-chamfer flex min-h-40 flex-col items-center justify-center gap-2 border border-dashed border-white/20 bg-black/20 p-4 text-center text-sm text-stone-400">
                  <Copy size={22} />
                  Passe o código <strong className="text-amber-200">{room.code}</strong> ou o link para quem vai lutar com você.
                </div>
              )}
            </div>

            {myCard && (
              <section className="ff-chamfer border border-white/10 bg-[#100d18] p-4">
                <h2 className="font-display text-lg font-extrabold text-white">Escolha seu lutador</h2>
                <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-9">
                  {FIGHTER_IDS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        soundEngine.playUi('hover');
                        onlineSession.setFighter(id);
                      }}
                      className={`flex flex-col items-center gap-1 border p-1.5 text-[11px] font-semibold ${myCard.fighter === id ? 'border-amber-300 bg-amber-400/15 text-amber-200' : 'border-white/10 bg-black/30 text-stone-300 hover:border-white/30'}`}
                      data-testid={`online-fighter-${id}`}
                      aria-pressed={myCard.fighter === id}
                    >
                      <FighterPortrait id={id} size="sm" />
                      {FIGHTERS[id].name}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {isHost && (
              <section className="ff-chamfer border border-white/10 bg-[#100d18] p-4">
                <h2 className="font-display text-lg font-extrabold text-white">Cenário</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {STAGE_IDS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onlineSession.setStage(id)}
                      className={`min-h-10 border px-3 text-sm font-semibold ${room.stage === id ? 'border-amber-300 bg-amber-400/15 text-amber-200' : 'border-white/10 bg-black/30 text-stone-300'}`}
                    >
                      {STAGES[id].name}
                    </button>
                  ))}
                </div>
              </section>
            )}
            {!isHost && <p className="text-sm text-stone-300">Cenário: <strong className="text-amber-200">{STAGES[room.stage].name}</strong> (quem escolhe é o anfitrião)</p>}

            <div className="flex flex-wrap items-center gap-3">
              {isHost ? (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUi('confirm');
                    onHostStart();
                  }}
                  disabled={!onlineSession.canStart()}
                  className="ff-chamfer-sm min-h-12 flex-1 bg-amber-400 px-6 font-bold text-stone-950 hover:bg-amber-300 disabled:opacity-50"
                  data-testid="online-start"
                >
                  {!room.guest ? 'Esperando o 2P…' : s.link !== 'ok' ? 'Esperando a conexão…' : !room.guest.ready ? `Esperando ${room.guest.nick} ficar pronto…` : 'COMEÇAR A LUTA!'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onlineSession.setReady(!room.guest?.ready)}
                  className={`ff-chamfer-sm min-h-12 flex-1 px-6 font-bold ${room.guest?.ready ? 'bg-emerald-400 text-stone-950' : 'bg-amber-400 text-stone-950 hover:bg-amber-300'}`}
                  data-testid="online-ready"
                >
                  {room.guest?.ready ? `Pronto! Esperando ${room.host.nick} começar…` : 'Estou pronto'}
                </button>
              )}
              <button type="button" onClick={leave} className="min-h-12 border border-white/20 px-5 text-sm">
                Sair da sala
              </button>
            </div>
            {otherCard && <p className="text-xs text-stone-500">Controles do 2P: os mesmos do 1P (teclado, controle ou toque) — cada um joga no seu aparelho.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerCard({ title, peer, mine }: { title: string; peer: OnlinePeer; mine: boolean }) {
  return (
    <div className={`ff-chamfer flex items-center gap-4 border p-4 ${mine ? 'border-amber-300/60 bg-amber-400/10' : 'border-white/10 bg-[#100d18]'}`}>
      <FighterPortrait id={peer.fighter} size="lg" />
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">{title}{mine ? ' · você' : ''}</div>
        <div className="truncate font-display text-2xl font-extrabold text-white">{peer.nick}</div>
        <div className="text-sm text-amber-200">{FIGHTERS[peer.fighter].name}</div>
        <div className={`mt-1 text-xs font-bold ${peer.ready ? 'text-emerald-300' : 'text-stone-500'}`}>{peer.ready ? 'PRONTO' : 'escolhendo…'}</div>
      </div>
    </div>
  );
}
