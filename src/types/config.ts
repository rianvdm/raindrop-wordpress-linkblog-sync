// ABOUTME: Configuration type definitions for environment variables and app settings.
// ABOUTME: Provides type safety and validation for all configuration values used throughout the application.

export interface Config {
  // Required environment variables
  raindropToken: string;
  wpUsername: string;
  wpAppPassword: string;
  wpEndpoint: string;
  triggerToken: string;
  raindropTag: string;

  // Optional configuration with defaults
  maxRetries: number;
  requestTimeout: number;
  maxItemsPerSync: number;
  errorRetentionDays: number;
  dryRun: boolean;
}

export interface RawConfig {
  // From environment/secrets
  RAINDROP_TOKEN?: string;
  WP_USERNAME?: string;
  WP_APP_PASSWORD?: string;
  WP_ENDPOINT?: string;
  TRIGGER_TOKEN?: string;
  RAINDROP_TAG?: string;

  // Optional overrides
  MAX_RETRIES?: string;
  REQUEST_TIMEOUT?: string;
  MAX_ITEMS_PER_SYNC?: string;
  ERROR_RETENTION_DAYS?: string;
  DRY_RUN?: string;
}

export class ConfigError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = "ConfigError";
  }
}

export const DEFAULT_CONFIG: Partial<Config> = {
  maxRetries: 3,
  requestTimeout: 30000, // 30 seconds
  maxItemsPerSync: 50,
  errorRetentionDays: 30,
  dryRun: false,
};
