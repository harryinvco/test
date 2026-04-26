type Listener = () => void;

const dirtyListeners = new Set<Listener>();

/** Notify that a local mutation was written (something is now dirty). */
export function emitDirtyChange(): void {
  for (const fn of dirtyListeners) {
    try {
      fn();
    } catch {
      // Intentional: one listener's error shouldn't block others.
    }
  }
}

/** Subscribe to dirty-change notifications. Returns an unsubscribe function. */
export function onDirtyChange(fn: Listener): () => void {
  dirtyListeners.add(fn);
  return () => {
    dirtyListeners.delete(fn);
  };
}
