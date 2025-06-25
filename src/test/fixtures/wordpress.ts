// ABOUTME: Test fixtures for WordPress API requests and responses used in unit tests.
// ABOUTME: Provides mock post data and payloads that match the WordPress REST API structure.
import { WordPressPost, CreatePostPayload } from '../../types/wordpress';

export const mockCreatePostPayload: CreatePostPayload = {
  title: 'Test Post',
  content: '<p>This is test content with <strong>markdown</strong></p><p>→ <a href="https://example.com" target="_blank" rel="noopener">Test Post</a></p>',
  status: 'publish',
  format: 'link',
};

export const mockWordPressPost: WordPressPost = {
  id: 123,
  date: '2024-01-01T12:00:00',
  date_gmt: '2024-01-01T12:00:00',
  guid: {
    rendered: 'https://example.com/?p=123'
  },
  modified: '2024-01-01T12:00:00',
  modified_gmt: '2024-01-01T12:00:00',
  slug: 'test-post',
  status: 'publish',
  type: 'post',
  link: 'https://example.com/test-post',
  title: {
    rendered: 'Test Post'
  },
  content: {
    rendered: '<p>This is test content</p>',
    protected: false
  },
  excerpt: {
    rendered: '',
    protected: false
  },
  author: 1,
  featured_media: 0,
  comment_status: 'open',
  ping_status: 'open',
  sticky: false,
  template: '',
  format: 'link',
  meta: [],
  categories: [1],
  tags: []
};

export const mockWordPressErrorResponse = {
  code: 'rest_invalid_param',
  message: 'Invalid parameter(s): title',
  data: {
    status: 400,
    params: {
      title: 'Title is required'
    }
  }
};

export const mockWordPressAuthErrorResponse = {
  code: 'rest_cannot_create',
  message: 'Sorry, you are not allowed to create posts as this user.',
  data: {
    status: 401
  }
};