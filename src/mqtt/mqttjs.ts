import { Duplex } from 'readable-stream';
import mqtt, { type IClientOptions, type IClientPublishOptions, type MqttClient as JsClient } from 'mqtt';
import type { Transport, TransportFactory } from './transport';

/** Duplex stream over one of our transports, so MQTT.js can run on react-native-tcp-socket / WebSocket. */
function streamOver(factory: TransportFactory): Duplex {
  let transport: Transport | null = null;
  let opened = false;
  let pending: (() => void) | null = null;
  const stream = new Duplex({
    read() {},
    write(chunk: Uint8Array, _enc, cb) {
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
      console.log('SPIKE onOpen');
      opened = true;
      stream.emit('connect');
      pending?.();
      pending = null;
    },
    onData: (chunk) => console.log('SPIKE data ' + chunk.length + ' ' + Array.from(chunk.slice(0, 8)).join(',')) ?? stream.push(Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength)),
    onClose: (error) => {
      if (error) stream.destroy(new Error(error));
      else stream.push(null);
    },
  });
  return stream;
}

export function createJsClient(factory: TransportFactory, opts: IClientOptions): JsClient {
  return new mqtt.MqttClient(() => streamOver(factory) as never, { protocolVersion: 4, reconnectPeriod: 0, ...opts });
}

export type { IClientPublishOptions };
