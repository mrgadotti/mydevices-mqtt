export interface TransportHandlers {
  onOpen(): void;
  onData(chunk: Uint8Array): void;
  /** Called once when the link goes away; `error` is set when it was not requested. */
  onClose(error?: string): void;
}

export interface Transport {
  send(data: Uint8Array): void;
  close(): void;
}

/** A factory starts connecting immediately and reports through the handlers. */
export type TransportFactory = (handlers: TransportHandlers) => Transport;
