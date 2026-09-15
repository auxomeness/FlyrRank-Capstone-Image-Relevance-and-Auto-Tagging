const state = {
  posts: [],
  images: [],
  activePostId: null,
  activeJobId: null,
};

const els = {
  apiStatus: document.querySelector("#apiStatus"),
  providerStatus: document.querySelector("#providerStatus"),
  jobStatus: document.querySelector("#jobStatus"),
  postCount: document.querySelector("#postCount"),
  imageCount: document.querySelector("#imageCount"),
  postList: document.querySelector("#postList"),
  imageGrid: document.querySelector("#imageGrid"),
  activeTitle: document.querySelector("#activeTitle"),
  activeBody: document.querySelector("#activeBody"),
  suggestions: document.querySelector("#suggestions"),
  guardResult: document.querySelector("#guardResult"),
  refreshButton: document.querySelector("#refreshButton"),
  forceWolfButton: document.querySelector("#forceWolfButton"),
  ingestButton: document.querySelector("#ingestButton"),
};

async function api(path, options) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

function imageUrl(imageId) {
  const image = state.images.find((item) => item.id === imageId);
  return image?.file_url || "";
}

function setBusy(button, busy, label) {
  button.disabled = busy;
  if (label) button.textContent = label;
}

function renderPosts() {
  els.postCount.textContent = String(state.posts.length);
  els.postList.innerHTML = state.posts
    .map(
      (post) => `
        <button class="post-card ${post.id === state.activePostId ? "active" : ""}" data-post-id="${post.id}" type="button">
          <strong>${post.title}</strong>
          <span>${post.expected_subject || "No subject"} · ${post.expected_category || "No category"}</span>
        </button>
      `,
    )
    .join("");

  for (const button of els.postList.querySelectorAll("[data-post-id]")) {
    button.addEventListener("click", () => selectPost(button.dataset.postId));
  }
}

function renderImages() {
  els.imageCount.textContent = String(state.images.length);
  els.imageGrid.innerHTML = state.images
    .map(
      (image) => `
        <article class="image-card">
          <img src="${image.file_url}" alt="${image.id}" loading="lazy" />
          <div class="card-body">
            <div class="meta-line">
              <span>${image.category || image.expected_category || "pending"}</span>
              <span class="status-${image.status || "pending"}">${image.status || "pending"}</span>
            </div>
            <strong>${image.subject || image.expected_subject || image.id}</strong>
            <p>${image.caption || image.failure_reason || "Not processed yet."}</p>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderSuggestions(result) {
  if (result.status === "no_confident_match") {
    els.suggestions.className = "suggestions empty-state";
    els.suggestions.textContent = result.suggestions[0]?.reason || "No confident match.";
    return;
  }

  els.suggestions.className = "suggestions";
  els.suggestions.innerHTML = result.suggestions
    .map(
      (suggestion) => `
        <article class="suggestion-card">
          <img src="${imageUrl(suggestion.image_id)}" alt="${suggestion.image_id}" />
          <div class="card-body">
            <div class="meta-line">
              <span>Rank ${suggestion.rank}</span>
              <span class="badge">${Math.round(Number(suggestion.similarity) * 100)}%</span>
            </div>
            <strong>${suggestion.image_id}</strong>
            <p class="reason">${suggestion.reason}</p>
          </div>
        </article>
      `,
    )
    .join("");
}

async function selectPost(postId) {
  state.activePostId = postId;
  const post = state.posts.find((item) => item.id === postId);
  els.activeTitle.textContent = post.title;
  els.activeBody.textContent = post.body;
  els.guardResult.textContent = "No guard check yet.";
  renderPosts();
  await refreshMatch();
}

async function refreshMatch() {
  if (!state.activePostId) return;
  setBusy(els.refreshButton, true, "Refreshing");
  els.suggestions.className = "suggestions empty-state";
  els.suggestions.textContent = "Ranking images...";
  try {
    renderSuggestions(await api(`/posts/${state.activePostId}/images`));
  } catch (error) {
    els.suggestions.textContent = error.message;
  } finally {
    setBusy(els.refreshButton, false, "Refresh Match");
  }
}

async function forceWolfCheck() {
  if (!state.activePostId) return;
  setBusy(els.forceWolfButton, true, "Checking");
  try {
    const result = await api(`/posts/${state.activePostId}/images/animal-wolf-01/force-check`, { method: "POST" });
    els.guardResult.textContent = JSON.stringify(result, null, 2);
  } catch (error) {
    els.guardResult.textContent = error.message;
  } finally {
    setBusy(els.forceWolfButton, false, "Check Wolf");
  }
}

async function runIngestion() {
  setBusy(els.ingestButton, true, "Queued");
  try {
    const job = await api("/jobs/ingest-images", { method: "POST" });
    state.activeJobId = job.id;
    els.jobStatus.textContent = `${job.status} · ${job.total}`;
    pollJob();
  } catch (error) {
    els.jobStatus.textContent = error.message;
    setBusy(els.ingestButton, false, "Run Ingestion");
  }
}

async function pollJob() {
  if (!state.activeJobId) return;
  const result = await api(`/jobs/${state.activeJobId}`);
  const job = result.job;
  els.jobStatus.textContent = `${job.status} · ${job.processed}/${job.total} ok · ${job.failed} failed`;
  if (job.status === "running" || job.status === "queued") {
    window.setTimeout(pollJob, 3000);
    return;
  }
  setBusy(els.ingestButton, false, "Run Ingestion");
  await loadImages();
  if (state.activePostId) await refreshMatch();
}

async function loadPosts() {
  const { posts } = await api("/posts");
  state.posts = posts;
  renderPosts();
  if (!state.activePostId && posts[0]) {
    await selectPost(posts[0].id);
  }
}

async function loadImages() {
  const { images } = await api("/images");
  state.images = images;
  renderImages();
}

async function boot() {
  try {
    const health = await api("/evidence/health");
    els.apiStatus.textContent = health.status;
    els.providerStatus.textContent = `${health.cost_log_groups} cost groups`;
    await loadImages();
    await loadPosts();
  } catch (error) {
    els.apiStatus.textContent = "Error";
    els.providerStatus.textContent = error.message;
  }
}

els.refreshButton.addEventListener("click", refreshMatch);
els.forceWolfButton.addEventListener("click", forceWolfCheck);
els.ingestButton.addEventListener("click", runIngestion);

boot();
