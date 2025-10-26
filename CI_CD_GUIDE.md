# ObliKey CI/CD Guide

Complete guide for Continuous Integration and Continuous Deployment workflows.

## Table of Contents

1. [Overview](#overview)
2. [CI Pipeline](#ci-pipeline)
3. [CD Pipeline](#cd-pipeline)
4. [Pull Request Workflow](#pull-request-workflow)
5. [Setup Instructions](#setup-instructions)
6. [Environment Variables](#environment-variables)
7. [Deployment Strategies](#deployment-strategies)
8. [Troubleshooting](#troubleshooting)

---

## Overview

ObliKey uses **GitHub Actions** for automated CI/CD workflows:

### Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **CI Pipeline** | Push to main/develop, PRs | Run tests, build, security checks |
| **CD Pipeline** | Push to main, version tags | Deploy to staging/production |
| **PR Checks** | Pull requests | Validate PRs, check quality |

### Key Features

- ✅ Automated testing with coverage reporting
- ✅ Security vulnerability scanning
- ✅ Docker image building and caching
- ✅ Multi-environment deployments
- ✅ Database migration automation
- ✅ Slack notifications
- ✅ PR size and quality checks

---

## CI Pipeline

**File**: `.github/workflows/ci.yml`

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

### Jobs

#### 1. Backend Tests & Build

**What it does**:
- Sets up PostgreSQL and Redis services
- Installs dependencies
- Generates Prisma client
- Runs database migrations
- Executes linter
- Runs all tests with coverage
- Builds the application
- Uploads coverage to Codecov

**Services**:
```yaml
postgres:16
redis:7-alpine
```

**Steps**:
1. Checkout code
2. Setup Node.js 20
3. Install dependencies (`npm ci`)
4. Generate Prisma client
5. Run migrations
6. Lint code
7. Run tests with coverage
8. Build application
9. Upload artifacts

#### 2. Frontend Tests & Build

**What it does**:
- Installs frontend dependencies
- Runs linter
- Builds production bundle
- Uploads build artifacts

#### 3. Security Scanning

**What it does**:
- Runs Trivy vulnerability scanner
- Checks for known vulnerabilities in dependencies
- Uploads results to GitHub Security

#### 4. Docker Build

**What it does**:
- Builds Docker image
- Tests image creation
- Uses layer caching for speed

#### 5. Code Quality Check

**What it does**:
- Type-checks TypeScript (backend & frontend)
- Ensures no type errors

### Coverage Thresholds

Current requirements (in `package.json`):
```json
{
  "branches": 70,
  "functions": 70,
  "lines": 70,
  "statements": 70
}
```

**CI will fail if coverage drops below these thresholds.**

---

## CD Pipeline

**File**: `.github/workflows/cd.yml`

**Triggers**:
- Push to `main` branch → Staging deployment
- Version tags (e.g., `v1.0.0`) → Production deployment
- Manual trigger via GitHub UI

### Environments

#### Staging

**URL**: `https://staging.oblikey.com`

**Deployment Flow**:
1. Build backend & frontend
2. Build Docker image
3. Push to Docker Hub
4. Deploy to Railway (or configured platform)
5. Run database migrations
6. Send Slack notification

**Automatic**: Deploys on every push to `main`

#### Production

**URL**: `https://oblikey.com`

**Deployment Flow**:
1. Build backend & frontend (production mode)
2. Build Docker image with version tag
3. Push to Docker Hub
4. Deploy to Railway/AWS ECS
5. Run database migrations
6. Create Sentry release
7. Send Slack notification
8. Create GitHub release

**Trigger**: Push version tag (e.g., `git tag v1.0.0 && git push --tags`)

### Manual Deployment

You can manually trigger deployments from GitHub Actions:

1. Go to **Actions** tab
2. Select **CD Pipeline - Deployment**
3. Click **Run workflow**
4. Choose environment (staging/production)
5. Click **Run workflow**

---

## Pull Request Workflow

**File**: `.github/workflows/pr-checks.yml`

**Triggers**: When a PR is opened, updated, or reopened

### Automated Checks

#### 1. PR Title Validation

Enforces conventional commit format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Test additions/changes
- `build:` - Build system changes
- `ci:` - CI/CD changes
- `chore:` - Maintenance tasks

**Example**: `feat: add user profile page`

#### 2. PR Size Check

Automatically labels PRs based on size:

| Size | Lines Changed | Label |
|------|---------------|-------|
| XS | < 100 | `size/XS` |
| S | 100-299 | `size/S` |
| M | 300-599 | `size/M` |
| L | 600-999 | `size/L` |
| XL | 1000+ | `size/XL` |

**Recommendation**: Keep PRs under 600 lines for easier review.

#### 3. Breaking Changes Detection

Automatically detects:
- Database schema changes
- API endpoint modifications

Adds a comment to PR with checklist:
- [ ] Migration files included
- [ ] Breaking changes documented
- [ ] Backward compatibility considered
- [ ] Database backup plan in place

#### 4. Test Coverage Comparison

- Runs tests with coverage
- Compares coverage to base branch
- Comments on PR with coverage diff

#### 5. Security Checks

- Runs `npm audit` on dependencies
- Scans for secrets in code using TruffleHog
- Reports vulnerabilities

#### 6. Code Quality

- Runs ESLint
- Reports errors and warnings
- Comments results on PR

---

## Setup Instructions

### Prerequisites

1. GitHub repository
2. Docker Hub account (for Docker images)
3. Deployment platform account (Railway, AWS, etc.)

### Required Secrets

Configure these in **GitHub Settings → Secrets and Variables → Actions**:

#### Essential Secrets

| Secret | Description | Example |
|--------|-------------|---------|
| `JWT_SECRET` | JWT signing secret | Random 64-char string |
| `STAGING_DATABASE_URL` | Staging database connection | `postgresql://...` |
| `PRODUCTION_DATABASE_URL` | Production database connection | `postgresql://...` |

#### Docker (Required for CD)

| Secret | Description |
|--------|-------------|
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub access token |

#### Railway (if using Railway)

| Secret | Description |
|--------|-------------|
| `RAILWAY_TOKEN` | Railway API token |

#### AWS (if using AWS)

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_REGION` | AWS region (e.g., `eu-north-1`) |

#### Optional Integrations

| Secret | Description |
|--------|-------------|
| `SLACK_WEBHOOK` | Slack webhook for notifications |
| `SENTRY_AUTH_TOKEN` | Sentry API token for releases |
| `SENTRY_ORG` | Sentry organization name |
| `CODECOV_TOKEN` | Codecov token for coverage reports |

### Step-by-Step Setup

#### 1. Configure GitHub Secrets

```bash
# Go to your repository on GitHub
# Settings → Secrets and variables → Actions → New repository secret

# Add each secret listed above
```

#### 2. Create Environments

```bash
# Settings → Environments → New environment

# Create "staging" environment
# Create "production" environment

# Add environment-specific secrets to each
```

#### 3. Configure Docker Hub

```bash
# Create Docker Hub repository
docker login
docker tag oblikey/app:latest your-username/oblikey:latest
docker push your-username/oblikey:latest
```

#### 4. Configure Deployment Platform

**For Railway**:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Get token
railway whoami
```

**For AWS ECS**:
```bash
# Configure AWS CLI
aws configure

# Create ECS cluster, task definition, service
# See DEPLOYMENT.md for detailed AWS setup
```

#### 5. Test CI/CD

```bash
# Create a test branch
git checkout -b test-cicd

# Make a small change
echo "# Test" >> README.md

# Commit and push
git add .
git commit -m "test: verify CI/CD pipeline"
git push origin test-cicd

# Create PR and watch workflows run
```

---

## Environment Variables

### CI Environment

Set in workflow files or GitHub Actions environment:

```yaml
env:
  NODE_ENV: test
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/oblikey_test
  JWT_SECRET: test-jwt-secret
  REDIS_URL: redis://localhost:6379
```

### Staging Environment

```yaml
VITE_API_URL: https://api-staging.oblikey.com
DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
JWT_SECRET: ${{ secrets.JWT_SECRET }}
NODE_ENV: staging
```

### Production Environment

```yaml
VITE_API_URL: https://api.oblikey.com
DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
JWT_SECRET: ${{ secrets.JWT_SECRET }}
NODE_ENV: production
```

---

## Deployment Strategies

### 1. Staging Deployment (Automatic)

**Trigger**: Push to `main` branch

```bash
git checkout main
git merge develop
git push origin main
# Automatically deploys to staging
```

### 2. Production Deployment (Version Tag)

**Trigger**: Push version tag

```bash
# Ensure main is up-to-date
git checkout main
git pull

# Create version tag
git tag -a v1.0.0 -m "Release v1.0.0"

# Push tag (triggers production deployment)
git push origin v1.0.0
```

### 3. Hotfix Deployment

For urgent fixes in production:

```bash
# Create hotfix branch from main
git checkout -b hotfix/critical-bug main

# Make fix
# ... fix code ...

# Commit
git commit -m "fix: critical bug in payment processing"

# Merge to main
git checkout main
git merge hotfix/critical-bug

# Create patch version tag
git tag -a v1.0.1 -m "Hotfix: critical bug"

# Push (triggers deployment)
git push origin main
git push origin v1.0.1
```

### 4. Rollback Strategy

If deployment fails or bugs are found:

**Option 1: Revert to previous version**
```bash
# Deploy previous version
git tag v1.0.0-rollback
git push origin v1.0.0-rollback
```

**Option 2: Docker rollback**
```bash
# Pull previous Docker image
docker pull oblikey/app:v1.0.0

# Restart with previous image
docker-compose down
docker-compose up -d
```

**Option 3: Railway rollback**
```bash
railway rollback
```

---

## Monitoring Deployments

### GitHub Actions Dashboard

1. Go to **Actions** tab
2. View running/completed workflows
3. Click on workflow to see details
4. Check logs for each job

### Slack Notifications

Deployment notifications include:
- ✅ Successful deployment
- ❌ Failed deployment
- Environment (staging/production)
- Commit SHA
- Author

### Logs

Access logs:
- **GitHub Actions**: Actions tab → Workflow → Job logs
- **Railway**: Railway dashboard → Deployments → Logs
- **Docker**: `docker logs container-name`

---

## Troubleshooting

### CI Failing

#### Tests Failing

**Problem**: Tests pass locally but fail in CI

**Solutions**:
```bash
# Use same environment as CI
docker-compose -f docker-compose.test.yml up -d

# Run tests
npm test

# Check for environment-specific issues
# - Database connection
# - Environment variables
# - Race conditions
```

#### Coverage Below Threshold

**Problem**: Code coverage is below 70%

**Solutions**:
```bash
# Run coverage report locally
npm test -- --coverage

# Open HTML report
open coverage/lcov-report/index.html

# Write tests for uncovered code
# See TESTING_GUIDE.md
```

#### Linting Errors

**Problem**: Linter fails in CI

**Solutions**:
```bash
# Run linter locally
npm run lint

# Auto-fix issues
npm run lint:fix

# Commit fixes
git add .
git commit -m "fix: lint errors"
```

### CD Failing

#### Docker Build Fails

**Problem**: Docker image build fails

**Solutions**:
```bash
# Build locally to reproduce
docker build -t oblikey/app:test .

# Check Dockerfile
# Check .dockerignore
# Ensure all dependencies in package.json
```

#### Deployment Fails

**Problem**: Deployment to platform fails

**Solutions**:
1. Check secrets are configured correctly
2. Verify platform credentials
3. Check platform service status
4. Review deployment logs

#### Database Migration Fails

**Problem**: Prisma migrate fails in deployment

**Solutions**:
```bash
# Test migration locally
npx prisma migrate dev

# Check migration file
# Ensure no breaking changes
# Consider using Prisma migrate deploy with --skip-generate

# Manual migration if needed
railway run npx prisma migrate deploy
```

---

## Best Practices

### 1. Always Create PRs

Never push directly to `main` - always create a PR:
```bash
git checkout -b feature/new-feature
# ... make changes ...
git push origin feature/new-feature
# Create PR on GitHub
```

### 2. Keep PRs Small

Aim for < 600 lines changed per PR for easier review.

### 3. Write Tests First

Ensure tests are included with new features:
- Unit tests for new functions
- Integration tests for new endpoints
- Coverage should not decrease

### 4. Semantic Versioning

Follow semantic versioning for releases:
- `v1.0.0` - Major release (breaking changes)
- `v1.1.0` - Minor release (new features)
- `v1.1.1` - Patch release (bug fixes)

### 5. Monitor Deployments

Always check deployment status:
- Watch GitHub Actions
- Check Slack notifications
- Verify application is running
- Run smoke tests

### 6. Database Migrations

Always test migrations:
```bash
# Create migration
npx prisma migrate dev --name add_user_field

# Test migration
npx prisma migrate reset
npx prisma migrate dev

# Commit migration file
git add prisma/migrations
git commit -m "feat: add user field migration"
```

---

## Advanced Configuration

### Custom Deployment Targets

To add a new deployment target, edit `.github/workflows/cd.yml`:

```yaml
- name: Deploy to Custom Platform
  if: secrets.CUSTOM_PLATFORM_KEY != ''
  run: |
    # Your deployment commands
    custom-cli deploy --env production
  env:
    CUSTOM_PLATFORM_KEY: ${{ secrets.CUSTOM_PLATFORM_KEY }}
```

### Custom Smoke Tests

Add to `.github/workflows/cd.yml`:

```yaml
- name: Custom smoke tests
  run: |
    # Test critical endpoints
    curl -f https://api.oblikey.com/api/auth/health || exit 1

    # Test database connection
    # Test Redis connection
    # Test S3 access
```

### Branch Protection Rules

Recommended branch protection for `main`:

1. Go to **Settings → Branches**
2. Add rule for `main`
3. Enable:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Include administrators

Required status checks:
- `backend`
- `frontend`
- `security`
- `code-quality`

---

## Quick Reference

### Common Commands

```bash
# Run CI locally
npm test
npm run lint
npm run build

# Create version tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Manual deployment
# Go to Actions → CD Pipeline → Run workflow

# View logs
railway logs
docker logs container-name

# Rollback
railway rollback
```

### Workflow Files

- `.github/workflows/ci.yml` - CI Pipeline
- `.github/workflows/cd.yml` - CD Pipeline
- `.github/workflows/pr-checks.yml` - PR Checks

---

## Support

For CI/CD issues:
- Check workflow logs in GitHub Actions
- Review this guide
- Contact DevOps team
- Create issue in repository

---

**Last Updated**: 2024-01-19
**Version**: 1.0.0
