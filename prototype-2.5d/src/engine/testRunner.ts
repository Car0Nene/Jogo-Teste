/**
 * === PHASE 5: MULTIPLATAFORMA TESTING ===
 * Automated and manual test cases for performance validation
 * 
 * Usage:
 *   - Browser console: window.__testRunner.runAll()
 *   - Specific test: window.__testRunner.run('test-10-lights')
 */

export interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  fps: { min: number; max: number; avg: number };
  frameTime: { min: number; max: number; avg: number };
  memoryMb: { start: number; end: number; peak: number };
  duration: number;
  notes?: string;
  error?: string;
}

class TestRunner {
  private results: TestResult[] = [];
  private isRunning = false;
  private diagnosticsEnabled = false;

  constructor() {
    // Auto-expose global reference
    (window as any).__testRunner = this;
  }

  /**
   * Run all tests sequentially
   */
  public async runAll(): Promise<void> {
    if (this.isRunning) {
      console.warn('⚠️ Tests already running');
      return;
    }

    this.isRunning = true;
    this.results = [];
    this.diagnosticsEnabled = (window as any).__diag?.enabled;

    console.clear();
    console.log(
      '%c=== FAMÍLIA FIGHTER 2.5D — PERFORMANCE TEST SUITE ===',
      'font-weight: bold; font-size: 14px; color: #2563eb'
    );
    console.log(`Platform: ${this.getPlatformInfo()}`);
    console.log(`Time: ${new Date().toLocaleString()}\n`);

    const tests = [
      this.test10LightHits,
      this.test10HeavyHits,
      this.test10SpecialHits,
      this.test2SimultaneousSpecials,
      this.testProlongedCombat,
      this.testCharacterSwap,
      this.testStageSwap,
      this.testRepeatHitStress,
      this.testMemoryLeakDetection,
      this.testHdTextureWarmup,
    ];

    for (const test of tests) {
      await this.runTest(test.bind(this));
      await this.sleep(500);
    }

    this.printSummary();
    this.isRunning = false;
  }

  /**
   * Test 10 consecutive light attacks
   */
  private async test10LightHits(): Promise<TestResult> {
    return {
      name: '10 Light Attacks',
      status: 'skip', // Requires fight engine active
      fps: { min: 0, max: 0, avg: 0 },
      frameTime: { min: 0, max: 0, avg: 0 },
      memoryMb: { start: 0, end: 0, peak: 0 },
      duration: 0,
      notes: 'Manual test: Press Light(P) 10 times in sequence during active fight',
    };
  }

  /**
   * Test 10 consecutive heavy attacks
   */
  private async test10HeavyHits(): Promise<TestResult> {
    return {
      name: '10 Heavy Attacks',
      status: 'skip',
      fps: { min: 0, max: 0, avg: 0 },
      frameTime: { min: 0, max: 0, avg: 0 },
      memoryMb: { start: 0, end: 0, peak: 0 },
      duration: 0,
      notes: 'Manual test: Press Heavy(H) 10 times in sequence during active fight',
    };
  }

  /**
   * Test 10 consecutive special attacks
   */
  private async test10SpecialHits(): Promise<TestResult> {
    return {
      name: '10 Special Attacks',
      status: 'skip',
      fps: { min: 0, max: 0, avg: 0 },
      frameTime: { min: 0, max: 0, avg: 0 },
      memoryMb: { start: 0, end: 0, peak: 0 },
      duration: 0,
      notes: 'Manual test: Perform 10 special moves in sequence (requires meter)',
    };
  }

  /**
   * Test 2 simultaneous special attacks
   */
  private async test2SimultaneousSpecials(): Promise<TestResult> {
    return {
      name: '2 Simultaneous Specials',
      status: 'skip',
      fps: { min: 0, max: 0, avg: 0 },
      frameTime: { min: 0, max: 0, avg: 0 },
      memoryMb: { start: 0, end: 0, peak: 0 },
      duration: 0,
      notes: 'Manual test: Trigger both players special at same frame (requires 2 controllers/keys)',
    };
  }

  /**
   * Test prolonged combat (60 seconds)
   */
  private async testProlongedCombat(): Promise<TestResult> {
    return {
      name: 'Prolonged Combat (60s)',
      status: 'skip',
      fps: { min: 0, max: 0, avg: 0 },
      frameTime: { min: 0, max: 0, avg: 0 },
      memoryMb: { start: 0, end: 0, peak: 0 },
      duration: 0,
      notes: 'Manual test: Play continuous fight for 60 seconds, let AI fight',
    };
  }

  /**
   * Test character selection swap
   */
  private async testCharacterSwap(): Promise<TestResult> {
    return {
      name: 'Character Selection Swap',
      status: 'skip',
      fps: { min: 0, max: 0, avg: 0 },
      frameTime: { min: 0, max: 0, avg: 0 },
      memoryMb: { start: 0, end: 0, peak: 0 },
      duration: 0,
      notes: 'Manual test: Navigate through all 9 characters in select screen',
    };
  }

  /**
   * Test stage selection swap
   */
  private async testStageSwap(): Promise<TestResult> {
    return {
      name: 'Stage Selection Swap',
      status: 'skip',
      fps: { min: 0, max: 0, avg: 0 },
      frameTime: { min: 0, max: 0, avg: 0 },
      memoryMb: { start: 0, end: 0, peak: 0 },
      duration: 0,
      notes: 'Manual test: Navigate through all 5 stages in select screen',
    };
  }

  /**
   * Test repeated hits for memory leak detection
   */
  private async testRepeatHitStress(): Promise<TestResult> {
    return {
      name: 'Repeat Hit Stress (Memory Leak)',
      status: 'skip',
      fps: { min: 0, max: 0, avg: 0 },
      frameTime: { min: 0, max: 0, avg: 0 },
      memoryMb: { start: 0, end: 0, peak: 0 },
      duration: 0,
      notes: 'Manual test: Spam hits rapidly for 2 minutes, observe memory trend',
    };
  }

  /**
   * Test memory leak detection (3 full rounds)
   */
  private async testMemoryLeakDetection(): Promise<TestResult> {
    return {
      name: 'Memory Leak Detection (3 Rounds)',
      status: 'skip',
      fps: { min: 0, max: 0, avg: 0 },
      frameTime: { min: 0, max: 0, avg: 0 },
      memoryMb: { start: 0, end: 0, peak: 0 },
      duration: 0,
      notes:
        'Manual test: Play 3 complete rounds, end match, repeat 5x. Memory should stabilize after each cycle.',
    };
  }

  /**
   * Test HD texture warmup performance
   */
  private async testHdTextureWarmup(): Promise<TestResult> {
    return {
      name: 'HD Texture Warmup',
      status: 'skip',
      fps: { min: 0, max: 0, avg: 0 },
      frameTime: { min: 0, max: 0, avg: 0 },
      memoryMb: { start: 0, end: 0, peak: 0 },
      duration: 0,
      notes: 'Manual test: Start fight, observe frame time during first 2 seconds (should be smooth)',
    };
  }

  /**
   * Run a single test
   */
  public async run(testName: string): Promise<void> {
    const testMethod = (this as any)[testName] as (() => Promise<TestResult>) | undefined;
    if (!testMethod) {
      console.error(`❌ Test not found: ${testName}`);
      console.log(
        'Available tests:',
        Object.getOwnPropertyNames(TestRunner.prototype)
          .filter(n => n.startsWith('test'))
          .map(n => n.slice(4))
      );
      return;
    }

    this.isRunning = true;
    this.results = [];
    await this.runTest(testMethod.bind(this));
    this.printSummary();
    this.isRunning = false;
  }

  private async runTest(testFn: () => Promise<TestResult>): Promise<void> {
    try {
      const result = await testFn();
      this.results.push(result);
      this.printResult(result);
    } catch (error) {
      console.error(`❌ Test error:`, error);
    }
  }

  private printResult(result: TestResult): void {
    const icon = result.status === 'pass' ? '✅' : result.status === 'skip' ? '⊘' : '❌';
    console.log(
      `${icon} ${result.name.padEnd(30)} | ${result.fps.avg.toFixed(0).padStart(3)} fps | ${result.frameTime.avg.toFixed(2).padStart(6)}ms | ${result.duration.toFixed(1).padStart(5)}s`
    );
    if (result.notes) {
      console.log(`   ℹ️  ${result.notes}`);
    }
    if (result.error) {
      console.log(`   ❌ ${result.error}`);
    }
  }

  private printSummary(): void {
    if (this.results.length === 0) return;

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));

    const passed = this.results.filter(r => r.status === 'pass').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;
    const failed = this.results.filter(r => r.status === 'fail').length;

    console.log(`✅ Passed: ${passed} | ⊘ Skipped: ${skipped} | ❌ Failed: ${failed}`);

    const passedTests = this.results.filter(r => r.status === 'pass');
    if (passedTests.length > 0) {
      const avgFps = passedTests.reduce((sum, r) => sum + r.fps.avg, 0) / passedTests.length;
      const avgFrameTime = passedTests.reduce((sum, r) => sum + r.frameTime.avg, 0) / passedTests.length;
      const totalMemory = passedTests.reduce((sum, r) => sum + (r.memoryMb.peak - r.memoryMb.start), 0);

      console.log('\n📊 Performance Metrics:');
      console.log(`  Average FPS: ${avgFps.toFixed(1)}`);
      console.log(`  Average Frame Time: ${avgFrameTime.toFixed(2)}ms`);
      console.log(`  Total Memory Growth: ${totalMemory.toFixed(1)}MB`);
    }

    console.log('\n💡 To export results: __testRunner.exportResults()');
  }

  public exportResults(): string {
    return JSON.stringify(this.results, null, 2);
  }

  private getPlatformInfo(): string {
    const ua = navigator.userAgent;
    let os = 'Unknown';
    if (ua.includes('Win')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    const gpu = (window as any).__GPU || 'Unknown';
    return `${os} | GPU: ${gpu}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Auto-instantiate
export const testRunner = new TestRunner();

// Global instance
if (typeof window !== 'undefined') {
  (window as any).__testRunner = testRunner;
  console.log(
    '%c[TESTING] Use __testRunner.runAll() to run all tests or __testRunner.run("testName")',
    'color: #3b82f6; font-weight: bold'
  );
}
