import { extractJsonPath } from './jsonPath';

const ok = (value: string) => ({ ok: true, value });
const err = { ok: false, error: 'JSON path error' };

describe('extractJsonPath', () => {
  it('reads nested keys', () => {
    expect(extractJsonPath('{"level":{"value":42}}', '$.level.value')).toEqual(ok('42'));
  });

  it('reads array indexes', () => {
    expect(extractJsonPath('{"items":["a","b"]}', '$.items[1]')).toEqual(ok('b'));
  });

  it('reads bracket notation keys, including spaces', () => {
    expect(extractJsonPath('{"a b":"x"}', "$['a b']")).toEqual(ok('x'));
    expect(extractJsonPath('{"a b":"x"}', '$["a b"]')).toEqual(ok('x'));
  });

  it('maps null to (null) like the original', () => {
    expect(extractJsonPath('{"x":null}', '$.x')).toEqual(ok('(null)'));
  });

  it('formats lists and maps like Java toString', () => {
    expect(extractJsonPath('{"l":[1,"a",true]}', '$.l')).toEqual(ok('[1, a, true]'));
    expect(extractJsonPath('{"m":{"a":1,"b":"x"}}', '$.m')).toEqual(ok('{a=1, b=x}'));
  });

  it('formats numbers like Java (21.5 stays, 3.0 becomes 3.0 only when written so)', () => {
    expect(extractJsonPath('{"t":21.5}', '$.t')).toEqual(ok('21.5'));
    expect(extractJsonPath('{"t":-3}', '$.t')).toEqual(ok('-3'));
  });

  it('supports wildcard over arrays', () => {
    expect(extractJsonPath('{"l":[{"v":1},{"v":2}]}', '$.l[*].v')).toEqual(ok('[1, 2]'));
  });

  it('returns an error for non-JSON payloads', () => {
    expect(extractJsonPath('not json', '$.a')).toEqual(err);
  });

  it('returns an error for missing keys and bad paths', () => {
    expect(extractJsonPath('{"a":1}', '$.b')).toEqual(err);
    expect(extractJsonPath('{"a":1}', '$.a[')).toEqual(err);
    expect(extractJsonPath('{"a":1}', 'a.b')).toEqual(err);
  });

  it('accepts a top level scalar json', () => {
    expect(extractJsonPath('5', '$')).toEqual(ok('5'));
  });
});
