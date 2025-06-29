import { describe, it, expect, beforeEach, vi } from "vitest";
import { ErrorLogger } from "./error-logger";

describe("ErrorLogger", () => {
  let logger: ErrorLogger;
  let mockKV: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockKV = {
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      list: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    logger = new ErrorLogger(mockKV);
  });

  describe("logError", () => {
    it("should log Error objects", async () => {
      const error = new Error("Test error");
      error.stack = "Error: Test error\n    at test.js:1:1";

      await logger.logError(error, { userId: 123 });

      expect(mockKV.put).toHaveBeenCalledWith(
        expect.stringMatching(
          /^error:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z:/
        ),
        expect.stringContaining('"message":"Test error"'),
        { expirationTtl: 30 * 24 * 60 * 60 }
      );
    });

    it("should log string messages", async () => {
      await logger.logError("String error message");

      expect(mockKV.put).toHaveBeenCalledWith(
        expect.stringMatching(/^error:/),
        expect.stringContaining('"message":"String error message"'),
        { expirationTtl: 30 * 24 * 60 * 60 }
      );
    });

    it("should include context in log", async () => {
      const context = { operation: "sync", itemId: "abc123" };
      await logger.logError("Test error", context);

      const putCall = mockKV.put.mock.calls[0];
      const logData = JSON.parse(putCall[1]);
      expect(logData.context).toEqual(context);
    });

    it("should handle KV failures gracefully", async () => {
      mockKV.put.mockRejectedValue(new Error("KV error"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await logger.logError("Test error");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to log to KV:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("logWarning", () => {
    it("should log warning messages", async () => {
      await logger.logWarning("Warning message", { source: "test" });

      const putCall = mockKV.put.mock.calls[0];
      const logData = JSON.parse(putCall[1]);
      expect(logData.level).toBe("warning");
      expect(logData.message).toBe("Warning message");
    });
  });

  describe("logInfo", () => {
    it("should log info messages", async () => {
      await logger.logInfo("Info message");

      const putCall = mockKV.put.mock.calls[0];
      const logData = JSON.parse(putCall[1]);
      expect(logData.level).toBe("info");
      expect(logData.message).toBe("Info message");
    });
  });

  describe("getRecentErrors", () => {
    it("should retrieve and sort errors by timestamp", async () => {
      const mockErrors = [
        { name: "error:2024-01-01T10:00:00.000Z:abc123" },
        { name: "error:2024-01-01T11:00:00.000Z:def456" },
        { name: "error:2024-01-01T09:00:00.000Z:ghi789" },
      ];

      mockKV.list.mockResolvedValue({ keys: mockErrors });
      mockKV.get.mockImplementation((key: string) => {
        // Extract timestamp from key: error:2024-01-01T10:00:00.000Z:abc123
        const keyParts = key.split(":");
        const timestamp = `${keyParts[1]}:${keyParts[2]}:${keyParts[3]}`; // Reconstruct timestamp
        return Promise.resolve(
          JSON.stringify({
            timestamp,
            level: "error",
            message: `Error at ${timestamp}`,
          })
        );
      });

      const errors = await logger.getRecentErrors();

      expect(errors).toHaveLength(3);
      expect(errors[0].timestamp).toBe("2024-01-01T11:00:00.000Z"); // Newest first
      expect(errors[1].timestamp).toBe("2024-01-01T10:00:00.000Z");
      expect(errors[2].timestamp).toBe("2024-01-01T09:00:00.000Z");
    });

    it("should handle parsing errors gracefully", async () => {
      mockKV.list.mockResolvedValue({
        keys: [{ name: "error:2024-01-01T10:00:00.000Z:abc123" }],
      });
      mockKV.get.mockResolvedValue("invalid-json");
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const errors = await logger.getRecentErrors();

      expect(errors).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to parse error log for key:",
        expect.any(String),
        "Error:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it("should handle KV list failures", async () => {
      mockKV.list.mockRejectedValue(new Error("KV error"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const errors = await logger.getRecentErrors();

      expect(errors).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to retrieve error logs:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("clearOldErrors", () => {
    it("should delete errors older than specified days", async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35); // 35 days ago

      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 25); // 25 days ago

      mockKV.list.mockResolvedValue({
        keys: [{ name: "error:key1" }, { name: "error:key2" }],
      });

      mockKV.get.mockImplementation((key: string) => {
        if (key === "error:key1") {
          return Promise.resolve(
            JSON.stringify({
              timestamp: oldDate.toISOString(),
              level: "error",
              message: "Old error",
            })
          );
        } else {
          return Promise.resolve(
            JSON.stringify({
              timestamp: recentDate.toISOString(),
              level: "error",
              message: "Recent error",
            })
          );
        }
      });

      const deletedCount = await logger.clearOldErrors(30);

      expect(deletedCount).toBe(1);
      expect(mockKV.delete).toHaveBeenCalledWith("error:key1");
      expect(mockKV.delete).not.toHaveBeenCalledWith("error:key2");
    });

    it("should delete unparseable entries", async () => {
      mockKV.list.mockResolvedValue({
        keys: [{ name: "error:invalid" }],
      });
      mockKV.get.mockResolvedValue("invalid-json");

      const deletedCount = await logger.clearOldErrors();

      expect(deletedCount).toBe(1);
      expect(mockKV.delete).toHaveBeenCalledWith("error:invalid");
    });
  });
});
