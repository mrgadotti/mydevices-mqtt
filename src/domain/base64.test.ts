import { fromBase64, toBase64 } from './base64';

describe('toBase64', () => {
  it('matches the RFC 4648 vectors', () => {
    const enc = (s: string) => toBase64(Uint8Array.from(Buffer.from(s, 'latin1')));
    expect(enc('')).toBe('');
    expect(enc('f')).toBe('Zg==');
    expect(enc('fo')).toBe('Zm8=');
    expect(enc('foo')).toBe('Zm9v');
    expect(enc('foob')).toBe('Zm9vYg==');
    expect(enc('fooba')).toBe('Zm9vYmE=');
    expect(enc('foobar')).toBe('Zm9vYmFy');
  });
  it('handles all byte values', () => {
    const all = Uint8Array.from({ length: 256 }, (_, i) => i);
    expect(toBase64(all)).toBe(Buffer.from(all).toString('base64'));
  });
});

describe('fromBase64', () => {
  it('inverts toBase64 for every length', () => {
    for (let n = 0; n < 8; n++) {
      const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 37 + 200) & 255);
      expect(Array.from(fromBase64(toBase64(bytes)))).toEqual(Array.from(bytes));
    }
  });
  it('rejects invalid characters', () => {
    expect(() => fromBase64('a$b=')).toThrow();
  });
});
