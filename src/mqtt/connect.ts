import type { Broker } from '../domain/types';
import type { MqttClientOptions } from './MqttClient';
import type { Transport, TransportFactory } from './transport';

export interface TcpTarget {
  host: string;
  port: number;
  tls: boolean;
  /** Accept self-signed certificates ("I trust this certificate" option). */
  trust: boolean;
}

/** Platform-specific plain/TLS socket support (react-native-tcp-socket on device, node:net in tests). */
export type TcpDriver = (target: TcpTarget) => TransportFactory;

const WS_URL = /^wss?:\/\//i;

export function wsTransport(url: string): TransportFactory {
  return (h): Transport => {
    const ws = new WebSocket(url, ['mqtt']);
    ws.binaryType = 'arraybuffer';
    let closed = false;
    const finish = (error?: string) => {
      if (closed) return;
      closed = true;
      h.onClose(error);
    };
    ws.onopen = () => h.onOpen();
    ws.onmessage = (e) => {
      const d = e.data as ArrayBuffer | string;
      if (typeof d !== 'string') h.onData(new Uint8Array(d));
    };
    ws.onerror = () => finish('WebSocket error');
    ws.onclose = (e) => finish(e.reason ? `WebSocket closed: ${e.reason}` : 'WebSocket closed');
    return {
      send: (data) => ws.send(data),
      close: () => {
        closed = true;
        ws.close();
      },
    };
  };
}

/** Chooses the transport builds the server URI: ssl:// or tcp:// host:port. */
export function transportFor(broker: Broker, tcp: TcpDriver): TransportFactory {
  const address = broker.address.trim();
  if (WS_URL.test(address)) return wsTransport(address);
  const port = parseInt(broker.port, 10);
  return tcp({ host: address, port: Number.isFinite(port) ? port : 1883, tls: broker.ssl, trust: broker.trust });
}

/** Connect options: keepalive 30 s, credentials only when non-blank. */
export function clientOptionsFor(broker: Broker, tcp: TcpDriver): MqttClientOptions {
  const o: MqttClientOptions = {
    clientId: broker.clientId,
    keepAlive: 30,
    cleanSession: true,
    connect: transportFor(broker, tcp),
  };
  if (broker.user.trim().length > 0) {
    o.username = broker.user;
    if (broker.password.trim().length > 0) o.password = broker.password;
  }
  return o;
}
