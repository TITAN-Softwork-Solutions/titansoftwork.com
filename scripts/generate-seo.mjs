import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const publicDir = path.join(rootDir, "public");
const blogContentDir = path.join(publicDir, "content", "blog");
const blogDir = path.join(rootDir, "blog");
const docsBlogDir = path.join(rootDir, "docs", "blog");

const paths = {
  cname: path.join(rootDir, "CNAME"),
  homeHtml: path.join(rootDir, "index.html"),
  blogHtml: path.join(blogDir, "index.html"),
  blogTemplate: path.join(blogDir, "index.html"),
  docsBlogTemplate: path.join(docsBlogDir, "index.html"),
  manifest: path.join(blogContentDir, "manifest.json"),
  sitemap: path.join(publicDir, "sitemap.xml"),
  robots: path.join(publicDir, "robots.txt"),
};

const GENERATED_MARKER = "<!-- AUTO-GENERATED BLOG POST PAGE -->";

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function fileDateISO(filePath) {
  const stat = fs.statSync(filePath);
  return stat.mtime.toISOString().slice(0, 10);
}

function parseDdMmYyyyToIso(value) {
  const match = String(value || "").trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function parsePostDate(markdownText) {
  const match = markdownText.match(/^\$DATE\s+([^\r\n]+)$/im);
  if (!match) return null;
  return parseDdMmYyyyToIso(match[1]);
}

function stripQuotes(value) {
  const trimmed = String(value || "").trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseMetaValue(markdownText, key) {
  const pattern = new RegExp(`^\\$${key}\\s+([^\\r\\n]+)$`, "im");
  const match = markdownText.match(pattern);
  return match ? stripQuotes(match[1]) : "";
}

function getSiteOrigin() {
  const cname = readText(paths.cname).trim().replace(/^https?:\/\//i, "");
  return `https://${cname}`;
}

function slugFromManifestPath(fileName) {
  const normalized = String(fileName || "").replace(/\\/g, "/").replace(/\.md$/i, "");
  const parts = normalized.split("/").filter(Boolean);
  const last = parts[parts.length - 1] || "";
  if (last.toLowerCase() === "index" && parts.length >= 2) return parts[parts.length - 2];
  return last;
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function htmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugToDisplayTitle(slug) {
  return String(slug || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function buildExcerpt(markdownText, previewText) {
  const preview = stripQuotes(previewText || "").trim();
  if (preview) return preview.slice(0, 300);

  const src = String(markdownText || "")
    .replace(/^\$[^\r\n]*$/gm, "")
    .replace(/```[\s\S]*?```/g, "\n")
    .replace(/#+\s+/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return src.slice(0, 300);
}

function resolveThumbUrl(thumb, postPath) {
  if (!thumb) return "";
  if (/^(https?:|data:|\/)/i.test(thumb)) return thumb;
  const parts = String(postPath || "").replace(/\\/g, "/").split("/").filter(Boolean);
  parts.pop();
  const subDir = parts.length ? `${parts.join("/")}/` : "";
  return `/content/blog/${subDir}${thumb}`;
}

function replaceTag(html, pattern, replacement) {
  if (pattern.test(html)) return html.replace(pattern, replacement);
  return html;
}

function buildPostHtml(templateHtml, origin, post) {
  const canonical = `${origin}/blog/${encodeURIComponent(post.slug)}/`;
  const title = `${post.title} | TITAN Insights`;
  const description = post.description || "Research notes and engineering insights from TITAN Softwork Solutions.";
  const imageUrl = post.thumbResolved
    ? (post.thumbResolved.startsWith("http") ? post.thumbResolved : `${origin}${post.thumbResolved}`)
    : "";

  let html = templateHtml;
  html = replaceTag(html, /<title>[\s\S]*?<\/title>/i, `<title>${htmlEscape(title)}</title>`);
  html = replaceTag(
    html,
    /<meta\s+name="description"[\s\S]*?>/i,
    `<meta name="description" content="${htmlEscape(description)}" />`
  );
  html = replaceTag(
    html,
    /<link\s+rel="canonical"[\s\S]*?>/i,
    `<link rel="canonical" href="${htmlEscape(canonical)}" />`
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:title"[\s\S]*?>/i,
    `<meta property="og:title" content="${htmlEscape(title)}" />`
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:url"[\s\S]*?>/i,
    `<meta property="og:url" content="${htmlEscape(canonical)}" />`
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:description"[\s\S]*?>/i,
    `<meta property="og:description" content="${htmlEscape(description)}" />`
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:type"[\s\S]*?>/i,
    `<meta property="og:type" content="article" />`
  );
  html = replaceTag(
    html,
    /<meta\s+name="twitter:card"[\s\S]*?>/i,
    `<meta name="twitter:card" content="${imageUrl ? "summary_large_image" : "summary"}" />`
  );
  html = replaceTag(
    html,
    /<meta\s+name="twitter:title"[\s\S]*?>/i,
    `<meta name="twitter:title" content="${htmlEscape(title)}" />`
  );
  html = replaceTag(
    html,
    /<meta\s+name="twitter:description"[\s\S]*?>/i,
    `<meta name="twitter:description" content="${htmlEscape(description)}" />`
  );

  if (!/<link\s+rel="canonical"/i.test(html)) {
    html = html.replace(
      /(<meta\s+name="robots"[\s\S]*?>)/i,
      `$1\n    <link rel="canonical" href="${htmlEscape(canonical)}" />`
    );
  }
  if (!/<meta\s+property="og:url"/i.test(html)) {
    html = html.replace(
      /(<meta\s+property="og:title"[\s\S]*?>)/i,
      `$1\n    <meta property="og:url" content="${htmlEscape(canonical)}" />`
    );
  }

  html = html.replace(
    /if\s*\(location\.search\.includes\("post="\)\)\s*\{\s*document\.documentElement\.classList\.add\("is-blog-post"\);\s*\}/m,
    `const blogPathParts = location.pathname.split("/").filter(Boolean);
      const isPathPost = blogPathParts[0] === "blog" && blogPathParts.length === 2;
      if (location.search.includes("post=") || isPathPost) {
        document.documentElement.classList.add("is-blog-post");
      }`
  );

  html = html.replace(/^\s*<meta\s+property="og:image"[\s\S]*?>\s*$/gim, "");
  html = html.replace(/^\s*<meta\s+name="twitter:image"[\s\S]*?>\s*$/gim, "");
  if (imageUrl) {
    html = html.replace(
      /(<meta\s+property="og:description"[\s\S]*?>)/i,
      `$1\n    <meta property="og:image" content="${htmlEscape(imageUrl)}" />`
    );
    html = html.replace(
      /(<meta\s+name="twitter:description"[\s\S]*?>)/i,
      `$1\n    <meta name="twitter:image" content="${htmlEscape(imageUrl)}" />`
    );
  }

  if (!html.includes(GENERATED_MARKER)) {
    html = html.replace(/<html/i, `${GENERATED_MARKER}\n<html`);
  }
  return html;
}

function removeGeneratedBlogPostPages() {
  if (!fs.existsSync(blogDir)) return;
  const entries = fs.readdirSync(blogDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const indexPath = path.join(blogDir, entry.name, "index.html");
    if (!fs.existsSync(indexPath)) continue;
    const content = readText(indexPath);
    if (!content.includes(GENERATED_MARKER)) continue;
    fs.rmSync(path.join(blogDir, entry.name), { recursive: true, force: true });
  }
}

function removeGeneratedPagesInDir(baseDir) {
  if (!fs.existsSync(baseDir)) return;
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const indexPath = path.join(baseDir, entry.name, "index.html");
    if (!fs.existsSync(indexPath)) continue;
    const content = readText(indexPath);
    if (!content.includes(GENERATED_MARKER)) continue;
    fs.rmSync(path.join(baseDir, entry.name), { recursive: true, force: true });
  }
}

function writeGeneratedBlogPostPages(origin, posts) {
  const template = readText(paths.blogTemplate);
  removeGeneratedBlogPostPages();
  for (const post of posts) {
    const targetDir = path.join(blogDir, post.slug);
    const targetFile = path.join(targetDir, "index.html");
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(targetFile, buildPostHtml(template, origin, post), "utf8");
  }
}

function writeGeneratedDocsBlogPostPages(origin, posts) {
  if (!fs.existsSync(paths.docsBlogTemplate)) return;
  const template = readText(paths.docsBlogTemplate);
  removeGeneratedPagesInDir(docsBlogDir);
  for (const post of posts) {
    const targetDir = path.join(docsBlogDir, post.slug);
    const targetFile = path.join(targetDir, "index.html");
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(targetFile, buildPostHtml(template, origin, post), "utf8");
  }
}

function buildSitemapXml(origin, routes) {
  const items = routes
    .map(
      (route) => `  <url>
    <loc>${xmlEscape(`${origin}${route.path}`)}</loc>
    <lastmod>${xmlEscape(route.lastmod)}</lastmod>
    <changefreq>${xmlEscape(route.changefreq)}</changefreq>
    <priority>${xmlEscape(route.priority)}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</urlset>
`;
}

function buildRobotsTxt(origin) {
  return `User-agent: *
Allow: /

Sitemap: ${origin}/sitemap.xml
`;
}

function generateSeoFiles() {
  const origin = getSiteOrigin();
  const today = new Date().toISOString().slice(0, 10);
  const manifest = JSON.parse(readText(paths.manifest));
  const postEntries = Array.isArray(manifest) ? manifest : Array.isArray(manifest.posts) ? manifest.posts : [];
  const posts = [];

  const routes = [
    {
      path: "/",
      lastmod: fileDateISO(paths.homeHtml),
      changefreq: "weekly",
      priority: "1.0",
    },
    {
      path: "/blog/",
      lastmod: fileDateISO(paths.blogHtml),
      changefreq: "weekly",
      priority: "0.8",
    },
  ];

  for (const postPath of postEntries) {
    if (typeof postPath !== "string" || !postPath.trim()) continue;
    const fullPath = path.join(blogContentDir, postPath);
    if (!fs.existsSync(fullPath)) continue;
    const slug = slugFromManifestPath(postPath);
    if (!slug) continue;

    const text = readText(fullPath);
    const parsedDate = parsePostDate(text);
    const fallbackDate = fileDateISO(fullPath);
    const slugTitle = slugToDisplayTitle(slug);
    const postTitle = parseMetaValue(text, "NAME") || slugTitle;
    const preview = parseMetaValue(text, "PREVIEW");
    const thumb = parseMetaValue(text, "THUMB");
    const thumbResolved = resolveThumbUrl(thumb, postPath);
    const description = buildExcerpt(text, preview);

    routes.push({
      path: `/blog/${encodeURIComponent(slug)}/`,
      lastmod: parsedDate || fallbackDate || today,
      changefreq: "monthly",
      priority: "0.7",
    });

    posts.push({
      slug,
      title: postTitle,
      description,
      thumbResolved,
    });
  }

  writeGeneratedBlogPostPages(origin, posts);
  writeGeneratedDocsBlogPostPages(origin, posts);
  fs.writeFileSync(paths.sitemap, buildSitemapXml(origin, routes), "utf8");
  fs.writeFileSync(paths.robots, buildRobotsTxt(origin), "utf8");
}

generateSeoFiles();
