import { Buffer } from 'buffer';
import { Duplex } from 'readable-stream';
import type { Transport, TransportFactory } from './transport';

/**
 * Duplex stream over one of our transports (react-native-tcp-socket, node sockets or WebSocket),
 * which is what MQTT.js expects from a custom stream builder. Writes made before the transport
 * opens are held back until it does.
 */
export function transportStream(factory: TransportFactory): Duplex {
  let transport: Transport | null = null;
  let opened = false;
  let pending: (() => void) | null = null;
  const stream = new Duplex({
    read() {},
    write(chunk: Uint8Array, _encoding, cb) {
      const go = () => {
        transport?.send(chunk);
        cb();
      };
      if (opened) go();
      else pending = go;
    },
    final(cb) {
      transport?.close();
      cb();
    },
    destroy(err, cb) {
      transport?.close();
      cb(err);
    },
  });
  transport = factory({
    onOpen: () => {
      opened = true;
      stream.emit('connect');
      pending?.();
      pending = null;
    },
    onData: (chunk) => stream.push(Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength)),
    onClose: (error) => {
      if (error) stream.destroy(new Error(error));
      else stream.push(null);
    },
  });
  return stream;
}
