/**
 * Online casual ("Jogar junto"): o anfitrião roda a luta de verdade e transmite a tela (vídeo P2P via WebRTC)
 * e os sons; o convidado manda só os comandos (P2). Sem servidor de jogo: o Supabase Realtime serve de
 * saguão (quem está online), de salas com código e de canal para combinar a conexão direta.
 *
 * Sem Supabase configurado (ou com ?local=1 na URL) tudo funciona entre abas do mesmo computador
 * via BroadcastChannel — usado nos testes automáticos.
 */
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { accountService } from './account';
import { soundEngine } from '../engine/audio';
import type { HudSnapshot, PressAction } from '../engine/GameEngine';
import { FIGHTERS, FighterId } from '../data/fighters';
import { STAGES, StageId } from '../data/stages';

export type OnlineRole = 'host' | 'guest';
export type OnlinePhase = 'idle' | 'connecting' | 'room' | 'fight';
export type LinkState = 'none' | 'connecting' | 'ok' | 'failed';
export type TransportKind = 'supabase' | 'local';

export interface OnlinePeer {
  id: string;
  nick: string;
  fighter: FighterId;
  ready: boolean;
}

export interface RoomState {
  code: string;
  host: OnlinePeer;
  guest: OnlinePeer | null;
  stage: StageId;
}

export interface OnlineFight {
  p1: FighterId;
  p2: FighterId;
  stage: StageId;
  seq: number;
  rematch: boolean;
}

export interface LobbyEntry {
  id: string;
  nick: string;
  fighter: FighterId;
  state: 'menu' | 'waiting' | 'playing';
  room: string | null;
}

export interface OnlineSnapshot {
  phase: OnlinePhase;
  role: OnlineRole | null;
  me: OnlinePeer;
  room: RoomState | null;
  link: LinkState;
  pingMs: number | null;
  error: string;
  notice: string;
  transport: TransportKind | null;
  lobby: LobbyEntry[];
  lobbyOpen: boolean;
  remoteStream: MediaStream | null;
  fight: OnlineFight | null;
  remoteHud: HudSnapshot | null;
  rematch: { me: boolean; peer: boolean };
}

interface PresenceMeta {
  id: string;
  [key: string]: unknown;
}

interface Transport {
  kind: TransportKind;
  send(msg: Msg): void;
  onMessage(cb: (msg: Msg) => void): void;
  track(meta: PresenceMeta): void;
  onPresence(cb: (list: PresenceMeta[]) => void): void;
  close(): void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Msg = { t: string; from?: string; to?: string; [key: string]: any };

const STUN_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

/**
 * Credenciais TURN temporárias (Cloudflare Realtime) vindas de um Worker que guarda a chave.
 * TURN retransmite a conexão quando a rede bloqueia a ligação direta (Wi-Fi de empresa, 4G com NAT
 * restrito). Se o serviço não responder, segue só com STUN (conexão direta), como antes.
 */
const TURN_ENDPOINT = 'https://familia-fighter-turn.familia-fighter.workers.dev';
let iceCache: { servers: RTCIceServer[]; until: number } | null = null;

async function iceServers(useTurn: boolean): Promise<RTCIceServer[]> {
  if (!useTurn) return STUN_SERVERS;
  if (iceCache && iceCache.until > Date.now()) return iceCache.servers;
  try {
    const ctl = new AbortController();
    const timer = window.setTimeout(() => ctl.abort(), 2500);
    const r = await fetch(TURN_ENDPOINT, { signal: ctl.signal, cache: 'no-store' });
    window.clearTimeout(timer);
    if (!r.ok) throw new Error(String(r.status));
    const data = (await r.json()) as { iceServers?: RTCIceServer[] };
    if (!data.iceServers?.length) throw new Error('sem servidores');
    // credenciais valem 3 h; renova com folga
    iceCache = { servers: [...STUN_SERVERS, ...data.iceServers], until: Date.now() + 2 * 3600 * 1000 };
    return iceCache.servers;
  } catch {
    return STUN_SERVERS;
  }
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const FIGHTER_IDS = Object.keys(FIGHTERS) as FighterId[];
const STAGE_IDS = Object.keys(STAGES) as StageId[];
const NICK_KEY = 'ff-guest-nick';
const FIGHTER_KEY = 'ff-online-fighter';

/** Sons que o anfitrião repete no aparelho do convidado (só nomes/números/textos como argumento). */
const RELAYED_SOUNDS = [
  'startMusic', 'pauseMusic', 'stopMusic', 'stopAllVoices', 'preloadFighterVoices', 'playAnnouncer', 'playClip',
  'playHit', 'playSwing', 'playJump', 'playSpecial', 'playDaviSpecial', 'playTransform', 'playBoing',
  'playShutter', 'playSplash', 'playBite', 'playBless', 'playCountdown', 'playRoundBell', 'playFightBell',
  'playKO', 'playVictory',
] as const;
type RelayedSound = (typeof RELAYED_SOUNDS)[number];

const randomId = () =>
  (crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/-/g, '').slice(0, 12);

export function cleanNick(raw: string): string {
  return raw.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24);
}

export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
}

function isFighter(v: unknown): v is FighterId {
  return typeof v === 'string' && (FIGHTER_IDS as string[]).includes(v);
}

function isStage(v: unknown): v is StageId {
  return typeof v === 'string' && (STAGE_IDS as string[]).includes(v);
}

function wantLocal(): boolean {
  try {
    const q = new URLSearchParams(location.search);
    return q.get('local') === '1' || q.get('online') === 'local';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- transportes

async function supabaseTransport(client: SupabaseClient, topic: string, selfId: string): Promise<Transport> {
  const ch: RealtimeChannel = client.channel(topic, {
    config: { broadcast: { self: false, ack: false }, presence: { key: selfId } },
  });
  let msgCb: ((m: Msg) => void) | null = null;
  let presCb: ((l: PresenceMeta[]) => void) | null = null;
  ch.on('broadcast', { event: 'm' }, ({ payload }) => msgCb?.(payload as Msg));
  ch.on('presence', { event: 'sync' }, () => {
    const state = ch.presenceState() as Record<string, PresenceMeta[]>;
    presCb?.(Object.values(state).flat());
  });
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('o servidor online não respondeu')), 12000);
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        window.clearTimeout(timer);
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        window.clearTimeout(timer);
        reject(new Error('não foi possível entrar no canal online'));
      }
    });
  });
  return {
    kind: 'supabase',
    send: (m) => void ch.send({ type: 'broadcast', event: 'm', payload: m }),
    onMessage: (cb) => (msgCb = cb),
    track: (meta) => void ch.track(meta),
    onPresence: (cb) => (presCb = cb),
    close: () => {
      void ch.untrack().catch(() => {});
      void client.removeChannel(ch);
    },
  };
}

function localTransport(topic: string, selfId: string): Transport {
  const bc = new BroadcastChannel(`ff:${topic}`);
  const peers = new Map<string, { meta: PresenceMeta; at: number }>();
  let meta: PresenceMeta | null = null;
  let msgCb: ((m: Msg) => void) | null = null;
  let presCb: ((l: PresenceMeta[]) => void) | null = null;
  const emit = () => presCb?.([...(meta ? [meta] : []), ...[...peers.values()].map((p) => p.meta)]);
  bc.onmessage = (e) => {
    const d = e.data as { k: string; id?: string; meta?: PresenceMeta; m?: Msg };
    if (d.k === 'p' && d.id && d.meta) {
      const isNew = !peers.has(d.id);
      peers.set(d.id, { meta: d.meta, at: Date.now() });
      emit();
      // responde para quem acabou de chegar já nos ver
      if (isNew && meta) bc.postMessage({ k: 'p', id: selfId, meta });
    } else if (d.k === 'leave' && d.id) {
      peers.delete(d.id);
      emit();
    } else if (d.k === 'm' && d.m) {
      msgCb?.(d.m);
    }
  };
  const hb = window.setInterval(() => {
    if (meta) bc.postMessage({ k: 'p', id: selfId, meta });
    const now = Date.now();
    let changed = false;
    for (const [id, p] of peers) {
      if (now - p.at > 4500) {
        peers.delete(id);
        changed = true;
      }
    }
    if (changed) emit();
  }, 1000);
  return {
    kind: 'local',
    send: (m) => bc.postMessage({ k: 'm', m }),
    onMessage: (cb) => (msgCb = cb),
    track: (m) => {
      meta = m;
      bc.postMessage({ k: 'p', id: selfId, meta: m });
      emit();
    },
    onPresence: (cb) => (presCb = cb),
    close: () => {
      bc.postMessage({ k: 'leave', id: selfId });
      window.clearInterval(hb);
      bc.close();
    },
  };
}

// ---------------------------------------------------------------- sessão

class OnlineSession {
  private state: OnlineSnapshot;
  private listeners = new Set<() => void>();
  private room: Transport | null = null;
  private lobby: Transport | null = null;
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private pendingIce: RTCIceCandidateInit[] = [];
  private peerSeen = false;
  private joinTimer = 0;
  private pingTimer = 0;
  private hudSentAt = 0;
  private lastHudKey = '';
  private hudTimer = 0;
  private pendingHud: HudSnapshot | null = null;
  private fightSeq = 0;
  private soundOriginals: Partial<Record<RelayedSound, (...a: unknown[]) => unknown>> = {};
  private canvasProvider: (() => HTMLCanvasElement | null) | null = null;
  private stream: MediaStream | null = null;

  /** ganchos do anfitrião (App liga no motor) */
  hostInput: {
    hold: (action: string, down: boolean) => void;
    press: (action: PressAction) => void;
    clear: () => void;
  } | null = null;
  /** anfitrião: os dois pediram revanche */
  onRematch: (() => void) | null = null;
  /** os dois voltam para a sala (fim da luta, saída ou queda) */
  onFightEnd: ((reason: string) => void) | null = null;

  private guestHolds = new Set<string>();

  constructor() {
    const me: OnlinePeer = {
      id: randomId(),
      nick: '',
      fighter: (isFighter(localStorage.getItem(FIGHTER_KEY)) ? localStorage.getItem(FIGHTER_KEY) : 'carlos') as FighterId,
      ready: false,
    };
    this.state = {
      phase: 'idle',
      role: null,
      me,
      room: null,
      link: 'none',
      pingMs: null,
      error: '',
      notice: '',
      transport: null,
      lobby: [],
      lobbyOpen: false,
      remoteStream: null,
      fight: null,
      remoteHud: null,
      rematch: { me: false, peer: false },
    };
  }

  getSnapshot = (): OnlineSnapshot => this.state;

  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  private set(next: Partial<OnlineSnapshot>) {
    this.state = { ...this.state, ...next };
    this.listeners.forEach((l) => l());
  }

  setCanvasProvider(fn: () => HTMLCanvasElement | null) {
    this.canvasProvider = fn;
  }

  defaultNick(): string {
    return cleanNick(accountService.getSnapshot().nickname || localStorage.getItem(NICK_KEY) || '');
  }

  setNick(raw: string) {
    const nick = cleanNick(raw);
    try {
      localStorage.setItem(NICK_KEY, nick);
    } catch {
      /* sem armazenamento */
    }
    this.set({ me: { ...this.state.me, nick } });
    this.trackLobby();
  }

  note(msg: string) {
    this.set({ notice: msg, error: '' });
  }

  clearMessages() {
    this.set({ error: '', notice: '' });
  }

  private async openTransport(topic: string): Promise<Transport> {
    if (!wantLocal()) {
      const client = await accountService.realtimeClient();
      if (client) return supabaseTransport(client, topic, this.state.me.id);
    }
    return localTransport(topic, this.state.me.id);
  }

  // ------------------------------------------------ saguão

  async enterLobby() {
    if (this.lobby || this.state.lobbyOpen) return;
    this.set({ lobbyOpen: true });
    try {
      const t = await this.openTransport('ff-lobby');
      if (!this.state.lobbyOpen) {
        t.close();
        return;
      }
      this.lobby = t;
      this.set({ transport: t.kind });
      t.onPresence((list) => {
        const seen = new Set<string>();
        const entries: LobbyEntry[] = [];
        for (const m of list) {
          const id = String(m.id ?? '');
          if (!id || id === this.state.me.id || seen.has(id)) continue;
          seen.add(id);
          entries.push({
            id,
            nick: cleanNick(String(m.nick ?? '')) || 'Alguém',
            fighter: isFighter(m.fighter) ? m.fighter : 'carlos',
            state: m.state === 'waiting' || m.state === 'playing' ? m.state : 'menu',
            room: typeof m.room === 'string' ? normalizeCode(m.room) || null : null,
          });
        }
        this.set({ lobby: entries });
      });
      this.trackLobby();
    } catch (e) {
      this.set({ lobbyOpen: false, error: `Saguão indisponível: ${(e as Error).message}` });
    }
  }

  leaveLobby() {
    this.lobby?.close();
    this.lobby = null;
    this.set({ lobbyOpen: false, lobby: [] });
  }

  private trackLobby() {
    if (!this.lobby || !this.state.me.nick) return;
    const r = this.state.room;
    const st: LobbyEntry['state'] = this.state.phase === 'fight' ? 'playing' : r && !r.guest ? 'waiting' : r ? 'playing' : 'menu';
    this.lobby.track({
      id: this.state.me.id,
      nick: this.state.me.nick,
      fighter: this.state.me.fighter,
      state: st,
      room: this.state.role === 'host' && r && !r.guest ? r.code : null,
    });
  }

  // ------------------------------------------------ salas

  async createRoom() {
    if (!this.state.me.nick) {
      this.set({ error: 'Escolha um apelido antes.' });
      return;
    }
    await this.leaveRoom(true);
    const code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
    this.set({ phase: 'connecting', role: 'host', error: '', notice: '' });
    try {
      const t = await this.openTransport(`ff-room-${code}`);
      this.room = t;
      const me = { ...this.state.me, ready: true };
      this.set({
        me,
        transport: t.kind,
        phase: 'room',
        room: { code, host: me, guest: null, stage: 'quintal' },
        rematch: { me: false, peer: false },
      });
      t.onMessage((m) => this.onRoomMsg(m));
      t.onPresence((l) => this.onRoomPresence(l));
      t.track({ id: me.id, nick: me.nick, role: 'host' });
      this.trackLobby();
    } catch (e) {
      this.reset(`Não deu para criar a sala: ${(e as Error).message}`);
    }
  }

  async joinRoom(rawCode: string) {
    const code = normalizeCode(rawCode);
    if (code.length !== 4) {
      this.set({ error: 'O código da sala tem 4 letras.' });
      return;
    }
    if (!this.state.me.nick) {
      this.set({ error: 'Escolha um apelido antes.' });
      return;
    }
    await this.leaveRoom(true);
    this.set({ phase: 'connecting', role: 'guest', error: '', notice: `Procurando a sala ${code}…` });
    try {
      const t = await this.openTransport(`ff-room-${code}`);
      this.room = t;
      const me = { ...this.state.me, ready: false };
      this.set({ me, transport: t.kind });
      t.onMessage((m) => this.onRoomMsg(m));
      t.onPresence((l) => this.onRoomPresence(l));
      t.track({ id: me.id, nick: me.nick, role: 'guest' });
      const ask = () => t.send({ t: 'join', from: me.id, nick: me.nick, fighter: me.fighter });
      ask();
      let tries = 0;
      window.clearInterval(this.joinTimer);
      this.joinTimer = window.setInterval(() => {
        if (this.state.phase !== 'connecting') {
          window.clearInterval(this.joinTimer);
          return;
        }
        if (++tries >= 6) {
          window.clearInterval(this.joinTimer);
          void this.leaveRoom(true);
          this.reset(`Sala ${code} não encontrada. Confira o código com quem criou.`);
          return;
        }
        ask();
      }, 1500);
    } catch (e) {
      this.reset(`Não deu para entrar: ${(e as Error).message}`);
    }
  }

  async leaveRoom(silent = false) {
    window.clearInterval(this.joinTimer);
    if (this.room) {
      this.room.send({ t: 'bye', from: this.state.me.id });
      this.room.close();
    }
    this.room = null;
    this.closePeer();
    this.stopSoundRelay();
    this.peerSeen = false;
    if (!silent) this.reset('');
    else this.set({ room: null, role: null, phase: 'idle', link: 'none', fight: null, remoteHud: null, remoteStream: null });
    this.trackLobby();
  }

  private reset(error: string) {
    this.closePeer();
    this.stopSoundRelay();
    this.room?.close();
    this.room = null;
    this.peerSeen = false;
    this.set({
      phase: 'idle',
      role: null,
      room: null,
      link: 'none',
      pingMs: null,
      fight: null,
      remoteHud: null,
      remoteStream: null,
      error,
      notice: '',
      rematch: { me: false, peer: false },
    });
    this.trackLobby();
  }

  setFighter(id: FighterId) {
    if (!isFighter(id)) return;
    try {
      localStorage.setItem(FIGHTER_KEY, id);
    } catch {
      /* ok */
    }
    const me = { ...this.state.me, fighter: id };
    this.set({ me });
    this.pushPick(me);
    this.trackLobby();
  }

  setReady(ready: boolean) {
    const me = { ...this.state.me, ready };
    this.set({ me });
    this.pushPick(me);
  }

  setStage(stage: StageId) {
    const r = this.state.room;
    if (this.state.role !== 'host' || !r || !isStage(stage)) return;
    this.updateRoom({ ...r, stage });
  }

  private pushPick(me: OnlinePeer) {
    const r = this.state.room;
    if (!r) return;
    if (this.state.role === 'host') this.updateRoom({ ...r, host: { ...me, ready: true } });
    else this.room?.send({ t: 'pick', from: me.id, fighter: me.fighter, ready: me.ready, nick: me.nick });
  }

  private updateRoom(room: RoomState) {
    this.set({ room });
    this.room?.send({ t: 'room', from: this.state.me.id, room });
    this.trackLobby();
  }

  private onRoomPresence(list: PresenceMeta[]) {
    const r = this.state.room;
    const myRole = this.state.role;
    if (!r || !myRole) return;
    const otherId = myRole === 'host' ? r.guest?.id : r.host.id;
    if (!otherId) return;
    const present = list.some((m) => m.id === otherId);
    if (present) this.peerSeen = true;
    else if (this.peerSeen) this.peerLeft();
  }

  private peerLeft() {
    const r = this.state.room;
    if (!r) return;
    this.peerSeen = false;
    const wasFight = this.state.phase === 'fight';
    if (this.state.role === 'host') {
      const nick = r.guest?.nick ?? 'O convidado';
      this.closePeer();
      this.stopSoundRelay();
      this.guestHolds.clear();
      this.hostInput?.clear();
      this.set({ phase: 'room', fight: null, rematch: { me: false, peer: false }, notice: `${nick} saiu da sala.` });
      this.updateRoom({ ...r, guest: null });
      if (wasFight) this.onFightEnd?.(`${nick} saiu da partida.`);
    } else {
      if (wasFight) this.onFightEnd?.('O anfitrião saiu.');
      this.reset('O anfitrião fechou a sala.');
    }
  }

  private onRoomMsg(m: Msg) {
    if (!m || typeof m.t !== 'string') return;
    const me = this.state.me;
    if (m.to && m.to !== me.id) return;
    const r = this.state.room;
    if (this.state.role === 'host' && r) {
      if (m.t === 'join' && typeof m.from === 'string') {
        if (r.guest && r.guest.id !== m.from) {
          this.room?.send({ t: 'full', to: m.from });
          return;
        }
        const isNew = !r.guest;
        const guest: OnlinePeer = {
          id: m.from,
          nick: cleanNick(String(m.nick ?? '')) || 'Convidado',
          fighter: isFighter(m.fighter) ? m.fighter : 'paula',
          ready: false,
        };
        this.peerSeen = false;
        this.updateRoom({ ...r, guest });
        this.room?.send({ t: 'welcome', to: m.from, room: { ...r, guest } });
        if (isNew || !this.pc) {
          this.set({ notice: `${guest.nick} entrou na sala!` });
          soundEngine.playUi('confirm');
          void this.startPeer();
        }
      } else if (m.t === 'pick' && r.guest && m.from === r.guest.id) {
        this.updateRoom({
          ...r,
          guest: {
            ...r.guest,
            fighter: isFighter(m.fighter) ? m.fighter : r.guest.fighter,
            ready: Boolean(m.ready),
          },
        });
      } else if (m.t === 'sdp' && m.d?.type === 'answer' && this.pc) {
        void this.pc
          .setRemoteDescription(m.d)
          .then(() => this.flushIce())
          .catch(() => this.set({ link: 'failed' }));
      } else if (m.t === 'ice' && m.c) {
        this.addIce(m.c);
      } else if (m.t === 'retry' && r.guest && m.from === r.guest.id) {
        void this.startPeer();
      } else if (m.t === 'bye' && r.guest && m.from === r.guest.id) {
        this.peerSeen = true;
        this.peerLeft();
      }
      return;
    }
    if (this.state.role === 'guest') {
      if (m.t === 'welcome' && m.room) {
        window.clearInterval(this.joinTimer);
        this.set({ phase: 'room', room: m.room as RoomState, notice: '', error: '', link: 'connecting' });
        soundEngine.playUi('confirm');
        this.trackLobby();
      } else if (m.t === 'full') {
        window.clearInterval(this.joinTimer);
        void this.leaveRoom(true);
        this.reset('Essa sala já está cheia (são só 2 jogadores).');
      } else if (m.t === 'room' && m.room && this.state.phase !== 'connecting') {
        const room = m.room as RoomState;
        if (room.guest && room.guest.id !== me.id) {
          this.reset('A sala foi ocupada por outra pessoa.');
          return;
        }
        if (!room.guest) return; // o anfitrião ainda não registrou a gente
        this.set({ room });
      } else if (m.t === 'sdp' && m.d?.type === 'offer') {
        void this.acceptOffer(m.d as RTCSessionDescriptionInit);
      } else if (m.t === 'ice' && m.c) {
        this.addIce(m.c);
      } else if (m.t === 'bye' && r && m.from === r.host.id) {
        this.peerSeen = true;
        this.peerLeft();
      }
    }
  }

  // ------------------------------------------------ conexão direta (WebRTC)

  private async newPeer(): Promise<RTCPeerConnection> {
    this.closePeer();
    const servers = await iceServers(this.state.transport === 'supabase');
    const pc = new RTCPeerConnection({ iceServers: servers });
    this.pc = pc;
    this.pendingIce = [];
    const other = () => (this.state.role === 'host' ? this.state.room?.guest?.id : this.state.room?.host.id);
    pc.onicecandidate = (e) => {
      if (e.candidate) this.room?.send({ t: 'ice', from: this.state.me.id, to: other(), c: e.candidate.toJSON() });
    };
    pc.onconnectionstatechange = () => {
      if (this.pc !== pc) return;
      const s = pc.connectionState;
      if (s === 'failed') {
        this.set({
          link: 'failed',
          notice: 'A conexão direta não fechou. Tentem outra rede (ex.: um dos dois no 4G) e cliquem em "Tentar de novo".',
        });
        if (this.state.phase === 'fight') this.onFightEnd?.('A conexão caiu.');
      } else if (s === 'disconnected' && this.state.phase === 'fight') {
        this.set({ notice: 'Conexão instável…' });
      }
    };
    return pc;
  }

  private async startPeer() {
    const guestId = this.state.room?.guest?.id;
    if (!guestId) return;
    this.set({ link: 'connecting' });
    const pc = await this.newPeer();
    const dc = pc.createDataChannel('game', { ordered: true });
    this.bindChannel(dc);
    const canvas = this.canvasProvider?.() ?? null;
    if (canvas && typeof canvas.captureStream === 'function') {
      this.stream?.getTracks().forEach((t) => t.stop());
      this.stream = canvas.captureStream(30);
      for (const track of this.stream.getVideoTracks()) {
        try {
          track.contentHint = 'motion';
        } catch {
          /* ok */
        }
        const sender = pc.addTrack(track, this.stream);
        const tune = () => {
          try {
            const p = sender.getParameters();
            if (!p.encodings || !p.encodings.length) p.encodings = [{}];
            p.encodings[0].maxBitrate = 3_000_000;
            p.encodings[0].maxFramerate = 30;
            (p as RTCRtpSendParameters & { degradationPreference?: string }).degradationPreference = 'maintain-framerate';
            void sender.setParameters(p).catch(() => {});
          } catch {
            /* navegador sem ajuste fino */
          }
        };
        window.setTimeout(tune, 0);
      }
    }
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.room?.send({ t: 'sdp', from: this.state.me.id, to: guestId, d: pc.localDescription?.toJSON() });
    } catch {
      this.set({ link: 'failed' });
    }
  }

  private async acceptOffer(offer: RTCSessionDescriptionInit) {
    const hostId = this.state.room?.host.id;
    this.set({ link: 'connecting' });
    const pending = this.pendingIce;
    const pc = await this.newPeer();
    // candidatos que chegaram enquanto buscávamos as credenciais TURN
    this.pendingIce = pending;
    pc.ondatachannel = (e) => this.bindChannel(e.channel);
    pc.ontrack = (e) => {
      try {
        const rcv = e.receiver as RTCRtpReceiver & { jitterBufferTarget?: number; playoutDelayHint?: number };
        if ('jitterBufferTarget' in rcv) rcv.jitterBufferTarget = 0;
        if ('playoutDelayHint' in rcv) rcv.playoutDelayHint = 0;
      } catch {
        /* ok */
      }
      this.set({ remoteStream: e.streams[0] ?? new MediaStream([e.track]) });
    };
    try {
      await pc.setRemoteDescription(offer);
      this.flushIce();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.room?.send({ t: 'sdp', from: this.state.me.id, to: hostId, d: pc.localDescription?.toJSON() });
    } catch {
      this.set({ link: 'failed' });
    }
  }

  retryLink() {
    this.set({ notice: '', link: 'connecting' });
    if (this.state.role === 'host') void this.startPeer();
    else this.room?.send({ t: 'retry', from: this.state.me.id, to: this.state.room?.host.id });
  }

  private addIce(c: RTCIceCandidateInit) {
    if (!this.pc || !this.pc.remoteDescription) {
      this.pendingIce.push(c);
      return;
    }
    void this.pc.addIceCandidate(c).catch(() => {});
  }

  private flushIce() {
    const list = this.pendingIce;
    this.pendingIce = [];
    list.forEach((c) => this.addIce(c));
  }

  private closePeer() {
    window.clearInterval(this.pingTimer);
    window.clearTimeout(this.hudTimer);
    try {
      this.dc?.close();
    } catch {
      /* ok */
    }
    try {
      this.pc?.close();
    } catch {
      /* ok */
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.dc = null;
    this.pc = null;
    this.pendingIce = [];
    if (this.state.link !== 'none' || this.state.remoteStream) this.set({ link: 'none', pingMs: null, remoteStream: null });
  }

  private bindChannel(dc: RTCDataChannel) {
    this.dc = dc;
    dc.onopen = () => {
      if (this.dc !== dc) return;
      this.set({ link: 'ok', notice: '' });
      window.clearInterval(this.pingTimer);
      this.pingTimer = window.setInterval(() => this.sendDc({ t: 'ping', ts: performance.now() }), 1000);
    };
    dc.onclose = () => {
      if (this.dc !== dc) return;
      window.clearInterval(this.pingTimer);
      if (this.state.link === 'ok') this.set({ link: 'failed' });
    };
    dc.onmessage = (e) => {
      try {
        this.onGameMsg(JSON.parse(String(e.data)) as Msg);
      } catch {
        /* mensagem inválida */
      }
    };
  }

  private sendDc(m: Msg): boolean {
    if (!this.dc || this.dc.readyState !== 'open') return false;
    try {
      this.dc.send(JSON.stringify(m));
      return true;
    } catch {
      return false;
    }
  }

  private onGameMsg(m: Msg) {
    switch (m.t) {
      case 'ping':
        this.sendDc({ t: 'pong', ts: m.ts });
        return;
      case 'pong':
        if (typeof m.ts === 'number') this.set({ pingMs: Math.round(performance.now() - m.ts) });
        return;
    }
    if (this.state.role === 'host') {
      const inp = this.hostInput;
      if (this.state.phase !== 'fight') {
        if (m.t === 'rematch') this.setRematch(this.state.rematch.me, true);
        return;
      }
      if (m.t === 'hold' && Array.isArray(m.s)) {
        const next = new Set<string>(m.s.filter((a: unknown) => ['left', 'right', 'up', 'down', 'guard'].includes(String(a))));
        for (const a of this.guestHolds) if (!next.has(a)) inp?.hold(a, false);
        for (const a of next) if (!this.guestHolds.has(a)) inp?.hold(a, true);
        this.guestHolds = next;
      } else if (m.t === 'press' && ['light', 'heavy', 'special', 'subSpecial', 'jump', 'taunt'].includes(m.a)) {
        inp?.press(m.a as PressAction);
      } else if (m.t === 'rematch') {
        this.setRematch(this.state.rematch.me, true);
      } else if (m.t === 'leaveFight') {
        this.endFight('O convidado voltou para a sala.');
      }
      return;
    }
    // convidado
    if (m.t === 'start' && m.fight) {
      const f = m.fight as OnlineFight;
      if (!isFighter(f.p1) || !isFighter(f.p2) || !isStage(f.stage)) return;
      soundEngine.stopAllVoices();
      soundEngine.preloadFighterVoices([f.p1, f.p2, 'narrator']);
      this.set({ phase: 'fight', fight: f, remoteHud: null, rematch: { me: false, peer: false }, notice: '' });
      this.trackLobby();
    } else if (m.t === 'hud' && m.h) {
      this.set({ remoteHud: m.h as HudSnapshot });
    } else if (m.t === 'snd' && typeof m.m === 'string') {
      this.playRelayed(m.m, Array.isArray(m.a) ? m.a : []);
    } else if (m.t === 'rm') {
      this.set({ rematch: { me: Boolean(m.peer), peer: Boolean(m.me) } });
    } else if (m.t === 'end') {
      this.stopRelayedAudio();
      this.set({ phase: 'room', fight: null, remoteHud: null, rematch: { me: false, peer: false } });
      this.onFightEnd?.(typeof m.reason === 'string' ? m.reason : '');
      this.trackLobby();
    }
  }

  // ------------------------------------------------ luta (anfitrião)

  canStart(): boolean {
    const r = this.state.room;
    return this.state.role === 'host' && !!r?.guest?.ready && this.state.link === 'ok';
  }

  /** Anfitrião: avisa o convidado e começa a repetir os sons para ele. */
  hostStartFight(rematch = false): OnlineFight | null {
    const r = this.state.room;
    if (this.state.role !== 'host' || !r?.guest) return null;
    const fight: OnlineFight = { p1: r.host.fighter, p2: r.guest.fighter, stage: r.stage, seq: ++this.fightSeq, rematch };
    this.guestHolds.clear();
    this.hostInput?.clear();
    this.lastHudKey = '';
    this.startSoundRelay();
    this.sendDc({ t: 'start', fight });
    this.set({ phase: 'fight', fight, rematch: { me: false, peer: false }, notice: '' });
    this.trackLobby();
    return fight;
  }

  /** Volta os dois para a sala (fim de luta, "trocar lutadores" ou saída). */
  endFight(reason = '') {
    if (this.state.phase !== 'fight') return;
    if (this.state.role === 'host') {
      this.stopSoundRelay();
      this.sendDc({ t: 'end', reason });
      this.guestHolds.clear();
      this.hostInput?.clear();
      const r = this.state.room;
      this.set({ phase: 'room', fight: null, rematch: { me: false, peer: false } });
      if (r?.guest) this.updateRoom({ ...r, guest: { ...r.guest, ready: false } });
      this.onFightEnd?.(reason);
    } else {
      this.sendDc({ t: 'leaveFight' });
    }
    this.trackLobby();
  }

  requestRematch() {
    if (this.state.role === 'host') this.setRematch(true, this.state.rematch.peer);
    else {
      this.sendDc({ t: 'rematch' });
      this.set({ rematch: { ...this.state.rematch, me: true } });
    }
  }

  private setRematch(me: boolean, peer: boolean) {
    this.set({ rematch: { me, peer } });
    this.sendDc({ t: 'rm', me, peer });
    if (me && peer && this.state.role === 'host') {
      this.set({ rematch: { me: false, peer: false } });
      this.onRematch?.();
    }
  }

  /** Anfitrião: placar/estado da luta para o HUD do convidado (~15 por segundo, mudanças de fase na hora). */
  relayHud(h: HudSnapshot) {
    if (this.state.role !== 'host' || this.state.phase !== 'fight') return;
    const key = `${h.phase}|${h.bannerText}|${h.winnerIndex}|${h.superCutin?.key ?? ''}|${h.flashKey}|${h.introLine?.text ?? ''}`;
    const now = performance.now();
    this.pendingHud = h;
    if (key !== this.lastHudKey || now - this.hudSentAt > 66) {
      this.lastHudKey = key;
      this.flushHud();
    } else if (!this.hudTimer) {
      this.hudTimer = window.setTimeout(() => this.flushHud(), 70);
    }
  }

  private flushHud() {
    window.clearTimeout(this.hudTimer);
    this.hudTimer = 0;
    if (!this.pendingHud) return;
    const h = this.pendingHud;
    this.pendingHud = null;
    this.hudSentAt = performance.now();
    this.sendDc({ t: 'hud', h: { ...h, training: null } });
  }

  // ------------------------------------------------ sons

  private startSoundRelay() {
    if (Object.keys(this.soundOriginals).length) return;
    const eng = soundEngine as unknown as Record<string, (...a: unknown[]) => unknown>;
    for (const name of RELAYED_SOUNDS) {
      const orig = eng[name];
      if (typeof orig !== 'function') continue;
      this.soundOriginals[name] = orig;
      eng[name] = (...args: unknown[]) => {
        const safe = args.filter((a) => a === null || ['string', 'number', 'boolean'].includes(typeof a) || Array.isArray(a));
        this.sendDc({ t: 'snd', m: name, a: safe });
        return orig.apply(soundEngine, args);
      };
    }
  }

  private stopSoundRelay() {
    const eng = soundEngine as unknown as Record<string, unknown>;
    for (const [name, fn] of Object.entries(this.soundOriginals)) eng[name] = fn;
    this.soundOriginals = {};
  }

  private playRelayed(name: string, args: unknown[]) {
    if (!(RELAYED_SOUNDS as readonly string[]).includes(name)) return;
    const eng = soundEngine as unknown as Record<string, (...a: unknown[]) => unknown>;
    let a = args;
    // o anfitrião ouve "você venceu" do ponto de vista do 1P; o convidado é o 2P
    if (name === 'playAnnouncer' && a[0] === 'you_win') a = ['you_lose'];
    else if (name === 'playAnnouncer' && a[0] === 'you_lose') a = ['you_win'];
    try {
      eng[name]?.apply(soundEngine, a);
    } catch {
      /* som indisponível */
    }
  }

  private stopRelayedAudio() {
    soundEngine.stopAllVoices();
  }

  // ------------------------------------------------ comandos (convidado)

  sendHolds(set: Iterable<string>) {
    if (this.state.role !== 'guest') return;
    this.sendDc({ t: 'hold', s: [...set] });
  }

  sendPress(action: PressAction) {
    if (this.state.role !== 'guest') return;
    this.sendDc({ t: 'press', a: action });
  }

  /** Link para convidar: abre o jogo direto na sala. */
  inviteLink(): string {
    const code = this.state.room?.code ?? '';
    const url = new URL(location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('sala', code);
    if (this.state.transport === 'local') url.searchParams.set('local', '1');
    return url.toString();
  }
}

export const onlineSession = new OnlineSession();
if (import.meta.env.DEV) (window as unknown as { __ffOnline?: OnlineSession }).__ffOnline = onlineSession;
