export function formatLinkPost(content: string, title: string, url: string): string {
  // Start with the processed content (already HTML from markdown)
  let formattedContent = content.trim();
  
  // Add a paragraph break if content exists
  if (formattedContent && !formattedContent.endsWith('</p>')) {
    formattedContent += '\n\n';
  } else if (formattedContent.endsWith('</p>')) {
    formattedContent += '\n';
  }
  
  // Add the link in the WordPress standard format for link posts
  formattedContent += `<p>→ <a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(title)}</a></p>`;
  
  return formattedContent;
}

function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  
  return text.replace(/[&<>"']/g, (match) => htmlEscapes[match]);
}