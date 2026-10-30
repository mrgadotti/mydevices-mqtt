import { runScript } from './engine';

describe('runScript', () => {
  it('returns the completion value of an expression', () => {
    expect(runScript('1 + 2', {})).toEqual({ ok: true, result: 3 });
  });

  it('exposes the given variables and the standard library', () => {
    expect(runScript('JSON.stringify({a: val})', { val: 5 })).toEqual({ ok: true, result: '{"a":5}' });
    expect(runScript('payload.toUpperCase()', { payload: 'abc' })).toEqual({ ok: true, result: 'ABC' });
  });

  it('returns the value of the last statement', () => {
    expect(runScript('var a = 2; a * 4', {})).toEqual({ ok: true, result: 8 });
  });

  it('is clean: variables created by one run are gone in the next', () => {
    runScript('leaked = 42; var alsoLeaked = 1;', {});
    expect(runScript('typeof leaked', {})).toEqual({ ok: true, result: 'undefined' });
    expect(runScript('typeof alsoLeaked', {})).toEqual({ ok: true, result: 'undefined' });
  });

  it('does not leave the provided variables behind and restores globals it shadowed', () => {
    (globalThis as Record<string, unknown>).event = 'mine';
    runScript('event', { event: { x: 1 } });
    expect((globalThis as Record<string, unknown>).event).toBe('mine');
    delete (globalThis as Record<string, unknown>).event;
    runScript('1', { event: 1 });
    expect('event' in globalThis).toBe(false);
  });

  it('reports syntax and runtime errors', () => {
    const syntax = runScript('if (', {});
    expect(syntax.ok).toBe(false);
    const runtime = runScript('undefinedFunction()', {});
    expect(runtime).toMatchObject({ ok: false });
    expect((runtime as { error: string }).error).toContain('ReferenceError');
    expect(runScript('throw new Error("boom")', {})).toEqual({ ok: false, error: 'Error: boom' });
  });

  it('refuses loops that can never end', () => {
    expect(runScript('while (true) {}', {})).toEqual({ ok: false, error: 'Unbounded loop' });
    expect(runScript('for (;;) {}', {})).toEqual({ ok: false, error: 'Unbounded loop' });
  });

  it('treats an empty script as a no-op', () => {
    expect(runScript('   ', {})).toEqual({ ok: true, result: undefined });
  });
});

describe('runScript cleanup', () => {
  it('does not throw when a script leaves a global that cannot be deleted (Hermes makes eval `var`s non-configurable)', () => {
    const src = "Object.defineProperty(globalThis, 'stuckByScript', { value: 1, configurable: false, writable: true }); 7";
    expect(runScript(src, {})).toEqual({ ok: true, result: 7 });
    expect(runScript('var again = 2; again', {})).toEqual({ ok: true, result: 2 });
  });
});
