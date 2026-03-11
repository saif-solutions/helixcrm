# Environment Configuration

## Structure

- `api.env.example` - Backend API environment variables
- `web.env.example` - Frontend web application environment variables

## Usage

1. Copy the example files:
   ```bash
   cp api.env.example api.env
   cp web.env.example web.env
   Set actual values in the .env files (not committed to git)
   ```

Load in your application:

bash

# In API

export $(grep -v '^#' ./configs/env/api.env | xargs)

# In Web

export $(grep -v '^#' ./configs/env/web.env | xargs)
Security Notes
Never commit .env files to version control

Use different values for development/staging/production

Rotate secrets regularly

Audit environment variables periodically
