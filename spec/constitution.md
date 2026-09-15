# Jira/Confluence Automation Project Constitution

## Project Overview

This document establishes the foundational principles, standards, and guidelines for the Jira/Confluence automation project. It serves as the constitution for all development decisions, code quality standards, and architectural patterns.

**Project Purpose:** Build a robust automation platform that integrates with Jira and Confluence to streamline workflow management, documentation synchronization, and team collaboration.

## Technology Stack

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Node Version:** v23.5.0 (or latest LTS)
- **Package Manager:** npm 11.0.0+
- **Key Libraries:**
  - State Management: Redux or Zustand (to be defined)
  - HTTP Client: Axios or Fetch API
  - UI Components: Material-UI, Chakra UI, or custom components
  - Routing: React Router v6+

### Backend
- **Runtime:** Node.js v23.5.0+
- **Framework:** Express.js
- **Package Manager:** npm 11.0.0+
- **Environment Management:** dotenv
- **Key Libraries:**
  - API Integration: axios or node-fetch
  - Validation: joi or zod
  - Middleware: cors, helmet, compression
  - Logging: winston or pino

### Database
- **System:** PostgreSQL 15
- **Deployment:** Docker (via docker-compose)
- **ORM/Query Builder:** Sequelize, TypeORM, or Knex.js (to be defined)
- **Migration Tool:** db-migrate or Alembic
- **Connection Pooling:** pg-pool

### DevOps & Infrastructure
- **Containerization:** Docker & Docker Compose
- **Version Control:** Git
- **Environment Management:** .env files (never committed)
- **Runtime Virtualization:** nvm for Node version management

## Code Standards & Conventions

### JavaScript/TypeScript
- **Language:** JavaScript with optional TypeScript support
- **Linting:** ESLint with Airbnb or Standard config
- **Formatting:** Prettier (2-space indentation)
- **Code Style:**
  - Use `const` by default, `let` only when necessary
  - Prefer arrow functions for callbacks
  - Use template literals for string interpolation
  - Destructure objects and arrays
  - Avoid `var` keyword entirely

### File Structure
```
project/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── services/
│   │   ├── styles/
│   │   └── App.jsx
│   ├── public/
│   ├── vite.config.js
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── middleware/
│   │   ├── utils/
│   │   ├── config/
│   │   └── server.js
│   ├── migrations/
│   ├── tests/
│   ├── .env.example
│   └── package.json
├── db/
│   ├── docker-compose.yml
│   ├── init.sql
│   └── migrations/
└── spec/
    └── constitution.md
```

### Naming Conventions
- **Components:** PascalCase (e.g., `UserProfile.jsx`)
- **Utilities & Hooks:** camelCase (e.g., `useAuth.js`, `formatDate.js`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
- **Database Tables:** snake_case, plural (e.g., `user_profiles`, `issue_mappings`)
- **Database Columns:** snake_case (e.g., `created_at`, `updated_at`)

## Architecture Patterns

### Frontend Architecture
- **Component Structure:** Presentational and Container components separation
- **State Management:** Centralized store for application state
- **API Communication:** Service layer for all external API calls
- **Error Handling:** Global error boundary and per-component error states
- **Routing:** Page-based routing with lazy loading

### Backend Architecture
- **API Design:** RESTful endpoints following resource-oriented design
- **Request/Response:** JSON payloads with consistent error response format
- **Authentication:** JWT tokens with refresh token rotation
- **Authorization:** Role-based access control (RBAC)
- **Error Handling:** Centralized error handling middleware with standardized error codes
- **Logging:** Structured logging with timestamp, level, and context

### Database Design
- **Migrations:** Version-controlled schema changes
- **Transactions:** Use for multi-step operations affecting data integrity
- **Indexes:** On foreign keys, frequently queried columns
- **Timestamps:** `created_at` and `updated_at` on all tables
- **Soft Deletes:** Use `deleted_at` column for logical deletes where audit trail needed

## Development Workflow

### Environment Setup
```bash
# Clone repository
git clone <repo>
cd jira-confluence-automation

# Frontend setup
cd frontend
npm install
npm run dev

# Backend setup (in another terminal)
cd backend
npm install
docker-compose up -d
npm run migrate
npm run dev

# Backend runs on http://localhost:3000
# Frontend runs on http://localhost:5173
```

### Git Workflow
- **Main Branches:** `main` (production), `develop` (staging)
- **Feature Branches:** `feature/description` from `develop`
- **Bugfix Branches:** `bugfix/description` from `develop`
- **Commit Messages:** 
  ```
  type(scope): description
  
  Body with more details if needed.
  ```
  Types: feat, fix, docs, style, refactor, test, chore

### Code Review Requirements
- Minimum 1 approval before merge
- All CI checks must pass
- No console logs or debug code
- Test coverage minimum 80%
- Linting must pass without warnings

## Testing Requirements

### Frontend Testing
- **Framework:** Vitest or Jest
- **Coverage Minimum:** 80%
- **Test Types:**
  - Unit tests for utilities and hooks
  - Component tests for interactive components
  - Integration tests for critical user flows
- **Command:** `npm run test`

### Backend Testing
- **Framework:** Jest or Mocha
- **Coverage Minimum:** 80%
- **Test Types:**
  - Unit tests for business logic
  - Integration tests for API endpoints
  - Database tests with test database
- **Command:** `npm run test`

### E2E Testing
- **Framework:** Cypress or Playwright
- **Coverage:** Critical user workflows
- **Command:** `npm run test:e2e`

## API Standards

### Request/Response Format
```javascript
// Success Response
{
  success: true,
  data: { /* response data */ },
  timestamp: "2026-09-15T10:30:00Z"
}

// Error Response
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "Human readable message",
    details: { /* optional */ }
  },
  timestamp: "2026-09-15T10:30:00Z"
}
```

### Authentication
- **Header:** `Authorization: Bearer <token>`
- **Token Type:** JWT with 1-hour expiry
- **Refresh Mechanism:** POST `/api/auth/refresh` with refresh token

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/jira_conf_automation
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JIRA_API_TOKEN=xxxx
CONFLUENCE_API_TOKEN=xxxx
LOG_LEVEL=debug
```

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_NAME=Jira Confluence Automation
```

## Database Setup

### Initial Migration
```bash
cd backend
npx sequelize-cli db:migrate
npx sequelize-cli db:seed  # if needed
```

### Docker Commands
```bash
# Start database
docker-compose up -d

# View logs
docker-compose logs -f

# Stop database
docker-compose down
```

## Deployment Guidelines

### Build Process
```bash
# Frontend
npm run build  # Creates dist/ folder

# Backend
npm install --production
NODE_ENV=production npm run migrate
```

### Deployment Checklist
- [ ] All tests passing
- [ ] Code review approved
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] Security scan passed
- [ ] No console logs in production code
- [ ] Performance benchmarks acceptable

## Security Standards

### Code Security
- Never commit secrets or API keys
- Use environment variables for all sensitive data
- Validate and sanitize all user inputs
- Implement rate limiting on API endpoints
- Use HTTPS in production
- Implement CORS properly
- Sanitize database queries (use parameterized queries)

### Database Security
- Use prepared statements
- Principle of least privilege for DB user
- Regular backups with version control
- Encrypt sensitive data at rest
- Audit log for data modifications

### Frontend Security
- Content Security Policy headers
- CSRF protection on state-changing requests
- XSS prevention through proper escaping
- Secure cookie flags (httpOnly, Secure, SameSite)

## Documentation Standards

### Code Documentation
- JSDoc comments for public functions
- README.md in each major directory
- Inline comments only for non-obvious logic
- Keep documentation in sync with code

### API Documentation
- OpenAPI/Swagger specification
- Endpoint descriptions with request/response examples
- Authentication requirements documented
- Error codes documented

## Performance Standards

### Frontend
- Lighthouse score: >90
- Core Web Vitals: Green across board
- Bundle size: <200KB (gzipped)
- Initial load: <3 seconds

### Backend
- API response time: <200ms (p95)
- Database query time: <100ms (p95)
- Uptime: 99.9%
- Error rate: <0.1%

## Maintenance & Monitoring

### Monitoring
- Application error tracking (Sentry or similar)
- Performance monitoring (New Relic or similar)
- Uptime monitoring and alerting
- Log aggregation and analysis

### Regular Tasks
- Weekly dependency updates check
- Monthly security audits
- Quarterly performance reviews
- Annual architecture review

## Team Standards

### Communication
- Issues tracked in GitHub/Jira
- Pull request discussions for technical decisions
- Design docs for major features
- Daily standup for alignment

### Code Ownership
- Each module has defined owner(s)
- Owners responsible for code quality and maintenance
- Knowledge sharing through pair programming and documentation

## Versioning

### Semantic Versioning
- MAJOR.MINOR.PATCH format
- Major: Breaking changes
- Minor: New features (backward compatible)
- Patch: Bug fixes

### Release Process
1. Create release branch from main
2. Bump version in package.json
3. Update CHANGELOG
4. Create GitHub release
5. Deploy to production

## Conclusion

This constitution establishes the foundation for consistent, high-quality development. All team members should familiarize themselves with these standards and ensure compliance in their contributions. Regular reviews of this document are encouraged to incorporate lessons learned and evolving best practices.

**Last Updated:** September 15, 2026
**Maintained By:** Development Team
