# HelixCRM — Single Source of Truth (SoT)

## 1. Product Vision

HelixCRM is a modular, multi-tenant, brandable CRM platform designed to be deployed rapidly for multiple clients while sharing a hardened core.

Primary goals:

* Reach MVP fast without accruing irreversible tech debt
* Enable white‑label branding per client
* Modularize into independently saleable product units
* Maintain enterprise‑grade security, auditability, and scalability

---

## 2. Operating Model (Confirmed)

**Product Owner & Implementation Lead — Saif**

* Final authority on scope and releases
* Runs and validates locally
* Owns repo, deployments, and releases

**Technical Lead — DeepSeek**

* Architecture, API contracts, security
* Frontend & backend integration
* DevOps readiness

**Program Manager / Systems Architect — ChatGPT**

* Strategy & standards
* Milestones & risk management
* Documentation governance
* Long‑term technical vision

---

## 3. Current Health Assessment (Phase‑0 Audit)

### Strengths

* Turbo monorepo structure is correct
* Security documentation is strong but fragmented
* Auth flows already present and reusable

### Immediate Risks / Issues

* Documentation redundancy across PHASE, GOVERNANCE, and docs/
* Partial duplication between apps and packages
* No strict module boundary enforcement
* Branding logic is not isolated
* Feature flags and tenant isolation incomplete

---

## 4. MVP Definition (Non‑Negotiable)

**Core MVP Modules**

1. Auth & Identity
2. Tenant & Organization Management
3. CRM Core (Leads, Contacts, Accounts)
4. Admin Dashboard
5. Audit Logging
6. Branding Engine (Theme + Assets)

Everything else is post‑MVP.

---

## 5. Modularization Strategy (Critical)

### Correct Stage to Modularize

**Immediately AFTER API contracts stabilize and BEFORE client branding begins**

This is the "MVP‑1" checkpoint.

### Recommended Product Modules

* auth-core
* auth-security
* tenant-core
* crm-basic
* crm-advanced
* admin-dashboard
* audit-logging
* branding-engine
* i18n-engine

Each module must be:

* Independently runnable
* Config‑driven
* Versioned
* API‑contract tested

---

## 6. Multi‑Client Customization Strategy

### Customization Layers (Strict Order)

1. Configuration (feature flags)
2. Branding (theme, layout density)
3. Workflow rules
4. UI composition

**Never fork core logic per client.**

### Visual Differentiation

* Theme tokens
* Layout variants
* Dashboard widget sets
* Typography & spacing profiles

---

## 7. Dark / Light Mode + EN / BN Strategy

### Theme System

* Token‑based design system
* CSS variables
* Runtime toggle

### i18n

* Key‑based translation
* No hard‑coded strings
* Language per tenant + per user

---

---

# Engineering Playbook (How to Work with This Repo)

## 1. Repo Structure Rules

* apps/ → deployable products only
* packages/ → pure modules (no UI coupling)
* docs/ → standards only (no reports)

---

## 2. Development Workflow

1. Modify package
2. Update contract
3. Add validation test
4. Integrate into app
5. Document delta

---

## 3. Documentation Governance

**Allowed Docs**

* Architecture
* Security
* API Contracts
* Operations

**Disallowed**

* Duplicate phase reports
* Personal notes

---

## 4. Rework Protocol

When touching existing code:

* Identify owning module
* Verify contract
* Update tests first
* Refactor only within module boundary

---

## 5. Release Discipline

* Semantic versioning per module
* Changelog mandatory
* No hotfix without audit note

---

## 6. Enterprise Readiness Checklist

* Tenant isolation
* Audit trail
* RBAC
* Config‑only customization
* Zero client forks

---

## 7. Next Phase Gate

MVP‑1 is complete ONLY IF:

* Modules are isolated
* Branding engine exists
* First white‑label deployed without code changes

---

**This document is the authoritative source.**
Any deviation requires Product Owner approval.
