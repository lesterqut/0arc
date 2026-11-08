import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useArchive } from '../../context/ArchiveContext';
import {
  ImagePlus,
  Search,
  Maximize2,
  Download,
  Trash2,
  X,
  FileImage,
  Calendar,
  HardDrive,
  ZoomIn,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

export type GalleryImage = {
  id: string;
  name: string;
  type: string;
  size: number;
  /** Byte size before upload compression, when the image was re-encoded. */
  originalSize?: number;
  createdAt: number;
  blob: Blob;
  url: string;
};

type StoredImage = Omit<GalleryImage, 'url'>;

export type GalleryExportImage = {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: number;
  dataUrl: string;
};

const DB_NAME = '0arc-image-gallery';
const STORE_NAME = 'images';
const ACCEPTED_IMAGES = 'image/*,.avif,.bmp,.gif,.heic,.heif,.jpeg,.jpg,.png,.svg,.tif,.tiff,.webp';

const createId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export const readImages = async (): Promise<StoredImage[]> => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result as StoredImage[]).sort((a, b) => b.createdAt - a.createdAt));
    request.onerror = () => reject(request.error);
  });
};

export const writeImages = async (images: StoredImage[]) => {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    images.forEach((image) => store.put(image));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const removeImage = async (id: string) => {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/** Formats worth re-encoding; SVG/GIF (vector/animation) and already-optimised
 *  WebP/AVIF/HEIC uploads keep their original bytes. */
const RECOMPRESSIBLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/bmp']);

/** High enough that the WebP copy is visually indistinguishable from the source. */
const WEBP_QUALITY = 0.95;

/**
 * Shrink an upload without dropping resolution or visible detail.
 * The re-encoded copy is only kept when it is meaningfully smaller than the
 * original file, so quality can never get worse for no gain.
 */
const compressImage = async (file: File): Promise<File> => {
  if (!RECOMPRESSIBLE_TYPES.has(file.type) || file.size < 20 * 1024) return file;
  if (typeof createImageBitmap !== 'function') return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      return file;
    }

    context.drawImage(bitmap, 0, 0);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY)
    );

    if (!blob || blob.size === 0 || blob.size > file.size * 0.95) return file;

    const name = file.name.replace(/\.(png|jpe?g|bmp)$/i, '') + '.webp';
    return new File([blob], name, { type: 'image/webp', lastModified: file.lastModified });
  } catch {
    // Formats the browser can't decode (HEIC, TIFF, huge canvases) stay untouched.
    return file;
  }
};

const compressForExport = async (blob: Blob) => {
  if (blob.type === 'image/svg+xml' || blob.type === 'image/gif') return blobToDataUrl(blob);
  try {
    const sourceUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = sourceUrl;
    await image.decode();
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(sourceUrl);
    return canvas.toDataURL('image/webp', 0.78);
  } catch {
    return blobToDataUrl(blob);
  }
};

export async function exportGalleryImages(): Promise<GalleryExportImage[]> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return [];
  try {
    const stored = await readImages();
    return Promise.all(
      stored.map(async (image) => ({
        id: image.id,
        name: image.name,
        type: image.type,
        size: image.size,
        createdAt: image.createdAt,
        dataUrl: await compressForExport(image.blob),
      }))
    );
  } catch {
    return [];
  }
}

export const ImagesView: React.FC = () => {
  const { settings, addToast } = useArchive();
  const inputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [imageToDelete, setImageToDelete] = useState<GalleryImage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'name' | 'size_desc' | 'size_asc'>('recent');
  const [isDragging, setIsDragging] = useState(false);

  const refreshImages = async () => {
    try {
      const stored = await readImages();
      setImages((current) => {
        current.forEach((image) => URL.revokeObjectURL(image.url));
        return stored.map((image) => ({ ...image, url: URL.createObjectURL(image.blob) }));
      });
    } catch {
      setError('Image storage is unavailable in this browser.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!('indexedDB' in window)) {
      setError('IndexedDB storage is not supported in this browser environment.');
      setIsLoading(false);
      return;
    }
    void refreshImages();
    return () => {
      images.forEach((image) => URL.revokeObjectURL(image.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcut to close preview modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedImage) setSelectedImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage]);

  const saveFiles = async (fileList: File[]) => {
    const validFiles = fileList.filter(
      (file) =>
        file.type.startsWith('image/') ||
        file.name.match(/\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|tiff?|webp)$/i)
    );
    if (!validFiles.length) return;

    setError('');
    try {
      // Compress on upload, keeping the original whenever no bytes are saved.
      const prepared = await Promise.all(
        validFiles.map(async (file) => {
          const optimized = await compressImage(file);
          return {
            id: createId(),
            name: optimized.name,
            type: optimized.type || file.type || 'image/*',
            size: optimized.size,
            originalSize: optimized !== file ? file.size : undefined,
            createdAt: Date.now(),
            blob: optimized,
          };
        })
      );

      await writeImages(prepared);
      await refreshImages();

      const bytesBefore = validFiles.reduce((sum, file) => sum + file.size, 0);
      const bytesAfter = prepared.reduce((sum, image) => sum + image.size, 0);
      const savedPercent =
        bytesBefore > 0 ? Math.round(((bytesBefore - bytesAfter) / bytesBefore) * 100) : 0;

      if (prepared.length === 1) {
        addToast(
          'Image Saved',
          'success',
          savedPercent > 0
            ? `${prepared[0].name} · ${formatSize(bytesBefore)} → ${formatSize(bytesAfter)} (${savedPercent}% smaller)`
            : prepared[0].name
        );
      } else {
        addToast(
          `${prepared.length} Images Saved`,
          'success',
          savedPercent > 0
            ? `${savedPercent}% smaller · ${formatSize(bytesBefore - bytesAfter)} saved`
            : 'Added to image archive'
        );
      }
    } catch {
      setError('Could not save images. Please check your storage settings.');
      addToast('Upload Failed', 'error', 'Failed to store image in gallery.');
    }
  };

  const handleFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    await saveFiles(files);
    event.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      await saveFiles(droppedFiles);
    }
  };

  const handleDeleteImage = async (image: GalleryImage) => {
    if (settings.confirmBeforeDelete) {
      setImageToDelete(image);
    } else {
      await executeDelete(image);
    }
  };

  const executeDelete = async (image: GalleryImage) => {
    try {
      await removeImage(image.id);
      if (selectedImage?.id === image.id) setSelectedImage(null);
      await refreshImages();
      addToast('Image Removed', 'info', `Deleted "${image.name}"`);
    } catch {
      addToast('Delete Failed', 'error', 'Could not delete image.');
    }
  };

  const handleDownload = (image: GalleryImage, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredImages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = images.filter((img) => !q || img.name.toLowerCase().includes(q));

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return a.createdAt - b.createdAt;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'size_desc':
          return b.size - a.size;
        case 'size_asc':
          return a.size - b.size;
        case 'recent':
        default:
          return b.createdAt - a.createdAt;
      }
    });
  }, [images, searchQuery, sortBy]);

  const selectClass =
    'px-2.5 py-2 sm:py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-zinc-300 focus:outline-none focus:border-white/[0.2]';

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="space-y-5 animate-in fade-in duration-150 relative"
    >
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGES}
        multiple
        onChange={handleFileInput}
        className="sr-only"
        aria-hidden="true"
      />

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-30 rounded-2xl bg-black/80 backdrop-blur-sm border-2 border-dashed border-white/50 flex flex-col items-center justify-center p-8 pointer-events-none animate-in fade-in duration-150">
          <ImagePlus className="w-10 h-10 text-white mb-2 animate-bounce" />
          <p className="text-sm font-semibold text-white">Drop images to save</p>
          <p className="text-xs text-zinc-400 mt-1">PNG, JPG, SVG, WebP, GIF, AVIF, HEIC</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Images</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {images.length} {images.length === 1 ? 'image' : 'images'} saved in your private reference archive.
          </p>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-medium transition-colors shrink-0 shadow-sm"
        >
          <ImagePlus className="w-3.5 h-3.5" />
          <span>Add Images</span>
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            placeholder="Search saved images by filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 sm:py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/[0.2]"
          />
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className={selectClass}
          aria-label="Sort images"
        >
          <option value="recent">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name (A–Z)</option>
          <option value="size_desc">Size (Largest)</option>
          <option value="size_asc">Size (Smallest)</option>
        </select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="surface-card rounded-xl p-12 text-center text-xs text-zinc-500">
          Loading image gallery...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredImages.length === 0 && (
        <div className="surface-card rounded-xl p-12 text-center space-y-3">
          <FileImage className="w-8 h-8 text-zinc-600 mx-auto" />
          <div>
            <h3 className="text-xs font-semibold text-white">
              {images.length === 0 ? 'Your image gallery is empty' : 'No images matched your search'}
            </h3>
            <p className="text-[11px] text-zinc-500 mt-1 max-w-sm mx-auto">
              {images.length === 0
                ? 'Drop screenshots, logos, design assets, and inspirations from your computer.'
                : 'Try adjusting your search query or sorting options.'}
            </p>
          </div>
          {images.length === 0 && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-medium transition-colors"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              <span>Choose Files</span>
            </button>
          )}
        </div>
      )}

      {/* Image Grid */}
      {!isLoading && filteredImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredImages.map((image) => {
            const ext = image.name.split('.').pop()?.toUpperCase() || 'IMG';

            return (
              <div
                key={image.id}
                onClick={() => setSelectedImage(image)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedImage(image);
                  }
                }}
                className="surface-card rounded-xl overflow-hidden group flex flex-col justify-between cursor-pointer relative hover:border-white/[0.18] transition-all focus:outline-none focus-visible:border-white/30"
              >
                {/* Thumbnail container */}
                <div className="aspect-[4/3] w-full bg-[#0a0a0c] relative overflow-hidden flex items-center justify-center">
                  <img
                    src={image.url}
                    alt={image.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Gradient bottom shadow */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                  {/* Format pill */}
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md border border-white/[0.08] text-[9px] font-mono font-medium text-zinc-300 uppercase tracking-wider">
                    {ext}
                  </div>

                  {/* Hover expand button */}
                  <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/[0.08] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-3 h-3" />
                  </div>

                  {/* Size bottom badge */}
                  <div className="absolute bottom-1.5 left-2 text-[10px] font-mono text-zinc-300">
                    {formatSize(image.size)}
                  </div>
                </div>

                {/* Footer bar */}
                <div className="p-2.5 flex items-center justify-between gap-1.5">
                  <p className="truncate text-xs font-medium text-zinc-200" title={image.name}>
                    {image.name}
                  </p>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleDownload(image, e)}
                      title={`Download ${image.name}`}
                      className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteImage(image);
                      }}
                      title={`Delete ${image.name}`}
                      className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${selectedImage.name}`}
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative flex flex-col max-h-[92vh] max-w-5xl w-full surface-elevated rounded-2xl border border-white/[0.12] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#0c0c0e]">
              <div className="min-w-0 pr-3">
                <h3 className="text-xs font-semibold text-white truncate" title={selectedImage.name}>
                  {selectedImage.name}
                </h3>
                <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <HardDrive className="w-3 h-3 text-zinc-500" />
                    {formatSize(selectedImage.size)}
                    {selectedImage.originalSize && selectedImage.originalSize > selectedImage.size && (
                      <span className="text-emerald-400">
                        · compressed{' '}
                        {Math.round((1 - selectedImage.size / selectedImage.originalSize) * 100)}%
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-zinc-500" />
                    {new Date(selectedImage.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(selectedImage)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-medium text-white transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void handleDeleteImage(selectedImage);
                  }}
                  className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                  title="Delete image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-colors"
                  aria-label="Close preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Image Display */}
            <div className="flex-1 bg-black/60 flex items-center justify-center p-2 sm:p-4 overflow-hidden min-h-[300px] max-h-[75vh]">
              <img
                src={selectedImage.url}
                alt={selectedImage.name}
                className="max-h-full max-w-full object-contain rounded-lg shadow-lg select-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={Boolean(imageToDelete)}
        title="Delete image?"
        description={`Are you sure you want to permanently delete "${imageToDelete?.name}" from your gallery?`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (imageToDelete) {
            void executeDelete(imageToDelete);
            setImageToDelete(null);
          }
        }}
        onCancel={() => setImageToDelete(null)}
      />
    </div>
  );
};
