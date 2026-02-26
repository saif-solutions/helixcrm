
HelixCRM Configuration
Configuration Categories
Feature Flags (./feature-flags/)
A/B testing configurations

Gradual rollouts

Experimental features

Client-specific features

Branding (./branding/)
Theme configurations

Color palettes

Logo specifications

Typography settings

i18n (./i18n/)
Translation files

Locale settings

Date/time formats

Number formatting

Purpose
Externalized configuration for:

Multi-client deployments

White-label customization

Internationalization

Feature management

Security Notes
Never commit secrets to config files

Use environment variables for sensitive data

Validate configurations at application startup

Support environment-specific overrides

Usage
Configurations are loaded at runtime based on:

Environment (dev/staging/prod)

Client/tenant context

User preferences

Feature flags

Adding New Configurations
Use JSON or YAML format

Include schema validation

Document all configuration options

Provide default values
