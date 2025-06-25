# Raindrop-to-WordPress Sync: Implementation Prompt Plan

## Project Overview

This project builds a Cloudflare Worker that syncs bookmarks from Raindrop.io (tagged with "blog") to a WordPress site as link posts. The implementation follows test-driven development with incremental, testable steps.

## Architecture Blueprint

### Core Components
1. **Cloudflare Worker Environment Setup**
   - TypeScript configuration
   - Wrangler setup for local development
   - Environment variable management
   - KV namespace creation

2. **Request Handler & Routing**
   - Main fetch handler
   - Route discrimination (/trigger endpoint)
   - Token-based authentication
   - CORS and security headers

3. **Raindrop.io Integration**
   - API client with authentication
   - Bookmark fetching with filtering
   - Response parsing and validation
   - Error handling

4. **WordPress Integration**
   - REST API client with Application Password auth
   - Post creation with proper formatting
   - Retry logic with exponential backoff
   - Error handling

5. **State Management (KV Storage)**
   - Last fetch timestamp tracking
   - Deduplication via posted item tracking
   - KV read/write utilities

6. **Markdown Processing**
   - CommonMark parsing with markdown-it
   - HTML generation
   - Link formatting

7. **Error Reporting**
   - Discord webhook integration
   - Structured error messages
   - Failure tracking

8. **Cron Scheduling**
   - Scheduled trigger handler
   - Execution logging

## Implementation Phases

### Phase 1: Foundation
1. Project setup with TypeScript and Wrangler
2. Basic Worker structure with request handling
3. Environment variable configuration
4. Unit test framework setup

### Phase 2: Authentication & Security
1. Token-based authentication for /trigger endpoint
2. CORS headers and security middleware
3. Request validation

### Phase 3: State Management
1. KV namespace bindings
2. State tracking utilities
3. Timestamp management

### Phase 4: External API Clients
1. Raindrop.io API client
2. WordPress REST API client
3. Error handling and retries

### Phase 5: Core Business Logic
1. Bookmark fetching and filtering
2. Deduplication logic
3. Post formatting and creation

### Phase 6: Error Handling & Monitoring
1. Discord webhook integration
2. Comprehensive error logging
3. Dry run mode

### Phase 7: Scheduling & Final Integration
1. Cron trigger setup
2. End-to-end testing
3. Production deployment

## Detailed Implementation Steps

### Step 1: Project Foundation
- Initialize TypeScript project
- Configure Wrangler
- Set up basic Worker structure
- Create test framework

### Step 2: Request Router
- Implement fetch handler
- Add route discrimination
- Create response utilities

### Step 3: Security Layer
- Add token validation
- Implement auth middleware
- Add security headers

### Step 4: KV Storage Interface
- Create KV types
- Implement read/write functions
- Add timestamp utilities

### Step 5: Raindrop Client Foundation
- Define API types
- Create authenticated fetch wrapper
- Implement basic GET request

### Step 6: Raindrop Bookmark Fetching
- Implement bookmark query
- Add tag filtering
- Parse API response

### Step 7: WordPress Client Foundation
- Define post types
- Create authenticated client
- Implement basic POST request

### Step 8: WordPress Post Creation
- Format post content
- Handle markdown conversion
- Add link formatting

### Step 9: Retry Logic
- Implement exponential backoff
- Add retry wrapper
- Handle failure cases

### Step 10: Deduplication System
- Check posted items in KV
- Mark items as posted
- Update last fetch timestamp

### Step 11: Discord Error Reporter
- Create webhook client
- Format error messages
- Implement error dispatch

### Step 12: Dry Run Mode
- Add dry run flag
- Modify post status logic
- Add logging

### Step 13: Cron Handler
- Implement scheduled handler
- Connect to main sync logic
- Add execution tracking

### Step 14: End-to-End Integration
- Wire all components together
- Add comprehensive error handling
- Implement main sync flow

### Step 15: Testing & Deployment
- Integration tests
- Deployment configuration
- Production validation

---

## Implementation Prompts

### Prompt 1: Project Foundation

```text
Create a new Cloudflare Worker project with TypeScript support. Set up the following:

1. Initialize a TypeScript project with these dependencies:
   - @cloudflare/workers-types
   - wrangler (dev dependency)
   - vitest (for testing)
   - typescript

2. Create a basic wrangler.toml configuration with:
   - Worker name: raindrop-wordpress-sync
   - Compatibility date: 2024-01-01
   - KV namespace binding named SYNC_STATE

3. Set up TypeScript configuration (tsconfig.json) for Cloudflare Workers with:
   - Target: ES2022
   - Module: ESNext
   - Types for Cloudflare Workers

4. Create the main worker file (src/index.ts) with:
   - Basic fetch handler that returns "Hello World"
   - Proper TypeScript types for the Worker environment

5. Set up a basic test file (src/index.test.ts) that:
   - Tests the fetch handler returns 200
   - Uses vitest for testing

6. Add npm scripts for:
   - dev: wrangler dev
   - test: vitest
   - deploy: wrangler deploy
   - types: tsc --noEmit

Ensure all files compile without errors and the basic test passes.
```

### Prompt 2: Request Router with Security

```text
Extend the Cloudflare Worker with request routing and token-based security:

1. Create a Router class (src/router.ts) that:
   - Handles GET /trigger endpoint
   - Returns 404 for other routes
   - Has proper TypeScript types

2. Add security middleware (src/middleware/auth.ts) that:
   - Validates token from query parameter
   - Compares against TRIGGER_TOKEN env variable
   - Returns 403 for invalid/missing tokens
   - Has unit tests for auth validation

3. Create response utilities (src/utils/response.ts) with:
   - jsonResponse(data, status) helper
   - errorResponse(message, status) helper
   - Proper CORS headers for all responses

4. Update the main worker (src/index.ts) to:
   - Use the router for request handling
   - Apply auth middleware to /trigger route
   - Handle errors gracefully

5. Add environment type definitions (src/types/env.ts):
   - Define Env interface with TRIGGER_TOKEN
   - Export for use across the project

6. Write tests for:
   - Router path matching
   - Auth middleware with valid/invalid tokens
   - Response helpers generating correct headers

Ensure the /trigger endpoint only works with valid token and returns proper errors otherwise.
```

### Prompt 3: KV Storage Layer

```text
Implement the KV storage layer for state management:

1. Create KV types (src/types/kv.ts) with:
   - LastFetchData interface { timestamp: string }
   - PostedItemData interface { raindropId: string, postedAt: string }
   - KV key patterns as constants

2. Create KV storage service (src/services/kv-storage.ts) with:
   - getLastFetchTime(): Promise<Date | null>
   - setLastFetchTime(date: Date): Promise<void>
   - isItemPosted(raindropId: string): Promise<boolean>
   - markItemAsPosted(raindropId: string): Promise<void>
   - Proper error handling for KV operations

3. Add KV utilities (src/utils/kv.ts) with:
   - Key generation functions
   - JSON serialization/deserialization helpers
   - TTL configuration (30 days for posted items)

4. Update environment types (src/types/env.ts):
   - Add SYNC_STATE: KVNamespace to Env interface

5. Create comprehensive tests (src/services/kv-storage.test.ts):
   - Mock KV namespace for testing
   - Test all CRUD operations
   - Test error scenarios
   - Test data serialization

6. Add integration test helper (src/test/kv-mock.ts):
   - Create in-memory KV mock
   - Implement KVNamespace interface

Ensure all KV operations are type-safe and properly handle missing data scenarios.
```

### Prompt 4: Raindrop API Client

```text
Build the Raindrop.io API client:

1. Define Raindrop types (src/types/raindrop.ts):
   - RaindropItem interface with all needed fields
   - RaindropResponse interface for API response
   - RaindropError for error handling

2. Create API client (src/services/raindrop-client.ts) with:
   - Constructor accepting token
   - fetchBookmarks(tag: string, since?: Date): Promise<RaindropItem[]>
   - Proper Authorization header
   - Query parameter building for created>timestamp
   - Response validation

3. Add API utilities (src/utils/api.ts):
   - buildQueryString helper
   - parseRaindropDate helper
   - API endpoint constants

4. Update environment types (src/types/env.ts):
   - Add RAINDROP_TOKEN: string
   - Add RAINDROP_TAG: string (with default)

5. Create mock responses (src/test/fixtures/raindrop.ts):
   - Sample valid responses
   - Error response examples

6. Write comprehensive tests (src/services/raindrop-client.test.ts):
   - Test successful bookmark fetching
   - Test date filtering
   - Test tag filtering
   - Test error handling (401, 500, network errors)
   - Mock fetch for controlled testing

Ensure the client handles all Raindrop API quirks and validates responses properly.
```

### Prompt 5: WordPress API Client

```text
Implement the WordPress REST API client:

1. Define WordPress types (src/types/wordpress.ts):
   - WordPressPost interface
   - CreatePostPayload interface
   - PostFormat type ('standard' | 'link')
   - WordPressError interface

2. Create API client (src/services/wordpress-client.ts) with:
   - Constructor accepting endpoint, username, password
   - createPost(payload: CreatePostPayload): Promise<WordPressPost>
   - Basic auth header generation
   - Proper content-type headers
   - Response validation

3. Add retry logic (src/utils/retry.ts):
   - retryWithBackoff generic function
   - Exponential backoff calculation
   - Max retry configuration
   - Retry-able error detection

4. Update WordPress client to use retry:
   - Wrap createPost in retry logic
   - Configure 3 retries with exponential backoff
   - Only retry on network/5xx errors

5. Update environment types (src/types/env.ts):
   - Add WP_ENDPOINT: string
   - Add WP_USERNAME: string
   - Add WP_APP_PASSWORD: string

6. Write tests (src/services/wordpress-client.test.ts):
   - Test successful post creation
   - Test auth header generation
   - Test retry logic on failures
   - Test non-retryable errors (4xx)
   - Mock fetch responses

Ensure the client properly handles WordPress API authentication and errors.
```

### Prompt 6: Markdown Processing

```text
Add markdown processing capabilities:

1. Install markdown-it dependency

2. Create markdown service (src/services/markdown-processor.ts):
   - processMarkdown(text: string): string
   - Configure for CommonMark spec
   - Safe HTML output
   - Handle empty/null input

3. Create link formatter (src/utils/link-formatter.ts):
   - formatLinkPost(content: string, title: string, url: string): string
   - Append "→ [title](url)" format
   - Handle special characters in URLs
   - Ensure proper spacing

4. Add content builder (src/services/content-builder.ts):
   - buildPostContent(note: string, title: string, link: string): string
   - Process markdown to HTML
   - Append formatted link
   - Handle edge cases (empty note, etc.)

5. Write comprehensive tests:
   - Test various markdown inputs
   - Test link formatting edge cases
   - Test HTML escaping
   - Test empty content handling

6. Add test fixtures (src/test/fixtures/markdown.ts):
   - Sample markdown content
   - Expected HTML outputs
   - Edge case examples

Ensure markdown processing is secure and handles all content types properly.
```

### Prompt 7: Discord Error Reporter

```text
Implement Discord webhook error reporting:

1. Create Discord types (src/types/discord.ts):
   - DiscordEmbed interface
   - DiscordWebhookPayload interface
   - ErrorContext interface

2. Build Discord client (src/services/discord-reporter.ts):
   - reportError(error: Error, context: ErrorContext): Promise<void>
   - Format errors as Discord embeds
   - Include relevant context (raindrop ID, operation)
   - Handle webhook failures gracefully

3. Create error formatter (src/utils/error-formatter.ts):
   - formatErrorForDiscord(error: Error, context: ErrorContext): DiscordEmbed
   - Include timestamp
   - Color code by severity
   - Truncate long error messages

4. Update environment types (src/types/env.ts):
   - Add DISCORD_WEBHOOK: string (optional)

5. Add error categories (src/types/errors.ts):
   - RaindropAPIError
   - WordPressAPIError
   - KVStorageError
   - Custom error classes with context

6. Write tests (src/services/discord-reporter.test.ts):
   - Test embed formatting
   - Test webhook payload structure
   - Test error handling when webhook fails
   - Test context inclusion

Ensure error reporting doesn't throw and provides useful debugging information.
```

### Prompt 8: Core Sync Logic

```text
Implement the main synchronization logic:

1. Create sync service (src/services/sync-service.ts) with:
   - syncRaindropToWordPress(): Promise<SyncResult>
   - Fetch bookmarks since last sync
   - Filter by tag
   - Check deduplication
   - Create WordPress posts
   - Update last fetch time
   - Handle dry run mode

2. Define sync types (src/types/sync.ts):
   - SyncResult interface
   - SyncStats interface
   - SyncError interface

3. Create sync orchestrator (src/services/sync-orchestrator.ts):
   - Coordinate all services
   - Handle errors with Discord reporting
   - Collect statistics
   - Transaction-like behavior for KV updates

4. Add dry run support:
   - Check DRY_RUN environment variable
   - Set post status to 'draft' when true
   - Log actions without side effects

5. Update environment types (src/types/env.ts):
   - Add DRY_RUN: string (optional)

6. Write integration tests (src/services/sync-service.test.ts):
   - Test full sync flow
   - Test deduplication
   - Test error handling
   - Test dry run mode
   - Test partial failures

Ensure the sync logic is atomic and handles partial failures gracefully.
```

### Prompt 9: Trigger Endpoint Integration

```text
Wire up the /trigger endpoint with the sync logic:

1. Create trigger handler (src/handlers/trigger.ts):
   - handleTrigger(env: Env): Promise<Response>
   - Call sync orchestrator
   - Return sync statistics
   - Handle errors properly

2. Update router (src/router.ts):
   - Wire /trigger to trigger handler
   - Pass environment correctly
   - Apply auth middleware

3. Add request context (src/types/context.ts):
   - RequestContext interface
   - Include trigger source (manual/cron)
   - Track execution time

4. Create response formatter (src/utils/sync-response.ts):
   - formatSyncResponse(result: SyncResult): Response
   - Include statistics
   - Format errors nicely
   - Set appropriate status codes

5. Add logging utilities (src/utils/logger.ts):
   - Simple console logger
   - Structured log format
   - Log levels (info, error, debug)

6. Write integration tests (src/handlers/trigger.test.ts):
   - Test successful sync response
   - Test auth requirements
   - Test error responses
   - Test response format

Ensure the endpoint provides useful feedback about sync operations.
```

### Prompt 10: Cron Handler Implementation

```text
Implement scheduled execution via Cron Triggers:

1. Create cron handler (src/handlers/cron.ts):
   - handleScheduled(env: Env): Promise<void>
   - Call sync orchestrator
   - Report errors to Discord
   - No response needed

2. Update main worker (src/index.ts):
   - Add scheduled() handler
   - Route to cron handler
   - Handle errors globally

3. Add cron utilities (src/utils/cron.ts):
   - Parse cron expressions (for testing)
   - Next run calculation
   - Execution window validation

4. Update wrangler.toml:
   - Add [triggers] section
   - Configure crons = ["0 * * * *"] (hourly)

5. Add execution tracking:
   - Log cron executions
   - Track in KV (optional)
   - Include in sync stats

6. Write tests (src/handlers/cron.test.ts):
   - Test scheduled handler
   - Test error handling
   - Test Discord reporting on failure

Ensure cron executions are logged and errors are reported.
```

### Prompt 11: Configuration Management

```text
Improve configuration and environment variable handling:

1. Create config service (src/services/config.ts):
   - validateEnvironment(env: unknown): Env
   - getConfig(env: Env): Config
   - Default values for optional vars
   - Validation for required vars

2. Define config types (src/types/config.ts):
   - Config interface with all settings
   - Defaults object
   - Validation rules

3. Add config validation (src/utils/validation.ts):
   - URL validation
   - Token format validation
   - Webhook URL validation

4. Create environment parser (src/utils/env-parser.ts):
   - parseBoolean(value: string): boolean
   - parseOptionalString(value: string): string | undefined
   - Handle common env var formats

5. Update all services to use Config:
   - Pass config instead of individual values
   - Centralize default handling

6. Write tests (src/services/config.test.ts):
   - Test required var validation
   - Test default values
   - Test invalid configurations
   - Test type coercion

Ensure configuration is validated at startup and provides clear error messages.
```

### Prompt 12: Error Handling Enhancement

```text
Enhance error handling across the application:

1. Create error boundary (src/middleware/error-boundary.ts):
   - Global error handler for worker
   - Catch unhandled promise rejections
   - Report to Discord
   - Return user-friendly errors

2. Add error transformers (src/utils/error-transform.ts):
   - Transform API errors to user messages
   - Extract useful context
   - Sanitize sensitive data

3. Create custom error types (src/errors/):
   - ValidationError
   - APIError with status code
   - ConfigurationError
   - NetworkError with retry info

4. Add error aggregation (src/services/error-aggregator.ts):
   - Collect multiple errors
   - Group by type
   - Provide summary statistics

5. Implement circuit breaker (src/utils/circuit-breaker.ts):
   - Prevent cascade failures
   - Track API health
   - Auto-recovery logic

6. Write error scenario tests:
   - Test each error type
   - Test error aggregation
   - Test circuit breaker behavior
   - Test error transformation

Ensure errors provide actionable information without exposing sensitive data.
```

### Prompt 13: Performance Optimization

```text
Optimize performance and resource usage:

1. Add request batching (src/utils/batch.ts):
   - Batch multiple KV operations
   - Reduce API calls
   - Implement batch processor

2. Create cache layer (src/services/cache.ts):
   - In-memory cache for request duration
   - Cache Raindrop responses
   - Cache WordPress post results

3. Implement parallel processing (src/utils/parallel.ts):
   - Process bookmarks in parallel
   - Limit concurrency
   - Handle partial failures

4. Add performance monitoring (src/utils/performance.ts):
   - Track operation durations
   - Log slow operations
   - Identify bottlenecks

5. Optimize KV usage:
   - Batch reads where possible
   - Minimize write operations
   - Use efficient key patterns

6. Write performance tests:
   - Test parallel processing
   - Test cache effectiveness
   - Test batch operations
   - Measure improvements

Ensure optimizations maintain correctness while improving speed.
```

### Prompt 14: Monitoring and Observability

```text
Add comprehensive monitoring and observability:

1. Create metrics collector (src/services/metrics.ts):
   - Track sync operations
   - Count successes/failures
   - Measure durations
   - Export to KV or external service

2. Add structured logging (src/services/logger.ts):
   - JSON log format
   - Correlation IDs
   - Log levels
   - Context propagation

3. Implement health checks (src/handlers/health.ts):
   - GET /health endpoint
   - Check KV connectivity
   - Verify API access
   - Return detailed status

4. Create audit trail (src/services/audit.ts):
   - Log all sync operations
   - Track manual triggers
   - Store in KV with rotation

5. Add debug mode (src/utils/debug.ts):
   - Verbose logging flag
   - Request/response logging
   - Performance traces

6. Write monitoring tests:
   - Test metrics collection
   - Test health checks
   - Test audit logging
   - Test debug mode

Ensure the system provides visibility into its operations and health.
```

### Prompt 15: Final Integration and Production Readiness

```text
Complete the final integration and prepare for production:

1. Create deployment scripts (scripts/):
   - Pre-deployment validation
   - Secret verification
   - KV namespace setup
   - Post-deployment tests

2. Add production config (wrangler.production.toml):
   - Production-specific settings
   - Proper routes
   - Security headers

3. Create operations documentation (docs/):
   - Deployment guide
   - Troubleshooting guide
   - Monitoring setup
   - Common issues

4. Implement graceful shutdown:
   - Handle worker termination
   - Complete in-flight requests
   - Clean up resources

5. Add end-to-end tests (e2e/):
   - Full sync flow test
   - Error recovery test
   - Performance test
   - Security test

6. Create rollback procedure:
   - Version tracking
   - Quick rollback steps
   - Data integrity checks

Ensure the system is production-ready with proper operational procedures.
```

---

## Testing Strategy

Each prompt includes specific testing requirements to ensure:
1. Unit tests for individual components
2. Integration tests for service interactions
3. End-to-end tests for complete flows
4. Error scenario coverage
5. Performance validation

## Security Considerations

- Token-based authentication for manual triggers
- Secure storage of API credentials
- Input validation and sanitization
- Error message sanitization
- CORS and security headers

## Monitoring and Operations

- Discord webhook for error alerts
- Health check endpoint
- Structured logging
- Performance metrics
- Audit trail for sync operations