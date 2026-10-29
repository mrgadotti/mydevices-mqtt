/** Minimal MQTT 3.1.1 packet codec (no Node or RN dependencies). */

export function utf8(text: string): Uint8Array {
  const out: number[] = [];
  for (const ch of text) {
    let c = ch.codePointAt(0)!;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    else {
      c &= 0x1fffff;
      out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return Uint8Array.from(out);
}

export function fromUtf8(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i++];
    let cp: number;
    if (b < 0x80) cp = b;
    else if (b >= 0xf0 && i + 2 < bytes.length + 0) {
      cp = ((b & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
    } else if (b >= 0xe0) {
      cp = ((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
    } else if (b >= 0xc0) {
      cp = ((b & 0x1f) << 6) | (bytes[i++] & 0x3f);
    } else cp = 0xfffd;
    s += String.fromCodePoint(Number.isNaN(cp) ? 0xfffd : cp);
  }
  return s;
}

export function encodeRemainingLength(n: number): Uint8Array {
  const out: number[] = [];
  do {
    let digit = n % 128;
    n = Math.floor(n / 128);
    if (n > 0) digit |= 0x80;
    out.push(digit);
  } while (n > 0);
  return Uint8Array.from(out);
}

/** Returns null when the length bytes are not all available yet; throws on malformed (>4 bytes). */
export function decodeRemainingLength(buf: Uint8Array, offset: number): { value: number; bytes: number } | null {
  let multiplier = 1;
  let value = 0;
  for (let i = 0; i < 4; i++) {
    if (offset + i >= buf.length) return null;
    const digit = buf[offset + i];
    value += (digit & 0x7f) * multiplier;
    if ((digit & 0x80) === 0) return { value, bytes: i + 1 };
    multiplier *= 128;
  }
  throw new Error('Malformed remaining length');
}

const concat = (parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

const u16 = (n: number): Uint8Array => Uint8Array.from([(n >> 8) & 0xff, n & 0xff]);
const str = (s: string): Uint8Array => {
  const b = utf8(s);
  return concat([u16(b.length), b]);
};

function frame(firstByte: number, body: Uint8Array): Uint8Array {
  return concat([Uint8Array.from([firstByte]), encodeRemainingLength(body.length), body]);
}

export interface ConnectOptions {
  clientId: string;
  keepAlive: number;
  cleanSession: boolean;
  username?: string;
  password?: string;
}

export function encodeConnect(o: ConnectOptions): Uint8Array {
  let flags = o.cleanSession ? 0x02 : 0;
  const payload: Uint8Array[] = [str(o.clientId)];
  if (o.username !== undefined) {
    flags |= 0x80;
    payload.push(str(o.username));
    if (o.password !== undefined) {
      flags |= 0x40;
      payload.push(str(o.password));
    }
  }
  const variable = concat([str('MQTT'), Uint8Array.from([0x04, flags]), u16(o.keepAlive)]);
  return frame(0x10, concat([variable, ...payload]));
}

export function encodeSubscribe(packetId: number, topics: { topic: string; qos: number }[]): Uint8Array {
  const body = concat([u16(packetId), ...topics.flatMap((t) => [str(t.topic), Uint8Array.from([t.qos])])]);
  return frame(0x82, body);
}

export function encodeUnsubscribe(packetId: number, topics: string[]): Uint8Array {
  return frame(0xa2, concat([u16(packetId), ...topics.map(str)]));
}

export interface PublishPacket {
  topic: string;
  payload: Uint8Array;
  qos: number;
  retain: boolean;
  packetId?: number;
  dup?: boolean;
}

export function encodePublish(p: PublishPacket): Uint8Array {
  const first = 0x30 | (p.dup ? 0x08 : 0) | (p.qos << 1) | (p.retain ? 1 : 0);
  const parts = [str(p.topic)];
  if (p.qos > 0) parts.push(u16(p.packetId ?? 0));
  parts.push(p.payload);
  return frame(first, concat(parts));
}

export const encodePubAck = (id: number): Uint8Array => frame(0x40, u16(id));
export const encodePubRec = (id: number): Uint8Array => frame(0x50, u16(id));
export const encodePubRel = (id: number): Uint8Array => frame(0x62, u16(id));
export const encodePubComp = (id: number): Uint8Array => frame(0x70, u16(id));
export const encodePingreq = (): Uint8Array => Uint8Array.from([0xc0, 0x00]);
export const encodeDisconnect = (): Uint8Array => Uint8Array.from([0xe0, 0x00]);

export type Packet =
  | { type: 'connack'; sessionPresent: boolean; returnCode: number }
  | { type: 'suback'; packetId: number; returnCodes: number[] }
  | { type: 'unsuback' | 'puback' | 'pubrec' | 'pubrel' | 'pubcomp'; packetId: number }
  | { type: 'pingresp' }
  | { type: 'publish'; topic: string; payload: Uint8Array; qos: number; retain: boolean; dup: boolean; packetId?: number };

const id16 = (b: Uint8Array): number => (b[0] << 8) | b[1];

function decode(first: number, body: Uint8Array): Packet | null {
  switch (first >> 4) {
    case 2:
      return { type: 'connack', sessionPresent: (body[0] & 1) === 1, returnCode: body[1] };
    case 3: {
      const qos = (first >> 1) & 3;
      const topicLen = id16(body);
      const topic = fromUtf8(body.subarray(2, 2 + topicLen));
      let offset = 2 + topicLen;
      let packetId: number | undefined;
      if (qos > 0) {
        packetId = id16(body.subarray(offset));
        offset += 2;
      }
      const p: Packet = {
        type: 'publish',
        topic,
        payload: body.slice(offset),
        qos,
        retain: (first & 1) === 1,
        dup: (first & 8) === 8,
      };
      if (packetId !== undefined) p.packetId = packetId;
      return p;
    }
    case 4:
      return { type: 'puback', packetId: id16(body) };
    case 5:
      return { type: 'pubrec', packetId: id16(body) };
    case 6:
      return { type: 'pubrel', packetId: id16(body) };
    case 7:
      return { type: 'pubcomp', packetId: id16(body) };
    case 9:
      return { type: 'suback', packetId: id16(body), returnCodes: Array.from(body.subarray(2)) };
    case 11:
      return { type: 'unsuback', packetId: id16(body) };
    case 13:
      return { type: 'pingresp' };
    default:
      return null;
  }
}

/** Incremental parser: push network chunks, receive whole packets. */
export class PacketParser {
  private buf: Uint8Array = new Uint8Array(0);

  constructor(
    private readonly onPacket: (p: Packet) => void,
    private readonly onError: (message: string) => void = () => {},
  ) {}

  push(chunk: Uint8Array): void {
    this.buf = this.buf.length === 0 ? chunk : concat([this.buf, chunk]);
    for (;;) {
      if (this.buf.length < 2) return;
      let len: { value: number; bytes: number } | null;
      try {
        len = decodeRemainingLength(this.buf, 1);
      } catch (e) {
        this.buf = new Uint8Array(0);
        this.onError((e as Error).message);
        return;
      }
      if (len === null) return;
      const total = 1 + len.bytes + len.value;
      if (this.buf.length < total) return;
      const first = this.buf[0];
      const body = this.buf.slice(1 + len.bytes, total);
      this.buf = this.buf.slice(total);
      const packet = decode(first, body);
      if (packet) this.onPacket(packet);
    }
  }
}
