const state = {
  posts: [],
  images: [],
  activePostId: null,
  selectedImageId: null,
  activeJobId: null,
};

const els = {
  apiStatus: document.querySelector("#apiStatus"),
  jobStatus: document.querySelector("#jobStatus"),
  postCount: document.querySelector("#postCount"),
  imageCount: document.querySelector("#imageCount"),
  postList: document.querySelector("#postList"),
  imageGrid: document.querySelector("#imageGrid"),
  comparePostTitle: document.querySelector("#comparePostTitle"),
  comparePostBody: document.querySelector("#comparePostBody"),
  compareImageTitle: document.querySelector("#compareImageTitle"),
  compareImage: document.querySelector("#compareImage"),
  compareImageMeta: document.querySelector("#compareImageMeta"),
  candidateSelect: document.querySelector("#candidateSelect"),
  topMatchTitle: document.querySelector("#topMatchTitle"),
  topMatchReason: document.querySelector("#topMatchReason"),
  guardDecision: document.querySelector("#guardDecision"),
  guardReason: document.querySelector("#guardReason"),
  suggestions: document.querySelector("#suggestions"),
  refreshButton: document.querySelector("#refreshButton"),
  forceCheckButton: document.querySelector("#forceCheckButton"),
  demoFoxButton: document.querySelector("#demoFoxButton"),
  ingestButton: document.querySelector("#ingestButton"),
};

async function api(path, options) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`);
  return data;
}

function getPost() {
  return state.posts.find((item) => item.id === state.activePostId);
}

function getImage(imageId = state.selectedImageId) {
  return state.images.find((item) => item.id === imageId);
}

function imageUrl(imageId) {
  return getImage(imageId)?.file_url || "";
}

function setBusy(button, busy, label) {
  button.disabled = busy;
  if (label) button.textContent = label;
}

function resetGuard() {
  els.guardDecision.textContent = "Not checked";
  els.guardDecision.className = "decision-pending";
  els.guardReason.textContent = "Choose an image and run the guard.";
}

function preferredDefaultImage(post) {
  if (!post) return state.images[0]?.id || null;
  if (post.id === "post-red-fox") return "animal-red-fox-01";
  const direct = state.images.find((image) => image.expected_subject === post.expected_subject);
  return direct?.id || state.images[0]?.id || null;
}

function renderPosts() {
  els.postCount.textContent = String(state.posts.length);
  els.postList.innerHTML = state.posts
    .map(
      (post) => `
        <button class="post-card ${post.id === state.activePostId ? "active" : ""}" data-post-id="${post.id}" type="button">
          <strong>${post.title}</strong>
          <span>${post.expected_subject || "unknown"} image needed</span>
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
  els.candidateSelect.innerHTML = state.images
    .map(
      (image) => `
        <option value="${image.id}" ${image.id === state.selectedImageId ? "selected" : ""}>
          ${image.id} - ${image.subject || image.expected_subject || "pending"}
        </option>
      `,
    )
    .join("");

  els.imageGrid.innerHTML = state.images
    .map(
      (image) => `
        <article class="image-card ${image.id === state.selectedImageId ? "selected" : ""}" data-image-id="${image.id}">
          <img src="${image.file_url}" alt="${image.id}" loading="lazy" />
          <div class="card-body">
            <strong>${image.subject || image.expected_subject || image.id}</strong>
            <p>${image.id}</p>
          </div>
        </article>
      `,
    )
    .join("");

  for (const card of els.imageGrid.querySelectorAll("[data-image-id]")) {
    card.addEventListener("click", () => selectImage(card.dataset.imageId));
  }
}

function renderComparison() {
  const post = getPost();
  const image = getImage();

  els.comparePostTitle.textContent = post?.title || "No article selected";
  els.comparePostBody.textContent = post?.body || "Pick one article from the left.";

  els.compareImageTitle.textContent = image ? `${image.subject || image.expected_subject || image.id}` : "No image selected";
  if (image) {
    els.compareImage.src = image.file_url;
    els.compareImage.alt = image.id;
    els.compareImage.hidden = false;
    els.compareImageMeta.textContent = `${image.id} · ${image.category || image.expected_category} · ${image.license || "license unknown"}`;
  } else {
    els.compareImage.removeAttribute("src");
    els.compareImage.hidden = true;
    els.compareImageMeta.textContent = "Pick an image from the library below or from the dropdown.";
  }
}

function selectImage(imageId) {
  state.selectedImageId = imageId;
  renderImages();
  renderComparison();
  resetGuard();
}

function renderSuggestions(result) {
  if (result.status === "no_confident_match") {
    els.topMatchTitle.textContent = "No confident match";
    els.topMatchReason.textContent = result.suggestions[0]?.reason || "The guard rejected every candidate.";
    els.suggestions.className = "suggestions empty-state";
    els.suggestions.textContent = "No image passed the guard.";
    return;
  }

  const top = result.suggestions[0];
  const topImage = getImage(top.image_id);
  els.topMatchTitle.textContent = `${topImage?.subject || top.image_id} (${Math.round(Number(top.similarity) * 100)}%)`;
  els.topMatchReason.textContent = top.reason;

  els.suggestions.className = "suggestions";
  els.suggestions.innerHTML = result.suggestions
    .map(
      (suggestion) => `
        <article class="suggestion-card ${suggestion.image_id === state.selectedImageId ? "selected" : ""}" data-image-id="${suggestion.image_id}">
          <img src="${imageUrl(suggestion.image_id)}" alt="${suggestion.image_id}" />
          <div class="card-body">
            <strong>${getImage(suggestion.image_id)?.subject || suggestion.image_id}</strong>
            <p>Rank ${suggestion.rank} · ${Math.round(Number(suggestion.similarity) * 100)}%</p>
          </div>
        </article>
      `,
    )
    .join("");

  for (const card of els.suggestions.querySelectorAll("[data-image-id]")) {
    card.addEventListener("click", () => selectImage(card.dataset.imageId));
  }
}

async function selectPost(postId) {
  state.activePostId = postId;
  const post = getPost();
  state.selectedImageId = preferredDefaultImage(post);
  resetGuard();
  renderPosts();
  renderImages();
  renderComparison();
  await refreshMatch();
}

async function runFoxWolfDemo() {
  const foxPost = state.posts.find((post) => post.id === "post-red-fox");
  if (!foxPost) return;
  state.activePostId = foxPost.id;
  state.selectedImageId = "animal-wolf-01";
  resetGuard();
  renderPosts();
  renderImages();
  renderComparison();
  await refreshMatch();
  await forceSelectedCheck();
  document.querySelector(".review-surface")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function refreshMatch() {
  if (!state.activePostId) return;
  setBusy(els.refreshButton, true, "Refreshing");
  els.suggestions.className = "suggestions empty-state";
  els.suggestions.textContent = "Ranking image candidates...";
  try {
    renderSuggestions(await api(`/posts/${state.activePostId}/images`));
  } catch (error) {
    els.suggestions.textContent = error.message;
  } finally {
    setBusy(els.refreshButton, false, "Refresh");
  }
}

async function forceSelectedCheck() {
  if (!state.activePostId || !state.selectedImageId) return;
  setBusy(els.forceCheckButton, true, "Checking");
  try {
    const result = await api(`/posts/${state.activePostId}/images/${state.selectedImageId}/force-check`, { method: "POST" });
    const accepted = result.decision === "suggested";
    els.guardDecision.textContent = accepted ? "MATCH" : "REJECT";
    els.guardDecision.className = accepted ? "decision-ok" : "decision-bad";
    els.guardReason.textContent = result.reason;
  } catch (error) {
    els.guardDecision.textContent = "ERROR";
    els.guardDecision.className = "decision-bad";
    els.guardReason.textContent = error.message;
  } finally {
    setBusy(els.forceCheckButton, false, "Check this image");
  }
}

async function runIngestion() {
  setBusy(els.ingestButton, true, "Queued");
  try {
    const job = await api("/jobs/ingest-images", { method: "POST" });
    state.activeJobId = job.id;
    els.jobStatus.textContent = `${job.status} - ${job.total}`;
    pollJob();
  } catch (error) {
    els.jobStatus.textContent = error.message;
    setBusy(els.ingestButton, false, "Run ingestion");
  }
}

async function pollJob() {
  if (!state.activeJobId) return;
  const result = await api(`/jobs/${state.activeJobId}`);
  const job = result.job;
  els.jobStatus.textContent = `${job.status} - ${job.processed}/${job.total} ok - ${job.failed} failed`;
  if (job.status === "running" || job.status === "queued") {
    window.setTimeout(pollJob, 3000);
    return;
  }
  setBusy(els.ingestButton, false, "Run ingestion");
  await loadImages();
  if (state.activePostId) await refreshMatch();
}

async function loadPosts() {
  const { posts } = await api("/posts");
  state.posts = posts;
  renderPosts();
  if (!state.activePostId && posts[0]) await selectPost(posts[0].id);
}

async function loadImages() {
  const { images } = await api("/images");
  state.images = images;
  if (!state.selectedImageId && images[0]) state.selectedImageId = images[0].id;
  renderImages();
  renderComparison();
}

async function boot() {
  try {
    const health = await api("/evidence/health");
    els.apiStatus.textContent = health.status;
    await loadImages();
    await loadPosts();
  } catch (error) {
    els.apiStatus.textContent = "Error";
    els.jobStatus.textContent = error.message;
  }
}

els.refreshButton.addEventListener("click", refreshMatch);
els.forceCheckButton.addEventListener("click", forceSelectedCheck);
els.demoFoxButton.addEventListener("click", runFoxWolfDemo);
els.ingestButton.addEventListener("click", runIngestion);
els.candidateSelect.addEventListener("change", () => selectImage(els.candidateSelect.value));

boot();
