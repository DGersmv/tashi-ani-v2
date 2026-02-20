"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useViewMode } from "./ui/ViewMode";
import CustomerPhotosPanel from "./CustomerPhotosPanel";
import AllPhotosPanel from "./AllPhotosPanel";
import DocumentsPanel from "./DocumentsPanel";
import PanoramasPanel from "./PanoramasPanel";
import BimModelsList from "./BimModelsList";
import { MarkersPlugin } from "@photo-sphere-viewer/markers-plugin";
import "@photo-sphere-viewer/markers-plugin/index.css";
import { classifyPanoramaProjection, getPanoramaViewerPanoData } from "@/lib/panoramaUtils";

const ReactPhotoSphereViewer = dynamic<any>(
  () =>
    import("react-photo-sphere-viewer").then((mod: any) =>
      mod.ReactPhotoSphereViewer ? mod.ReactPhotoSphereViewer : mod.default
    ),
  { ssr: false }
);

interface Project {
  id: number;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
  documents?: Document[];
  _count: {
    photos: number;
    documents: number;
    messages: number;
  };
}

interface Photo {
  id: number;
  filename: string;
  originalName: string;
  uploadedAt: string;
  isVisibleToCustomer?: boolean;
}

interface Panorama {
  id: number;
  filename: string;
  originalName: string;
  uploadedAt: string;
  isVisibleToCustomer: boolean;
  mimeType?: string;
  unreadCommentsCount?: number;
  originalWidth?: number | null;
  originalHeight?: number | null;
  projectionType?: string | null;
}

interface Document {
  id: number;
  filename: string;
  originalName: string;
  documentType: string;
  uploadedAt: string;
  isPaid: boolean;
}

interface Message {
  id: number;
  content: string;
  isAdminMessage: boolean;
  createdAt: string;
  user: {
    name?: string;
    email: string;
  };
}

interface PaymentStatus {
  id: number;
  amount: number;
  status: string;
  description?: string;
  dueDate: string;
  createdAt: string;
}

interface BimModel {
  id: number;
  name: string;
  description?: string;
  version?: string;
  originalFilename: string;
  originalFormat: string;
  viewableFilename?: string;
  viewableFormat?: string;
  thumbnailFilename?: string;
  isVisibleToCustomer: boolean;
  uploadedAt: string;
  uploadedByUser?: {
    id: number;
    email: string;
    name?: string;
  };
}

interface ObjectDetail {
  id: number;
  title: string;
  description?: string;
  address?: string;
  status: string;
  createdAt: string;
  projects: Project[];
  photos: Photo[];
  panoramas: Panorama[];
  documents: Document[];
  messages: Message[];
  bimModels?: BimModel[];
  user: {
    id: number;
    name?: string;
    email: string;
  };
}

interface AdminObjectDetailViewProps {
  adminToken: string;
}

const PROJECT_STATUS_LABELS: Record<string, string> = {
  PLANNING: "Планирование",
  IN_PROGRESS: "В работе",
  COMPLETED: "Завершён",
  ON_HOLD: "Приостановлен",
};

function ProjectStatusRow({
  project,
  objectId,
  adminToken,
  onUpdated,
}: {
  project: Project;
  objectId: string;
  adminToken: string;
  onUpdated: () => Promise<void>;
}) {
  const [updating, setUpdating] = useState(false);
  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value as "PLANNING" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD";
    if (!status || status === project.status) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/objects/${objectId}/projects/${project.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) await onUpdated();
      else alert(data.message || "Ошибка обновления статуса");
    } catch (err) {
      alert("Ошибка сети");
    } finally {
      setUpdating(false);
    }
  };
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
      flexWrap: "wrap",
      padding: "12px 16px",
      backgroundColor: "rgba(250, 247, 242, 0.08)",
      borderRadius: "12px",
      border: "1px solid rgba(250, 247, 242, 0.12)",
    }}>
      <span style={{ color: "white", fontFamily: "Arial, sans-serif", flex: "1 1 200px", minWidth: 0 }}>
        {project.title}
      </span>
      <span style={{ color: "rgba(250, 247, 242, 0.7)", fontSize: "0.9rem" }}>
        {PROJECT_STATUS_LABELS[project.status] ?? project.status}
      </span>
      <select
        value={project.status}
        onChange={handleStatusChange}
        disabled={updating}
        style={{
          padding: "8px 12px",
          borderRadius: "8px",
          border: "1px solid rgba(250, 247, 242, 0.3)",
          background: "rgba(250, 247, 242, 0.1)",
          color: "white",
          fontFamily: "Arial, sans-serif",
          cursor: updating ? "not-allowed" : "pointer",
        }}
      >
        {(["PLANNING", "IN_PROGRESS", "COMPLETED", "ON_HOLD"] as const).map((s) => (
          <option key={s} value={s} style={{ background: "var(--ink)", color: "white" }}>
            {PROJECT_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function AdminObjectDetailView({ adminToken }: AdminObjectDetailViewProps) {
  const { setMode } = useViewMode();
  const [object, setObject] = useState<ObjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all-photos' | 'customer-photos' | 'panoramas' | 'projects' | 'payments' | 'messages' | 'documents' | 'models'>('all-photos');
  const [customer, setCustomer] = useState<any>(null);
  const [updatingPhotos, setUpdatingPhotos] = useState<Set<number>>(new Set());
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [imageUrls, setImageUrls] = useState<{[key: string]: string}>({});
  const [fullImageUrls, setFullImageUrls] = useState<{[key: string]: string}>({});
  const [panoramaThumbnailUrls, setPanoramaThumbnailUrls] = useState<{[key: string]: string}>({});
  const [panoramaUrls, setPanoramaUrls] = useState<{[key: string]: string}>({});
  const imageUrlsRef = useRef<{[key: string]: string}>({});
  const fullImageUrlsRef = useRef<{[key: string]: string}>({});
  const panoramaThumbnailUrlsRef = useRef<{[key: string]: string}>({});
  const panoramaUrlsRef = useRef<{[key: string]: string}>({});
  const [loadingPhotoIds, setLoadingPhotoIds] = useState<Set<number>>(new Set());
  const loadingPhotoIdsRef = useRef<Set<number>>(new Set());
  const [loadingPanoramaIds, setLoadingPanoramaIds] = useState<Set<number>>(new Set());
  const loadingPanoramaIdsRef = useRef<Set<number>>(new Set());
  const [panoramaFetchErrors, setPanoramaFetchErrors] = useState<Record<number, string>>({});
  const panoramaFetchErrorsRef = useRef<Record<number, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteType, setDeleteType] = useState<'photo' | 'document' | 'message' | 'panorama' | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedPanorama, setSelectedPanorama] = useState<Panorama | null>(null);
  const [photoComments, setPhotoComments] = useState<any[]>([]);
  const [newPhotoComment, setNewPhotoComment] = useState('');
  const [sendingPhotoComment, setSendingPhotoComment] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [selectedCustomerFolder, setSelectedCustomerFolder] = useState<number | null>(null);
  const [tempSelectedFolder, setTempSelectedFolder] = useState<number | null>(null);
  const [updatingPanoramas, setUpdatingPanoramas] = useState<Set<number>>(new Set());
  const [panoramaComments, setPanoramaComments] = useState<any[]>([]);
  const [newPanoramaComment, setNewPanoramaComment] = useState('');
  const [sendingPanoramaComment, setSendingPanoramaComment] = useState(false);
  const [pendingPanoramaCoords, setPendingPanoramaCoords] = useState<{ yaw: number; pitch: number } | null>(null);
  const [selectedPanoramaCommentId, setSelectedPanoramaCommentId] = useState<number | null>(null);
  const [deletingPanoramaCommentIds, setDeletingPanoramaCommentIds] = useState<Set<number>>(new Set());
  const panoramaViewerRef = useRef<any>(null);
  const [markersPluginInstance, setMarkersPluginInstance] = useState<any>(null);
  const panoramaViewerPlugins = useMemo(() => [[MarkersPlugin, {}]], []);
  const [missingPanoramaIds, setMissingPanoramaIds] = useState<Set<number>>(new Set());
  const [panoramasReady, setPanoramasReady] = useState(false);
  const panoramaCommentsReadRef = useRef<Set<number>>(new Set());
  const lastFetchedPanoramaIdRef = useRef<number | null>(null);
  const createMarkerHtml = useCallback((color: string, isActive: boolean, isPending = false) => {
    const size = isActive ? 20 : 16;
    const border = isPending ? "2px dashed rgba(59,130,246,0.9)" : "2px solid rgba(250, 247, 242, 0.9)";
    const background = isPending ? "rgba(59,130,246,0.75)" : color;
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${background};border:${border};box-shadow:0 0 12px rgba(0,0,0,0.45);"></div>`;
  }, []);


  useEffect(() => {
    imageUrlsRef.current = imageUrls;
  }, [imageUrls]);

useEffect(() => {
  fullImageUrlsRef.current = fullImageUrls;
}, [fullImageUrls]);

useEffect(() => {
  panoramaThumbnailUrlsRef.current = panoramaThumbnailUrls;
}, [panoramaThumbnailUrls]);

  useEffect(() => {
    panoramaUrlsRef.current = panoramaUrls;
  }, [panoramaUrls]);

  useEffect(() => {
    panoramaFetchErrorsRef.current = panoramaFetchErrors;
  }, [panoramaFetchErrors]);

  const panoramaMarkers = useMemo(() => {
    const markers: any[] = [];

    panoramaComments.forEach((comment) => {
      if (!comment?.hasValidPosition || typeof comment?.yaw !== 'number' || typeof comment?.pitch !== 'number') {
        return;
      }

      const yaw = comment.yaw;
      const pitch = comment.pitch;
      if (!Number.isFinite(yaw) || !Number.isFinite(pitch)) {
        return;
      }

      const isActive = selectedPanoramaCommentId === comment.id;
      const color = comment.isAdminComment ? "#38bdf8" : "#f97316";
      markers.push({
        id: `panorama-comment-${comment.id}`,
        longitude: comment.longitude ?? yaw,
        latitude: comment.latitude ?? pitch,
        position: {
          yaw,
          pitch,
        },
        html: createMarkerHtml(color, isActive),
        anchor: "bottom center",
        tooltip: comment.content,
        data: { commentId: comment.id }
      });
    });

    return markers;
  }, [panoramaComments, selectedPanoramaCommentId, createMarkerHtml]);

  useEffect(() => {
    if (!markersPluginInstance) {
      return;
    }

    const safeMarkers = panoramaMarkers.filter((marker) =>
      typeof marker.longitude === 'number' &&
      Number.isFinite(marker.longitude) &&
      typeof marker.latitude === 'number' &&
      Number.isFinite(marker.latitude)
    );

    const pluginAny = markersPluginInstance as any;

    const batchUpdate = (markers: any[]) => {
      if (typeof pluginAny.setMarkers === 'function') {
        pluginAny.setMarkers(markers);
        return;
      }

      if (typeof pluginAny.clearMarkers === 'function') {
        pluginAny.clearMarkers();
      }

      if (typeof pluginAny.addMarker === 'function') {
        markers.forEach((marker) => {
          try {
            pluginAny.addMarker(marker);
          } catch (addError) {
            console.error('Не удалось добавить маркер панорамы', marker, addError);
          }
        });
      }
    };

    batchUpdate(safeMarkers);
  }, [markersPluginInstance, panoramaMarkers]);

  useEffect(() => {
    if (!markersPluginInstance || typeof markersPluginInstance.on !== 'function') return;

    const handleSelectMarker = (event: any) => {
      const commentId = event?.marker?.config?.data?.commentId;
      if (!commentId) return;
      const comment = panoramaComments.find((item) => item.id === commentId);
      if (!comment) return;
      setSelectedPanoramaCommentId(commentId);
      if (comment.hasValidPosition && typeof comment.yaw === 'number' && typeof comment.pitch === 'number') {
        setPendingPanoramaCoords({ yaw: comment.yaw, pitch: comment.pitch });
        if (panoramaViewerRef.current?.animate) {
          panoramaViewerRef.current.animate({ yaw: comment.yaw, pitch: comment.pitch });
        }
      } else {
        setPendingPanoramaCoords(null);
      }
    };

    markersPluginInstance.on("select-marker", handleSelectMarker);

    return () => {
      if (typeof markersPluginInstance.off === 'function') {
        markersPluginInstance.off("select-marker", handleSelectMarker);
      }
    };
  }, [markersPluginInstance, panoramaComments]);

  const objectId = localStorage.getItem('selectedAdminObjectId');
  const selectedPanoramaSrc = useMemo(() => {
    if (!selectedPanorama) {
      return null;
    }

    return panoramaUrls[selectedPanorama.filename] ?? null;
  }, [selectedPanorama, panoramaUrls]);

  const selectedPanoramaPanoData = useMemo(() => {
    if (!selectedPanorama) {
      return null;
    }
    return getPanoramaViewerPanoData(selectedPanorama as any);
  }, [selectedPanorama]);

  const annotationsEnabled = !selectedPanoramaPanoData;

  const selectedPanoramaError = selectedPanorama ? panoramaFetchErrors[selectedPanorama.id] : undefined;
  const selectedPanoramaIsReady = Boolean(selectedPanoramaSrc);

  useEffect(() => {
    if (!selectedPanoramaPanoData) {
      return;
    }

    setPendingPanoramaCoords(null);
    setSelectedPanoramaCommentId(null);
  }, [selectedPanoramaPanoData]);

  useEffect(() => {
    const viewer = panoramaViewerRef.current;
    if (!viewer || typeof viewer.setPanorama !== 'function') {
      return;
    }
    if (!selectedPanorama || !selectedPanoramaSrc || !selectedPanoramaPanoData) {
      return;
    }

    let disposed = false;
    const maybePromise = viewer.setPanorama(selectedPanoramaSrc, { panoData: selectedPanoramaPanoData });

    if (maybePromise && typeof (maybePromise as Promise<unknown>).catch === 'function') {
      (maybePromise as Promise<unknown>).catch((error: unknown) => {
        if (!disposed) {
          console.error('Не удалось применить параметры панорамы:', error);
        }
      });
    }

    return () => {
      disposed = true;
    };
  }, [selectedPanorama, selectedPanoramaSrc, selectedPanoramaPanoData]);

  useEffect(() => {
    // Получаем информацию о заказчике из localStorage
    const customerData = localStorage.getItem('adminViewingCustomer');
    if (customerData) {
      setCustomer(JSON.parse(customerData));
    }
  }, []);

  // Загружаем объект и папки когда customer готов
  useEffect(() => {
    if (customer && objectId) {
      fetchObjectDetail();
      loadFolders();
    }
  }, [customer, objectId]);

  // Помечаем сообщения как прочитанные при открытии вкладки
  useEffect(() => {
    if (activeTab === 'messages' && objectId && customer) {
      markMessagesAsRead();
    }
  }, [activeTab, objectId, customer]);

  const markMessagesAsRead = async () => {
    if (!objectId || !customer) return;
    
    try {
      await fetch(`/api/messages/mark-read?email=${encodeURIComponent(customer.email)}&isAdmin=true&objectId=${objectId}`, {
        method: 'PATCH'
      });
    } catch (error) {
      console.error("Ошибка пометки сообщений:", error);
    }
  };

  const fetchObjectDetail = async () => {
    if (!objectId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/objects/${objectId}?userId=${customer?.id}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setObject(data.object);
        // Загружаем изображения с авторизацией
        await Promise.all([
          loadImagesWithAuth(data.object),
          loadPanoramasWithAuth(data.object)
        ]);
      } else {
        setError(data.message || "Не удалось загрузить объект");
      }
    } catch (err) {
      console.error('Ошибка загрузки объекта:', err);
      setError("Ошибка сети при загрузке объекта");
    } finally {
      setLoading(false);
    }
  };

  const loadImagesWithAuth = async (objectData: any) => {
    if (!objectData?.photos) {
      setImageUrls(prev => {
        Object.values(prev).forEach(url => {
          if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        });
        return {};
      });
      setFullImageUrls(prev => {
        Object.values(prev).forEach(url => {
          if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        });
        return {};
      });
      return;
    }

    const newPreviewUrls: {[key: string]: string} = {};
    const withAdminToken = (url: string) => {
      if (!url || !adminToken) return url || '';
      if (url.includes('/admin') && !url.includes('token=')) return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(adminToken)}`;
      return url;
    };

    for (const photo of objectData.photos) {
      if ((photo as any).mimeType?.startsWith('image/')) {
        const previewUrl = (photo as any).thumbnailUrl || (photo as any).url || `/api/uploads/objects/${objectData.id}/${photo.filename}/admin`;
        newPreviewUrls[photo.filename] = withAdminToken(previewUrl);
      }
    }

    setImageUrls(prev => {
      Object.values(prev).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      return newPreviewUrls;
    });

    const keepFilenames = new Set((objectData.photos || []).map((photo: any) => photo.filename));
    setFullImageUrls(prev => {
      const next: {[key: string]: string} = {};
      Object.entries(prev).forEach(([filename, url]) => {
        if (keepFilenames.has(filename)) {
          next[filename] = url;
        } else if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      return next;
    });
  };

  const loadPanoramasWithAuth = async (objectData: any) => {
    if (!objectData?.panoramas) {
      setPanoramaThumbnailUrls({});
      setPanoramaUrls(prev => {
        Object.values(prev).forEach(url => {
          if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        });
        return {};
      });
      setMissingPanoramaIds(new Set());
      setPanoramasReady(true);
      return;
    }

    setPanoramasReady(false);
    const newThumbnailUrls: { [key: string]: string } = {};
    const missing = new Set<number>();

    for (const panorama of objectData.panoramas) {
      if (!(panorama as any).mimeType?.startsWith('image/')) {
        continue;
      }

      const staticThumbnailPath =
        panorama.thumbnailFilePath ||
        (panorama.thumbnailFilename
          ? `/uploads/objects/${objectData.id}/panoramas/thumbnails/${panorama.thumbnailFilename}`
          : `/uploads/objects/${objectData.id}/panoramas/thumbnails/thumb-${panorama.filename}`);
      const previewUrl =
        (panorama as any).thumbnailUrl ||
        staticThumbnailPath ||
        (panorama as any).url ||
        `/uploads/objects/${objectData.id}/panoramas/${panorama.filename}`;

      if (previewUrl) {
        newThumbnailUrls[panorama.filename] = previewUrl;
      } else {
        missing.add(panorama.id);
      }
    }

    setPanoramaThumbnailUrls(newThumbnailUrls);
    setMissingPanoramaIds(missing);

    const keepFilenames = new Set((objectData.panoramas || []).map((panorama: any) => panorama.filename));
    setPanoramaUrls(prev => {
      const next: { [key: string]: string } = {};
      Object.entries(prev).forEach(([filename, url]) => {
        if (keepFilenames.has(filename)) {
          next[filename] = url;
        } else if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      return next;
    });

    setPanoramasReady(true);
  };

  const fetchPhotoOriginal = useCallback(async (photo: Photo) => {
    if (!photo) return;
    if (!(photo as any).mimeType?.startsWith('image/')) return;
    if (!object?.id) return;
    if (fullImageUrlsRef.current[photo.filename]) return;
    if (loadingPhotoIdsRef.current.has(photo.id)) return;

    loadingPhotoIdsRef.current.add(photo.id);
    setLoadingPhotoIds(new Set(loadingPhotoIdsRef.current));

    try {
      let response = await fetch(`/api/uploads/objects/${object.id}/${photo.filename}/admin`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        cache: 'force-cache',
      });

      if (!response.ok) {
        console.warn(`Не удалось загрузить оригинал фото ${photo.filename}:`, response.statusText);
        const fallbackResponse = await fetch(`/uploads/objects/${object.id}/${photo.filename}`, {
          cache: 'force-cache',
        });
        if (!fallbackResponse.ok) {
          console.warn(`Файл фото ${photo.filename} недоступен по статическому пути:`, fallbackResponse.statusText);
          return;
        }
        response = fallbackResponse;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      setFullImageUrls(prev => {
        const existing = prev[photo.filename];
        if (existing && existing.startsWith('blob:')) {
          URL.revokeObjectURL(existing);
        }
        return { ...prev, [photo.filename]: url };
      });
    } catch (error) {
      console.error('Ошибка загрузки оригинала фото:', error);
    } finally {
      loadingPhotoIdsRef.current.delete(photo.id);
      setLoadingPhotoIds(new Set(loadingPhotoIdsRef.current));
    }
  }, [adminToken, object?.id]);

  const fetchPanoramaOriginal = useCallback(async (panorama: Panorama) => {
    if (!panorama) return;
    if (!(panorama as any).mimeType?.startsWith('image/')) return;
    if (!object?.id) return;
    if (panoramaUrlsRef.current[panorama.filename]) return;
    if (loadingPanoramaIdsRef.current.has(panorama.id)) return;

    setPanoramaFetchErrors((prev) => {
      if (!(panorama.id in prev)) return prev;
      const next = { ...prev };
      delete next[panorama.id];
      return next;
    });

    loadingPanoramaIdsRef.current.add(panorama.id);
    setLoadingPanoramaIds(new Set(loadingPanoramaIdsRef.current));

    try {
      let response = await fetch(`/api/uploads/objects/${object.id}/panoramas/${panorama.filename}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        cache: 'force-cache',
      });

      if (!response.ok) {
        console.warn(`Не удалось загрузить оригинал панорамы ${panorama.filename}:`, response.statusText);
        const fallbackResponse = await fetch(`/uploads/objects/${object.id}/panoramas/${panorama.filename}`, {
          cache: 'force-cache',
        });
        if (!fallbackResponse.ok) {
          console.warn(`Файл панорамы ${panorama.filename} недоступен по статическому пути:`, fallbackResponse.statusText);
          setPanoramaFetchErrors((prev) => ({
            ...prev,
            [panorama.id]: 'Файл панорамы недоступен по API или статическому пути.',
          }));
          return;
        }
        response = fallbackResponse;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      setPanoramaUrls(prev => {
        const existing = prev[panorama.filename];
        if (existing && existing.startsWith('blob:')) {
          URL.revokeObjectURL(existing);
        }
        return { ...prev, [panorama.filename]: url };
      });
      setPanoramaFetchErrors((prev) => {
        if (!(panorama.id in prev)) return prev;
        const next = { ...prev };
        delete next[panorama.id];
        return next;
      });

      const needsAnalysis =
        !panorama.originalWidth ||
        !panorama.originalHeight ||
        !panorama.projectionType ||
        panorama.projectionType === 'UNKNOWN';

      if (needsAnalysis) {
        const analysisImage = new Image();
        analysisImage.onload = () => {
          const width = analysisImage.naturalWidth;
          const height = analysisImage.naturalHeight;
          if (!width || !height) {
            return;
          }

          const inferredProjection = classifyPanoramaProjection(width, height);

          setSelectedPanorama(prev => {
            if (!prev || prev.id !== panorama.id) {
              return prev;
            }

            const nextWidth = prev.originalWidth ?? width;
            const nextHeight = prev.originalHeight ?? height;
            const nextProjection =
              prev.projectionType && prev.projectionType !== 'UNKNOWN'
                ? prev.projectionType
                : inferredProjection;

            return {
              ...prev,
              originalWidth: nextWidth,
              originalHeight: nextHeight,
              projectionType: nextProjection,
            };
          });
        };
        analysisImage.src = url;
      }
    } catch (error) {
      console.error('Ошибка загрузки оригинала панорамы:', error);
      const message = error instanceof Error ? error.message : 'Не удалось загрузить панораму.';
      setPanoramaFetchErrors((prev) => ({
        ...prev,
        [panorama.id]: message,
      }));
    } finally {
      loadingPanoramaIdsRef.current.delete(panorama.id);
      setLoadingPanoramaIds(new Set(loadingPanoramaIdsRef.current));
    }
  }, [adminToken, object?.id]);

  useEffect(() => {
    if (selectedPhoto) {
      fetchPhotoOriginal(selectedPhoto);
    }
  }, [selectedPhoto, fetchPhotoOriginal]);

  const retryPanoramaFetch = useCallback(() => {
    if (!selectedPanorama) return;
    fetchPanoramaOriginal(selectedPanorama);
  }, [selectedPanorama, fetchPanoramaOriginal]);

  useEffect(() => {
    if (selectedPanorama) {
      fetchPanoramaOriginal(selectedPanorama);
    }
  }, [selectedPanorama, fetchPanoramaOriginal]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !objectId) return;
    
    setSendingMessage(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          objectId: parseInt(objectId),
          isAdminMessage: true
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setNewMessage('');
        // Обновляем список сообщений
        await fetchObjectDetail();
      } else {
        console.error('Ошибка отправки сообщения:', data.message);
      }
    } catch (err) {
      console.error('Ошибка отправки сообщения:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  const handlePhotosUpdate = () => {
    fetchObjectDetail();
    loadFolders(); // Обновляем папки при обновлении фото
  };

  const handlePanoramasUpdate = () => {
    fetchObjectDetail();
  };

  // Загрузка папок
  const loadFolders = async () => {
    if (!objectId) return;
    
    setLoadingFolders(true);
    try {
      const response = await fetch(`/api/admin/objects/${objectId}/folders`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error("Ошибка загрузки папок:", error);
    } finally {
      setLoadingFolders(false);
    }
  };

  // Назначить фото в папку (временное состояние)
  const assignPhotoToFolder = (photoId: number, folderId: number | null) => {
    setTempSelectedFolder(folderId);
  };

  // Сохранить назначение папки
  const savePhotoFolderAssignment = async (photoId: number, folderId: number | null) => {
    if (!objectId) return;

    try {
      const response = await fetch(`/api/admin/objects/${objectId}/photos/${photoId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ folderId }),
      });

      const data = await response.json();
      if (data.success) {
        // Обновляем состояние объекта с новыми данными
        if (object) {
          setObject(prevObject => ({
            ...prevObject!,
            photos: prevObject!.photos.map(photo => 
              photo.id === photoId 
                ? { 
                    ...photo, 
                    folderId: data.photo.folderId,
                    folder: data.photo.folderId ? { id: data.photo.folderId, name: data.photo.folderName || '' } : null
                  }
                : photo
            )
          }));
        }
        
        // Обновляем selectedPhoto если оно открыто
        if (selectedPhoto && selectedPhoto.id === photoId) {
          setSelectedPhoto({
            ...selectedPhoto,
            folderId: data.photo.folderId,
            folder: data.photo.folderId ? { id: data.photo.folderId, name: data.photo.folderName || '' } : null
          } as any);
        }
        
        // Обновляем список папок
        loadFolders();
      } else {
        alert(data.message || "Ошибка назначения фото в папку");
      }
    } catch (error) {
      console.error("Ошибка назначения фото:", error);
      alert("Ошибка назначения фото в папку");
    }
  };

  const handleCreateProject = async () => {
    const title = prompt('Введите название проекта:');
    if (!title) return;

    const description = prompt('Введите описание проекта (необязательно):') || '';

    try {
      const response = await fetch(`/api/admin/objects/${objectId}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ title, description })
      });

      const result = await response.json();

      if (result.success) {
        // Обновляем данные объекта
        await fetchObjectDetail();
      } else {
        alert(`Ошибка создания проекта: ${result.message}`);
      }
    } catch (error) {
      console.error('Ошибка создания проекта:', error);
      alert('Ошибка создания проекта');
    }
  };

  // Оптимистичное обновление видимости фото
  const togglePhotoVisibility = async (photoId: number, newVisibility: boolean) => {
    // Добавляем фото в список обновляющихся
    setUpdatingPhotos(prev => new Set(prev).add(photoId));
    
    // Сначала обновляем локальное состояние
    if (object) {
      setObject(prevObject => ({
        ...prevObject!,
        photos: prevObject!.photos.map(photo => 
          photo.id === photoId 
            ? { ...photo, isVisibleToCustomer: newVisibility }
            : photo
        )
      }));
    }

    // Затем отправляем запрос на сервер
    try {
      const response = await fetch(`/api/admin/objects/${object?.id}/photos`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          photoId,
          isVisibleToCustomer: newVisibility
        }),
      });
      
      const data = await response.json();
      if (!data.success) {
        // Если запрос не удался, откатываем изменения
        if (object) {
          setObject(prevObject => ({
            ...prevObject!,
            photos: prevObject!.photos.map(photo => 
              photo.id === photoId 
                ? { ...photo, isVisibleToCustomer: !newVisibility }
                : photo
            )
          }));
        }
        alert('Ошибка: ' + data.message);
      }
    } catch (error) {
      // Если запрос не удался, откатываем изменения
      if (object) {
        setObject(prevObject => ({
          ...prevObject!,
          photos: prevObject!.photos.map(photo => 
            photo.id === photoId 
              ? { ...photo, isVisibleToCustomer: !newVisibility }
              : photo
          )
        }));
      }
      alert('Ошибка сети');
    } finally {
      // Убираем фото из списка обновляющихся
      setUpdatingPhotos(prev => {
        const newSet = new Set(prev);
        newSet.delete(photoId);
        return newSet;
      });
    }
  };

  const togglePanoramaVisibility = async (panoramaId: number, newVisibility: boolean) => {
    setUpdatingPanoramas(prev => new Set(prev).add(panoramaId));

    if (object) {
      setObject(prevObject => ({
        ...prevObject!,
        panoramas: prevObject!.panoramas.map(panorama =>
          panorama.id === panoramaId
            ? { ...panorama, isVisibleToCustomer: newVisibility }
            : panorama
        )
      }));
    }

    try {
      const response = await fetch(`/api/admin/objects/${object?.id}/panoramas`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ panoramaId, isVisibleToCustomer: newVisibility }),
      });

      const data = await response.json();
      if (!data.success) {
        if (object) {
          setObject(prevObject => ({
            ...prevObject!,
            panoramas: prevObject!.panoramas.map(panorama =>
              panorama.id === panoramaId
                ? { ...panorama, isVisibleToCustomer: !newVisibility }
                : panorama
            )
          }));
        }
        alert('Ошибка: ' + data.message);
      }
    } catch (error) {
      if (object) {
        setObject(prevObject => ({
          ...prevObject!,
          panoramas: prevObject!.panoramas.map(panorama =>
            panorama.id === panoramaId
              ? { ...panorama, isVisibleToCustomer: !newVisibility }
              : panorama
          )
        }));
      }
      alert('Ошибка сети');
    } finally {
      setUpdatingPanoramas(prev => {
        const newSet = new Set(prev);
        newSet.delete(panoramaId);
        return newSet;
      });
    }
  };

  // Удаление фото
  const deletePhoto = async (photoId: number) => {
    setDeleteType('photo');
    setDeleteId(photoId);
    setShowDeleteConfirm(true);
  };

  const deletePanorama = async (panoramaId: number) => {
    setDeleteType('panorama');
    setDeleteId(panoramaId);
    setShowDeleteConfirm(true);
  };

  const confirmDeletePhoto = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/admin/objects/${object?.id}/photos`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ photoId: deleteId })
      });

      if (!response.ok) {
        throw new Error('Ошибка удаления фото');
      }

      // Обновляем локальное состояние
      if (object) {
        setObject(prevObject => ({
          ...prevObject!,
          photos: prevObject!.photos.filter(photo => photo.id !== deleteId)
        }));
      }

      setShowDeleteConfirm(false);
      setDeleteType(null);
      setDeleteId(null);

    } catch (error) {
      console.error('Ошибка удаления фото:', error);
      alert('Ошибка удаления фото');
    }
  };

  const confirmDeletePanorama = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/admin/objects/${object?.id}/panoramas`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ panoramaId: deleteId })
      });

      if (!response.ok) {
        throw new Error('Ошибка удаления панорамы');
      }

      if (object) {
        const panoramaToRemove = object.panoramas.find(p => p.id === deleteId);

        setObject(prevObject => ({
          ...prevObject!,
          panoramas: prevObject!.panoramas.filter(panorama => panorama.id !== deleteId)
        }));

        if (panoramaToRemove) {
          setPanoramaUrls(prev => {
            const updated = { ...prev };
            delete updated[panoramaToRemove.filename];
            return updated;
          });
        }
      }

      if (selectedPanorama && selectedPanorama.id === deleteId) {
        setSelectedPanorama(null);
      }

      setShowDeleteConfirm(false);
      setDeleteType(null);
      setDeleteId(null);

    } catch (error) {
      console.error('Ошибка удаления панорамы:', error);
      alert('Ошибка удаления панорамы');
    }
  };

  // Удаление документа
  const deleteDocument = async (documentId: number) => {
    setDeleteType('document');
    setDeleteId(documentId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteDocument = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/admin/objects/${object?.id}/documents?documentId=${deleteId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка удаления документа');
      }

      // Обновляем локальное состояние
      if (object) {
        setObject(prevObject => ({
          ...prevObject!,
          documents: prevObject!.documents.filter(doc => doc.id !== deleteId)
        }));
      }

      setShowDeleteConfirm(false);
      setDeleteType(null);
      setDeleteId(null);

    } catch (error) {
      console.error('Ошибка удаления документа:', error);
      alert('Ошибка удаления документа');
    }
  };

  // Удаление сообщения
  const deleteMessage = async (messageId: number) => {
    setDeleteType('message');
    setDeleteId(messageId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteMessage = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/messages?messageId=${deleteId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка удаления сообщения');
      }

      // Обновляем локальное состояние
      if (object) {
        setObject(prevObject => ({
          ...prevObject!,
          messages: prevObject!.messages.filter(msg => msg.id !== deleteId)
        }));
      }

      setShowDeleteConfirm(false);
      setDeleteType(null);
      setDeleteId(null);

    } catch (error) {
      console.error('Ошибка удаления сообщения:', error);
      alert('Ошибка удаления сообщения');
    }
  };

  // Универсальная функция подтверждения удаления
  const handleConfirmDelete = async () => {
    switch (deleteType) {
      case 'photo':
        await confirmDeletePhoto();
        break;
      case 'document':
        await confirmDeleteDocument();
        break;
      case 'message':
        await confirmDeleteMessage();
        break;
      case 'panorama':
        await confirmDeletePanorama();
        break;
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteType(null);
    setDeleteId(null);
  };

  const fetchPhotoComments = async (photoId: number) => {
    try {
      const response = await fetch(`/api/photo-comments?photoId=${photoId}`);
      const data = await response.json();
      if (data.success) {
        setPhotoComments(data.comments);
        // Помечаем комментарии к этому фото как прочитанные админом
        markPhotoCommentsAsRead(photoId);
      }
    } catch (err) {
      console.error('Ошибка загрузки комментариев к фото:', err);
    }
  };

  const markPhotoCommentsAsRead = async (photoId: number) => {
    if (!customer) return;
    
    try {
      await fetch(`/api/photo-comments/mark-read?email=${encodeURIComponent(customer.email)}&isAdmin=true&photoId=${photoId}`, {
        method: 'PATCH'
      });
    } catch (error) {
      console.error("Ошибка пометки комментариев:", error);
    }
  };

  const markPanoramaCommentsAsRead = async (panoramaId: number) => {
    if (!customer) return;
    if (panoramaCommentsReadRef.current.has(panoramaId)) return;

    try {
      await fetch(`/api/panorama-comments/mark-read?email=${encodeURIComponent(customer.email)}&isAdmin=true&panoramaId=${panoramaId}`, {
        method: 'PATCH'
      });

      panoramaCommentsReadRef.current.add(panoramaId);

      setObject(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          panoramas: prev.panoramas.map(p =>
            p.id === panoramaId ? { ...p, unreadCommentsCount: 0 } : p
          )
        };
      });

      setSelectedPanorama(prev => {
        if (!prev || prev.id !== panoramaId) return prev;
        return { ...prev, unreadCommentsCount: 0 } as any;
      });
    } catch (error) {
      console.error("Ошибка пометки комментариев панорамы:", error);
    }
  };

  const fetchPanoramaComments = async (panoramaId: number) => {
    try {
      const response = await fetch(`/api/panorama-comments?panoramaId=${panoramaId}`);
      const data = await response.json();
      if (data.success) {
        const normalizedComments = Array.isArray(data.comments)
          ? data.comments.map((comment: any) => {
              const rawYaw = typeof comment?.yaw === 'number' ? comment.yaw : Number(comment?.yaw);
              const rawPitch = typeof comment?.pitch === 'number' ? comment.pitch : Number(comment?.pitch);
              const hasValidPosition = Number.isFinite(rawYaw) && Number.isFinite(rawPitch);

              return {
                ...comment,
                yaw: hasValidPosition ? rawYaw : null,
                pitch: hasValidPosition ? rawPitch : null,
                longitude: hasValidPosition ? rawYaw : undefined,
                latitude: hasValidPosition ? rawPitch : undefined,
                hasValidPosition,
              };
            })
          : [];

        setPanoramaComments(normalizedComments);
        const hasUnreadForAdmin = Array.isArray(data.comments) && data.comments.some((comment: any) => !comment.isAdminComment && comment.isReadByAdmin === false);
        if (hasUnreadForAdmin) {
          panoramaCommentsReadRef.current.delete(panoramaId);
        }
        markPanoramaCommentsAsRead(panoramaId);
      }
    } catch (error) {
      console.error('Ошибка загрузки комментариев к панораме:', error);
    }
  };

  const sendPanoramaComment = async () => {
    const trimmed = newPanoramaComment.trim();
    if (!trimmed || !selectedPanorama) {
      return;
    }

    let yaw: number | undefined;
    let pitch: number | undefined;

    if (annotationsEnabled) {
      if (!pendingPanoramaCoords) {
        alert('Сначала выберите точку на панораме.');
        return;
      }

      const rawYaw = Number(pendingPanoramaCoords.yaw);
      const rawPitch = Number(pendingPanoramaCoords.pitch);

      if (!Number.isFinite(rawYaw) || !Number.isFinite(rawPitch)) {
        alert('Не удалось определить позицию на панораме. Выберите точку ещё раз.');
        return;
      }

      yaw = rawYaw;
      pitch = rawPitch;
    }

    setSendingPanoramaComment(true);
    try {
      const payload: Record<string, unknown> = {
        panoramaId: selectedPanorama.id,
        content: trimmed,
      };

      if (typeof yaw === 'number' && typeof pitch === 'number') {
        payload.yaw = yaw;
        payload.pitch = pitch;
      }

      const response = await fetch('/api/panorama-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.success) {
        setNewPanoramaComment('');
        if (annotationsEnabled) {
          setPendingPanoramaCoords(null);
        }
        setSelectedPanoramaCommentId(data.comment.id);
        await fetchPanoramaComments(selectedPanorama.id);
      } else {
        console.error('Ошибка отправки комментария к панораме:', data.message);
      }
    } catch (error) {
      console.error('Ошибка отправки комментария к панораме:', error);
    } finally {
      setSendingPanoramaComment(false);
    }
  };

  const deletePanoramaComment = async (commentId: number) => {
    if (!selectedPanorama) return;

    const confirmed = typeof window !== 'undefined'
      ? window.confirm('Удалить этот комментарий?')
      : true;

    if (!confirmed) return;

    setDeletingPanoramaCommentIds(prev => {
      const updated = new Set(prev);
      updated.add(commentId);
      return updated;
    });

    try {
      const response = await fetch(`/api/panorama-comments?commentId=${commentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setPanoramaComments(prev => prev.filter(comment => comment.id !== commentId));
        if (selectedPanoramaCommentId === commentId) {
          setSelectedPanoramaCommentId(null);
          setPendingPanoramaCoords(null);
        }
        await fetchPanoramaComments(selectedPanorama.id);
      } else {
        console.error('Ошибка удаления комментария панорамы:', data.message);
      }
    } catch (error) {
      console.error('Ошибка удаления комментария панорамы:', error);
    } finally {
      setDeletingPanoramaCommentIds(prev => {
        const updated = new Set(prev);
        updated.delete(commentId);
        return updated;
      });
    }
  };

  const handlePanoramaReady = useCallback((viewer: any) => {
    panoramaViewerRef.current = viewer;
    const plugin = viewer.getPlugin(MarkersPlugin);
    if (plugin) {
      setMarkersPluginInstance(plugin);
    }
  }, []);

  const handlePanoramaClick = useCallback((event: any) => {
    if (!selectedPanorama) return;
    const panoData = getPanoramaViewerPanoData(selectedPanorama as any);
    if (panoData) {
      return;
    }

    const data = (event && (event.data || {})) || {};
    const originalEvent = data?.originalEvent || event?.originalEvent || event;

    const isRightClick = data.rightclick === true || originalEvent?.button === 2;
    if (!isRightClick) {
      return;
    }

    const longitude = [event?.longitude, event?.yaw, data.longitude, data.yaw]
      .find((value) => typeof value === 'number') as number | undefined;
    const latitude = [event?.latitude, event?.pitch, data.latitude, data.pitch]
      .find((value) => typeof value === 'number') as number | undefined;

    if (typeof longitude !== 'number' || typeof latitude !== 'number') {
      return;
    }

    setPendingPanoramaCoords({ yaw: longitude, pitch: latitude });
    setSelectedPanoramaCommentId(null);
  }, [selectedPanorama]);

  const handlePanoramaContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
  }, []);

  const focusOnPanoramaComment = useCallback((comment: any) => {
    setSelectedPanoramaCommentId(comment.id);
    if (comment.hasValidPosition && typeof comment.yaw === 'number' && typeof comment.pitch === 'number') {
      setPendingPanoramaCoords({ yaw: comment.yaw, pitch: comment.pitch });
      if (panoramaViewerRef.current?.animate) {
        panoramaViewerRef.current.animate({ yaw: comment.yaw, pitch: comment.pitch });
      }
    } else {
      setPendingPanoramaCoords(null);
    }
  }, []);

  const toDegrees = (value: number | null | undefined) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return '—';
    }
    return (value * 180 / Math.PI).toFixed(1);
  };

  const sendPhotoComment = async () => {
    if (!newPhotoComment.trim() || !selectedPhoto) return;
    
    setSendingPhotoComment(true);
    try {
      const response = await fetch('/api/photo-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          photoId: selectedPhoto.id,
          content: newPhotoComment.trim()
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setNewPhotoComment('');
        // Обновляем список комментариев
        await fetchPhotoComments(selectedPhoto.id);
      } else {
        console.error('Ошибка отправки комментария:', data.message);
      }
    } catch (err) {
      console.error('Ошибка отправки комментария:', err);
    } finally {
      setSendingPhotoComment(false);
    }
  };

  useEffect(() => {
    if (objectId && customer && adminToken) {
      fetchObjectDetail();
    }
  }, [objectId, customer, adminToken]);

  // Загружаем комментарии при открытии фото
  useEffect(() => {
    if (selectedPhoto) {
      fetchPhotoComments(selectedPhoto.id);
    }
  }, [selectedPhoto]);

  useEffect(() => {
    if (!selectedPanorama) {
      setPanoramaComments([]);
      setNewPanoramaComment('');
      setPendingPanoramaCoords(null);
      setSelectedPanoramaCommentId(null);
      setMarkersPluginInstance(null);
      panoramaViewerRef.current = null;
      lastFetchedPanoramaIdRef.current = null;
      return;
    }

    const isSamePanorama = lastFetchedPanoramaIdRef.current === selectedPanorama.id;

    if (!isSamePanorama) {
      setPanoramaComments([]);
      setNewPanoramaComment('');
      setPendingPanoramaCoords(null);
      setSelectedPanoramaCommentId(null);
    }

    lastFetchedPanoramaIdRef.current = selectedPanorama.id;
    fetchPanoramaComments(selectedPanorama.id);
  }, [selectedPanorama]);

  useEffect(() => {
    if (!selectedPanorama || !object) return;
    const updated = object.panoramas.find(p => p.id === selectedPanorama.id);
    if (!updated) return;

    setSelectedPanorama(prev => {
      if (!prev || prev.id !== updated.id) return prev;
      const unreadPrev = (prev as any).unreadCommentsCount ?? 0;
      const unreadNext = (updated as any).unreadCommentsCount ?? 0;
      if (prev.isVisibleToCustomer === updated.isVisibleToCustomer && unreadPrev === unreadNext) {
        return prev;
      }
      return { ...prev, ...updated } as any;
    });
  }, [object, selectedPanorama?.id]);

  // Очистка blob URLs при размонтировании
  useEffect(() => {
    return () => {
      Object.values(imageUrlsRef.current).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      Object.values(fullImageUrlsRef.current).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      Object.values(panoramaUrlsRef.current).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'IN_PROGRESS':
        return 'rgba(59, 130, 246, 0.8)';
      case 'COMPLETED':
        return 'rgba(34, 197, 94, 0.8)';
      case 'PLANNING':
        return 'rgba(245, 158, 11, 0.8)';
      case 'ON_HOLD':
        return 'rgba(239, 68, 68, 0.8)';
      default:
        return 'rgba(59, 130, 246, 0.8)';
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", color: "white", padding: "40px" }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "3px solid rgba(250, 247, 242, 0.3)",
          borderTop: "3px solid white",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto 20px"
        }}></div>
        <p style={{ fontFamily: "Arial, sans-serif" }}>Загрузка объекта...</p>
      </div>
    );
  }

  if (error || !object) {
    return (
      <div style={{
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        borderRadius: "12px",
        padding: "24px",
        textAlign: "center",
        color: "white",
        backdropFilter: "blur(10px)"
      }}>
        <p style={{ fontFamily: "Arial, sans-serif" }}>❌ {error || "Объект не найден"}</p>
        <button
          onClick={() => setMode("admin-objects")}
          style={{
            marginTop: "16px",
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "rgba(59, 130, 246, 0.8)",
            color: "white",
            fontFamily: "Arial, sans-serif",
            cursor: "pointer"
          }}
        >
          ← Назад к объектам
        </button>
      </div>
    );
  }

  return (
    <div className="admin-object-detail-container" style={{ 
      maxWidth: "1200px", 
      margin: "0 auto",
      paddingTop: "200px" // СДВИНУЛ ЕЩЕ БОЛЬШЕ!
    }}>
      {/* Заголовок */}
      <div style={{
        marginBottom: "32px",
        color: "white",
        marginTop: "50px" // СДВИНУЛ ЗАГОЛОВОК ВНИЗ!
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "16px"
        }}>
          <button
            onClick={() => setMode("admin-objects")}
            style={{
              background: "none",
              border: "none",
              color: "rgba(250, 247, 242, 0.8)",
              fontSize: "1.5rem",
              cursor: "pointer",
              marginRight: "16px",
              padding: "8px",
              borderRadius: "6px",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(250, 247, 242, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            ←
          </button>
          <h2 style={{
            fontFamily: "var(--font-jost), sans-serif",
            fontSize: "2rem",
            margin: 0
          }}>
            {object?.title}
          </h2>
        </div>
        <div style={{
          marginLeft: "48px",
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        }}>
          {object?.description && (
            <p style={{
              fontFamily: "Arial, sans-serif",
              fontSize: "1rem",
              color: "rgba(250, 247, 242, 0.8)",
              margin: 0
            }}>
              {object?.description}
            </p>
          )}
          {object?.address && (
            <p style={{
              fontFamily: "Arial, sans-serif",
              fontSize: "0.9rem",
              color: "rgba(250, 247, 242, 0.6)",
              margin: 0
            }}>
              📍 {object?.address}
            </p>
          )}
          <p style={{
            fontFamily: "Arial, sans-serif",
            fontSize: "0.9rem",
            color: "rgba(250, 247, 242, 0.7)",
            margin: 0
          }}>
            Заказчик: {object?.user?.name || object?.user?.email}
          </p>
        </div>
      </div>

      {/* Табы */}
      <div style={{
        display: "flex",
        gap: "12px",
        marginBottom: "32px",
        marginLeft: "48px",
        flexWrap: "wrap",
        padding: "4px",
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderRadius: "12px",
        backdropFilter: "blur(10px)"
      }}>
        {[
          { key: 'all-photos', label: 'Все фото', count: object?.photos?.length || 0, icon: '' },
          { key: 'customer-photos', label: 'Фото для заказчика', count: object?.photos?.filter(p => p.isVisibleToCustomer).length || 0, icon: '' },
          { key: 'panoramas', label: 'Панорамы', count: object?.panoramas?.length || 0, icon: '' },
          { key: 'projects', label: 'Проекты', count: object.projects?.flatMap(project => project.documents || []).length || 0, icon: '' },
          { key: 'payments', label: 'Статусы оплаты', count: 0, icon: '' }, // Пока заглушка
          { key: 'messages', label: 'Сообщения', count: object.messages?.length || 0, icon: '' },
          { key: 'documents', label: 'Документы', count: object.documents?.length || 0, icon: '' },
          { key: 'models', label: '3D Модели', count: object?.bimModels?.length || 0, icon: '' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: "12px 20px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: activeTab === tab.key ? "rgba(59, 130, 246, 0.9)" : "rgba(255, 255, 255, 0.1)",
              color: "white",
              fontFamily: "Arial, sans-serif",
              cursor: "pointer",
              transition: "all 0.3s ease",
              fontSize: "0.9rem",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minWidth: "140px",
              justifyContent: "center"
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.key) {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.key) {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.transform = "translateY(0)";
              }
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>{tab.icon}</span>
            <span>{tab.label}</span>
            <span style={{
              backgroundColor: activeTab === tab.key ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.2)",
              color: "white",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "0.75rem",
              fontWeight: "600",
              minWidth: "20px",
              textAlign: "center"
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Контент табов */}
      <div style={{ marginLeft: "48px" }}>
        {activeTab === 'all-photos' && (
          <div>
            <AllPhotosPanel 
              objectId={objectId || "0"} 
              adminToken={adminToken} 
              onPhotosUpdate={handlePhotosUpdate} 
            />
            
            {/* Сетка фотографий с превью */}
            {object.photos && object.photos.length > 0 ? (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "20px",
                marginTop: "24px"
              }}>
                {object.photos.map((photo) => (
                  <div
                    key={photo.id}
                    onClick={() => {
                      setSelectedPhoto(photo);
                      setTempSelectedFolder((photo as any).folderId || null);
                    }}
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      borderRadius: "16px",
                      padding: "0",
                      backdropFilter: "blur(10px)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      overflow: "hidden",
                      transition: "all 0.3s ease",
                      cursor: "pointer"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* Превью изображения */}
                    <div style={{
                      width: "100%",
                      height: "200px",
                      backgroundColor: "rgba(0,0,0,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      overflow: "hidden"
                    }}>
                      {(photo as any).mimeType?.startsWith('image/') ? (
                        <img
                          src={(() => { const u = (photo as any).thumbnailUrl || imageUrls[photo.filename] || (photo as any).url || `/api/uploads/objects/${object.id}/${photo.filename}/admin`; return u && u.includes('/admin') && adminToken && !u.includes('token=') ? `${u}${u.includes('?') ? '&' : '?'}token=${encodeURIComponent(adminToken)}` : u; })()}
                          alt={photo.originalName}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover"
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            (e.currentTarget.nextElementSibling as HTMLElement)?.style && ((e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex");
                          }}
                        />
                      ) : null}
                      <div style={{
                        display: (photo as any).mimeType?.startsWith('image/') ? "none" : "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        height: "100%",
                        fontSize: "3rem"
                      }}>
                        {(photo as any).mimeType?.startsWith('video/') ? '🎥' : '📷'}
                      </div>
                      
                      {/* Статус видимости */}
                      <div style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        backgroundColor: photo.isVisibleToCustomer ? "rgba(34, 197, 94, 0.9)" : "rgba(239, 68, 68, 0.9)",
                        color: "white",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontFamily: "Arial, sans-serif",
                        fontWeight: "600"
                      }}>
                        {photo.isVisibleToCustomer ? "Видно" : "Скрыто"}
                      </div>

                      {/* Бейдж с новыми комментариями */}
                      {((photo as any).unreadCommentsCount || 0) > 0 && (
                        <div style={{
                          position: "absolute",
                          top: "8px",
                          left: "8px",
                          backgroundColor: "rgba(239, 68, 68, 0.95)",
                          color: "white",
                          padding: "6px 10px",
                          borderRadius: "16px",
                          fontSize: "0.75rem",
                          fontFamily: "Arial, sans-serif",
                          fontWeight: "700",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          boxShadow: "0 2px 8px rgba(239, 68, 68, 0.5)"
                        }}>
                          💬 {(photo as any).unreadCommentsCount}
                        </div>
                      )}
                    </div>
                    
                    {/* Информация о файле */}
                    <div style={{ padding: "16px" }}>
                      <h4 style={{
                        fontFamily: "Arial, sans-serif",
                        fontSize: "0.9rem",
                        color: "white",
                        margin: "0 0 8px 0",
                        fontWeight: "600",
                        wordBreak: "break-word"
                      }}>
                        {photo.originalName}
                      </h4>
                      
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px"
                      }}>
                        <span style={{
                          fontSize: "0.75rem",
                          color: "rgba(250, 247, 242, 0.7)",
                          fontFamily: "Arial, sans-serif"
                        }}>
                          {formatDate(photo.uploadedAt)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePhotoVisibility(photo.id, !photo.isVisibleToCustomer);
                          }}
                          disabled={updatingPhotos.has(photo.id)}
                          style={{
                            background: photo.isVisibleToCustomer ? "rgba(239, 68, 68, 0.8)" : "rgba(34, 197, 94, 0.8)",
                            border: "none",
                            color: "white",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            fontFamily: "Arial, sans-serif",
                            cursor: updatingPhotos.has(photo.id) ? "not-allowed" : "pointer",
                            opacity: updatingPhotos.has(photo.id) ? 0.6 : 1,
                            transition: "all 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                          onMouseEnter={(e) => {
                            if (!updatingPhotos.has(photo.id)) {
                              e.currentTarget.style.opacity = "0.8";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!updatingPhotos.has(photo.id)) {
                              e.currentTarget.style.opacity = "1";
                            }
                          }}
                        >
                          {updatingPhotos.has(photo.id) ? (
                            <>
                              <div style={{
                                width: "12px",
                                height: "12px",
                                border: "2px solid rgba(250, 247, 242, 0.3)",
                                borderTop: "2px solid white",
                                borderRadius: "50%",
                                animation: "spin 1s linear infinite"
                              }}></div>
                              Обновление...
                            </>
                          ) : (
                            photo.isVisibleToCustomer ? "Скрыть" : "Показать"
                          )}
                        </button>
                      </div>

                      {/* Информация о папке */}
                      {(photo as any).folder && (
                        <div style={{ 
                          marginBottom: "12px",
                          padding: "8px",
                          background: "rgba(201, 169, 110,  0.15)",
                          borderRadius: "6px",
                          border: "1px solid rgba(201, 169, 110,  0.3)"
                        }}>
                          <div style={{
                            fontSize: "0.75rem",
                            color: "rgba(250, 247, 242, 0.7)",
                            marginBottom: "2px",
                            fontFamily: "Arial, sans-serif"
                          }}>
                            📁 Папка:
                          </div>
                          <div style={{
                            fontSize: "0.85rem",
                            color: "#d3a373",
                            fontWeight: 600,
                            fontFamily: "Arial, sans-serif"
                          }}>
                            {(photo as any).folder.name}
                          </div>
                        </div>
                      )}

                      <div style={{
                        display: "flex",
                        gap: "8px"
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePhoto(photo.id);
                          }}
                          style={{
                            flex: 1,
                            background: "rgba(239, 68, 68, 0.8)",
                            border: "none",
                            color: "white",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            fontFamily: "Arial, sans-serif",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            marginLeft: "8px"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = "0.8";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = "1";
                          }}
                        >
                          🗑️ Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: "center",
                color: "rgba(250, 247, 242, 0.6)",
                padding: "60px 20px",
                fontFamily: "Arial, sans-serif"
              }}>
                <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📷</div>
                <p style={{ fontSize: "1.2rem", marginBottom: "8px" }}>Пока нет фотографий</p>
                <p style={{ fontSize: "0.9rem" }}>Загрузите фотографии через панель выше</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'customer-photos' && (
          <div>
            {/* Панель загрузки */}
            <CustomerPhotosPanel 
              objectId={object.id} 
              adminToken={adminToken}
              onPhotosUpdate={handlePhotosUpdate}
              onFolderSelect={setSelectedCustomerFolder}
              selectedFolder={selectedCustomerFolder}
            />

            {/* Сетка фото для заказчика */}
            {(() => {
              // Фильтруем фото в зависимости от выбранной папки
              let filteredPhotos = object.photos.filter(p => p.isVisibleToCustomer);
              
              if (selectedCustomerFolder !== null) {
                // Если выбрана конкретная папка, показываем только фото из этой папки
                filteredPhotos = filteredPhotos.filter(photo => 
                  (photo as any).folderId === selectedCustomerFolder
                );
              }
              
              return filteredPhotos.length > 0 ? (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "20px",
                  marginTop: "24px"
                }}>
                  {filteredPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    onClick={() => {
                      setSelectedPhoto(photo);
                      setTempSelectedFolder((photo as any).folderId || null);
                    }}
                    style={{
                      backgroundColor: "rgba(34, 197, 94, 0.1)",
                      borderRadius: "16px",
                      padding: "0",
                      backdropFilter: "blur(10px)",
                      border: "1px solid rgba(34, 197, 94, 0.3)",
                      overflow: "hidden",
                      transition: "all 0.3s ease",
                      cursor: "pointer"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 8px 32px rgba(34, 197, 94, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* Превью изображения */}
                    <div style={{
                      width: "100%",
                      height: "200px",
                      backgroundColor: "rgba(0,0,0,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      overflow: "hidden"
                    }}>
                      {(photo as any).mimeType?.startsWith('image/') ? (
                        <img
                          src={(() => { const u = (photo as any).thumbnailUrl || imageUrls[photo.filename] || (photo as any).url || `/api/uploads/objects/${object.id}/${photo.filename}/admin`; return u && u.includes('/admin') && adminToken && !u.includes('token=') ? `${u}${u.includes('?') ? '&' : '?'}token=${encodeURIComponent(adminToken)}` : u; })()}
                          alt={photo.originalName}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover"
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            (e.currentTarget.nextElementSibling as HTMLElement)?.style && ((e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex");
                          }}
                        />
                      ) : null}
                      <div style={{
                        display: (photo as any).mimeType?.startsWith('image/') ? "none" : "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        height: "100%",
                        fontSize: "3rem"
                      }}>
                        {(photo as any).mimeType?.startsWith('video/') ? '🎥' : '📷'}
                      </div>
                      
                      {/* Статус видимости */}
                      <div style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        backgroundColor: "rgba(34, 197, 94, 0.9)",
                        color: "white",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontFamily: "Arial, sans-serif",
                        fontWeight: "600"
                      }}>
                        Видно заказчику
                      </div>
                    </div>
                    
                    {/* Информация о файле */}
                    <div style={{ padding: "16px" }}>
                      <h4 style={{
                        fontFamily: "Arial, sans-serif",
                        fontSize: "0.9rem",
                        color: "white",
                        margin: "0 0 8px 0",
                        fontWeight: "600",
                        wordBreak: "break-word"
                      }}>
                        {photo.originalName}
                      </h4>
                      
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <span style={{
                          fontSize: "0.75rem",
                          color: "rgba(34, 197, 94, 1)",
                          fontFamily: "Arial, sans-serif",
                          fontWeight: "600"
                        }}>
                          ✓ Видно заказчику
                        </span>
                        <span style={{
                          fontSize: "0.75rem",
                          color: "rgba(250, 247, 242, 0.7)",
                          fontFamily: "Arial, sans-serif"
                        }}>
                          {formatDate(photo.uploadedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: "center",
                color: "rgba(250, 247, 242, 0.6)",
                padding: "60px 20px",
                fontFamily: "Arial, sans-serif"
              }}>
                <div style={{ fontSize: "3rem", marginBottom: "16px" }}>👁️</div>
                <p style={{ fontSize: "1.2rem", marginBottom: "8px" }}>
                  {selectedCustomerFolder !== null 
                    ? "В этой папке нет фото" 
                    : "Нет фото для заказчика"
                  }
                </p>
                <p style={{ fontSize: "0.9rem" }}>
                  {selectedCustomerFolder !== null 
                    ? "Назначьте фото в эту папку из вкладки 'Все фото'" 
                    : "Загрузите фотографии и сделайте их видимыми для заказчика"
                  }
                </p>
              </div>
            )
            })()}
          </div>
        )}

        {activeTab === 'panoramas' && (
          <div>
            <PanoramasPanel
              objectId={objectId || "0"}
              adminToken={adminToken}
              onPanoramasUpdate={handlePanoramasUpdate}
            />

            {object.panoramas && object.panoramas.length > 0 ? (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "20px",
                marginTop: "24px"
              }}>
                {object.panoramas.map((panorama) => (
                  <div
                    key={panorama.id}
                    onClick={() => {
                      if (!panoramasReady) {
                        alert('Панорамы ещё загружаются, попробуйте чуть позже.');
                        return;
                      }
                      if (missingPanoramaIds.has(panorama.id)) {
                        alert('Файл панорамы недоступен. Загрузите панораму заново.');
                        return;
                      }
                      setSelectedPanorama(panorama);
                    }}
                    style={{
                      backgroundColor: "rgba(59, 130, 246, 0.08)",
                      borderRadius: "16px",
                      padding: "0",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      backdropFilter: "blur(10px)",
                      overflow: "hidden",
                      cursor: (!panoramasReady || missingPanoramaIds.has(panorama.id)) ? "not-allowed" : "pointer",
                      opacity: (!panoramasReady || missingPanoramaIds.has(panorama.id)) ? 0.6 : 1,
                      transition: "all 0.3s ease"
                    }}
                    onMouseEnter={(e) => {
                      if (panoramasReady && !missingPanoramaIds.has(panorama.id)) {
                        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
                        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(59, 130, 246, 0.25)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                    }}
                  >
                    <div style={{
                      width: "100%",
                      height: "200px",
                      background: "linear-gradient(135deg, rgba(59,130,246,0.4), rgba(14,165,233,0.4))",
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden"
                    }}>
                      {(panorama as any).mimeType?.startsWith('image/') ? (
                        <img
                          src={panoramaThumbnailUrls[panorama.filename] || panorama.url || panoramaUrls[panorama.filename] || `/api/uploads/objects/${object.id}/${panorama.filename}/admin`}
                          alt={panorama.originalName}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            opacity: 0.9,
                            transition: "opacity 0.3s ease"
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                            if (fallback) fallback.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div style={{
                        display: (panorama as any).mimeType?.startsWith('image/') ? "none" : "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        height: "100%",
                        fontSize: "3rem",
                        color: "rgba(250, 247, 242, 0.9)"
                      }}>
                        🌀
                      </div>
                      <div style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        backgroundColor: panorama.isVisibleToCustomer ? "rgba(34, 197, 94, 0.9)" : "rgba(239, 68, 68, 0.9)",
                        color: "white",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontFamily: "Arial, sans-serif",
                        fontWeight: 600
                      }}>
                        {panorama.isVisibleToCustomer ? "Видно" : "Скрыто"}
                      </div>
                      {missingPanoramaIds.has(panorama.id) && (
                        <div style={{
                          position: "absolute",
                          bottom: "12px",
                          right: "12px",
                          backgroundColor: "rgba(239, 68, 68, 0.85)",
                          color: "white",
                          padding: "6px 10px",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontFamily: "Arial, sans-serif",
                          fontWeight: 600
                        }}>
                          Файл отсутствует
                        </div>
                      )}
                      {!missingPanoramaIds.has(panorama.id) && !panoramasReady && (
                        <div style={{
                          position: "absolute",
                          bottom: "12px",
                          right: "12px",
                          backgroundColor: "rgba(59, 130, 246, 0.4)",
                          color: "white",
                          padding: "6px 10px",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontFamily: "Arial, sans-serif",
                          fontWeight: 600
                        }}>
                          Проверяем файл…
                        </div>
                      )}
                      <div style={{
                        position: "absolute",
                        bottom: "12px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: "rgba(0,0,0,0.4)",
                        color: "white",
                        padding: "6px 12px",
                        borderRadius: "999px",
                        fontSize: "0.8rem",
                        fontFamily: "Arial, sans-serif",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}>
                        360° Просмотр
                      </div>
                    </div>

                    <div style={{ padding: "16px" }}>
                      <h4 style={{
                        fontFamily: "Arial, sans-serif",
                        fontSize: "0.9rem",
                        color: "white",
                        margin: "0 0 8px 0",
                        fontWeight: 600,
                        wordBreak: "break-word"
                      }}>
                        {panorama.originalName}
                      </h4>

                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px"
                      }}>
                        <span style={{
                          fontSize: "0.75rem",
                          color: "rgba(250, 247, 242, 0.7)",
                          fontFamily: "Arial, sans-serif"
                        }}>
                          {formatDate(panorama.uploadedAt)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePanoramaVisibility(panorama.id, !panorama.isVisibleToCustomer);
                          }}
                          disabled={updatingPanoramas.has(panorama.id)}
                          style={{
                            background: panorama.isVisibleToCustomer ? "rgba(239, 68, 68, 0.8)" : "rgba(34, 197, 94, 0.8)",
                            border: "none",
                            color: "white",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            fontFamily: "Arial, sans-serif",
                            cursor: updatingPanoramas.has(panorama.id) ? "not-allowed" : "pointer",
                            opacity: updatingPanoramas.has(panorama.id) ? 0.6 : 1,
                            transition: "all 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                          onMouseEnter={(e) => {
                            if (!updatingPanoramas.has(panorama.id)) {
                              e.currentTarget.style.opacity = "0.8";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!updatingPanoramas.has(panorama.id)) {
                              e.currentTarget.style.opacity = "1";
                            }
                          }}
                        >
                          {updatingPanoramas.has(panorama.id) ? 'Обновление...' : panorama.isVisibleToCustomer ? 'Скрыть' : 'Показать'}
                        </button>
                      </div>

                      <div style={{
                        display: "flex",
                        gap: "8px"
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePanorama(panorama.id);
                          }}
                          style={{
                            flex: 1,
                            background: "rgba(239, 68, 68, 0.8)",
                            border: "none",
                            color: "white",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            fontFamily: "Arial, sans-serif",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = "0.8";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = "1";
                          }}
                        >
                          🗑️ Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: "center",
                color: "rgba(250, 247, 242, 0.6)",
                padding: "60px 20px",
                fontFamily: "Arial, sans-serif"
              }}>
                <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🌀</div>
                <p style={{ fontSize: "1.2rem", marginBottom: "8px" }}>Пока нет панорам</p>
                <p style={{ fontSize: "0.9rem" }}>Загрузите панорамы через панель выше</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'projects' && (
          <div>
            <h3 style={{
              fontFamily: "var(--font-jost), sans-serif",
              fontSize: "1.5rem",
              color: "white",
              margin: "0 0 24px 0",
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}>
              Проекты
            </h3>

            {/* Статусы проектов: завершён / в работе — меняйте в выпадающем списке */}
            {object.projects?.length > 0 ? (
              <>
                <p style={{
                  color: "rgba(250, 247, 242, 0.75)",
                  fontSize: "0.95rem",
                  marginBottom: "12px",
                  fontFamily: "Arial, sans-serif"
                }}>
                  Статус каждого проекта можно изменить в списке ниже (Завершён / В работе / Планирование).
                </p>
                <div style={{
                  marginBottom: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px"
                }}>
                    {object.projects.map((project) => (
                    <ProjectStatusRow
                      key={project.id}
                      project={project}
                      objectId={objectId || ""}
                      adminToken={adminToken}
                      onUpdated={fetchObjectDetail}
                    />
                  ))}
                </div>
              </>
            ) : (
              <p style={{ color: "rgba(250, 247, 242, 0.6)", marginBottom: "24px", fontSize: "0.95rem" }}>
                У этого объекта пока нет проектов. Создайте проект в разделе документов или через API.
              </p>
            )}

            {/* Документы проектов с проверкой оплаты */}
            <DocumentsPanel
              objectId={parseInt(objectId || "0")}
              documents={object.projects?.flatMap(project => project.documents || []) || [] as any}
              adminToken={adminToken}
              onDocumentsUpdate={fetchObjectDetail}
              requirePaymentCheck={true}
            />
          </div>
        )}

        {activeTab === 'payments' && (
          <div style={{
            textAlign: "center",
            color: "rgba(250, 247, 242, 0.6)",
            padding: "60px 20px",
            fontFamily: "Arial, sans-serif"
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>💰</div>
            <p style={{ fontSize: "1.2rem", marginBottom: "16px" }}>Статусы оплаты</p>
            <p>Функция будет добавлена в следующей версии</p>
          </div>
        )}

        {activeTab === 'messages' && (
          <div>
            {/* Панель отправки сообщения */}
            <div style={{
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: "16px",
              padding: "24px",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              marginBottom: "24px"
            }}>
              <h3 style={{
                fontFamily: "var(--font-jost), sans-serif",
                fontSize: "1.5rem",
                color: "white",
                margin: "0 0 20px 0",
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}>
                Сообщения
              </h3>
              <div style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-end"
              }}>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Введите сообщение..."
                  style={{
                    flex: 1,
                    minHeight: "80px",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    color: "white",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "0.9rem",
                    resize: "vertical"
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  style={{
                    backgroundColor: (!newMessage.trim() || sendingMessage) ? "rgba(107, 114, 128, 0.5)" : "rgba(59, 130, 246, 0.8)",
                    border: "none",
                    color: "white",
                    padding: "12px 24px",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    fontFamily: "Arial, sans-serif",
                    cursor: (!newMessage.trim() || sendingMessage) ? "not-allowed" : "pointer",
                    transition: "all 0.3s ease",
                    opacity: (!newMessage.trim() || sendingMessage) ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (newMessage.trim() && !sendingMessage) {
                      e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 1)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (newMessage.trim() && !sendingMessage) {
                      e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.8)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }
                  }}
                >
                  {sendingMessage ? "Отправка..." : "Отправить"}
                </button>
              </div>
            </div>

            {/* Список сообщений */}
            {object.messages.length > 0 ? (
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}>
                {object.messages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      backgroundColor: message.isAdminMessage ? "rgba(59, 130, 246, 0.1)" : "rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                      padding: "16px",
                      backdropFilter: "blur(10px)",
                      border: "1px solid rgba(255, 255, 255, 0.1)"
                    }}
                  >
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "8px"
                    }}>
                      <p style={{
                        fontFamily: "Arial, sans-serif",
                        fontSize: "0.85rem",
                        color: message.isAdminMessage ? "rgba(59, 130, 246, 1)" : "rgba(34, 197, 94, 1)",
                        margin: 0,
                        fontWeight: "600"
                      }}>
                        {message.isAdminMessage ? "Команда" : (message.user.name || message.user.email)}
                      </p>
                      <p style={{
                        fontFamily: "Arial, sans-serif",
                        fontSize: "0.75rem",
                        color: "rgba(250, 247, 242, 0.6)",
                        margin: 0
                      }}>
                        {formatDate(message.createdAt)}
                      </p>
                    </div>
                    <p style={{
                      fontFamily: "Arial, sans-serif",
                      fontSize: "0.9rem",
                      color: "white",
                      margin: 0
                    }}>
                      {message.content}
                    </p>
                    <div style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginTop: "12px"
                    }}>
                      <button
                        onClick={() => deleteMessage(message.id)}
                        style={{
                          background: "rgba(239, 68, 68, 0.8)",
                          border: "none",
                          color: "white",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontFamily: "Arial, sans-serif",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = "0.8";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                      >
                        🗑️ Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: "center",
                color: "rgba(250, 247, 242, 0.6)",
                padding: "40px",
                fontFamily: "Arial, sans-serif"
              }}>
                <p>Пока нет сообщений</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <DocumentsPanel
            objectId={object.id}
            documents={object.documents}
            adminToken={adminToken}
            onDocumentsUpdate={fetchObjectDetail}
          />
        )}

        {activeTab === 'models' && object && (
          <div style={{
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderRadius: "12px",
            padding: "24px",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.1)"
          }}>
            <BimModelsList
              objectId={object.id}
              userEmail={customer?.email || object.user?.email || ''}
              canUpload={true}
            />
          </div>
        )}

        {/* Сообщение если нет данных */}
        {(activeTab === 'all-photos' && object.photos.length === 0) ||
         (activeTab === 'customer-photos' && object.photos.filter(p => p.isVisibleToCustomer).length === 0) ||
         (activeTab === 'panoramas' && object.panoramas.length === 0) ||
         (activeTab === 'projects' && object.projects.length === 0) ||
         (activeTab === 'messages' && object.messages.length === 0) ||
         (activeTab === 'documents' && object.documents.length === 0) ||
         (activeTab === 'models' && (!object.bimModels || object.bimModels.length === 0)) ? (
          <div style={{
            textAlign: "center",
            color: "rgba(250, 247, 242, 0.6)",
            padding: "40px",
            fontFamily: "Arial, sans-serif"
          }}>
            <p>Пока нет данных в этой категории</p>
          </div>
        ) : null}
      </div>
      
      {/* Модальное окно подтверждения удаления */}
      {showDeleteConfirm && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          pointerEvents: "auto"
        }}>
          <div style={{
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
            borderRadius: "16px",
            padding: "32px",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            maxWidth: "400px",
            width: "90%",
            textAlign: "center"
          }}>
            <h3 style={{
              fontFamily: "var(--font-jost), sans-serif",
              fontSize: "1.5rem",
              color: "white",
              margin: "0 0 20px 0"
            }}>
              Подтверждение удаления
            </h3>
            <p style={{
              fontFamily: "Arial, sans-serif",
              fontSize: "1rem",
              color: "rgba(255, 255, 255, 0.8)",
              margin: "0 0 24px 0",
              lineHeight: "1.5"
            }}>
              {deleteType === 'photo' && 'Вы уверены, что хотите удалить это фото?'}
              {deleteType === 'document' && 'Вы уверены, что хотите удалить этот документ?'}
              {deleteType === 'message' && 'Вы уверены, что хотите удалить это сообщение?'}
              {deleteType === 'panorama' && 'Вы уверены, что хотите удалить эту панораму?'}
            </p>
            <div style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center"
            }}>
              <button
                onClick={handleCancelDelete}
                style={{
                  backgroundColor: "rgba(107, 114, 128, 0.8)",
                  border: "none",
                  color: "white",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  fontFamily: "Arial, sans-serif",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(107, 114, 128, 1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(107, 114, 128, 0.8)";
                }}
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.8)",
                  border: "none",
                  color: "white",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  fontFamily: "Arial, sans-serif",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.8)";
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panorama Viewer */}
      {selectedPanorama && (
        <div style={{
          position: "fixed",
          top: "120px",
          left: "20px",
          right: "20px",
          bottom: "20px",
          backgroundColor: "rgba(0,0,0,0.92)",
          borderRadius: "12px",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          padding: "24px"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px"
          }}>
            <h2 style={{
              color: "white",
              fontSize: "1.5rem",
              fontFamily: "Arial, sans-serif",
              margin: 0
            }}>
              {selectedPanorama.originalName}
            </h2>
            <button
              onClick={() => {
                setSelectedPanorama(null);
                setPanoramaComments([]);
                setNewPanoramaComment('');
                setPendingPanoramaCoords(null);
                setSelectedPanoramaCommentId(null);
                setMarkersPluginInstance(null);
                panoramaViewerRef.current = null;
              }}
              style={{
                background: "none",
                border: "none",
                color: "white",
                fontSize: "2rem",
                cursor: "pointer",
                padding: 0,
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              ×
            </button>
          </div>

          <div style={{
            flex: 1,
            display: "flex",
            gap: "20px",
            overflow: "hidden"
          }}>
            <div style={{
              flex: 1,
              borderRadius: "12px",
              overflow: "hidden",
              backgroundColor: "rgba(0,0,0,0.6)",
              position: "relative"
            }} onContextMenu={handlePanoramaContextMenu}>
              {selectedPanoramaIsReady ? (
                <ReactPhotoSphereViewer
                  key={selectedPanorama.id}
                  ref={panoramaViewerRef}
                  src={selectedPanoramaSrc!}
                  height="100%"
                  width="100%"
                  littlePlanet={false}
                  navbar={["zoom", "fullscreen"]}
                  plugins={panoramaViewerPlugins}
                  onReady={handlePanoramaReady}
                  onClick={handlePanoramaClick}
                />
              ) : (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                    color: "white",
                    fontFamily: "Arial, sans-serif",
                    padding: "24px",
                    textAlign: "center"
                  }}
                >
                  {!selectedPanoramaError ? (
                    <>
                      <span style={{ fontSize: "1rem", opacity: 0.85 }}>Загружаем панораму…</span>
                      <span style={{ fontSize: "0.85rem", opacity: 0.65 }}>
                        Для больших файлов загрузка может занять до минуты.
                      </span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: "1rem", color: "rgba(239,68,68,0.9)" }}>
                        Не удалось загрузить панораму
                      </span>
                      <span style={{ fontSize: "0.85rem", opacity: 0.75 }}>
                        {selectedPanoramaError}
                      </span>
                      <button
                        onClick={retryPanoramaFetch}
                        style={{
                          marginTop: "8px",
                          padding: "8px 16px",
                          borderRadius: "999px",
                          border: "1px solid rgba(59,130,246,0.4)",
                          backgroundColor: "rgba(59,130,246,0.18)",
                          color: "rgba(250, 247, 242, 0.9)",
                          cursor: "pointer"
                        }}
                      >
                        Повторить
                      </button>
                    </>
                  )}
                </div>
              )}
              {loadingPanoramaIds.has(selectedPanorama.id) && !selectedPanoramaError && (
                <div style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  backgroundColor: "rgba(17,24,39,0.7)",
                  color: "white",
                  padding: "6px 12px",
                  borderRadius: "999px",
                  fontSize: "0.8rem",
                  fontFamily: "Arial, sans-serif"
                }}>
                  Загрузка панорамы…
                </div>
              )}
              {selectedPanoramaError && (
                <div style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  backgroundColor: "rgba(239,68,68,0.85)",
                  color: "white",
                  padding: "6px 12px",
                  borderRadius: "999px",
                  fontSize: "0.8rem",
                  fontFamily: "Arial, sans-serif"
                }}>
                  Ошибка загрузки
                </div>
              )}
            </div>

            <div style={{
              width: "360px",
              backgroundColor: "rgba(250, 247, 242, 0.06)",
              borderRadius: "12px",
              border: "1px solid rgba(250, 247, 242, 0.12)",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              backdropFilter: "blur(10px)"
            }}>
              <div>
                <h3 style={{
                  color: "white",
                  fontSize: "1.1rem",
                  margin: "0 0 10px 0",
                  fontFamily: "var(--font-jost), sans-serif"
                }}>
                  Комментарии ({panoramaComments.length})
                </h3>
                <p style={{
                  fontSize: "0.85rem",
                  color: "rgba(250, 247, 242, 0.7)",
                  margin: "0 0 12px 0",
                  fontFamily: "Arial, sans-serif",
                  lineHeight: 1.4
                }}>
                  {annotationsEnabled
                    ? "Кликните на панораме, чтобы выбрать точку, и оставьте комментарий с привязкой к виду."
                    : "Панорама отображается в цилиндрическом формате: оставляйте общий комментарий без привязки к точке."}
                </p>
                {annotationsEnabled ? (
                  pendingPanoramaCoords ? (
                    <div style={{
                      fontSize: "0.8rem",
                      color: "rgba(59,130,246,0.95)",
                      background: "rgba(59,130,246,0.15)",
                      padding: "8px",
                      borderRadius: "8px",
                      border: "1px solid rgba(59,130,246,0.3)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <span>Выбранная точка: {toDegrees(pendingPanoramaCoords.yaw)}° / {toDegrees(pendingPanoramaCoords.pitch)}°</span>
                      <button
                        onClick={() => {
                          setPendingPanoramaCoords(null);
                          setSelectedPanoramaCommentId(null);
                        }}
                        style={{
                          background: "rgba(239, 68, 68, 0.15)",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          color: "rgba(239, 68, 68, 0.9)",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          cursor: "pointer"
                        }}
                      >
                        Очистить
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      fontSize: "0.8rem",
                      color: "rgba(250, 247, 242, 0.65)",
                      background: "rgba(250, 247, 242, 0.05)",
                      padding: "8px",
                      borderRadius: "8px",
                      border: "1px dashed rgba(250, 247, 242, 0.2)"
                    }}>
                      Точка не выбрана
                    </div>
                  )
                ) : (
                  <div style={{
                    fontSize: "0.8rem",
                    color: "rgba(250, 247, 242, 0.78)",
                    background: "rgba(59,130,246,0.12)",
                    padding: "8px",
                    borderRadius: "8px",
                    border: "1px solid rgba(59,130,246,0.35)"
                  }}>
                    Оставьте текстовый комментарий — он сохранится без точки на панораме.
                  </div>
                )}
              </div>

              <div style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "10px"
              }}>
                {panoramaComments.map((comment) => {
                  const isActive = selectedPanoramaCommentId === comment.id;
                  return (
                    <div
                      key={comment.id}
                      onClick={() => focusOnPanoramaComment(comment)}
                      style={{
                        cursor: "pointer",
                        padding: "12px",
                        borderRadius: "10px",
                        backgroundColor: comment.isAdminComment ? "rgba(59,130,246,0.12)" : "rgba(34,197,94,0.12)",
                        border: isActive ? "1px solid rgba(59,130,246,0.6)" : "1px solid rgba(250, 247, 242, 0.1)",
                        transition: "border 0.2s ease, transform 0.2s ease"
                      }}
                    >
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "6px",
                        gap: "8px"
                      }}>
                        <span style={{
                          fontSize: "0.85rem",
                          color: comment.isAdminComment ? "rgba(59,130,246,1)" : "rgba(34,197,94,1)",
                          fontWeight: 600,
                          fontFamily: "Arial, sans-serif"
                        }}>
                          {comment.isAdminComment ? "Команда" : (comment.user?.name || comment.user?.email)}
                        </span>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px"
                        }}>
                          <span style={{
                            fontSize: "0.7rem",
                            color: "rgba(250, 247, 242, 0.55)",
                            fontFamily: "Arial, sans-serif"
                          }}>
                            {new Date(comment.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              deletePanoramaComment(comment.id);
                            }}
                            disabled={deletingPanoramaCommentIds.has(comment.id)}
                            style={{
                              background: "transparent",
                              border: "1px solid rgba(239,68,68,0.4)",
                              color: "rgba(239,68,68,0.85)",
                              fontSize: "0.7rem",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              cursor: deletingPanoramaCommentIds.has(comment.id) ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s ease',
                              opacity: deletingPanoramaCommentIds.has(comment.id) ? 0.6 : 1
                            }}
                          >
                            {deletingPanoramaCommentIds.has(comment.id) ? 'Удаляем...' : 'Удалить'}
                          </button>
                        </div>
                      </div>
                      <p style={{
                        fontSize: "0.85rem",
                        color: "white",
                        fontFamily: "Arial, sans-serif",
                        lineHeight: 1.4,
                        margin: "0 0 6px 0"
                      }}>
                        {comment.content}
                      </p>
                      <div style={{
                        fontSize: "0.75rem",
                        color: "rgba(250, 247, 242, 0.55)",
                        fontFamily: "Arial, sans-serif"
                      }}>
                        Позиция: {comment.hasValidPosition && typeof comment.yaw === 'number' && typeof comment.pitch === 'number'
                          ? `${toDegrees(comment.yaw)}° / ${toDegrees(comment.pitch)}°`
                          : 'нет координат'}
                      </div>
                    </div>
                  );
                })}

                {panoramaComments.length === 0 && (
                  <div style={{
                    textAlign: "center",
                    color: "rgba(250, 247, 242, 0.6)",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "0.85rem",
                    padding: "24px"
                  }}>
                    Пока нет комментариев
                  </div>
                )}
              </div>

              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px"
              }}>
                <textarea
                  value={newPanoramaComment}
                  onChange={(e) => setNewPanoramaComment(e.target.value)}
                  placeholder={
                    annotationsEnabled
                      ? pendingPanoramaCoords
                        ? 'Добавьте комментарий к выбранной точке'
                        : 'Сначала выберите точку на панораме'
                      : 'Напишите комментарий… (будет без привязки к точке)'
                  }
                  disabled={sendingPanoramaComment || (annotationsEnabled && !pendingPanoramaCoords)}
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px солид rgba(250, 247, 242, 0.25)',
                    backgroundColor: 'rgba(0,0,0,0.35)',
                    color: 'white',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '0.9rem',
                    resize: 'vertical'
                  }}
                />
                <button
                  onClick={sendPanoramaComment}
                  disabled={
                    sendingPanoramaComment ||
                    !newPanoramaComment.trim() ||
                    (annotationsEnabled && !pendingPanoramaCoords)
                  }
                  style={{
                    width: '100%',
                    backgroundColor:
                      sendingPanoramaComment ||
                      !newPanoramaComment.trim() ||
                      (annotationsEnabled && !pendingPanoramaCoords)
                        ? 'rgba(107,114,128,0.5)'
                        : 'rgba(34,197,94,0.8)',
                    border: 'none',
                    color: 'white',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontFamily: 'Arial, sans-serif',
                    cursor:
                      sendingPanoramaComment ||
                      !newPanoramaComment.trim() ||
                      (annotationsEnabled && !pendingPanoramaCoords)
                        ? 'not-allowed'
                        : 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {sendingPanoramaComment ? 'Отправка...' : 'Добавить комментарий'}
                </button>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "rgba(250, 247, 242, 0.75)",
            fontFamily: "Arial, sans-serif",
            fontSize: "0.85rem"
          }}>
            <span>
              {annotationsEnabled
                ? "Управление: зажмите и перемещайте мышь, колесо приближает."
                : "Просмотр: используйте колесо мыши для изменения масштаба."}
            </span>
            <span>
              {selectedPanorama.isVisibleToCustomer ? "Видно заказчику" : "Скрыто от заказчика"}
              &nbsp;•&nbsp;{formatDate(selectedPanorama.uploadedAt)}
            </span>
          </div>
        </div>
      )}

      {/* Photo Viewer */}
      {selectedPhoto && (
        <div style={{
          position: "fixed",
          top: "120px",
          left: "20px",
          right: "20px",
          bottom: "20px",
          backgroundColor: "rgba(0,0,0,0.9)",
          borderRadius: "12px",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <div style={{
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(250, 247, 242, 0.1)",
            padding: "20px",
            display: "flex",
            gap: "20px",
            overflow: "hidden"
          }}>
            {/* Левая часть - Фото */}
            <div style={{
              flex: "1",
              display: "flex",
              flexDirection: "column",
              gap: "20px"
            }}>
              {/* Header */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <h2 style={{
                  color: "white",
                  fontSize: "1.5rem",
                  fontFamily: "Arial, sans-serif",
                  margin: 0
                }}>
                  {selectedPhoto.originalName}
                </h2>
                <button
                  onClick={async () => {
                    console.log('Закрытие просмотрщика:', {
                      selectedPhoto: selectedPhoto?.id,
                      tempSelectedFolder,
                      currentFolderId: (selectedPhoto as any)?.folderId
                    });
                    
                    // Сохраняем назначение папки перед закрытием
                    if (selectedPhoto && tempSelectedFolder !== (selectedPhoto as any).folderId) {
                      console.log('Сохраняем изменения папки');
                      await savePhotoFolderAssignment(selectedPhoto.id, tempSelectedFolder);
                    }
                    
                    // Закрываем просмотрщик
                    setSelectedPhoto(null);
                    setPhotoComments([]);
                    setNewPhotoComment('');
                    setTempSelectedFolder(null);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "white",
                    fontSize: "2rem",
                    cursor: "pointer",
                    padding: "0",
                    width: "40px",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  ×
                </button>
              </div>

              {/* Photo */}
              <div style={{
                flex: "1",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "400px"
              }}>
                <img
                  src={fullImageUrls[selectedPhoto.filename] || (selectedPhoto as any).url || imageUrls[selectedPhoto.filename] || `/api/uploads/objects/${object?.id}/${selectedPhoto.filename}/admin`}
                  alt={selectedPhoto.originalName}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                    borderRadius: "8px"
                  }}
                />
              </div>

              {/* Navigation */}
              <div style={{
                display: "flex",
                justifyContent: "center",
                gap: "10px"
              }}>
                <button
                  onClick={async () => {
                    // Сначала сохраняем текущее назначение папки
                    if (selectedPhoto && tempSelectedFolder !== (selectedPhoto as any).folderId) {
                      await savePhotoFolderAssignment(selectedPhoto.id, tempSelectedFolder);
                    }
                    
                    // Затем переходим к предыдущему фото
                    const currentIndex = object?.photos.findIndex(p => p.id === selectedPhoto.id) || 0;
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : (object?.photos.length || 1) - 1;
                    if (object?.photos[prevIndex]) {
                      setSelectedPhoto(object.photos[prevIndex]);
                      setTempSelectedFolder((object.photos[prevIndex] as any).folderId || null);
                    }
                  }}
                  style={{
                    backgroundColor: "rgba(34, 197, 94, 0.8)",
                    border: "none",
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontSize: "0.9rem",
                    fontFamily: "Arial, sans-serif",
                    cursor: "pointer",
                    transition: "all 0.3s ease"
                  }}
                >
                  ← Предыдущее
                </button>
                <button
                  onClick={async () => {
                    // Сначала сохраняем текущее назначение папки
                    if (selectedPhoto && tempSelectedFolder !== (selectedPhoto as any).folderId) {
                      await savePhotoFolderAssignment(selectedPhoto.id, tempSelectedFolder);
                    }
                    
                    // Затем переходим к следующему фото
                    const currentIndex = object?.photos.findIndex(p => p.id === selectedPhoto.id) || 0;
                    const nextIndex = currentIndex < (object?.photos.length || 1) - 1 ? currentIndex + 1 : 0;
                    if (object?.photos[nextIndex]) {
                      setSelectedPhoto(object.photos[nextIndex]);
                      setTempSelectedFolder((object.photos[nextIndex] as any).folderId || null);
                    }
                  }}
                  style={{
                    backgroundColor: "rgba(34, 197, 94, 0.8)",
                    border: "none",
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontSize: "0.9rem",
                    fontFamily: "Arial, sans-serif",
                    cursor: "pointer",
                    transition: "all 0.3s ease"
                  }}
                >
                  Следующее →
                </button>
              </div>
            </div>

            {/* Правая часть - Комментарии */}
            <div style={{
              width: "350px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              backgroundColor: "rgba(250, 247, 242, 0.05)",
              borderRadius: "8px",
              padding: "16px",
              maxHeight: "80vh",
              overflow: "hidden"
            }}>
              {/* Селектор папки */}
              <div style={{
                padding: "12px",
                background: "rgba(201, 169, 110,  0.15)",
                borderRadius: "8px",
                border: "1px solid rgba(201, 169, 110,  0.3)"
              }}>
                <label style={{
                  display: "block",
                  fontSize: "0.85rem",
                  color: "rgba(250, 247, 242, 0.9)",
                  marginBottom: "12px",
                  fontFamily: "Arial, sans-serif",
                  fontWeight: 600
                }}>
                  📁 Назначить в папку
                </label>
                
                {/* Список папок с галочками */}
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  maxHeight: "200px",
                  overflowY: "auto"
                }}>
                  {/* Опция "Не назначена" */}
                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    background: tempSelectedFolder === null 
                      ? "rgba(201, 169, 110,  0.2)" 
                      : "rgba(255, 255, 255, 0.05)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    border: tempSelectedFolder === null 
                      ? "1px solid rgba(201, 169, 110,  0.5)" 
                      : "1px solid rgba(255, 255, 255, 0.1)"
                  }}>
                    <input
                      type="radio"
                      name="folder"
                      checked={tempSelectedFolder === null}
                      onChange={() => assignPhotoToFolder(selectedPhoto.id, null)}
                      style={{
                        accentColor: "#d3a373",
                        transform: "scale(1.1)"
                      }}
                    />
                    <span style={{
                      fontSize: "0.9rem",
                      color: "white",
                      fontFamily: "Arial, sans-serif"
                    }}>
                      📷 Не назначена
                    </span>
                  </label>

                  {/* Список папок */}
                  {folders.map((folder) => (
                    <label key={folder.id} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 12px",
                      background: tempSelectedFolder === folder.id 
                        ? "rgba(201, 169, 110,  0.2)" 
                        : "rgba(255, 255, 255, 0.05)",
                      borderRadius: "6px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      border: tempSelectedFolder === folder.id 
                        ? "1px solid rgba(201, 169, 110,  0.5)" 
                        : "1px solid rgba(255, 255, 255, 0.1)"
                    }}>
                      <input
                        type="radio"
                        name="folder"
                        checked={tempSelectedFolder === folder.id}
                        onChange={() => assignPhotoToFolder(selectedPhoto.id, folder.id)}
                        style={{
                          accentColor: "#d3a373",
                          transform: "scale(1.1)"
                        }}
                      />
                      <span style={{
                        fontSize: "0.9rem",
                        color: "white",
                        fontFamily: "Arial, sans-serif"
                      }}>
                        📁 {folder.name}
                      </span>
                      <span style={{
                        fontSize: "0.75rem",
                        color: "rgba(255, 255, 255, 0.6)",
                        fontFamily: "Arial, sans-serif",
                        marginLeft: "auto"
                      }}>
                        ({folder.photoCount} фото)
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Заголовок комментариев */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid rgba(250, 247, 242, 0.2)",
                paddingBottom: "12px"
              }}>
                <h3 style={{
                  color: "white",
                  fontSize: "1.1rem",
                  fontFamily: "Arial, sans-serif",
                  margin: 0
                }}>
                  Комментарии ({photoComments.length})
                </h3>
              </div>

              {/* Список комментариев */}
              <div style={{
                flex: "1",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}>
                {photoComments.map((comment) => (
                  <div
                    key={comment.id}
                    style={{
                      backgroundColor: comment.isAdminComment ? "rgba(59, 130, 246, 0.1)" : "rgba(255, 255, 255, 0.1)",
                      borderRadius: "8px",
                      padding: "12px",
                      border: `1px solid ${comment.isAdminComment ? "rgba(59, 130, 246, 0.3)" : "rgba(255, 255, 255, 0.1)"}`
                    }}
                  >
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "8px"
                    }}>
                      <p style={{
                        fontFamily: "Arial, sans-serif",
                        fontSize: "0.85rem",
                        color: comment.isAdminComment ? "rgba(59, 130, 246, 1)" : "rgba(34, 197, 94, 1)",
                        margin: 0,
                        fontWeight: "600"
                      }}>
                        {comment.isAdminComment ? "Команда" : (comment.user.name || comment.user.email)}
                      </p>
                      <p style={{
                        fontFamily: "Arial, sans-serif",
                        fontSize: "0.75rem",
                        color: "rgba(250, 247, 242, 0.6)",
                        margin: 0
                      }}>
                        {new Date(comment.createdAt).toLocaleDateString('ru-RU', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <p style={{
                      fontFamily: "Arial, sans-serif",
                      fontSize: "0.9rem",
                      color: "white",
                      margin: 0,
                      lineHeight: "1.4"
                    }}>
                      {comment.content}
                    </p>
                  </div>
                ))}
                
                {photoComments.length === 0 && (
                  <div style={{
                    textAlign: "center",
                    color: "rgba(250, 247, 242, 0.5)",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "0.9rem",
                    padding: "20px"
                  }}>
                    Пока нет комментариев
                  </div>
                )}
              </div>

              {/* Форма добавления комментария */}
              <div style={{
                borderTop: "1px solid rgba(250, 247, 242, 0.2)",
                paddingTop: "12px"
              }}>
                <textarea
                  value={newPhotoComment}
                  onChange={(e) => setNewPhotoComment(e.target.value)}
                  placeholder="Добавить комментарий..."
                  style={{
                    width: "100%",
                    minHeight: "60px",
                    padding: "8px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    color: "white",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "0.9rem",
                    resize: "vertical",
                    marginBottom: "8px"
                  }}
                />
                <button
                  onClick={sendPhotoComment}
                  disabled={!newPhotoComment.trim() || sendingPhotoComment}
                  style={{
                    width: "100%",
                    backgroundColor: (!newPhotoComment.trim() || sendingPhotoComment) ? "rgba(107, 114, 128, 0.5)" : "rgba(34, 197, 94, 0.8)",
                    border: "none",
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontSize: "0.9rem",
                    fontFamily: "Arial, sans-serif",
                    cursor: (!newPhotoComment.trim() || sendingPhotoComment) ? "not-allowed" : "pointer",
                    transition: "all 0.3s ease",
                    opacity: (!newPhotoComment.trim() || sendingPhotoComment) ? 0.6 : 1
                  }}
                >
                  {sendingPhotoComment ? "Отправка..." : "Отправить комментарий"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}


