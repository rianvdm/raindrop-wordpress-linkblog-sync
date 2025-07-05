import { describe, it, expect, beforeEach } from "vitest";
import { ContentBuilder } from "./content-builder";

describe("ContentBuilder", () => {
  let builder: ContentBuilder;

  beforeEach(() => {
    builder = new ContentBuilder();
  });

  it("should build post content with markdown note", () => {
    const note = "# Heading\n\nThis is **bold** text.";
    const title = "Example Post";
    const link = "https://example.com";

    const result = builder.buildPostContent(note, title, link);

    expect(result).toContain("<h1>Heading</h1>");
    expect(result).toContain("<strong>bold</strong>");
    expect(result).toContain(
      '<p>Source: <a href="https://example.com" target="_blank" rel="noopener">Example Post</a> →</p>'
    );
  });

  it("should build post content without note", () => {
    const note = "";
    const title = "Example Post";
    const link = "https://example.com";

    const result = builder.buildPostContent(note, title, link);

    expect(result).toBe(
      '<p>Source: <a href="https://example.com" target="_blank" rel="noopener">Example Post</a> →</p>'
    );
  });

  it("should handle null note", () => {
    const note = null as any;
    const title = "Example Post";
    const link = "https://example.com";

    const result = builder.buildPostContent(note, title, link);

    expect(result).toBe(
      '<p>Source: <a href="https://example.com" target="_blank" rel="noopener">Example Post</a> →</p>'
    );
  });

  it("should process complex markdown", () => {
    const note = `# Article Summary

This article covers:

- Point 1
- Point 2
- Point 3

> Important quote from the article

Check out the [author's website](https://author.com) for more info.

\`\`\`javascript
console.log("Code example");
\`\`\``;

    const title = "Complex Article";
    const link = "https://example.com/article";

    const result = builder.buildPostContent(note, title, link);

    expect(result).toContain("<h1>Article Summary</h1>");
    expect(result).toContain("<ul>");
    expect(result).toContain("<li>Point 1</li>");
    expect(result).toContain("<blockquote>");
    expect(result).toContain("author");
    expect(result).toContain('<pre><code class="language-javascript">');
    expect(result).toContain(
      '<p>Source: <a href="https://example.com/article" target="_blank" rel="noopener">Complex Article</a> →</p>'
    );
  });

  it("should handle special characters in title and link", () => {
    const note = "Simple note";
    const title = 'Article with "quotes" & <special> chars';
    const link = 'https://example.com/path?param=value&other="quoted"';

    const result = builder.buildPostContent(note, title, link);

    expect(result).toContain(
      "Article with &quot;quotes&quot; &amp; &lt;special&gt; chars"
    );
    expect(result).toContain(
      'href="https://example.com/path?param=value&amp;other=&quot;quoted&quot;"'
    );
  });
});
