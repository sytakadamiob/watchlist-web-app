// ---- Firebase client configuration ----
// The real config now lives in firebase-config.js (git-ignored) to avoid leaks.
const firebaseConfig = window.__FIREBASE_CONFIG__;

if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_FIREBASE_API_KEY") {
  throw new Error(
    "Missing Firebase config. Copy firebase-config.example.js to firebase-config.js and fill in your project keys."
  );
}

if (window.firebase && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = window.firebase ? firebase.auth() : null;
const db = window.firebase ? firebase.firestore() : null;

// TMDb direct API (no Firebase Functions, to stay on free Spark plan).
// NOTE: This key is visible in the browser; if it ever gets abused you can
// rotate it from your TMDb account. For a fully hidden key, you would need a
// paid backend/proxy such as Firebase Functions Blaze, Cloudflare Workers, etc.
const TMDB_API_KEY = "4fb7f0c0baf5a13a431c5655b43510c2";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const DEFAULT_WATCH_REGION = "US";
const PROVIDER_PRIORITIES = ["flatrate", "ads", "free", "rent", "buy"];
const PROVIDER_LINK_BUILDERS = {
  8: (item) => `https://www.netflix.com/search?q=${encodeURIComponent(item.title)}`,
  9: (item) =>
    `https://www.amazon.com/s?k=${encodeURIComponent(item.title)}&i=instant-video`,
  10: (item) =>
    `https://www.amazon.com/s?k=${encodeURIComponent(item.title)}&i=instant-video`,
  15: (item) => `https://www.hulu.com/search?q=${encodeURIComponent(item.title)}`,
  177: (item) =>
    `https://www.funimation.com/search/?q=${encodeURIComponent(item.title)}`,
  1899: (item) => `https://www.peacocktv.com/search?q=${encodeURIComponent(item.title)}`,
  283: (item) =>
    `https://www.crunchyroll.com/search?from=search&q=${encodeURIComponent(item.title)}`,
  337: (item) =>
    `https://www.disneyplus.com/search?q=${encodeURIComponent(item.title)}`,
  350: (item) =>
    `https://tv.apple.com/search?term=${encodeURIComponent(item.title)}`,
  384: (item) => `https://www.max.com/search?q=${encodeURIComponent(item.title)}`,
  531: (item) =>
    `https://www.paramountplus.com/shows/?search=${encodeURIComponent(item.title)}`,
};

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w342";
const STORAGE_KEY = "vibewatch_list_v1";
const PLACEHOLDER_POSTER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='600'%3E%3Crect width='400' height='600' fill='%23172233'/%3E%3Ctext x='50%25' y='50%25' fill='%236b768d' font-size='30' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif'%3ENo%20Poster%3C%2Ftext%3E%3C/svg%3E";
const REMINDER_STATUSES = ["watch_later", "on_hold"];

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-query");
const searchType = document.getElementById("search-type");
const searchResultsEl = document.getElementById("search-results");
const statusChipsEl = document.getElementById("status-chips");
const watchlistEl = document.getElementById("watchlist");
const collectionsEl = document.getElementById("collections-view");
const reminderListEl = document.getElementById("reminder-list");
const reminderSummaryEl = document.getElementById("reminder-summary");
const reminderCountEl = document.getElementById("reminder-count");
const searchHintEl = document.getElementById("search-hint");
const statsYearEl = document.getElementById("stats-year");
const finishedCountEl = document.getElementById("finished-count");
const mainTabsEl = document.getElementById("main-tabs");
const filtersContainer = document.getElementById("watchlist-filters");
const profileCardEl = document.getElementById("profile-card");
const profileStatsEl = document.getElementById("profile-stats");
const backToTopBtn = document.querySelector(".back-to-top");
let backToTopHideTimeout = null;
let firestoreUnsubscribe = null;
const footerYearEl = document.getElementById("footer-year");

let watchlist = [];
let lastSearchResults = [];
let currentUser = null;
let activeStatusFilter = "all";
let draggedItemId = null;
let toastTimeout = null;
let toastHideTimeout = null;
let statsRenderQueued = false;
const watchProviderInfoCache = new Map();

function getItemById(id) {
  return watchlist.find((entry) => entry.id === id);
}

function getAllTags() {
  const tags = new Set();
  watchlist.forEach((item) => {
    if (Array.isArray(item.tags)) {
      item.tags.forEach((tag) => {
        if (tag && typeof tag === "string") {
          const trimmed = tag.trim();
          if (trimmed) {
            tags.add(trimmed);
          }
        }
      });
    }
  });
  return Array.from(tags);
}

function applySortOrder() {
  const total = watchlist.length;
  watchlist.forEach((item, index) => {
    item.sortIndex = index + 1;
  });
}

function ensureSortIndex() {
  if (!watchlist.length) return;
  let needsSave = false;
  watchlist.forEach((item, index) => {
    if (typeof item.sortIndex !== "number") {
      item.sortIndex = index + 1;
      needsSave = true;
    }
  });
  watchlist.sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));
  if (needsSave) {
    saveWatchlist();
  }
}

function getNextSortIndex() {
  if (!watchlist.length) return 1;
  return Math.max(...watchlist.map((item) => item.sortIndex ?? 0)) + 1;
}
let activeTab = "watchlist";
let activeDetailId = null;

function applyLegacyDefaults(list = watchlist) {
  if (!Array.isArray(list) || !list.length) return;
  let mutated = false;
  list.forEach((item) => {
    if (item && !item.watchLink && item.tmdbId) {
      item.watchLink = buildTmdbWatchLink(item, DEFAULT_WATCH_REGION);
      mutated = true;
    }
    if (item && typeof item.watchProviderName !== "string") {
      item.watchProviderName = "";
    }
  });
  if (mutated) {
    saveWatchlist({ skipRemote: true });
  }
}

function init() {
  bindEvents();
  surfaceApiKeyHint();
  renderProfileCard();
  initAuth();
  hydrateFooter();
}

function hydrateFooter() {
  if (footerYearEl) {
    footerYearEl.textContent = new Date().getFullYear();
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleBackToTopVisibility() {
  if (!backToTopBtn) return;
  if (window.scrollY < 300) {
    hideBackToTopButton();
    return;
  }
  showBackToTopTemporarily();
}

function showBackToTopTemporarily() {
  backToTopBtn.classList.remove("hidden");
  clearTimeout(backToTopHideTimeout);
  backToTopHideTimeout = setTimeout(() => {
    hideBackToTopButton();
  }, 2000);
}

function hideBackToTopButton() {
  backToTopBtn.classList.add("hidden");
  clearTimeout(backToTopHideTimeout);
}

function bindEvents() {
  searchForm.addEventListener("submit", handleSearch);
  if (backToTopBtn) {
    backToTopBtn.addEventListener("click", scrollToTop);
    window.addEventListener("scroll", toggleBackToTopVisibility);
    toggleBackToTopVisibility();
  }
  
  // Bind sign-in button from initial HTML
  const initialSignInBtn = document.getElementById("profile-signin");
  if (initialSignInBtn) {
    initialSignInBtn.addEventListener("click", () => handleAuthAction());
  }
  
  if (statusChipsEl) {
    statusChipsEl.addEventListener("click", (event) => {
      const button = event.target.closest("[data-status]");
      if (!button) return;
      const status = button.dataset.status;
      if (!status) return;
      activeStatusFilter = status;
      Array.from(statusChipsEl.querySelectorAll(".chip")).forEach((chip) => {
        const isActive = chip === button;
        chip.classList.toggle("chip-active", isActive);
        chip.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      renderWatchlist(activeStatusFilter);
    });
  }

  if (mainTabsEl) {
    mainTabsEl.addEventListener("click", (event) => {
      const button = event.target.closest("[data-tab]");
      if (!button) return;
      const tab = button.dataset.tab;
      if (!tab || tab === activeTab) return;
      activeTab = tab;
      Array.from(mainTabsEl.querySelectorAll(".tab")).forEach((tabBtn) => {
        const isActive = tabBtn === button;
        tabBtn.classList.toggle("tab-active", isActive);
        tabBtn.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      if (collectionsEl) {
        collectionsEl.classList.toggle("hidden", activeTab !== "collections");
      }
      if (watchlistEl) {
        watchlistEl.classList.toggle("hidden", activeTab !== "watchlist");
      }
      if (filtersContainer) {
        filtersContainer.classList.toggle("hidden", activeTab === "collections");
      }
      if (activeTab === "collections") {
        renderCollections();
      }
    });
  }
}

function initAuth() {
  if (!auth) {
    // Fallback: local-only mode if Firebase SDK failed to load
    if (firestoreUnsubscribe) {
      firestoreUnsubscribe();
      firestoreUnsubscribe = null;
    }
    watchlist = loadLocalWatchlist();
    ensureSortIndex();
    applyLegacyDefaults();
    renderWatchlist();
    renderReminders();
    renderStats();
    renderProfileCard();
    return;
  }

  auth.onAuthStateChanged(async (user) => {
    if (firestoreUnsubscribe) {
      firestoreUnsubscribe();
      firestoreUnsubscribe = null;
    }
    currentUser = user;
    updateAuthUI(user);
    if (user) {
      // Load from Firestore and merge with local if needed
      const localWatchlist = loadLocalWatchlist();
      subscribeToWatchlist(user.uid, localWatchlist);
    } else {
      watchlist = loadLocalWatchlist();
      ensureSortIndex();
      applyLegacyDefaults();
      applyLegacyDefaults();
      renderWatchlist(activeStatusFilter);
      renderReminders();
      renderStats();
      renderProfileCard();
    }
  });
}

async function handleAuthAction() {
  if (!auth) {
    showToast("Authentication not available. Please check Firebase configuration.");
    return;
  }
  
  if (!auth.currentUser) {
    // Sign in
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
      showToast("Signed in successfully!");
    } catch (error) {
      console.error("Sign-in failed", error);
      let errorMessage = "Sign-in failed. ";
      
      if (error.code === "auth/api-key-not-valid") {
        errorMessage += "Firebase API key is invalid. Please check FIREBASE-SETUP.md for instructions.";
      } else if (error.code === "auth/operation-not-allowed") {
        errorMessage += "Google sign-in is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.";
      } else if (error.code === "auth/popup-blocked") {
        errorMessage += "Popup was blocked. Please allow popups for this site.";
      } else if (error.code === "auth/popup-closed-by-user") {
        errorMessage += "Sign-in popup was closed.";
      } else {
        errorMessage += error.message || "Please try again.";
      }
      
      showToast(errorMessage);
    }
  } else {
    // Sign out
    try {
      await auth.signOut();
      showToast("Signed out successfully");
    } catch (error) {
      console.error("Sign-out failed", error);
      showToast("Sign-out failed. Please try again.");
    }
  }
}

function computeCompletionSummary() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  let finishedThisYear = 0;
  let finishedThisMonth = 0;

  watchlist.forEach((item) => {
    if (item.status !== "finished" || !item.finishedDate) return;
    const [itemYear, itemMonth] = item.finishedDate.split("-");
    const numericYear = Number(itemYear);
    const numericMonth = Number(itemMonth) - 1;
    if (numericYear === year) {
      finishedThisYear += 1;
      if (numericMonth === month) {
        finishedThisMonth += 1;
      }
    }
  });

  return { year, finishedThisYear, finishedThisMonth };
}

function renderStats() {
  if (!statsYearEl || !finishedCountEl) {
    renderProfileStats();
    return;
  }
  const summary = computeCompletionSummary();
  statsYearEl.textContent = summary.year.toString();
  finishedCountEl.textContent = String(summary.finishedThisYear);
  renderProfileStats(summary);
}

function queueStatsRender() {
  if (statsRenderQueued) return;
  statsRenderQueued = true;
  const doRender = () => {
    statsRenderQueued = false;
    renderStats();
  };
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(doRender);
  } else {
    setTimeout(doRender, 0);
  }
}

function renderProfileStats(summary) {
  if (!profileStatsEl) return;
  const computed = summary || computeCompletionSummary();
  const total = watchlist.length;
  const finishedThisMonth = computed.finishedThisMonth;
  const finishedThisYear = computed.finishedThisYear;
  const finishedAllTime = watchlist.filter(
    (item) => item.status === "finished"
  ).length;
  const cards = [
    {
      label: "In watchlist",
      value: total,
    },
    {
      label: "Finished this month",
      value: finishedThisMonth,
    },
    {
      label: "Finished this year",
      value: finishedThisYear,
    },
    {
      label: "Finished all time",
      value: finishedAllTime,
    },
  ];

  profileStatsEl.innerHTML = cards
    .map(
      (card) => `
      <article class="stat-card">
        <p class="stat-value">${card.value}</p>
        <p class="stat-label">${card.label}</p>
      </article>
    `
    )
    .join("");
}

function renderProfileCard() {
  if (!profileCardEl) return;
  const user = auth && auth.currentUser;
  if (!user) {
    profileCardEl.innerHTML = `
      <div class="profile-card__body profile-card--guest">
        <div class="profile-card__cluster">
          <div class="profile-avatar profile-avatar--ghost" aria-hidden="true">
            <span class="profile-avatar-icon">👤</span>
          </div>
          <div class="profile-card__details">
            <p class="profile-card__name">You’re not signed in</p>
            <p class="profile-card__email">Sign in to sync.</p>
          </div>
        </div>
        <button type="button" class="profile-cta" data-profile-signin>Sign in</button>
      </div>
    `;
  } else {
    const name = user.displayName || user.email || "Movie lover";
    const email = user.email || "Signed in";
    const avatarUrl = getUserAvatarUrl(user);
    const avatarMarkup = avatarUrl
      ? `<img src="${avatarUrl}" alt="${name} avatar" referrerpolicy="no-referrer" loading="lazy" />`
      : `<span class="profile-avatar-icon" aria-hidden="true">👤</span>`;

    profileCardEl.innerHTML = `
      <div class="profile-card__body profile-card--signed">
        <div class="profile-card__cluster">
          <div class="profile-avatar">${avatarMarkup}</div>
          <div class="profile-card__details">
            <p class="profile-card__name">${name}</p>
            <p class="profile-card__email">${email}</p>
          </div>
        </div>
        <button type="button" class="profile-cta outline" data-profile-signout>
          Sign out
        </button>
      </div>
    `;
  }

  const signInBtn = profileCardEl.querySelector("[data-profile-signin]");
  if (signInBtn) {
    signInBtn.addEventListener("click", () => handleAuthAction());
  }
  const signOutBtn = profileCardEl.querySelector("[data-profile-signout]");
  if (signOutBtn) {
    signOutBtn.addEventListener("click", () => handleAuthAction());
  }
}

function getUserAvatarUrl(user) {
  if (!user) return "";
  if (user.photoURL) return user.photoURL;
  const providerPhoto =
    (user.providerData || []).map((provider) => provider.photoURL).find(Boolean) || "";
  return providerPhoto;
}

// Detail modal
const detailModalEl = document.getElementById("detail-modal");
const detailPosterEl = document.getElementById("detail-poster");
const detailTitleEl = document.getElementById("detail-title");
const detailTypeEl = document.getElementById("detail-type");
const detailMetaEl = document.getElementById("detail-meta");
const detailStatusEl = document.getElementById("detail-status");
const detailFinishedEl = document.getElementById("detail-finished");
const detailNotesEl = document.getElementById("detail-notes");
const detailTagsInputEl = document.getElementById("detail-tags-input");
const detailTagsListEl = document.getElementById("detail-tags-list");
const detailTagSuggestionsEl = document.getElementById("detail-tag-suggestions");
const detailStarsEl = document.getElementById("detail-stars");
const detailRemoveEl = document.getElementById("detail-remove");
const detailTrailerEl = document.getElementById("detail-trailer");
const detailWatchEl = document.getElementById("detail-watch");
const toastEl = document.getElementById("toast");

function renderModalTags(item) {
  if (!detailTagsListEl) return;
  detailTagsListEl.innerHTML = "";
  const tags = Array.isArray(item.tags) ? item.tags : [];
  tags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = "tag-chip";
    chip.textContent = tag;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", `Remove tag ${tag}`);
    btn.textContent = "×";
    btn.addEventListener("click", () => removeTag(tag));
    chip.appendChild(btn);
    detailTagsListEl.appendChild(chip);
  });
}

function renderTagSuggestionsForItem(item) {
  if (!detailTagSuggestionsEl) return;
  const allTags = getAllTags();
  const existing = new Set(Array.isArray(item.tags) ? item.tags : []);
  const suggestions = allTags.filter((tag) => !existing.has(tag));
  detailTagSuggestionsEl.innerHTML = "";
  if (!suggestions.length) return;
  suggestions.forEach((tag) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = tag;
    btn.addEventListener("click", () => addTag(tag));
    detailTagSuggestionsEl.appendChild(btn);
  });
}

function populateDetailModal(item) {
  if (detailPosterEl) {
    detailPosterEl.src = item.poster || PLACEHOLDER_POSTER;
    detailPosterEl.alt = `${item.title} poster`;
  }
  detailTitleEl.textContent = item.title;
  detailTypeEl.textContent =
    item.mediaType === "movie" ? "Movie" : "Series";
  detailMetaEl.textContent = `${item.year} • ${
    item.mediaType === "movie" ? "Movie" : "Series"
  }`;
  detailStatusEl.value = item.status;
  detailFinishedEl.value = item.finishedDate || "";
  detailNotesEl.value = item.notes || "";
  detailTagsInputEl.value = "";
  renderModalTags(item);
  renderTagSuggestionsForItem(item);
  renderStars(item.rating || 0);
  if (detailTrailerEl) {
    initializeTrailerButton(detailTrailerEl, item);
  }
  if (detailWatchEl) {
    initializeWatchButton(detailWatchEl, item);
    ensureWatchLink(item)
      .then(() => {
        if (detailWatchEl.isConnected) {
          initializeWatchButton(detailWatchEl, item);
        }
      })
      .catch(() => {});
  }
}

function syncDetailModal(id) {
  if (!detailModalEl || activeDetailId !== id) return;
  const item = getItemById(id);
  if (!item) return;
  populateDetailModal(item);
}

function openDetailModal(id) {
  if (!detailModalEl) return;
  const item = getItemById(id);
  if (!item) return;
  activeDetailId = id;
  populateDetailModal(item);
  detailModalEl.classList.remove("hidden");
  detailModalEl.setAttribute("aria-hidden", "false");

  ensureTrailerUrl(item).then(() => {
    if (activeDetailId === id && detailTrailerEl) {
      // reinitialize so freshly fetched trailers open immediately
      initializeTrailerButton(detailTrailerEl, item);
    }
  });
  ensureWatchLink(item).then(() => {
    if (activeDetailId === id && detailWatchEl) {
      initializeWatchButton(detailWatchEl, item);
    }
  });
}

function closeDetailModal() {
  if (!detailModalEl) return;
  activeDetailId = null;
  detailModalEl.classList.add("hidden");
  detailModalEl.setAttribute("aria-hidden", "true");
}

function renderStars(ratingValue) {
  if (!detailStarsEl) return;
  const rating = Number(ratingValue) || 0;
  Array.from(detailStarsEl.querySelectorAll(".star")).forEach((star, index) => {
    star.classList.remove("full", "half");
    const fullThreshold = index + 1;
    const halfThreshold = index + 0.5;
    if (rating >= fullThreshold) {
      star.classList.add("full");
    } else if (rating >= halfThreshold) {
      star.classList.add("half");
    }
  });
}

function setRatingFromStar(index) {
  if (activeDetailId == null) return;
  const item = watchlist.find((entry) => entry.id === activeDetailId);
  if (!item) return;
  const current = Number(item.rating) || 0;
  const half = index + 0.5;
  const full = index + 1;
  let next;
  if (current < half) {
    next = half;
  } else if (current < full) {
    next = full;
  } else {
    next = index;
  }
  updateWatchlistItem(
    item.id,
    { rating: next },
    { refreshWatchlist: false, refreshReminders: false }
  );
  renderStars(next);
}

function addTag(tag) {
  if (!activeDetailId) return;
  const cleaned = tag.trim();
  if (!cleaned) return;
  const item = getItemById(activeDetailId);
  if (!item) return;
  const tags = Array.isArray(item.tags) ? [...item.tags] : [];
  if (tags.includes(cleaned)) return;
  tags.push(cleaned);
  updateWatchlistItem(
    item.id,
    { tags },
    { refreshWatchlist: true, refreshReminders: false }
  );
  detailTagsInputEl.value = "";
}

function removeTag(tagToRemove) {
  if (!activeDetailId) return;
  removeTagFromItem(activeDetailId, tagToRemove);
}

function removeTagFromItem(itemId, tagToRemove) {
  const item = getItemById(itemId);
  if (!item) return;
  const tags = (Array.isArray(item.tags) ? item.tags : []).filter(
    (tag) => tag !== tagToRemove
  );
  updateWatchlistItem(
    itemId,
    { tags },
    { refreshWatchlist: true, refreshReminders: false }
  );
}

if (detailModalEl) {
  const backdrop = detailModalEl.querySelector(".modal-backdrop");
  const closeBtn = detailModalEl.querySelector(".modal-close");

  const logAndClose = (source) => {
    console.log("[detail-modal] close via:", source); // TEMP for debugging
    closeDetailModal();
  };

  // Backdrop and X button
  if (backdrop) {
    backdrop.addEventListener("click", () => logAndClose("backdrop"));
  }
  if (closeBtn) {
    closeBtn.addEventListener("click", () => logAndClose("close-button"));
  }

  // Status change
  detailStatusEl.addEventListener("change", (event) => {
    const newStatus = event.target.value;
    const item = watchlist.find((entry) => entry.id === activeDetailId);
    if (!item) return;
    const updates = { status: newStatus };
    const isFinished = newStatus === "finished";
    detailFinishedEl.disabled = !isFinished;
    detailFinishedEl.placeholder = isFinished ? "mm/dd/yyyy" : "Finished date available when status is Finished";
    detailFinishedEl.classList.toggle("input-disabled", !isFinished);
    if (isFinished && !item.finishedDate) {
      updates.finishedDate = new Date().toISOString().slice(0, 10);
    }
    if (!isFinished) {
      updates.finishedDate = "";
      detailFinishedEl.value = "";
    }
    updateWatchlistItem(item.id, updates, { refreshReminders: true });
    renderStats();
  });

  // Finished date change
  detailFinishedEl.addEventListener("change", (event) => {
    const value = event.target.value;
    if (!activeDetailId) return;
    updateWatchlistItem(
      activeDetailId,
      { finishedDate: value },
      { refreshWatchlist: false, refreshReminders: false }
    );
    renderStats();
  });

  // Notes input
  detailNotesEl.addEventListener("input", (event) => {
    const value = event.target.value;
    if (!activeDetailId) return;
    updateWatchlistItem(
      activeDetailId,
      { notes: value },
      { refreshWatchlist: false, refreshReminders: false }
    );
  });

  // Tags: Enter adds a tag
  detailTagsInputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag(detailTagsInputEl.value);
    }
  });

  // Star rating clicks
  if (detailStarsEl) {
    detailStarsEl.addEventListener("click", (event) => {
      const star = event.target.closest(".star");
      if (!star) return;
      const index = Number.parseInt(star.dataset.starIndex, 10);
      if (Number.isNaN(index)) return;
      setRatingFromStar(index);
    });
  }

  // Remove from watchlist
  detailRemoveEl.addEventListener("click", () => {
    if (!activeDetailId) return;
    const id = activeDetailId;
    logAndClose("remove-button");
    removeItem(id);
  });

  // Escape key closes modal
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !detailModalEl.classList.contains("hidden")) {
      logAndClose("escape-key");
    }
  });
}

function updateAuthUI(user) {
  currentUser = user;
  renderProfileCard();
}

function surfaceApiKeyHint() {
  if (!TMDB_API_KEY || TMDB_API_KEY.includes("REPLACE_WITH")) {
    searchHintEl.textContent =
      "Heads up: Add your TMDb API key at the top of main.js to enable search.";
    searchHintEl.classList.add("warn");
  } else {
    searchHintEl.textContent =
      "Type something like “Dune”, “Arcane”, or “Studio Ghibli” to search.";
    searchHintEl.classList.remove("warn");
  }
}

function loadLocalWatchlist() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(data)) return [];
    return data;
  } catch (error) {
    console.warn("Failed to load watchlist, starting fresh", error);
    return [];
  }
}

async function loadWatchlistFromFirestore(uid) {
  if (!db) return;
  try {
    const docRef = db.collection("users").doc(uid);
    const snap = await docRef.get();
    if (snap.exists) {
      const data = snap.data();
      if (Array.isArray(data.watchlist)) {
        watchlist = data.watchlist;
        applyLegacyDefaults();
      } else {
        watchlist = [];
      }
    } else {
      watchlist = [];
    }
    ensureSortIndex();
  } catch (error) {
    console.warn("Failed to load watchlist from Firestore, falling back to local", error);
    watchlist = loadLocalWatchlist();
    ensureSortIndex();
    applyLegacyDefaults();
  }
}

function subscribeToWatchlist(uid, localFallback = []) {
  if (!db) return;
  const docRef = db.collection("users").doc(uid);
  let initialSnapshotHandled = false;
  const initialLocalCopy = Array.isArray(localFallback) ? localFallback : [];

  if (localFallback.length) {
    watchlist = localFallback;
    ensureSortIndex();
    applyLegacyDefaults();
    renderWatchlist(activeStatusFilter);
    renderReminders();
    renderStats();
  }

  firestoreUnsubscribe = docRef.onSnapshot(
    async (snapshot) => {
      const data = snapshot.exists ? snapshot.data() : null;
      const remoteList = Array.isArray(data?.watchlist) ? data.watchlist : [];
      let mergedList = remoteList;

      if (!initialSnapshotHandled && initialLocalCopy.length) {
        const remoteIds = new Set(remoteList.map((item) => item.id));
        const newLocalItems = initialLocalCopy.filter(
          (item) => item && item.id && !remoteIds.has(item.id)
        );
        if (newLocalItems.length) {
          mergedList = [...remoteList, ...newLocalItems];
          ensureSortIndexForList(mergedList);
          try {
            await docRef.set({ watchlist: mergedList }, { merge: true });
          } catch (error) {
            console.warn("Failed to update Firestore with merged watchlist", error);
          }
        }
      }

      if (mergedList.length) {
        watchlist = mergedList;
        ensureSortIndex();
        applyLegacyDefaults();
        saveWatchlist({ skipRemote: true });
        renderWatchlist(activeStatusFilter);
        renderReminders();
        renderStats();
        initialSnapshotHandled = true;
        return;
      }

      if (!initialSnapshotHandled && localFallback.length) {
        watchlist = localFallback;
        ensureSortIndex();
        applyLegacyDefaults();
        await docRef.set({ watchlist }, { merge: true });
        saveWatchlist({ skipRemote: true });
        renderWatchlist(activeStatusFilter);
        renderReminders();
        renderStats();
      } else {
        watchlist = [];
        renderWatchlist(activeStatusFilter);
        renderReminders();
        renderStats();
      }

      initialSnapshotHandled = true;
    },
    (error) => {
      console.warn("Realtime watchlist sync failed, falling back to local", error);
      watchlist = loadLocalWatchlist();
      ensureSortIndex();
      applyLegacyDefaults();
      applyLegacyDefaults();
      renderWatchlist(activeStatusFilter);
      renderReminders();
      renderStats();
    }
  );
}

function ensureSortIndexForList(list) {
  if (!Array.isArray(list)) return;
  list.forEach((item, index) => {
    if (typeof item.sortIndex !== "number") {
      item.sortIndex = index + 1;
    }
  });
  list.sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));
}

async function saveWatchlistToFirestore(uid) {
  if (!db) return;
  try {
    const docRef = db.collection("users").doc(uid);
    await docRef.set({ watchlist }, { merge: true });
  } catch (error) {
    console.warn("Failed to save watchlist to Firestore", error);
  }
}

let firestoreSaveTimeout = null;

function queueFirestoreSave(uid) {
  // Debounce writes so rapid edits don't spam Firestore, but keep it snappy.
  if (firestoreSaveTimeout) {
    clearTimeout(firestoreSaveTimeout);
  }
  firestoreSaveTimeout = setTimeout(() => {
    saveWatchlistToFirestore(uid);
  }, 200);
}

function saveWatchlist({ skipRemote = false } = {}) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
  } catch (error) {
    console.warn("Failed to save watchlist locally", error);
  }
  queueStatsRender();
  if (!skipRemote && auth && auth.currentUser && db) {
    queueFirestoreSave(auth.currentUser.uid);
  }
}

async function handleSearch(event) {
  event.preventDefault();
  const query = searchInput.value.trim();
  if (!query) return;

  renderSearchMessage("Searching TMDb...");

  try {
    const items = await searchTMDb(query, searchType.value);
    if (!items.length) {
      renderSearchMessage("No results. Try another title?");
      return;
    }
    renderSearchResults(items);
  } catch (error) {
    renderSearchMessage(error.message || "Something went wrong.");
  }
}

function renderSearchMessage(message) {
  searchResultsEl.innerHTML = `<p class="hint">${message}</p>`;
}

async function searchTMDb(query, type) {
  if (!TMDB_API_KEY || TMDB_API_KEY.includes("REPLACE_WITH")) {
    throw new Error("Add your TMDb API key in main.js to enable search.");
  }

  const endpoint =
    type === "multi" ? "search/multi" : `search/${type || "multi"}`;
  const url = new URL(`${TMDB_BASE_URL}/${endpoint}`);
  url.searchParams.set("api_key", TMDB_API_KEY);
  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("language", "en-US");
  url.searchParams.set("page", "1");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("TMDb request failed. Check your API key or network.");
  }
  const { results = [] } = await response.json();

  return results
    .filter((item) => {
      const typeLabel = item.media_type || type;
      return typeLabel === "movie" || typeLabel === "tv";
    })
    .slice(0, 12)
    .map(normalizeTmdbResult);
}

function normalizeTmdbResult(item) {
  const mediaType = item.media_type || (item.first_air_date ? "tv" : "movie");
  const releaseDate =
    mediaType === "movie" ? item.release_date : item.first_air_date;
  return {
    tmdbId: item.id,
    mediaType,
    title: mediaType === "movie" ? item.title : item.name,
    year: releaseDate ? releaseDate.slice(0, 4) : "—",
    overview: item.overview || "No overview provided yet.",
    poster: item.poster_path
      ? `${IMAGE_BASE_URL}${item.poster_path}`
      : PLACEHOLDER_POSTER,
    favorite: false,
    tags: [],
  };
}

// Simple cache for trailer URLs to avoid redundant API calls
const trailerUrlCache = new Map();

async function fetchTrailerUrl(tmdbId, mediaType = "movie") {
  const cacheKey = `${mediaType}-${tmdbId}`;
  if (trailerUrlCache.has(cacheKey)) {
    return trailerUrlCache.get(cacheKey);
  }
  const typePath = mediaType === "tv" ? "tv" : "movie";
  const url = new URL(`${TMDB_BASE_URL}/${typePath}/${tmdbId}/videos`);
  url.searchParams.set("api_key", TMDB_API_KEY);
  url.searchParams.set("language", "en-US");
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load trailer info");
  }
  const { results = [] } = await response.json();
  const trailer =
    results.find(
      (video) =>
        video.site === "YouTube" &&
        video.type === "Trailer" &&
        video.official
    ) ||
    results.find(
      (video) => video.site === "YouTube" && video.type === "Trailer"
    );
  const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : "";
  trailerUrlCache.set(cacheKey, trailerUrl);
  return trailerUrl;
}

async function ensureTrailerUrl(item) {
  if (!item || item.trailerUrl) {
    return item?.trailerUrl || "";
  }
  try {
    const url = await fetchTrailerUrl(item.tmdbId, item.mediaType);
    item.trailerUrl = url;
    return url;
  } catch (error) {
    item.trailerUrl = "";
    return "";
  }
}

function buildTmdbLink(item) {
  if (!item || !item.tmdbId) return "";
  const typePath = item.mediaType === "tv" ? "tv" : "movie";
  return `https://www.themoviedb.org/${typePath}/${item.tmdbId}`;
}

function buildTmdbWatchLink(item, region = DEFAULT_WATCH_REGION) {
  if (!item || !item.tmdbId) return "";
  const typePath = item.mediaType === "tv" ? "tv" : "movie";
  return `https://www.themoviedb.org/${typePath}/${item.tmdbId}/watch?locale=${region}`;
}

function pickBestProvider(regionData) {
  if (!regionData) return null;
  for (const bucket of PROVIDER_PRIORITIES) {
    const entries = regionData[bucket];
    if (Array.isArray(entries) && entries.length) {
      return entries[0];
    }
  }
  return null;
}

async function fetchWatchProviderInfo(tmdbId, mediaType = "movie") {
  const cacheKey = `${mediaType}-${tmdbId}`;
  if (watchProviderInfoCache.has(cacheKey)) {
    return watchProviderInfoCache.get(cacheKey);
  }
  const typePath = mediaType === "tv" ? "tv" : "movie";
  const url = new URL(`${TMDB_BASE_URL}/${typePath}/${tmdbId}/watch/providers`);
  url.searchParams.set("api_key", TMDB_API_KEY);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load watch providers");
  }
  const data = await response.json();
  const regionData = data?.results?.[DEFAULT_WATCH_REGION] || null;
  watchProviderInfoCache.set(cacheKey, regionData);
  return regionData;
}

async function ensureWatchLink(item) {
  if (!item) return "";
  if (!item.watchLink) {
    item.watchLink = buildTmdbWatchLink(item, DEFAULT_WATCH_REGION);
  }
  try {
    const regionData = await fetchWatchProviderInfo(item.tmdbId, item.mediaType);
    if (!regionData) {
      if (!item.watchProviderName) {
        item.watchProviderName = "";
      }
      return item.watchLink;
    }
    const provider = pickBestProvider(regionData);
    let providerLink = regionData.link || "";
    if (provider) {
      const builder = PROVIDER_LINK_BUILDERS[provider.provider_id];
      providerLink = builder
        ? builder(item)
        : buildTmdbWatchLink(item, DEFAULT_WATCH_REGION);
      item.watchProviderName = provider.provider_name || "";
    } else {
      item.watchProviderName = "";
    }
    if (!providerLink) {
      providerLink = buildTmdbWatchLink(item, DEFAULT_WATCH_REGION);
    }
    if (providerLink && providerLink !== item.watchLink) {
      item.watchLink = providerLink;
      saveWatchlist({ skipRemote: true });
    }
    return item.watchLink;
  } catch (error) {
    console.warn("Failed to fetch watch providers", error);
  }
  return item.watchLink;
}

function renderSearchResults(items) {
  lastSearchResults = items;
  const template = document.getElementById("search-card-template");
  searchResultsEl.innerHTML = "";

  items.forEach((item) => {
    const clone = template.content.cloneNode(true);
    const img = clone.querySelector("img");
    const titleEl = clone.querySelector("h3");
    const metaEl = clone.querySelector(".meta");
    const overviewEl = clone.querySelector(".overview");
    const button = clone.querySelector("button");

    img.src = item.poster;
    img.alt = `${item.title} poster`;
    titleEl.textContent = item.title;
    metaEl.textContent =
      item.mediaType === "movie"
        ? `Movie • ${item.year}`
        : `Series • ${item.year}`;
    overviewEl.textContent = item.overview;
    const trailerBtn = clone.querySelector(".trailer-pill");
    if (trailerBtn) {
      if (item.trailerUrl) {
        trailerBtn.href = item.trailerUrl;
        trailerBtn.classList.remove("hidden");
      } else {
        trailerBtn.classList.add("hidden");
      }
    }

    const exists = watchlist.some(
      (entry) =>
        entry.tmdbId === item.tmdbId && entry.mediaType === item.mediaType
    );

    if (exists) {
      button.textContent = "Already added";
      button.disabled = true;
      button.classList.add("disabled");
    } else {
      button.addEventListener("click", () => addToWatchlist(item));
    }

    searchResultsEl.appendChild(clone);
  });
}

async function addToWatchlist(item) {
  const alreadyExists = watchlist.some(
    (entry) => entry.tmdbId === item.tmdbId && entry.mediaType === item.mediaType
  );
  if (alreadyExists) {
    return;
  }

  const entry = {
    ...item,
    id: `${item.mediaType}-${item.tmdbId}`,
    status: "watch_later",
    rating: 0,
    notes: "",
    finishedDate: "",
    addedAt: Date.now(),
    reminderTimestamp: Date.now(),
    favorite: false,
    tags: [],
    sortIndex: getNextSortIndex(),
    trailerUrl: "",
    watchLink: buildTmdbLink(item),
  };

  watchlist = [...watchlist, entry];
  saveWatchlist();
  renderWatchlist(activeStatusFilter);
  renderReminders();
  if (lastSearchResults.length) {
    renderSearchResults(lastSearchResults);
  }

  // Fetch trailer URL asynchronously after adding
  try {
    const trailerUrl = await fetchTrailerUrl(entry.tmdbId, entry.mediaType);
    if (trailerUrl) {
      entry.trailerUrl = trailerUrl;
      saveWatchlist();
      // Update the UI if this item is currently visible
      // Trailer URL saved to item, will be available in detail modal
    }
  } catch (error) {
    console.warn("Failed to fetch trailer for", entry.title, error);
  }

  ensureWatchLink(entry).catch((error) => {
    console.warn("Failed to fetch watch providers for", entry.title, error);
  });
}

function renderWatchlist(filter = "all") {
  if (!watchlist.length) {
    watchlistEl.innerHTML =
      '<div class="empty-state">Start by adding something that sparks joy ✨</div>';
    renderCollections();
    return;
  }

  const template = document.getElementById("watch-card-template");
  watchlistEl.innerHTML = "";

  const sortedItems = watchlist
    .slice()
    .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));

  const filtered = sortedItems.filter((item) => {
    if (filter === "all") return true;
    if (filter === "favorites") return item.favorite;
    return item.status === filter;
  });

  if (!filtered.length) {
    watchlistEl.innerHTML =
      '<div class="empty-state">Nothing in this bucket yet.</div>';
    renderCollections();
    return;
  }

  filtered.forEach((item, index) => {
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector(".watch-card");
    const img = clone.querySelector("img");
    const titleEl = clone.querySelector("h3");
    const metaEl = clone.querySelector(".meta");
    const typeEl = clone.querySelector(".item-type");
    const statusLabelEl = clone.querySelector(".status-label");
    const tagListEl = clone.querySelector(".tag-list");
    const statusDividerEl = clone.querySelector(".status-divider");
    const removeBtn = clone.querySelector(".remove-btn");
    const favoriteBtn = clone.querySelector(".favorite-toggle");
    const orderEl = clone.querySelector(".item-order");
    const trailerBtn = clone.querySelector(".watch-trailer-btn");
    const watchBtn = clone.querySelector(".watch-now-btn");

    const tags = Array.isArray(item.tags) ? item.tags : [];
    const isFavorite = !!item.favorite;

    // Display order number (1-based, showing position in filtered list)
    if (orderEl) {
      orderEl.textContent = `#${index + 1}`;
    }

    card.dataset.itemId = item.id;
    card.draggable = true;

    card.addEventListener("dragstart", (event) => {
      draggedItemId = item.id;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", item.id);
      card.classList.add("dragging");
    });

    card.addEventListener("dragend", () => {
      draggedItemId = null;
      card.classList.remove("dragging");
    });

    card.addEventListener("dragover", (event) => {
      event.preventDefault();
    });

    card.addEventListener("drop", (event) => {
      event.preventDefault();
      if (!draggedItemId || draggedItemId === item.id) return;
      reorderWatchlist(draggedItemId, item.id);
    });

    img.src = item.poster || PLACEHOLDER_POSTER;
    img.alt = `${item.title} poster`;
    titleEl.textContent = item.title;
    metaEl.textContent = `${item.year} • ${
      item.mediaType === "movie" ? "Movie" : "Series"
    }`;
    typeEl.textContent = item.mediaType === "movie" ? "Movie" : "Series";

    if (statusLabelEl) {
      statusLabelEl.textContent = formatStatusLabel(item.status);
    }

    tagListEl.innerHTML = "";
    tags.forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "tag-chip";
      chip.textContent = tag;
      const removeTagBtn = document.createElement("button");
      removeTagBtn.type = "button";
      removeTagBtn.setAttribute("aria-label", `Remove tag ${tag}`);
      removeTagBtn.textContent = "×";
      removeTagBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        removeTagFromItem(item.id, tag);
      });
      chip.appendChild(removeTagBtn);
      tagListEl.appendChild(chip);
    });

    if (statusDividerEl) {
      statusDividerEl.classList.toggle("hidden", !tags.length);
    }

    favoriteBtn.classList.toggle("active", isFavorite);
    favoriteBtn.setAttribute("aria-pressed", isFavorite ? "true" : "false");
    favoriteBtn.title = isFavorite
      ? "Remove from favorites"
      : "Add to favorites";
    favoriteBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      const willFavorite = !item.favorite;
      updateWatchlistItem(
        item.id,
        { favorite: willFavorite },
        { refreshReminders: false }
      );
      showToast(willFavorite ? "Added to favorites" : "Removed from favorites");
    });

    removeBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      removeItem(item.id);
    });

    if (watchBtn) {
      initializeWatchButton(watchBtn, item, { stopPropagation: true });
      ensureWatchLink(item)
        .then(() => {
          if (watchBtn.isConnected) {
            initializeWatchButton(watchBtn, item, { stopPropagation: true });
          }
        })
        .catch(() => {});
    }
    if (trailerBtn) {
      initializeTrailerButton(trailerBtn, item, { stopPropagation: true });
    }

    card.addEventListener("click", () => {
      openDetailModal(item.id);
    });

    watchlistEl.appendChild(clone);
  });
  renderProfileCard();
  renderStats();
  renderCollections();
}

function formatStatusLabel(status) {
  if (!status) return "Unknown";
  return status.replace("_", " ");
}

function setWatchButtonLabel(button, label) {
  const labelEl = button.querySelector(".watch-label");
  if (labelEl) {
    labelEl.textContent = label;
  } else {
    button.textContent = label;
  }
}

function initializeWatchButton(button, item, { stopPropagation = false } = {}) {
  if (!button || !item) return;
  if (!item.watchLink) {
    item.watchLink = buildTmdbWatchLink(item, DEFAULT_WATCH_REGION);
  }
  const plain = button.dataset.watchPlain === "true";
  const label = plain
    ? "Watch"
    : item.watchProviderName
      ? `Watch · ${item.watchProviderName}`
      : "Watch";
  setWatchButtonLabel(button, label);
  button.disabled = !item.watchLink;
  button.onclick = (event) => {
    if (stopPropagation) {
      event.stopPropagation();
    }
    if (!item.watchLink) return;
    window.open(item.watchLink, "_blank", "noopener,noreferrer");
  };
}

function initializeTrailerButton(button, item, { stopPropagation = false } = {}) {
  if (!button || !item) return;
  button.dataset.loading = "false";
  button.disabled = false;
  const defaultLabel = button.dataset.defaultLabel || button.textContent || "Trailer";
  button.dataset.defaultLabel = defaultLabel;
  button.textContent = defaultLabel;

  button.onclick = async (event) => {
    if (stopPropagation) {
      event.stopPropagation();
    }
    event.preventDefault();
    if (button.dataset.loading === "true") return;
    button.dataset.loading = "true";
    button.disabled = true;
    button.textContent = "Loading…";
    const { success, message } = await openTrailerForItem(item);
    if (!success && message) {
      showToast(message);
    }
    button.dataset.loading = "false";
    button.disabled = false;
    button.textContent = defaultLabel;
  };
}

async function openTrailerForItem(item) {
  if (!item) {
    return { success: false, message: "Trailer not available right now." };
  }
  try {
    const hadTrailer = Boolean(item.trailerUrl);
    let url = item.trailerUrl;
    if (!url) {
      url = await ensureTrailerUrl(item);
      if (url && !hadTrailer) {
        saveWatchlist();
      }
    }
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return { success: true };
    }
    return { success: false, message: "Trailer not available yet." };
  } catch (error) {
    console.warn("Failed to open trailer", error);
    return { success: false, message: "Trailer not available right now." };
  }
}

function reorderWatchlist(sourceId, targetId) {
  const sourceIndex = watchlist.findIndex((item) => item.id === sourceId);
  const targetIndex = watchlist.findIndex((item) => item.id === targetId);
  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return;
  }
  const [moved] = watchlist.splice(sourceIndex, 1);
  watchlist.splice(targetIndex, 0, moved);
  applySortOrder();
  saveWatchlist();
  renderWatchlist(activeStatusFilter);
  renderReminders();
}

function showToast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.remove("hidden");
  // force reflow so transition triggers if called rapidly
  void toastEl.offsetWidth;
  toastEl.classList.add("visible");
  if (toastTimeout) clearTimeout(toastTimeout);
  if (toastHideTimeout) clearTimeout(toastHideTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove("visible");
    toastHideTimeout = setTimeout(() => {
      toastEl.classList.add("hidden");
    }, 220);
  }, 1800);
}

function updateWatchlistItem(
  id,
  updates,
  {
    refreshWatchlist = true,
    refreshReminders = false,
    refreshCollections = true,
  } = {}
) {
  const index = watchlist.findIndex((item) => item.id === id);
  if (index === -1) return;
  const existingItem = watchlist[index];
  let reminderTimestamp = existingItem.reminderTimestamp || "";
  if (Object.prototype.hasOwnProperty.call(updates, "status")) {
    const nextStatus = updates.status;
    if (REMINDER_STATUSES.includes(nextStatus)) {
      if (nextStatus !== existingItem.status) {
        reminderTimestamp = Date.now();
      }
    } else {
      reminderTimestamp = "";
    }
  }

  const updatedItem = {
    ...existingItem,
    ...updates,
    reminderTimestamp,
  };

  if (!updatedItem.reminderTimestamp && REMINDER_STATUSES.includes(updatedItem.status)) {
    updatedItem.reminderTimestamp = updatedItem.addedAt || Date.now();
  }
  watchlist = [
    ...watchlist.slice(0, index),
    updatedItem,
    ...watchlist.slice(index + 1),
  ];
  saveWatchlist();
  if (refreshWatchlist) {
    renderWatchlist(activeStatusFilter);
  }
  if (refreshReminders) {
    renderReminders();
  } else if (refreshCollections) {
    renderCollections();
  }
  syncDetailModal(id);
}

function removeItem(id) {
  watchlist = watchlist.filter((item) => item.id !== id);
  saveWatchlist();
  renderWatchlist(activeStatusFilter);
  renderReminders();
  if (activeDetailId === id) {
    closeDetailModal();
  }
}

function formatDaysAgo(timestamp) {
  if (!timestamp) return "";
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

function getReminderReferenceTime(item) {
  return item.reminderTimestamp || item.addedAt || 0;
}

function renderReminders() {
  const reminderItems = watchlist.filter((item) =>
    ["watch_later", "on_hold"].includes(item.status)
  );

  // Update count badge
  if (reminderCountEl) {
    reminderCountEl.textContent = reminderItems.length;
  }

  if (!reminderItems.length) {
    reminderListEl.innerHTML =
      '<div class="empty-state">Nothing waiting on you right now.</div>';
    if (reminderSummaryEl) {
      reminderSummaryEl.innerHTML = "";
    }
    renderCollections();
    return;
  }

  // Sort by watchlist order (sortIndex) - top item in watchlist = first in reminders
  const sortedItems = reminderItems
    .slice()
    .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));

  // Update summary message
  if (reminderSummaryEl) {
    const oldestItem = sortedItems[0];
    const oldestReference = oldestItem ? getReminderReferenceTime(oldestItem) : 0;
    const oldestDays = oldestReference
      ? Math.floor((Date.now() - oldestReference) / (1000 * 60 * 60 * 24))
      : 0;
    reminderSummaryEl.innerHTML = `
      <p class="reminder-message">
        You have <strong>${reminderItems.length}</strong> unwatched title${reminderItems.length !== 1 ? "s" : ""} waiting for you!
      </p>
      ${oldestDays > 0 ? `<p class="reminder-stats">Oldest item added ${oldestDays} day${oldestDays !== 1 ? "s" : ""} ago - it's time to watch something!</p>` : ""}
    `;
  }

  const template = document.getElementById("reminder-card-template");
  reminderListEl.innerHTML = "";

  sortedItems.forEach((item) => {
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector(".reminder-card");
    const img = clone.querySelector("img");
    const daysAgoEl = clone.querySelector(".reminder-days-ago");
    const hiddenText = clone.querySelector(".sr-only");
    img.src = item.poster || PLACEHOLDER_POSTER;
    img.alt = `${item.title} poster`;
    if (daysAgoEl) {
      daysAgoEl.textContent = formatDaysAgo(getReminderReferenceTime(item));
    }
    hiddenText.textContent = `${item.title} (${item.year}) – ${item.status.replace(
      "_",
      " "
    )}`;
    // Make card clickable to open detail modal
    if (card) {
      card.addEventListener("click", () => {
        openDetailModal(item.id);
      });
    }
    reminderListEl.appendChild(clone);
  });

  renderCollections();
}

function renderCollections() {
  if (!collectionsEl) return;

  const tagMap = new Map();
  watchlist.forEach((item) => {
    const tags = Array.isArray(item.tags) ? item.tags : [];
    tags.forEach((rawTag) => {
      const tag = rawTag.trim();
      if (!tag) return;
      if (!tagMap.has(tag)) {
        tagMap.set(tag, []);
      }
      tagMap.get(tag).push(item);
    });
  });

  const favorites = watchlist.filter((item) => item.favorite);

  const fragment = document.createDocumentFragment();
  if (favorites.length) {
    fragment.appendChild(buildCollectionSection("Favorites", favorites));
  }

  Array.from(tagMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([tag, items]) => {
      fragment.appendChild(buildCollectionSection(tag, items));
    });

  collectionsEl.innerHTML = "";
  if (!fragment.childNodes.length) {
    collectionsEl.innerHTML =
      '<div class="empty-state">Mark favorites or add tags to see collections here.</div>';
  } else {
    collectionsEl.appendChild(fragment);
  }

  collectionsEl.classList.toggle("hidden", activeTab !== "collections");
}

function buildCollectionSection(title, items) {
  const section = document.createElement("section");
  section.className = "collection-group";

  const heading = document.createElement("h3");
  heading.textContent = title;
  section.appendChild(heading);

  const grid = document.createElement("div");
  grid.className = "collection-thumbs";

  items.forEach((item) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "collection-thumb";

    const img = document.createElement("img");
    img.src = item.poster || PLACEHOLDER_POSTER;
    img.alt = `${item.title} poster`;
    card.appendChild(img);

    const caption = document.createElement("span");
    caption.textContent = item.title;
    card.appendChild(caption);

    card.addEventListener("click", () => openDetailModal(item.id));
    grid.appendChild(card);
  });

  section.appendChild(grid);
  return section;
}

document.addEventListener("DOMContentLoaded", init);
