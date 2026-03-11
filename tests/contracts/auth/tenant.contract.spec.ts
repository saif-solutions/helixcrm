// apps/api/tests/unit/contracts/tenant.contract.spec.ts
import 'reflect-metadata'; // ADD THIS LINE
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  CreateTenantInput,
  TenantPlan,
  TenantInvariants,
} from '../../../src/contracts/tenant.contract';

describe('Tenant Contract', () => {
  describe('CreateTenantInput', () => {
    it('should validate a valid BASIC tenant', async () => {
      const input = plainToInstance(CreateTenantInput, {
        name: 'Acme Corporation',
        plan: TenantPlan.BASIC,
      });

      const errors = await validate(input);
      expect(errors).toHaveLength(0);

      const invariantErrors = input.validateInvariants();
      expect(invariantErrors).toHaveLength(0);
    });

    it('should reject ENTERPRISE plan without customDomain', async () => {
      const input = plainToInstance(CreateTenantInput, {
        name: 'Enterprise Corp',
        plan: TenantPlan.ENTERPRISE,
        // Missing customDomain
      });

      const errors = await validate(input);
      expect(errors).toHaveLength(0); // Basic validation passes

      const invariantErrors = input.validateInvariants();
      expect(invariantErrors).toContain('Enterprise plan requires a custom domain');
    });

    it('should accept ENTERPRISE plan with customDomain', async () => {
      const input = plainToInstance(CreateTenantInput, {
        name: 'Enterprise Corp',
        plan: TenantPlan.ENTERPRISE,
        customDomain: 'https://corp.example.com',
      });

      const errors = await validate(input);
      expect(errors).toHaveLength(0);

      const invariantErrors = input.validateInvariants();
      expect(invariantErrors).toHaveLength(0);
    });

    it('should reject invalid slug format', async () => {
      const input = plainToInstance(CreateTenantInput, {
        name: 'Test Corp',
        slug: 'invalid_slug!', // Contains underscore and exclamation
      });

      const errors = await validate(input);
      expect(errors).toHaveLength(0); // Basic validation passes

      const invariantErrors = input.validateInvariants();
      expect(invariantErrors).toContain(
        'Slug can only contain lowercase letters, numbers, and hyphens',
      );
    });

    it('should accept valid slug format', async () => {
      const input = plainToInstance(CreateTenantInput, {
        name: 'Test Corp',
        slug: 'test-corp-123',
      });

      const errors = await validate(input);
      expect(errors).toHaveLength(0);

      const invariantErrors = input.validateInvariants();
      expect(invariantErrors).toHaveLength(0);
    });

    it('should reject invalid enum values', async () => {
      const input = plainToInstance(CreateTenantInput, {
        name: 'Test Corp',
        plan: 'invalid-plan' as any, // Invalid enum value
      });

      const errors = await validate(input);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('plan');
    });

    it('should accept empty optional fields', async () => {
      const input = plainToInstance(CreateTenantInput, {
        name: 'Test Corp',
        // No plan, slug, or customDomain
      });

      const errors = await validate(input);
      expect(errors).toHaveLength(0);

      const invariantErrors = input.validateInvariants();
      expect(invariantErrors).toHaveLength(0);
    });
  });

  describe('TenantInvariants', () => {
    it('should validate enterprise plan correctly', () => {
      const input = { plan: TenantPlan.ENTERPRISE, customDomain: undefined } as CreateTenantInput;
      const errors = TenantInvariants.validateEnterprisePlan(input);
      expect(errors).toContain('Enterprise plan requires a custom domain');

      const inputWithDomain = {
        plan: TenantPlan.ENTERPRISE,
        customDomain: 'https://example.com',
      } as CreateTenantInput;
      const errorsWithDomain = TenantInvariants.validateEnterprisePlan(inputWithDomain);
      expect(errorsWithDomain).toHaveLength(0);
    });

    it('should validate slug format correctly', () => {
      const input1 = { slug: 'valid-slug-123' } as CreateTenantInput;
      const errors1 = TenantInvariants.validateSlug(input1);
      expect(errors1).toHaveLength(0);

      const input2 = { slug: 'invalid_slug!' } as CreateTenantInput;
      const errors2 = TenantInvariants.validateSlug(input2);
      expect(errors2).toContain('Slug can only contain lowercase letters, numbers, and hyphens');

      const input3 = { slug: undefined } as CreateTenantInput;
      const errors3 = TenantInvariants.validateSlug(input3);
      expect(errors3).toHaveLength(0);
    });
  });
});
