import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Network, 
  Users, 
  CheckCircle2, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  Shield, 
  X, 
  AlertCircle,
  Search,
  Lock,
  Unlock,
  KeyRound,
  Monitor,
  History
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import {
  AuthSession,
  Branch,
  BranchCluster,
  Department,
  LoginHistoryEntry,
  RolePermissionMatrix,
  User,
  UserRole
} from '../../types/index.js';

const ALL_ROLES: UserRole[] = [
  'SuperAdmin',
  'DirectorGeneral',
  'Director',
  'RegistryOfficer',
  'BranchManager',
  'ProcurementOfficer',
  'Auditor'
];

const ALL_PERMISSIONS = [
  { id: 'read:documents', label: 'View Correspondence & Dossiers' },
  { id: 'create:documents', label: 'Register Documents' },
  { id: 'edit:documents', label: 'Edit Document Metadata' },
  { id: 'delete:documents', label: 'Soft-Delete / Cancel Documents' },
  { id: 'approve:workflows', label: 'Approve / Reject Workflows' },
  { id: 'manage:workspace', label: 'Manage Repository Folders & Files' },
  { id: 'share:workspace', label: 'Share Workspace Items' },
  { id: 'manage:archives', label: 'Manage Archives & Retention' },
  { id: 'apply:legal_hold', label: 'Apply / Release Legal Holds' },
  { id: 'track:physical', label: 'Physical File Custody & Handovers' },
  { id: 'read:audit', label: 'Access Audit Trail & Backups' },
  { id: 'manage:users', label: 'Manage Staff Users & Lockouts' },
  { id: 'manage:organizations', label: 'Manage Branches & Directorates' },
  { id: 'export:reports', label: 'Export Executive Reports' }
];

export const OrganizationAdminView: React.FC = () => {
  const { branches, departments, currentUser, refreshData, language, t } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [roleMatrix, setRoleMatrix] = useState<RolePermissionMatrix[]>([]);
  const [adminSessions, setAdminSessions] = useState<AuthSession[]>([]);
  const [adminLoginHistory, setAdminLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState<'branches' | 'directorates' | 'users' | 'roles' | 'sessions'>('branches');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Branch Modal State
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [bCode, setBCode] = useState('');
  const [bNameEn, setBNameEn] = useState('');
  const [bNameAm, setBNameAm] = useState('');
  const [bCity, setBCity] = useState('');
  const [bRegion, setBRegion] = useState('');
  const [bCluster, setBCluster] = useState<BranchCluster>('Central');
  const [bPhone, setBPhone] = useState('');
  const [bEmail, setBEmail] = useState('');
  const [bManager, setBManager] = useState('');

  // Department Modal State
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [dCode, setDCode] = useState('');
  const [dNameEn, setDNameEn] = useState('');
  const [dNameAm, setDNameAm] = useState('');
  const [dDirEn, setDDirEn] = useState('');
  const [dDirAm, setDDirAm] = useState('');
  const [dHead, setDHead] = useState('');

  // User Modal State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [uUsername, setUUsername] = useState('');
  const [uInitialPassword, setUInitialPassword] = useState('');
  const [uNameEn, setUNameEn] = useState('');
  const [uNameAm, setUNameAm] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uRole, setURole] = useState<UserRole>('RegistryOfficer');
  const [uBranchId, setUBranchId] = useState('br-hq');
  const [uDeptId, setUDeptId] = useState('dept-reg');
  const [uPosition, setUPosition] = useState('');
  const [uPermissions, setUPermissions] = useState<string[]>(['read:documents', 'create:documents']);

  // Admin Password Reset Modal
  const [resetPwdUser, setResetPwdUser] = useState<User | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState('');

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/v1/organizations/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to load users:', e);
    }
  };

  const fetchAuthAdminData = async () => {
    try {
      const [rolesRes, sessRes, histRes] = await Promise.all([
        fetch('/api/v1/auth/roles'),
        fetch('/api/v1/auth/sessions?scope=all'),
        fetch('/api/v1/auth/login-history?scope=all')
      ]);
      if (rolesRes.ok) setRoleMatrix(await rolesRes.json());
      if (sessRes.ok) setAdminSessions(await sessRes.json());
      if (histRes.ok) setAdminLoginHistory(await histRes.json());
    } catch (e) {
      console.error('Failed loading RBAC & session admin data:', e);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAuthAdminData();
  }, []);

  const clusters: { id: string; label: string }[] = [
    { id: 'all', label: `All Hubs (${branches.length})` },
    { id: 'Central', label: 'Central Cluster' },
    { id: 'Northern', label: 'Northern Cluster' },
    { id: 'Western', label: 'Western Cluster' },
    { id: 'SouthernEastern', label: 'Southern & Eastern Cluster' },
  ];

  const filteredBranches = branches.filter(b => {
    if (selectedCluster !== 'all' && b.cluster !== selectedCluster) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        b.code.toLowerCase().includes(q) ||
        b.nameEn.toLowerCase().includes(q) ||
        b.nameAm.toLowerCase().includes(q) ||
        b.city.toLowerCase().includes(q) ||
        b.managerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredDepartments = departments.filter(d => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.code.toLowerCase().includes(q) ||
      d.nameEn.toLowerCase().includes(q) ||
      d.nameAm.toLowerCase().includes(q) ||
      (d.headNameEn || '').toLowerCase().includes(q)
    );
  });

  const filteredUsers = users.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.username || '').toLowerCase().includes(q) ||
      u.fullNameEn.toLowerCase().includes(q) ||
      u.fullNameAm.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      u.branchNameEn.toLowerCase().includes(q)
    );
  });

  // Branch Handlers
  const openBranchForm = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setBCode(branch.code);
      setBNameEn(branch.nameEn);
      setBNameAm(branch.nameAm);
      setBCity(branch.city);
      setBRegion(branch.region);
      setBCluster(branch.cluster);
      setBPhone(branch.phone);
      setBEmail(branch.email);
      setBManager(branch.managerName);
    } else {
      setEditingBranch(null);
      setBCode('');
      setBNameEn('');
      setBNameAm('');
      setBCity('');
      setBRegion('');
      setBCluster('Central');
      setBPhone('+251 11 275 ');
      setBEmail('hub@epss.gov.et');
      setBManager('');
    }
    setBranchModalOpen(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingBranch
        ? `/api/v1/organizations/branches/${editingBranch.id}`
        : '/api/v1/organizations/branches';
      const method = editingBranch ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || ''
        },
        body: JSON.stringify({
          code: bCode,
          nameEn: bNameEn,
          nameAm: bNameAm || bNameEn,
          city: bCity,
          region: bRegion || bCity,
          cluster: bCluster,
          phone: bPhone,
          email: bEmail,
          managerName: bManager || 'Assigned Branch Lead'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save branch');
      setBranchModalOpen(false);
      await refreshData();
      showToast('success', editingBranch ? `Branch ${bCode} updated.` : `New regional hub ${bNameEn} created.`);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateBranch = async (branch: Branch) => {
    if (!window.confirm(`Deactivate branch "${branch.nameEn}" (${branch.code})?`)) return;
    try {
      const res = await fetch(`/api/v1/organizations/branches/${branch.id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser?.id || '' }
      });
      if (!res.ok) throw new Error('Failed to deactivate branch');
      await refreshData();
      showToast('success', `Branch ${branch.nameEn} marked inactive.`);
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // Directorate Handlers
  const openDeptForm = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept);
      setDCode(dept.code);
      setDNameEn(dept.nameEn);
      setDNameAm(dept.nameAm);
      setDDirEn(dept.directorateEn);
      setDDirAm(dept.directorateAm);
      setDHead(dept.headNameEn || '');
    } else {
      setEditingDept(null);
      setDCode('');
      setDNameEn('');
      setDNameAm('');
      setDDirEn('');
      setDDirAm('');
      setDHead('');
    }
    setDeptModalOpen(true);
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingDept
        ? `/api/v1/organizations/departments/${editingDept.id}`
        : '/api/v1/organizations/departments';
      const method = editingDept ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || ''
        },
        body: JSON.stringify({
          code: dCode,
          nameEn: dNameEn,
          nameAm: dNameAm || dNameEn,
          directorateEn: dDirEn || dNameEn,
          directorateAm: dDirAm || dNameAm || dDirEn,
          headNameEn: dHead || 'Directorate Lead'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save directorate');
      setDeptModalOpen(false);
      await refreshData();
      showToast('success', editingDept ? `Directorate ${dNameEn} updated.` : `Directorate ${dNameEn} created.`);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateDept = async (dept: Department) => {
    if (!window.confirm(`Deactivate directorate "${dept.nameEn}"?`)) return;
    try {
      const res = await fetch(`/api/v1/organizations/departments/${dept.id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser?.id || '' }
      });
      if (!res.ok) throw new Error('Failed to deactivate directorate');
      await refreshData();
      showToast('success', `Directorate ${dept.nameEn} deactivated.`);
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  // User Handlers
  const openUserForm = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUUsername(user.username || '');
      setUInitialPassword('');
      setUNameEn(user.fullNameEn);
      setUNameAm(user.fullNameAm);
      setUEmail(user.email);
      setURole(user.role);
      setUBranchId(user.branchId);
      setUDeptId(user.departmentId);
      setUPosition(user.position);
      setUPermissions(user.permissions || ['read:documents']);
    } else {
      setEditingUser(null);
      setUUsername('');
      setUInitialPassword('');
      setUNameEn('');
      setUNameAm('');
      setUEmail('');
      setURole('RegistryOfficer');
      setUBranchId(branches[0]?.id || 'br-hq');
      setUDeptId(departments[0]?.id || 'dept-reg');
      setUPosition('Records & Registry Officer');
      setUPermissions(['read:documents', 'create:documents', 'edit:documents']);
    }
    setUserModalOpen(true);
  };

  const togglePermission = (permId: string) => {
    setUPermissions(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingUser
        ? `/api/v1/organizations/users/${editingUser.id}`
        : '/api/v1/organizations/users';
      const method = editingUser ? 'PUT' : 'POST';

      const selectedBranch = branches.find(b => b.id === uBranchId);
      const selectedDept = departments.find(d => d.id === uDeptId);

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: uUsername.trim() || undefined,
          initialPassword: !editingUser && uInitialPassword ? uInitialPassword : undefined,
          fullNameEn: uNameEn,
          fullNameAm: uNameAm || uNameEn,
          email: uEmail,
          role: uRole,
          branchId: uBranchId,
          branchNameEn: selectedBranch?.nameEn,
          branchNameAm: selectedBranch?.nameAm,
          departmentId: uDeptId,
          departmentNameEn: selectedDept?.nameEn,
          departmentNameAm: selectedDept?.nameAm,
          position: uPosition || uRole,
          permissions: uRole === 'SuperAdmin' ? ['*'] : uPermissions
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save staff profile');
      setUserModalOpen(false);
      await fetchUsers();
      await refreshData();
      showToast('success', editingUser ? `Updated staff profile for ${uNameEn}.` : `Staff account created for ${uNameEn}.`);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateUser = async (user: User) => {
    if (!window.confirm(`Deactivate user account "${user.fullNameEn}" (${user.email})?`)) return;
    try {
      const res = await fetch(`/api/v1/organizations/users/${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to deactivate user');
      await fetchUsers();
      showToast('success', `Staff account ${user.fullNameEn} deactivated.`);
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleToggleLockUser = async (user: User) => {
    const isLocked = user.status === 'Locked';
    const action = isLocked ? 'unlock' : 'lock';
    try {
      const res = await fetch(`/api/v1/auth/admin/users/${user.id}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action} account`);
      await fetchUsers();
      await fetchAuthAdminData();
      showToast('success', `Account ${user.username} ${isLocked ? 'unlocked' : 'locked'}.`);
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPwdUser) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/auth/admin/users/${resetPwdUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: adminNewPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset user password');
      setResetPwdUser(null);
      setAdminNewPassword('');
      await fetchUsers();
      showToast('success', `Password reset for ${resetPwdUser.fullNameEn}.`);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRoleMatrix = async (roleEntry: RolePermissionMatrix) => {
    try {
      const res = await fetch(`/api/v1/auth/roles/${roleEntry.role}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissions: roleEntry.permissions,
          requiresMfa: roleEntry.requiresMfa
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update role matrix');
      setRoleMatrix(Array.isArray(data) ? data : roleMatrix);
      await refreshData();
      showToast('success', `Updated permissions & MFA policy for ${roleEntry.role}.`);
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  const handleRevokeAdminSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/v1/auth/sessions/${sessionId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke session');
      await fetchAuthAdminData();
      showToast('success', 'User session revoked.');
    } catch (err: any) {
      showToast('error', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('navOrganization')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'am'
              ? 'የኢ.መ.አ.አ ዋና መሥሪያ ቤት፣ 19 የክልል ቅርንጫፍ ማዕከላት፣ ዳይሬክቶሬቶች እና የሠራተኞች ሚና አስተዳደር'
              : 'Organizational topology covering Head Office, 19 regional branches, directorates, staff accounts, and RBAC permissions.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveSubTab('branches')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeSubTab === 'branches'
                  ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Branches ({branches.length})
            </button>
            <button
              onClick={() => setActiveSubTab('directorates')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeSubTab === 'directorates'
                  ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Directorates ({departments.length})
            </button>
            <button
              onClick={() => setActiveSubTab('users')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeSubTab === 'users'
                  ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Users ({users.length})
            </button>
            <button
              onClick={() => { setActiveSubTab('roles'); fetchAuthAdminData(); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeSubTab === 'roles'
                  ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Role Matrix
            </button>
            <button
              onClick={() => { setActiveSubTab('sessions'); fetchAuthAdminData(); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeSubTab === 'sessions'
                  ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Sessions ({adminSessions.length})
            </button>
          </div>
        </div>
      </div>

      {/* Inline Toast Feedback */}
      {toast && (
        <div className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between ${
          toast.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{toast.text}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search + Primary Action Toolbar */}
      {(activeSubTab === 'branches' || activeSubTab === 'directorates' || activeSubTab === 'users') && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={
                activeSubTab === 'branches'
                  ? 'Filter branches by code, city, or manager...'
                  : activeSubTab === 'directorates'
                    ? 'Filter directorates by code, name, or lead...'
                    : 'Filter users by username, name, email, role, or branch...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <button
            onClick={() => {
              if (activeSubTab === 'branches') openBranchForm();
              else if (activeSubTab === 'directorates') openDeptForm();
              else openUserForm();
            }}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-700 rounded-lg shadow-xs inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>
              {activeSubTab === 'branches'
                ? 'Add Branch Hub'
                : activeSubTab === 'directorates'
                  ? 'Add Directorate'
                  : 'Add Staff User'}
            </span>
          </button>
        </div>
      )}

      {/* TAB 1: BRANCHES */}
      {activeSubTab === 'branches' && (
        <div className="space-y-4">
          <div className="flex items-center flex-wrap gap-2">
            {clusters.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCluster(c.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  selectedCluster === c.id
                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBranches.map((b) => (
              <div
                key={b.id}
                className={`p-5 rounded-xl border shadow-xs flex flex-col justify-between space-y-3 ${
                  b.isActive === false
                    ? 'opacity-60 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                    : b.isHeadOffice
                      ? 'bg-teal-50/40 dark:bg-teal-950/20 border-teal-300 dark:border-teal-800'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-teal-700 dark:text-teal-400">
                        {b.code}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <span className="text-slate-500 dark:text-slate-400">{b.cluster}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openBranchForm(b)}
                        className="p-1 text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Edit Branch"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {!b.isHeadOffice && b.isActive !== false && (
                        <button
                          onClick={() => handleDeactivateBranch(b)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Deactivate Branch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                    {language === 'am' ? b.nameAm : b.nameEn}
                  </h3>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {b.isHeadOffice ? 'National Headquarters' : b.isActive === false ? 'Inactive Hub' : 'Active Regional Hub'}
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{b.city}, {b.region}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono tabular-nums">{b.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{b.email}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-slate-400 block text-[11px]">Hub Director / Lead</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{b.managerName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: DIRECTORATES */}
      {activeSubTab === 'directorates' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Directorate Name</th>
                <th className="px-4 py-3 font-semibold">Sector</th>
                <th className="px-4 py-3 font-semibold">Directorate Head</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDepartments.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-teal-700 dark:text-teal-400 whitespace-nowrap">
                    {d.code}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {language === 'am' ? d.nameAm : d.nameEn}
                    </div>
                    <div className="text-[11px] text-slate-400">{language === 'am' ? d.nameEn : d.nameAm}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{d.directorateEn}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{d.headNameEn || 'Assigned Director'}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${d.isActive === false ? 'text-slate-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                      {d.isActive === false ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => openDeptForm(d)}
                        className="p-1.5 text-slate-500 hover:text-teal-700 dark:hover:text-teal-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Edit Directorate"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {d.isActive !== false && (
                        <button
                          onClick={() => handleDeactivateDept(d)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Deactivate Directorate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: USERS & SECURITY STATUS */}
      {activeSubTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Staff Member</th>
                  <th className="px-4 py-3 font-semibold">Role & MFA</th>
                  <th className="px-4 py-3 font-semibold">Branch / Directorate</th>
                  <th className="px-4 py-3 font-semibold">Last Login</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {language === 'am' ? u.fullNameAm : u.fullNameEn}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        @{u.username} · {u.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5" />
                        <span>{u.role}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {u.permissions.includes('*') ? 'Full System Access (*)' : `${u.permissions.length} custom perms`}
                        {u.mfaRequired ? ' · MFA Required' : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{u.branchNameEn}</div>
                      <div className="text-[11px] text-slate-500">{u.departmentNameEn}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never logged in'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${
                        u.status === 'Inactive' || u.status === 'Locked'
                          ? 'text-rose-600'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}>
                        {u.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openUserForm(u)}
                          className="p-1.5 text-slate-500 hover:text-teal-700 dark:hover:text-teal-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Edit User & Role Permissions"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {u.id !== currentUser?.id && u.status !== 'Inactive' && (
                          <button
                            onClick={() => handleToggleLockUser(u)}
                            className={`p-1.5 rounded ${
                              u.status === 'Locked'
                                ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                            }`}
                            title={u.status === 'Locked' ? 'Unlock Account' : 'Lock Account'}
                          >
                            {u.status === 'Locked' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setResetPwdUser(u);
                            setAdminNewPassword('');
                          }}
                          className="p-1.5 text-slate-500 hover:text-teal-700 dark:hover:text-teal-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Reset User Password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        {u.status !== 'Inactive' && u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDeactivateUser(u)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Deactivate Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ROLE PERMISSION MATRIX */}
      {activeSubTab === 'roles' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {roleMatrix.map((entry) => {
              const isSuper = entry.role === 'SuperAdmin';
              return (
                <div
                  key={entry.role}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-teal-600" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{entry.label}</h3>
                        <span className="font-mono text-[11px] text-slate-400">({entry.role})</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{entry.description}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={isSuper}
                          checked={entry.requiresMfa}
                          onChange={(e) => {
                            const updated = roleMatrix.map(r =>
                              r.role === entry.role ? { ...r, requiresMfa: e.target.checked } : r
                            );
                            setRoleMatrix(updated);
                          }}
                          className="rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                        />
                        <span>Require MFA</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => handleUpdateRoleMatrix(entry)}
                        className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg shadow-xs"
                      >
                        Save Role Policy
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                    {ALL_PERMISSIONS.map((perm) => {
                      const has = isSuper || entry.permissions.includes('*') || entry.permissions.includes(perm.id);
                      return (
                        <label
                          key={perm.id}
                          className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <input
                            type="checkbox"
                            disabled={isSuper}
                            checked={has}
                            onChange={(e) => {
                              const nextPerms = e.target.checked
                                ? Array.from(new Set([...entry.permissions, perm.id]))
                                : entry.permissions.filter(p => p !== perm.id);
                              setRoleMatrix(prev =>
                                prev.map(r => (r.role === entry.role ? { ...r, permissions: nextPerms } : r))
                              );
                            }}
                            className="rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                          />
                          <div className="min-w-0">
                            <div className="text-slate-800 dark:text-slate-200 font-medium truncate">{perm.label}</div>
                            <div className="font-mono text-[10px] text-slate-400">{perm.id}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: GLOBAL SESSIONS & AUTHENTICATION LOG */}
      {activeSubTab === 'sessions' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
              <Monitor className="w-4 h-4 text-teal-600" />
              <span>Active Organization Sessions ({adminSessions.length})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Staff User</th>
                    <th className="px-4 py-2.5 font-semibold">IP & Client</th>
                    <th className="px-4 py-2.5 font-semibold">MFA</th>
                    <th className="px-4 py-2.5 font-semibold">Idle / Absolute Expiry</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {adminSessions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {s.userName} {s.isCurrent ? '(Current)' : ''}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400">{s.userRole}</div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        <div>{s.ipAddress}</div>
                        <div className="text-slate-400 truncate max-w-xs">{s.userAgent}</div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px]">
                        <span className={s.mfaVerified ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-slate-500'}>
                          {s.mfaVerified ? 'Verified' : 'Standard'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500 tabular-nums">
                        Idle: {new Date(s.idleExpiresAt).toLocaleTimeString()} · Abs: {new Date(s.expiresAt).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleRevokeAdminSession(s.id)}
                          className="px-2.5 py-1 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded border border-rose-200 dark:border-rose-900 font-semibold"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
              <History className="w-4 h-4 text-teal-600" />
              <span>Authentication & Lockout Event Stream ({adminLoginHistory.length})</span>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Timestamp</th>
                    <th className="px-4 py-2.5 font-semibold">Username Attempted</th>
                    <th className="px-4 py-2.5 font-semibold">Method</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold">IP</th>
                    <th className="px-4 py-2.5 font-semibold">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {adminLoginHistory.slice(0, 50).map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2 font-mono text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                        {new Date(h.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {h.usernameAttempted}
                      </td>
                      <td className="px-4 py-2 font-mono text-slate-600 dark:text-slate-300">{h.method}</td>
                      <td className="px-4 py-2">
                        <span className={`font-semibold ${
                          h.status === 'Success'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : h.status === 'Locked' || h.status === 'Failed'
                              ? 'text-rose-600'
                              : 'text-amber-600'
                        }`}>
                          {h.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-slate-500">{h.ipAddress}</td>
                      <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{h.reason || 'Authenticated'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Branch CRUD Modal */}
      {branchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingBranch ? `Edit Branch: ${editingBranch.code}` : 'Register New Regional Branch Hub'}
              </h3>
              <button onClick={() => setBranchModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Branch Code *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingBranch}
                    value={bCode}
                    onChange={(e) => setBCode(e.target.value)}
                    placeholder="e.g. EPSS-JIM"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Cluster *</label>
                  <select
                    value={bCluster}
                    onChange={(e) => setBCluster(e.target.value as BranchCluster)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="Central">Central</option>
                    <option value="Northern">Northern</option>
                    <option value="Western">Western</option>
                    <option value="SouthernEastern">Southern & Eastern</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Branch Name (English) *</label>
                  <input
                    type="text"
                    required
                    value={bNameEn}
                    onChange={(e) => setBNameEn(e.target.value)}
                    placeholder="e.g. EPSS Jimma Regional Hub"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Branch Name (Amharic) *</label>
                  <input
                    type="text"
                    required
                    value={bNameAm}
                    onChange={(e) => setBNameAm(e.target.value)}
                    placeholder="e.g. የኢ.መ.አ.አ ጅማ ቅርንጫፍ"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={bCity}
                    onChange={(e) => setBCity(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Region</label>
                  <input
                    type="text"
                    value={bRegion}
                    onChange={(e) => setBRegion(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={bPhone}
                    onChange={(e) => setBPhone(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Hub Email</label>
                  <input
                    type="email"
                    value={bEmail}
                    onChange={(e) => setBEmail(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Hub Manager / Director</label>
                  <input
                    type="text"
                    value={bManager}
                    onChange={(e) => setBManager(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setBranchModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Directorate CRUD Modal */}
      {deptModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingDept ? `Edit Directorate: ${editingDept.code}` : 'Create Core Directorate'}
              </h3>
              <button onClick={() => setDeptModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDept} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingDept}
                    value={dCode}
                    onChange={(e) => setDCode(e.target.value)}
                    placeholder="e.g. EPSS-QA"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Sector *</label>
                  <input
                    type="text"
                    required
                    value={dDirEn}
                    onChange={(e) => setDDirEn(e.target.value)}
                    placeholder="e.g. Pharmaceutical Supply Chain"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Department Name (English) *</label>
                  <input
                    type="text"
                    required
                    value={dNameEn}
                    onChange={(e) => setDNameEn(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Department Name (Amharic) *</label>
                  <input
                    type="text"
                    required
                    value={dNameAm}
                    onChange={(e) => setDNameAm(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Directorate Head</label>
                  <input
                    type="text"
                    value={dHead}
                    onChange={(e) => setDHead(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeptModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Directorate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User & Permissions CRUD Modal */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingUser ? `Edit Staff Profile: ${editingUser.fullNameEn}` : 'Enroll Staff User & Assign Role'}
              </h3>
              <button onClick={() => setUserModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={50}
                    disabled={!!editingUser}
                    value={uUsername}
                    onChange={(e) => setUUsername(e.target.value)}
                    placeholder="e.g. abebe.b"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono disabled:opacity-60"
                  />
                </div>
                {!editingUser ? (
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Initial Password (Optional)</label>
                    <input
                      type="password"
                      value={uInitialPassword}
                      onChange={(e) => setUInitialPassword(e.target.value)}
                      placeholder="Default: EPSS#Gov2026!"
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Job Title / Position</label>
                    <input
                      type="text"
                      value={uPosition}
                      onChange={(e) => setUPosition(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                )}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name (English) *</label>
                  <input
                    type="text"
                    required
                    value={uNameEn}
                    onChange={(e) => setUNameEn(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name (Amharic)</label>
                  <input
                    type="text"
                    value={uNameAm}
                    onChange={(e) => setUNameAm(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Institutional Email *</label>
                  <input
                    type="email"
                    required
                    value={uEmail}
                    onChange={(e) => setUEmail(e.target.value)}
                    placeholder="name@epss.gov.et"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Official Role *</label>
                  <select
                    value={uRole}
                    onChange={(e) => setURole(e.target.value as UserRole)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    {ALL_ROLES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Assigned Branch *</label>
                  <select
                    value={uBranchId}
                    onChange={(e) => setUBranchId(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.nameEn}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Directorate *</label>
                  <select
                    value={uDeptId}
                    onChange={(e) => setUDeptId(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.nameEn}</option>
                    ))}
                  </select>
                </div>
                {!editingUser && (
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Job Title / Position</label>
                    <input
                      type="text"
                      value={uPosition}
                      onChange={(e) => setUPosition(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Granular Permission Matrix */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Granular RBAC Permissions</span>
                  {uRole === 'SuperAdmin' && (
                    <span className="text-[11px] font-mono text-teal-700 dark:text-teal-400">SuperAdmin inherits all (*)</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_PERMISSIONS.map((perm) => {
                    const checked = uRole === 'SuperAdmin' || uPermissions.includes(perm.id);
                    return (
                      <label
                        key={perm.id}
                        className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <input
                          type="checkbox"
                          disabled={uRole === 'SuperAdmin'}
                          checked={checked}
                          onChange={() => togglePermission(perm.id)}
                          className="rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                        />
                        <span className="text-slate-700 dark:text-slate-300">{perm.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save User & Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Password Reset Modal */}
      {resetPwdUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Admin Password Reset: @{resetPwdUser.username}
              </h3>
              <button onClick={() => setResetPwdUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-500">
              Assign a new compliant temporary password (min 10 chars, upper, lower, number, special char). User status will be unlocked if locked.
            </p>
            <form onSubmit={handleAdminResetPassword} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Compliant Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={10}
                  value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
                  placeholder="e.g. EPSS#Reset2026!"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setResetPwdUser(null)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
