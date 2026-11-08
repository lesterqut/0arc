import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  ToolItem,
  ToolCategory,
  NoteItem,
  MediaItem,
  AppSettings,
  NavigationTab,
  MediaStatus,
  ArchiveCategory,
  ArchiveSnapshot,
  ToastMessage,
  UserAccount,
} from '../types';
import { INITIAL_SETTINGS } from '../data/seedData';
import { exportGalleryImages } from '../components/watchlist/ImageGallery';
import { normalizePath, pathForTab, tabFromPath, TAB_TITLES } from '../utils/appRoutes';
import {
  fetchCloudVault,
  pushCloudVault,
  setupRealtimeSync,
  fetchMongoStatus,
  setMongoConnection,
  type MongoStatus,
  type CloudVaultPayload,
} from '../utils/cloudSync';

interface ArchiveContextType {
  currentUser: UserAccount | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;

  tools: ToolItem[];
  notes: NoteItem[];
  media: MediaItem[];
  settings: AppSettings;
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;

  searchModalOpen: boolean;
  openSearchModal: () => void;
  closeSearchModal: () => void;

  quickAddModalOpen: boolean;
  quickAddInitialType: ArchiveCategory | null;
  openQuickAdd: (type?: ArchiveCategory) => void;
  closeQuickAdd: () => void;

  addTool: (tool: Omit<ToolItem, 'id' | 'createdAt' | 'updatedAt'>) => ToolItem;
  updateTool: (id: string, updates: Partial<ToolItem>) => void;
  deleteTool: (id: string) => void;
  toggleToolFavorite: (id: string) => void;

  addNote: (note: Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'>) => NoteItem;
  updateNote: (id: string, updates: Partial<NoteItem>) => void;
  deleteNote: (id: string) => void;
  duplicateNote: (id: string) => NoteItem;
  toggleNoteFavorite: (id: string) => void;

  addMedia: (media: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>) => MediaItem;
  updateMedia: (id: string, updates: Partial<MediaItem>) => void;
  deleteMedia: (id: string) => void;
  updateMediaProgress: (id: string, current: number, total?: number) => void;
  toggleMediaFavorite: (id: string) => void;

  updateSettings: (updates: Partial<AppSettings>) => void;

  exportAllJSON: () => void;
  exportCollectionJSON: (category: ArchiveCategory) => void;
  importJSON: (jsonString: string, mode: 'merge' | 'replace') => { success: boolean; message: string };
  clearAllData: () => void;
  resetToSampleData: () => void;

  toasts: ToastMessage[];
  addToast: (title: string, type?: ToastMessage['type'], message?: string) => void;
  dismissToast: (id: string) => void;

  // Real-Time Cloud Sync & Database
  isCloudSyncActive: boolean;
  cloudSyncStatus: 'synced' | 'syncing' | 'local' | 'error';
  mongoStatus: MongoStatus | null;
  cloudModalOpen: boolean;
  openCloudModal: () => void;
  closeCloudModal: () => void;
  connectMongoAtlas: (uri: string) => Promise<{ ok: boolean; message?: string }>;
  disconnectMongoAtlas: () => Promise<void>;
  forceCloudSync: () => Promise<void>;

  // Backwards compatibility aliases
  connectSupabase: (url: string, anonKey: string) => Promise<{ success: boolean; error?: string }>;
  disconnectSupabase: () => void;
  connectCloud: () => Promise<void>;
  disconnectCloud: () => void;
  updateCloud: () => Promise<void>;
}

const ArchiveContext = createContext<ArchiveContextType | undefined>(undefined);

const STORAGE_PREFIX = '0arc_vault';

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const normalizeMediaStatus = (status?: string): MediaStatus => {
  switch (status) {
    case 'watching':
    case 'reading':
      return 'watching';
    case 'completed':
    case 'watched':
      return 'completed';
    case 'on_hold':
      return 'on_hold';
    case 'dropped':
      return 'dropped';
    default:
      return 'want_to_watch';
  }
};

const normalizeMediaItems = (items: unknown): MediaItem[] => {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .filter((item) => item.type !== 'manga')
    .map((item) => ({
      id: String(item.id || generateUUID()),
      title: String(item.title || 'Untitled'),
      type: item.type === 'series' || item.type === 'anime' ? item.type : 'movie',
      posterUrl:
        typeof item.posterUrl === 'string'
          ? item.posterUrl
          : typeof item.poster_url === 'string'
            ? item.poster_url
            : undefined,
      description: String(item.description || ''),
      genre: String(item.genre || ''),
      releaseYear: Number(item.releaseYear || item.release_year) || new Date().getFullYear(),
      rating: Number(item.rating) || 0,
      status: normalizeMediaStatus(typeof item.status === 'string' ? item.status : undefined),
      notes: typeof item.notes === 'string' ? item.notes : undefined,
      progressCurrent: Number(item.progressCurrent ?? item.progress_current ?? 0),
      progressTotal: Number(item.progressTotal ?? item.progress_total ?? 0),
      isFavorite: Boolean(item.isFavorite ?? item.is_favorite),
      createdAt: String(item.createdAt || item.created_at || new Date().toISOString()),
      updatedAt: String(item.updatedAt || item.updated_at || new Date().toISOString()),
    }));
};

export const ArchiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Single-owner account (no login barrier required for personal archive)
  const currentUser: UserAccount = {
    id: '00000000-0000-0000-0000-000000000000',
    username: 'owner',
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  // Client ID for this browser tab/session to avoid echoing back own edits in SSE
  const clientIdRef = useRef<string>(
    typeof window !== 'undefined'
      ? (() => {
          let id = sessionStorage.getItem('0arc_client_id');
          if (!id) {
            id = `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            sessionStorage.setItem('0arc_client_id', id);
          }
          return id;
        })()
      : 'device-server'
  );

  // Synchronously seed from localStorage for instantaneous 0ms display
  const [tools, setTools] = useState<ToolItem[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}_tools`);
      return stored ? (JSON.parse(stored) as ToolItem[]) : [];
    } catch {
      return [];
    }
  });

  const [notes, setNotes] = useState<NoteItem[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}_notes`);
      return stored ? (JSON.parse(stored) as NoteItem[]) : [];
    } catch {
      return [];
    }
  });

  const [media, setMedia] = useState<MediaItem[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}_media`);
      return stored ? normalizeMediaItems(JSON.parse(stored)) : [];
    } catch {
      return [];
    }
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}_settings`);
      return stored ? { ...INITIAL_SETTINGS, ...JSON.parse(stored) } : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  const [activeTab, setActiveTabState] = useState<NavigationTab>(() => {
    if (typeof window !== 'undefined') {
      const routedTab = tabFromPath(window.location.pathname);
      if (routedTab) return routedTab;
    }
    const fallback = settings.defaultArchiveView;
    // Settings has no URL of its own, so a launch page can never be Settings.
    return fallback && fallback !== 'settings' ? fallback : 'overview';
  });
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [quickAddModalOpen, setQuickAddModalOpen] = useState(false);
  const [quickAddInitialType, setQuickAddInitialType] = useState<ArchiveCategory | null>(null);
  const [cloudModalOpen, setCloudModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Cloud Sync State
  const [isCloudSyncActive, setIsCloudSyncActive] = useState<boolean>(true);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'local' | 'error'>('synced');
  const [mongoStatus, setMongoStatus] = useState<MongoStatus | null>(null);

  /**
   * Switch sections and mirror them into the address bar, so every routed tab
   * (`/tools`, `/notes`, `/watchlist`, `/images`, `/favorites`) is bookmarkable.
   */
  const setActiveTab = useCallback((tab: NavigationTab) => {
    setActiveTabState(tab);
    if (typeof window === 'undefined') return;
    const path = pathForTab(tab);
    if (normalizePath(window.location.pathname) !== path) {
      window.history.pushState({ tab }, '', path);
    }
  }, []);

  // Canonicalize the first paint: deep links stay, unknown paths go home.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const path = pathForTab(activeTab);
    if (normalizePath(window.location.pathname) !== path) {
      window.history.replaceState({ tab: activeTab }, '', path);
    }
    // Only the landing URL needs normalizing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Browser back/forward navigation follows the URL.
  useEffect(() => {
    const handlePopState = () => {
      const routedTab = tabFromPath(window.location.pathname);
      if (routedTab) {
        setActiveTabState(routedTab);
      } else {
        window.history.replaceState({ tab: 'overview' }, '', '/');
        setActiveTabState('overview');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Keep the document title in step with the active section.
  useEffect(() => {
    document.title = activeTab === 'overview' ? '0arc — Personal Digital Archive' : `${TAB_TITLES[activeTab]} — 0arc`;
  }, [activeTab]);

  // Flags to avoid sync loops
  const isInitialCloudLoadDoneRef = useRef(false);
  const isApplyingRemoteUpdateRef = useRef(false);
  const syncTimeoutRef = useRef<any>(null);

  const addToast = useCallback(
    (title: string, type: ToastMessage['type'] = 'info', message?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newToast: ToastMessage = { id, title, type, message };
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    []
  );

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  /**
   * Hydrate local cache with data fetched from the cloud server.
   */
  const applyCloudSnapshot = useCallback((data: CloudVaultPayload) => {
    isApplyingRemoteUpdateRef.current = true;

    if (Array.isArray(data.tools)) {
      setTools(data.tools);
      try {
        localStorage.setItem(`${STORAGE_PREFIX}_tools`, JSON.stringify(data.tools));
      } catch {}
    }

    if (Array.isArray(data.notes)) {
      setNotes(data.notes);
      try {
        localStorage.setItem(`${STORAGE_PREFIX}_notes`, JSON.stringify(data.notes));
      } catch {}
    }

    if (Array.isArray(data.media)) {
      const normMedia = normalizeMediaItems(data.media);
      setMedia(normMedia);
      try {
        localStorage.setItem(`${STORAGE_PREFIX}_media`, JSON.stringify(normMedia));
      } catch {}
    }

    if (data.settings && typeof data.settings === 'object') {
      const normSettings = { ...INITIAL_SETTINGS, ...data.settings };
      setSettings(normSettings);
      try {
        localStorage.setItem(`${STORAGE_PREFIX}_settings`, JSON.stringify(normSettings));
      } catch {}
    }

    setCloudSyncStatus('synced');
    setIsCloudSyncActive(true);

    // Release flag after state update settles
    setTimeout(() => {
      isApplyingRemoteUpdateRef.current = false;
    }, 100);
  }, []);

  /**
   * On startup, fetch current vault data from cloud and query MongoDB status.
   */
  useEffect(() => {
    let mounted = true;

    async function initialSync() {
      // 1. Check MongoDB status
      fetchMongoStatus().then((status) => {
        if (mounted) setMongoStatus(status);
      });

      // 2. Fetch cloud data
      const res = await fetchCloudVault();
      if (!mounted) return;

      if (res.ok && res.data) {
        const cloudData = res.data;
        const localToolsEmpty = tools.length === 0;
        const localNotesEmpty = notes.length === 0;
        const localMediaEmpty = media.length === 0;

        const cloudHasData =
          (cloudData.tools && cloudData.tools.length > 0) ||
          (cloudData.notes && cloudData.notes.length > 0) ||
          (cloudData.media && cloudData.media.length > 0);

        if (cloudHasData || (localToolsEmpty && localNotesEmpty && localMediaEmpty)) {
          // Cloud has content (or local is empty), apply cloud state
          applyCloudSnapshot(cloudData);
        } else if (!cloudHasData && (!localToolsEmpty || !localNotesEmpty || !localMediaEmpty)) {
          // First time migrating local browser data up to the cloud!
          const migrationResult = await pushCloudVault(clientIdRef.current, {
            tools,
            notes,
            media,
            settings,
          });
          if (migrationResult.ok) {
            setCloudSyncStatus('synced');
          } else {
            setCloudSyncStatus('error');
          }
        }
      }

      isInitialCloudLoadDoneRef.current = true;
    }

    initialSync();

    return () => {
      mounted = false;
    };
  }, [applyCloudSnapshot]);

  /**
   * Real-Time Synchronization Listener via SSE:
   * Keeps every open device and browser synchronized with zero lag.
   */
  useEffect(() => {
    const unsubscribe = setupRealtimeSync(
      clientIdRef.current,
      (remoteUpdate) => {
        // Silently update without interrupting user with notifications
        applyCloudSnapshot(remoteUpdate);
      },
      (status) => {
        if (status === 'connected') {
          setIsCloudSyncActive(true);
          setCloudSyncStatus('synced');
        } else if (status === 'reconnecting') {
          setCloudSyncStatus('syncing');
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [applyCloudSnapshot]);

  /**
   * Background sync: When user changes items or settings, save to localStorage
   * immediately (0ms lag) and debounce save to cloud server in background.
   */
  useEffect(() => {
    // 1. Dual-write to localStorage instantly
    try {
      localStorage.setItem(`${STORAGE_PREFIX}_tools`, JSON.stringify(tools));
      localStorage.setItem(`${STORAGE_PREFIX}_notes`, JSON.stringify(notes));
      localStorage.setItem(`${STORAGE_PREFIX}_media`, JSON.stringify(media));
      localStorage.setItem(`${STORAGE_PREFIX}_settings`, JSON.stringify(settings));
    } catch {}

    // If change was triggered by remote incoming update, don't re-upload
    if (isApplyingRemoteUpdateRef.current) return;
    if (!isInitialCloudLoadDoneRef.current) return;

    // Debounce cloud push to batch rapid typing/drag-drops cleanly
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      setCloudSyncStatus('syncing');
      const result = await pushCloudVault(clientIdRef.current, {
        tools,
        notes,
        media,
        settings,
      });
      setCloudSyncStatus(result.ok ? 'synced' : 'error');
    }, 350);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [tools, notes, media, settings]);

  /**
   * Hotkeys (Command+K search, 1-6 tab switching, C for quick add)
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
        return;
      }

      if (isInput) return;

      if (e.key === 'c' || e.key === 'C') {
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          setQuickAddInitialType(null);
          setQuickAddModalOpen(true);
        }
      } else if (e.key === '1') {
        setActiveTab('overview');
      } else if (e.key === '2') {
        setActiveTab('tools');
      } else if (e.key === '3') {
        setActiveTab('notes');
      } else if (e.key === '4') {
        setActiveTab('watchlist');
      } else if (e.key === '5') {
        setActiveTab('favorites');
      } else if (e.key === '6') {
        setActiveTab('settings');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auth stubs (single user archive)
  const login = async () => ({ success: true });
  const register = async () => ({ success: true });
  const logout = () => {};

  // Cloud actions
  const forceCloudSync = async () => {
    setCloudSyncStatus('syncing');
    const res = await pushCloudVault(clientIdRef.current, {
      tools,
      notes,
      media,
      settings,
    });
    if (res.ok) {
      setCloudSyncStatus('synced');
      addToast('Cloud Synchronized', 'success', 'All changes synchronized across your devices.');
    } else {
      setCloudSyncStatus('error');
      addToast('Sync Failed', 'error', res.error || 'Could not reach cloud server.');
    }
  };

  const connectMongoAtlas = async (uri: string) => {
    const res = await setMongoConnection(uri);
    if (res.ok) {
      const status = await fetchMongoStatus();
      setMongoStatus(status);
      addToast('Connected to MongoDB Atlas', 'success', 'Real-time database active and synchronized.');
    } else {
      addToast('MongoDB Connection Error', 'error', res.message || 'Failed to connect.');
    }
    return res;
  };

  const disconnectMongoAtlas = async () => {
    await setMongoConnection('');
    const status = await fetchMongoStatus();
    setMongoStatus(status);
    addToast('Disconnected from MongoDB', 'info', 'Reverted to built-in cloud persistence.');
  };

  const openCloudModal = () => setCloudModalOpen(true);
  const closeCloudModal = () => setCloudModalOpen(false);

  // Backwards compatibility stubs
  const connectCloud = async () => forceCloudSync();
  const disconnectCloud = () => {
    setIsCloudSyncActive(false);
    setCloudSyncStatus('local');
    addToast('Cloud Sync Paused', 'info');
  };
  const updateCloud = async () => forceCloudSync();
  const connectSupabase = async () => ({ success: true });
  const disconnectSupabase = () => {};

  const openSearchModal = () => setSearchModalOpen(true);
  const closeSearchModal = () => setSearchModalOpen(false);

  const openQuickAdd = (type?: ArchiveCategory) => {
    setQuickAddInitialType(type || null);
    setQuickAddModalOpen(true);
  };
  const closeQuickAdd = () => {
    setQuickAddModalOpen(false);
    setQuickAddInitialType(null);
  };

  // ---------- CRUD OPERATIONS (Optimistic UI, 0ms lag) ----------

  const addTool = (toolData: Omit<ToolItem, 'id' | 'createdAt' | 'updatedAt'>): ToolItem => {
    const now = new Date().toISOString();
    const newTool: ToolItem = {
      ...toolData,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
    };
    setTools((prev) => [newTool, ...prev]);
    addToast('Tool Saved', 'success', `"${newTool.title}" saved.`);
    return newTool;
  };

  const updateTool = (id: string, updates: Partial<ToolItem>) => {
    setTools((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
      )
    );
    addToast('Tool Updated', 'info');
  };

  const deleteTool = (id: string) => {
    const item = tools.find((t) => t.id === id);
    setTools((prev) => prev.filter((t) => t.id !== id));
    addToast('Tool Removed', 'info', item ? `"${item.title}" removed.` : undefined);
  };

  const toggleToolFavorite = (id: string) => {
    setTools((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, isFavorite: !item.isFavorite, updatedAt: new Date().toISOString() }
          : item
      )
    );
  };

  const addNote = (noteData: Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'>): NoteItem => {
    const now = new Date().toISOString();
    const newNote: NoteItem = {
      ...noteData,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
    };
    setNotes((prev) => [newNote, ...prev]);
    addToast('Note Created', 'success', `"${newNote.title}" saved.`);
    return newNote;
  };

  const updateNote = (id: string, updates: Partial<NoteItem>) => {
    setNotes((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
      )
    );
  };

  const deleteNote = (id: string) => {
    const item = notes.find((n) => n.id === id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    addToast('Note Deleted', 'info', item ? `"${item.title}" deleted.` : undefined);
  };

  const duplicateNote = (id: string): NoteItem => {
    const target = notes.find((n) => n.id === id);
    if (!target) throw new Error('Note not found');
    const now = new Date().toISOString();
    const duplicated: NoteItem = {
      ...target,
      id: generateUUID(),
      title: `${target.title} (Copy)`,
      createdAt: now,
      updatedAt: now,
    };
    setNotes((prev) => [duplicated, ...prev]);
    addToast('Note Duplicated', 'success', `Created copy of "${target.title}".`);
    return duplicated;
  };

  const toggleNoteFavorite = (id: string) => {
    setNotes((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, isFavorite: !item.isFavorite, updatedAt: new Date().toISOString() }
          : item
      )
    );
  };

  const addMedia = (mediaData: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>): MediaItem => {
    const now = new Date().toISOString();
    const newMedia: MediaItem = {
      ...mediaData,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
    };
    setMedia((prev) => [newMedia, ...prev]);
    addToast('Added to Watchlist', 'success', `"${newMedia.title}" saved.`);
    return newMedia;
  };

  const updateMedia = (id: string, updates: Partial<MediaItem>) => {
    setMedia((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
      )
    );
    addToast('Watchlist Updated', 'info');
  };

  const deleteMedia = (id: string) => {
    const item = media.find((m) => m.id === id);
    setMedia((prev) => prev.filter((m) => m.id !== id));
    addToast('Item Removed', 'info', item ? `"${item.title}" removed.` : undefined);
  };

  const updateMediaProgress = (id: string, current: number, total?: number) => {
    setMedia((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newCurrent = Math.max(0, current);
          const newTotal = total !== undefined ? total : item.progressTotal;
          let newStatus = item.status;
          if (newTotal && newCurrent >= newTotal && newStatus === 'watching') {
            newStatus = 'completed';
          }
          return {
            ...item,
            progressCurrent: newCurrent,
            progressTotal: newTotal,
            status: newStatus,
            updatedAt: new Date().toISOString(),
          };
        }
        return item;
      })
    );
  };

  const toggleMediaFavorite = (id: string) => {
    setMedia((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, isFavorite: !item.isFavorite, updatedAt: new Date().toISOString() }
          : item
      )
    );
  };

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    addToast('Preferences Saved', 'success');
  };

  const exportAllJSON = async () => {
    const snapshot: ArchiveSnapshot = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      tools,
      notes,
      media,
      settings,
      gallery: await exportGalleryImages(),
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `0arc-backup-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Export Complete', 'success', 'All vault data downloaded.');
  };

  const exportCollectionJSON = async (category: ArchiveCategory) => {
    let data: unknown = [];
    if (category === 'tools') data = tools;
    if (category === 'notes') data = notes;
    if (category === 'watchlist') data = media;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `0arc-${category}-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(`${category.charAt(0).toUpperCase() + category.slice(1)} Exported`, 'success');
  };

  const importJSON = (jsonString: string, mode: 'merge' | 'replace') => {
    try {
      const parsed = JSON.parse(jsonString);
      let importedTools: ToolItem[] = [];
      let importedNotes: NoteItem[] = [];
      let importedMedia: MediaItem[] = [];

      if (parsed.version && (parsed.tools || parsed.notes || parsed.media)) {
        importedTools = Array.isArray(parsed.tools) ? parsed.tools : [];
        importedNotes = Array.isArray(parsed.notes) ? parsed.notes : [];
        importedMedia = normalizeMediaItems(parsed.media);
      } else if (Array.isArray(parsed)) {
        const sample = parsed[0];
        if (!sample) return { success: false, message: 'JSON array is empty.' };
        if ('category' in sample && 'url' in sample) {
          importedTools = parsed as ToolItem[];
        } else if ('content' in sample) {
          importedNotes = parsed as NoteItem[];
        } else if ('type' in sample && 'genre' in sample) {
          importedMedia = normalizeMediaItems(parsed);
        } else {
          return { success: false, message: 'Unrecognized archive data structure.' };
        }
      } else {
        return { success: false, message: 'Invalid 0arc JSON archive format.' };
      }

      if (mode === 'replace') {
        if (importedTools.length) setTools(importedTools);
        if (importedNotes.length) setNotes(importedNotes);
        if (importedMedia.length) setMedia(importedMedia);
      } else {
        if (importedTools.length) {
          setTools((prev) => {
            const existingIds = new Set(prev.map((t) => t.id));
            const fresh = importedTools.filter((t) => !existingIds.has(t.id));
            return [...fresh, ...prev];
          });
        }
        if (importedNotes.length) {
          setNotes((prev) => {
            const existingIds = new Set(prev.map((n) => n.id));
            const fresh = importedNotes.filter((n) => !existingIds.has(n.id));
            return [...fresh, ...prev];
          });
        }
        if (importedMedia.length) {
          setMedia((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const fresh = importedMedia.filter((m) => !existingIds.has(m.id));
            return [...fresh, ...prev];
          });
        }
      }

      const count = importedTools.length + importedNotes.length + importedMedia.length;
      addToast('Import Successful', 'success', `Imported ${count} items.`);
      return { success: true, message: `Successfully imported ${count} items.` };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Invalid JSON file format';
      addToast('Import Failed', 'error', errMsg);
      return { success: false, message: errMsg };
    }
  };

  const clearAllData = () => {
    setTools([]);
    setNotes([]);
    setMedia([]);
    addToast('Vault Cleared', 'warning', 'All archive entries have been erased.');
  };

  const resetToSampleData = () => {
    setTools([]);
    setNotes([]);
    setMedia([]);
    setSettings(INITIAL_SETTINGS);
    addToast('Vault Reset', 'info', 'Reset to an empty vault.');
  };

  return (
    <ArchiveContext.Provider
      value={{
        currentUser,
        login,
        register,
        logout,
        tools,
        notes,
        media,
        settings,
        activeTab,
        setActiveTab,
        searchModalOpen,
        openSearchModal,
        closeSearchModal,
        quickAddModalOpen,
        quickAddInitialType,
        openQuickAdd,
        closeQuickAdd,
        addTool,
        updateTool,
        deleteTool,
        toggleToolFavorite,
        addNote,
        updateNote,
        deleteNote,
        duplicateNote,
        toggleNoteFavorite,
        addMedia,
        updateMedia,
        deleteMedia,
        updateMediaProgress,
        toggleMediaFavorite,
        updateSettings,
        exportAllJSON,
        exportCollectionJSON,
        importJSON,
        clearAllData,
        resetToSampleData,
        toasts,
        addToast,
        dismissToast,
        isCloudSyncActive,
        cloudSyncStatus,
        mongoStatus,
        cloudModalOpen,
        openCloudModal,
        closeCloudModal,
        connectMongoAtlas,
        disconnectMongoAtlas,
        forceCloudSync,
        connectSupabase,
        disconnectSupabase,
        connectCloud,
        disconnectCloud,
        updateCloud,
      }}
    >
      {children}
    </ArchiveContext.Provider>
  );
};

export const useArchive = () => {
  const context = useContext(ArchiveContext);
  if (!context) {
    throw new Error('useArchive must be used within an ArchiveProvider');
  }
  return context;
};
