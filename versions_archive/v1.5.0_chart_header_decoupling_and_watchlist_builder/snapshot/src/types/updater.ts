export type UpdateStatus = 
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string | { version: string; note: string }[];
  sha512?: string;
  isCritical?: boolean;
  isDmg?: boolean;
  dmgPath?: string;
  files?: {
    url?: string;
    size?: number;
    sha512?: string;
  }[];
}

export interface UpdateProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export interface UpdaterState {
  status: UpdateStatus;
  currentVersion: string;
  info?: UpdateInfo | null;
  progress?: UpdateProgress | null;
  error?: string | null;
  lastCheckedTime?: number | null;
}

export interface UpdaterAPI {
  checkForUpdates: () => Promise<{ status: string; devMode?: boolean; error?: string }>;
  startDownloadUpdate: () => Promise<{ success: boolean; devMode?: boolean; message?: string; error?: string }>;
  quitAndInstall: () => Promise<{ success: boolean; devMode?: boolean; message?: string }>;
  getCurrentState: () => Promise<UpdaterState>;
  getAppVersion: () => Promise<string>;
  onStatusChanged: (callback: (state: UpdaterState) => void) => () => void;
}

export interface ElectronWindowAPI {
  platform: string;
  ping: () => string;
  fetchMarketData?: (url: string) => Promise<{ data?: any; error?: string }>;
  updater?: UpdaterAPI;
}

declare global {
  interface Window {
    electronAPI?: ElectronWindowAPI;
  }
}

