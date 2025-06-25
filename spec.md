# Raindrop-to-WordPress Link Post Publisher

This Cloudflare Worker pulls new Raindrop.io items tagged `blog` and posts them as `link`-formatted blog posts to a self-hosted WordPress site.

---

## Architecture Overview

- **Platform:** Cloudflare Workers
- **Data Storage:** Cloudflare KV
- **Scheduling:** Cron trigger (hourly)
- **Manual Trigger:** Secure `GET /trigger` endpoint
- **Markdown Parsing:** `markdown-it` CommonMark parser
- **Error Logging:** Discord webhook
- **External APIs:**
  - [Raindrop.io API](https://developer.raindrop.io/)
  - WordPress REST API

---

## Functional Requirements

### Triggering

- **Automatic:** Runs hourly via Worker Cron Trigger.
- **Manual:** `GET /trigger?token=SECRET_TOKEN`
  - Requires secure token passed as a query parameter (`token`).
  - Only allowed when token matches `TRIGGER_TOKEN` environment variable.

---

### Raindrop.io Integration

- Uses Raindrop API to fetch bookmarks with a target tag (default: `blog`).
- Filters using `created > lastFetched` timestamp (stored in KV).
- Requests only the first page (no pagination).
- Deduplicates using Raindrop ID stored in KV.

**Fields Used:**
- `title`: Becomes blog post title.
- `note`: Markdown text → blog post body.
- `link`: Appended as a link to the post.
- `created`: Used for time window filtering.
- `tags`: Used to filter by tag.

---

### WordPress Integration

- Uses WordPress **REST API** with **Application Passwords** for authentication.
- Stores credentials securely in Worker secrets.

**Post Behavior:**
- Format: `link`
- Status:
  - `publish` in normal mode
  - `draft` if `DRY_RUN=true`
- Content:
  - HTML-converted `note` (from markdown)
  - Appended link in a separate paragraph:  
    `→ [Post Title](url)`

---

### Deduplication + State Tracking

**Cloudflare KV:**
- `raindrop:lastFetched`: ISO timestamp of last successful run
- `raindrop:posted:<raindrop_id>`: Marker to prevent reposting

**Logic:**
1. Query items with `created > lastFetched`.
2. For each item:
   - Check if `raindrop:posted:<id>` exists in KV.
   - If not, post to WordPress and store ID.
3. After successful loop, update `raindrop:lastFetched`.

---

## Environment Variables (Secrets and Config)

| Variable           | Description |
|--------------------|-------------|
| `RAINDROP_TOKEN`   | Personal access token for Raindrop.io API |
| `RAINDROP_TAG`     | Filter tag for bookmarks (default: `blog`) |
| `WP_USERNAME`      | WordPress user with Application Passwords enabled |
| `WP_APP_PASSWORD`  | The application password for the WordPress user |
| `WP_ENDPOINT`      | Base URL for WordPress site (e.g., `https://elezea.com/wp-json/wp/v2/posts`) |
| `DISCORD_WEBHOOK`  | Webhook URL for Discord error reporting |
| `DRY_RUN`          | Set to `true` to send posts as `draft` |
| `TRIGGER_TOKEN`    | Shared secret to secure the `/trigger` route |

---

## Error Handling

### Retries
- On WordPress API failure (non-2xx response), retry up to 3 times with exponential backoff.

### Logging
- On final failure, POST to `DISCORD_WEBHOOK` with:
  - Raindrop ID
  - HTTP status + message
  - Error type (e.g., network, auth)

---

## Testing Plan

1. **Setup Secrets:**
   - Set all ENV variables in Cloudflare dashboard.

2. **Test Fetching Only:**
   - Set `DRY_RUN=true`, `TRIGGER_TOKEN` set.
   - Add a test item to Raindrop with the `blog` tag.
   - Call `/trigger?token=...` manually and verify post is created as draft.

3. **Test Deduplication:**
   - Run twice in a row and verify no duplicate post is made.

4. **Test Failure Path:**
   - Temporarily use invalid WordPress credentials.
   - Confirm error is sent to Discord.

5. **Test Publish Flow:**
   - Set `DRY_RUN=false`.
   - Trigger sync again and verify post is published on the site.

6. **Test Security:**
   - Try calling `/trigger` without token → 403
   - Try calling with incorrect token → 403

---

## Future Enhancements

- Pagination support for Raindrop API
- Tag-to-format mapping (`tweet`, `note`, etc.)
- Support for other post metadata (excerpt, tags)
- OAuth-based auth for wider user use
- Webhook support if Raindrop.io adds push features

---