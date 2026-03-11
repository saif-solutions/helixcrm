import { Test, TestingModule } from '@nestjs/testing';
import { EmailTemplatesController } from '../../../src/modules/email-templates/email-templates.controller';
import { EmailTemplatesService } from '../../../src/modules/email-templates/email-templates.service';

// Mock the guards
jest.mock('../../../src/shared/guards/auth.guard', () => ({
  AuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

jest.mock('../../../src/shared/guards/tenant.guard', () => ({
  TenantGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

jest.mock('../../../src/shared/guards/permission.guard', () => ({
  PermissionGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

// Mock service
const mockEmailTemplatesService = {
  createEmailTemplate: jest.fn(),
  getAllEmailTemplates: jest.fn(),
  getEmailTemplateById: jest.fn(),
  updateEmailTemplate: jest.fn(),
  deleteEmailTemplate: jest.fn(),
  renderTemplate: jest.fn(),
  sendEmail: jest.fn(),
};

describe('EmailTemplatesController', () => {
  let controller: EmailTemplatesController;
  let emailTemplatesService: typeof mockEmailTemplatesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailTemplatesController],
      providers: [
        { provide: EmailTemplatesService, useValue: mockEmailTemplatesService },
      ],
    }).compile();

    controller = module.get<EmailTemplatesController>(EmailTemplatesController);
    emailTemplatesService = module.get(EmailTemplatesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createEmailTemplate', () => {
    const createDto = {
      name: 'Welcome Email',
      subject: 'Welcome to our platform!',
      body: '<h1>Welcome {{firstName}}!</h1>',
      bodyText: 'Welcome {{firstName}}!',
      category: 'welcome',
      variables: ['firstName', 'lastName'],
      isActive: true,
    };

    const mockResult = { id: 'template-123', ...createDto };

    it('should successfully create an email template', async () => {
      emailTemplatesService.createEmailTemplate.mockResolvedValue(mockResult);

      const result = await controller.createEmailTemplate(createDto);

      expect(result).toEqual(mockResult);
      expect(emailTemplatesService.createEmailTemplate).toHaveBeenCalledWith(createDto);
    });
  });

  describe('getAllEmailTemplates', () => {
    const mockTemplates = {
      data: [
        { id: 'template-1', name: 'Welcome Email', category: 'welcome' },
        { id: 'template-2', name: 'Invoice Email', category: 'invoice' },
      ],
      meta: { page: 1, limit: 20, total: 2, pages: 1 },
    };

    it('should return all templates with default params', async () => {
      emailTemplatesService.getAllEmailTemplates.mockResolvedValue(mockTemplates);

      const result = await controller.getAllEmailTemplates(undefined, undefined, 1, 20);

      expect(result).toEqual(mockTemplates);
      expect(emailTemplatesService.getAllEmailTemplates).toHaveBeenCalledWith({
        category: undefined,
        isActive: undefined,
        page: 1,
        limit: 20,
      });
    });

    it('should filter by category', async () => {
      emailTemplatesService.getAllEmailTemplates.mockResolvedValue(mockTemplates);

      await controller.getAllEmailTemplates('welcome', undefined, 1, 20);

      expect(emailTemplatesService.getAllEmailTemplates).toHaveBeenCalledWith({
        category: 'welcome',
        isActive: undefined,
        page: 1,
        limit: 20,
      });
    });

    it('should filter by active status', async () => {
      emailTemplatesService.getAllEmailTemplates.mockResolvedValue(mockTemplates);

      await controller.getAllEmailTemplates(undefined, true, 1, 20);

      expect(emailTemplatesService.getAllEmailTemplates).toHaveBeenCalledWith({
        category: undefined,
        isActive: true,
        page: 1,
        limit: 20,
      });
    });

    it('should clamp limit to max 100', async () => {
      emailTemplatesService.getAllEmailTemplates.mockResolvedValue(mockTemplates);

      await controller.getAllEmailTemplates(undefined, undefined, 1, 200);

      expect(emailTemplatesService.getAllEmailTemplates).toHaveBeenCalledWith({
        category: undefined,
        isActive: undefined,
        page: 1,
        limit: 100,
      });
    });

    it('should ensure page is at least 1', async () => {
      emailTemplatesService.getAllEmailTemplates.mockResolvedValue(mockTemplates);

      await controller.getAllEmailTemplates(undefined, undefined, 0, 20);

      expect(emailTemplatesService.getAllEmailTemplates).toHaveBeenCalledWith({
        category: undefined,
        isActive: undefined,
        page: 1,
        limit: 20,
      });
    });
  });

  describe('getEmailTemplateById', () => {
    const templateId = 'template-123';
    const mockTemplate = { id: templateId, name: 'Welcome Email' };

    it('should return template by id', async () => {
      emailTemplatesService.getEmailTemplateById.mockResolvedValue(mockTemplate);

      const result = await controller.getEmailTemplateById(templateId);

      expect(result).toEqual(mockTemplate);
      expect(emailTemplatesService.getEmailTemplateById).toHaveBeenCalledWith(templateId);
    });
  });

  describe('updateEmailTemplate', () => {
    const templateId = 'template-123';
    const updateDto = { name: 'Updated Welcome Email', isActive: false };
    const mockResult = { id: templateId, ...updateDto };

    it('should successfully update a template', async () => {
      emailTemplatesService.updateEmailTemplate.mockResolvedValue(mockResult);

      const result = await controller.updateEmailTemplate(templateId, updateDto);

      expect(result).toEqual(mockResult);
      expect(emailTemplatesService.updateEmailTemplate).toHaveBeenCalledWith(templateId, updateDto);
    });
  });

  describe('deleteEmailTemplate', () => {
    const templateId = 'template-123';
    const mockResult = { message: 'Template deleted successfully' };

    it('should successfully delete a template', async () => {
      emailTemplatesService.deleteEmailTemplate.mockResolvedValue(mockResult);

      const result = await controller.deleteEmailTemplate(templateId);

      expect(result).toEqual(mockResult);
      expect(emailTemplatesService.deleteEmailTemplate).toHaveBeenCalledWith(templateId);
    });
  });

  describe('renderTemplate', () => {
    const templateId = 'template-123';
    const renderDto = {
      templateId,
      variables: { firstName: 'John', lastName: 'Doe' },
    };
    const mockResult = {
      subject: 'Welcome John!',
      html: '<h1>Welcome John Doe!</h1>',
      text: 'Welcome John Doe!',
    };

    it('should render a template with variables', async () => {
      emailTemplatesService.renderTemplate.mockResolvedValue(mockResult);

      const result = await controller.renderTemplate(templateId, renderDto);

      expect(result).toEqual(mockResult);
      expect(emailTemplatesService.renderTemplate).toHaveBeenCalledWith(renderDto);
    });
  });

  describe('sendEmail', () => {
    const templateId = 'template-123';
    const sendDto = {
      templateId,
      to: 'john@example.com',
      toName: 'John Doe',
      cc: ['manager@example.com'],
      bcc: ['archive@example.com'],
      variables: { firstName: 'John', lastName: 'Doe' },
      campaignId: 'campaign-123',
      contactId: 'contact-123',
    };
    const mockResult = { messageId: 'msg-123', status: 'queued' };

    it('should send an email using template', async () => {
      emailTemplatesService.sendEmail.mockResolvedValue(mockResult);

      const result = await controller.sendEmail(templateId, sendDto);

      expect(result).toEqual(mockResult);
      expect(emailTemplatesService.sendEmail).toHaveBeenCalledWith(sendDto);
    });
  });

  describe('getCategories', () => {
    it('should return list of categories', async () => {
      const result = await controller.getCategories();

      expect(result).toHaveProperty('categories');
      expect(result.categories).toContain('marketing');
      expect(result.categories).toContain('transactional');
      expect(result.categories).toContain('welcome');
    });
  });

  describe('getPredefinedVariables', () => {
    it('should return list of predefined variables', async () => {
      const result = await controller.getPredefinedVariables();

      expect(result).toHaveProperty('variables');
      expect(result.variables.length).toBeGreaterThan(0);
      
      const contactFirstName = result.variables.find(v => v.name === 'contact.firstName');
      expect(contactFirstName).toBeDefined();
      expect(contactFirstName.required).toBe(true);
    });
  });
});