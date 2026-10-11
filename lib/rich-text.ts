const ALLOWED_TAGS = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h1", "h2", "h3", "h4", "blockquote", "a", "table", "thead", "tbody", "tr", "th", "td", "span", "div"]);
const DROP_CONTENT_TAGS = /<(script|style|iframe|object|embed|svg|math|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;

/** Allowlist the small set of rich text markup supported by the content page editor. */
export function sanitizeRichText(input: string): string {
  const source = input.slice(0, 100000).replace(DROP_CONTENT_TAGS, "").replace(/<!--[\s\S]*?-->/g, "");
  return source.replace(/<[^>]*>|[^<]+/g, (token) => {
    if (!token.startsWith("<")) return token.replace(/\u0000/g, "");
    const closing = /^<\s*\//.test(token);
    const match = token.match(/^<\s*\/?\s*([a-z0-9]+)/i);
    if (!match) return "";
    const tag = match[1].toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (closing) return ["br"].includes(tag) ? "" : `</${tag}>`;
    if (tag === "br") return "<br>";
    const attrs: string[] = [];
    const href = token.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    if (tag === "a" && href) {
      const value = (href[1] ?? href[2] ?? href[3] ?? "").trim();
      if (/^(https?:|mailto:|#)/i.test(value)) attrs.push(`href="${value.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"`);
    }
    const style = token.match(/\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    if (style) {
      const declarations = (style[1] ?? style[2] ?? "").split(";").flatMap((part) => {
        const [rawName, ...rawValue] = part.split(":");
        const name = rawName?.trim().toLowerCase();
        const value = rawValue.join(":").trim();
        if (!value || /url\s*\(|expression|[<>]/i.test(value)) return [];
        if (name === "text-align" && /^(left|right|center|justify)$/i.test(value)) return [`text-align:${value}`];
        if ((name === "color" || name === "background-color") && /^(#[0-9a-f]{3,8}|[a-z]{3,20}|rgba?\([\d\s.,%]+\))$/i.test(value)) return [`${name}:${value}`];
        if (name === "font-family" && /^[a-z0-9 ,"'-]{1,80}$/i.test(value)) return [`font-family:${value}`];
        return [];
      });
      if (declarations.length) attrs.push(`style="${declarations.join(";")}"`);
    }
    return `<${tag}${attrs.length ? ` ${attrs.join(" ")}` : ""}>`;
  });
}
