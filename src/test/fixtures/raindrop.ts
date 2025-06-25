import { RaindropItem, RaindropResponse } from '../../types/raindrop';

export const mockRaindropItem: RaindropItem = {
  _id: '123456789',
  title: 'Test Bookmark',
  note: 'This is a test note with **markdown**',
  link: 'https://example.com/test',
  created: '2024-01-01T12:00:00.000Z',
  tags: ['blog', 'test'],
  type: 'link',
  excerpt: 'Test excerpt',
};

export const mockRaindropResponse: RaindropResponse = {
  result: true,
  items: [
    mockRaindropItem,
    {
      _id: '987654321',
      title: 'Another Bookmark',
      note: 'Another note',
      link: 'https://example.com/another',
      created: '2024-01-02T12:00:00.000Z',
      tags: ['blog'],
      type: 'link',
    },
  ],
  count: 2,
};

export const mockEmptyResponse: RaindropResponse = {
  result: true,
  items: [],
  count: 0,
};

export const mockErrorResponse = {
  result: false,
  error: 'Invalid token',
  errorMessage: 'Authentication failed',
};

export const mockInvalidResponse = {
  result: true,
  items: 'not-an-array', // Invalid structure
  count: 0,
};

export const mockItemMissingFields: RaindropItem = {
  _id: '111111111',
  title: '', // Empty title
  note: 'Note without title',
  link: '', // Empty link
  created: '2024-01-03T12:00:00.000Z',
  tags: ['blog'],
  type: 'link',
};