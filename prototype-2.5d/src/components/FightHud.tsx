import React from 'react';
import { Volume2, VolumeX, Pause } from 'lucide-react';
import { FIGHTERS } from '../data/fighters';
import { DEFAULT_KEY_BINDINGS, formatKeyCode, HudScale, Player1KeyBindings } from '../data/settings';
import { GameMode, HudFighterSnapshot, HudSnapshot } from '../engine/GameEngine';
import { FighterPortrait } from './FighterBadgeSvg';
import { DanielVictoryScene } from './DanielVictoryScene';
import { TouchControls } from './TouchControls';
import { usePlatform } from '../platform/platform';

interface FightHudProps {
  hud: HudSnapshot;
  gameMode: GameMode;
  muted: boolean;
  hudScale?: HudScale;
  keyBindings?: Player1KeyBindings;
  touchScale?: number;
  touchOpacity?: number;
  touchLefty?: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onSkipIntro: () => void;
  onVirtualHold: (player: 0 | 1, action: string, active: boolean) => void;
  onVirtualPress: (player: 0 | 1, action: 'light' | 'heavy' | 'special' | 'subSpecial' | 'jump') => void;
  onRematch: () => void;
  onBackToSelect: () => void;
}


/** Faixa do especial: retrato grande, nome do lutador e do golpe, cruzando a tela. */
function SuperCutin({ c }: { c: NonNullable<HudSnapshot['superCutin']> }) {
  const spec = FIGHTERS[c.fighterId];
  const right = c.slot === 'p2';
  return (
    <div
      className={`ff-super ${c.full ? 'is-full' : 'is-sub'} ${right ? 'from-right' : 'from-left'}`}
      style={{ ['--ff-accent' as string]: spec.accentHex }}
      aria-live="polite"
    >
      {c.full && <div className="ff-super-dim" />}
      <div className="ff-super-band">
        <img className="ff-super-portrait" src={spec.portraitUrl} alt="" draggable={false} />
        <div className="ff-super-text">
          <div className="ff-super-who">{c.name}</div>
          <div className="ff-super-move">{c.move}</div>
        </div>
      </div>
    </div>
  );
}

function FighterMeterBlock({
  f,
  align,
  compact = false,
}: {
  f: HudFighterSnapshot;
  align: 'left' | 'right';
  compact?: boolean;
}) {
  const spec = FIGHTERS[f.id];
  const hpPct = Math.max(0, Math.min(100, (f.hp / f.maxHp) * 100));
  const trailPct = Math.max(hpPct, Math.min(100, (f.trailHp / f.maxHp) * 100));
  const isRight = align === 'right';

  return (
    <div className={`ff-meter-block flex-1 min-w-0 flex flex-col ${compact ? 'gap-1' : 'gap-1.5'} ${isRight ? 'items-end' : 'items-start'}`}>
      {/* Name, rounds & form */}
      <div className={`w-full flex items-center justify-between gap-2 ${isRight ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-2.5 ${isRight ? 'flex-row-reverse' : ''}`}>
          <FighterPortrait id={f.id} size={compact ? 'sm' : 'md'} />
          <div className={isRight ? 'text-right' : 'text-left'}>
            <div className={`font-display font-extrabold tracking-wide text-white leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] truncate ${compact ? 'text-base' : 'text-xl'}`}>
              {f.name}
            </div>
            {f.formLabel ? (
              <div className="text-[11px] font-semibold text-amber-300 mt-0.5 tabular-nums">
                {f.formLabel} · {f.formTimeLeft}s
              </div>
            ) : compact ? null : (
              <div className="text-[11px] text-stone-300/80 mt-0.5">{spec.roleTitle}</div>
            )}
          </div>
        </div>

        {/* Round pips */}
        <div className="flex items-center gap-1.5">
          {[0, 1].map((idx) => (
            <span
              key={idx}
              className={`w-3.5 h-3.5 rounded-sm border transition-colors ${
                f.roundsWon > idx
                  ? 'bg-amber-400 border-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.7)]'
                  : 'bg-stone-900/80 border-white/25'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Health bar with trailing damage */}
      <div className={`w-full ${compact ? 'h-3.5' : 'h-5'} bg-stone-950/90 border border-white/20 rounded-sm overflow-hidden relative shadow-[0_3px_10px_rgba(0,0,0,0.6)]`}>
        <div
          className={`absolute top-0 bottom-0 bg-red-500/80 transition-all duration-150 ${
            isRight ? 'right-0' : 'left-0'
          }`}
          style={{ width: `${trailPct}%` }}
        />
        <div
          className={`absolute top-0 bottom-0 transition-all duration-75 ${
            hpPct > 30
              ? 'bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500'
              : 'bg-gradient-to-b from-rose-400 via-red-500 to-red-700'
          } ${isRight ? 'right-0' : 'left-0'}`}
          style={{ width: `${hpPct}%` }}
        />
        <span
          className={`absolute top-1/2 -translate-y-1/2 ${compact ? 'text-[10px]' : 'text-[11px]'} font-mono-num font-bold text-stone-950/90 px-2 ${
            isRight ? 'left-0' : 'right-0'
          }`}
        >
          {f.hp}
        </span>
      </div>

      {/* Special Meter */}
      <div className={`w-[78%] flex items-center gap-2 ${isRight ? 'flex-row-reverse' : ''}`}>
        <div className={`flex-1 ${compact ? 'h-2' : 'h-2.5'} bg-stone-950/90 border border-white/15 rounded-sm overflow-hidden relative`}>
          <div
            className={`h-full transition-all duration-100 ${
              f.meter >= 100
                ? 'bg-gradient-to-r from-emerald-400 via-cyan-300 to-amber-300'
                : f.meter >= 50
                ? 'bg-sky-400'
                : 'bg-stone-500'
            } ${isRight ? 'ml-auto' : ''}`}
            style={{ width: `${f.meter}%` }}
          />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30" />
        </div>
        <span className="font-mono-num text-[11px] font-bold text-stone-200 tabular-nums w-9 text-center">
          {f.meter}%
        </span>
      </div>

      {/* Combo & Bark */}
      {f.comboCount >= 2 && (
        <div className={`font-display font-extrabold italic ${compact ? 'text-xl' : 'text-2xl'} text-amber-300 drop-shadow-[0_3px_8px_rgba(0,0,0,0.9)]`}>
          {f.comboCount} HITS!
        </div>
      )}
      {f.bark && (
        <div className={`bg-stone-950/90 border border-amber-300/40 text-amber-100 text-xs font-semibold px-3 py-1.5 rounded-md shadow-md ${compact ? 'max-w-[180px]' : 'max-w-[260px]'}`}>
          “{f.bark}”
        </div>
      )}
    </div>
  );
}

/** Barra de comandos do computador: teclas atuais (ou botões do controle) e atalhos clicáveis. */
function DesktopCommandBar({
  hud,
  keyBindings,
  inputMode,
  onVirtualHold,
  onVirtualPress,
}: {
  hud: HudSnapshot;
  keyBindings: Player1KeyBindings;
  inputMode: string;
  onVirtualHold: FightHudProps['onVirtualHold'];
  onVirtualPress: FightHudProps['onVirtualPress'];
}) {
  const k = (code: string) => formatKeyCode(code);
  const pad = inputMode === 'gamepad';
  const keys: Array<[string[], string]> = pad
    ? [[['◀', '▶'], 'Mover'], [['B'], 'Pular'], [['▼'], 'Agachar'], [['A'], 'Leve'], [['X'], 'Forte'], [['Y'], 'Especial'], [['▼', 'Y'], 'Sub'], [['LB'], 'Defesa']]
    : [
        [[k(keyBindings.left), k(keyBindings.right)], 'Mover'],
        [[k(keyBindings.up)], 'Pular'],
        [[k(keyBindings.down)], 'Agachar'],
        [[k(keyBindings.light)], 'Leve'],
        [[k(keyBindings.heavy)], 'Forte'],
        [[k(keyBindings.special)], 'Especial'],
        [[k(keyBindings.down), k(keyBindings.special)], 'Sub'],
        [[k(keyBindings.guard)], 'Defesa'],
      ];
  // golpe cinematográfico: frente + Leve
  const GAG_HINT: Record<string, string> = { daniel: 'Bundada', pedro: 'Cigarro', juraci: 'Chinelo', carlos: 'Pizza', franciely: 'Conta até 3', gabi: 'Selfie', paula: 'Panela', tainara: 'Arroz', davi: 'Lag' };
  const finLabel = GAG_HINT[hud.p1.id] ?? null;
  if (finLabel) keys.push([pad ? ['▶', 'A'] : [k(keyBindings.right), k(keyBindings.light)], finLabel]);
  const hold = (action: string) => ({
    onPointerDown: () => onVirtualHold(0, action, true),
    onPointerUp: () => onVirtualHold(0, action, false),
    onPointerCancel: () => onVirtualHold(0, action, false),
    onPointerLeave: () => onVirtualHold(0, action, false),
  });
  const btn = 'ff-desk-btn';
  return (
    <div className="ff-desktop-bar pointer-events-auto">
      <div className="ff-desk-group" aria-label="Movimento (mouse)">
        <button type="button" aria-label="Esquerda" className={btn} {...hold('left')}>◀</button>
        <button type="button" aria-label="Pular" className={btn} onClick={() => onVirtualPress(0, 'jump')}>▲</button>
        <button type="button" aria-label="Agachar" className={btn} {...hold('down')}>▼</button>
        <button type="button" aria-label="Direita" className={btn} {...hold('right')}>▶</button>
      </div>
      <ul className="ff-desk-legend" aria-label={pad ? 'Comandos do controle' : 'Comandos do teclado'}>
        {keys.map(([caps, label]) => (
          <li key={label}>
            {caps.map((c, i) => <kbd key={i}>{c}</kbd>)}
            <span>{label}</span>
          </li>
        ))}
      </ul>
      <div className="ff-desk-group" aria-label="Golpes (mouse)">
        <button type="button" className={`${btn} ff-desk-light`} onClick={() => onVirtualPress(0, 'light')}>Leve ({k(keyBindings.light)})</button>
        <button type="button" className={`${btn} ff-desk-heavy`} onClick={() => onVirtualPress(0, 'heavy')}>Forte ({k(keyBindings.heavy)})</button>
        <button type="button" className={`${btn} ff-desk-special`} disabled={hud.p1.meter < (hud.p1.id === 'davi' ? 100 : 50)} onClick={() => onVirtualPress(0, 'special')}>Especial ({k(keyBindings.special)})</button>
        {hud.p1.id === 'davi' && (
          <button type="button" className={btn} disabled={hud.p1.meter < 50} onClick={() => onVirtualPress(0, 'subSpecial')}>Transformação (↓+{k(keyBindings.special)})</button>
        )}
        <button type="button" className={btn} {...hold('guard')}>Defesa ({k(keyBindings.guard)})</button>
      </div>
    </div>
  );
}

export function FightHud({
  hud,
  gameMode,
  muted,
  hudScale = 1,
  keyBindings = DEFAULT_KEY_BINDINGS,
  touchScale = 1,
  touchOpacity = 0.92,
  touchLefty = false,
  onToggleMute,
  onPause,
  onSkipIntro,
  onVirtualHold,
  onVirtualPress,
  onRematch,
  onBackToSelect,
}: FightHudProps) {
  const pf = usePlatform();
  const compact = pf.profile.hud === 'compact';
  // controles de toque aparecem quando o jogador está tocando; somem com teclado/controle
  const showTouch = pf.inputMode === 'touch';
  const winnerId = hud.winnerIndex === 0 ? hud.p1.id : hud.winnerIndex === 1 ? hud.p2.id : null;
  const utilBtn = compact || pf.profile.ui === 'touch'
    ? 'w-11 h-11 rounded-md bg-stone-950/85 border border-white/15 flex items-center justify-center text-stone-200 cursor-pointer'
    : 'w-8 h-8 rounded-md bg-stone-950/85 border border-white/15 hover:border-amber-300/60 flex items-center justify-center text-stone-200 transition-colors cursor-pointer';

  return (
    <div
      className={`ff-hud-controls fixed inset-0 z-20 pointer-events-none flex flex-col justify-between origin-center ${compact ? 'is-compact' : ''} ${showTouch ? 'has-touch' : ''}`}
      data-hud={compact ? 'compact' : 'full'}
      style={hudScale !== 1 ? { '--hud-user-scale': hudScale } as React.CSSProperties : undefined}
    >
      {/* Placar: vida, especial, rounds e cronômetro */}
      <div className="ff-hud-top w-full mx-auto flex items-start justify-between gap-3 md:gap-6">
        <FighterMeterBlock f={hud.p1} align="left" compact={compact} />

        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <div className={`bg-stone-950/90 border border-amber-300/30 rounded-md text-center shadow-lg ${compact ? 'px-2.5 py-1 min-w-[58px]' : 'px-4 py-1.5 min-w-[82px]'}`}>
            <div className="text-[10px] font-semibold tracking-wider text-amber-300/90 uppercase">
              {gameMode === 'training' ? 'Treino' : compact ? `R${hud.roundNumber}` : `Round ${hud.roundNumber}`}
            </div>
            <div className={`font-mono-num font-bold text-white leading-tight ${compact ? 'text-2xl' : 'text-2xl md:text-3xl'}`}>
              {gameMode === 'training' ? '∞' : String(hud.timer).padStart(2, '0')}
            </div>
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button type="button" onClick={onToggleMute} aria-label={muted ? 'Ativar som' : 'Silenciar'} className={utilBtn}>
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button type="button" onClick={onPause} aria-label="Pausar" className={utilBtn}>
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>

        <FighterMeterBlock f={hud.p2} align="right" compact={compact} />
      </div>

      {hud.flashKey > 0 && <div key={hud.flashKey} className="ff-photo-flash" aria-hidden="true" />}
      {hud.cinematic && (
        <div className="ff-cine-bars" aria-hidden="true">
          <i />
          <i />
        </div>
      )}
      {hud.superCutin && <SuperCutin key={hud.superCutin.key} c={hud.superCutin} />}

      {/* Anúncios (banner, fala de abertura, fim de luta) */}
      <div className="ff-hud-center flex-1 flex flex-col items-center justify-center min-h-0">
        {hud.phase === 'intro' && hud.introLine && (
          <div className="ff-intro-line pointer-events-auto bg-stone-950/92 border border-amber-300/40 rounded-lg px-5 py-3.5 max-w-xl w-full shadow-2xl animate-banner-pop flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold tracking-wide text-amber-300">{hud.introLine.name}</div>
              <div className="text-sm md:text-base font-medium text-stone-100 mt-0.5">“{hud.introLine.text}”</div>
            </div>
            <button
              type="button"
              onClick={onSkipIntro}
              className="px-3 py-1.5 min-h-[40px] rounded-md bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
            >
              Pular
            </button>
          </div>
        )}

        {(hud.phase === 'banner' || hud.phase === 'ko' || (hud.phase === 'fighting' && hud.bannerText)) && (
          <div className="animate-banner-pop text-center">
            <div className="ff-banner-text font-display font-extrabold italic tracking-wider text-amber-300 drop-shadow-[0_6px_18px_rgba(0,0,0,0.95)]">
              {hud.bannerText}
            </div>
          </div>
        )}

        {hud.phase === 'matchOver' && (
          <div className="ff-match-over pointer-events-auto bg-stone-950/95 border border-amber-400/50 rounded-xl px-4 py-4 text-center shadow-2xl animate-banner-pop max-w-2xl w-full flex flex-col items-center sm:px-8 sm:py-6">
            {winnerId === 'daniel' ? (
              <DanielVictoryScene />
            ) : winnerId ? (
              <FighterPortrait id={winnerId} size="xl" className="mb-3" />
            ) : null}
            <div className="text-xs font-semibold text-amber-300 tracking-wider uppercase">Fim da Luta</div>
            <div className="font-display font-extrabold italic text-4xl md:text-5xl text-white mt-1">{hud.bannerText}</div>
            <p className="text-xs text-stone-300 mt-2">
              {hud.winnerIndex === 0 ? FIGHTERS[hud.p1.id].quote : FIGHTERS[hud.p2.id].quote}
            </p>
            <div className="flex items-center justify-center gap-3 mt-5">
              <button type="button" onClick={onRematch} className="px-5 py-2.5 min-h-[44px] rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-sm transition-colors cursor-pointer">
                Revanche
              </button>
              <button type="button" onClick={onBackToSelect} className="px-5 py-2.5 min-h-[44px] rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-100 border border-white/15 font-semibold text-sm transition-colors cursor-pointer">
                Trocar Lutadores
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comandos: barra de teclado/mouse no PC; controles de toque no celular/tablet */}
      {showTouch ? (
        hud.phase !== 'matchOver' && (
          <TouchControls
            meter={hud.p1.meter}
            specialCost={hud.p1.id === 'davi' ? 100 : 50}
            scale={touchScale * pf.profile.touchScale}
            opacity={touchOpacity}
            lefty={touchLefty}
            onHold={(action, active) => onVirtualHold(0, action, active)}
            onPress={(action) => onVirtualPress(0, action)}
          />
        )
      ) : (
        <DesktopCommandBar
          hud={hud}
          keyBindings={keyBindings}
          inputMode={pf.inputMode}
          onVirtualHold={onVirtualHold}
          onVirtualPress={onVirtualPress}
        />
      )}
    </div>
  );
}
