import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations } from '../lib/translations.js';
import { AppNotification, Branch, Department, DocumentItem, DocumentType, ExecutiveKpiSummary, Language, User } from '../types/index.js';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User | null;
  availablePersonas: User[];
  switchUser: (userId: string) => Promise<void>;
  branches: Branch[];
  departments: Department[];
  documents: DocumentItem[];
  kpis: ExecutiveKpiSummary | null;
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => Promise<void>;
  isLoading: boolean;
  refreshData: () => Promise<void>;
  selectedDocument: DocumentItem | null;
  setSelectedDocument: (doc: DocumentItem | null) => void;
  isRegisterModalOpen: boolean;
  setIsRegisterModalOpen: (open: boolean) => void;
  registerModalType: DocumentType;
  openRegisterModal: (type: DocumentType) => void;
  t: (key: keyof typeof translations.en) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availablePersonas, setAvailablePersonas] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [kpis, setKpis] = useState<ExecutiveKpiSummary | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [registerModalType, setRegisterModalType] = useState<DocumentType>('IncomingLetter');

  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await fetch(`/api/v1/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const refreshData = async () => {
    try {
      setIsLoading(true);
      const [sessionRes, branchRes, deptRes, docRes, kpiRes, notifRes] = await Promise.all([
        fetch('/api/v1/auth/session').then(r => r.json()),
        fetch('/api/v1/organizations/branches').then(r => r.json()),
        fetch('/api/v1/organizations/departments').then(r => r.json()),
        fetch('/api/v1/correspondence').then(r => r.json()),
        fetch('/api/v1/analytics/kpis').then(r => r.json()),
        fetch('/api/v1/notifications').then(r => r.json()).catch(() => [])
      ]);

      if (sessionRes?.currentUser) {
        setCurrentUser(sessionRes.currentUser);
        setAvailablePersonas(sessionRes.availablePersonas || []);
      }
      setBranches(branchRes || []);
      setDepartments(deptRes || []);
      setDocuments(docRes || []);
      setKpis(kpiRes || null);
      setNotifications(Array.isArray(notifRes) ? notifRes : []);
    } catch (err) {
      console.error('Error fetching EDRMS data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const switchUser = async (userId: string) => {
    try {
      const res = await fetch('/api/v1/auth/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (data.currentUser) {
        setCurrentUser(data.currentUser);
        await refreshData();
      }
    } catch (err) {
      console.error('Failed to switch user:', err);
    }
  };

  const openRegisterModal = (type: DocumentType) => {
    setRegisterModalType(type);
    setIsRegisterModalOpen(true);
  };

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
        availablePersonas,
        switchUser,
        branches,
        departments,
        documents,
        kpis,
        notifications,
        unreadNotificationsCount,
        markNotificationAsRead,
        isLoading,
        refreshData,
        selectedDocument,
        setSelectedDocument,
        isRegisterModalOpen,
        setIsRegisterModalOpen,
        registerModalType,
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
