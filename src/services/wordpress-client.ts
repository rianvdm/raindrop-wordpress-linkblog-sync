// ABOUTME: WordPress REST API client that creates link posts with retry logic and authentication.
// ABOUTME: Handles post creation with proper formatting and robust error handling for reliable publishing.
import {
  WordPressPost,
  CreatePostPayload,
  WordPressError,
} from "../types/wordpress";
import { retryWithBackoff } from "../utils/retry";

export class WordPressClient {
  private endpoint: string;
  private username: string;
  private password: string;

  constructor(endpoint: string, username: string, password: string) {
    // Ensure endpoint ends with posts
    this.endpoint = endpoint.endsWith("/posts")
      ? endpoint
      : `${endpoint}/posts`;
    this.username = username;
    this.password = password;
  }

  private generateAuthHeader(): string {
    const credentials = btoa(`${this.username}:${this.password}`);
    return `Basic ${credentials}`;
  }

  async createPost(payload: CreatePostPayload): Promise<WordPressPost> {
    return retryWithBackoff(async () => {
      try {
        const response = await fetch(this.endpoint, {
          method: "POST",
          headers: {
            Authorization: this.generateAuthHeader(),
            "Content-Type": "application/json",
            "User-Agent": "RaindropWordPressSync/1.0 (Automated Link Sync Bot)",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          let errorData: any;
          try {
            errorData = await response.json();
          } catch {
            // Clone the response to avoid "Body has already been used" error
            const clonedResponse = response.clone();
            errorData = { message: await clonedResponse.text() };
          }

          throw new WordPressError(
            errorData.message || `WordPress API error: ${response.statusText}`,
            response.status,
            errorData.code,
            errorData
          );
        }

        const post: WordPressPost = await response.json();

        // Validate response has required fields
        if (!post.id || !post.link || !post.title) {
          throw new WordPressError(
            "Invalid response from WordPress API: missing required fields",
            undefined,
            "invalid_response",
            post
          );
        }

        return post;
      } catch (error) {
        if (error instanceof WordPressError) {
          throw error;
        }

        if (error instanceof Error) {
          throw new WordPressError(
            `Failed to create WordPress post: ${error.message}`
          );
        }

        throw new WordPressError(
          "Unknown error occurred while creating WordPress post"
        );
      }
    });
  }
}
