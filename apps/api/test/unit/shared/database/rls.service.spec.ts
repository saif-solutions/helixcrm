import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RLSService } from '../../../../src/shared/database/rls.service';
import { PrismaService } from '../../../../src/shared/prisma/prisma.service';

// Mock RLSError since it might not exist
class RLSError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RLSError';
  }
}

describe('RLSService', () => {
  let service: RLSService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RLSService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn(),
            $executeRaw: jest.fn(),
            $executeRawUnsafe: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                'RLS_ENABLED': 'true',
                'RLS_FEATURE_FLAG': 'rls_enabled',
                'RLS_BYPASS_ROLE': 'super_admin',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RLSService>(RLSService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should read configuration', () => {
    const config = service.getConfig();
    expect(config.enabled).toBe(true);
  });
});
