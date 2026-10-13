export function videoEmbedUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    const id = host === "youtu.be" ? url.pathname.slice(1) : ["youtube.com", "www.youtube.com", "www.youtube-nocookie.com"].includes(host) ? (url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)$/)?.[1]) : null;
    if (id && /^[\w-]{11}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
    const vimeo = ["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(host) ? url.pathname.match(/^\/(?:video\/)?(\d+)$/)?.[1] : null;
    return vimeo ? `https://player.vimeo.com/video/${vimeo}` : null;
  } catch { return null; }
}
export function safeMediaUrl(value: string): boolean {
  return /^https:\/\/[^\s<>"'\\]+$/i.test(value) || /^\/(?!\/)[^\s<>"'\\]*$/.test(value);
}
const escapeAttribute = (value: string) => value.replace(/&(?!(?:amp|quot|lt|gt|#39);)/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const ALLOWED_TAGS = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h1", "h2", "h3", "h4", "blockquote", "a", "table", "thead", "tbody", "tr", "th", "td", "span", "div", "img", "video", "iframe"]);
const DROP_CONTENT_TAGS = /<(script|style|object|embed|svg|math|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;

/** Allowlist the small set of rich text markup supported by the content page editor. */
export function sanitizeRichText(input: string): string {
  const source = input.slice(0, 100000).replace(DROP_CONTENT_TAGS, "").replace(/<!--[\s\S]*?-->/g, "").replace(/<font\b([^>]*)>/gi, (_tag, rawAttrs: string) => {
    const styles: string[] = [];
    const face = rawAttrs.match(/\bface\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const color = rawAttrs.match(/\bcolor\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const faceValue = (face?.[1] ?? face?.[2] ?? face?.[3] ?? "").trim();
    const colorValue = (color?.[1] ?? color?.[2] ?? color?.[3] ?? "").trim();
    if (/^[a-z0-9 ,"'-]{1,80}$/i.test(faceValue)) styles.push(`font-family:${faceValue}`);
    if (/^(#[0-9a-f]{3,8}|[a-z]{3,20})$/i.test(colorValue)) styles.push(`color:${colorValue}`);
    return `<span${styles.length ? ` style="${escapeAttribute(styles.join(";"))}"` : ""}>`;
  }).replace(/<\/font\s*>/gi, "</span>");
  return source.replace(/<[^>]*>|[^<]+/g, (token) => {
    if (!token.startsWith("<")) return token.replace(/\u0000/g, "");
    const closing = /^<\s*\//.test(token);
    const match = token.match(/^<\s*\/?\s*([a-z0-9]+)/i);
    if (!match) return "";
    const tag = match[1].toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (closing) return ["br", "img"].includes(tag) ? "" : `</${tag}>`;
    if (tag === "br") return "<br>";
    const attrs: string[] = [];
    const attr = (name: string) => { const match = token.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i")); return (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim(); };
    if (["img", "video", "iframe"].includes(tag)) {
      const src = attr("src");
      if (!safeMediaUrl(src) || (tag === "iframe" && videoEmbedUrl(src) !== src)) return "";
      attrs.push(`src="${escapeAttribute(src)}"`);
      if (tag === "img") attrs.push(`alt="${escapeAttribute(attr("alt").slice(0, 300))}"`, 'loading="lazy"');
      if (tag === "video") attrs.push("controls", 'preload="metadata"');
      if (tag === "iframe") attrs.push(`title="${escapeAttribute(attr("title") || "Embedded video")}"`, 'loading="lazy"', 'allowfullscreen', 'referrerpolicy="strict-origin-when-cross-origin"');
    }

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
        if (!value || /["\\]|url\s*\(|expression|[<>]/i.test(value)) return [];
        if (["img", "video", "iframe"].includes(tag)) {
          if (name === "width" && /^(?:[1-9]\d?|100)%$|^[1-9]\d{0,3}px$/.test(value)) return [`width:${value}`];
          if (name === "max-width" && value === "100%") return ["max-width:100%"];
          if (name === "height" && value === "auto") return ["height:auto"];
          if (name === "display" && value === "block") return ["display:block"];
          if (["margin-left", "margin-right"].includes(name) && /^(auto|0|0px)$/.test(value)) return [`${name}:${value}`];
          if (name === "aspect-ratio" && value === "16 / 9") return ["aspect-ratio:16 / 9"];
        }
        if (name === "text-align" && /^(left|right|center|justify)$/i.test(value)) return [`text-align:${value}`];
        if ((name === "color" || name === "background-color") && /^(#[0-9a-f]{3,8}|[a-z]{3,20}|rgba?\([\d\s.,%]+\))$/i.test(value)) return [`${name}:${value}`];
        if (name === "font-family" && /^[a-z0-9 ,"'-]{1,80}$/i.test(value)) return [`font-family:${value}`];
        return [];
      });
      if (declarations.length) attrs.push(`style="${escapeAttribute(declarations.join(";"))}"`);
    }
    return `<${tag}${attrs.length ? ` ${attrs.join(" ")}` : ""}>`;
  });
}
