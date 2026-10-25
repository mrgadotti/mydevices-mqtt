import * as net from 'node:net';
import * as tls from 'node:tls';
import type { TcpDriver } from './connect';

/** Node socket driver, used by the integration tests (the app uses tcp.native.ts). */
export const nodeTcp: TcpDriver = ({ host, port, tls: useTls, trust }) => (h) => {
  let closed = false;
  const finish = (error?: string) => {
    if (closed) return;
    closed = true;
    h.onClose(error);
  };
  const socket: net.Socket = useTls
    ? tls.connect({ host, port, rejectUnauthorized: !trust, servername: host }, () => h.onOpen())
    : net.connect({ host, port }, () => h.onOpen());
  socket.on('data', (d: Buffer) => h.onData(new Uint8Array(d.buffer, d.byteOffset, d.byteLength)));
  socket.on('error', (e: Error) => finish(e.message));
  socket.on('close', () => finish());
  return {
    send: (data) => void socket.write(data),
    close: () => {
      closed = true;
      socket.destroy();
    },
  };
};
