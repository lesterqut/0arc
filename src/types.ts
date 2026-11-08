export type ArchiveCategory = 'tools' | 'notes' | 'watchlist';

export type ToolCategory =
  | 'AI Tools'
  | 'Development'
  | 'Design'
  | 'Productivity'
  | 'Websites'
  | 'Software'
  | 'Learning'
  | 'Other';

export interface ToolItem {
  id: string;
  title: string;
  description: string;
  url?: string;
  category: ToolCategory;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Kept only as an automatically detected label — never asked for when adding an entry. */
export type MediaType = 'movie' | 'series' | 'anime';

/** One flat status set shared by every watchlist item. */
export type MediaStatus =
  | 'want_to_watch'
  | 'watching'
  | 'completed'
  | 'on_hold'
  | 'dropped';

export interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  posterUrl?: string;
  description: string;
  genre: string;
  releaseYear: number;
  rating: number; // 1-10
  status: MediaStatus;
  notes?: string;
  progressCurrent?: number;
  progressTotal?: number;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NavigationTab =
  | 'overview'
  | 'tools'
  | 'notes'
  | 'watchlist'
  | 'images'
  | 'favorites'
  | 'settings';

export interface AppSettings {
  confirmBeforeDelete: boolean;
  defaultArchiveView: NavigationTab;
}

export interface ArchiveSnapshot {
  version: string;
  exportedAt: string;
  tools: ToolItem[];
  notes: NoteItem[];
  media: MediaItem[];
  settings: AppSettings;
  gallery?: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    createdAt: number;
    dataUrl: string;
  }>;
}

export interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

export interface UserAccount {
  id: string;
  username: string;
  createdAt: string;
}
