// Assainissement du HTML produit par l'éditeur WYSIWYG du backoffice (conseils, pages d'aide et légales).
// Liste blanche stricte : aucun script, style, attribut d'événement ni schéma javascript:/data:.
import sanitizeHtml from 'sanitize-html';

const OPTIONS = {
  allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'a', 'hr', 'code', 'pre', 'span'],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowProtocolRelative: false,
  transformTags: {
    a: (tag, attribs) => ({ tagName: 'a', attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' } }),
  },
};

export function cleanHtml(html) {
  return sanitizeHtml(String(html == null ? '' : html), OPTIONS);
}
