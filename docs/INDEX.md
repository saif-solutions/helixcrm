# HelixCRM Documentation Index

> **Quick Reference:** Use this index to find the right document for your needs.

## 🎯 By Role

### 👨‍💻 Backend Developers
| I need to... | Go to... |
|--------------|----------|
| Understand API endpoints | [`API_CONTRACTS.md`](API_CONTRACTS.md) |
| Set up local development | [`OPERATIONS.md`](OPERATIONS.md) |
| Understand database schema | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| Add a new endpoint | [`API_CONTRACTS.md`](API_CONTRACTS.md) + controller in code |
| Implement tenant isolation | [`architecture/tenant-isolation-architecture.md`](architecture/tenant-isolation-architecture.md) |
| Write tests | [`TESTING_STRATEGY.md`](TESTING_STRATEGY.md) |

### 🎨 Frontend Developers
| I need to... | Go to... |
|--------------|----------|
| Frontend implementation plan | [`FRONTEND_SSOT.md`](FRONTEND_SSOT.md) |
| Understand API contracts | [`API_CONTRACTS.md`](API_CONTRACTS.md) |
| Handle authentication | [`FRONTEND_SSOT.md`](FRONTEND_SSOT.md#stage-b-security-parity) |
| Implement tenant context | [`architecture/tenant-isolation-architecture.md`](architecture/tenant-isolation-architecture.md#-frontend-implementation-guide) |

### 🔒 Security Engineers
| I need to... | Go to... |
|--------------|----------|
| Understand security model | [`SECURITY.md`](SECURITY.md) |
| Review invariants | [`INVARIANTS.md`](INVARIANTS.md) |
| Handle violations | [`INVARIANT_VIOLATIONS.md`](INVARIANT_VIOLATIONS.md) |
| Audit tenant isolation | [`architecture/tenant-isolation-architecture.md`](architecture/tenant-isolation-architecture.md) |

### 🏗 Architects
| I need to... | Go to... |
|--------------|----------|
| Constitutional rules | [`SSOT.md`](SSOT.md) |
| System invariants | [`INVARIANTS.md`](INVARIANTS.md) |
| Canonical vocabulary | [`VOCABULARY.md`](VOCABULARY.md) |
| Architecture overview | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| Module boundaries | [`POST-QA-HARDENING.md`](POST-QA-HARDENING.md) |

### 📊 Product Managers
| I need to... | Go to... |
|--------------|----------|
| MVP scope | [`MVP_AUTH_BOUNDARIES.md`](MVP_AUTH_BOUNDARIES.md) |
| Strategic direction | [`SSOT.md`](SSOT.md) |
| Governance status | [`VALIDATION_SUMMARY.md`](VALIDATION_SUMMARY.md) |

### 🧪 QA Engineers
| I need to... | Go to... |
|--------------|----------|
| Test strategy | [`TESTING_STRATEGY.md`](TESTING_STRATEGY.md) |
| Security test scenarios | [`INVARIANTS.md`](INVARIANTS.md) |
| Hardening roadmap | [`POST-QA-HARDENING.md`](POST-QA-HARDENING.md) |

## 📚 By Document Type

### 🏛 Constitutional (Level 1A)
| Document | Description | When to Use |
|----------|-------------|-------------|
| [`SSOT.md`](SSOT.md) | Constitutional document | Always authoritative; start here |
| [`INVARIANTS.md`](INVARIANTS.md) | System invariants | When verifying system correctness |
| [`VOCABULARY.md`](VOCABULARY.md) | Canonical terminology | When naming things |

### 📋 Controlled (Level 1B)
| Document | Description | When to Use |
|----------|-------------|-------------|
| [`API_CONTRACTS.md`](API_CONTRACTS.md) | API specifications | Building/consuming APIs |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | System architecture | Understanding system design |
| [`SECURITY.md`](SECURITY.md) | Security model | Security reviews |
| [`OPERATIONS.md`](OPERATIONS.md) | Dev/deployment | Setting up environment |
| [`FRONTEND_SSOT.md`](FRONTEND_SSOT.md) | Frontend blueprint | Frontend development |
| [`TESTING_STRATEGY.md`](TESTING_STRATEGY.md) | Test taxonomy | Writing tests |
| [`INVARIANT_VIOLATIONS.md`](INVARIANT_VIOLATIONS.md) | Violation playbook | Handling violations |
| [`MVP_AUTH_BOUNDARIES.md`](MVP_AUTH_BOUNDARIES.md) | MVP scope | Scope decisions |
| [`POST-QA-HARDENING.md`](POST-QA-HARDENING.md) | Hardening roadmap | Future planning |

### 🏗 Architecture Details
| Document | Description | When to Use |
|----------|-------------|-------------|
| [`architecture/tenant-isolation-architecture.md`](architecture/tenant-isolation-architecture.md) | Tenant isolation SSOT | Implementing multi-tenancy |

### 🔐 Governance & Compliance
| Document | Description | When to Use |
|----------|-------------|-------------|
| [`VALIDATION_SUMMARY.md`](VALIDATION_SUMMARY.md) | Governance snapshot | Auditing documentation |
| [`invariants/registry.json`](invariants/registry.json) | Invariant registry | Tracking invariants |

### 👥 Team
| Document | Description | When to Use |
|----------|-------------|-------------|
| [`team/TEAM_RULES.md`](team/TEAM_RULES.md) | Team process | Team operations |

## 🔍 Quick Search

| Keyword | Relevant Documents |
|---------|-------------------|
| tenant, organization | [`architecture/tenant-isolation-architecture.md`](architecture/tenant-isolation-architecture.md), [`INVARIANTS.md`](INVARIANTS.md) (T-01, T-02, T-03, T-04) |
| auth, login, jwt | [`SECURITY.md`](SECURITY.md), [`MVP_AUTH_BOUNDARIES.md`](MVP_AUTH_BOUNDARIES.md), [`API_CONTRACTS.md`](API_CONTRACTS.md) |
| permission, rbac | [`SECURITY.md`](SECURITY.md), [`FRONTEND_SSOT.md`](FRONTEND_SSOT.md) (B-01) |
| test, spec | [`TESTING_STRATEGY.md`](TESTING_STRATEGY.md) |
| error, violation | [`INVARIANT_VIOLATIONS.md`](INVARIANT_VIOLATIONS.md), [`API_CONTRACTS.md`](API_CONTRACTS.md) |
| deploy, dev, setup | [`OPERATIONS.md`](OPERATIONS.md) |
| frontend, ui, react | [`FRONTEND_SSOT.md`](FRONTEND_SSOT.md) |

## 📅 Documentation Status

| Area | Status | Last Updated |
|------|--------|--------------|
| Core Documentation | ✅ Complete | 2026-03-01 |
| Tenant Isolation | ✅ SSOT Established | 2026-03-01 |
| Frontend Blueprint | ✅ Active | 2026-03-01 |
| Archive | ✅ Clean | 2026-03-01 |

---

**Pro Tip:** Bookmark this page as your entry point to HelixCRM documentation.