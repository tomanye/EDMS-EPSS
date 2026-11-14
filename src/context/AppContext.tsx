import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  apiFetch,
  ensureApiFetchInterceptor,
  setUnauthorizedHandler,
  TOKEN_STORAGE_KEY
} from '../lib/apiFetch.js';
import { createNotificationSocketClient } from '../lib/notificationSocket.js';
import { translations } from '../lib/translations.js';
import { hasEffectivePermission } from '../lib/permissions.js';
import {
  AppNotification,
  AuthSession,
  Branch,
  DelegationRecord,
  Department,
  DocumentItem,
  DocumentType,
  EffectivePermissionPreview,
  EnterpriseRole,
  ExecutiveKpiSummary,
  Language,
  RolePermissionMatrix,
  User
} from '../types/index.js';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User | null;
  session: AuthSession | null;
  roleMatrix: RolePermissionMatrix[];
  delegations: DelegationRecord[];
  effectivePermissions: EffectivePermissionPreview | null;
  enterpriseRoles: EnterpriseRole[];
  can: (permission: string) => boolean;
  isAuthenticated: boolean;
  isAuthChecking: boolean;
  loginSuccess: (token: string, user: User, session: AuthSession) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  markMfaVerifiedLocal: () => void;
  branches: Branch[];
  departments: Department[];
  documents: DocumentItem[];
  kpis: ExecutiveKpiSummary | null;
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  realtimeConnected: boolean;
  isLoading: boolean;
  refreshData: () => Promise<void>;
  selectedDocument: DocumentItem | null;
  setSelectedDocument: (doc: DocumentItem | null) => void;
  isRegisterModalOpen: boolean;
  setIsRegisterModalOpen: (open: boolean) => void;
  registerModalType: DocumentType;
  replyToDocument: DocumentItem | null;
  clearReplyContext: () => void;
  openRegisterModal: (type: DocumentType, replyToDoc?: DocumentItem | null) => void;
  t: (key: keyof typeof translations.en) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

ensureApiFetchInterceptor();

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [roleMatrix, setRoleMatrix] = useState<RolePermissionMatrix[]>([]);
  const [delegations, setDelegations] = useState<DelegationRecord[]>([]);
  const [effectivePermissions, setEffectivePermissions] = useState<EffectivePermissionPreview | null>(null);
  const [enterpriseRoles, setEnterpriseRoles] = useState<EnterpriseRole[]>([]);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [kpis, setKpis] = useState<ExecutiveKpiSummary | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [realtimeConnected, setRealtimeConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpenState] = useState<boolean>(false);
  const [registerModalType, setRegisterModalType] = useState<DocumentType>('IncomingLetter');
  const [replyToDocument, setReplyToDocument] = useState<DocumentItem | null>(null);
  const isLoggingOutRef = useRef(false);

  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;
  const isAuthenticated = !!currentUser && !!session;

  const clearAuthState = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setCurrentUser(null);
    setSession(null);
    setRoleMatrix([]);
    setDelegations([]);
    setEffectivePermissions(null);
    setEnterpriseRoles([]);
    setBranches([]);
    setDepartments([]);
    setDocuments([]);
    setKpis(null);
    setNotifications([]);
    setSelectedDocument(null);
    setActiveTab('dashboard');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!isLoggingOutRef.current) {
        clearAuthState();
      }
    });
    return () => {
      setUnauthorizedHandler(null);
    };
  }, [clearAuthState]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setRealtimeConnected(false);
      return;
    }

    const socket = createNotificationSocketClient({
      onStatusChange: (connected) => setRealtimeConnected(connected),
      onEvent: (evt) => {
        if (evt.type === 'notifications:init') {
          setNotifications(Array.isArray(evt.notifications) ? evt.notifications : []);
        } else if (evt.type === 'notification:created' && evt.payload) {
          // Idempotent insert: never duplicate notification IDs across reconnects
          setNotifications((prev) =>
            prev.some((n) => n.id === evt.payload.id) ? prev : [evt.payload, ...prev]
          );
        } else if (evt.type === 'notification:read' && evt.payload?.id) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === evt.payload.id ? { ...n, isRead: true } : n))
          );
        } else if (evt.type === 'notification:read_all') {
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated]);

  const markNotificationAsRead = async (id: string) => {
    try {
      const res = await apiFetch(`/api/v1/notifications/${id}/read`, { method: 'POST' });
      if (!res.ok) return;
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const res = await apiFetch('/api/v1/notifications/read-all', { method: 'POST' });
      if (!res.ok) return;
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const loadProtectedData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [branchRes, deptRes, docRes, kpiRes, notifRes] = await Promise.all([
        apiFetch('/api/v1/organizations/branches').then(r => (r.ok ? r.json() : [])),
        apiFetch('/api/v1/organizations/departments').then(r => (r.ok ? r.json() : [])),
        apiFetch('/api/v1/correspondence').then(r => (r.ok ? r.json() : [])),
        apiFetch('/api/v1/analytics/kpis').then(r => (r.ok ? r.json() : null)),
        apiFetch('/api/v1/notifications').then(r => (r.ok ? r.json() : [])).catch(() => [])
      ]);

      setBranches(Array.isArray(branchRes) ? branchRes : []);
      setDepartments(Array.isArray(deptRes) ? deptRes : []);
      setDocuments(Array.isArray(docRes) ? docRes : []);
      setKpis(kpiRes || null);
      setNotifications(Array.isArray(notifRes) ? notifRes : []);
    } catch (err) {
      console.error('Error fetching protected EDRMS data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/auth/session');
      if (!res.ok) {
        clearAuthState();
        return;
      }
      const data = await res.json();
      if (data?.authenticated && data?.currentUser && data?.session) {
        setCurrentUser(data.currentUser);
        setSession(data.session);
        setRoleMatrix(Array.isArray(data.roleMatrix) ? data.roleMatrix : []);
        setDelegations(Array.isArray(data.delegations) ? data.delegations : []);
        setEffectivePermissions(data.effectivePermissions || null);
        setEnterpriseRoles(Array.isArray(data.enterpriseRoles) ? data.enterpriseRoles : []);
      } else {
        clearAuthState();
      }
    } catch {
      clearAuthState();
    }
  }, [clearAuthState]);

  const refreshData = useCallback(async () => {
    await refreshSession();
    if (localStorage.getItem(TOKEN_STORAGE_KEY)) {
      await loadProtectedData();
    }
  }, [refreshSession, loadProtectedData]);

  useEffect(() => {
    const bootstrap = async () => {
      setIsAuthChecking(true);
      try {
        const res = await apiFetch('/api/v1/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data?.authenticated && data?.currentUser && data?.session) {
            setCurrentUser(data.currentUser);
            setSession(data.session);
            setRoleMatrix(Array.isArray(data.roleMatrix) ? data.roleMatrix : []);
            setDelegations(Array.isArray(data.delegations) ? data.delegations : []);
            setEffectivePermissions(data.effectivePermissions || null);
            setEnterpriseRoles(Array.isArray(data.enterpriseRoles) ? data.enterpriseRoles : []);
            await loadProtectedData();
          } else {
            clearAuthState();
          }
        } else {
          clearAuthState();
        }
      } catch {
        clearAuthState();
      } finally {
        setIsAuthChecking(false);
      }
    };
    bootstrap();
  }, [loadProtectedData, clearAuthState]);

  const loginSuccess = async (token: string, user: User, newSession: AuthSession) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    setCurrentUser(user);
    setSession(newSession);
    await refreshSession();
    await loadProtectedData();
  };

  const logout = async () => {
    isLoggingOutRef.current = true;
    try {
      await apiFetch('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      // ignore network error on logout
    } finally {
      clearAuthState();
      isLoggingOutRef.current = false;
    }
  };

  const markMfaVerifiedLocal = () => {
    setSession(prev => (prev ? { ...prev, mfaVerified: true } : prev));
  };

  const setIsRegisterModalOpen = useCallback((open: boolean) => {
    setIsRegisterModalOpenState(open);
    if (!open) {
      setReplyToDocument(null);
    }
  }, []);

  const clearReplyContext = useCallback(() => {
    setReplyToDocument(null);
  }, []);

  const openRegisterModal = (type: DocumentType, replyToDoc?: DocumentItem | null) => {
    setRegisterModalType(type);
    setReplyToDocument(replyToDoc || null);
    setIsRegisterModalOpenState(true);
  };

  const can = useCallback(
    (permission: string) => hasEffectivePermission(effectivePermissions, currentUser, roleMatrix, permission),
    [effectivePermissions, currentUser, roleMatrix]
  );

  const t = (key: keyof typeof translations.en): string => {
    const dict = translations[language];
    return (dict as any)[key] || translations.en[key] || key;
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        theme,
        toggleTheme,
        activeTab,
        setActiveTab,
        currentUser,
        session,
        roleMatrix,
        delegations,
        effectivePermissions,
        enterpriseRoles,
        can,
        isAuthenticated,
        isAuthChecking,
        loginSuccess,
        logout,
        refreshSession,
        markMfaVerifiedLocal,
        branches,
        departments,
        documents,
        kpis,
        notifications,
        unreadNotificationsCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        realtimeConnected,
        isLoading,
        refreshData,
        selectedDocument,
        setSelectedDocument,
        isRegisterModalOpen,
        setIsRegisterModalOpen,
        registerModalType,
        replyToDocument,
        clearReplyContext,
        openRegisterModal,
        t
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
