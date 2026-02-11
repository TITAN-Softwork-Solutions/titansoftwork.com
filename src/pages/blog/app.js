import { marked } from "marked";
import hljs from "highlight.js";

const BLOG_ROOT = "/content/blog";
const MANIFEST_URL = `${BLOG_ROOT}/manifest.json`;
const POSTS_PER_PAGE = 12;

const dom = {
  status: document.getElementById("blog-status"),
  grid: document.getElementById("blog-grid"),
  pagination: document.getElementById("blog-pagination"),
  hero: document.querySelector(".blog-hero"),
  views: {
    list: document.querySelector('[data-blog-view="list"]'),
    post: document.querySelector('[data-blog-view="post"]'),
  },
  post: {
    meta: document.getElementById("blog-post-meta"),
    title: document.getElementById("blog-post-title"),
    body: document.getElementById("blog-post-body"),
  },
  toc: {
    list: document.getElementById("blog-toc-list"),
    track: document.getElementById("blog-progress-track"),
    fill: document.getElementById("blog-progress-fill"),
    handle: document.getElementById("blog-progress-handle"),
    aside: document.getElementById("blog-post-aside"),
    label: document.querySelector(".blog-toc__label"),
  },
  count: document.getElementById("blog-count"),
  year: document.getElementById("year"),
};

if (dom.year) {
  dom.year.textContent = new Date().getFullYear();
}

marked.setOptions({
  mangle: false,
  headerIds: false,
  gfm: true,
});

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderer = new marked.Renderer();
const defaultCodeRenderer = renderer.code.bind(renderer);
let markdownBasePath = `${BLOG_ROOT}/`;

renderer.code = (code, infostring, escaped) => {
  const lines = String(code || "").split(/\r?\n/);
  const firstLine = lines[0]?.trim() ?? "";
  let dllLabel = "";

  if (/^@\S+/.test(firstLine)) {
    dllLabel = firstLine.slice(1).trim();
    lines.shift();
    code = lines.join("\n");
  }

  const html = defaultCodeRenderer(code, infostring, escaped);
  if (!dllLabel) return html;

  const safeLabel = escapeHtml(dllLabel);
  return `<div class="blog-codeblock blog-codeblock--dll" data-dll="${safeLabel}">${html}<span class="blog-codeblock__label" aria-hidden="true"><span class="blog-codeblock__labelText">${safeLabel}</span></span></div>`;
};

function resolveMarkdownAssetUrl(href) {
  if (!href) return "";
  const normalized = href.trim();
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(normalized)) {
    return normalized;
  }
  try {
    const base = `${window.location.origin}${markdownBasePath}`;
    const resolved = new URL(normalized, base);
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return normalized;
  }
}

renderer.image = (href, title, text) => {
  const safeUrl = escapeHtml(resolveMarkdownAssetUrl(href));
  const safeText = escapeHtml(text || "");
  const safeTitle = title ? ` title="${escapeHtml(title)}"` : "";
  return `<img src="${safeUrl}" alt="${safeText}" loading="lazy"${safeTitle}>`;
};

marked.use({ renderer });

const STATUS_MESSAGES = {
  empty: "No posts available.",
  notFound: "Blogpost not found. Showing the latest list instead.",
  loadError:
    "Unable to load posts right now.",
};

const THREAT_MODEL_DROPDOWNS = [
  { label: "Static", match: /^static\b/i },
  { label: "Runtime", match: /^runtime\b/i },
  { label: "Page", match: /^page\b/i },
  { label: "Hooks/API", match: /^api\b|hooks?\s*\/?\s*api/i },
  { label: "Behavioural", match: /^behavio(u)?ral\b/i },
  { label: "Hardening Profiles", match: /^secure mode hardening profile|hardening/i },
  { label: "Kernel Callbacks", match: /^kernel\b/i },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function isPlainLeftClick(event) {
  return (
    event.button === 0 &&
    !event.defaultPrevented &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function setStatus(message, state = "info") {
  if (!dom.status) return;
  dom.status.textContent = message;
  dom.status.dataset.state = state;
  dom.status.hidden = !message;
}

function setView(mode) {
  if (dom.views.list) dom.views.list.hidden = mode !== "list";
  if (dom.views.post) dom.views.post.hidden = mode !== "post";
  if (dom.hero) dom.hero.hidden = mode === "post";
  document.body.classList.toggle("is-blog-post", mode === "post");
}

function stripQuotes(value) {
  if (!value) return "";
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseTagList(value) {
  const cleaned = stripQuotes(value || "").trim();
  if (!cleaned) return [];
  return cleaned
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseDateString(value) {
  if (!value) return { value: null, display: null };
  const match = String(value).trim().match(/(\d{2})-(\d{2})-(\d{4})/);
  if (!match) return { value: null, display: null };
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return { value: null, display: match[0] };
  return { value: date.getTime(), display: match[0] };
}

function buildExcerpt(body, previewOverride) {
  const override = stripQuotes(previewOverride || "").trim();
  if (override) {
    let text = override.replace(/\s+/g, " ").trim();
    if (text.length > 520) text = `${text.slice(0, 517)}...`;
    return text;
  }

  if (!body) return "";

  // Grab the first real paragraph (not just a heading), so posts like ActiveBreach
  // (where headings are separated from the paragraph by a blank line) still get a useful preview.
  const src = String(body)
    .replace(/```[\s\S]*?```/g, "\n")
    .replace(/\r\n/g, "\n");

  const lines = src.split("\n");
  let collecting = false;
  const paragraph = [];
  let inFence = false;

  for (const raw of lines) {
    const t = raw.trim();

    if (/^```/.test(t)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    if (!collecting) {
      if (!t) continue;
      if (/^#{1,6}\s+/.test(t)) continue;
      if (/^(-{3,}|\*{3,})$/.test(t)) continue;
      if (/^>/.test(t)) continue;
      if (/^(?:[-*+]\s+|\d+\.\s+)/.test(t)) continue;

      collecting = true;
      paragraph.push(t);
      continue;
    }

    if (!t) break;
    if (/^#{1,6}\s+/.test(t)) break;
    if (/^(-{3,}|\*{3,})$/.test(t)) break;
    if (/^>/.test(t)) break;
    if (/^(?:[-*+]\s+|\d+\.\s+)/.test(t)) break;
    paragraph.push(t);
  }

  if (!paragraph.length) return "";

  let text = paragraph
    .join(" ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length > 520) text = `${text.slice(0, 517)}...`;
  return text;
}

function parseMetadata(text) {
  const lines = text.split(/\r?\n/);
  let name = null;
  let thumb = null;
  let dateValue = null;
  let dateDisplay = null;
  let author = null;
  let preview = null;
  let tags = [];
  let sawMeta = false;
  let bodyStart = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    const upper = line.toUpperCase();
    if (!line && sawMeta) {
      continue;
    }

    if (upper.startsWith("$NAME")) {
      name = stripQuotes(line.replace(/^\$NAME\s+/i, ""));
      sawMeta = true;
      continue;
    }

    if (upper.startsWith("$THUMB")) {
      thumb = stripQuotes(line.replace(/^\$THUMB\s+/i, ""));
      sawMeta = true;
      continue;
    }

    if (upper.startsWith("$DATE")) {
      const parsed = parseDateString(line.replace(/^\$DATE\s+/i, ""));
      dateValue = parsed.value;
      dateDisplay = parsed.display;
      sawMeta = true;
      continue;
    }

    if (upper.startsWith("$AUTHOR")) {
      author = stripQuotes(line.replace(/^\$AUTHOR\s+/i, ""));
      sawMeta = true;
      continue;
    }

    if (upper.startsWith("$PREVIEW")) {
      preview = stripQuotes(line.replace(/^\$PREVIEW\s+/i, ""));
      sawMeta = true;
      continue;
    }

    if (upper.startsWith("$TAGS")) {
      tags = parseTagList(line.replace(/^\$TAGS\s+/i, ""));
      sawMeta = true;
      continue;
    }

    bodyStart = i;
    break;
  }

  const body = lines.slice(bodyStart).join("\n").trim();
  const excerpt = buildExcerpt(body, preview);

  return {
    name,
    thumb,
    dateValue,
    dateDisplay,
    author,
    preview,
    tags,
    body,
    excerpt,
  };
}

function slugFromFile(fileName) {
  const normalized = String(fileName || "")
    .replace(/\\/g, "/")
    .replace(/\.md$/i, "");
  const parts = normalized.split("/").filter(Boolean);
  const last = parts[parts.length - 1] || "";
  if (last.toLowerCase() === "index" && parts.length >= 2) {
    return parts[parts.length - 2] || last;
  }
  return last;
}

function resolveThumb(thumb, fileName) {
  if (!thumb) return "";
  if (/^(https?:|data:|\/)/i.test(thumb)) return thumb;
  const parts = fileName.split("/").filter(Boolean);
  parts.pop();
  const subDir = parts.length ? `${parts.join("/")}/` : "";
  return `${BLOG_ROOT}/${subDir}${thumb}`;
}

async function loadManifest() {
  const res = await fetch(MANIFEST_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Manifest not found at ${MANIFEST_URL}`);
  }
  const data = await res.json();
  const posts = Array.isArray(data) ? data : Array.isArray(data.posts) ? data.posts : [];
  return posts.filter((entry) => typeof entry === "string" && entry.trim());
}

async function loadPost(fileName) {
  const res = await fetch(`${BLOG_ROOT}/${fileName}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Unable to load ${fileName}`);
  }
  const text = await res.text();
  const meta = parseMetadata(text);
  const slug = slugFromFile(fileName);
  return {
    ...meta,
    fileName,
    slug,
    title: meta.name || slug,
    thumbResolved: resolveThumb(meta.thumb, fileName),
    assetBasePath: (() => {
      const parts = fileName.split("/").filter(Boolean);
      parts.pop();
      const subDir = parts.length ? `${parts.join("/")}/` : "";
      return `${BLOG_ROOT}/${subDir}`;
    })(),
  };
}

async function loadPosts(files) {
  const results = await Promise.all(
    files.map(async (fileName) => {
      try {
        return await loadPost(fileName);
      } catch {
        return null;
      }
    })
  );
  return results.filter(Boolean);
}

const cache = {
  manifest: null,
  posts: null,
};

async function getManifestFiles() {
  if (cache.manifest) return cache.manifest;
  cache.manifest = await loadManifest();
  return cache.manifest;
}

async function getAllPosts() {
  if (cache.posts) return cache.posts;
  const manifest = await getManifestFiles();
  const posts = await loadPosts(manifest);
  posts.sort((a, b) => (b.dateValue || 0) - (a.dateValue || 0));
  cache.posts = posts;
  return posts;
}

function setUrlSearch(params, { replace = false } = {}) {
  const url = new URL(window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, String(value));
    }
  });
  if (replace) history.replaceState({}, "", url);
  else history.pushState({}, "", url);
}

async function showList({ page = 1, push = false } = {}) {
  const posts = await getAllPosts();
  renderList(posts, page);
  if (push) setUrlSearch({ post: null, page: page > 1 ? page : null });
  window.scrollTo({ top: 0, behavior: "auto" });
}

async function showPost({ slug, push = false } = {}) {
  const manifest = await getManifestFiles();
  const match = normalizeFileMatch(manifest, slug);
  if (!match) {
    setStatus(STATUS_MESSAGES.notFound, "error");
    await showList({ page: 1, push });
    return;
  }

  const normalized = String(slug || "");
  let post = cache.posts?.find((p) => p.slug === normalized) || null;
  if (!post) post = await loadPost(match);

  renderPost(post);
  if (push) setUrlSearch({ post: normalized, page: null });
  window.scrollTo({ top: 0, behavior: "auto" });
}

async function syncRouteFromLocation({ replace = false } = {}) {
  const params = new URLSearchParams(window.location.search);
  const postParam = params.get("post");
  const pageParam = Number.parseInt(params.get("page") || "1", 10);
  const safePageParam = Number.isNaN(pageParam) ? 1 : Math.max(1, pageParam);

  if (postParam) {
    await showPost({ slug: postParam, push: false });
    return;
  }

  await showList({ page: safePageParam, push: false });
  if (replace) {
    setUrlSearch(
      { post: null, page: safePageParam > 1 ? safePageParam : null },
      { replace: true }
    );
  }
}

function renderPagination(page, totalPages) {
  if (!dom.pagination) return;
  dom.pagination.innerHTML = "";
  if (totalPages <= 1) return;

  const createLink = (label, pageNumber, options = {}) => {
    const link = document.createElement("a");
    link.href = `/blog/?page=${pageNumber}`;
    link.textContent = label;
    link.className = "blog-pageLink";
    link.addEventListener("click", (event) => {
      if (!isPlainLeftClick(event)) return;
      event.preventDefault();
      showList({ page: pageNumber, push: true });
    });
    if (options.active) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }
    if (options.disabled) {
      link.classList.add("is-disabled");
      link.setAttribute("aria-disabled", "true");
      link.tabIndex = -1;
    }
    return link;
  };

  const fragment = document.createDocumentFragment();
  fragment.appendChild(
    createLink("Prev", Math.max(1, page - 1), { disabled: page === 1 })
  );

  for (let i = 1; i <= totalPages; i += 1) {
    fragment.appendChild(createLink(String(i), i, { active: i === page }));
  }

  fragment.appendChild(
    createLink("Next", Math.min(totalPages, page + 1), { disabled: page === totalPages })
  );
  dom.pagination.appendChild(fragment);
}

function formatMetaLine(post) {
  const parts = [];
  if (post.dateDisplay) parts.push(post.dateDisplay);
  if (post.author) parts.push(post.author);
  return parts.length ? parts.join(" • ") : "Undated";
}

function buildCard(post) {
  const title = post.title || "Untitled post";
  const dateLabel = formatMetaLine(post);
  const excerpt = post.excerpt || "No summary available.";

  const card = document.createElement("article");
  card.className = "blog-card";

  const link = document.createElement("a");
  link.className = "blog-card__link";
  link.href = `/blog/?post=${encodeURIComponent(post.slug)}`;
  link.setAttribute("aria-label", `Read ${title}`);
  link.addEventListener("click", (event) => {
    if (!isPlainLeftClick(event)) return;
    event.preventDefault();
    showPost({ slug: post.slug, push: true });
  });

  const body = document.createElement("div");
  body.className = "blog-card__body";

  const meta = document.createElement("div");
  meta.className = "blog-card__meta";
  meta.textContent = dateLabel;

  const titleEl = document.createElement("h3");
  titleEl.className = "blog-card__title";
  titleEl.textContent = title;

  const excerptEl = document.createElement("p");
  excerptEl.className = "blog-card__excerpt";
  excerptEl.textContent = excerpt;

  const cta = document.createElement("span");
  cta.className = "blog-card__cta";
  cta.textContent = "Read article";

  body.appendChild(meta);
  if (post.tags && post.tags.length) {
    const tags = document.createElement("div");
    tags.className = "blog-card__tags";
    post.tags.forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "blog-tag";
      chip.textContent = tag;
      tags.appendChild(chip);
    });
    body.appendChild(tags);
  }
  body.appendChild(titleEl);
  body.appendChild(excerptEl);
  body.appendChild(cta);

  if (post.thumbResolved) {
    const thumb = document.createElement("div");
    thumb.className = "blog-card__thumb";
    const img = document.createElement("img");
    img.src = post.thumbResolved;
    img.alt = `${title} thumbnail`;
    img.loading = "lazy";
    thumb.appendChild(img);
    link.appendChild(thumb);
  } else {
    card.classList.add("blog-card--no-thumb");
  }
  link.appendChild(body);
  card.appendChild(link);

  return card;
}

function renderList(posts, page) {
  setView("list");

  if (!dom.grid) return;
  dom.grid.innerHTML = "";

  if (!posts.length) {
    setStatus(STATUS_MESSAGES.empty);
    renderPagination(1, 1);
    return;
  }

  setStatus("");

  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));
  const safePage = clamp(page, 1, totalPages);
  const start = (safePage - 1) * POSTS_PER_PAGE;
  const pagePosts = posts.slice(start, start + POSTS_PER_PAGE);

  const fragment = document.createDocumentFragment();
  pagePosts.forEach((post) => {
    fragment.appendChild(buildCard(post));
  });
  dom.grid.appendChild(fragment);

  renderPagination(safePage, totalPages);
}

function renderPost(post) {
  setView("post");
  setStatus("");

  markdownBasePath = post.assetBasePath || `${BLOG_ROOT}/`;

  if (dom.post.title) dom.post.title.textContent = post.title || "Untitled post";
  if (dom.post.meta) dom.post.meta.textContent = formatMetaLine(post);
  if (dom.post.meta) {
    let tagsEl = dom.post.meta.parentElement?.querySelector(".blog-post__tags");
    if (!tagsEl) {
      tagsEl = document.createElement("div");
      tagsEl.className = "blog-post__tags";
      dom.post.meta.insertAdjacentElement("afterend", tagsEl);
    }
    if (post.tags && post.tags.length) {
      tagsEl.textContent = `Tags: ${post.tags.join(", ")}`;
      tagsEl.hidden = false;
    } else {
      tagsEl.textContent = "";
      tagsEl.hidden = true;
    }
  }
  if (dom.post.body) {
    dom.post.body.innerHTML = marked.parse(post.body || "");
    dom.post.body.querySelectorAll("pre code").forEach((block) => {
      if (block.classList.contains("language-asm")) {
        block.classList.remove("language-asm");
        block.classList.add("language-x86asm");
      }
      if (block.classList.contains("language-nasm")) {
        block.classList.remove("language-nasm");
        block.classList.add("language-x86asm");
      }
      if (block.classList.contains("language-x86")) {
        block.classList.remove("language-x86");
        block.classList.add("language-x86asm");
      }
      hljs.highlightElement(block);
    });
    buildThreatModelDropdowns();
  }

  buildToc();
}

function buildThreatModelDropdowns() {
  if (!dom.post.body) return;
  const threatHeading = Array.from(dom.post.body.querySelectorAll("h2")).find((heading) =>
    /threat model/i.test(heading.textContent || "")
  );
  if (!threatHeading) return;

  let node = threatHeading.nextElementSibling;
  while (node && node.tagName !== "H2") {
    if (node.tagName === "H3") {
      const headingText = (node.textContent || "").trim();
      const match = THREAT_MODEL_DROPDOWNS.find((entry) => entry.match.test(headingText));
      if (match) {
        const details = document.createElement("details");
        details.className = "blog-dropdown";

        const summary = document.createElement("summary");
        summary.className = "blog-dropdown__summary";
        summary.textContent = match.label;

        const content = document.createElement("div");
        content.className = "blog-dropdown__content";

        let cursor = node.nextElementSibling;
        while (
          cursor &&
          cursor.tagName !== "H2" &&
          cursor.tagName !== "H3" &&
          cursor.tagName !== "HR"
        ) {
          const next = cursor.nextElementSibling;
          content.appendChild(cursor);
          cursor = next;
        }

        node.replaceWith(details);
        details.appendChild(summary);
        details.appendChild(content);
        node = cursor;
        continue;
      }
    }
    node = node.nextElementSibling;
  }
}

function buildToc() {
  if (!dom.post.body || !dom.toc.list || !dom.toc.track) return;
  const headings = Array.from(
    dom.post.body.querySelectorAll("h2, h3")
  );
  dom.toc.list.innerHTML = "";

  if (!headings.length) {
    dom.toc.aside?.classList.add("is-empty");
    return;
  }

  dom.toc.aside?.classList.remove("is-empty");

  const used = new Map();
  headings.forEach((heading) => {
    if (!heading.id) {
      const base = heading.textContent
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const count = (used.get(base) || 0) + 1;
      used.set(base, count);
      heading.id = count > 1 ? `${base}-${count}` : base || `section-${count}`;
    }
  });

  const fragment = document.createDocumentFragment();
  headings.forEach((heading) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `blog-toc__link blog-toc__link--${heading.tagName.toLowerCase()}`;
    button.textContent = heading.textContent.trim();
    button.dataset.target = heading.id;
    button.addEventListener("click", () => {
      document.getElementById(heading.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    fragment.appendChild(button);
  });
  dom.toc.list.appendChild(fragment);

  initProgressTracking(headings);
}

let progressState = null;

function initProgressTracking(headings) {
  const scroller = document.scrollingElement || document.documentElement;
  if (!dom.toc.fill || !dom.toc.handle || !dom.toc.track) return;

  if (progressState?.cleanup) progressState.cleanup();

  const getMetrics = () => {
    const bodyRect = dom.post.body.getBoundingClientRect();
    const scrollTop = scroller.scrollTop;
    const start = scrollTop + bodyRect.top;
    const end = start + dom.post.body.offsetHeight - window.innerHeight;
    return {
      scrollTop,
      start,
      end: Math.max(start, end),
    };
  };

  let ticking = false;
  const updateProgress = () => {
    const { scrollTop, start, end } = getMetrics();
    const range = Math.max(1, end - start);
    const progress = Math.min(1, Math.max(0, (scrollTop - start) / range));
    dom.toc.fill.style.height = `${progress * 100}%`;
    dom.toc.handle.style.top = `${progress * 100}%`;
    dom.toc.handle.setAttribute("aria-valuenow", String(Math.round(progress * 100)));

    const activeIndex = headings.reduce((acc, heading, index) => {
      const top = heading.getBoundingClientRect().top;
      return top <= 140 ? index : acc;
    }, 0);
    dom.toc.list.querySelectorAll(".blog-toc__link").forEach((link, index) => {
      link.classList.toggle("is-active", index === activeIndex);
    });
    if (dom.toc.label) {
      dom.toc.label.classList.toggle("is-active", activeIndex >= 0);
    }
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateProgress();
      ticking = false;
    });
  };

  const onResize = () => {
    updateProgress();
  };

  const scrollToProgress = (progress, behavior = "smooth") => {
    const { start, end } = getMetrics();
    const target = start + (end - start) * progress;
    scroller.scrollTo({ top: target, behavior });
  };

  let dragging = false;
  const onPointerDown = (event) => {
    dragging = true;
    dom.toc.track.setPointerCapture(event.pointerId);
    const rect = dom.toc.track.getBoundingClientRect();
    const progress = (event.clientY - rect.top) / rect.height;
    scrollToProgress(Math.min(1, Math.max(0, progress)), "smooth");
  };

  const onPointerMove = (event) => {
    if (!dragging) return;
    const rect = dom.toc.track.getBoundingClientRect();
    const progress = (event.clientY - rect.top) / rect.height;
    scrollToProgress(Math.min(1, Math.max(0, progress)), "smooth");
  };

  const onPointerUp = () => {
    dragging = false;
  };

  dom.toc.track.addEventListener("pointerdown", onPointerDown);
  dom.toc.track.addEventListener("pointermove", onPointerMove);
  dom.toc.track.addEventListener("pointerup", onPointerUp);
  dom.toc.track.addEventListener("pointercancel", onPointerUp);

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);

  updateProgress();

  progressState = {
    cleanup: () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      dom.toc.track.removeEventListener("pointerdown", onPointerDown);
      dom.toc.track.removeEventListener("pointermove", onPointerMove);
      dom.toc.track.removeEventListener("pointerup", onPointerUp);
      dom.toc.track.removeEventListener("pointercancel", onPointerUp);
    },
  };
}

function normalizeFileMatch(files, slugOrFile) {
  if (!slugOrFile) return null;
  const normalized = slugOrFile.replace(/\.md$/i, "");
  const direct = files.find((fileName) => slugFromFile(fileName) === normalized);
  if (direct) return direct;
  return (
    files.find(
      (fileName) => slugFromFile(fileName).split("/").pop() === normalized
    ) || null
  );
}

async function init() {
  try {
    const manifest = await getManifestFiles();
    if (dom.count) dom.count.textContent = String(manifest.length || 0);

    window.addEventListener("popstate", () => {
      syncRouteFromLocation();
    });

    await syncRouteFromLocation({ replace: true });
  } catch (error) {
    setView("list");
    setStatus(STATUS_MESSAGES.loadError, "error");
    if (dom.count) dom.count.textContent = "0";
  }
}

init();
