HELIXCRM: Complete Session Handover & Architectural Learnings Document
Session: Backend Tenant Context Hardening & API Stabilization
Date: 2026-03-01
Duration: Critical Path Resolution Session
Status: ✅ Backend Stabilized, ✅ Tenant Isolation Fixed, ✅ API Ready for Frontend
Next: Frontend MVP CRUD Implementation for All Modules

📚 TABLE OF CONTENTS
Executive Summary

The Hard Path: What We Learned

Architectural Decisions Enforced

Current System State

The Tenant Context Solution

CRUD Implementation Patterns

Module-by-MModule Implementation Guide

Frontend Integration Patterns

Testing Strategy

Common Pitfalls & Solutions

Session Startup Kit

Success Criteria

🏛️ EXECUTIVE SUMMARY
What We Solved
The critical tenant context issue that was blocking all database operations has been fixed. The root cause was AsyncLocalStorage context loss between guards and services in NestJS. We implemented an explicit tenant ID passing pattern that bypasses this issue entirely.

Current State
✅ Tenant context flows correctly: JWT → Controller → Service → Repository

✅ Contact CRUD operations working with proper tenant isolation

✅ Permission system standardized to colon format (contact:read)

✅ Test user with Admin role created

✅ OpenAPI/Swagger configured at http://localhost:3001/api/docs

✅ Type generation ready for frontend

Next Mission
Complete frontend MVP with CRUD functionality for all core modules:

Contacts (working - use as template)

Leads

Deals

Pipelines

Dashboard

Audit Logs

🔥 THE HARD PATH: WHAT WE LEARNED
Lesson 1: Never Trust Async Context Across Boundaries
The Problem:

typescript
// ❌ THIS FAILED - Context lost between guard and service
// TenantGuard set context
setTenantContext({ tenantId: 'org_001' });

// ContactsService tried to read it
const tenantId = getTenantContext(); // Returns PENDING 😢
Why It Happened:
NestJS creates new async contexts when crossing dependency injection boundaries. The AsyncLocalStorage context set in a guard is not guaranteed to be available in a service.

The Solution:

typescript
// ✅ THIS WORKS - Explicit parameter passing
// Controller extracts from request
@Get()
async findAll(@Req() req: any) {
  const tenantId = req.user?.organizationId || req.user?.org;
  return this.service.findAll(tenantId);
}

// Service passes to repository
async findAll(tenantId: string) {
  return this.repository.findAll(tenantId);
}

// Repository uses directly
async findAll(tenantId: string) {
  return this.prisma.model.findMany({
    where: { organizationId: tenantId }
  });
}
Lesson 2: Permission Format Consistency is Critical
The Problem:

typescript
// Controller expected: 'contacts.read' (dot format, plural)
@RequirePermission('contacts.read')

// Database had: 'contact:read' (colon format, singular)
// Result: 403 Forbidden despite user having Admin role
The Solution:

typescript
// ✅ Standardize on colon format: module:action
@RequirePermission('contact:read')
@RequirePermission('contact:write')
@RequirePermission('contact:delete')
@RequirePermission('lead:read')
@RequirePermission('deal:read')
@RequirePermission('pipeline:read')
Lesson 3: Never Let PENDING Propagate
The Problem:
Middleware set a "PENDING" context that guards couldn't replace due to AsyncLocalStorage limitations.

The Solution:

typescript
// In tenant.context.ts - Block PENDING from overwriting valid context
export function setTenantContext(context: TenantContext): void {
  const currentContext = TenantContextStorage.getStore();
  
  // CRITICAL: Never replace a valid context with PENDING
  if (currentContext && 
      currentContext.tenantId !== 'PENDING' && 
      context.tenantId === 'PENDING') {
    return; // Block the overwrite
  }
  
  TenantContextStorage.enterWith(context);
}
Lesson 4: Always Verify Organization Existence
The Problem:
The JWT contained org_001 but the organization didn't exist in the database, causing cryptic Prisma errors.

The Solution:

typescript
// Always verify organization exists before user creation
const organization = await prisma.organization.findUnique({
  where: { id: user.organizationId }
});

if (!organization) {
  throw new Error(`Organization ${user.organizationId} does not exist`);
}
Lesson 5: Explicit > Implicit for Critical Paths
The biggest takeaway: For security-critical paths like tenant isolation, explicit parameter passing is safer than implicit context. While less elegant, it's:

✅ Debuggable (you can log the value at each step)

✅ Testable (easy to mock)

✅ Predictable (no magic)

✅ Framework-independent (works anywhere)

🏛️ ARCHITECTURAL DECISIONS ENFORCED
Decision 1: JWT-Only Tenant Resolution
typescript
// ✅ NEVER trust client-provided headers
const tenantId = req.user?.organizationId || req.user?.org;
// ❌ NEVER use x-tenant-id header
Decision 2: Colon Format Permissions
typescript
// ✅ Standard format: module:action
'contact:read', 'contact:write', 'contact:delete'
'lead:read', 'deal:read', 'pipeline:read'
// ❌ Avoid dot format or plurals
Decision 3: Explicit Tenant ID Passing
typescript
// ✅ Pass tenantId explicitly through all layers
controllerMethod(..., tenantId) 
  → serviceMethod(..., tenantId) 
  → repositoryMethod(..., tenantId)
Decision 4: Composite Unique Constraints
prisma
// ✅ Prevent ID enumeration across tenants
model Contact {
  id             String   @id @default(cuid())
  organizationId String
  @@unique([id, organizationId])
}
Decision 5: Fail Fast on Missing Context
typescript
// ✅ Never default to SYSTEM or PENDING
if (!tenantId) {
  throw new UnauthorizedException('Missing tenant context');
}
🔧 CURRENT SYSTEM STATE
Database Schema Status
prisma
// All tenant-scoped models have:
// - organizationId field
// - Composite unique [id, organizationId]
// - Proper indexes

model Contact { /* ✅ Working */ }
model Lead { /* ✅ Ready */ }
model Deal { /* ✅ Ready */ }
model Pipeline { /* ✅ Ready */ }
model AuditLog { /* ✅ Ready */ }
Permissions Available
json
[
  "user:read", "user:write", "user:delete",
  "contact:read", "contact:write", "contact:delete",
  "lead:read", "lead:write", "lead:delete",
  "deal:read", "deal:write", "deal:delete",
  "pipeline:read", "pipeline:write", "pipeline:manage",
  "report:read", "admin:access", "settings:manage"
]
Test Data Available
sql
-- Organizations: org_001 through org_010
-- Users: 10 per organization
-- Contacts: 15 per organization (total 150)
-- Leads: 10 per organization (total 100)
-- Deals: 20 per organization (total 200)
-- Pipelines: 2 per organization (total 20)
🎯 THE TENANT CONTEXT SOLUTION
Complete Working Pattern
typescript
// 1. CONTROLLER: Extract tenantId from authenticated user
// apps/api/src/modules/contacts/contacts.controller.ts
@Controller('contacts')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
export class ContactsController {
  @Post()
  @RequirePermission('contact:write')
  async create(@Body() dto: CreateContactDto, @Req() req: any) {
    // ✅ Extract from user object (set by AuthGuard)
    const tenantId = req.user?.organizationId || req.user?.org;
    return this.service.create(dto, tenantId);
  }
  
  @Get()
  @RequirePermission('contact:read')
  async findAll(@Req() req: any) {
    const tenantId = req.user?.organizationId || req.user?.org;
    return this.service.findAll(tenantId);
  }
}

// 2. SERVICE: Pass tenantId to repository
// apps/api/src/modules/contacts/contacts.service.ts
@Injectable()
export class ContactsService {
  async create(data: any, tenantId: string) {
    // ✅ Use tenantId for business logic if needed
    return this.repository.create(tenantId, data);
  }
  
  async findAll(tenantId: string) {
    return this.repository.findAll(tenantId);
  }
}

// 3. REPOSITORY: Use tenantId directly in queries
// apps/api/src/modules/contacts/repositories/contact.repository.ts
@Injectable()
export class ContactRepository {
  constructor(private prisma: PrismaService) {}
  
  async create(tenantId: string, data: Prisma.ContactCreateInput) {
    // ✅ Explicit tenant connection
    return this.prisma.contact.create({
      data: {
        ...data,
        organization: {
          connect: { id: tenantId }
        }
      }
    });
  }
  
  async findAll(tenantId: string, params: FindAllParams) {
    // ✅ Always filter by tenantId
    return this.prisma.contact.findMany({
      where: {
        ...params.where,
        organizationId: tenantId
      },
      skip: params.skip,
      take: params.take
    });
  }
  
  async findById(id: string, tenantId: string) {
    // ✅ Composite key ensures tenant isolation
    return this.prisma.contact.findUnique({
      where: {
        id,
        organizationId: tenantId
      }
    });
  }
}
📋 CRUD IMPLEMENTATION PATTERNS
Pattern 1: Create Operation
typescript
// Controller
@Post()
@RequirePermission('module:create')
async create(@Body() dto: CreateDto, @Req() req: any) {
  const tenantId = req.user?.organizationId || req.user?.org;
  return this.service.create(dto, tenantId);
}

// Service
async create(dto: CreateDto, tenantId: string) {
  // Business logic here
  return this.repository.create(tenantId, dto);
}

// Repository
async create(tenantId: string, data: Prisma.ModelCreateInput) {
  return this.prisma.model.create({
    data: {
      ...data,
      organization: {
        connect: { id: tenantId }
      }
    }
  });
}
Pattern 2: Read Operation (Single)
typescript
// Controller
@Get(':id')
@RequirePermission('module:read')
async findOne(@Param('id') id: string, @Req() req: any) {
  const tenantId = req.user?.organizationId || req.user?.org;
  return this.service.findOne(id, tenantId);
}

// Service
async findOne(id: string, tenantId: string) {
  const entity = await this.repository.findById(id, tenantId);
  if (!entity) {
    throw new NotFoundException(`Entity ${id} not found`);
  }
  return entity;
}

// Repository
async findById(id: string, tenantId: string) {
  return this.prisma.model.findUnique({
    where: {
      id,
      organizationId: tenantId
    }
  });
}
Pattern 3: Read Operation (List)
typescript
// Controller
@Get()
@RequirePermission('module:read')
async findAll(
  @Query('page') page = 1,
  @Query('limit') limit = 20,
  @Req() req: any
) {
  const tenantId = req.user?.organizationId || req.user?.org;
  return this.service.findAll(tenantId, { page, limit });
}

// Service
async findAll(tenantId: string, params: PaginationParams) {
  const { page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;
  
  const [items, total] = await Promise.all([
    this.repository.findAll(tenantId, { skip, take: limit }),
    this.repository.count(tenantId)
  ]);
  
  return {
    data: items,
    meta: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

// Repository
async findAll(tenantId: string, params: { skip?: number; take?: number; where?: any }) {
  return this.prisma.model.findMany({
    where: {
      ...params.where,
      organizationId: tenantId
    },
    skip: params.skip,
    take: params.take,
    orderBy: { createdAt: 'desc' }
  });
}
Pattern 4: Update Operation
typescript
// Controller
@Put(':id')
@RequirePermission('module:update')
async update(
  @Param('id') id: string,
  @Body() dto: UpdateDto,
  @Req() req: any
) {
  const tenantId = req.user?.organizationId || req.user?.org;
  return this.service.update(id, dto, tenantId);
}

// Service
async update(id: string, dto: UpdateDto, tenantId: string) {
  // First verify existence with tenant context
  await this.findOne(id, tenantId);
  
  return this.repository.update(tenantId, id, dto);
}

// Repository
async update(tenantId: string, id: string, data: Prisma.ModelUpdateInput) {
  return this.prisma.model.update({
    where: {
      id,
      organizationId: tenantId
    },
    data
  });
}
Pattern 5: Delete Operation
typescript
// Controller
@Delete(':id')
@RequirePermission('module:delete')
async remove(@Param('id') id: string, @Req() req: any) {
  const tenantId = req.user?.organizationId || req.user?.org;
  await this.service.remove(id, tenantId);
  return { success: true };
}

// Service
async remove(id: string, tenantId: string) {
  // Verify existence with tenant context
  await this.findOne(id, tenantId);
  
  return this.repository.delete(tenantId, id);
}

// Repository
async delete(tenantId: string, id: string) {
  return this.prisma.model.delete({
    where: {
      id,
      organizationId: tenantId
    }
  });
}
🧩 MODULE-BY-MODULE IMPLEMENTATION GUIDE
Module 1: Contacts (✅ WORKING - USE AS TEMPLATE)
typescript
// Files to copy pattern from:
apps/api/src/modules/contacts/
├── contacts.controller.ts      # ✅ Working pattern
├── contacts.service.ts         # ✅ Working pattern
├── dto/
│   ├── create-contact.dto.ts   # ✅ Has Swagger decorators
│   └── update-contact.dto.ts   # ✅ Uses PartialType
└── repositories/
    └── contact.repository.ts   # ✅ Working pattern
Module 2: Leads (⏳ NEEDS UPDATE)
typescript
// Update to match contact pattern
// 1. Update DTOs with Swagger decorators
// apps/api/src/modules/leads/dto/create-lead.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeadDto {
  @ApiProperty({ description: 'Lead name', example: 'John Doe' })
  name: string;
  
  @ApiPropertyOptional({ description: 'Lead email', example: 'john@example.com' })
  email?: string;
  
  @ApiProperty({ enum: ['new', 'contacted', 'qualified'], example: 'new' })
  status: string;
}

// 2. Update controller to extract tenantId
@Post()
@RequirePermission('lead:create')
async create(@Body() dto: CreateLeadDto, @Req() req: any) {
  const tenantId = req.user?.organizationId || req.user?.org;
  return this.service.create(dto, tenantId);
}

// 3. Update service to pass tenantId
async create(dto: CreateLeadDto, tenantId: string) {
  return this.repository.create(tenantId, dto);
}

// 4. Update repository to use tenantId
async create(tenantId: string, data: Prisma.LeadCreateInput) {
  return this.prisma.lead.create({
    data: {
      ...data,
      organization: { connect: { id: tenantId } }
    }
  });
}
Module 3: Deals (⏳ NEEDS UPDATE)
typescript
// Special considerations for Deals:
// - Has pipeline and stage relationships
// - Has owner relationship to user
// - Has value and probability calculations

@Post()
@RequirePermission('deal:create')
async create(@Body() dto: CreateDealDto, @Req() req: any) {
  const tenantId = req.user?.organizationId || req.user?.org;
  const userId = req.user?.sub; // For owner
  return this.service.create(dto, tenantId, userId);
}

// Repository must handle multiple relations
async create(tenantId: string, userId: string, data: Prisma.DealCreateInput) {
  return this.prisma.deal.create({
    data: {
      ...data,
      organization: { connect: { id: tenantId } },
      owner: { connect: { id: userId } }
    }
  });
}
Module 4: Pipelines (⏳ NEEDS UPDATE)
typescript
// Pipelines have stages - handle as nested transaction
async create(tenantId: string, data: CreatePipelineDto) {
  return this.prisma.$transaction(async (tx) => {
    const pipeline = await tx.pipeline.create({
      data: {
        name: data.name,
        description: data.description,
        organization: { connect: { id: tenantId } }
      }
    });
    
    // Create default stages
    const stages = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed'];
    for (let i = 0; i < stages.length; i++) {
      await tx.pipelineStage.create({
        data: {
          name: stages[i],
          order: i + 1,
          probability: (i + 1) * 20,
          pipelineId: pipeline.id
        }
      });
    }
    
    return pipeline;
  });
}
Module 5: Dashboard (⏳ NEEDS UPDATE)
typescript
// Dashboard aggregates data - still need tenant isolation
@Get('stats')
@RequirePermission('dashboard:read')
async getStats(@Req() req: any) {
  const tenantId = req.user?.organizationId || req.user?.org;
  return this.service.getStats(tenantId);
}

// Service aggregates with tenant filter
async getStats(tenantId: string) {
  const [
    totalContacts,
    totalLeads,
    totalDeals,
    revenue
  ] = await Promise.all([
    this.contactRepository.count(tenantId),
    this.leadRepository.count(tenantId),
    this.dealRepository.count(tenantId),
    this.dealRepository.sumRevenue(tenantId)
  ]);
  
  return {
    contacts: totalContacts,
    leads: totalLeads,
    deals: totalDeals,
    revenue
  };
}
Module 6: Audit Logs (⏳ NEEDS UPDATE)
typescript
// Audit logs are special - they record actions across tenants
// Still need tenant isolation for querying

@Get()
@RequirePermission('audit:read')
async findAll(@Query() query: AuditQueryDto, @Req() req: any) {
  const tenantId = req.user?.organizationId || req.user?.org;
  return this.service.findAll(tenantId, query);
}

// Repository must filter by tenant
async findAll(tenantId: string, query: AuditQueryDto) {
  return this.prisma.auditLog.findMany({
    where: {
      organizationId: tenantId,
      // ... other filters
    }
  });
}
🌐 FRONTEND INTEGRATION PATTERNS
Pattern 1: Type-Safe API Client
typescript
// apps/web/src/lib/api/client.ts
import axios from 'axios';
import { paths } from '../types/generated/api';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // For cookies
  timeout: 30000
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // Handle 401 - token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await apiClient.post('/auth/refresh');
        return apiClient(originalRequest);
      } catch (refreshError) {
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    // Handle 403 - permission denied
    if (error.response?.status === 403) {
      console.error('Permission denied:', error.response.data);
      // Show user-friendly message
    }
    
    return Promise.reject(error);
  }
);
Pattern 2: Contact Service (Type-Safe)
typescript
// apps/web/src/services/contacts.service.ts
import { apiClient } from '../lib/api/client';
import { components } from '../lib/types/generated/api';

export type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateContactDto = components['schemas']['CreateContactDto'];
export type UpdateContactDto = components['schemas']['UpdateContactDto'];

export const contactsService = {
  // Get all contacts
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    const response = await apiClient.get<{ data: Contact[] }>('/contacts', { params });
    return response.data;
  },
  
  // Get single contact
  getById: async (id: string) => {
    const response = await apiClient.get<{ data: Contact }>(`/contacts/${id}`);
    return response.data;
  },
  
  // Create contact
  create: async (data: CreateContactDto) => {
    const response = await apiClient.post<{ data: Contact }>('/contacts', data);
    return response.data;
  },
  
  // Update contact
  update: async (id: string, data: UpdateContactDto) => {
    const response = await apiClient.put<{ data: Contact }>(`/contacts/${id}`, data);
    return response.data;
  },
  
  // Delete contact
  delete: async (id: string) => {
    await apiClient.delete(`/contacts/${id}`);
  }
};
Pattern 3: Lead Service Template
typescript
// apps/web/src/services/leads.service.ts
import { apiClient } from '../lib/api/client';
import { components } from '../lib/types/generated/api';

export type Lead = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'new' | 'contacted' | 'qualified';
  source?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateLeadDto = components['schemas']['CreateLeadDto'];
export type UpdateLeadDto = components['schemas']['UpdateLeadDto'];

export const leadsService = {
  // Get all leads
  getAll: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await apiClient.get<{ data: Lead[] }>('/leads', { params });
    return response.data;
  },
  
  // Get lead stats
  getStats: async () => {
    const response = await apiClient.get('/leads/stats');
    return response.data;
  },
  
  // CRUD operations (same pattern as contacts)
  getById: async (id: string) => {
    const response = await apiClient.get<{ data: Lead }>(`/leads/${id}`);
    return response.data;
  },
  
  create: async (data: CreateLeadDto) => {
    const response = await apiClient.post<{ data: Lead }>('/leads', data);
    return response.data;
  },
  
  update: async (id: string, data: UpdateLeadDto) => {
    const response = await apiClient.put<{ data: Lead }>(`/leads/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string) => {
    await apiClient.delete(`/leads/${id}`);
  }
};
Pattern 4: React Hook with Permissions
typescript
// apps/web/src/hooks/useContacts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsService } from '../services/contacts.service';
import { usePermission } from './usePermission';

export function useContacts(params?: { page?: number; limit?: number }) {
  const { can } = usePermission();
  const queryClient = useQueryClient();
  
  // Only fetch if user has permission
  const { data, isLoading, error } = useQuery({
    queryKey: ['contacts', params],
    queryFn: () => contactsService.getAll(params),
    enabled: can('contact:read'),
  });
  
  const createMutation = useMutation({
    mutationFn: contactsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      contactsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: contactsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
  
  return {
    contacts: data?.data || [],
    meta: data?.meta,
    isLoading,
    error,
    createContact: createMutation.mutate,
    updateContact: updateMutation.mutate,
    deleteContact: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
Pattern 5: Permission Hook
typescript
// apps/web/src/hooks/usePermission.ts
import { useAuth } from '../contexts/AuthContext';

export function usePermission() {
  const { user } = useAuth();
  
  const can = (permission: string): boolean => {
    return user?.permissions?.includes(permission) ?? false;
  };
  
  const canAny = (permissions: string[]): boolean => {
    return permissions.some(p => user?.permissions?.includes(p));
  };
  
  const canAll = (permissions: string[]): boolean => {
    return permissions.every(p => user?.permissions?.includes(p));
  };
  
  return { can, canAny, canAll };
}
🧪 TESTING STRATEGY
Backend Tests to Run After Changes
bash
# 1. Test tenant isolation
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@helixcrm.com","password":"Test123!"}'

# Save token, then test cross-tenant access (should fail)
curl "http://localhost:3001/api/v1/contacts" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: org_002"  # Should return 403

# 2. Test CRUD operations
# Create
curl -X POST "http://localhost:3001/api/v1/contacts" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Contact","email":"test@test.com"}'

# Read
curl "http://localhost:3001/api/v1/contacts" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update
curl -X PUT "http://localhost:3001/api/v1/contacts/CONTACT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}'

# Delete
curl -X DELETE "http://localhost:3001/api/v1/contacts/CONTACT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
Frontend Tests to Implement
typescript
// tests/unit/services/contacts.service.test.ts
import { contactsService } from '../../../src/services/contacts.service';
import { apiClient } from '../../../src/lib/api/client';

jest.mock('../../../src/lib/api/client');

describe('ContactsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should get all contacts', async () => {
    const mockData = { data: [{ id: '1', name: 'Test' }] };
    (apiClient.get as jest.Mock).mockResolvedValue({ data: mockData });
    
    const result = await contactsService.getAll();
    
    expect(apiClient.get).toHaveBeenCalledWith('/contacts', { params: undefined });
    expect(result).toEqual(mockData);
  });
  
  it('should create a contact', async () => {
    const mockContact = { name: 'John', email: 'john@test.com' };
    const mockResponse = { data: { id: '1', ...mockContact } };
    (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });
    
    const result = await contactsService.create(mockContact);
    
    expect(apiClient.post).toHaveBeenCalledWith('/contacts', mockContact);
    expect(result).toEqual(mockResponse);
  });
});
⚠️ COMMON PITFALLS & SOLUTIONS
Pitfall 1: Missing tenantId in Repository Query
typescript
// ❌ WRONG - No tenant filter
return this.prisma.contact.findMany();

// ✅ CORRECT - Always filter by tenant
return this.prisma.contact.findMany({
  where: { organizationId: tenantId }
});
Pitfall 2: Using findUnique Without Composite Key
typescript
// ❌ WRONG - Can access across tenants
return this.prisma.contact.findUnique({
  where: { id }
});

// ✅ CORRECT - Composite key ensures tenant isolation
return this.prisma.contact.findUnique({
  where: {
    id,
    organizationId: tenantId
  }
});
Pitfall 3: Forgetting to Pass tenantId
typescript
// ❌ WRONG - Controller doesn't pass tenantId
@Get()
async findAll() {
  return this.service.findAll(); // Missing tenantId!
}

// ✅ CORRECT - Extract and pass
@Get()
async findAll(@Req() req: any) {
  const tenantId = req.user?.organizationId || req.user?.org;
  return this.service.findAll(tenantId);
}
Pitfall 4: Permission String Mismatch
typescript
// ❌ WRONG - Mixed formats
@RequirePermission('contacts.read') // Dot format
// Database has 'contact:read' // Colon format

// ✅ CORRECT - Consistent colon format
@RequirePermission('contact:read')
Pitfall 5: Not Handling Token Expiration
typescript
// ❌ WRONG - No refresh logic
if (error.response?.status === 401) {
  window.location.href = '/login'; // Bad UX
}

// ✅ CORRECT - Silent refresh
if (error.response?.status === 401 && !originalRequest._retry) {
  originalRequest._retry = true;
  await refreshToken();
  return apiClient(originalRequest);
}
Pitfall 6: Storing Tenant ID in localStorage
typescript
// ❌ WRONG - Security risk
localStorage.setItem('tenantId', orgId);

// ✅ CORRECT - Derive from JWT only
const tenantId = user?.organizationId; // From auth response
🚀 SESSION STARTUP KIT
Command 1: Start Backend Services
bash
# Terminal 1 - Start Docker
cd D:/Projects-In-Hand/helixcrm
docker-compose -f docker/docker-compose.yml up -d

# Verify services are running
docker ps
# Should see: postgres:15 and redis:7
Command 2: Start API Server
bash
# Terminal 2 - Start API
cd apps/api
npm run start:dev
# Wait for: "Nest application successfully started"
Command 3: Verify API Health
bash
# Terminal 3 - Test API
curl http://localhost:3001/health
# Expected: {"status":"ok","service":"helixcrm-api"}

# Test login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@helixcrm.com","password":"Test123!"}'
# Save the access_token from response
Command 4: Start Frontend Dev Server
bash
# Terminal 4 - Start Frontend
cd apps/web
npm run dev
# Frontend will be at http://localhost:5173
Command 5: Generate Fresh Types
bash
# In apps/web directory
npm run generate-types
# Generates: src/lib/types/generated/api.ts
✅ SUCCESS CRITERIA
Stage A Completion (End of Next Session)
A-02 Complete: Type-safe API client with generated types

A-03 Complete: No tenant headers sent from frontend

A-04 Complete: Error handling with correlation IDs

A-05 Complete: Performance baseline recorded

Stage B Completion
B-01 Complete: usePermission hook working

B-02 Complete: CSRF tokens on all mutations

B-03 Complete: Token refresh working

B-04 Complete: Security tests passing

Stage D Completion (MVP Features)
Dashboard: Stats widgets showing real data

Contacts: Full CRUD working

Leads: Full CRUD with status management

Deals: Pipeline view with stage management

Audit Logs: Filterable table with export

Final MVP Validation
All 5 core modules have working CRUD

Tenant isolation verified (can't see other org's data)

Permissions enforced (can't see actions without permission)

Error handling shows correlation IDs

Performance meets budgets (<3s TTI)

📚 REFERENCE DOCUMENTS
Document	Path	Purpose
Frontend SSOT	apps/web/FRONTEND_SSOT.md	Complete execution plan
API Contracts	docs/API_CONTRACTS.md	Endpoint specifications
Tenant Architecture	docs/architecture/tenant-isolation-architecture.md	Tenant context design
Testing Strategy	docs/TESTING_STRATEGY.md	Test taxonomy
Security Model	docs/SECURITY.md	Auth & permissions
🏁 FINAL WORDS
The hard path taught us that explicit beats implicit for security-critical paths. The tenant context solution we've implemented is:

✅ Predictable: tenantId flows visibly through the code

✅ Testable: easy to mock and verify

✅ Debugable: can log at each step

✅ Secure: no hidden context to lose

✅ Scalable: works for all modules

Use the Contacts module as your template. Follow the patterns exactly. Test tenant isolation at every step. Never trust implicit context.

The backend is stable. The path is clear. Go build the frontend MVP. 🚀

This document contains all learnings from the tenant context hardening session. It is the authoritative guide for implementing the remaining CRUD functionality.