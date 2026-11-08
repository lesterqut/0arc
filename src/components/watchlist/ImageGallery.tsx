import React, { useEffect, useRef, useState } from 'react';
import { Download, ImagePlus, Maximize2, Trash2, X } from 'lucide-react';

type GalleryImage = {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: number;
  blob: Blob;
  url: string;
};

type StoredImage = Omit<GalleryImage, 'url'>;

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

const readImages = async (): Promise<StoredImage[]> => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result as StoredImage[]).sort((a, b) => b.createdAt - a.createdAt));
    request.onerror = () => reject(request.error);
  });
};

const writeImages = async (images: StoredImage[]) => {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    images.forEach((image) => store.put(image));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

const removeImage = async (id: string) => {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const formatSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const ImageGallery: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
      setError('Image storage is unavailable in this browser.');
      setIsLoading(false);
      return;
    }
    void refreshImages();
    return () => images.forEach((image) => URL.revokeObjectURL(image.url));
    // The gallery should load once; object URLs are refreshed explicitly after changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/') || file.name.match(/\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|tiff?|webp)$/i));
    if (!files.length) return;
    setError('');
    try {
      await writeImages(files.map((file) => ({ id: createId(), name: file.name, type: file.type || 'image/*', size: file.size, createdAt: Date.now(), blob: file })));
      await refreshImages();
    } catch {
      setError('Could not save these images. Please try again.');
    } finally {
      event.target.value = '';
    }
  };

  const handleDelete = async (image: GalleryImage) => {
    await removeImage(image.id);
    if (selectedImage?.id === image.id) setSelectedImage(null);
    await refreshImages();
  };

  const handleDownload = (image: GalleryImage) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.name;
    link.click();
  };

  return (
    <section className="space-y-3 border-t border-white/[0.06] pt-5" aria-labelledby="image-gallery-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="image-gallery-heading" className="text-sm font-semibold text-white">Image gallery</h2>
          <p className="mt-0.5 text-[11px] text-zinc-500">Save reference images from your files for quick preview or download.</p>
        </div>
        <>
          <input ref={inputRef} type="file" accept={ACCEPTED_IMAGES} multiple onChange={handleFiles} className="sr-only" />
          <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-black transition-colors hover:bg-zinc-200">
            <ImagePlus className="h-3.5 w-3.5" />
            Add images
          </button>
        </>
      </div>

      {error ? <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-[11px] text-red-200">{error}</p> : null}

      {isLoading ? <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center text-xs text-zinc-500">Loading gallery...</div> : null}
      {!isLoading && images.length === 0 ? (
        <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.1] bg-white/[0.015] p-8 text-center transition-colors hover:border-white/[0.2] hover:bg-white/[0.03]">
          <ImagePlus className="mb-2 h-5 w-5 text-zinc-500" />
          <span className="text-xs font-medium text-zinc-300">No saved images yet</span>
          <span className="mt-1 text-[11px] text-zinc-500">PNG, JPG, GIF, SVG, WebP, AVIF, BMP, TIFF, and more</span>
        </button>
      ) : null}

      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {images.map((image) => (
            <article key={image.id} className="group overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.025]">
              <button type="button" onClick={() => setSelectedImage(image)} className="relative block aspect-square w-full overflow-hidden bg-black/30" aria-label={`Preview ${image.name}`}>
                <img src={image.url} alt={image.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <span className="absolute right-2 top-2 rounded-md bg-black/70 p-1.5 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"><Maximize2 className="h-3.5 w-3.5" /></span>
              </button>
              <div className="flex items-center gap-2 p-2.5">
                <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-medium text-zinc-200" title={image.name}>{image.name}</p><p className="mt-0.5 text-[10px] text-zinc-500">{formatSize(image.size)}</p></div>
                <button type="button" onClick={() => handleDownload(image)} className="rounded-md p-1.5 text-zinc-500 hover:bg-white/[0.08] hover:text-white" aria-label={`Download ${image.name}`}><Download className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => void handleDelete(image)} className="rounded-md p-1.5 text-zinc-500 hover:bg-red-400/10 hover:text-red-300" aria-label={`Delete ${image.name}`}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {selectedImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Preview ${selectedImage.name}`} onClick={() => setSelectedImage(null)}>
          <div className="relative max-h-[90vh] max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <img src={selectedImage.url} alt={selectedImage.name} className="max-h-[82vh] max-w-full rounded-xl object-contain shadow-2xl" />
            <div className="absolute -bottom-12 left-0 right-0 flex items-center justify-between gap-3"><p className="truncate text-xs text-zinc-300">{selectedImage.name}</p><div className="flex items-center gap-1"><button type="button" onClick={() => handleDownload(selectedImage)} className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-black hover:bg-zinc-200">Download</button><button type="button" onClick={() => setSelectedImage(null)} className="rounded-lg border border-white/10 bg-black/60 p-2 text-white hover:bg-white/10" aria-label="Close preview"><X className="h-4 w-4" /></button></div></div>
          </div>
        </div>
      ) : null}
    </section>
  );
};
