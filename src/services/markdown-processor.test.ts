import { describe, it, expect, beforeEach } from 'vitest';
import { MarkdownProcessor } from './markdown-processor';

describe('MarkdownProcessor', () => {
  let processor: MarkdownProcessor;

  beforeEach(() => {
    processor = new MarkdownProcessor();
  });

  it('should process basic markdown', () => {
    const markdown = '# Heading\n\nThis is **bold** text.';
    const result = processor.processMarkdown(markdown);
    
    expect(result).toContain('<h1>Heading</h1>');
    expect(result).toContain('<strong>bold</strong>');
  });

  it('should handle empty input', () => {
    expect(processor.processMarkdown('')).toBe('');
    expect(processor.processMarkdown(null as any)).toBe('');
    expect(processor.processMarkdown(undefined as any)).toBe('');
  });

  it('should process links', () => {
    const markdown = 'Check out [this link](https://example.com)';
    const result = processor.processMarkdown(markdown);
    
    expect(result).toContain('<a href="https://example.com">this link</a>');
  });

  it('should auto-link URLs', () => {
    const markdown = 'Visit https://example.com for more info';
    const result = processor.processMarkdown(markdown);
    
    expect(result).toContain('<a href="https://example.com">https://example.com</a>');
  });

  it('should process code blocks', () => {
    const markdown = '```javascript\nconsole.log("hello");\n```';
    const result = processor.processMarkdown(markdown);
    
    expect(result).toContain('<pre><code class="language-javascript">');
    expect(result).toContain('console.log(&quot;hello&quot;);');
  });

  it('should process inline code', () => {
    const markdown = 'Use the `console.log()` function';
    const result = processor.processMarkdown(markdown);
    
    expect(result).toContain('<code>console.log()</code>');
  });

  it('should process lists', () => {
    const markdown = '- Item 1\n- Item 2\n- Item 3';
    const result = processor.processMarkdown(markdown);
    
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>Item 1</li>');
    expect(result).toContain('<li>Item 2</li>');
  });

  it('should process blockquotes', () => {
    const markdown = '> This is a quote';
    const result = processor.processMarkdown(markdown);
    
    expect(result).toContain('<blockquote>');
    expect(result).toContain('<p>This is a quote</p>');
  });

  it('should handle malformed markdown gracefully', () => {
    const markdown = '**unclosed bold';
    const result = processor.processMarkdown(markdown);
    
    // Should still produce some output, even if not perfect
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('should trim whitespace', () => {
    const markdown = '  \n\n  # Heading  \n\n  ';
    const result = processor.processMarkdown(markdown);
    
    expect(result).toContain('<h1>Heading</h1>');
    expect(result).not.toMatch(/^\s+/); // Should not start with whitespace
  });

  it('should enable typographer features', () => {
    const markdown = '"Hello" and (c) 2024';
    const result = processor.processMarkdown(markdown);
    
    // Just verify it processes without error and contains the content
    expect(result).toBeTruthy();
    expect(result).toContain('Hello');
    expect(result).toContain('2024');
  });
});