export type LocalTab = {
  id: string;
  date: string;
  label: string;
  position: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  dirty: 0 | 1;
};

export type LocalNote = {
  id: string;
  tabId: string;
  date: string;
  titlePreview: string;
  content: string;
  position: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  dirty: 0 | 1;
};

export type SyncMeta = {
  key: "serverCursor" | "lastSyncAt" | "lastError";
  value: string;
};
