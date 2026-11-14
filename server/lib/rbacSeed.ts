import {
  AccessReviewCampaign,
  EnterpriseRole,
  PermissionDefinition,
  PermissionScopeLevel,
  PermissionSet,
  RoleAutoAssignmentRule,
  SodRule
} from '../../src/types/index.js';

export const PERMISSION_LEVEL_RANK: Record<PermissionScopeLevel, number> = {
  None: 0,
  Own: 1,
  Department: 2,
  Branch: 3,
  Cluster: 4,
  Organization: 5,
  All: 6
};

export const LEGACY_TO_CATALOGUE_MAP: Record<string, string[]> = {
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

export function createInitialPermissionCatalogue(): PermissionDefinition[] {
  const now = '2026-01-01T00:00:00Z';
  return [
    // Document Category
    {
      id: 'perm-doc-create',
      key: 'document.create',
      category: 'Document',
      nameEn: 'Create / Register Correspondence',
      nameAm: 'ደብዳቤ መመዝገብ / መፍጠር',
      descriptionEn: 'Register incoming, outgoing, internal memos, and regulatory applications.',
      descriptionAm: 'ገቢ፣ ወጪ፣ የውስጥ ማስታወሻዎችንና ማመልከቻዎችን መመዝገብ።',
      legacyAlias: 'create:documents',
      createdAt: now
    },
    {
      id: 'perm-doc-read',
      key: 'document.read',
      category: 'Document',
      nameEn: 'Read Correspondence & Dossiers',
      nameAm: 'ደብዳቤዎችንና ማህደሮችን ማንበብ',
      descriptionEn: 'View correspondence metadata, summaries, and authorized dossiers.',
      descriptionAm: 'የደብዳቤ ዝርዝሮችንና የተፈቀዱ ማህደሮችን መመልከት።',
      legacyAlias: 'read:documents',
      createdAt: now
    },
    {
      id: 'perm-doc-update',
      key: 'document.update',
      category: 'Document',
      nameEn: 'Update Correspondence Metadata',
      nameAm: 'የደብዳቤ መረጃ ማሻሻል',
      descriptionEn: 'Modify correspondence fields, links, and attachments.',
      descriptionAm: 'የደብዳቤ መረጃዎችንና አባሪዎችን ማሻሻል።',
      legacyAlias: 'edit:documents',
      createdAt: now
    },
    {
      id: 'perm-doc-delete',
      key: 'document.delete',
      category: 'Document',
      nameEn: 'Cancel / Delete Correspondence',
      nameAm: 'ደብዳቤ መሰረዝ',
      descriptionEn: 'Soft-delete or permanently purge non-locked records.',
      descriptionAm: 'ያልተቆለፉ ሰነዶችን መሰረዝ።',
      legacyAlias: 'delete:documents',
      createdAt: now
    },
    {
      id: 'perm-doc-download',
      key: 'document.download',
      category: 'Document',
      nameEn: 'Download Attachments & Files',
      nameAm: 'አባሪ ፋይሎችን ማውረድ',
      descriptionEn: 'Download scanned PDFs and digital attachment files.',
      descriptionAm: 'የተቃኙ ፋይሎችንና አባሪዎችን ማውረድ።',
      createdAt: now
    },
    {
      id: 'perm-doc-print',
      key: 'document.print',
      category: 'Document',
      nameEn: 'Print Official Records & QR Labels',
      nameAm: 'ይፋዊ ሰነዶችንና QR መለያ ማተም',
      descriptionEn: 'Print verification sheets, manifests, and QR tracking labels.',
      descriptionAm: 'የማረጋገጫ ቅጾችንና QR መለያዎችን ማተም።',
      createdAt: now
    },
    {
      id: 'perm-doc-share',
      key: 'document.share',
      category: 'Document',
      nameEn: 'Share Correspondence Dossiers',
      nameAm: 'የደብዳቤ ማህደር ማጋራት',
      descriptionEn: 'Cross-link and route dossiers between directorates and branches.',
      descriptionAm: 'ማህደሮችን በዳይሬክቶሬቶችና ቅርንጫፎች መካከል ማጋራት።',
      createdAt: now
    },
    {
      id: 'perm-doc-archive',
      key: 'document.archive',
      category: 'Document',
      nameEn: 'Archive Mature Correspondence',
      nameAm: 'የተጠናቀቁ ደብዳቤዎችን ማህደር ማስገባት',
      descriptionEn: 'Move completed records into institutional archival custody.',
      descriptionAm: 'የተጠናቀቁ ሰነዶችን ወደ ማህደር ማስገባት።',
      legacyAlias: 'manage:archives',
      createdAt: now
    },

    // Workflow Category
    {
      id: 'perm-wf-view',
      key: 'workflow.view',
      category: 'Workflow',
      nameEn: 'View Workflow Tasks',
      nameAm: 'የሥራ ፍሰት ተግባራትን ማየት',
      descriptionEn: 'Inspect workflow inbox queues and SLA timers.',
      descriptionAm: 'የሥራ ፍሰት ተግባራትንና የቀነ-ገደብ ሰዓቶችን ማየት።',
      createdAt: now
    },
    {
      id: 'perm-wf-claim',
      key: 'workflow.claim',
      category: 'Workflow',
      nameEn: 'Claim & Start Workflow Tasks',
      nameAm: 'የሥራ ፍሰት ተግባር መውሰድ',
      descriptionEn: 'Claim pooled directorate or branch tasks for action.',
      descriptionAm: 'የመምሪያ ወይም የቅርንጫፍ ተግባራትን ለሥራ መውሰድ።',
      createdAt: now
    },
    {
      id: 'perm-wf-approve',
      key: 'workflow.approve',
      category: 'Workflow',
      nameEn: 'Approve & Sign Workflows',
      nameAm: 'የሥራ ፍሰት ማጽደቅ እና መፈረም',
      descriptionEn: 'Issue formal workflow approval and RSA-SHA256 attestation.',
      descriptionAm: 'ይፋዊ የሥራ ፍሰት ማጽደቂያና ዲጂታል ፊርማ መስጠት።',
      legacyAlias: 'approve:workflows',
      createdAt: now
    },
    {
      id: 'perm-wf-reject',
      key: 'workflow.reject',
      category: 'Workflow',
      nameEn: 'Reject Workflow Submissions',
      nameAm: 'የሥራ ፍሰት ውድቅ ማድረግ',
      descriptionEn: 'Reject correspondence or tender submissions with audit justification.',
      descriptionAm: 'የቀረቡ ደብዳቤዎችን በምክንያት ውድቅ ማድረግ።',
      createdAt: now
    },
    {
      id: 'perm-wf-return',
      key: 'workflow.return',
      category: 'Workflow',
      nameEn: 'Return for Correction',
      nameAm: 'ለማስተካከያ መመለስ',
      descriptionEn: 'Return submissions to prior stage officers for correction.',
      descriptionAm: 'ሰነዶችን ለማስተካከያ ወደ ቀድሞው ደረጃ መመለስ።',
      createdAt: now
    },
    {
      id: 'perm-wf-delegate',
      key: 'workflow.delegate',
      category: 'Workflow',
      nameEn: 'Delegate Signing Authority',
      nameAm: 'የማጽደቅ ሥልጣን መወከል',
      descriptionEn: 'Configure acting delegation during travel or leave.',
      descriptionAm: 'በጉዞ ወይም በፈቃድ ጊዜ ተወካይ መመደብ።',
      createdAt: now
    },
    {
      id: 'perm-wf-escalate',
      key: 'workflow.escalate',
      category: 'Workflow',
      nameEn: 'Escalate Overdue Tasks',
      nameAm: 'የዘገዩ ተግባራትን ከፍ ማድረግ',
      descriptionEn: 'Escalate SLA-breached tasks to executive oversight.',
      descriptionAm: 'ቀነ-ገደባቸው ያለፉ ተግባራትን ወደ ከፍተኛ ኃላፊ ማሳለፍ።',
      createdAt: now
    },
    {
      id: 'perm-wf-configure',
      key: 'workflow.configure',
      category: 'Workflow',
      nameEn: 'Configure Workflow Definitions',
      nameAm: 'የሥራ ፍሰት ቅጾችን ማዋቀር',
      descriptionEn: 'Create and edit multi-stage approval definitions.',
      descriptionAm: 'ባለብዙ ደረጃ የሥራ ፍሰቶችን ማዋቀር።',
      createdAt: now
    },

    // Physical Category
    {
      id: 'perm-phy-register',
      key: 'physical.register',
      category: 'Physical',
      nameEn: 'Register Physical Binders',
      nameAm: 'አካላዊ ማህደሮችን መመዝገብ',
      descriptionEn: 'Create physical binder tracking codes and custody entries.',
      descriptionAm: 'የአካላዊ ማህደር መለያ ቁጥሮችን መመዝገብ።',
      legacyAlias: 'track:physical',
      createdAt: now
    },
    {
      id: 'perm-phy-handover',
      key: 'physical.handover',
      category: 'Physical',
      nameEn: 'Initiate Physical Handover',
      nameAm: 'የአካላዊ ማህደር ርክክብ መጀመር',
      descriptionEn: 'Transfer custody of physical binders across officers.',
      descriptionAm: 'የአካላዊ ማህደሮችን ርክክብ በባለሙያዎች መካከል ማስጀመር።',
      createdAt: now
    },
    {
      id: 'perm-phy-ack',
      key: 'physical.acknowledge',
      category: 'Physical',
      nameEn: 'Acknowledge Physical Receipt',
      nameAm: 'የአካላዊ ማህደር መድረሱን ማረጋገጥ',
      descriptionEn: 'Confirm receipt of physical files in transit.',
      descriptionAm: 'በመጓጓዝ ላይ ያለ አካላዊ ማህደር መድረሱን ማረጋገጥ።',
      createdAt: now
    },
    {
      id: 'perm-phy-missing',
      key: 'physical.report_missing',
      category: 'Physical',
      nameEn: 'Report Missing Physical Files',
      nameAm: 'የጠፋ አካላዊ ማህደር ሪፖርት ማድረግ',
      descriptionEn: 'Log and investigate missing physical binder incidents.',
      descriptionAm: 'የጠፉ አካላዊ ማህደሮችን ሪፖርት ማድረግ።',
      createdAt: now
    },
    {
      id: 'perm-phy-locations',
      key: 'physical.manage_locations',
      category: 'Physical',
      nameEn: 'Manage Archive Locations',
      nameAm: 'የማህደር ቦታዎችን ማስተዳደር',
      descriptionEn: 'Configure vault rooms, cabinets, shelves, and archive boxes.',
      descriptionAm: 'የማህደር ክፍሎችን፣ መደርደሪያዎችንና ሳጥኖችን ማስተዳደር።',
      createdAt: now
    },

    // Records Category
    {
      id: 'perm-rec-hold',
      key: 'records.legal_hold',
      category: 'Records',
      nameEn: 'Apply / Release Legal Hold',
      nameAm: 'የሕግ እገዳ መጣል / ማንሳት',
      descriptionEn: 'Freeze records from edits or disposal during audits/litigation.',
      descriptionAm: 'ሰነዶችን በኦዲት ወይም በሕግ ጉዳይ ወቅት ከለውጥ ማገድ።',
      legacyAlias: 'apply:legal_hold',
      createdAt: now
    },
    {
      id: 'perm-rec-req-disp',
      key: 'records.request_disposal',
      category: 'Records',
      nameEn: 'Request Record Disposal',
      nameAm: 'የመዝገብ ማስወገድ ጥያቄ ማቅረብ',
      descriptionEn: 'Submit matured archival records for certified disposal review.',
      descriptionAm: 'ጊዜያቸው ያለፈባቸውን መዛግብት ለማስወገድ ጥያቄ ማቅረብ።',
      createdAt: now
    },
    {
      id: 'perm-rec-app-disp',
      key: 'records.approve_disposal',
      category: 'Records',
      nameEn: 'Approve & Execute Disposal',
      nameAm: 'የመዝገብ ማስወገድ ማጽደቅ',
      descriptionEn: 'Approve multi-signature destruction certificates and execute disposal.',
      descriptionAm: 'የማስወገጃ የምስክር ወረቀቶችን ማጽደቅ።',
      createdAt: now
    },
    {
      id: 'perm-rec-ret',
      key: 'records.configure_retention',
      category: 'Records',
      nameEn: 'Configure Retention Schedules',
      nameAm: 'የቆይታ ጊዜ ሰንጠረዥ ማዋቀር',
      descriptionEn: 'Define statutory retention schedules and disposal rules.',
      descriptionAm: 'የሕግ የቆይታ ጊዜ ሰንጠረዦችን ማዋቀር።',
      createdAt: now
    },

    // Administration Category
    {
      id: 'perm-adm-users',
      key: 'admin.manage_users',
      category: 'Administration',
      nameEn: 'Manage Staff Users & Lockouts',
      nameAm: 'የሠራተኞች መለያዎችን ማስተዳደር',
      descriptionEn: 'Create users, reset passwords, lock/unlock accounts, and assign roles.',
      descriptionAm: 'ተጠቃሚዎችን መፍጠር፣ የይለፍ ቃል ዳግም ማስጀመር እና መለያ መቆለፍ።',
      legacyAlias: 'manage:users',
      createdAt: now
    },
    {
      id: 'perm-adm-roles',
      key: 'admin.manage_roles',
      category: 'Administration',
      nameEn: 'Manage Enterprise Roles & SoD',
      nameAm: 'የድርጅት ሚናዎችንና SoD ማስተዳደር',
      descriptionEn: 'Design custom roles, ABAC rules, SoD policies, and access reviews.',
      descriptionAm: 'ሚናዎችን፣ የABAC ደንቦችን፣ SoD ፖሊሲዎችንና የፈቃድ ግምገማን ማስተዳደር።',
      createdAt: now
    },
    {
      id: 'perm-adm-branches',
      key: 'admin.manage_branches',
      category: 'Administration',
      nameEn: 'Manage Branches & Directorates',
      nameAm: 'ቅርንጫፎችንና ዳይሬክቶሬቶችን ማስተዳደር',
      descriptionEn: 'Configure Head Office, 19 regional hubs, and directorates.',
      descriptionAm: 'ዋና መሥሪያ ቤትን፣ 19 ቅርንጫፎችንና ዳይሬክቶሬቶችን ማስተዳደር።',
      legacyAlias: 'manage:organizations',
      createdAt: now
    },
    {
      id: 'perm-adm-audit',
      key: 'admin.view_audit',
      category: 'Administration',
      nameEn: 'View Audit Trail & Security Logs',
      nameAm: 'የኦዲትና የደህንነት መዝገቦችን ማየት',
      descriptionEn: 'Inspect immutable security, login, PKI, and RBAC audit trails.',
      descriptionAm: 'የደህንነት፣ የመግቢያ እና የፈቃድ ለውጥ መዝገቦችን መመልከት።',
      legacyAlias: 'read:audit',
      createdAt: now
    },
    {
      id: 'perm-adm-integ',
      key: 'admin.manage_integrations',
      category: 'Administration',
      nameEn: 'Manage Integrations & Backups',
      nameAm: 'ውህደቶችንና ምትኬዎችን ማስተዳደር',
      descriptionEn: 'Configure ERP/EFDA/SMS connectors, webhooks, API keys, and backups.',
      descriptionAm: 'የውጭ ሲስተም ግንኙነቶችን፣ API ቁልፎችንና ምትኬዎችን ማስተዳደር።',
      createdAt: now
    },

    // Workspace Category
    {
      id: 'perm-ws-folder',
      key: 'workspace.create_folder',
      category: 'Workspace',
      nameEn: 'Create Workspace Folders',
      nameAm: 'የመሥሪያ ቦታ አቃፊ መፍጠር',
      descriptionEn: 'Create shared or departmental repository folders.',
      descriptionAm: 'የጋራ ወይም የመምሪያ አቃፊዎችን መፍጠር።',
      legacyAlias: 'manage:workspace',
      createdAt: now
    },
    {
      id: 'perm-ws-upload',
      key: 'workspace.upload',
      category: 'Workspace',
      nameEn: 'Upload & Version Workspace Files',
      nameAm: 'ፋይሎችን መስቀል እና ማሻሻል',
      descriptionEn: 'Upload new files and manage document version history.',
      descriptionAm: 'አዳዲስ ፋይሎችን መስቀልና የቅጂ ታሪክ ማስተዳደር።',
      createdAt: now
    },
    {
      id: 'perm-ws-share',
      key: 'workspace.share',
      category: 'Workspace',
      nameEn: 'Share Workspace Items',
      nameAm: 'የመሥሪያ ቦታ ፋይሎችን ማጋራት',
      descriptionEn: 'Grant Viewer/Editor shares or internal link access.',
      descriptionAm: 'ለተጠቃሚዎች ወይም ሚናዎች የማየት/ማስተካከል ፈቃድ ማጋራት።',
      legacyAlias: 'share:workspace',
      createdAt: now
    },
    {
      id: 'perm-ws-perm',
      key: 'workspace.manage_permissions',
      category: 'Workspace',
      nameEn: 'Manage Workspace Access Controls',
      nameAm: 'የመሥሪያ ቦታ ፈቃዶችን ማስተዳደር',
      descriptionEn: 'Revoke shares, restore versions, and permanently purge trashed items.',
      descriptionAm: 'የተጋሩ ፈቃዶችን መሻርና የተጣሉ ፋይሎችን ማስተዳደር።',
      createdAt: now
    },

    // Reporting Category
    {
      id: 'perm-rep-view',
      key: 'reporting.view',
      category: 'Reporting',
      nameEn: 'View Executive Analytics',
      nameAm: 'የአፈጻጸም ትንተና ማየት',
      descriptionEn: 'Access executive KPIs, SLA dashboards, and branch turnaround metrics.',
      descriptionAm: 'ዋና ዋና መለኪያዎችንና የቅርንጫፍ አፈጻጸም ዳሽቦርዶችን ማየት።',
      createdAt: now
    },
    {
      id: 'perm-rep-export',
      key: 'reporting.export',
      category: 'Reporting',
      nameEn: 'Export Analytical Reports',
      nameAm: 'ሪፖርቶችን ማውጣት (CSV/PDF)',
      descriptionEn: 'Export management registers, SLA compliance, and audit packs.',
      descriptionAm: 'የአስተዳደር ሪፖርቶችን በCSV እና PDF ማውጣት።',
      legacyAlias: 'export:reports',
      createdAt: now
    },
    {
      id: 'perm-rep-sched',
      key: 'reporting.schedule',
      category: 'Reporting',
      nameEn: 'Schedule Automated Reports',
      nameAm: 'ተደጋጋሚ ሪፖርቶችን ማቀድ',
      descriptionEn: 'Configure saved report templates and scheduled executive briefs.',
      descriptionAm: 'የተቀመጡ ሪፖርቶችንና መደበኛ ማጠቃለያዎችን ማቀድ።',
      createdAt: now
    }
  ];
}

export function createInitialPermissionSets(): PermissionSet[] {
  const now = '2026-01-01T00:00:00Z';
  return [
    {
      id: 'pset-registry-core',
      nameEn: 'Central Registry Intake Bundle',
      nameAm: 'የማዕከላዊ መዝገብ ቤት ጥቅል',
      descriptionEn: 'Standard intake, metadata editing, QR printing, and physical file custody.',
      isSystem: true,
      createdAt: now,
      grants: {
        'document.create': 'Organization',
        'document.read': 'Organization',
        'document.update': 'Organization',
        'document.download': 'Organization',
        'document.print': 'Organization',
        'physical.register': 'Organization',
        'physical.handover': 'Organization',
        'physical.acknowledge': 'Organization'
      }
    },
    {
      id: 'pset-exec-approval',
      nameEn: 'Executive Workflow & PKI Sign-Off',
      nameAm: 'የአመራር ማጽደቅ እና ዲጂታል ፊርማ',
      descriptionEn: 'Workflow review, digital signature approval, delegation, and escalation.',
      isSystem: true,
      createdAt: now,
      grants: {
        'workflow.view': 'Organization',
        'workflow.claim': 'Organization',
        'workflow.approve': 'Organization',
        'workflow.reject': 'Organization',
        'workflow.return': 'Organization',
        'workflow.delegate': 'Organization',
        'workflow.escalate': 'Organization'
      }
    },
    {
      id: 'pset-audit-readonly',
      nameEn: 'Independent Compliance & Audit Read-Only',
      nameAm: 'ገለልተኛ የኦዲት ምርመራ (ማንበብ ብቻ)',
      descriptionEn: 'Organization-wide read-only inspection across documents, audit logs, and reports.',
      isSystem: true,
      createdAt: now,
      grants: {
        'document.read': 'All',
        'document.download': 'All',
        'workflow.view': 'All',
        'admin.view_audit': 'All',
        'reporting.view': 'All',
        'reporting.export': 'All'
      }
    }
  ];
}

function allCatalogueGrants(catalogue: PermissionDefinition[], level: PermissionScopeLevel): Record<string, PermissionScopeLevel> {
  const g: Record<string, PermissionScopeLevel> = {};
  for (const p of catalogue) g[p.key] = level;
  return g;
}

export function createInitialEnterpriseRoles(catalogue: PermissionDefinition[]): EnterpriseRole[] {
  const now = '2026-01-01T00:00:00Z';
  const makeRole = (
    id: string,
    code: string,
    nameEn: string,
    nameAm: string,
    descriptionEn: string,
    opts: Partial<EnterpriseRole> = {}
  ): EnterpriseRole => ({
    id,
    code,
    nameEn,
    nameAm,
    descriptionEn,
    descriptionAm: opts.descriptionAm || descriptionEn,
    isSystemRole: opts.isSystemRole ?? false,
    isSensitiveRole: opts.isSensitiveRole ?? false,
    status: opts.status || 'Active',
    scopeType: opts.scopeType || 'Global',
    scopeTargetId: opts.scopeTargetId,
    parentRoleIds: opts.parentRoleIds || [],
    requiresMfa: opts.requiresMfa ?? false,
    grants: opts.grants || {},
    denies: opts.denies || [],
    permissionSetIds: opts.permissionSetIds || [],
    abacRules: opts.abacRules || [],
    version: 1,
    versionHistory: [
      {
        version: 1,
        changedAt: now,
        changedById: 'usr-admin',
        changedByName: 'System Security Administrator',
        versionNote: 'Initial EPSS enterprise baseline',
        reason: 'Institutional system bootstrap',
        status: opts.status || 'Active',
        snapshot: {
          grants: opts.grants || {},
          denies: opts.denies || [],
          abacRules: opts.abacRules || [],
          parentRoleIds: opts.parentRoleIds || [],
          requiresMfa: opts.requiresMfa ?? false
        }
      }
    ],
    createdAt: now,
    updatedAt: now,
    updatedByName: 'System Security Administrator'
  });

  return [
    // 3 Immutable Baseline System Roles
    makeRole(
      'role-superadmin',
      'SuperAdmin',
      'Super Administrator',
      'ዋና የሲስተም አስተዳዳሪ',
      'Unrestricted system governance, RBAC administration, and security enforcement.',
      {
        isSystemRole: true,
        isSensitiveRole: true,
        requiresMfa: true,
        grants: allCatalogueGrants(catalogue, 'All')
      }
    ),
    makeRole(
      'role-system-auditor',
      'SystemAuditor',
      'System Compliance Auditor',
      'የሲስተም ኦዲተር',
      'Immutable read-only audit oversight across all branches, security events, and compliance exports.',
      {
        isSystemRole: true,
        isSensitiveRole: true,
        requiresMfa: true,
        grants: {
          'document.read': 'All',
          'document.download': 'All',
          'workflow.view': 'All',
          'admin.view_audit': 'All',
          'reporting.view': 'All',
          'reporting.export': 'All'
        },
        denies: ['document.delete', 'admin.manage_roles']
      }
    ),
    makeRole(
      'role-security-officer',
      'SecurityOfficer',
      'Information Security Officer',
      'የመረጃ ደህንነት ኃላፊ',
      'Manages user lockouts, active sessions, role governance, SoD policies, and Break-Glass oversight.',
      {
        isSystemRole: true,
        isSensitiveRole: true,
        requiresMfa: true,
        grants: {
          'document.read': 'Organization',
          'admin.manage_users': 'All',
          'admin.manage_roles': 'All',
          'admin.view_audit': 'All',
          'reporting.view': 'All',
          'reporting.export': 'All'
        }
      }
    ),

    // 15+ Organizational Roles (fully customizable)
    makeRole(
      'role-dg',
      'DirectorGeneral',
      'Director General',
      'ዋና ዳይሬክተር',
      'Executive institutional authority across Head Office and 19 regional hubs.',
      {
        isSensitiveRole: true,
        requiresMfa: true,
        grants: {
          'document.read': 'All',
          'document.create': 'All',
          'document.update': 'All',
          'document.delete': 'All',
          'document.download': 'All',
          'document.print': 'All',
          'document.share': 'All',
          'document.archive': 'All',
          'workflow.view': 'All',
          'workflow.claim': 'All',
          'workflow.approve': 'All',
          'workflow.reject': 'All',
          'workflow.return': 'All',
          'workflow.delegate': 'All',
          'workflow.escalate': 'All',
          'workflow.configure': 'All',
          'records.legal_hold': 'All',
          'records.approve_disposal': 'All',
          'admin.manage_users': 'All',
          'admin.manage_branches': 'All',
          'admin.view_audit': 'All',
          'workspace.create_folder': 'All',
          'workspace.upload': 'All',
          'workspace.share': 'All',
          'reporting.view': 'All',
          'reporting.export': 'All',
          'reporting.schedule': 'All'
        }
      }
    ),
    makeRole(
      'role-deputy-dg',
      'DeputyDG',
      'Deputy Director General',
      'ምክትል ዋና ዳይሬክተር',
      'Deputy executive oversight, escalations, and sector-wide workflow approvals.',
      {
        isSensitiveRole: true,
        requiresMfa: true,
        parentRoleIds: ['role-directorate-director'],
        grants: {
          'document.read': 'Organization',
          'document.download': 'Organization',
          'workflow.approve': 'Organization',
          'workflow.reject': 'Organization',
          'workflow.escalate': 'Organization',
          'records.legal_hold': 'Organization',
          'reporting.view': 'Organization',
          'reporting.export': 'Organization'
        }
      }
    ),
    makeRole(
      'role-directorate-director',
      'DirectorateDirector',
      'Directorate Director',
      'የዳይሬክቶሬት ዳይሬክተር',
      'Senior directorate leadership managing workflow sign-offs and departmental dossiers.',
      {
        requiresMfa: true,
        parentRoleIds: ['role-dept-head'],
        grants: {
          'document.read': 'Organization',
          'document.create': 'Organization',
          'document.update': 'Department',
          'document.download': 'Department',
          'document.print': 'Department',
          'workflow.approve': 'Department',
          'workflow.reject': 'Department',
          'workflow.return': 'Department',
          'workflow.delegate': 'Department',
          'workflow.escalate': 'Department',
          'workspace.create_folder': 'Department',
          'workspace.upload': 'Department',
          'workspace.share': 'Department',
          'reporting.view': 'Department',
          'reporting.export': 'Department'
        }
      }
    ),
    makeRole(
      'role-director',
      'Director',
      'Director',
      'ዳይሬክተር',
      'Directorate-level correspondence routing, workflow approval, and file sharing.',
      {
        requiresMfa: true,
        grants: {
          'document.read': 'Organization',
          'document.create': 'Organization',
          'document.update': 'Department',
          'document.download': 'Organization',
          'document.print': 'Department',
          'document.archive': 'Department',
          'workflow.view': 'Department',
          'workflow.claim': 'Department',
          'workflow.approve': 'Department',
          'workflow.reject': 'Department',
          'workflow.return': 'Department',
          'workflow.delegate': 'Department',
          'workspace.create_folder': 'Department',
          'workspace.upload': 'Department',
          'workspace.share': 'Department',
          'reporting.view': 'Department',
          'reporting.export': 'Department'
        }
      }
    ),
    makeRole(
      'role-dept-head',
      'DepartmentHead',
      'Department Head',
      'የመምሪያ ኃላፊ',
      'Departmental correspondence assignment, internal approvals, and team oversight.',
      {
        parentRoleIds: ['role-team-leader'],
        grants: {
          'document.read': 'Department',
          'document.create': 'Department',
          'document.update': 'Department',
          'document.download': 'Department',
          'workflow.view': 'Department',
          'workflow.approve': 'Department',
          'workflow.return': 'Department',
          'workflow.delegate': 'Department',
          'workspace.create_folder': 'Department',
          'workspace.upload': 'Department',
          'workspace.share': 'Department',
          'reporting.view': 'Department'
        }
      }
    ),
    makeRole(
      'role-team-leader',
      'TeamLeader',
      'Team Leader',
      'የቡድን መሪ',
      'Operational task review, physical file request, and team dossier collaboration.',
      {
        parentRoleIds: ['role-viewer'],
        grants: {
          'document.read': 'Department',
          'document.create': 'Department',
          'document.update': 'Own',
          'document.download': 'Department',
          'workflow.view': 'Department',
          'workflow.claim': 'Department',
          'workflow.return': 'Department',
          'workspace.create_folder': 'Department',
          'workspace.upload': 'Department'
        }
      }
    ),
    makeRole(
      'role-registry-officer',
      'RegistryOfficer',
      'Registry Officer',
      'የመዝገብ ቤት ባለሙያ',
      'Central intake registration, numbering control, and physical file custody.',
      {
        grants: {
          'document.read': 'Organization',
          'document.create': 'Organization',
          'document.update': 'Organization',
          'document.download': 'Organization',
          'document.print': 'Organization',
          'document.share': 'Organization',
          'document.archive': 'Organization',
          'workflow.view': 'Organization',
          'physical.register': 'Organization',
          'physical.handover': 'Organization',
          'physical.acknowledge': 'Organization',
          'physical.report_missing': 'Organization',
          'workspace.create_folder': 'Organization',
          'workspace.upload': 'Organization',
          'workspace.share': 'Organization',
          'reporting.view': 'Organization',
          'reporting.export': 'Organization'
        }
      }
    ),
    makeRole(
      'role-branch-manager',
      'BranchManager',
      'Branch Hub Manager',
      'የቅርንጫፍ ሥራ አስኪያጅ',
      'Regional hub operations, branch correspondence registration, and physical tracking.',
      {
        scopeType: 'Branch',
        grants: {
          'document.read': 'Branch',
          'document.create': 'Branch',
          'document.update': 'Branch',
          'document.download': 'Branch',
          'document.print': 'Branch',
          'workflow.view': 'Branch',
          'workflow.claim': 'Branch',
          'workflow.approve': 'Branch',
          'physical.register': 'Branch',
          'physical.handover': 'Branch',
          'physical.acknowledge': 'Branch',
          'workspace.create_folder': 'Branch',
          'workspace.upload': 'Branch',
          'reporting.view': 'Branch',
          'reporting.export': 'Branch'
        }
      }
    ),
    makeRole(
      'role-branch-registry',
      'BranchRegistry',
      'Branch Registry Clerk',
      'የቅርንጫፍ መዝገብ ቤት ባለሙያ',
      'Regional branch correspondence intake, scanning, and courier handover receipt.',
      {
        scopeType: 'Branch',
        grants: {
          'document.read': 'Branch',
          'document.create': 'Branch',
          'document.update': 'Branch',
          'document.download': 'Branch',
          'document.print': 'Branch',
          'physical.register': 'Branch',
          'physical.handover': 'Branch',
          'physical.acknowledge': 'Branch'
        }
      }
    ),
    makeRole(
      'role-procurement-officer',
      'ProcurementOfficer',
      'Procurement Officer',
      'የግዥ ባለሙያ',
      'Tender documentation handling, vendor correspondence, and workspace collaboration.',
      {
        grants: {
          'document.read': 'Department',
          'document.create': 'Department',
          'document.update': 'Own',
          'document.download': 'Department',
          'workflow.view': 'Department',
          'workflow.claim': 'Department',
          'workspace.create_folder': 'Department',
          'workspace.upload': 'Department',
          'workspace.share': 'Department'
        }
      }
    ),
    makeRole(
      'role-quality-officer',
      'QualityOfficer',
      'Quality Assurance & EFDA Officer',
      'የጥራት ማረጋገጫ ባለሙያ',
      'Cold-chain quality inspection reports, batch clearance dossiers, and lab attestations.',
      {
        grants: {
          'document.read': 'Department',
          'document.create': 'Department',
          'document.update': 'Department',
          'document.download': 'Department',
          'workflow.view': 'Department',
          'workflow.claim': 'Department',
          'workflow.approve': 'Department',
          'workspace.upload': 'Department'
        },
        abacRules: [
          {
            id: 'abac-qa-internal',
            permissionKey: 'workflow.approve',
            effect: 'Allow',
            description: 'Can approve workflow only if Confidentiality <= Confidential and same Department',
            conditions: [
              { id: 'c1', field: 'confidentiality', operator: 'lte', value: 'Confidential' },
              { id: 'c2', field: 'departmentId', operator: 'eq', value: '$user.departmentId' }
            ]
          }
        ]
      }
    ),
    makeRole(
      'role-legal-officer',
      'LegalOfficer',
      'Legal & Regulatory Officer',
      'የሕግ አገልግሎት ባለሙያ',
      'Legal holds, litigation review, contract compliance, and disposal clearance.',
      {
        isSensitiveRole: true,
        requiresMfa: true,
        grants: {
          'document.read': 'Organization',
          'document.download': 'Organization',
          'workflow.view': 'Organization',
          'records.legal_hold': 'Organization',
          'records.approve_disposal': 'Organization',
          'reporting.view': 'Organization'
        }
      }
    ),
    makeRole(
      'role-finance-officer',
      'FinanceOfficer',
      'Finance & Disbursement Officer',
      'የፋይናንስ ባለሙያ',
      'Financial vouchers, LC correspondence, and vendor payment clearances.',
      {
        grants: {
          'document.read': 'Department',
          'document.create': 'Department',
          'document.download': 'Department',
          'workflow.view': 'Department',
          'workflow.claim': 'Department',
          'reporting.view': 'Department'
        }
      }
    ),
    makeRole(
      'role-auditor',
      'Auditor',
      'Internal Auditor',
      'የውስጥ ኦዲተር',
      'Read-only compliance inspection across audit trails, records, and security logs.',
      {
        requiresMfa: true,
        grants: {
          'document.read': 'All',
          'document.download': 'All',
          'workflow.view': 'All',
          'admin.view_audit': 'All',
          'reporting.view': 'All',
          'reporting.export': 'All'
        },
        denies: ['document.create', 'document.update', 'document.delete', 'workflow.approve']
      }
    ),
    makeRole(
      'role-records-manager',
      'RecordsManager',
      'Records & Retention Manager',
      'የመዛግብት እና ማህደር አስተዳዳሪ',
      'Archival classification, retention schedules, physical vault locations, and disposal governance.',
      {
        isSensitiveRole: true,
        requiresMfa: true,
        grants: {
          'document.read': 'Organization',
          'document.archive': 'All',
          'physical.register': 'All',
          'physical.handover': 'All',
          'physical.acknowledge': 'All',
          'physical.manage_locations': 'All',
          'records.request_disposal': 'All',
          'records.configure_retention': 'All',
          'reporting.view': 'Organization',
          'reporting.export': 'Organization'
        }
      }
    ),
    makeRole(
      'role-viewer',
      'Viewer',
      'Read-Only Staff Viewer',
      'መደበኛ አንባቢ ተጠቃሚ',
      'Basic read-only access to public and internal departmental correspondence.',
      {
        grants: {
          'document.read': 'Department',
          'workflow.view': 'Own'
        },
        abacRules: [
          {
            id: 'abac-viewer-internal',
            permissionKey: 'document.read',
            effect: 'Allow',
            description: 'Viewer may only read Public or Internal records',
            conditions: [{ id: 'c-v1', field: 'confidentiality', operator: 'lte', value: 'Internal' }]
          }
        ]
      }
    )
  ];
}

export function createInitialSodRules(): SodRule[] {
  const now = '2026-01-01T00:00:00Z';
  return [
    {
      id: 'sod-1',
      nameEn: 'Registry Creator vs Independent Auditor',
      nameAm: 'መዝጋቢ እና ገለልተኛ ኦዲተር መለያየት',
      description: 'Same officer cannot simultaneously hold RegistryOfficer and Auditor / SystemAuditor roles.',
      ruleType: 'RolePair',
      leftItem: 'RegistryOfficer',
      rightItem: 'Auditor',
      severity: 'Blocking',
      isActive: true,
      createdAt: now
    },
    {
      id: 'sod-2',
      nameEn: 'Procurement Officer vs Finance Disbursement',
      nameAm: 'የግዥ ባለሙያ እና የፋይናንስ ባለሙያ መለያየት',
      description: 'Prevents tender procurement originators from simultaneously approving finance disbursements.',
      ruleType: 'RolePair',
      leftItem: 'ProcurementOfficer',
      rightItem: 'FinanceOfficer',
      severity: 'Blocking',
      isActive: true,
      createdAt: now
    },
    {
      id: 'sod-3',
      nameEn: 'Disposal Requester vs Disposal Approver',
      nameAm: 'የማስወገድ ጠያቂ እና አጽዳቂ መለያየት',
      description: 'Same user cannot hold both records.request_disposal and records.approve_disposal permissions.',
      ruleType: 'PermissionPair',
      leftItem: 'records.request_disposal',
      rightItem: 'records.approve_disposal',
      severity: 'Blocking',
      isActive: true,
      createdAt: now
    },
    {
      id: 'sod-4',
      nameEn: 'Workflow Requester vs Final Approver',
      nameAm: 'የሥራ ፍሰት አስጀማሪ እና የመጨረሻ አጽዳቂ መለያየት',
      description: 'Document registrant/creator cannot act as final approver on their own submitted workflow.',
      ruleType: 'WorkflowConflict',
      leftItem: 'workflow.initiator',
      rightItem: 'workflow.final_approver',
      severity: 'Blocking',
      isActive: true,
      createdAt: now
    }
  ];
}

export function createInitialAutoAssignmentRules(): RoleAutoAssignmentRule[] {
  const now = '2026-01-01T00:00:00Z';
  return [
    {
      id: 'auto-rule-1',
      nameEn: 'Regional Hub Managers -> BranchManager Role',
      nameAm: 'የቅርንጫፍ ኃላፊዎች -> BranchManager ሚና',
      matchField: 'position',
      matchOperator: 'contains',
      matchValue: 'Branch Manager',
      targetRoleId: 'role-branch-manager',
      targetRoleCode: 'BranchManager',
      isActive: true,
      createdAt: now
    },
    {
      id: 'auto-rule-2',
      nameEn: 'Internal Audit Directorate -> Auditor Role',
      nameAm: 'የውስጥ ኦዲት ዳይሬክቶሬት -> Auditor ሚና',
      matchField: 'departmentId',
      matchOperator: 'equals',
      matchValue: 'dept-audit',
      targetRoleId: 'role-auditor',
      targetRoleCode: 'Auditor',
      isActive: true,
      createdAt: now
    }
  ];
}

export function createInitialAccessReviewCampaigns(): AccessReviewCampaign[] {
  return [
    {
      id: 'arc-2026-q4',
      titleEn: 'Q4 2026 National Executive & Sensitive Role Certification',
      titleAm: 'የ2026 ሩብ ዓመት የከፍተኛ ኃላፊዎችና ሚስጥራዊ ሚናዎች ማረጋገጫ ዘመቻ',
      description: 'Periodic certification of SuperAdmin, DirectorGeneral, Director, and Auditor privileges across EPSS Head Office and regional hubs.',
      reviewerIds: ['usr-admin', 'usr-dg'],
      reviewerNames: ['System Security Administrator', 'Dr. Abdulkadir Gelgelo'],
      status: 'Active',
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      createdAt: '2026-11-01T08:00:00Z',
      createdByName: 'System Security Administrator',
      items: [
        {
          id: 'ari-1',
          userId: 'usr-proc',
          userName: 'Dawit Tefera',
          username: 'dawit.t',
          roleId: 'role-director',
          roleCode: 'Director',
          roleNameEn: 'Director',
          scopeLabel: 'Department: Procurement Directorate',
          status: 'Pending'
        },
        {
          id: 'ari-2',
          userId: 'usr-audit',
          userName: 'Tigist Haile',
          username: 'tigist.h',
          roleId: 'role-auditor',
          roleCode: 'Auditor',
          roleNameEn: 'Internal Auditor',
          scopeLabel: 'Global (Read-Only Compliance)',
          status: 'Pending'
        },
        {
          id: 'ari-3',
          userId: 'usr-bm-haw',
          userName: 'Yonas Alemu',
          username: 'yonas.a',
          roleId: 'role-branch-manager',
          roleCode: 'BranchManager',
          roleNameEn: 'Branch Hub Manager',
          scopeLabel: 'Branch: Hawassa Branch Hub',
          status: 'Approved',
          reviewerComment: 'Confirmed active regional hub directorate mandate.',
          reviewedAt: '2026-11-05T10:00:00Z',
          reviewedByName: 'Dr. Abdulkadir Gelgelo'
        }
      ]
    }
  ];
}
