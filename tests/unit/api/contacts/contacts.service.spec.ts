import { Test, TestingModule } from '@nestjs/testing';
import { ContactsService } from '@api/modules/contacts/contacts.service';
import { ContactRepository } from '@api/modules/contacts/repositories/contact.repository';
import { PermissionContextService } from '@api/shared/permissions/context/permission-context.service';
import { NotFoundException } from '@nestjs/common';

// Mock implementations
const mockContactRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  softDelete: jest.fn(),
  search: jest.fn(),
  findByEmail: jest.fn(),
};

const mockPermissionContext = {
  hasPermission: jest.fn().mockReturnValue(true),
};

// Complete mock contact data - updated to match actual Prisma schema
const createMockContact = (overrides = {}) => ({
  id: 'contact-123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  company: 'Acme Inc',
  title: 'Manager',
  department: 'Sales',
  organizationId: 'org-123',
  accountId: null,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  deletedBy: null,
  ...overrides,
});

describe('ContactsService', () => {
  let service: ContactsService;
  let contactRepository: typeof mockContactRepository;
  let permissionContext: typeof mockPermissionContext;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: ContactRepository, useValue: mockContactRepository },
        { provide: PermissionContextService, useValue: mockPermissionContext },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
    contactRepository = module.get(ContactRepository);
    permissionContext = module.get(PermissionContextService);
  });

  describe('create', () => {
    const createDto = {
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+9876543210',
      company: 'Beta Corp',
      position: 'Director',
    };

    const mockContact = createMockContact({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      phone: '+9876543210',
      company: 'Beta Corp',
      title: 'Director',
    });

    it('should successfully create a contact', async () => {
      contactRepository.create.mockResolvedValue(mockContact);

      const result = await service.create(createDto, 'org-123');

      expect(result).toEqual(mockContact);
      expect(contactRepository.create).toHaveBeenCalledWith('org-123', {
        email: 'jane@example.com',
        phone: '+9876543210',
        company: 'Beta Corp',
        position: 'Director', // Change from 'title' to 'position'
        firstName: 'Jane',
        lastName: 'Smith',
      });
    });

    it('should handle name with multiple parts', async () => {
      const dtoWithLongName = { ...createDto, name: 'Jane Marie Smith' };
      const expectedContact = createMockContact({
        firstName: 'Jane',
        lastName: 'Marie Smith',
        email: 'jane@example.com',
        phone: '+9876543210',
        company: 'Beta Corp',
        title: 'Director',
      });
      contactRepository.create.mockResolvedValue(expectedContact);

      await service.create(dtoWithLongName, 'org-123');

      expect(contactRepository.create).toHaveBeenCalledWith('org-123', {
        email: 'jane@example.com',
        phone: '+9876543210',
        company: 'Beta Corp',
        position: 'Director', // Change from 'title' to 'position'
        firstName: 'Jane',
        lastName: 'Marie Smith',
      });
    });

    it('should handle name with single part', async () => {
      const dtoWithSingleName = { ...createDto, name: 'Jane' };
      const expectedContact = createMockContact({
        firstName: 'Jane',
        lastName: '',
        email: 'jane@example.com',
        phone: '+9876543210',
        company: 'Beta Corp',
        title: 'Director',
      });
      contactRepository.create.mockResolvedValue(expectedContact);

      await service.create(dtoWithSingleName, 'org-123');

      expect(contactRepository.create).toHaveBeenCalledWith('org-123', {
        email: 'jane@example.com',
        phone: '+9876543210',
        company: 'Beta Corp',
        position: 'Director', // Change from 'title' to 'position'
        firstName: 'Jane',
        lastName: '',
      });
    });

    it('should check permission before creating', async () => {
      contactRepository.create.mockResolvedValue(mockContact);

      await service.create(createDto, 'org-123');

      expect(permissionContext.hasPermission).toHaveBeenCalledWith('contact:write');
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');
      contactRepository.create.mockRejectedValue(error);

      await expect(service.create(createDto, 'org-123')).rejects.toThrow('Database error');
    });
  });

  describe('findAll', () => {
    const mockContacts = [
      createMockContact({ id: 'contact-1', firstName: 'John' }),
      createMockContact({ id: 'contact-2', firstName: 'Jane' }),
    ];

    it('should return paginated contacts', async () => {
      contactRepository.findAll.mockResolvedValue(mockContacts);
      contactRepository.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 10 }, 'org-123');

      expect(result).toEqual({
        data: mockContacts,
        meta: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
        },
      });
    });

    it('should apply search filter', async () => {
      const options = { page: 1, limit: 10, search: 'john' };
      contactRepository.findAll.mockResolvedValue([]);
      contactRepository.count.mockResolvedValue(0);

      await service.findAll(options, 'org-123');

      expect(contactRepository.findAll).toHaveBeenCalledWith('org-123', {
        where: {
          OR: [
            { firstName: { contains: 'john', mode: 'insensitive' } },
            { lastName: { contains: 'john', mode: 'insensitive' } },
            { email: { contains: 'john', mode: 'insensitive' } },
            { phone: { contains: 'john', mode: 'insensitive' } },
            { company: { contains: 'john', mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should check permission before fetching', async () => {
      contactRepository.findAll.mockResolvedValue([]);
      contactRepository.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10 }, 'org-123');

      expect(permissionContext.hasPermission).toHaveBeenCalledWith('contact:read');
    });
  });

  describe('findOne', () => {
    const mockContact = createMockContact();

    it('should return contact if found', async () => {
      contactRepository.findById.mockResolvedValue(mockContact);

      const result = await service.findOne('contact-123', 'org-123');

      expect(result).toEqual(mockContact);
      expect(contactRepository.findById).toHaveBeenCalledWith('contact-123', 'org-123');
    });

    it('should throw NotFoundException if contact not found', async () => {
      contactRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('contact-123', 'org-123')).rejects.toThrow('Contact contact-123 not found');
    });

    it('should check permission before fetching', async () => {
      contactRepository.findById.mockResolvedValue(mockContact);

      await service.findOne('contact-123', 'org-123');

      expect(permissionContext.hasPermission).toHaveBeenCalledWith('contact:read');
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'John Updated',
      email: 'john.updated@example.com',
      phone: '+1112223333',
      company: 'Updated Corp',
    };

    const existingContact = createMockContact();
    const updatedContact = createMockContact({
      firstName: 'John',
      lastName: 'Updated',
      email: 'john.updated@example.com',
      phone: '+1112223333',
      company: 'Updated Corp',
    });

    beforeEach(() => {
      jest.spyOn(service, 'findOne').mockResolvedValue(existingContact);
    });

    it('should successfully update a contact', async () => {
      contactRepository.update.mockResolvedValue(updatedContact);

      const result = await service.update('contact-123', updateDto, 'org-123');

      expect(result).toEqual(updatedContact);
      expect(service.findOne).toHaveBeenCalledWith('contact-123', 'org-123');
      expect(contactRepository.update).toHaveBeenCalledWith('org-123', {
        where: { id: 'contact-123' },
        data: {
          email: 'john.updated@example.com',
          phone: '+1112223333',
          company: 'Updated Corp',
          firstName: 'John',
          lastName: 'Updated',
        },
      });
    });

    it('should handle name change correctly', async () => {
      const nameUpdateDto = { name: 'Jane Smith' };
      const expectedContact = createMockContact({
        firstName: 'Jane',
        lastName: 'Smith',
      });
      contactRepository.update.mockResolvedValue(expectedContact);

      await service.update('contact-123', nameUpdateDto, 'org-123');

      expect(contactRepository.update).toHaveBeenCalledWith('org-123', {
        where: { id: 'contact-123' },
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
        },
      });
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { phone: '+9998887777' };
      const expectedContact = { ...existingContact, phone: '+9998887777' };
      contactRepository.update.mockResolvedValue(expectedContact);

      await service.update('contact-123', partialUpdate, 'org-123');

      expect(contactRepository.update).toHaveBeenCalledWith('org-123', {
        where: { id: 'contact-123' },
        data: {
          phone: '+9998887777',
        },
      });
    });

    it('should check permission before updating', async () => {
      contactRepository.update.mockResolvedValue(updatedContact);

      await service.update('contact-123', updateDto, 'org-123');

      expect(permissionContext.hasPermission).toHaveBeenCalledWith('contact:write');
    });

    it('should throw NotFoundException if contact not found', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException());

      await expect(service.update('contact-123', updateDto, 'org-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    const mockContact = createMockContact();

    beforeEach(() => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockContact);
    });

    it('should successfully delete a contact', async () => {
      contactRepository.delete.mockResolvedValue(mockContact);

      const result = await service.remove('contact-123', 'org-123');

      expect(result).toEqual(mockContact);
      expect(service.findOne).toHaveBeenCalledWith('contact-123', 'org-123');
      expect(contactRepository.delete).toHaveBeenCalledWith('org-123', { id: 'contact-123' });
    });

    it('should check permission before deleting', async () => {
      contactRepository.delete.mockResolvedValue(mockContact);

      await service.remove('contact-123', 'org-123');

      expect(permissionContext.hasPermission).toHaveBeenCalledWith('contact:delete');
    });

    it('should throw NotFoundException if contact not found', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException());

      await expect(service.remove('contact-123', 'org-123')).rejects.toThrow(NotFoundException);
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');
      contactRepository.delete.mockRejectedValue(error);

      await expect(service.remove('contact-123', 'org-123')).rejects.toThrow('Database error');
    });
  });
});
