import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { FighterId } from '../data/fighters';

const SDK_VERSION = '2.49.4';
const QUEUE_KEY = 'ff-pending-matches';
const MAX_QUEUE = 200;
const VALID_OUTCOMES = new Set(['win', 'loss', 'draw']);
const VALID_FIGHTERS = new Set([
  'juraci', 'carlos', 'pedro', 'daniel', 'franciely', 'gabi', 'paula', 'tainara', 'davi',
]);

export type MatchOutcome = 'win' | 'loss' | 'draw';
export type MatchMode = 'cpu' | 'story' | 'online';

interface PendingMatch {
  matchId: string;
  userId: string;
  outcome: MatchOutcome;
  fighterId: FighterId;
  mode?: MatchMode;
  opponentFighter?: FighterId | null;
  opponentName?: string | null;
}

export interface MatchOptions {
  mode?: MatchMode;
  opponentFighter?: FighterId | null;
  opponentName?: string | null;
  /** mesmo id nos dois aparelhos não é preciso: cada jogador grava o seu */
  matchId?: string;
}

export interface ProfileStats {
  nickname: string;
  selectedFighter: FighterId;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  onlineWins: number;
  onlineLosses: number;
  onlineDraws: number;
}

export interface LeaderboardRow {
  nickname: string;
  selected_fighter: FighterId;
  matches_played: number;
  wins: number;
  losses: number;
  draws: number;
  online_wins: number;
  online_losses: number;
}

export interface RecentMatch {
  outcome: MatchOutcome;
  selected_fighter: FighterId;
  mode: MatchMode;
  opponent_fighter: FighterId | null;
  opponent_name: string | null;
  created_at: string;
}

export interface AccountSnapshot {
  configured: boolean;
  email: string | null;
  userId: string | null;
  nickname: string | null;
  stats: ProfileStats | null;
  progress: string;
  status: string;
  syncStatus: string;
}

declare global {
  interface Window {
    FF_SUPABASE_CONFIG?: { url?: string; anonKey?: string };
  }
}

const INITIAL_STATE: AccountSnapshot = {
  configured: false,
  email: null,
  userId: null,
  nickname: null,
  stats: null,
  progress: '',
  status: 'Verificando a conexão com a conta…',
  syncStatus: '',
};

class AccountService {
  private state: AccountSnapshot = INITIAL_STATE;
  private listeners = new Set<() => void>();
  private user: User | null = null;
  private clientPromise: Promise<SupabaseClient> | null = null;
  private initializePromise: Promise<void> | null = null;
  private authSubscription: { unsubscribe: () => void } | null = null;
  private flushing = false;

  getSnapshot = (): AccountSnapshot => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private update(next: Partial<AccountSnapshot>) {
    this.state = { ...this.state, ...next };
    this.listeners.forEach((listener) => listener());
  }

  private setUser(user: User | null) {
    this.user = user;
    this.update({
      email: user?.email ?? null,
      userId: user?.id ?? null,
      nickname: user ? this.state.nickname : null,
      stats: user ? this.state.stats : null,
    });
  }

  private async loadRuntimeConfig(): Promise<{ url: string; anonKey: string } | null> {
    const envUrl = import.meta.env.VITE_SUPABASE_URL;
    const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (envUrl && envKey) return { url: envUrl, anonKey: envKey };

    if (window.FF_SUPABASE_CONFIG?.url && window.FF_SUPABASE_CONFIG.anonKey) {
      return {
        url: window.FF_SUPABASE_CONFIG.url,
        anonKey: window.FF_SUPABASE_CONFIG.anonKey,
      };
    }

    // Vite dev serves only prototype-2.5d; the public root config is loaded by
    // the production Pages app, while local testing can use VITE_SUPABASE_*.
    if (import.meta.env.DEV) return null;

    // The production app is built into the repository root. The source preview
    // still lives one directory below it, so resolve the existing public config
    // from either location without copying or replacing that file.
    const configPath = window.location.pathname.includes('/prototype-2.5d/')
      ? '../supabase-config.js'
      : './supabase-config.js';
    await new Promise<void>((resolve) => {
      const script = document.createElement('script');
      script.src = configPath;
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.head.append(script);
    });

    const config = window.FF_SUPABASE_CONFIG;
    if (!config?.url || !config.anonKey) return null;
    return { url: config.url, anonKey: config.anonKey };
  }

  private async client(): Promise<SupabaseClient> {
    if (!this.clientPromise) {
      this.clientPromise = this.loadRuntimeConfig().then((config) => {
        if (!config || !/^https:\/\//.test(config.url)) {
          throw new Error('A conta ainda não foi conectada ao Supabase. O jogo continua disponível sem conta.');
        }
        this.update({ configured: true });
        return createClient(config.url, config.anonKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        });
      }).catch((error) => {
        this.clientPromise = null;
        throw error;
      });
    }
    return this.clientPromise;
  }

  initialize(): Promise<void> {
    if (!this.initializePromise) {
      this.initializePromise = this.restore().finally(() => {
        this.initializePromise = null;
      });
    }
    return this.initializePromise;
  }

  private async restore() {
    try {
      const supabase = await this.client();
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      this.setUser(data.session?.user ?? null);
      if (data.session?.user) {
        await this.loadProgress(data.session.user);
        await this.flush();
        this.update({ status: `Conectado como ${data.session.user.email}.` });
      } else {
        this.update({ status: 'Entre ou crie uma conta para guardar seu progresso entre aparelhos.' });
      }
      if (!this.authSubscription) {
        const { data: auth } = supabase.auth.onAuthStateChange((_event, session) => {
          this.setUser(session?.user ?? null);
          if (session?.user) window.setTimeout(() => void this.flush(), 0);
        });
        this.authSubscription = auth.subscription;
      }
    } catch (error) {
      const configured = Boolean(window.FF_SUPABASE_CONFIG?.url || import.meta.env.VITE_SUPABASE_URL);
      this.update({
        configured,
        status: configured
          ? `Não foi possível conectar à conta: ${this.friendly(error)}`
          : 'Conta do Supabase não configurada. O jogo funciona normalmente sem login.',
      });
    }
  }

  async open() {
    await this.initialize();
    if (!this.state.configured) {
      this.update({ status: 'A conta ainda não foi conectada. Configure a URL e a chave pública do Supabase no arquivo supabase-config.js.' });
      return;
    }
    if (!navigator.onLine) {
      this.update({ status: 'Sem internet. A conta fica disponível quando a conexão voltar.' });
      return;
    }
    if (this.user) {
      try {
        await this.loadProgress(this.user);
        this.update({ status: `Conectado como ${this.user.email}.` });
      } catch (error) {
        this.update({ status: `Não foi possível carregar o progresso: ${this.friendly(error)}` });
      }
    }
  }

  async signIn(email: string, password: string) {
    this.update({ status: 'Entrando…' });
    try {
      const supabase = await this.client();
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      this.setUser(data.user);
      await this.loadProgress(data.user);
      this.update({ status: `Conectado como ${data.user.email}.` });
      await this.flush();
    } catch (error) {
      this.update({ status: `Não foi possível entrar: ${this.friendly(error)}` });
      throw error;
    }
  }

  async signUp(email: string, password: string, requestedNickname: string) {
    this.update({ status: 'Criando conta…' });
    try {
      const supabase = await this.client();
      const safeEmail = email.trim();
      const nickname = requestedNickname.trim().slice(0, 32) || safeEmail.split('@')[0].slice(0, 32);
      const { data, error } = await supabase.auth.signUp({
        email: safeEmail,
        password,
        options: { data: { nickname }, emailRedirectTo: `${location.origin}${location.pathname}` },
      });
      if (error) throw error;
      if (!data.session || !data.user) {
        this.update({ status: 'Conta criada. Confirme o e-mail enviado e depois entre.' });
        return;
      }
      this.setUser(data.user);
      await this.loadProgress(data.user);
      this.update({ status: `Conta criada e conectada como ${data.user.email}.` });
    } catch (error) {
      this.update({ status: `Não foi possível criar a conta: ${this.friendly(error)}` });
      throw error;
    }
  }

  async saveNickname(nicknameInput: string) {
    if (!this.user) return;
    const nickname = nicknameInput.trim();
    if (!nickname || nickname.length > 32) return;
    this.update({ status: 'Salvando apelido…' });
    try {
      const supabase = await this.client();
      const { error } = await supabase.rpc('set_family_fighter_nickname', { p_nickname: nickname });
      if (error) throw error;
      await this.loadProgress(this.user);
      this.update({ status: 'Apelido atualizado.' });
    } catch (error) {
      this.update({ status: `Não foi possível salvar o apelido: ${this.friendly(error)}` });
      throw error;
    }
  }

  async signOut() {
    try {
      const supabase = await this.client();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      this.setUser(null);
      this.update({ progress: '', stats: null, status: 'Você saiu da conta. O jogo continua disponível neste aparelho.' });
    } catch (error) {
      this.update({ status: `Não foi possível sair: ${this.friendly(error)}` });
      throw error;
    }
  }

  /** Cliente Supabase compartilhado (o online usa o Realtime dele). Null se não houver configuração. */
  async realtimeClient(): Promise<SupabaseClient | null> {
    try {
      return await this.client();
    } catch {
      return null;
    }
  }

  /** Nome mostrado no online: apelido da conta, senão o apelido local de convidado. */
  displayName(): string {
    return (this.state.nickname || localStorage.getItem('ff-guest-nick') || '').trim();
  }

  async leaderboard(limit = 20): Promise<LeaderboardRow[]> {
    const supabase = await this.client();
    const { data, error } = await supabase.rpc('family_fighter_leaderboard', { p_limit: limit });
    if (error) throw new Error(this.friendly(error));
    return (data ?? []) as LeaderboardRow[];
  }

  async recentMatches(limit = 8): Promise<RecentMatch[]> {
    if (!this.user) return [];
    const supabase = await this.client();
    const { data, error } = await supabase
      .from('family_fighter_match_events')
      .select('outcome, selected_fighter, mode, opponent_fighter, opponent_name, created_at')
      .eq('user_id', this.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(this.friendly(error));
    return (data ?? []) as RecentMatch[];
  }

  async recordMatch(outcome: MatchOutcome, fighterId: FighterId, options: MatchOptions = {}) {
    if (!this.state.configured || !VALID_OUTCOMES.has(outcome) || !VALID_FIGHTERS.has(fighterId)) return;
    if (!this.user) {
      this.update({ syncStatus: 'Entre em Minha Conta para guardar seu histórico de lutas.' });
      return;
    }
    const match: PendingMatch = {
      matchId: options.matchId ?? crypto.randomUUID(),
      userId: this.user.id,
      outcome,
      fighterId,
      mode: options.mode ?? 'cpu',
      opponentFighter: options.opponentFighter && VALID_FIGHTERS.has(options.opponentFighter) ? options.opponentFighter : null,
      opponentName: options.opponentName ? options.opponentName.slice(0, 32) : null,
    };
    this.writeQueue([...this.readQueue(), match]);
    if (!navigator.onLine) {
      this.update({ syncStatus: 'Sem internet: o resultado será enviado quando a conexão voltar.' });
      return;
    }
    this.update({ syncStatus: 'Salvando resultado…' });
    try {
      const supabase = await this.client();
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (data.session?.user.id !== match.userId) {
        this.update({ syncStatus: 'Sessão expirada: entre novamente para enviar o resultado.' });
        return;
      }
      await this.send(match);
      this.writeQueue(this.readQueue().filter((item) => item.matchId !== match.matchId));
      this.update({ syncStatus: 'Resultado salvo na sua conta ✓' });
      await this.flush();
      if (this.user) await this.loadProgress(this.user);
    } catch (error) {
      this.update({ syncStatus: `Resultado guardado neste aparelho para enviar depois (${this.friendly(error)}).` });
    }
  }

  private async loadProgress(user: User) {
    const supabase = await this.client();
    const { data, error } = await supabase
      .from('family_fighter_profiles')
      .select('nickname, selected_fighter, matches_played, wins, losses, draws, online_wins, online_losses, online_draws')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('O perfil não foi criado. Execute supabase/schema.sql no projeto Supabase.');
    const rate = data.matches_played ? Math.round((data.wins / data.matches_played) * 100) : 0;
    this.update({
      nickname: data.nickname,
      stats: {
        nickname: data.nickname,
        selectedFighter: data.selected_fighter as FighterId,
        matchesPlayed: data.matches_played,
        wins: data.wins,
        losses: data.losses,
        draws: data.draws,
        onlineWins: data.online_wins ?? 0,
        onlineLosses: data.online_losses ?? 0,
        onlineDraws: data.online_draws ?? 0,
      },
      progress: `Lutador favorito: ${this.fighterName(data.selected_fighter)}\nLutas: ${data.matches_played} · Vitórias: ${data.wins} · Derrotas: ${data.losses} · Empates: ${data.draws}\nAproveitamento: ${rate}%`,
    });
  }

  private async send(match: PendingMatch) {
    const supabase = await this.client();
    const { error } = await supabase.rpc('record_family_fighter_match_v2', {
      p_match_id: match.matchId,
      p_outcome: match.outcome,
      p_selected_fighter: match.fighterId,
      p_mode: match.mode ?? 'cpu',
      p_opponent_fighter: match.opponentFighter ?? null,
      p_opponent_name: match.opponentName ?? null,
    });
    if (error) throw error;
  }

  private readQueue(): PendingMatch[] {
    try {
      const stored = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      if (!Array.isArray(stored)) return [];
      return stored.filter((match) => match && typeof match.matchId === 'string'
        && typeof match.userId === 'string' && VALID_OUTCOMES.has(match.outcome)
        && VALID_FIGHTERS.has(match.fighterId)).slice(-MAX_QUEUE);
    } catch {
      return [];
    }
  }

  private writeQueue(queue: PendingMatch[]) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
    } catch (error) {
      console.warn('Não foi possível gravar a fila local de partidas.', error);
    }
  }

  private async flush() {
    if (!navigator.onLine || !this.user || this.flushing) return;
    this.flushing = true;
    try {
      let queue = this.readQueue();
      for (const match of queue.filter((item) => item.userId === this.user?.id)) {
        await this.send(match);
        queue = this.readQueue().filter((item) => item.matchId !== match.matchId);
        this.writeQueue(queue);
      }
      if (queue.length < this.readQueue().length) {
        this.update({ syncStatus: 'Partidas pendentes sincronizadas.' });
        if (this.user) await this.loadProgress(this.user);
      }
    } catch (error) {
      this.update({ syncStatus: `Partidas pendentes serão enviadas depois: ${this.friendly(error)}` });
    } finally {
      this.flushing = false;
    }
  }

  private fighterName(id: string) {
    return VALID_FIGHTERS.has(id) ? id.toUpperCase() : 'JURACI';
  }

  private friendly(error: unknown) {
    const message = String((error as { message?: string })?.message || error || 'erro desconhecido');
    if (/invalid login credentials/i.test(message)) return 'e-mail ou senha incorretos.';
    if (/email not confirmed/i.test(message)) return 'confirme o e-mail antes de entrar.';
    if (/already registered/i.test(message)) return 'este e-mail já tem conta. Use Entrar.';
    if (/failed to fetch|network/i.test(message)) return 'falha de rede. Verifique a internet.';
    if (/rate limit/i.test(message)) return 'muitas tentativas seguidas. Espere alguns minutos e tente de novo.';
    if (/password should be/i.test(message)) return 'a senha precisa ter pelo menos 6 caracteres.';
    return message.slice(0, 200);
  }
}

export const accountService = new AccountService();
export { SDK_VERSION };
