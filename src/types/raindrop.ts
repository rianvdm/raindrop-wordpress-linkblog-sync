export interface RaindropItem {
  _id: string;
  title: string;
  note: string;
  link: string;
  created: string; // ISO 8601 timestamp
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
    this.name = 'RaindropError';
  }
}