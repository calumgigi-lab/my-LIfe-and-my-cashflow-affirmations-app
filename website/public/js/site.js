(function () {
  const API_BASE = window.ZION_API_BASE || "";
  const CHANNEL_URL = "https://www.youtube.com/@ZionHouseIntl";

  document.getElementById("year").textContent = new Date().getFullYear();

  // Mobile nav
  const toggle = document.getElementById("navToggle");
  const drawer = document.getElementById("navDrawer");
  toggle?.addEventListener("click", () => {
    const open = drawer.hidden;
    drawer.hidden = !open;
    toggle.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });
  drawer?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      drawer.hidden = true;
      toggle.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });

  // Header scroll state
  const header = document.querySelector(".site-header");
  const brandIntro = document.querySelector(".brand-intro");
  const onScroll = () => {
    const y = window.scrollY;
    header?.classList.toggle("scrolled", y > 24);
    if (brandIntro) {
      const brandBottom = brandIntro.offsetTop + brandIntro.offsetHeight - 80;
      header?.classList.toggle("on-light", y < brandBottom);
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Active nav highlight
  const sections = [...document.querySelectorAll("section[id]")];
  const navLinks = [...document.querySelectorAll("[data-nav]")];
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
        });
      });
    },
    { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
  );
  sections.forEach((s) => sectionObserver.observe(s));

  // Scroll reveal
  const revealEls = document.querySelectorAll(".reveal");
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -30px 0px" },
  );
  revealEls.forEach((el) => revealObserver.observe(el));

  // ── YouTube channel ──
  const player = document.getElementById("ytPlayer");
  const nowTitle = document.getElementById("ytNowTitle");
  const nowDate = document.getElementById("ytNowDate");
  const grid = document.getElementById("youtubeGrid");
  const liveBtn = document.getElementById("watchLiveBtn");
  let channelData = null;
  let activeVideoId = null;

  function formatDate(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  }

  function playVideo(video, autoplay, shouldScroll) {
    if (!player || !video) return;
    activeVideoId = video.id;
    const autoplayParam = autoplay ? "&autoplay=1" : "";
    player.src = `${video.embedUrl}${autoplayParam}`;
    if (nowTitle) nowTitle.textContent = video.title;
    if (nowDate) nowDate.textContent = formatDate(video.published);
    grid?.querySelectorAll(".youtube-card").forEach((card) => {
      card.classList.toggle("active", card.dataset.videoId === video.id);
    });
    if (shouldScroll) {
      document.getElementById("live")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function playLiveStream() {
    if (!player || !channelData?.liveEmbedUrl) return;
    activeVideoId = null;
    player.src = `${channelData.liveEmbedUrl}&autoplay=1`;
    if (nowTitle) nowTitle.textContent = "Zion House Intl — Live Stream";
    if (nowDate) nowDate.textContent = "If no stream is active, pick a recent video below.";
    grid?.querySelectorAll(".youtube-card").forEach((card) => card.classList.remove("active"));
  }

  function renderGrid(videos) {
    if (!grid) return;
    grid.innerHTML = videos
      .map(
        (video) => `
        <button type="button" class="youtube-card" data-video-id="${escapeAttr(video.id)}">
          <div class="youtube-card-thumb">
            <img src="${escapeAttr(video.thumbnail)}" alt="" loading="lazy" />
            <div class="youtube-card-play"><span>▶</span></div>
          </div>
          <div class="youtube-card-body">
            <h4>${escapeHtml(video.title)}</h4>
            <time datetime="${escapeAttr(video.published || "")}">${escapeHtml(formatDate(video.published))}</time>
          </div>
        </button>`,
      )
      .join("");

    grid.querySelectorAll(".youtube-card").forEach((card) => {
      card.addEventListener("click", () => {
        const video = videos.find((v) => v.id === card.dataset.videoId);
        playVideo(video, true, true);
      });
    });
  }

  async function loadYouTube() {
    const sources = [`${API_BASE}/api/youtube`, "data/youtube.json"];
    let lastError = null;

    for (const url of sources) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        channelData = await res.json();
        if (!channelData?.videos?.length) throw new Error("No videos");
        break;
      } catch (e) {
        lastError = e;
        channelData = null;
      }
    }

    if (!channelData?.videos?.length) {
      if (grid) grid.innerHTML = `<div class="youtube-loading">Could not load videos. <a href="${CHANNEL_URL}" target="_blank" rel="noopener" style="color:var(--gold-bright)">Open YouTube ↗</a></div>`;
      if (nowTitle) nowTitle.textContent = "Visit our YouTube channel";
      return;
    }

    renderGrid(channelData.videos);
    playVideo(channelData.videos[0], false, false);
  }

  liveBtn?.addEventListener("click", playLiveStream);

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, "&#39;");
  }

  loadYouTube();

  // ── Testimonies ──
  const testimonyGrid = document.getElementById("testimonyGrid");
  const testimoniesApi = window.ZION_API_BASE || "https://global-affirmation-hub-1.vercel.app";
  const fallbackTestimonies = [
    {
      authorName: "Affirmer from Port Harcourt",
      body: "These daily affirmations rewired how I speak over my business. Within weeks I saw doors open that had been shut for years. Glory to God!",
    },
    {
      authorName: "Zion House Member",
      body: "The July booklet hit differently. Every morning declaration feels like the pastor is in the room with me. My family started affirming together.",
    },
    {
      authorName: "Global Radio Listener",
      body: "I listen on radio and use the app daily. The Message of Life through these affirmations keeps me unshakeable in a shaking world.",
    },
  ];

  async function loadTestimonies() {
    if (!testimonyGrid) return;
    try {
      const res = await fetch(`${testimoniesApi}/api/testimonies`);
      const data = res.ok ? await res.json() : [];
      const items = Array.isArray(data) && data.length ? data : fallbackTestimonies;

      testimonyGrid.innerHTML = items
        .slice(0, 6)
        .map((t) => {
          const img = t.imageData
            ? `<img src="${escapeAttr(t.imageData)}" alt="" loading="lazy" />`
            : "";
          return `
            <article class="testimony-card">
              ${img}
              <blockquote>${escapeHtml(t.body || "")}</blockquote>
              <cite>— ${escapeHtml(t.authorName || "Anonymous")}</cite>
            </article>`;
        })
        .join("");
    } catch {
      testimonyGrid.innerHTML = fallbackTestimonies
        .map(
          (t) => `
          <article class="testimony-card">
            <blockquote>${escapeHtml(t.body)}</blockquote>
            <cite>— ${escapeHtml(t.authorName)}</cite>
          </article>`,
        )
        .join("");
    }
  }

  loadTestimonies();

  // ── Booklet fan showcase ──
  const bookletShowcase = document.getElementById("bookletShowcase");
  const bookletFan = document.getElementById("bookletFan");
  const bookletPreview = document.getElementById("bookletPreview");
  const previewCover = document.getElementById("bookletPreviewCover");
  const previewTag = document.getElementById("bookletPreviewTag");
  const previewTitle = document.getElementById("bookletPreviewTitle");
  const previewDesc = document.getElementById("bookletPreviewDesc");

  const booklets = [
    {
      id: "jan-2026",
      label: "Jan 2026",
      cover: "assets/booklets/january.png",
      tag: "January 2026",
      title: "January Affirmations",
      desc: "Start the year declaring life, health, and prosperity over every area of your world.",
    },
    {
      id: "feb-2026",
      label: "Feb 2026",
      cover: "assets/booklets/february.png",
      tag: "February 2026",
      title: "February Affirmations",
      desc: "Keep your confession sharp through the month — words that build unstoppable momentum.",
    },
    {
      id: "mar-2026",
      label: "Mar 2026",
      cover: "assets/booklets/march.png",
      tag: "March 2026",
      title: "March Affirmations",
      desc: "Daily declarations to keep your spirit aligned and your path illuminated.",
    },
    {
      id: "apr-2026",
      label: "Apr 2026",
      cover: "assets/booklets/april.png",
      tag: "April 2026",
      title: "April Affirmations",
      desc: "Speak life over your family, finances, and future — one day at a time.",
    },
    {
      id: "may-2026",
      label: "May 2026",
      cover: "assets/booklets/may-2026.png",
      tag: "May 2026",
      title: "May Affirmations",
      desc: "A full month of Spirit-led confessions for breakthrough and steady increase.",
    },
    {
      id: "jun-2026",
      label: "Jun 2026",
      cover: "assets/booklets/june-2026.png",
      tag: "June 2026 · Special Edition",
      title: "1 Year of Wonders",
      desc: "Celebrating one year of transformed lives — My Life & My Cashflow Affirmations worldwide.",
    },
    {
      id: "jul-2026",
      label: "Jul 2026",
      cover: "assets/booklets/july-2026.png",
      tag: "Latest · July 2026",
      title: "My Life & My Cashflow Affirmations",
      desc: "31 days of life-changing declarations. Read, affirm, and watch your words reshape your world.",
      selected: true,
    },
  ];

  function renderBookletFan() {
    if (!bookletFan) return;
    bookletFan.innerHTML = booklets
      .map(
        (booklet, index) => `
        <button
          type="button"
          class="booklet-card${booklet.selected ? " is-selected" : ""}"
          data-booklet-id="${escapeAttr(booklet.id)}"
          style="--i:${index}; --tilt:${((index - (booklets.length - 1) / 2) * 5).toFixed(1)}deg"
          aria-pressed="${booklet.selected ? "true" : "false"}"
          aria-label="${escapeAttr(`${booklet.label} booklet`)}"
        >
          <img src="${escapeAttr(booklet.cover)}" alt="" loading="lazy" />
          <span class="booklet-card-label">${escapeHtml(booklet.label)}</span>
        </button>`,
      )
      .join("");

    bookletFan.querySelectorAll(".booklet-card").forEach((card) => {
      card.addEventListener("click", () => selectBooklet(card.dataset.bookletId));
    });
  }

  function selectBooklet(id) {
    const booklet = booklets.find((item) => item.id === id);
    if (!booklet || !bookletPreview) return;

    bookletFan?.querySelectorAll(".booklet-card").forEach((card) => {
      const active = card.dataset.bookletId === id;
      card.classList.toggle("is-selected", active);
      card.setAttribute("aria-pressed", String(active));
    });

    bookletPreview.classList.add("is-updating");
    window.setTimeout(() => {
      if (previewCover) {
        previewCover.src = booklet.cover;
        previewCover.alt = `${booklet.label} booklet cover`;
      }
      if (previewTag) previewTag.textContent = booklet.tag;
      if (previewTitle) previewTitle.textContent = booklet.title;
      if (previewDesc) previewDesc.textContent = booklet.desc;
      bookletPreview.classList.remove("is-updating");
    }, 160);
  }

  renderBookletFan();

  if (bookletShowcase) {
    const bookletObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          bookletShowcase.classList.toggle("is-active", entry.isIntersecting);
        });
      },
      { threshold: 0.35, rootMargin: "0px 0px -10% 0px" },
    );
    bookletObserver.observe(bookletShowcase);
  }

  // ── App showcase ──
  const appShell = document.getElementById("appShell");
  const appCarousel = document.getElementById("appCarousel");
  const appCaption = document.getElementById("appSlideCaption");
  const appTabs = document.querySelectorAll(".app-screen-tab");
  const appScreens = ["library", "today", "profile", "leaderboard"];
  const appCaptions = {
    library: "Browse & unlock monthly booklets",
    today: "Daily affirmation on your home screen",
    profile: "Track streaks and your journey",
    leaderboard: "Points, ranks & community",
  };
  let appRotateTimer = null;
  let appActiveIndex = appScreens.indexOf("today");

  function focusAppScreen(target, fromAuto) {
    if (!appCarousel) return;
    const index = appScreens.indexOf(target);
    if (index === -1) return;
    appActiveIndex = index;

    appCarousel.querySelectorAll(".app-slide").forEach((slide) => {
      slide.classList.toggle("is-active", slide.dataset.screen === target);
    });
    appTabs.forEach((tab) => {
      const active = tab.dataset.target === target;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });

    if (appCaption) {
      appCaption.classList.add("is-changing");
      window.setTimeout(() => {
        appCaption.textContent = appCaptions[target] || "";
        appCaption.classList.remove("is-changing");
      }, 120);
    }

    if (!fromAuto) {
      restartAppRotation();
    }
  }

  function nextAppScreen() {
    appActiveIndex = (appActiveIndex + 1) % appScreens.length;
    focusAppScreen(appScreens[appActiveIndex], true);
  }

  function restartAppRotation() {
    if (appRotateTimer) window.clearInterval(appRotateTimer);
    appRotateTimer = window.setInterval(nextAppScreen, 5500);
  }

  appTabs.forEach((tab) => {
    tab.addEventListener("click", () => focusAppScreen(tab.dataset.target, false));
  });

  if (appShell) {
    const appObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          appShell.classList.toggle("is-active", entry.isIntersecting);
          if (entry.isIntersecting) {
            restartAppRotation();
          } else if (appRotateTimer) {
            window.clearInterval(appRotateTimer);
            appRotateTimer = null;
          }
        });
      },
      { threshold: 0.25, rootMargin: "0px 0px -8% 0px" },
    );
    appObserver.observe(appShell);
  }
})();
