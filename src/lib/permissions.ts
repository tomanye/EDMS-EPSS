import {
  EffectivePermissionPreview,
  PermissionScopeLevel,
  RolePermissionMatrix,
  User
} from '../types/index.js';

export const PERMISSION_LEVELS: PermissionScopeLevel[] = [
  'None',
  'Own',
  'Department',
  'Branch',
  'Cluster',
  'Organization',
  'All'
];

export const PERMISSION_LEVEL_LABELS: Record<PermissionScopeLevel, { en: string; am: string }> = {
  None: { en: 'None', am: 'የለም' },
  Own: { en: 'Own', am: 'የራስ' },
  Department: { en: 'Department', am: 'መምሪያ' },
  Branch: { en: 'Branch', am: 'ቅርንጫፍ' },
  Cluster: { en: 'Cluster', am: 'ክላስተር' },
  Organization: { en: 'Organization', am: 'ድርጅት' },
  All: { en: 'All', am: 'ሁሉም' }
};

export const LEGACY_TO_CATALOGUE_CLIENT_MAP: Record<string, string[]> = {
  'read:documents': ['document.read'],
  'create:documents': ['document.create'],
  'edit:documents': ['document.update'],
  'delete:documents': ['document.delete'],
  'approve:workflows': ['workflow.approve', 'workflow.reject', 'workflow.return', 'workflow.view'],
  'manage:workspace': ['workspace.create_folder', 'workspace.upload'],
  'share:workspace': ['workspace.share'],
  'manage:archives': ['document.archive', 'records.request_disposal'],
  'manage:archive': ['document.archive', 'records.request_disposal'],
  'apply:legal_hold': ['records.legal_hold'],
  'track:physical': ['physical.register', 'physical.handover', 'physical.acknowledge', 'physical.report_missing'],
  'read:audit': ['admin.view_audit'],
  'manage:users': ['admin.manage_users'],
  'manage:organizations': ['admin.manage_branches'],
  'export:reports': ['reporting.view', 'reporting.export']
};

export function hasEffectivePermission(
  effective: EffectivePermissionPreview | null,
  currentUser: User | null,
  roleMatrix: RolePermissionMatrix[],
  permission: string
): boolean {
  if (!currentUser) return false;
  if (currentUser.role === 'SuperAdmin' || (currentUser.permissions || []).includes('*')) {
    return true;
  }

  const keys = LEGACY_TO_CATALOGUE_CLIENT_MAP[permission] || [permission];
  if (effective) {
    if (keys.some(k => effective.explicitDenies.includes(k)) || effective.explicitDenies.includes(permission)) {
      return false;
    }
    for (const key of keys) {
      const lvl = effective.effectiveLevels[key];
      if (lvl && lvl !== 'None') {
        return true;
      }
    }
  }

  if ((currentUser.permissions || []).includes(permission)) {
    return true;
  }
  const rm = roleMatrix.find(r => r.role === currentUser.role);
  if (rm && (rm.permissions.includes('*') || rm.permissions.includes(permission))) {
    return true;
  }
  return false;
}
