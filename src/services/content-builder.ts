import { MarkdownProcessor } from './markdown-processor';
import { formatLinkPost } from '../utils/link-formatter';

export class ContentBuilder {
  private markdownProcessor: MarkdownProcessor;

  constructor() {
    this.markdownProcessor = new MarkdownProcessor();
  }

  buildPostContent(note: string, title: string, link: string): string {
    // Process markdown note to HTML
    const processedContent = this.markdownProcessor.processMarkdown(note || '');
    
    // Format as link post with the original URL
    return formatLinkPost(processedContent, title, link);
  }
}