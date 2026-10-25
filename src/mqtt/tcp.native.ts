import TcpSocket from 'react-native-tcp-socket';
import type { TcpDriver } from './connect';

/** Plain and TLS sockets on Android through react-native-tcp-socket. */
export const nativeTcp: TcpDriver = ({ host, port, tls, trust }) => (h) => {
  let closed = false;
  const finish = (error?: string) => {
    if (closed) return;
    closed = true;
    h.onClose(error);
  };
  const socket = TcpSocket.createConnection(
    { host, port, tls, tlsCheckValidity: !trust, connectTimeout: 15000 },
    () => h.onOpen(),
  );
  socket.setNoDelay(true);
  socket.on('data', (d: unknown) => {
    if (typeof d === 'string') {
      h.onData(Uint8Array.from(d, (c) => c.charCodeAt(0) & 0xff));
    } else {
      const b = d as Uint8Array;
      h.onData(new Uint8Array(b.buffer, b.byteOffset, b.byteLength));
    }
  });
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
