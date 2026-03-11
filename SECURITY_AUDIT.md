# Security Audit Results

Date: March 5, 2026

This document summarizes results from `npm audit` for the HelixCRM project.

---

# Backend (apps/api)

## Runtime Dependencies

No critical runtime vulnerabilities affecting production execution were identified.

## Development Dependencies

28 vulnerabilities detected:

- 6 Low
- 8 Moderate
- 14 High

Affected packages include:

- @nestjs/cli
- @nestjs/swagger
- webpack
- build tool dependencies

These packages are used only during:

- development
- build
- CI pipelines

They are **not included in the production runtime bundle**.

### Risk Assessment

Risk Level: **LOW**

Reason:

- Vulnerabilities exist in build tooling
- They do not affect runtime application behavior
- Exploitation would require local or CI environment access

### Mitigation Plan

- Monitor dependency updates
- Review quarterly
- Upgrade during scheduled framework upgrades

---

# Frontend (apps/web)

## Runtime Dependencies

No runtime vulnerabilities detected.

## Development Dependencies

3 vulnerabilities detected:

- 1 Moderate
- 2 High

Affected dependency chain:

openapi-typescript  
→ @redocly/openapi-core  
→ js-yaml  
→ minimatch

These tools are used only to generate TypeScript types from OpenAPI schemas during development.

They are **not included in the production bundle**.

### Risk Assessment

Risk Level: **LOW**

### Mitigation Plan

- Monitor upstream fixes
- Update during dependency maintenance cycles

---

# Overall Assessment

All reported vulnerabilities exist in **development dependencies only**.

No vulnerabilities affect production runtime code.

The application is considered **safe for deployment**.

---

# Security Maintenance Policy

To maintain long-term security:

- Run `npm audit` monthly
- Review dependencies quarterly
- Upgrade frameworks during scheduled maintenance cycles
