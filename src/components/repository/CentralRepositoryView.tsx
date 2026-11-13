import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Folder,
  FolderPlus,
  FileText,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  File,
  Upload,
  Download,
  Search,
  LayoutGrid,
  List,
  Star,
  Share2,
  Trash2,
  RotateCcw,
  MoreVertical,
  ChevronRight,
  Eye,
  History,
  Activity,
  Edit3,
  FolderInput,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  X,
  Link2,
  Copy,
  Check,
  Users,
  HardDrive,
  UploadCloud,
  Clock,
  Lock
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import {
  User,
  UserRole,
  WorkspaceItem,
  WorkspacePermissionLevel
} from '../../types/index.js';

type WorkspaceView = 'drive' | 'shared' | 'starred' | 'trash';

interface BreadcrumbNode {
  id: string | null;
  name: string;
}

interface WorkspaceStats {
  totalFiles: number;
  totalFolders: number;
  totalBytes: number;
  trashedCount: number;
}

interface UploadQueueItem {
  id: string;
  fileName: string;
  size: number;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

const EPSS_ROLES: { role: UserRole; label: string }[] = [
  { role: 'DirectorGeneral', label: 'Director General' },
  { role: 'Director', label: 'Directorate Head' },
  { role: 'ProcurementOfficer', label: 'Procurement Officer' },
  { role: 'RegistryOfficer', label: 'Registry Officer' },
  { role: 'BranchManager', label: 'Branch Manager' },
  { role: 'Auditor', label: 'Internal Auditor' },
  { role: 'SuperAdmin', label: 'Super Admin' }
];

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) + ' ' + d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function validateNameClient(raw: string): string | null {
  if (!raw || raw.length < 1 || raw.length > 255) {
    return 'Name must be between 1 and 255 characters.';
  }
  if (raw !== raw.trim()) {
    return 'Name cannot have leading or trailing spaces.';
  }
  if (/[\/\\:\*\?"<>\|]/.test(raw)) {
    return 'Forbidden characters detected: / \\ : * ? " < > |';
  }
  return null;
}

export const CentralRepositoryView: React.FC = () => {
  const { currentUser, language } = useApp();

  // Navigation & listing state
  const [activeView, setActiveView] = useState<WorkspaceView>('drive');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbNode[]>([{ id: null, name: 'EPSS Workspace' }]);
  const [allFolders, setAllFolders] = useState<WorkspaceItem[]>([]);
  const [stats, setStats] = useState<WorkspaceStats>({
    totalFiles: 0,
    totalFolders: 0,
    totalBytes: 0,
    trashedCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Feedback banner
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Drag & drop state
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragTargetFolderId, setDragTargetFolderId] = useState<string | null>(null);
  const [isExternalFileDrag, setIsExternalFileDrag] = useState(false);

  // Upload queue
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newVersionInputRef = useRef<HTMLInputElement>(null);
  const [newVersionTarget, setNewVersionTarget] = useState<WorkspaceItem | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    item: WorkspaceItem;
    x: number;
    y: number;
  } | null>(null);

  // Modals & Drawers
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderFormError, setFolderFormError] = useState<string | null>(null);

  const [renameTarget, setRenameTarget] = useState<WorkspaceItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);

  const [moveTarget, setMoveTarget] = useState<WorkspaceItem | null>(null);
  const [moveDestId, setMoveDestId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  const [shareTarget, setShareTarget] = useState<WorkspaceItem | null>(null);
  const [shareUserSearch, setShareUserSearch] = useState('');
  const [shareTargetType, setShareTargetType] = useState<'user' | 'role'>('user');
  const [shareSelectedId, setShareSelectedId] = useState('');
  const [sharePermission, setSharePermission] = useState<WorkspacePermissionLevel>('Viewer');
  const [shareError, setShareError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [versionTarget, setVersionTarget] = useState<WorkspaceItem | null>(null);

  const [previewItem, setPreviewItem] = useState<WorkspaceItem | null>(null);
  const [previewTab, setPreviewTab] = useState<'preview' | 'activity' | 'details'>('preview');
  const [previewTextContent, setPreviewTextContent] = useState<string | null>(null);
  const [previewTextLoading, setPreviewTextLoading] = useState(false);

  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<WorkspaceItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 5000);
  }, []);

  const fetchWorkspace = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set('view', activeView);
      if (currentFolderId) params.set('parentId', currentFolderId);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await fetch(`/api/v1/workspace/items?${params.toString()}`, {
        headers: currentUser ? { 'x-user-id': currentUser.id } : {}
      });
      if (!res.ok) throw new Error('Failed to load workspace items');
      const data = await res.json();
      setItems(data.items || []);
      setBreadcrumbs(data.breadcrumbs || [{ id: null, name: 'EPSS Workspace' }]);
      setAllFolders(data.allFolders || []);
      if (data.stats) setStats(data.stats);
    } catch (err: any) {
      showToast('error', err.message || 'Unable to load workspace');
    } finally {
      setIsLoading(false);
    }
  }, [activeView, currentFolderId, searchQuery, currentUser, showToast]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  useEffect(() => {
    fetch('/api/v1/organizations/users')
      .then(r => r.json())
      .then(data => setAllUsers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Close context menu on global click
  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  // Refresh open modals/drawers when items update
  const syncOpenItemState = (updated: WorkspaceItem) => {
    if (previewItem?.id === updated.id) setPreviewItem(updated);
    if (shareTarget?.id === updated.id) setShareTarget(updated);
    if (versionTarget?.id === updated.id) setVersionTarget(updated);
  };

  // Load inline text/csv/json preview when previewItem changes
  useEffect(() => {
    if (!previewItem || previewItem.itemType !== 'file') {
      setPreviewTextContent(null);
      return;
    }
    const ext = (previewItem.extension || '').toLowerCase();
    const isTextLike = ['csv', 'json', 'txt'].includes(ext) ||
      (previewItem.mimeType || '').startsWith('text/') ||
      previewItem.mimeType === 'application/json';

    if (!isTextLike) {
      setPreviewTextContent(null);
      return;
    }

    setPreviewTextLoading(true);
    fetch(`/api/v1/workspace/items/${previewItem.id}/download?inline=1`, {
      headers: currentUser ? { 'x-user-id': currentUser.id } : {}
    })
      .then(r => r.text())
      .then(txt => setPreviewTextContent(txt))
      .catch(() => setPreviewTextContent('Unable to load file preview.'))
      .finally(() => setPreviewTextLoading(false));
  }, [previewItem, currentUser]);

  // Multi-file upload via XMLHttpRequest for live progress bars
  const handleUploadFiles = (files: FileList | File[], targetFileId?: string) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    list.forEach(file => {
      const qId = `upl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setUploadQueue(prev => [
        ...prev,
        { id: qId, fileName: file.name, size: file.size, progress: 0, status: 'uploading' }
      ]);

      const formData = new FormData();
      if (currentFolderId && activeView === 'drive') {
        formData.append('parentId', currentFolderId);
      }
      if (targetFileId) {
        formData.append('targetFileId', targetFileId);
        formData.append('versionNotes', `Uploaded new version from Workspace UI`);
      }
      formData.append('files', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/v1/workspace/upload', true);
      if (currentUser) {
        xhr.setRequestHeader('x-user-id', currentUser.id);
      }

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const pct = Math.round((ev.loaded / ev.total) * 100);
          setUploadQueue(prev =>
            prev.map(q => (q.id === qId ? { ...q, progress: pct } : q))
          );
        }
      };

      xhr.onload = () => {
        let parsed: any = {};
        try {
          parsed = JSON.parse(xhr.responseText || '{}');
        } catch {
          parsed = {};
        }

        if (xhr.status >= 200 && xhr.status < 300 && parsed.items?.length > 0) {
          setUploadQueue(prev =>
            prev.map(q => (q.id === qId ? { ...q, progress: 100, status: 'done' } : q))
          );
          const updatedItem: WorkspaceItem = parsed.items[0];
          syncOpenItemState(updatedItem);
          fetchWorkspace();
          showToast(
            'success',
            targetFileId
              ? `Uploaded v${updatedItem.currentVersion} of "${updatedItem.name}"`
              : `Uploaded "${updatedItem.name}" (Malware scan: Clean)`
          );
        } else {
          const errMsg =
            parsed.error ||
            parsed.errors?.[0]?.error ||
            `Upload failed (HTTP ${xhr.status})`;
          setUploadQueue(prev =>
            prev.map(q => (q.id === qId ? { ...q, status: 'error', error: errMsg } : q))
          );
          showToast('error', `${file.name}: ${errMsg}`);
        }
      };

      xhr.onerror = () => {
        setUploadQueue(prev =>
          prev.map(q =>
            q.id === qId ? { ...q, status: 'error', error: 'Network error during upload.' } : q
          )
        );
      };

      xhr.send(formData);
    });
  };

  // Actions
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const clientErr = validateNameClient(newFolderName);
    if (clientErr) {
      setFolderFormError(clientErr);
      return;
    }

    setIsSubmitting(true);
    setFolderFormError(null);
    try {
      const res = await fetch('/api/v1/workspace/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentUser ? { 'x-user-id': currentUser.id } : {})
        },
        body: JSON.stringify({
          name: newFolderName,
          parentId: activeView === 'drive' ? currentFolderId : null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setFolderFormError(data.error || 'Failed to create folder');
        return;
      }
      setFolderModalOpen(false);
      setNewFolderName('');
      showToast('success', `Folder "${data.name}" created.`);
      await fetchWorkspace();
    } catch (err: any) {
      setFolderFormError(err.message || 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget) return;
    const clientErr = validateNameClient(renameValue);
    if (clientErr) {
      setRenameError(clientErr);
      return;
    }

    setIsSubmitting(true);
    setRenameError(null);
    try {
      const res = await fetch(`/api/v1/workspace/items/${renameTarget.id}/rename`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(currentUser ? { 'x-user-id': currentUser.id } : {})
        },
        body: JSON.stringify({ name: renameValue })
      });
      const data = await res.json();
      if (!res.ok) {
        setRenameError(data.error || 'Rename failed');
        return;
      }
      syncOpenItemState(data);
      setRenameTarget(null);
      showToast('success', `Renamed to "${data.name}".`);
      await fetchWorkspace();
    } catch (err: any) {
      setRenameError(err.message || 'Rename failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveItem = async (itemId: string, destinationFolderId: string | null) => {
    setIsSubmitting(true);
    setMoveError(null);
    try {
      const res = await fetch(`/api/v1/workspace/items/${itemId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentUser ? { 'x-user-id': currentUser.id } : {})
        },
        body: JSON.stringify({ targetParentId: destinationFolderId })
      });
      const data = await res.json();
      if (!res.ok) {
        setMoveError(data.error || 'Move failed');
        showToast('error', data.error || 'Cannot move item there.');
        return;
      }
      setMoveTarget(null);
      showToast('success', `Moved "${data.name}" successfully.`);
      await fetchWorkspace();
    } catch (err: any) {
      setMoveError(err.message || 'Move error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStar = async (item: WorkspaceItem) => {
    try {
      const res = await fetch(`/api/v1/workspace/items/${item.id}/star`, {
        method: 'POST',
        headers: currentUser ? { 'x-user-id': currentUser.id } : {}
      });
      if (res.ok) {
        const updated = await res.json();
        syncOpenItemState(updated);
        await fetchWorkspace();
      }
    } catch {
      showToast('error', 'Failed to update star status');
    }
  };

  const handleTrash = async (item: WorkspaceItem) => {
    try {
      const res = await fetch(`/api/v1/workspace/items/${item.id}/trash`, {
        method: 'POST',
        headers: currentUser ? { 'x-user-id': currentUser.id } : {}
      });
      if (res.ok) {
        if (previewItem?.id === item.id) setPreviewItem(null);
        showToast('success', `Moved "${item.name}" to Trash.`);
        await fetchWorkspace();
      }
    } catch {
      showToast('error', 'Failed to move item to Trash');
    }
  };

  const handleRestoreFromTrash = async (item: WorkspaceItem) => {
    try {
      const res = await fetch(`/api/v1/workspace/items/${item.id}/restore`, {
        method: 'POST',
        headers: currentUser ? { 'x-user-id': currentUser.id } : {}
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Restore failed');
        return;
      }
      showToast('success', `Restored "${data.name}" from Trash.`);
      await fetchWorkspace();
    } catch {
      showToast('error', 'Failed to restore item');
    }
  };

  const handlePermanentDelete = async () => {
    if (!permanentDeleteTarget) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/workspace/items/${permanentDeleteTarget.id}/permanent`, {
        method: 'DELETE',
        headers: currentUser ? { 'x-user-id': currentUser.id } : {}
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Permanent delete rejected');
        return;
      }
      const deletedName = permanentDeleteTarget.name;
      setPermanentDeleteTarget(null);
      showToast('success', `Permanently deleted "${deletedName}".`);
      await fetchWorkspace();
    } catch (err: any) {
      showToast('error', err.message || 'Permanent delete failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareTarget) return;
    if (!shareSelectedId) {
      setShareError('Select a user or role before adding permission.');
      return;
    }

    const targetName =
      shareTargetType === 'user'
        ? allUsers.find(u => u.id === shareSelectedId)?.fullNameEn || shareSelectedId
        : EPSS_ROLES.find(r => r.role === shareSelectedId)?.label || shareSelectedId;

    setIsSubmitting(true);
    setShareError(null);
    try {
      const res = await fetch(`/api/v1/workspace/items/${shareTarget.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentUser ? { 'x-user-id': currentUser.id } : {})
        },
        body: JSON.stringify({
          targetType: shareTargetType,
          targetId: shareSelectedId,
          targetName,
          permission: sharePermission
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setShareError(data.error || 'Failed to update sharing');
        return;
      }
      setShareTarget(data);
      syncOpenItemState(data);
      setShareSelectedId('');
      showToast('success', `Shared with ${targetName} (${sharePermission}).`);
      await fetchWorkspace();
    } catch (err: any) {
      setShareError(err.message || 'Share failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    if (!shareTarget) return;
    try {
      const res = await fetch(`/api/v1/workspace/items/${shareTarget.id}/share/${shareId}`, {
        method: 'DELETE',
        headers: currentUser ? { 'x-user-id': currentUser.id } : {}
      });
      if (res.ok) {
        const updated = await res.json();
        setShareTarget(updated);
        syncOpenItemState(updated);
        await fetchWorkspace();
      }
    } catch {
      showToast('error', 'Failed to revoke access');
    }
  };

  const handleToggleShareLink = async (enabled: boolean, permission?: WorkspacePermissionLevel) => {
    if (!shareTarget) return;
    try {
      const res = await fetch(`/api/v1/workspace/items/${shareTarget.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentUser ? { 'x-user-id': currentUser.id } : {})
        },
        body: JSON.stringify({
          shareLinkEnabled: enabled,
          shareLinkPermission: permission || shareTarget.shareLinkPermission || 'Viewer'
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setShareTarget(updated);
        syncOpenItemState(updated);
        await fetchWorkspace();
      }
    } catch {
      showToast('error', 'Failed to update share link');
    }
  };

  const handleRestoreVersion = async (itemId: string, versionNumber: number) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/workspace/items/${itemId}/versions/${versionNumber}/restore`, {
        method: 'POST',
        headers: currentUser ? { 'x-user-id': currentUser.id } : {}
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Version restore failed');
        return;
      }
      setVersionTarget(data);
      syncOpenItemState(data);
      showToast('success', `Restored v${versionNumber} as latest version v${data.currentVersion}.`);
      await fetchWorkspace();
    } catch {
      showToast('error', 'Failed to restore version');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = (item: WorkspaceItem, versionNumber?: number) => {
    const verQuery = versionNumber ? `?version=${versionNumber}` : '';
    const url = `/api/v1/workspace/items/${item.id}/download${verQuery}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = item.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => fetchWorkspace(), 600);
  };

  // Drag-and-Drop handlers for internal moves & external OS uploads
  const onItemDragStart = (e: React.DragEvent, item: WorkspaceItem) => {
    if (activeView === 'trash') return;
    setDraggedItemId(item.id);
    e.dataTransfer.setData('application/epss-workspace-id', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onFolderDrop = (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragTargetFolderId(null);
    setIsExternalFileDrag(false);

    const internalId = e.dataTransfer.getData('application/epss-workspace-id') || draggedItemId;
    if (internalId) {
      setDraggedItemId(null);
      if (internalId !== targetFolderId) {
        handleMoveItem(internalId, targetFolderId);
      }
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  // Check if a folder is invalid move destination (self or descendant of moveTarget)
  const isDescendantOrSelf = (candidateId: string, sourceItem: WorkspaceItem): boolean => {
    if (sourceItem.itemType !== 'folder') return false;
    if (candidateId === sourceItem.id) return true;
    let curr: string | null = candidateId;
    const visited = new Set<string>();
    while (curr) {
      if (curr === sourceItem.id) return true;
      if (visited.has(curr)) break;
      visited.add(curr);
      const found = allFolders.find(f => f.id === curr);
      curr = found ? found.parentId : null;
    }
    return false;
  };

  const renderItemIcon = (item: WorkspaceItem, size: 'sm' | 'lg' = 'lg') => {
    const cls = size === 'lg' ? 'w-9 h-9' : 'w-4 h-4 shrink-0';
    if (item.itemType === 'folder') {
      return <Folder className={`${cls} text-amber-500 fill-amber-500/15`} />;
    }
    const ext = (item.extension || '').toLowerCase();
    if (ext === 'pdf') return <FileText className={`${cls} text-rose-600 dark:text-rose-400`} />;
    if (['csv', 'xls', 'xlsx'].includes(ext)) return <FileSpreadsheet className={`${cls} text-emerald-600 dark:text-emerald-400`} />;
    if (['json', 'txt'].includes(ext)) return <FileCode className={`${cls} text-sky-600 dark:text-sky-400`} />;
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) return <ImageIcon className={`${cls} text-violet-600 dark:text-violet-400`} />;
    return <File className={`${cls} text-teal-600 dark:text-teal-400`} />;
  };

  const openContextMenuAt = (e: React.MouseEvent, item: WorkspaceItem) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 230);
    const y = Math.min(e.clientY, window.innerHeight - 340);
    setContextMenu({ item, x, y });
  };

  const handleOpenItem = (item: WorkspaceItem) => {
    if (item.isTrashed) return;
    if (item.itemType === 'folder') {
      setActiveView('drive');
      setSearchQuery('');
      setCurrentFolderId(item.id);
    } else {
      setPreviewTab('preview');
      setPreviewItem(item);
    }
  };

  const storageQuotaBytes = 50 * 1024 * 1024 * 1024; // 50 GB enterprise pool display
  const storagePct = Math.min(100, Math.max(2, (stats.totalBytes / storageQuotaBytes) * 100));

  const filteredUsersForShare = allUsers.filter(u =>
    u.fullNameEn.toLowerCase().includes(shareUserSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(shareUserSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(shareUserSearch.toLowerCase())
  );

  // Parse CSV preview into rows safely
  const parseCsvRows = (text: string): string[][] => {
    return text
      .split(/\r?\n/)
      .filter(line => line.trim().length > 0)
      .slice(0, 60)
      .map(line => line.split(',').map(cell => cell.trim()));
  };

  return (
    <div
      className="space-y-4 relative"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files') && activeView !== 'trash') {
          e.preventDefault();
          setIsExternalFileDrag(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) {
          setIsExternalFileDrag(false);
        }
      }}
      onDrop={(e) => {
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && activeView !== 'trash') {
          e.preventDefault();
          setIsExternalFileDrag(false);
          handleUploadFiles(e.dataTransfer.files);
        }
      }}
    >
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleUploadFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />
      <input
        ref={newVersionInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && newVersionTarget) {
            handleUploadFiles(e.target.files, newVersionTarget.id);
            e.target.value = '';
            setNewVersionTarget(null);
          }
        }}
      />

      {/* External OS File Drag Overlay */}
      {isExternalFileDrag && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setIsExternalFileDrag(false);
            if (e.dataTransfer.files?.length) {
              handleUploadFiles(e.dataTransfer.files);
            }
          }}
          className="fixed inset-0 z-50 bg-teal-950/55 backdrop-blur-[2px] flex items-center justify-center p-6 pointer-events-auto"
        >
          <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-teal-500 rounded-2xl px-12 py-10 text-center max-w-md shadow-xl">
            <UploadCloud className="w-12 h-12 text-teal-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {language === 'am' ? 'ፋይሎችን እዚህ ይጣሉ' : 'Drop Files to Upload to Workspace'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {language === 'am'
                ? 'ፋይሎች በራስ-ሰር የቫይረስ እና የፋይል ዓይነት ፍተሻ ይደረግባቸዋል።'
                : 'Files are verified via magic-byte inspection and malware scan (max 50 MB each).'}
            </p>
          </div>
        </div>
      )}

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {language === 'am' ? 'የኢ.መ.አ.አ የጋራ የሰነድ ማከማቻ (Drive)' : 'EPSS Enterprise Drive & Workspace'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'am'
              ? 'ባለብዙ-ደረጃ አቃፊዎች፣ የፋይል ስሪት ቁጥጥር፣ ደህንነቱ የተጠበቀ ማጋራት እና የመጣያ ቅርጫት'
              : 'Hierarchical folders, binary uploads with malware verification, versioning, role sharing, and activity auditing.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeView !== 'trash' && (
            <>
              <button
                onClick={() => {
                  setNewFolderName('');
                  setFolderFormError(null);
                  setFolderModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
                <span>{language === 'am' ? 'አዲስ አቃፊ' : 'New Folder'}</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white whitespace-nowrap shrink-0 transition-colors shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{language === 'am' ? 'ፋይል ጫን' : 'Upload Files'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Inline Toast Banner */}
      {toast && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border text-xs font-medium ${
            toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="p-0.5 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Upload Progress Queue */}
      {uploadQueue.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Upload Queue ({uploadQueue.length})
            </span>
            <button
              onClick={() => setUploadQueue(prev => prev.filter(q => q.status === 'uploading'))}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Clear Completed
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {uploadQueue.map(u => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {u.fileName}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-slate-500 shrink-0">
                      {u.status === 'error' ? 'Blocked' : `${u.progress}%`}
                    </span>
                  </div>
                  {u.status === 'error' ? (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5 truncate" title={u.error}>
                      {u.error}
                    </p>
                  ) : (
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-200 ${
                          u.status === 'done' ? 'bg-emerald-600' : 'bg-teal-600'
                        }`}
                        style={{ width: `${u.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                {u.status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                {u.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Layout: Left Rail + Workspace Area */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left Navigation Rail */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 space-y-1">
            {[
              { id: 'drive' as WorkspaceView, label: language === 'am' ? 'የእኔ ማከማቻ' : 'My Workspace', icon: HardDrive },
              { id: 'shared' as WorkspaceView, label: language === 'am' ? 'ለእኔ የተጋሩ' : 'Shared with Me', icon: Users },
              { id: 'starred' as WorkspaceView, label: language === 'am' ? 'ኮከብ የተደረገባቸው' : 'Starred', icon: Star },
              { id: 'trash' as WorkspaceView, label: language === 'am' ? 'መጣያ (Trash)' : 'Trash', icon: Trash2, badge: stats.trashedCount }
            ].map(nav => {
              const Icon = nav.icon;
              const isActive = activeView === nav.id;
              return (
                <button
                  key={nav.id}
                  onClick={() => {
                    setActiveView(nav.id);
                    if (nav.id !== 'drive') setCurrentFolderId(null);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-700 dark:text-teal-400' : 'text-slate-400'}`} />
                    <span className="truncate">{nav.label}</span>
                  </div>
                  {typeof nav.badge === 'number' && nav.badge > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-mono tabular-nums rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {nav.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Storage Summary Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {language === 'am' ? 'የማከማቻ መጠን' : 'Vault Storage'}
              </span>
              <ShieldCheck className="w-4 h-4 text-teal-600" />
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-teal-600 rounded-full" style={{ width: `${storagePct}%` }} />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              <span>{formatBytes(stats.totalBytes)} used</span>
              <span>50 GB pool</span>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <div className="text-slate-400">Folders</div>
                <div className="font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200">
                  {stats.totalFolders}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Active Files</div>
                <div className="font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200">
                  {stats.totalFiles}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Workspace Content Area */}
        <section className="lg:col-span-4 space-y-3">
          {/* Toolbar: Search, Breadcrumb & View Mode */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    language === 'am'
                      ? 'በአቃፊ ወይም በፋይል ስም ይፈልጉ...'
                      : 'Search workspace files and folders...'
                  }
                  className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg self-end sm:self-auto shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Grid</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  title="List View"
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>List</span>
                </button>
              </div>
            </div>

            {/* Clickable Breadcrumbs (with Drag-and-Drop Upward Move Targets) */}
            <div className="flex items-center flex-wrap gap-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              {activeView === 'drive' && !searchQuery ? (
                breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  const dropKey = crumb.id === null ? '__ROOT__' : crumb.id;
                  const isDropHighlighted = dragTargetFolderId === dropKey;
                  return (
                    <React.Fragment key={dropKey}>
                      {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                      <button
                        onClick={() => setCurrentFolderId(crumb.id)}
                        onDragOver={(e) => {
                          if (!isLast) {
                            e.preventDefault();
                            setDragTargetFolderId(dropKey);
                          }
                        }}
                        onDragLeave={() => setDragTargetFolderId(null)}
                        onDrop={(e) => {
                          if (!isLast) onFolderDrop(e, crumb.id);
                        }}
                        className={`px-2 py-1 rounded-md transition-colors truncate max-w-[200px] ${
                          isDropHighlighted
                            ? 'ring-2 ring-teal-500 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 font-semibold'
                            : isLast
                              ? 'font-bold text-slate-900 dark:text-slate-100'
                              : 'font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {crumb.name}
                      </button>
                    </React.Fragment>
                  );
                })
              ) : (
                <div className="px-2 py-1 font-bold text-slate-800 dark:text-slate-200">
                  {searchQuery
                    ? `Search results for "${searchQuery}"`
                    : activeView === 'shared'
                      ? 'Shared with Me'
                      : activeView === 'starred'
                        ? 'Starred Items'
                        : 'Trash (Soft-Deleted Items)'}
                </div>
              )}
            </div>
          </div>

          {/* Items Container */}
          {isLoading ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-xs text-slate-500">
              Loading workspace files...
            </div>
          ) : items.length === 0 ? (
            /* Empty State Illustration & Call-to-Action */
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
              <svg
                className="w-24 h-24 mx-auto mb-4 text-slate-300 dark:text-slate-700"
                viewBox="0 0 96 96"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="12" y="24" width="72" height="54" rx="8" stroke="currentColor" strokeWidth="2.5" />
                <path d="M12 34H42L48 24H20C15.5817 24 12 27.5817 12 32V34Z" fill="currentColor" fillOpacity="0.25" />
                <path d="M48 44V62M48 44L41 51M48 44L55 51" stroke="#0f766e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {activeView === 'trash'
                  ? 'Trash is empty'
                  : searchQuery
                    ? 'No matching files or folders found'
                    : 'This folder is empty'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                {activeView === 'trash'
                  ? 'Deleted items remain here until restored or permanently purged by the owner or SuperAdmin.'
                  : 'Create a subfolder or drag and drop PDF, Word, Excel, CSV, or image files directly here.'}
              </p>
              {activeView !== 'trash' && !searchQuery && (
                <div className="flex items-center justify-center gap-2.5 mt-5">
                  <button
                    onClick={() => {
                      setNewFolderName('');
                      setFolderFormError(null);
                      setFolderModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
                    <span>New Folder</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Files</span>
                  </button>
                </div>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid Cards View */
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {items.map(item => {
                const isStarred = currentUser ? item.starredBy.includes(currentUser.id) : false;
                const isDropTarget = item.itemType === 'folder' && dragTargetFolderId === item.id;
                const isShared = (item.shares?.length || 0) > 0 || item.shareLinkEnabled;

                return (
                  <div
                    key={item.id}
                    draggable={activeView !== 'trash'}
                    onDragStart={(e) => onItemDragStart(e, item)}
                    onDragOver={(e) => {
                      if (item.itemType === 'folder' && draggedItemId && draggedItemId !== item.id) {
                        e.preventDefault();
                        setDragTargetFolderId(item.id);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragTargetFolderId === item.id) setDragTargetFolderId(null);
                    }}
                    onDrop={(e) => {
                      if (item.itemType === 'folder') {
                        onFolderDrop(e, item.id);
                      }
                    }}
                    onDoubleClick={() => handleOpenItem(item)}
                    onContextMenu={(e) => openContextMenuAt(e, item)}
                    className={`group bg-white dark:bg-slate-900 rounded-xl border p-3.5 transition-all cursor-pointer select-none ${
                      isDropTarget
                        ? 'ring-2 ring-teal-500 border-teal-500 bg-teal-50/50 dark:bg-teal-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-teal-500/50 dark:hover:border-teal-500/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="flex items-center gap-3 min-w-0 flex-1"
                        onClick={() => handleOpenItem(item)}
                      >
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 shrink-0">
                          {renderItemIcon(item, 'lg')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate" title={item.name}>
                            {item.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 font-mono tabular-nums">
                            <span>{item.itemType === 'folder' ? 'Folder' : formatBytes(item.size)}</span>
                            {item.itemType === 'file' && item.currentVersion && (
                              <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded text-[10px]">
                                v{item.currentVersion}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        {!item.isTrashed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStar(item);
                            }}
                            title={isStarred ? 'Remove star' : 'Star item'}
                            className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                isStarred
                                  ? 'text-amber-500 fill-amber-500'
                                  : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-400'
                              }`}
                            />
                          </button>
                        )}
                        <button
                          onClick={(e) => openContextMenuAt(e, item)}
                          title="Item actions"
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="truncate font-mono tabular-nums">{formatDateTime(item.updatedAt)}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isShared && (
                          <span className="inline-flex items-center gap-0.5 text-teal-700 dark:text-teal-400" title="Shared">
                            <Users className="w-3 h-3" />
                          </span>
                        )}
                        {item.itemType === 'file' && item.virusScanStatus === 'Clean' && (
                          <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400" title="Malware Scan: Clean">
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List Table View */
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Name</th>
                      <th className="px-4 py-2.5 font-semibold">Owner</th>
                      <th className="px-4 py-2.5 font-semibold">Modified</th>
                      <th className="px-4 py-2.5 font-semibold">Size / Version</th>
                      <th className="px-4 py-2.5 font-semibold">Security</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map(item => {
                      const isStarred = currentUser ? item.starredBy.includes(currentUser.id) : false;
                      const isDropTarget = item.itemType === 'folder' && dragTargetFolderId === item.id;
                      const isShared = (item.shares?.length || 0) > 0 || item.shareLinkEnabled;

                      return (
                        <tr
                          key={item.id}
                          draggable={activeView !== 'trash'}
                          onDragStart={(e) => onItemDragStart(e, item)}
                          onDragOver={(e) => {
                            if (item.itemType === 'folder' && draggedItemId && draggedItemId !== item.id) {
                              e.preventDefault();
                              setDragTargetFolderId(item.id);
                            }
                          }}
                          onDragLeave={() => {
                            if (dragTargetFolderId === item.id) setDragTargetFolderId(null);
                          }}
                          onDrop={(e) => {
                            if (item.itemType === 'folder') onFolderDrop(e, item.id);
                          }}
                          onDoubleClick={() => handleOpenItem(item)}
                          onContextMenu={(e) => openContextMenuAt(e, item)}
                          className={`cursor-pointer transition-colors ${
                            isDropTarget
                              ? 'bg-teal-50 dark:bg-teal-950/40 ring-1 ring-inset ring-teal-500'
                              : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-2.5" onClick={() => handleOpenItem(item)}>
                              {renderItemIcon(item, 'sm')}
                              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[260px]">
                                {item.name}
                              </span>
                              {isShared && <Users className="w-3.5 h-3.5 text-teal-600 shrink-0" />}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-400">
                            {item.ownerName}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            {formatDateTime(item.updatedAt)}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap font-mono tabular-nums text-slate-600 dark:text-slate-400">
                            {item.itemType === 'folder'
                              ? 'Folder'
                              : `${formatBytes(item.size)} · v${item.currentVersion || 1}`}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>{item.virusScanStatus}</span>
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              {!item.isTrashed && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleStar(item);
                                  }}
                                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                  <Star
                                    className={`w-3.5 h-3.5 ${
                                      isStarred ? 'text-amber-500 fill-amber-500' : 'text-slate-400'
                                    }`}
                                  />
                                </button>
                              )}
                              {item.itemType === 'file' && !item.isTrashed && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(item);
                                  }}
                                  title="Download"
                                  className="p-1 rounded text-slate-500 hover:text-teal-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={(e) => openContextMenuAt(e, item)}
                                className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Right-Click / Overflow Context Menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1.5 text-xs"
        >
          {contextMenu.item.isTrashed ? (
            <>
              <button
                onClick={() => {
                  const target = contextMenu.item;
                  setContextMenu(null);
                  handleRestoreFromTrash(target);
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <RotateCcw className="w-3.5 h-3.5 text-teal-600" />
                <span>Restore from Trash</span>
              </button>
              <button
                onClick={() => {
                  const target = contextMenu.item;
                  setContextMenu(null);
                  setPermanentDeleteTarget(target);
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Forever</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  const target = contextMenu.item;
                  setContextMenu(null);
                  handleOpenItem(target);
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold"
              >
                <Eye className="w-3.5 h-3.5 text-teal-600" />
                <span>{contextMenu.item.itemType === 'folder' ? 'Open Folder' : 'Preview File'}</span>
              </button>

              {contextMenu.item.itemType === 'file' && (
                <>
                  <button
                    onClick={() => {
                      const target = contextMenu.item;
                      setContextMenu(null);
                      handleDownload(target);
                    }}
                    className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => {
                      const target = contextMenu.item;
                      setContextMenu(null);
                      setNewVersionTarget(target);
                      newVersionInputRef.current?.click();
                    }}
                    className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Upload New Version</span>
                  </button>
                  <button
                    onClick={() => {
                      const target = contextMenu.item;
                      setContextMenu(null);
                      setVersionTarget(target);
                    }}
                    className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>Version History (v{contextMenu.item.currentVersion || 1})</span>
                  </button>
                </>
              )}

              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

              <button
                onClick={() => {
                  const target = contextMenu.item;
                  setContextMenu(null);
                  setShareTarget(target);
                  setShareError(null);
                  setShareSelectedId('');
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Share & Permissions</span>
              </button>

              <button
                onClick={() => {
                  const target = contextMenu.item;
                  setContextMenu(null);
                  setRenameTarget(target);
                  setRenameValue(target.name);
                  setRenameError(null);
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>Rename</span>
              </button>

              <button
                onClick={() => {
                  const target = contextMenu.item;
                  setContextMenu(null);
                  setMoveTarget(target);
                  setMoveDestId(target.parentId);
                  setMoveError(null);
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <FolderInput className="w-3.5 h-3.5 text-slate-500" />
                <span>Move to...</span>
              </button>

              <button
                onClick={() => {
                  const target = contextMenu.item;
                  setContextMenu(null);
                  setPreviewTab('activity');
                  setPreviewItem(target);
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Activity className="w-3.5 h-3.5 text-slate-500" />
                <span>Activity Log</span>
              </button>

              <button
                onClick={() => {
                  const target = contextMenu.item;
                  setContextMenu(null);
                  handleToggleStar(target);
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Star className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {currentUser && contextMenu.item.starredBy.includes(currentUser.id)
                    ? 'Remove Star'
                    : 'Add Star'}
                </span>
              </button>

              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

              <button
                onClick={() => {
                  const target = contextMenu.item;
                  setContextMenu(null);
                  handleTrash(target);
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Move to Trash</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* MODAL: New Folder */}
      {folderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-md p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Create New Workspace Folder
              </h3>
              <button onClick={() => setFolderModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => {
                    setNewFolderName(e.target.value);
                    setFolderFormError(null);
                  }}
                  placeholder="e.g., 2026 Cold-Chain Audits"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                {folderFormError && (
                  <p className="text-[11px] text-rose-600 mt-1.5">{folderFormError}</p>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFolderModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Rename */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-md p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Rename {renameTarget.itemType === 'folder' ? 'Folder' : 'File'}
              </h3>
              <button onClick={() => setRenameTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRenameSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Name
                </label>
                <input
                  type="text"
                  autoFocus
                  value={renameValue}
                  onChange={(e) => {
                    setRenameValue(e.target.value);
                    setRenameError(null);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                {renameError && <p className="text-[11px] text-rose-600 mt-1.5">{renameError}</p>}
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white disabled:opacity-50"
                >
                  Save Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Move to Folder */}
      {moveTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-md p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate pr-4">
                Move "{moveTarget.name}"
              </h3>
              <button onClick={() => setMoveTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
              <button
                type="button"
                onClick={() => setMoveDestId(null)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs text-left ${
                  moveDestId === null
                    ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200 font-bold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <HardDrive className="w-4 h-4 text-teal-600 shrink-0" />
                <span>EPSS Workspace (Root)</span>
              </button>
              {allFolders.map(folder => {
                const blocked = isDescendantOrSelf(folder.id, moveTarget);
                return (
                  <button
                    key={folder.id}
                    type="button"
                    disabled={blocked}
                    onClick={() => setMoveDestId(folder.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-xs text-left ${
                      blocked
                        ? 'opacity-40 cursor-not-allowed text-slate-400'
                        : moveDestId === folder.id
                          ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="truncate">{folder.name}</span>
                    </div>
                    {blocked && <span className="text-[10px] font-mono">Disabled</span>}
                  </button>
                );
              })}
            </div>
            {moveError && <p className="text-[11px] text-rose-600">{moveError}</p>}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setMoveTarget(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                disabled={isSubmitting}
                onClick={() => handleMoveItem(moveTarget.id, moveDestId)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white disabled:opacity-50"
              >
                Move Here
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Share & Permissions */}
      {shareTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-lg p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  Share "{shareTarget.name}"
                </h3>
                <p className="text-[11px] text-slate-500">
                  Assign Viewer or Editor access to EPSS personnel or roles
                </p>
              </div>
              <button onClick={() => setShareTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddShare} className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShareTargetType('user');
                    setShareSelectedId('');
                  }}
                  className={`px-2.5 py-1 rounded-md font-semibold ${
                    shareTargetType === 'user'
                      ? 'bg-teal-700 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Staff User
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShareTargetType('role');
                    setShareSelectedId('');
                  }}
                  className={`px-2.5 py-1 rounded-md font-semibold ${
                    shareTargetType === 'role'
                      ? 'bg-teal-700 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Institutional Role
                </button>
              </div>

              {shareTargetType === 'user' && (
                <input
                  type="text"
                  value={shareUserSearch}
                  onChange={(e) => setShareUserSearch(e.target.value)}
                  placeholder="Filter staff by name, email, or role..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              )}

              <div className="flex items-center gap-2">
                <select
                  value={shareSelectedId}
                  onChange={(e) => {
                    setShareSelectedId(e.target.value);
                    setShareError(null);
                  }}
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="">
                    {shareTargetType === 'user' ? 'Select staff member...' : 'Select EPSS role...'}
                  </option>
                  {shareTargetType === 'user'
                    ? filteredUsersForShare.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.fullNameEn} ({u.role})
                        </option>
                      ))
                    : EPSS_ROLES.map(r => (
                        <option key={r.role} value={r.role}>
                          {r.label} ({r.role})
                        </option>
                      ))}
                </select>

                <select
                  value={sharePermission}
                  onChange={(e) => setSharePermission(e.target.value as WorkspacePermissionLevel)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="Viewer">Viewer</option>
                  <option value="Editor">Editor</option>
                </select>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white whitespace-nowrap shrink-0"
                >
                  Grant
                </button>
              </div>
              {shareError && <p className="text-[11px] text-rose-600">{shareError}</p>}
            </form>

            {/* Current Permissions List */}
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              <div className="text-[11px] font-semibold uppercase text-slate-400">People & Roles with Access</div>
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{shareTarget.ownerName}</span>
                  <span className="ml-2 text-[11px] text-slate-400">(Owner)</span>
                </div>
                <span className="font-mono text-[11px] text-teal-700 dark:text-teal-400">Full Control</span>
              </div>

              {(shareTarget.shares || []).map(s => (
                <div
                  key={s.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800 text-xs"
                >
                  <div>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{s.targetName}</span>
                    <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {s.targetType === 'role' ? 'Role' : 'User'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-teal-700 dark:text-teal-400">{s.permission}</span>
                    <button
                      onClick={() => handleRemoveShare(s.id)}
                      className="text-rose-600 hover:underline text-[11px]"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Share Link Section */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <Link2 className="w-4 h-4 text-teal-600" />
                  <span>Internal EPSS Share Link</span>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={!!shareTarget.shareLinkEnabled}
                    onChange={(e) => handleToggleShareLink(e.target.checked)}
                    className="rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                  />
                  <span>{shareTarget.shareLinkEnabled ? 'Enabled' : 'Disabled'}</span>
                </label>
              </div>
              {shareTarget.shareLinkEnabled && shareTarget.shareLinkToken && (
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={`${window.location.origin}/?workspaceToken=${shareTarget.shareLinkToken}`}
                    className="flex-1 px-2.5 py-1.5 text-[11px] font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  />
                  <select
                    value={shareTarget.shareLinkPermission || 'Viewer'}
                    onChange={(e) => handleToggleShareLink(true, e.target.value as WorkspacePermissionLevel)}
                    className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <option value="Viewer">Viewer</option>
                    <option value="Editor">Editor</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(`${window.location.origin}/?workspaceToken=${shareTarget.shareLinkToken}`);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Version History */}
      {versionTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  Version History: {versionTarget.name}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Current active revision: v{versionTarget.currentVersion || 1}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setNewVersionTarget(versionTarget);
                    newVersionInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload New Version</span>
                </button>
                <button onClick={() => setVersionTarget(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
              {[...(versionTarget.versions || [])].reverse().map(ver => {
                const isCurrent = ver.versionNumber === versionTarget.currentVersion;
                return (
                  <div key={ver.versionNumber} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          v{ver.versionNumber}.0
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                            Current
                          </span>
                        )}
                        <span className="text-slate-500 font-mono tabular-nums">
                          {formatBytes(ver.fileSize)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Uploaded by <span className="font-medium text-slate-700 dark:text-slate-300">{ver.uploadedByName}</span> · {formatDateTime(ver.uploadedAt)}
                      </div>
                      {ver.notes && (
                        <div className="text-[11px] text-slate-500 italic mt-0.5">{ver.notes}</div>
                      )}
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        SHA-256: {ver.sha256.slice(0, 20)}...
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleDownload(versionTarget, ver.versionNumber)}
                        className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
                      >
                        Download
                      </button>
                      {!isCurrent && (
                        <button
                          disabled={isSubmitting}
                          onClick={() => handleRestoreVersion(versionTarget.id, ver.versionNumber)}
                          className="px-2.5 py-1 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold hover:opacity-90"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Permanent Delete Confirmation */}
      {permanentDeleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 rounded-xl w-full max-w-md p-5 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Permanently Delete Item?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  This will irreversibly purge <span className="font-semibold text-slate-800 dark:text-slate-200">"{permanentDeleteTarget.name}"</span> and all stored file revisions from EPSS storage. Only the owner or SuperAdmin can execute permanent deletion.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setPermanentDeleteTarget(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                disabled={isSubmitting}
                onClick={handlePermanentDelete}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW & ACTIVITY DRAWER / MODAL */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex justify-end">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl h-full border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl">
            {/* Drawer Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {renderItemIcon(previewItem, 'sm')}
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {previewItem.name}
                  </h2>
                  <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                    {previewItem.itemType === 'folder'
                      ? 'Folder'
                      : `${formatBytes(previewItem.size)} · v${previewItem.currentVersion || 1}.0 · ${previewItem.virusScanStatus}`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {previewItem.itemType === 'file' && (
                  <button
                    onClick={() => handleDownload(previewItem)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                )}
                <button
                  onClick={() => setShareTarget(previewItem)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-5 text-xs">
              {previewItem.itemType === 'file' && (
                <button
                  onClick={() => setPreviewTab('preview')}
                  className={`py-2.5 font-semibold border-b-2 transition-colors ${
                    previewTab === 'preview'
                      ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Document Preview
                </button>
              )}
              <button
                onClick={() => setPreviewTab('activity')}
                className={`py-2.5 font-semibold border-b-2 transition-colors ${
                  previewTab === 'activity'
                    ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Activity Log ({previewItem.activityLog?.length || 0})
              </button>
              <button
                onClick={() => setPreviewTab('details')}
                className={`py-2.5 font-semibold border-b-2 transition-colors ${
                  previewTab === 'details'
                    ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Metadata & Permissions
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 bg-slate-50 dark:bg-slate-950/40">
              {previewTab === 'preview' && previewItem.itemType === 'file' ? (
                (() => {
                  const ext = (previewItem.extension || '').toLowerCase();
                  if (ext === 'pdf') {
                    return (
                      <iframe
                        title={previewItem.name}
                        src={`/api/v1/workspace/items/${previewItem.id}/download?inline=1`}
                        className="w-full h-[72vh] rounded-xl border border-slate-200 dark:border-slate-800 bg-white"
                      />
                    );
                  }
                  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
                    return (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-center min-h-[400px]">
                        <img
                          src={`/api/v1/workspace/items/${previewItem.id}/download?inline=1`}
                          alt={previewItem.name}
                          className="max-h-[68vh] max-w-full object-contain rounded-lg"
                        />
                      </div>
                    );
                  }
                  if (['csv', 'json', 'txt'].includes(ext)) {
                    if (previewTextLoading) {
                      return <div className="text-xs text-slate-500 py-10 text-center">Loading content preview...</div>;
                    }
                    if (ext === 'csv' && previewTextContent) {
                      const rows = parseCsvRows(previewTextContent);
                      return (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              <tr>
                                {(rows[0] || []).map((cell, idx) => (
                                  <th key={idx} className="px-3 py-2 font-semibold whitespace-nowrap">
                                    {cell}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {rows.slice(1).map((row, rIdx) => (
                                <tr key={rIdx}>
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="px-3 py-2 font-mono text-[11px] whitespace-nowrap text-slate-700 dark:text-slate-300">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    }
                    return (
                      <pre className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-800 dark:text-slate-200 overflow-x-auto whitespace-pre-wrap">
                        {previewTextContent || ''}
                      </pre>
                    );
                  }

                  return (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-3">
                      {renderItemIcon(previewItem, 'lg')}
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Inline preview unavailable for .{ext || 'binary'} files
                      </h4>
                      <p className="text-xs text-slate-500">
                        This file passed EPSS security & magic-byte validation and is ready to download.
                      </p>
                      <button
                        onClick={() => handleDownload(previewItem)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download {previewItem.name}</span>
                      </button>
                    </div>
                  );
                })()
              ) : previewTab === 'activity' ? (
                <div className="space-y-2.5">
                  {(previewItem.activityLog || []).map(act => (
                    <div
                      key={act.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <Clock className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {act.actorName}
                            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {act.action}
                            </span>
                          </div>
                          <div className="text-slate-600 dark:text-slate-400 mt-0.5">{act.details}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono tabular-nums text-slate-400 whitespace-nowrap">
                        {formatDateTime(act.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-slate-400">Owner</div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{previewItem.ownerName}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Item Type</div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 capitalize">{previewItem.itemType}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Created</div>
                      <div className="font-mono tabular-nums text-slate-700 dark:text-slate-300 mt-0.5">{formatDateTime(previewItem.createdAt)}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Last Modified</div>
                      <div className="font-mono tabular-nums text-slate-700 dark:text-slate-300 mt-0.5">{formatDateTime(previewItem.updatedAt)}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">MIME Type</div>
                      <div className="font-mono text-slate-700 dark:text-slate-300 mt-0.5">{previewItem.mimeType || 'inode/directory'}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Virus & Integrity Scan</div>
                      <div className="font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">{previewItem.virusScanStatus}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
