import MarkdownIt from 'markdown-it';

export class MarkdownProcessor {
  private md: MarkdownIt;

  constructor() {
    this.md = new MarkdownIt({
      html: true,        // Enable HTML tags in source
      xhtmlOut: false,   // Use "/" to close single tags (<br />)
      breaks: false,     // Convert '\n' in paragraphs into <br>
      langPrefix: 'language-',  // CSS language prefix for fenced blocks
      linkify: true,     // Autoconvert URL-like text to links
      typographer: true, // Enable some language-neutral replacement + quotes beautification
    });
  }

  processMarkdown(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    try {
      return this.md.render(text.trim());
    } catch (error) {
      console.error('Error processing markdown:', error);
      // Fall back to plain text with line breaks converted to <br>
      return text.replace(/\n/g, '<br>');
    }
  }
}