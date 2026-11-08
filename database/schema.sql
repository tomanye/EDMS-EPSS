-- ==============================================================================
-- EPSS Enterprise EDRMS - Relational Database Migration Script
-- Ethiopian Pharmaceutical Supply Service (EPSS)
-- Target RDBMS: Microsoft SQL Server / PostgreSQL (ANSI SQL Compatible)
-- Standard: ISO 15489 Records Management Information Systems
-- ==============================================================================

-- 1. Create Schema
CREATE SCHEMA IF NOT EXISTS epss_edrms;

-- 2. Branches & Regional Hubs
CREATE TABLE epss_edrms.branches (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    name_en VARCHAR(255) NOT NULL,
    name_am NVARCHAR(255) NOT NULL,
    city VARCHAR(128) NOT NULL,
    region VARCHAR(128) NOT NULL,
    cluster VARCHAR(64) NOT NULL CHECK (cluster IN ('Central', 'Northern', 'Western', 'SouthernEastern')),
    is_head_office BOOLEAN NOT NULL DEFAULT FALSE,
    phone VARCHAR(64),
    email VARCHAR(128),
    address VARCHAR(255),
    manager_name VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_branches_cluster ON epss_edrms.branches(cluster);
CREATE INDEX idx_branches_is_head_office ON epss_edrms.branches(is_head_office);

-- 3. Directorates & Departments
CREATE TABLE epss_edrms.departments (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    name_en VARCHAR(255) NOT NULL,
    name_am NVARCHAR(255) NOT NULL,
    head_user_id VARCHAR(64),
    head_name_en VARCHAR(128),
    directorate_en VARCHAR(255) NOT NULL,
    directorate_am NVARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Staff Accounts & Users
CREATE TABLE epss_edrms.users (
    id VARCHAR(64) PRIMARY KEY,
    full_name_en VARCHAR(128) NOT NULL,
    full_name_am NVARCHAR(128) NOT NULL,
    email VARCHAR(128) NOT NULL UNIQUE,
    role VARCHAR(64) NOT NULL CHECK (role IN (
        'SuperAdmin', 'DirectorGeneral', 'Director', 
        'RegistryOfficer', 'BranchManager', 'ProcurementOfficer', 'Auditor'
    )),
    branch_id VARCHAR(64) NOT NULL REFERENCES epss_edrms.branches(id),
    department_id VARCHAR(64) NOT NULL REFERENCES epss_edrms.departments(id),
    position VARCHAR(128),
    avatar_url VARCHAR(255),
    permissions TEXT[], -- JSON or Array of permissions
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_branch_id ON epss_edrms.users(branch_id);
CREATE INDEX idx_users_role ON epss_edrms.users(role);

-- 5. Retention Schedules
CREATE TABLE epss_edrms.retention_schedules (
    id VARCHAR(64) PRIMARY KEY,
    category VARCHAR(128) NOT NULL,
    retention_period_years INT NOT NULL,
    trigger_event VARCHAR(128) NOT NULL,
    disposition_action VARCHAR(64) NOT NULL CHECK (disposition_action IN ('Archive', 'Destroy', 'Review')),
    legal_basis VARCHAR(255) NOT NULL,
    description VARCHAR(255)
);

-- 6. Master Correspondence & Documents
CREATE TABLE epss_edrms.documents (
    id VARCHAR(64) PRIMARY KEY,
    registration_number VARCHAR(64) NOT NULL UNIQUE,
    type VARCHAR(32) NOT NULL CHECK (type IN ('Incoming', 'Outgoing', 'InternalMemo', 'Application')),
    subject VARCHAR(512) NOT NULL,
    summary_en TEXT,
    summary_am TEXT,
    category VARCHAR(128) NOT NULL,
    priority VARCHAR(32) NOT NULL CHECK (priority IN ('Routine', 'Urgent', 'Emergency')),
    confidentiality VARCHAR(32) NOT NULL CHECK (confidentiality IN ('Public', 'Official', 'Confidential', 'Secret')),
    status VARCHAR(32) NOT NULL CHECK (status IN (
        'Draft', 'Registered', 'UnderReview', 'Approved', 
        'Dispatched', 'Completed', 'Archived', 'Rejected'
    )),
    
    -- Sender Details
    sender_organization VARCHAR(255) NOT NULL,
    sender_contact VARCHAR(128),
    sender_email VARCHAR(128),
    sender_phone VARCHAR(64),
    sender_reference VARCHAR(128),
    
    -- Recipient Details
    recipient_branch_id VARCHAR(64) REFERENCES epss_edrms.branches(id),
    recipient_department_id VARCHAR(64) REFERENCES epss_edrms.departments(id),
    recipient_person VARCHAR(128),
    
    -- Dual Custody Physical Warehouse Coordinates
    phys_building VARCHAR(128) NOT NULL,
    phys_floor VARCHAR(64) NOT NULL,
    phys_room VARCHAR(64) NOT NULL,
    phys_shelf_number VARCHAR(64) NOT NULL,
    phys_box_file_number VARCHAR(64) NOT NULL,
    phys_folder_number VARCHAR(64) NOT NULL,
    
    -- Cryptographic Integrity & Verification
    qr_verification_url VARCHAR(512) NOT NULL,
    sha256_checksum VARCHAR(128) NOT NULL,
    is_pki_signed BOOLEAN NOT NULL DEFAULT FALSE,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    retention_schedule_id VARCHAR(64) REFERENCES epss_edrms.retention_schedules(id),
    
    tags TEXT[],
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_documents_reg_num ON epss_edrms.documents(registration_number);
CREATE INDEX idx_documents_type ON epss_edrms.documents(type);
CREATE INDEX idx_documents_status ON epss_edrms.documents(status);
CREATE INDEX idx_documents_priority ON epss_edrms.documents(priority);
CREATE INDEX idx_documents_recipient_branch ON epss_edrms.documents(recipient_branch_id);

-- 7. Multi-Tier Workflow Actions & Minute Endorsements
CREATE TABLE epss_edrms.workflow_actions (
    id VARCHAR(64) PRIMARY KEY,
    document_id VARCHAR(64) NOT NULL REFERENCES epss_edrms.documents(id) ON DELETE CASCADE,
    actor_user_id VARCHAR(64) NOT NULL REFERENCES epss_edrms.users(id),
    actor_name VARCHAR(128) NOT NULL,
    actor_role VARCHAR(64) NOT NULL,
    action_type VARCHAR(64) NOT NULL CHECK (action_type IN (
        'Created', 'Registered', 'Assigned', 'MinuteAdded', 
        'Approved', 'Rejected', 'Forwarded', 'Dispatched', 'Closed'
    )),
    minute_notes TEXT,
    target_user_id VARCHAR(64),
    target_department_id VARCHAR(64),
    digital_signature VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflow_doc_id ON epss_edrms.workflow_actions(document_id);

-- 8. Physical Chain-of-Custody Handovers
CREATE TABLE epss_edrms.physical_handovers (
    id VARCHAR(64) PRIMARY KEY,
    document_id VARCHAR(64) NOT NULL REFERENCES epss_edrms.documents(id),
    registration_number VARCHAR(64) NOT NULL,
    from_user_id VARCHAR(64) REFERENCES epss_edrms.users(id),
    from_user_name VARCHAR(128) NOT NULL,
    from_location VARCHAR(128) NOT NULL,
    to_user_id VARCHAR(64) REFERENCES epss_edrms.users(id),
    to_user_name VARCHAR(128) NOT NULL,
    to_location VARCHAR(128) NOT NULL,
    carrier_type VARCHAR(64) NOT NULL,
    carrier_name VARCHAR(128),
    purpose VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('PendingDispatch', 'InTransit', 'DeliveredReceived', 'RejectedReturned')),
    handover_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    received_timestamp TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_handovers_doc_id ON epss_edrms.physical_handovers(document_id);

-- 9. Append-Only Tamper-Evident Audit Trail
CREATE TABLE epss_edrms.audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(64) NOT NULL,
    user_name VARCHAR(128) NOT NULL,
    user_role VARCHAR(64) NOT NULL,
    branch_name VARCHAR(128) NOT NULL,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(128) NOT NULL,
    ip_address VARCHAR(64) NOT NULL,
    details TEXT
);

CREATE INDEX idx_audit_timestamp ON epss_edrms.audit_logs(timestamp);
CREATE INDEX idx_audit_user_id ON epss_edrms.audit_logs(user_id);
CREATE INDEX idx_audit_resource_id ON epss_edrms.audit_logs(resource_id);
