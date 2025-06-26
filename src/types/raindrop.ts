// ABOUTME: Raindrop.io API type definitions for bookmark items, responses, and error handling.
// ABOUTME: Defines the structure of bookmark data received from the Raindrop API for processing.
export interface RaindropItem {
  _id: string;
  title: string;
  note: string;
  link: string;
  created: string; // ISO 8601 timestamp
  lastUpdate: string; // ISO 8601 timestamp when last modified
  tags: string[];
  type: string;
  cover?: string;
  media?: any[];
  excerpt?: string;
}

export interface RaindropResponse {
  result: boolean;
  items: RaindropItem[];
  count: number;
  collectionId?: number;
}

export class RaindropError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = "RaindropError";
  }
}
