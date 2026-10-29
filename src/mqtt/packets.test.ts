import {
  decodeRemainingLength,
  encodeConnect,
  encodeDisconnect,
  encodePingreq,
  encodePubAck,
  encodePubComp,
  encodePublish,
  encodePubRec,
  encodeRemainingLength,
  encodeSubscribe,
  encodeUnsubscribe,
  PacketParser,
  utf8,
} from './packets';

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join(' ');

describe('remaining length', () => {
  it('encodes the spec boundary values', () => {
    expect(Array.from(encodeRemainingLength(0))).toEqual([0]);
    expect(Array.from(encodeRemainingLength(127))).toEqual([0x7f]);
    expect(Array.from(encodeRemainingLength(128))).toEqual([0x80, 0x01]);
    expect(Array.from(encodeRemainingLength(321))).toEqual([0xc1, 0x02]);
    expect(Array.from(encodeRemainingLength(16383))).toEqual([0xff, 0x7f]);
    expect(Array.from(encodeRemainingLength(16384))).toEqual([0x80, 0x80, 0x01]);
  });
  it('decodes what it encodes and reports incomplete input', () => {
    for (const n of [0, 1, 127, 128, 321, 16384, 2097151]) {
      expect(decodeRemainingLength(encodeRemainingLength(n), 0)).toEqual({ value: n, bytes: encodeRemainingLength(n).length });
    }
    expect(decodeRemainingLength(new Uint8Array([0x80]), 0)).toBeNull();
  });
});

describe('encoders', () => {
  it('CONNECT without credentials', () => {
    expect(hex(encodeConnect({ clientId: 'a', keepAlive: 30, cleanSession: true }))).toBe(
      '10 0d 00 04 4d 51 54 54 04 02 00 1e 00 01 61',
    );
  });
  it('CONNECT with user name and password', () => {
    const b = encodeConnect({ clientId: 'a', keepAlive: 30, cleanSession: true, username: 'u', password: 'p' });
    expect(hex(b)).toBe('10 13 00 04 4d 51 54 54 04 c2 00 1e 00 01 61 00 01 75 00 01 70');
  });
  it('SUBSCRIBE', () => {
    expect(hex(encodeSubscribe(1, [{ topic: 'a/b', qos: 1 }]))).toBe('82 08 00 01 00 03 61 2f 62 01');
  });
  it('UNSUBSCRIBE', () => {
    expect(hex(encodeUnsubscribe(2, ['a/b']))).toBe('a2 07 00 02 00 03 61 2f 62');
  });
  it('PUBLISH qos 0', () => {
    expect(hex(encodePublish({ topic: 't', payload: utf8('hi'), qos: 0, retain: false }))).toBe('30 05 00 01 74 68 69');
  });
  it('PUBLISH qos 1 retained with a packet id', () => {
    expect(hex(encodePublish({ topic: 't', payload: utf8('h'), qos: 1, retain: true, packetId: 7 }))).toBe(
      '33 06 00 01 74 00 07 68',
    );
  });
  it('acks, ping and disconnect', () => {
    expect(hex(encodePubAck(7))).toBe('40 02 00 07');
    expect(hex(encodePubRec(7))).toBe('50 02 00 07');
    expect(hex(encodePubComp(7))).toBe('70 02 00 07');
    expect(hex(encodePingreq())).toBe('c0 00');
    expect(hex(encodeDisconnect())).toBe('e0 00');
  });
  it('encodes non-ASCII topics and payloads as UTF-8', () => {
    expect(hex(encodePublish({ topic: 'ç', payload: utf8('é'), qos: 0, retain: false }))).toBe('30 06 00 02 c3 a7 c3 a9');
  });
});

describe('PacketParser', () => {
  const collect = () => {
    const out: unknown[] = [];
    return { out, parser: new PacketParser((p) => out.push(p)) };
  };

  it('parses CONNACK', () => {
    const { out, parser } = collect();
    parser.push(new Uint8Array([0x20, 0x02, 0x00, 0x05]));
    expect(out).toEqual([{ type: 'connack', sessionPresent: false, returnCode: 5 }]);
  });

  it('parses SUBACK and PUBACK/PUBREC/PUBREL/PUBCOMP/UNSUBACK/PINGRESP', () => {
    const { out, parser } = collect();
    parser.push(new Uint8Array([0x90, 0x03, 0x00, 0x01, 0x01]));
    parser.push(new Uint8Array([0x40, 0x02, 0x00, 0x07, 0x50, 0x02, 0x00, 0x08, 0x62, 0x02, 0x00, 0x09]));
    parser.push(new Uint8Array([0x70, 0x02, 0x00, 0x0a, 0xb0, 0x02, 0x00, 0x0b, 0xd0, 0x00]));
    expect(out).toEqual([
      { type: 'suback', packetId: 1, returnCodes: [1] },
      { type: 'puback', packetId: 7 },
      { type: 'pubrec', packetId: 8 },
      { type: 'pubrel', packetId: 9 },
      { type: 'pubcomp', packetId: 10 },
      { type: 'unsuback', packetId: 11 },
      { type: 'pingresp' },
    ]);
  });

  it('parses incoming PUBLISH with and without packet id', () => {
    const { out, parser } = collect();
    parser.push(new Uint8Array([0x30, 0x05, 0x00, 0x01, 0x74, 0x68, 0x69]));
    parser.push(new Uint8Array([0x3b, 0x06, 0x00, 0x01, 0x74, 0x00, 0x07, 0x68]));
    expect(out).toEqual([
      { type: 'publish', topic: 't', payload: utf8('hi'), qos: 0, retain: false, dup: false },
      { type: 'publish', topic: 't', payload: utf8('h'), qos: 1, retain: true, dup: true, packetId: 7 },
    ]);
  });

  it('reassembles a packet delivered byte by byte and several packets in one chunk', () => {
    const { out, parser } = collect();
    const pub = encodePublish({ topic: 'a/b', payload: new Uint8Array(200).fill(65), qos: 0, retain: false });
    for (const byte of pub) parser.push(new Uint8Array([byte]));
    expect(out).toHaveLength(1);
    const two = new Uint8Array([0xd0, 0x00, 0xd0, 0x00]);
    parser.push(two);
    expect(out).toHaveLength(3);
  });

  it('reports malformed packets instead of looping', () => {
    const errors: string[] = [];
    const parser = new PacketParser(() => {}, (e) => errors.push(e));
    parser.push(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0x01]));
    expect(errors.length).toBeGreaterThan(0);
  });
});
