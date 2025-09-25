Enhanced Prompt for Version 2 Multi-User ESG Platform
markdown# ESG Data Management Platform V2 - Multi-Tenant Architecture

## 1. System Architecture Overview

### Multi-Tenancy Structure
- **System Level**: Multiple companies on one platform
- **Company Level**: Multiple sites per company
- **Site Level**: Multiple users per site
- **User Level**: Role-based access control

### Hierarchical User Management
Each user level can create, edit, and delete users at lower levels:
Super User (Platform Owner)
↓ manages
Admin (Company Administrator)
↓ manages
Site Manager (Location Manager)
↓ manages
Operational Users (Same level, different permissions):
• Uploader (Data Entry Specialist)
• Viewer/Auditor (Read-only + Reports)
• Meter Manager (Meter Infrastructure)

## 2. Detailed Role Definitions & Permissions

### 2.1 Super User (Level 1)
**Purpose**: Platform administrator with system-wide control

**Access Scope**: All companies, all sites, all data

**Module Permissions**:
```javascript
{
  systemSettings: { create: true, read: true, update: true, delete: true },
  companyManagement: { create: true, read: true, update: true, delete: true },
  userManagement: { 
    canManage: ['admin', 'site_manager', 'uploader', 'viewer', 'meter_manager'],
    scope: 'global'
  },
  modules: {
    companyOnboarding: { access: 'full', scope: 'all_companies' },
    frameworkSelection: { access: 'full', scope: 'all_companies' },
    dataChecklist: { access: 'full', scope: 'all_companies' },
    meterManagement: { access: 'full', scope: 'all_companies' },
    dataCollection: { access: 'full', scope: 'all_companies' },
    dashboard: { access: 'full', scope: 'system_wide' },
    reports: { access: 'full', scope: 'cross_company' }
  }
}
Unique Features:

System configuration panel
Company creation/deletion
Global framework management
Cross-company analytics dashboard
System health monitoring
Billing management (if applicable)

2.2 Admin (Level 2)
Purpose: Company-level administrator
Access Scope: Own company, all sites within company
Module Permissions:
javascript{
  companySettings: { create: false, read: true, update: true, delete: false },
  userManagement: {
    canManage: ['site_manager', 'uploader', 'viewer', 'meter_manager'],
    scope: 'company'
  },
  modules: {
    companyOnboarding: { access: 'full', scope: 'own_company' },
    frameworkSelection: { access: 'full', scope: 'own_company' },
    dataChecklist: { 
      access: 'full', 
      scope: 'own_company',
      taskAssignment: true
    },
    meterManagement: { access: 'full', scope: 'all_sites' },
    dataCollection: { 
      access: 'full', 
      scope: 'all_sites',
      canApprove: true 
    },
    dashboard: { access: 'full', scope: 'company_wide' },
    reports: { access: 'full', scope: 'company_wide' }
  }
}
Unique Features:

Site creation and management
Company-wide task assignment
Framework selection for company
Export/import company data
Company-wide reporting

2.3 Site Manager (Level 3)
Purpose: Site/location manager
Access Scope: Assigned sites only
Module Permissions:
javascript{
  siteSettings: { create: false, read: true, update: true, delete: false },
  userManagement: {
    canManage: ['uploader', 'viewer', 'meter_manager'],
    scope: 'site'
  },
  modules: {
    companyOnboarding: { access: 'view', scope: 'read_only' },
    frameworkSelection: { access: 'view', scope: 'read_only' },
    dataChecklist: { 
      access: 'view', 
      scope: 'assigned_sites',
      taskAssignment: true,
      limitedTo: 'site_users'
    },
    meterManagement: { access: 'full', scope: 'assigned_sites' },
    dataCollection: { 
      access: 'full', 
      scope: 'assigned_sites',
      canReview: true,
      canApprove: false 
    },
    dashboard: { access: 'full', scope: 'site_comparison' },
    reports: { access: 'full', scope: 'site_specific' }
  }
}
Unique Features:

Team management for site
Site-specific task assignment
Data validation and review
Site performance tracking
Inter-site comparisons

2.4 Uploader (Level 4)
Purpose: Data entry specialist
Access Scope: Assigned tasks only
Module Permissions:
javascript{
  modules: {
    companyOnboarding: { access: 'none' },
    frameworkSelection: { access: 'none' },
    dataChecklist: { 
      access: 'view', 
      scope: 'assigned_tasks_only'
    },
    meterManagement: { 
      access: 'view', 
      scope: 'related_meters_only'
    },
    dataCollection: { 
      access: 'edit', 
      scope: 'assigned_tasks',
      actions: ['enter_value', 'upload_evidence', 'add_notes']
    },
    dashboard: { 
      access: 'view', 
      scope: 'own_submissions'
    },
    reports: { 
      access: 'view', 
      scope: 'own_data'
    }
  }
}
Unique Features:

Task inbox/queue
Bulk data entry tools
Evidence upload interface
Submission history
Personal progress tracker

2.5 Viewer/Auditor (Level 4)
Purpose: Data auditor and report generator
Access Scope: Read-only access to assigned scope
Module Permissions:
javascript{
  modules: {
    companyOnboarding: { access: 'view' },
    frameworkSelection: { access: 'view' },
    dataChecklist: { access: 'view' },
    meterManagement: { access: 'view' },
    dataCollection: { 
      access: 'view', 
      actions: ['add_comments', 'flag_issues', 'export_data']
    },
    dashboard: { access: 'view' },
    reports: { 
      access: 'full', 
      actions: ['generate', 'export', 'schedule']
    }
  }
}
Unique Features:

Advanced report builder
Data export tools
Audit trail viewer
Compliance checking
Commenting system

2.6 Meter Manager (Level 4)
Purpose: Meter infrastructure specialist
Access Scope: Meter management only
Module Permissions:
javascript{
  modules: {
    companyOnboarding: { access: 'none' },
    frameworkSelection: { access: 'none' },
    dataChecklist: { 
      access: 'view', 
      scope: 'metered_elements_only'
    },
    meterManagement: { 
      access: 'full',
      actions: ['create', 'edit', 'delete', 'maintenance_log']
    },
    dataCollection: { 
      access: 'view', 
      scope: 'meter_readings_only'
    },
    dashboard: { 
      access: 'view', 
      scope: 'meter_analytics'
    },
    reports: { 
      access: 'view', 
      scope: 'meter_reports'
    }
  }
}
Unique Features:

Meter inventory management
Maintenance scheduling
QR code generation
Meter analytics dashboard
Calibration tracking

3. Enhanced Module Specifications
Module 0: Authentication & Landing
New Module for V2
Components:

Login page with company code field
Role-based dashboard redirect
Password reset flow
Two-factor authentication (optional)

Module 1: Company Onboarding
Enhanced for Multi-Site
Additional Fields:

Number of sites/locations
Site details (name, address, emirate)
Company structure (standalone/group)

Access Control:

Super User: Can onboard any company
Admin: Can edit own company
Others: View only or no access

Module 3: Data Checklist & Task Assignment
Enhanced with User Assignment
New Features:
javascript// Task Assignment Interface
{
  dataElement: {
    id: "de1",
    name: "Electricity Consumption",
    assignments: [
      {
        site: "Dubai Main Hotel",
        assignedTo: "uploader_user_id",
        assignedBy: "admin_user_id",
        assignedDate: "2024-01-15",
        status: "pending"
      }
    ]
  }
}
Bulk Assignment Options:

Assign all Environmental tasks to user
Assign all tasks for a site to user
Copy assignments from another site

Module 5: Data Collection
Enhanced with Assignment Filtering
View Modes:

Admin View: All tasks, grouped by assignee
Site Manager View: Site tasks, filterable by user
Uploader View: Only assigned tasks
Auditor View: All data with audit tools

New Status Indicators:

Assigned (gray user icon)
In Progress (orange clock)
Pending Review (yellow eye)
Approved (green check)
Rejected (red X)

Module 7: Team Management
New Module for V2
User List Table Columns:

Name, Email, Role
Sites/Access Scope
Last Login
Tasks Assigned/Completed
Status (Active/Inactive)
Actions (Edit/Delete/Reset Password)

Add User Form Fields:
javascript{
  email: "required|email|unique",
  name: "required|string",
  role: "required|enum:admin,site_manager,uploader,viewer,meter_manager",
  sites: "array|required_if:role,site_manager,uploader",
  temporaryPassword: "auto_generated",
  sendWelcomeEmail: "boolean|default:true",
  permissions: {
    // Optional permission overrides
    customModuleAccess: {}
  }
}
4. Database Schema Additions for V2
sql-- User and Authentication Tables
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('super_user','admin','site_manager','uploader','viewer','meter_manager') NOT NULL,
    company_id INT REFERENCES companies(company_id),
    created_by INT REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(255)
);

-- Site Management
CREATE TABLE sites (
    site_id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(company_id),
    name VARCHAR(255) NOT NULL,
    emirate VARCHAR(100),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-Site Associations
CREATE TABLE user_sites (
    user_id INT REFERENCES users(user_id),
    site_id INT REFERENCES sites(site_id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, site_id)
);

-- Task Assignments
CREATE TABLE task_assignments (
    assignment_id SERIAL PRIMARY KEY,
    data_element_id VARCHAR(50) REFERENCES data_elements(element_id),
    site_id INT REFERENCES sites(site_id),
    assigned_to INT REFERENCES users(user_id),
    assigned_by INT REFERENCES users(user_id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date DATE,
    status ENUM('pending','in_progress','completed','overdue') DEFAULT 'pending'
);

-- Activity Logs
CREATE TABLE activity_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    action VARCHAR(100),
    module VARCHAR(50),
    details JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data Approvals
CREATE TABLE data_approvals (
    approval_id SERIAL PRIMARY KEY,
    submission_id INT REFERENCES company_data_submissions(submission_id),
    reviewed_by INT REFERENCES users(user_id),
    status ENUM('approved','rejected','pending') DEFAULT 'pending',
    comments TEXT,
    reviewed_at TIMESTAMP
);
5. API Endpoints for Multi-User System
javascript// Authentication
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/reset-password
POST   /api/auth/verify-2fa

// User Management
GET    /api/users                    // List with role-based filtering
POST   /api/users                    // Create user (hierarchical check)
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id
GET    /api/users/my-team           // Users under current user
POST   /api/users/:id/assign-sites
POST   /api/users/:id/reset-password

// Site Management
GET    /api/sites
POST   /api/sites
PUT    /api/sites/:id
DELETE /api/sites/:id
GET    /api/sites/:id/users
POST   /api/sites/:id/assign-users

// Task Assignment
GET    /api/tasks/assignments       // Get assignments based on role
POST   /api/tasks/assign            // Assign task to user
POST   /api/tasks/bulk-assign       // Bulk assignment
PUT    /api/tasks/:id/reassign
GET    /api/tasks/my-tasks          // Uploader's assigned tasks

// Data Approval Workflow
POST   /api/submissions/:id/approve
POST   /api/submissions/:id/reject
GET    /api/submissions/pending-review
6. UI/UX Enhancements for Multi-User
Navigation Changes

Role-based menu items
Site selector dropdown (for multi-site users)
User profile menu with role badge
Switch account option (if multiple roles)

Dashboard Variations

Super User: System metrics, company comparison
Admin: Company overview, site comparison
Site Manager: Site metrics, team performance
Uploader: Task queue, personal progress
Viewer: Compliance status, report shortcuts
Meter Manager: Meter health, maintenance due

New UI Components

User avatar/initials component
Role badge component
Site selector component
Task assignment dropdown
Approval workflow buttons
Activity feed component
Permission denied screens

7. Implementation Priority
Phase 1: Core Multi-User Foundation

User authentication system
Role-based access control
Super User and Admin roles
Basic user management

Phase 2: Site Management

Site creation and management
Site Manager role
Site-based data filtering
Multi-site navigation

Phase 3: Task Assignment

Task assignment interface
Uploader restricted view
Assignment notifications
Progress tracking by user

Phase 4: Operational Roles

Viewer/Auditor role
Meter Manager role
Role-specific dashboards
Permission overrides

Phase 5: Advanced Features

Approval workflows
Activity logging
Two-factor authentication
Advanced reporting by role