
HelixCRM Scripts
Script Categories
Setup Scripts (./setup/)
Environment bootstrap

Development setup

Dependency installation

Configuration generation

Migration Scripts (./migration/)
Database migrations

Data transformations

Schema updates

Backward compatibility scripts

Maintenance Scripts (./maintenance/)
Data cleanup

Debug utilities

Performance optimization

Security audits

Testing Scripts (./testing/)
Test execution helpers

Verification scripts

Quality assurance

Compliance checks

Usage Guidelines
Naming Convention
Use kebab-case: setup-dev-environment.sh

Prefix with category: test-, verify-, cleanup-

Include verb: generate-, migrate-, audit-

Safety Requirements
Scripts should be idempotent when possible

Include safety checks before destructive operations

Log all actions with timestamps

Support dry-run mode for dangerous operations

Documentation
Each script should include:

Purpose description in header

Usage instructions

Required environment variables

Example commands

Safety warnings if applicable

Common Scripts
Development Setup
bash
./scripts/setup/setup-testing.sh
Database Maintenance
bash
./scripts/maintenance/cleanup-test-data.sh
Testing
bash
./scripts/testing/test-auth-flow.sh
Adding New Scripts
Place in appropriate category directory

Follow naming conventions

Add to this README

Test in development environment first
