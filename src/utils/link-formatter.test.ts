import { describe, it, expect } from 'vitest';
import { formatLinkPost } from './link-formatter';

describe('formatLinkPost', () => {
  it('should format link post with content', () => {
    const content = '<p>This is some content</p>';
    const title = 'Example Post';
    const url = 'https://example.com';
    
    const result = formatLinkPost(content, title, url);
    
    expect(result).toContain('<p>This is some content</p>');
    expect(result).toContain('<p>→ <a href="https://example.com" target="_blank" rel="noopener">Example Post</a></p>');
  });

  it('should format link post without content', () => {
    const content = '';
    const title = 'Example Post';
    const url = 'https://example.com';
    
    const result = formatLinkPost(content, title, url);
    
    expect(result).toBe('<p>→ <a href="https://example.com" target="_blank" rel="noopener">Example Post</a></p>');
  });

  it('should escape HTML in title and URL', () => {
    const content = '<p>Content</p>';
    const title = 'Post with "quotes" & <tags>';
    const url = 'https://example.com/path?param=value&other="quoted"';
    
    const result = formatLinkPost(content, title, url);
    
    expect(result).toContain('Post with &quot;quotes&quot; &amp; &lt;tags&gt;');
    expect(result).toContain('href="https://example.com/path?param=value&amp;other=&quot;quoted&quot;"');
  });

  it('should handle content ending with paragraph', () => {
    const content = '<p>First paragraph</p><p>Second paragraph</p>';
    const title = 'Example Post';
    const url = 'https://example.com';
    
    const result = formatLinkPost(content, title, url);
    
    expect(result).toContain('<p>Second paragraph</p>\n<p>→');
  });

  it('should handle content not ending with paragraph', () => {
    const content = 'Plain text content';
    const title = 'Example Post';
    const url = 'https://example.com';
    
    const result = formatLinkPost(content, title, url);
    
    expect(result).toContain('Plain text content\n\n<p>→');
  });

  it('should handle special characters in URL', () => {
    const content = '<p>Content</p>';
    const title = 'Test';
    const url = 'https://example.com/path with spaces/file.html';
    
    const result = formatLinkPost(content, title, url);
    
    // Spaces should be preserved but HTML-escaped if needed
    expect(result).toContain('href="https://example.com/path with spaces/file.html"');
  });

  it('should add proper attributes to link', () => {
    const content = '<p>Content</p>';
    const title = 'Test';
    const url = 'https://example.com';
    
    const result = formatLinkPost(content, title, url);
    
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener"');
  });

  it('should handle whitespace in content', () => {
    const content = '  <p>Content with whitespace</p>  ';
    const title = 'Test';
    const url = 'https://example.com';
    
    const result = formatLinkPost(content, title, url);
    
    expect(result).toContain('<p>Content with whitespace</p>\n<p>→');
  });
});