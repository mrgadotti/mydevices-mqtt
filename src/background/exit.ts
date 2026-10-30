/** Steps to close the whole app from the foreground service notification. Injectable so the order is testable. */
export interface ExitDeps {
  /** Stops the embedded broker process. */
  stopBroker(): Promise<void>;
  /** Removes the foreground service and its notification. */
  stopService(): Promise<void>;
  /** Ends the activity and the process. */
  kill(): void;
}

/** Stops the broker, then the service, then ends the process; a step that fails never blocks the next ones. */
export async function quitApp(deps: ExitDeps): Promise<void> {
  try {
    await deps.stopBroker();
  } catch {
    // the process is killed below anyway
  }
  try {
    await deps.stopService();
  } catch {
    // idem
  }
  deps.kill();
}
