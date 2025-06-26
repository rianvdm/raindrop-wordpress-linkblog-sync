// ABOUTME: Tests for configuration service validation and parsing functionality.
// ABOUTME: Ensures environment variables are properly validated and parsed with appropriate error handling.

import { describe, it, expect, beforeEach } from "vitest";
import { ConfigService, getConfig } from "./config";
import { ConfigError } from "../types/config";

describe("ConfigService", () => {
  let configService: ConfigService;

  beforeEach(() => {
    configService = ConfigService.getInstance();
    configService.reset();
  });

  const validConfig = {
    RAINDROP_TOKEN: "test-raindrop-token",
    WP_USERNAME: "test-user",
    WP_APP_PASSWORD: "test-password",
    WP_ENDPOINT: "https://example.com/wp-json/wp/v2/posts",
    TRIGGER_TOKEN: "test-trigger-token",
    RAINDROP_TAG: "blog",
  };

  describe("parseConfig", () => {
    it("should parse valid configuration with defaults", () => {
      const config = configService.parseConfig(validConfig);

      expect(config).toEqual({
        raindropToken: "test-raindrop-token",
        wpUsername: "test-user",
        wpAppPassword: "test-password",
        wpEndpoint: "https://example.com/wp-json/wp/v2/posts",
        triggerToken: "test-trigger-token",
        raindropTag: "blog",
        maxRetries: 3,
        requestTimeout: 30000,
        maxItemsPerSync: 50,
        errorRetentionDays: 30,
        dryRun: false,
      });
    });

    it("should use custom values when provided", () => {
      const configWithCustomValues = {
        ...validConfig,
        MAX_RETRIES: "5",
        REQUEST_TIMEOUT: "60000",
        MAX_ITEMS_PER_SYNC: "100",
        ERROR_RETENTION_DAYS: "7",
        DRY_RUN: "true",
      };

      const config = configService.parseConfig(configWithCustomValues);

      expect(config.maxRetries).toBe(5);
      expect(config.requestTimeout).toBe(60000);
      expect(config.maxItemsPerSync).toBe(100);
      expect(config.errorRetentionDays).toBe(7);
      expect(config.dryRun).toBe(true);
    });

    it("should return cached config on subsequent calls", () => {
      const config1 = configService.parseConfig(validConfig);
      const config2 = configService.parseConfig({
        ...validConfig,
        MAX_RETRIES: "10", // Should be ignored
      });

      expect(config1).toBe(config2);
      expect(config2.maxRetries).toBe(3); // Original value
    });
  });

  describe("required field validation", () => {
    it("should throw error for missing RAINDROP_TOKEN", () => {
      const { RAINDROP_TOKEN: _RAINDROP_TOKEN, ...config } = validConfig;

      expect(() => configService.parseConfig(config)).toThrow(ConfigError);
      expect(() => configService.parseConfig(config)).toThrow(
        /Missing required configuration.*Raindrop API token/
      );
    });

    it("should throw error for missing WP_USERNAME", () => {
      const { WP_USERNAME: _WP_USERNAME, ...config } = validConfig;

      expect(() => configService.parseConfig(config)).toThrow(ConfigError);
      expect(() => configService.parseConfig(config)).toThrow(
        /Missing required configuration.*WordPress username/
      );
    });

    it("should throw error for missing WP_APP_PASSWORD", () => {
      const { WP_APP_PASSWORD: _WP_APP_PASSWORD, ...config } = validConfig;

      expect(() => configService.parseConfig(config)).toThrow(ConfigError);
      expect(() => configService.parseConfig(config)).toThrow(
        /Missing required configuration.*WordPress application password/
      );
    });

    it("should throw error for missing WP_ENDPOINT", () => {
      const { WP_ENDPOINT: _WP_ENDPOINT, ...config } = validConfig;

      expect(() => configService.parseConfig(config)).toThrow(ConfigError);
      expect(() => configService.parseConfig(config)).toThrow(
        /Missing required configuration.*WordPress REST API endpoint/
      );
    });

    it("should throw error for missing TRIGGER_TOKEN", () => {
      const { TRIGGER_TOKEN: _TRIGGER_TOKEN, ...config } = validConfig;

      expect(() => configService.parseConfig(config)).toThrow(ConfigError);
      expect(() => configService.parseConfig(config)).toThrow(
        /Missing required configuration.*API trigger token/
      );
    });

    it("should throw error for missing RAINDROP_TAG", () => {
      const { RAINDROP_TAG: _RAINDROP_TAG, ...config } = validConfig;

      expect(() => configService.parseConfig(config)).toThrow(ConfigError);
      expect(() => configService.parseConfig(config)).toThrow(
        /Missing required configuration.*Raindrop tag to sync/
      );
    });

    it("should throw error for empty string values", () => {
      const config = { ...validConfig, RAINDROP_TOKEN: "   " };

      expect(() => configService.parseConfig(config)).toThrow(ConfigError);
      expect(() => configService.parseConfig(config)).toThrow(
        /Missing required configuration/
      );
    });

    it("should handle multiple missing fields", () => {
      const {
        RAINDROP_TOKEN: _RAINDROP_TOKEN,
        WP_USERNAME: _WP_USERNAME,
        ...config
      } = validConfig;

      expect(() => configService.parseConfig(config)).toThrow(ConfigError);
      expect(() => configService.parseConfig(config)).toThrow(
        /Raindrop API token, WordPress username/
      );
    });
  });

  describe("URL validation", () => {
    it("should accept valid HTTPS WordPress endpoint", () => {
      const config = {
        ...validConfig,
        WP_ENDPOINT: "https://myblog.com/wp-json/wp/v2/posts",
      };

      expect(() => configService.parseConfig(config)).not.toThrow();
    });

    it("should accept valid HTTP WordPress endpoint", () => {
      const config = {
        ...validConfig,
        WP_ENDPOINT: "http://localhost:8080/wp-json/wp/v2/posts",
      };

      expect(() => configService.parseConfig(config)).not.toThrow();
    });

    it("should reject invalid URL format", () => {
      const config = {
        ...validConfig,
        WP_ENDPOINT: "not-a-url",
      };

      expect(() => configService.parseConfig(config)).toThrow(ConfigError);
      expect(() => configService.parseConfig(config)).toThrow(
        /WordPress endpoint must be a valid URL/
      );
    });

    it("should reject non-HTTP protocols", () => {
      const config = {
        ...validConfig,
        WP_ENDPOINT: "ftp://example.com/wp-json/wp/v2/posts",
      };

      expect(() => configService.parseConfig(config)).toThrow(ConfigError);
      expect(() => configService.parseConfig(config)).toThrow(
        /WordPress endpoint must be a valid HTTP\/HTTPS URL/
      );
    });

    it("should reject URLs without wp-json path", () => {
      const config = {
        ...validConfig,
        WP_ENDPOINT: "https://example.com/api/posts",
      };

      expect(() => configService.parseConfig(config)).toThrow(ConfigError);
      expect(() => configService.parseConfig(config)).toThrow(
        /WordPress endpoint must include '\/wp-json\/' path/
      );
    });
  });

  describe("number parsing", () => {
    it("should parse valid positive numbers", () => {
      const config = {
        ...validConfig,
        MAX_RETRIES: "5",
        REQUEST_TIMEOUT: "45000",
      };

      const result = configService.parseConfig(config);
      expect(result.maxRetries).toBe(5);
      expect(result.requestTimeout).toBe(45000);
    });

    it("should use defaults for invalid numbers", () => {
      const config = {
        ...validConfig,
        MAX_RETRIES: "invalid",
        REQUEST_TIMEOUT: "-100",
      };

      const result = configService.parseConfig(config);
      expect(result.maxRetries).toBe(3); // default
      expect(result.requestTimeout).toBe(30000); // default
    });

    it("should use defaults for empty values", () => {
      const config = {
        ...validConfig,
        MAX_RETRIES: "",
        REQUEST_TIMEOUT: "   ",
      };

      const result = configService.parseConfig(config);
      expect(result.maxRetries).toBe(3); // default
      expect(result.requestTimeout).toBe(30000); // default
    });
  });

  describe("boolean parsing", () => {
    it("should parse true values", () => {
      const testCases = ["true", "TRUE", "1", "yes", "YES"];

      testCases.forEach(value => {
        configService.reset();
        const config = { ...validConfig, DRY_RUN: value };
        const result = configService.parseConfig(config);
        expect(result.dryRun).toBe(true);
      });
    });

    it("should parse false values", () => {
      const testCases = ["false", "FALSE", "0", "no", "NO", "anything"];

      testCases.forEach(value => {
        configService.reset();
        const config = { ...validConfig, DRY_RUN: value };
        const result = configService.parseConfig(config);
        expect(result.dryRun).toBe(false);
      });
    });

    it("should use default for empty values", () => {
      const config = { ...validConfig, DRY_RUN: "" };
      const result = configService.parseConfig(config);
      expect(result.dryRun).toBe(false); // default
    });
  });

  describe("getConfig", () => {
    it("should return config after parseConfig is called", () => {
      const parsed = configService.parseConfig(validConfig);
      const retrieved = configService.getConfig();

      expect(retrieved).toBe(parsed);
    });

    it("should throw error if called before parseConfig", () => {
      expect(() => configService.getConfig()).toThrow(ConfigError);
      expect(() => configService.getConfig()).toThrow(
        /Configuration not initialized/
      );
    });
  });

  describe("convenience function", () => {
    it("should parse config when env provided", () => {
      const config = getConfig(validConfig);
      expect(config.raindropToken).toBe("test-raindrop-token");
    });

    it("should return existing config when no env provided", () => {
      const config1 = getConfig(validConfig);
      const config2 = getConfig();
      expect(config1).toBe(config2);
    });
  });

  describe("singleton behavior", () => {
    it("should return same instance", () => {
      const instance1 = ConfigService.getInstance();
      const instance2 = ConfigService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });
});
