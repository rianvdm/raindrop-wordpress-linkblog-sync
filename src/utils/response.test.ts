import { describe, it, expect } from "vitest";
import { jsonResponse, errorResponse } from "./response";

describe("Response Utilities", () => {
  describe("jsonResponse", () => {
    it("should create JSON response with default status 200", async () => {
      const data = { message: "test" };
      const response = jsonResponse(data);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(await response.json()).toEqual(data);
    });

    it("should create JSON response with custom status", async () => {
      const data = { message: "created" };
      const response = jsonResponse(data, 201);

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual(data);
    });

    it("should include CORS headers", () => {
      const response = jsonResponse({});

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
        "GET, POST, OPTIONS"
      );
      expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
        "Content-Type"
      );
    });
  });

  describe("errorResponse", () => {
    it("should create error response with default status 500", async () => {
      const response = errorResponse("Something went wrong");

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Something went wrong" });
    });

    it("should create error response with custom status", async () => {
      const response = errorResponse("Not found", 404);

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Not found" });
    });

    it("should include CORS headers", () => {
      const response = errorResponse("Error");

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });
  });
});
