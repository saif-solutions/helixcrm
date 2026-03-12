import { Test } from '@nestjs/testing';
import { ContactsController } from '@api/modules/contacts/contacts.controller';
import { ContactsService } from '@api/modules/contacts/contacts.service';

// Mock the guards
jest.mock('@api/shared/guards/auth.guard', () => ({
  AuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

jest.mock('@api/shared/guards/tenant.guard', () => ({
  TenantGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

jest.mock('@api/shared/guards/permission.guard', () => ({
  PermissionGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

// Mock service
const mockContactsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const mockRequest = {
  user: { sub: 'user-123', organizationId: 'org-123', org: 'org-123' },
};

describe('ContactsController', () => {
  let controller: ContactsController;

  const createController = async () => {
    const module = await Test.createTestingModule({
      controllers: [ContactsController],
      providers: [{ provide: ContactsService, useValue: mockContactsService }],
    }).compile();

    return module.get<ContactsController>(ContactsController);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    controller = await createController();
  });

  describe('create', () => {
    const createContactDto = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890',
      company: 'Acme Inc',
      position: 'Manager',
    };

    const mockResult = {
      id: 'contact-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '1234567890',
      company: 'Acme Inc',
      title: 'Manager',
    };

    it('should successfully create a contact', async () => {
      mockContactsService.create.mockResolvedValue(mockResult);

      const result = await controller.create(createContactDto, mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(mockContactsService.create).toHaveBeenCalledWith(createContactDto, 'org-123');
    });
  });

  describe('findAll', () => {
    const mockResult = {
      data: [
        { id: 'contact-1', firstName: 'John', lastName: 'Doe' },
        { id: 'contact-2', firstName: 'Jane', lastName: 'Smith' },
      ],
      meta: { page: 1, limit: 20, total: 2, pages: 1 },
    };

    it('should return paginated contacts with default params', async () => {
      mockContactsService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(1, 20, '', mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(mockContactsService.findAll).toHaveBeenCalledWith(
        { page: 1, limit: 20, search: '' },
        'org-123',
      );
    });

    it('should return paginated contacts with all params', async () => {
      mockContactsService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(2, 50, 'john', mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(mockContactsService.findAll).toHaveBeenCalledWith(
        { page: 2, limit: 50, search: 'john' },
        'org-123',
      );
    });
  });

  describe('findOne', () => {
    const contactId = 'contact-123';
    const mockContact = {
      id: contactId,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    };

    it('should return a contact by id', async () => {
      mockContactsService.findOne.mockResolvedValue(mockContact);

      const result = await controller.findOne(contactId, mockRequest as any);

      expect(result).toEqual(mockContact);
      expect(mockContactsService.findOne).toHaveBeenCalledWith(contactId, 'org-123');
    });
  });

  describe('update', () => {
    const contactId = 'contact-123';
    const updateContactDto = {
      name: 'John Updated',
      email: 'john.updated@example.com',
      phone: '9876543210',
    };
    const mockResult = {
      id: contactId,
      firstName: 'John',
      lastName: 'Updated',
      email: 'john.updated@example.com',
      phone: '9876543210',
    };

    it('should successfully update a contact', async () => {
      mockContactsService.update.mockResolvedValue(mockResult);

      const result = await controller.update(contactId, updateContactDto, mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(mockContactsService.update).toHaveBeenCalledWith(
        contactId,
        updateContactDto,
        'org-123',
      );
    });
  });

  describe('remove', () => {
    const contactId = 'contact-123';
    const mockResult = { message: 'Contact deleted successfully' };

    it('should successfully delete a contact', async () => {
      mockContactsService.remove.mockResolvedValue(mockResult);

      const result = await controller.remove(contactId, mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(mockContactsService.remove).toHaveBeenCalledWith(contactId, 'org-123');
    });
  });
});
