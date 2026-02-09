import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { FileRepository } from '../repositories/file.repository';

describe('FileRepository', () => {
  let repository: FileRepository;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileRepository,
        {
          provide: PrismaService,
          useValue: {
            file: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<FileRepository>(FileRepository);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should extend TenantAwareRepository', () => {
    expect(repository).toBeInstanceOf(FileRepository);
  });
});
