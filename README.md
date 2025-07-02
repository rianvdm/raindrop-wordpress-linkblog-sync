# Raindrop to WordPress Sync

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange.svg)](https://workers.cloudflare.com/)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![Raindrop.io](https://img.shields.io/badge/Raindrop.io-API-6B46C1.svg)](https://developer.raindrop.io/)
[![WordPress](https://img.shields.io/badge/WordPress-REST_API-21759B.svg)](https://developer.wordpress.org/rest-api/)

A Cloudflare Worker that automatically syncs bookmarks from Raindrop.io to WordPress as link posts. Tag a bookmark with your configured tag in Raindrop, and it will automatically appear as a WordPress post with proper formatting and metadata.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/rianvdm/raindrop-wordpress-linkblog-sync)

## Features

- 🔄 **Automatic Sync**: Hourly cron job syncs new bookmarks
- 🏷️ **Tag-based Filtering**: Only syncs bookmarks with specific tags
- 📝 **Markdown Support**: Converts Raindrop notes to WordPress content
- 🔗 **Link Post Format**: Creates proper WordPress link posts
- 🚫 **Deduplication**: Prevents duplicate posts
- 📊 **Error Logging**: Built-in error tracking and reporting
- 🧪 **Dry Run Mode**: Test without creating actual posts
- ⚡ **Edge Computing**: Fast, globally distributed via Cloudflare Workers

## Prerequisites

- [Cloudflare account](https://cloudflare.com) (free tier works)
- [Raindrop.io account](https://raindrop.io) 
- WordPress site with REST API enabled
- Node.js 18+ and npm

## Setup Guide

### 1. Clone and Install

```bash
git clone https://github.com/rianvdm/raindrop-wordpress-linkblog-sync.git
cd raindrop-wordpress-linkblog-sync
npm install
```

### 2. Raindrop.io Setup

1. Go to [Raindrop.io App Settings](https://app.raindrop.io/settings/integrations)
2. Create a new **Test Token** (not OAuth app)
3. Copy the token - you'll need it for `RAINDROP_TOKEN`
4. Choose a tag name (e.g., "blog") for bookmarks you want to sync

### 3. WordPress Setup

1. Ensure your WordPress site has the REST API enabled (it is by default)
2. Create a user account for the sync service or use existing account
3. Generate an Application Password:
   - Go to WordPress Admin → Users → Your Profile
   - Scroll to "Application Passwords"
   - Create new password with name like "Raindrop Sync"
   - Copy the generated password (you won't see it again)
4. Verify your site supports the "link" post format:
   - Go to Appearance → Theme Features → Post Formats
   - Enable "Link" format if not already enabled

### 4. Configure Environment

Create a `.dev.vars` file for local development:

```bash
# .dev.vars (for local development only)
RAINDROP_TOKEN=your_raindrop_token_here
WP_USERNAME=your_wordpress_username
WP_APP_PASSWORD=your_wordpress_app_password
WP_ENDPOINT=https://yoursite.com/wp-json/wp/v2/posts
TRIGGER_TOKEN=a_secure_random_string_for_manual_triggers
```

Update `wrangler.toml`:

```toml
name = "your-sync-worker-name"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "SYNC_STATE"
id = "your_kv_namespace_id"
preview_id = "your_preview_kv_namespace_id"

[[kv_namespaces]]
binding = "RAINDROP_ERRORS"
id = "your_error_kv_namespace_id"
preview_id = "your_error_preview_kv_namespace_id"

[vars]
RAINDROP_TAG = "your_chosen_tag"  # e.g., "blog"

[triggers]
crons = ["0 * * * *"]  # Run every hour at minute 0
```

### 5. Create KV Namespaces

```bash
# Create production KV namespaces
npx wrangler kv:namespace create "SYNC_STATE"
npx wrangler kv:namespace create "RAINDROP_ERRORS"

# Create preview KV namespaces  
npx wrangler kv:namespace create "SYNC_STATE" --preview
npx wrangler kv:namespace create "RAINDROP_ERRORS" --preview

# Update the IDs in wrangler.toml with the returned namespace IDs
```

### 6. Deploy and Configure Secrets

```bash
# Deploy the worker
npm run deploy

# Set production secrets (replace with your actual values)
npx wrangler secret put RAINDROP_TOKEN
npx wrangler secret put WP_USERNAME  
npx wrangler secret put WP_APP_PASSWORD
npx wrangler secret put WP_ENDPOINT
npx wrangler secret put TRIGGER_TOKEN
```

### 7. Test the Setup

```bash
# Test locally first
npm run dev

# In another terminal, test the trigger endpoint
curl "http://localhost:8787/trigger?token=your_trigger_token&dry_run=true"

# Test in production (replace with your worker URL)
curl "https://your-worker.your-subdomain.workers.dev/trigger?token=your_trigger_token&dry_run=true"
```

## Usage

### Post Format

When a bookmark is synced, it creates a WordPress post with the "link" format using:

- **Post Title**: Uses the bookmark's title from Raindrop.io
- **Post Content**: 
  - Converts the bookmark's note (if any) from Markdown to HTML
  - Adds a formatted link at the bottom: `→ [Bookmark Title](URL)`
  - Example output:
    ```html
    <p>This is my note about the article, with <strong>markdown</strong> support.</p>
    <p>Read <a href="https://example.com" target="_blank" rel="noopener">Article Title</a> &#x2197;</p>
    ```
- **Post Status**: Published immediately (not draft)
- **Post Format**: Set to "link" for proper theme support
- **Deduplication**: Prevents creating duplicate posts for the same bookmark

### Automatic Sync

The worker runs automatically every hour. Tag any bookmark in Raindrop.io with your configured tag and it will be synced to WordPress on the next run.

### Manual Sync

Trigger a sync manually via the API:

```bash
# Basic sync
curl "https://your-worker.workers.dev/trigger?token=your_trigger_token"

# Dry run (test without creating posts)
curl "https://your-worker.workers.dev/trigger?token=your_trigger_token&dry_run=true"

# Sync specific tag
curl "https://your-worker.workers.dev/trigger?token=your_trigger_token&tag=different_tag"

# Limit number of items
curl "https://your-worker.workers.dev/trigger?token=your_trigger_token&limit=5"
```

### Reset Sync Timestamp

If you want to sync older bookmarks:

```bash
# Reset to sync bookmarks from last 90 days
curl "https://your-worker.workers.dev/reset-timestamp?token=your_trigger_token&days=90"
```

### View Errors

Check sync errors and logs:

```bash
curl "https://your-worker.workers.dev/errors?token=your_trigger_token"
```

### Clear Error Logs

Clear all error logs from storage:

```bash
curl -X POST "https://your-worker.workers.dev/clear-errors?token=your_trigger_token"
```

## API Endpoints

| Endpoint | Method | Parameters | Description |
|----------|--------|------------|-------------|
| `/trigger` | GET | `token`, `dry_run`, `tag`, `limit` | Trigger manual sync |
| `/reset-timestamp` | POST | `token`, `days` | Reset last sync timestamp |
| `/errors` | GET | `token` | View error logs |
| `/clear-errors` | POST | `token` | Clear all error logs |

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `RAINDROP_TOKEN` | ✅ | Raindrop.io API token |
| `WP_USERNAME` | ✅ | WordPress username |
| `WP_APP_PASSWORD` | ✅ | WordPress application password |
| `WP_ENDPOINT` | ✅ | WordPress REST API endpoint |
| `TRIGGER_TOKEN` | ✅ | Secure token for API access |
| `RAINDROP_TAG` | ✅ | Tag to filter bookmarks (set in wrangler.toml) |

### Cron Schedule

Default: `"0 * * * *"` (every hour at minute 0)

Common alternatives:
- `"0 */6 * * *"` - Every 6 hours
- `"0 9,17 * * *"` - Twice daily at 9 AM and 5 PM
- `"30 * * * *"` - Every hour at 30 minutes past

## Development

### Local Development

```bash
# Start local development server
npm run dev

# Run tests
npm test

# Run linting
npm run lint

# Type checking
npm run type-check
```

### Project Structure

```
src/
├── index.ts              # Main worker entry point
├── router.ts             # Request routing
├── middleware/           # Authentication middleware
├── services/             # Core business logic
│   ├── raindrop-client.ts    # Raindrop API client
│   ├── wordpress-client.ts   # WordPress API client
│   ├── sync-orchestrator.ts  # Main sync logic
│   ├── kv-storage.ts         # KV storage operations
│   ├── error-logger.ts       # Error logging
│   ├── markdown-processor.ts # Markdown conversion
│   └── content-builder.ts    # WordPress content formatting
├── utils/                # Utility functions
└── types/                # TypeScript type definitions
```

### Adding Features

1. Create feature branch: `git checkout -b feature/your-feature`
2. Implement changes with tests
3. Run test suite: `npm test`
4. Run linting: `npm run lint`
5. Commit and push changes
6. Create pull request

## GitHub Actions CI/CD

The project includes automated CI/CD:

1. **Required Secrets** in GitHub repository settings:
   - `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Workers edit permissions
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

2. **Automatic Deployment**: Pushes to `main` branch automatically deploy to production

3. **Pipeline Steps**:
   - Run tests
   - Type checking
   - Linting
   - Deploy to Cloudflare Workers

## Troubleshooting

### Common Issues

**"Authentication failed" errors:**
- Verify WordPress username and application password
- Check that WP_ENDPOINT URL is correct
- Ensure WordPress REST API is enabled

**"No bookmarks found" but bookmarks exist:**
- Verify RAINDROP_TAG matches your bookmark tags exactly
- Check that RAINDROP_TOKEN has correct permissions
- Try resetting the sync timestamp with `/reset-timestamp`

**Worker deployment fails:**
- Verify Cloudflare account ID and API token
- Check that KV namespace IDs in wrangler.toml are correct
- Ensure all required secrets are set

**Old bookmarks not syncing:**
- The sync only processes bookmarks modified after the last sync
- Use `/reset-timestamp?days=90` to sync older bookmarks
- Tag modification in Raindrop updates the `lastUpdate` field

### Monitoring

View worker logs in Cloudflare Dashboard:
1. Go to Workers & Pages
2. Click your worker name
3. View "Logs" tab for real-time debugging

Check error logs via API:
```bash
curl "https://your-worker.workers.dev/errors?token=your_trigger_token"
```

## Security

- All API endpoints require token authentication
- Secrets are stored securely in Cloudflare Workers
- CORS headers configured for browser access
- No sensitive data logged or exposed

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## Support

For issues and questions:
1. Check the [troubleshooting section](#troubleshooting)
2. Search [existing issues](https://github.com/your-username/raindrop-wordpress-sync/issues)
3. Create a new issue with detailed description

---

**Happy syncing!** 🔄📝