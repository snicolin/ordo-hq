const ALLOWED_TAGS = new Set([
  "p",
  "ul", "ol", "li",
  "a", "strong", "b", "em", "i", "u", "br", "hr",
]);

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

function walkNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent ?? "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  // Downgrade headings to paragraphs
  if (HEADING_TAGS.has(tag)) {
    const p = doc.createElement("p");
    for (const child of Array.from(el.childNodes)) {
      const result = walkNode(child, doc);
      if (result) p.appendChild(result);
    }
    return p;
  }

  if (ALLOWED_TAGS.has(tag)) {
    const clean = doc.createElement(tag);

    if (tag === "a") {
      const href = el.getAttribute("href");
      if (href) clean.setAttribute("href", href);
    }

    for (const child of Array.from(el.childNodes)) {
      const result = walkNode(child, doc);
      if (result) clean.appendChild(result);
    }
    return clean;
  }

  // Unwrap: keep children, drop the tag
  const fragment = doc.createDocumentFragment();
  for (const child of Array.from(el.childNodes)) {
    const result = walkNode(child, doc);
    if (result) fragment.appendChild(result);
  }
  return fragment.childNodes.length > 0 ? fragment : null;
}

export function sanitizeHtml(html: string): string {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, "text/html");
  const doc = parsed.implementation.createHTMLDocument();
  const container = doc.createElement("div");

  for (const child of Array.from(parsed.body.childNodes)) {
    const result = walkNode(child, doc);
    if (result) container.appendChild(result);
  }

  return container.innerHTML;
}
