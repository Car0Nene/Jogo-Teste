/**
 * Diagnostic & Performance Monitoring System
 * Collects FPS, frame time, effect counts, memory, and GPU metrics
 * Non-intrusive: disabled in production, overhead < 1% when active
 */

export interface DiagnosticSnapshot {
  timestamp: number;
  fps: number;
  frameTimeMs: number;
  logicTimeMs: number;
  renderTimeMs: number;
  activeEffects: number;
  activeSparks: number;
  activeBursts: number;
  activeVoices: number;
  activeProjectiles: number;
  memoryMb: number;
  texturesCount: number;
  materialsCount: number;
  meshesCount: number;
  combatHitCount: number;
  hitstopTimer: number;
}

export class DiagnosticsEngine {
  private enabled = false;
  private snapshots: DiagnosticSnapshot[] = [];
  private maxSnapshots = 1200; // ~20 seconds at 60fps

  // Frame timing
  private frameStartTime = 0;
  private logicEndTime = 0;
  private renderEndTime = 0;
  private frameCount = 0;
  private fpsTickTime = 0;
  private currentFps = 60;

  // Accumulators
  private totalFrameMs = 0;
  private totalLogicMs = 0;
  private totalRenderMs = 0;
  private frameCounter = 0;

  constructor(private enabled_: boolean = false) {
    this.enabled = enabled_;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled) {
      this.snapshots = [];
      this.frameCount = 0;
      this.totalFrameMs = 0;
      this.totalLogicMs = 0;
      this.totalRenderMs = 0;
      this.frameCounter = 0;
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Call at the start of each frame
   */
  public markFrameStart() {
    if (!this.enabled) return;
    this.frameStartTime = performance.now();
  }

  /**
   * Call after logic update, before render
   */
  public markLogicEnd() {
    if (!this.enabled) return;
    this.logicEndTime = performance.now();
  }

  /**
   * Call after render completes
   */
  public markRenderEnd() {
    if (!this.enabled) return;
    this.renderEndTime = performance.now();

    const frameTimeMs = this.renderEndTime - this.frameStartTime;
    const logicTimeMs = this.logicEndTime - this.frameStartTime;
    const renderTimeMs = this.renderEndTime - this.logicEndTime;

    this.totalFrameMs += frameTimeMs;
    this.totalLogicMs += logicTimeMs;
    this.totalRenderMs += renderTimeMs;
    this.frameCounter++;

    // Update FPS every 10 frames
    this.fpsTickTime += frameTimeMs;
    if (this.frameCounter % 10 === 0) {
      const avgFrameTime = this.totalFrameMs / this.frameCounter;
      this.currentFps = Math.round(1000 / avgFrameTime);
    }
  }

  /**
   * Record a snapshot with current state
   */
  public recordSnapshot(state: Omit<DiagnosticSnapshot, 'timestamp' | 'fps' | 'frameTimeMs' | 'logicTimeMs' | 'renderTimeMs'>) {
    if (!this.enabled) return;

    const frameTimeMs = this.frameCounter > 0 ? this.totalFrameMs / this.frameCounter : 0;
    const logicTimeMs = this.frameCounter > 0 ? this.totalLogicMs / this.frameCounter : 0;
    const renderTimeMs = this.frameCounter > 0 ? this.totalRenderMs / this.frameCounter : 0;

    const snapshot: DiagnosticSnapshot = {
      timestamp: performance.now(),
      fps: this.currentFps,
      frameTimeMs: Math.round(frameTimeMs * 100) / 100,
      logicTimeMs: Math.round(logicTimeMs * 100) / 100,
      renderTimeMs: Math.round(renderTimeMs * 100) / 100,
      ...state,
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
  }

  /**
   * Get all recorded snapshots
   */
  public getSnapshots(): DiagnosticSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get latest snapshot
   */
  public getLatestSnapshot(): DiagnosticSnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  /**
   * Get average metrics over last N frames
   */
  public getAverageMetrics(frameCount = 60): Partial<DiagnosticSnapshot> {
    if (this.snapshots.length === 0) return {};

    const start = Math.max(0, this.snapshots.length - frameCount);
    const frames = this.snapshots.slice(start);

    const avg = (key: keyof DiagnosticSnapshot) => {
      const sum = frames.reduce((acc, s) => acc + (s[key] as number), 0);
      return Math.round((sum / frames.length) * 100) / 100;
    };

    return {
      fps: Math.round(avg('fps')),
      frameTimeMs: avg('frameTimeMs'),
      logicTimeMs: avg('logicTimeMs'),
      renderTimeMs: avg('renderTimeMs'),
      activeEffects: Math.round(avg('activeEffects')),
      activeSparks: Math.round(avg('activeSparks')),
      activeBursts: Math.round(avg('activeBursts')),
      activeVoices: Math.round(avg('activeVoices')),
      activeProjectiles: Math.round(avg('activeProjectiles')),
      memoryMb: Math.round(avg('memoryMb') * 10) / 10,
      combatHitCount: Math.round(avg('combatHitCount')),
      hitstopTimer: Math.round(avg('hitstopTimer') * 100) / 100,
    };
  }

  /**
   * Get peak metrics (worst/highest values)
   */
  public getPeakMetrics(frameCount = 60): Partial<DiagnosticSnapshot> {
    if (this.snapshots.length === 0) return {};

    const start = Math.max(0, this.snapshots.length - frameCount);
    const frames = this.snapshots.slice(start);

    return {
      fps: Math.min(...frames.map(s => s.fps)),
      frameTimeMs: Math.max(...frames.map(s => s.frameTimeMs)),
      logicTimeMs: Math.max(...frames.map(s => s.logicTimeMs)),
      renderTimeMs: Math.max(...frames.map(s => s.renderTimeMs)),
      activeEffects: Math.max(...frames.map(s => s.activeEffects)),
      activeSparks: Math.max(...frames.map(s => s.activeSparks)),
      activeBursts: Math.max(...frames.map(s => s.activeBursts)),
      activeVoices: Math.max(...frames.map(s => s.activeVoices)),
      activeProjectiles: Math.max(...frames.map(s => s.activeProjectiles)),
      memoryMb: Math.max(...frames.map(s => s.memoryMb)),
      combatHitCount: Math.max(...frames.map(s => s.combatHitCount)),
      hitstopTimer: Math.max(...frames.map(s => s.hitstopTimer)),
    };
  }

  /**
   * Export metrics to JSON for analysis
   */
  public exportToJson(): string {
    return JSON.stringify({
      enabled: this.enabled,
      frameCount: this.frameCounter,
      snapshots: this.snapshots,
      average: this.getAverageMetrics(this.snapshots.length),
      peak: this.getPeakMetrics(this.snapshots.length),
    }, null, 2);
  }

  /**
   * Log summary to console
   */
  public logSummary() {
    if (!this.enabled) {
      console.log('Diagnostics disabled');
      return;
    }

    const avg = this.getAverageMetrics(this.snapshots.length);
    const peak = this.getPeakMetrics(this.snapshots.length);

    console.group('%c📊 PERFORMANCE SUMMARY', 'font-weight: bold; color: #0066ff; font-size: 14px;');
    console.table({
      'Avg FPS': avg.fps,
      'Min FPS': peak.fps,
      'Avg Frame': `${avg.frameTimeMs}ms`,
      'Peak Frame': `${peak.frameTimeMs}ms`,
      'Avg Logic': `${avg.logicTimeMs}ms`,
      'Peak Logic': `${peak.logicTimeMs}ms`,
      'Avg Render': `${avg.renderTimeMs}ms`,
      'Peak Render': `${peak.renderTimeMs}ms`,
      'Peak Effects': peak.activeEffects,
      'Peak Sparks': peak.activeSparks,
      'Peak Bursts': peak.activeBursts,
      'Peak Voices': peak.activeVoices,
      'Peak Projectiles': peak.activeProjectiles,
      'Peak Memory': `${peak.memoryMb}MB`,
    });
    console.groupEnd();
  }

  /**
   * Detect performance issues
   */
  public detectIssues(): string[] {
    const issues: string[] = [];
    const avg = this.getAverageMetrics(this.snapshots.length);
    const peak = this.getPeakMetrics(this.snapshots.length);

    if ((peak.fps || 0) < 30) {
      issues.push(`⚠️ Frame rate drops below 30 FPS (minimum: ${peak.fps})`);
    }
    if ((peak.frameTimeMs || 0) > 50) {
      issues.push(`⚠️ Frame time exceeds 50ms (peak: ${peak.frameTimeMs}ms)`);
    }
    if ((peak.activeEffects || 0) > 50) {
      issues.push(`⚠️ Too many active effects (peak: ${peak.activeEffects})`);
    }
    if ((peak.activeSparks || 0) > 100) {
      issues.push(`⚠️ Particle memory leak detected (peak sparks: ${peak.activeSparks})`);
    }
    if ((peak.activeVoices || 0) > 5) {
      issues.push(`⚠️ Audio leak detected (peak voices: ${peak.activeVoices})`);
    }

    return issues;
  }
}

// Global instance
export const diagnostics = new DiagnosticsEngine(false);

// Enable via console: window.__diag.setEnabled(true)
if (typeof window !== 'undefined') {
  (window as any).__diag = diagnostics;
}
