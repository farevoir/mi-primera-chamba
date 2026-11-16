// Small text helpers shared by the scripts.

export function decode(s) {
  return String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

// HTML to readable multi-line text: block ends become line breaks, list items become "- ".
export function htmlToText(s) {
  return decode(String(s).replace(/<(br|\/p|\/li|\/h\d|\/div)[^>]*>/gi, '\n').replace(/<li[^>]*>/gi, '- ').replace(/<[^>]+>/g, ''))
    .replace(/\n{3,}/g, '\n\n').trim();
}

// HTML to a single line of text, for matching and checks.
export function plain(s) {
  return decode(String(s).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export function slug(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function day(ms) {
  return ms ? new Date(ms).toISOString().slice(0, 10) : 'date not shown';
}
