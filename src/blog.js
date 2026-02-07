import "./style.css";
import "./styles/10-blog.css";
import "./styles/11-markdown.css";

import { marked } from "marked";

const MANIFEST_URL = "/data/bp/manifest.json";
const POSTS_PER_PAGE = 12;

const dom = {
  status: document.getElementById("blog-status"),
  grid: document.getElementById("blog-grid"),
  pagination: document.getElementById("blog-pagination"),
  views: {
    list: document.querySelector('[data-blog-view="list"]'),
    post: document.querySelector('[data-blog-view="post"]'),
  },
  post: {
    meta: document.getElementById("blog-post-meta"),
    title: document.getElementById("blog-post-title"),
    body: document.getElementById("blog-post-body"),
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
});

const STATUS_MESSAGES = {
  empty: "No posts available.",
  notFound: "Blogpost not found. Showing the latest list instead.",
  loadError:
    "Unable to load posts right now.",
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function setStatus(message, state = "info") {
  if (!dom.status) return;
  dom.status.textContent = message;
  dom.status.dataset.state = state;
  dom.status.hidden = !message;
}

function setView(mode) {
  if (dom.views.list) dom.views.list.hidden = mode !== "list";
  if (dom.views.post) dom.views.post.hidden = mode !== "post";
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

function buildExcerpt(body) {
  if (!body) return "";
  const firstBlock = body.split(/\n\s*\n/).find((line) => line.trim());
  if (!firstBlock) return "";
  let text = firstBlock
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length > 180) text = `${text.slice(0, 177)}...`;
  return text;
}

function parseMetadata(text) {
  const lines = text.split(/\r?\n/);
  let name = null;
  let thumb = null;
  let dateValue = null;
  let dateDisplay = null;
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

    bodyStart = i;
    break;
  }

  const body = lines.slice(bodyStart).join("\n").trim();
  const excerpt = buildExcerpt(body);

  return {
    name,
    thumb,
    dateValue,
    dateDisplay,
    body,
    excerpt,
  };
}

function slugFromFile(fileName) {
  return fileName.replace(/\.md$/i, "");
}

function resolveThumb(thumb, fileName) {
  if (!thumb) return "";
  if (/^(https?:|data:|\/)/i.test(thumb)) return thumb;
  const parts = fileName.split("/");
  parts.pop();
  const subDir = parts.length ? `${parts.join("/")}/` : "";
  return `/data/bp/${subDir}${thumb}`;
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
  const res = await fetch(`/data/bp/${fileName}`, { cache: "no-store" });
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

function renderPagination(page, totalPages) {
  if (!dom.pagination) return;
  dom.pagination.innerHTML = "";
  if (totalPages <= 1) return;

  const createLink = (label, pageNumber, options = {}) => {
    const link = document.createElement("a");
    link.href = `/blog/?page=${pageNumber}`;
    link.textContent = label;
    link.className = "blog-pageLink";
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

function buildCard(post) {
  const title = post.title || "Untitled post";
  const dateLabel = post.dateDisplay || "Undated";
  const excerpt = post.excerpt || "No summary available.";

  const card = document.createElement("article");
  card.className = "blog-card";

  const link = document.createElement("a");
  link.className = "blog-card__link";
  link.href = `/blog/?post=${encodeURIComponent(post.slug)}`;
  link.setAttribute("aria-label", `Read ${title}`);

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

  if (dom.post.title) dom.post.title.textContent = post.title || "Untitled post";
  if (dom.post.meta) dom.post.meta.textContent = post.dateDisplay || "Undated";
  if (dom.post.body) dom.post.body.innerHTML = marked.parse(post.body || "");
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
    const manifest = await loadManifest();

    if (dom.count) {
      dom.count.textContent = String(manifest.length || 0);
    }

    const params = new URLSearchParams(window.location.search);
    const postParam = params.get("post");
    const pageParam = Number.parseInt(params.get("page") || "1", 10);
    const safePageParam = Number.isNaN(pageParam) ? 1 : Math.max(1, pageParam);

    if (postParam) {
      const match = normalizeFileMatch(manifest, postParam);
      if (!match) {
        setStatus(STATUS_MESSAGES.notFound, "error");
        const posts = await loadPosts(manifest);
        posts.sort((a, b) => (b.dateValue || 0) - (a.dateValue || 0));
        renderList(posts, 1);
        return;
      }
      const post = await loadPost(match);
      renderPost(post);
      return;
    }

    const posts = await loadPosts(manifest);
    posts.sort((a, b) => (b.dateValue || 0) - (a.dateValue || 0));
    renderList(posts, safePageParam);
  } catch (error) {
    setView("list");
    setStatus(STATUS_MESSAGES.loadError, "error");
    if (dom.count) dom.count.textContent = "0";
  }
}

init();
