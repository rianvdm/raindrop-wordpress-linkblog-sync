// ABOUTME: Configuration service that validates and parses environment variables into a typed configuration object.
// ABOUTME: Handles validation, default values, and provides clear error messages for missing or invalid configuration.

import {
  Config,
  RawConfig,
  ConfigError,
  DEFAULT_CONFIG,
} from "../types/config";

export class ConfigService {
  private static instance: ConfigService;
  private config: Config | null = null;

  private constructor() {}

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Parse and validate configuration from environment variables
   */
  parseConfig(env: RawConfig): Config {
    if (this.config) {
      return this.config;
    }

    // Validate required fields
    this.validateRequired(env);

    // Parse and validate URLs
    this.validateUrls(env);

    // Build configuration with defaults
    this.config = {
      raindropToken: env.RAINDROP_TOKEN!,
      wpUsername: env.WP_USERNAME!,
      wpAppPassword: env.WP_APP_PASSWORD!,
      wpEndpoint: env.WP_ENDPOINT!,
      triggerToken: env.TRIGGER_TOKEN!,
      raindropTag: env.RAINDROP_TAG!,
      maxRetries: this.parseNumber(env.MAX_RETRIES, DEFAULT_CONFIG.maxRetries!),
      requestTimeout: this.parseNumber(
        env.REQUEST_TIMEOUT,
        DEFAULT_CONFIG.requestTimeout!
      ),
      maxItemsPerSync: this.parseNumber(
        env.MAX_ITEMS_PER_SYNC,
        DEFAULT_CONFIG.maxItemsPerSync!
      ),
      errorRetentionDays: this.parseNumber(
        env.ERROR_RETENTION_DAYS,
        DEFAULT_CONFIG.errorRetentionDays!
      ),
      dryRun: this.parseBoolean(env.DRY_RUN, DEFAULT_CONFIG.dryRun!),
    };

    return this.config;
  }

  /**
   * Get current configuration (must call parseConfig first)
   */
  getConfig(): Config {
    if (!this.config) {
      throw new ConfigError(
        "Configuration not initialized. Call parseConfig() first."
      );
    }
    return this.config;
  }

  /**
   * Reset configuration (mainly for testing)
   */
  reset(): void {
    this.config = null;
  }

  private validateRequired(env: RawConfig): void {
    const requiredFields = [
      { key: "RAINDROP_TOKEN", name: "Raindrop API token" },
      { key: "WP_USERNAME", name: "WordPress username" },
      { key: "WP_APP_PASSWORD", name: "WordPress application password" },
      { key: "WP_ENDPOINT", name: "WordPress REST API endpoint" },
      { key: "TRIGGER_TOKEN", name: "API trigger token" },
      { key: "RAINDROP_TAG", name: "Raindrop tag to sync" },
    ] as const;

    const missing = requiredFields.filter(
      field => !env[field.key] || env[field.key]!.trim() === ""
    );

    if (missing.length > 0) {
      const missingNames = missing.map(field => field.name).join(", ");
      throw new ConfigError(
        `Missing required configuration: ${missingNames}. Please set the following environment variables: ${missing.map(f => f.key).join(", ")}`,
        missing[0].key
      );
    }
  }

  private validateUrls(env: RawConfig): void {
    // Validate WordPress endpoint URL
    if (env.WP_ENDPOINT) {
      try {
        const url = new URL(env.WP_ENDPOINT);
        if (!url.protocol.startsWith("http")) {
          throw new ConfigError(
            "WordPress endpoint must be a valid HTTP/HTTPS URL",
            "WP_ENDPOINT"
          );
        }
        if (!url.pathname.includes("/wp-json/")) {
          throw new ConfigError(
            "WordPress endpoint must include '/wp-json/' path (e.g., https://example.com/wp-json/wp/v2/posts)",
            "WP_ENDPOINT"
          );
        }
      } catch (error) {
        if (error instanceof ConfigError) {
          throw error;
        }
        throw new ConfigError(
          "WordPress endpoint must be a valid URL",
          "WP_ENDPOINT"
        );
      }
    }
  }

  private parseNumber(value: string | undefined, defaultValue: number): number {
    if (!value || value.trim() === "") {
      return defaultValue;
    }

    const parsed = parseInt(value.trim(), 10);
    if (isNaN(parsed) || parsed < 0) {
      return defaultValue;
    }

    return parsed;
  }

  private parseBoolean(
    value: string | undefined,
    defaultValue: boolean
  ): boolean {
    if (!value || value.trim() === "") {
      return defaultValue;
    }

    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
}

/**
 * Convenience function to get configured instance
 */
export function getConfig(env?: RawConfig): Config {
  const service = ConfigService.getInstance();
  if (env) {
    return service.parseConfig(env);
  }
  return service.getConfig();
}
