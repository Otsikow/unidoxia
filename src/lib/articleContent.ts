import { marked } from 'marked';

// Browser and build share title removal and Markdown conversion. Each caller
// sanitizes the result with DOMPurify in its own DOM environment.
export function articleContent(post: { title: string; content_html?: string | null; content_md?: string | null }) {
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();
  let html = post.content_html?.trim() || (post.content_md ? marked.parse(post.content_md, { async: false }) as string : '');
  const match = html.match(/^\s*<h1[^>]*>([\s\S]*?)<\/h1>\s*/i);
  if (match && normalize(match[1].replace(/<[^>]+>/g, '')) === normalize(post.title)) html = html.slice(match[0].length);
  return html.replace(/<h1(\s[^>]*)?>/gi, '<h2$1>').replace(/<\/h1>/gi, '</h2>');
}
