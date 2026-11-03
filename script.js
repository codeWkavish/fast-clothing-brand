/* ==========================================================================
   VESTIRE — Fashion Store Interactions (vanilla JavaScript)
   --------------------------------------------------------------------------
   1.  Helpers & state
   2.  Theme toggle (dark / light)
   3.  Mobile navigation
   4.  Search bar
   5.  Category filters
   6.  Cart (add, remove, quantity, localStorage)
   7.  Wishlist
   8.  Drawers (cart + wishlist)
   9.  Newsletter form
   10. Sale countdown
   11. Scroll effects (header shadow, reveal on scroll)
   12. Image fallback
   ========================================================================== */

(function () {
  "use strict";

  document.documentElement.classList.add("js");

  /* ---------- 1. HELPERS & STATE ---------- */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const formatINR = (n) => "₹" + Number(n).toLocaleString("en-IN");

  const load = (key) => {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; }
  };
  const save = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  };

  let cart = load("vestire-cart");         // [{ id, qty }]
  let wishlist = load("vestire-wishlist"); // [id, id, ...]

  const productCards = $$(".product-card");
  const header = $("#siteHeader");
  const toastEl = $("#toast");
  let toastTimer;

  /** Read product details from the card in the HTML (single source of truth). */
  function getProduct(id) {
    const card = $(`.product-card[data-id="${id}"]`);
    if (!card) return null;
    const img = $("img", card);
    return {
      id: String(id),
      name: card.dataset.name,
      type: card.dataset.type,
      price: Number(card.dataset.price),
      image: img ? img.getAttribute("src") : "",
      alt: img ? img.getAttribute("alt") : card.dataset.name
    };
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 2400);
  }

  function updateBadge(el, count) {
    el.textContent = count;
    el.classList.toggle("has-items", count > 0);
    el.classList.remove("bump");
    void el.offsetWidth; // restart animation
    el.classList.add("bump");
  }


  /* ---------- 2. THEME TOGGLE ---------- */
  const themeBtn = $("#themeToggle");
  const root = document.documentElement;

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    themeBtn.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
  }

  let savedTheme = null;
  try { savedTheme = localStorage.getItem("vestire-theme"); } catch (e) { /* ignore */ }
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(savedTheme || (prefersDark ? "dark" : "light"));

  themeBtn.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem("vestire-theme", next); } catch (e) { /* ignore */ }
  });


  /* ---------- 3. MOBILE NAVIGATION ---------- */
  const navToggle = $("#navToggle");
  const navMenu = $("#navMenu");

  function setNav(open) {
    navMenu.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    $("use", navToggle).setAttribute("href", open ? "#i-close" : "#i-menu");
  }

  navToggle.addEventListener("click", () => setNav(!navMenu.classList.contains("is-open")));
  document.addEventListener("click", (e) => {
    if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) setNav(false);
  });


  /* ---------- 4. SEARCH ---------- */
  const searchToggle = $("#searchToggle");
  const searchBar = $("#searchBar");
  const searchInput = $("#searchInput");
  const searchResult = $("#searchResult");
  const searchClose = $("#searchClose");
  const emptyState = $("#emptyState");

  let activeFilter = "all";
  let searchTerm = "";

  function openSearch() {
    searchBar.hidden = false;
    searchToggle.setAttribute("aria-expanded", "true");
    searchInput.focus();
  }
  function closeSearch() {
    searchBar.hidden = true;
    searchToggle.setAttribute("aria-expanded", "false");
    searchInput.value = "";
    searchTerm = "";
    searchResult.textContent = "";
    applyFilters();
  }

  searchToggle.addEventListener("click", () => (searchBar.hidden ? openSearch() : closeSearch()));
  searchClose.addEventListener("click", closeSearch);
  $("#searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    $("#new-arrivals").scrollIntoView({ behavior: "smooth" });
  });

  searchInput.addEventListener("input", () => {
    searchTerm = searchInput.value.trim().toLowerCase();
    // searching across everything feels better than searching inside one filter
    if (searchTerm && activeFilter !== "all") setFilter("all", false);
    applyFilters();
    if (searchTerm) {
      const visible = $$("#productGrid .product-card:not(.is-hidden)").length;
      searchResult.textContent = visible + (visible === 1 ? " result" : " results");
    } else {
      searchResult.textContent = "";
    }
  });


  /* ---------- 5. CATEGORY FILTERS ---------- */
  const filterBtns = $$(".filter-btn");
  const gridCards = $$("#productGrid .product-card");

  function matchesFilter(card, filter) {
    if (filter === "all") return true;
    if (filter === "sale") return card.dataset.sale === "true";
    return card.dataset.category === filter;
  }

  function applyFilters() {
    let shown = 0;
    gridCards.forEach((card) => {
      const text = (card.dataset.name + " " + card.dataset.category + " " + card.dataset.type).toLowerCase();
      const visible = matchesFilter(card, activeFilter) && (!searchTerm || text.includes(searchTerm));
      const wasHidden = card.classList.contains("is-hidden");
      card.classList.toggle("is-hidden", !visible);
      if (visible) {
        shown++;
        if (wasHidden) {                       // replay entrance animation
          card.classList.remove("reveal-in");
          void card.offsetWidth;
          card.classList.add("reveal-in");
        }
      }
    });
    emptyState.hidden = shown !== 0;
  }

  function setFilter(filter, apply = true) {
    activeFilter = filter;
    filterBtns.forEach((btn) => {
      const on = btn.dataset.filter === filter;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", String(on));
    });
    if (apply) applyFilters();
  }

  filterBtns.forEach((btn) => btn.addEventListener("click", () => setFilter(btn.dataset.filter)));

  // Any link with data-filter (nav, category cards, footer, banners) sets the filter then scrolls via its href
  $$("a[data-filter]").forEach((link) => {
    link.addEventListener("click", () => {
      searchTerm = "";
      searchInput.value = "";
      searchResult.textContent = "";
      setFilter(link.dataset.filter);
      setNav(false);
    });
  });

  // Close mobile menu when any nav link is used
  $$(".nav__link").forEach((link) => link.addEventListener("click", () => setNav(false)));


  /* ---------- 6. CART ---------- */
  const cartCount = $("#cartCount");
  const cartList = $("#cartList");
  const cartEmpty = $("#cartEmpty");
  const cartTotal = $("#cartTotal");

  function addToCart(id) {
    const item = cart.find((c) => c.id === id);
    if (item) item.qty += 1; else cart.push({ id, qty: 1 });
    persistCart();
    const p = getProduct(id);
    showToast(p.name + " added to your bag");
  }

  function changeQty(id, delta) {
    const item = cart.find((c) => c.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter((c) => c.id !== id);
    persistCart(false);
  }

  function removeFromCart(id) {
    cart = cart.filter((c) => c.id !== id);
    persistCart(false);
  }

  function persistCart(bump = true) {
    save("vestire-cart", cart);
    renderCart(bump);
  }

  /** Build a drawer line item using DOM methods. */
  function buildLine(product, extras) {
    const li = document.createElement("li");
    li.className = "line-item";

    const imgWrap = document.createElement("div");
    imgWrap.className = "line-item__img";
    const img = document.createElement("img");
    img.src = product.image;
    img.alt = product.alt;
    imgWrap.appendChild(img);

    const info = document.createElement("div");
    const h = document.createElement("h3");
    h.textContent = product.name;
    const p = document.createElement("p");
    p.textContent = product.type + " · " + formatINR(product.price);
    info.append(h, p);
    if (extras.info) info.appendChild(extras.info);

    li.append(imgWrap, info, extras.side);
    return li;
  }

  function renderCart(bump = true) {
    cartList.textContent = "";
    let total = 0;
    let count = 0;

    cart.forEach((entry) => {
      const product = getProduct(entry.id);
      if (!product) return;
      total += product.price * entry.qty;
      count += entry.qty;

      const qty = document.createElement("div");
      qty.className = "qty";
      const minus = document.createElement("button");
      minus.textContent = "−";
      minus.setAttribute("aria-label", "Decrease quantity of " + product.name);
      minus.addEventListener("click", () => changeQty(entry.id, -1));
      const num = document.createElement("span");
      num.textContent = entry.qty;
      const plus = document.createElement("button");
      plus.textContent = "+";
      plus.setAttribute("aria-label", "Increase quantity of " + product.name);
      plus.addEventListener("click", () => changeQty(entry.id, 1));
      qty.append(minus, num, plus);

      const side = document.createElement("div");
      side.className = "line-item__side";
      const price = document.createElement("span");
      price.textContent = formatINR(product.price * entry.qty);
      const remove = document.createElement("button");
      remove.className = "line-item__remove";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => removeFromCart(entry.id));
      side.append(price, remove);

      cartList.appendChild(buildLine(product, { info: qty, side }));
    });

    cartEmpty.hidden = count > 0;
    cartTotal.textContent = formatINR(total);
    $(".drawer__foot", $("#cartDrawer")).hidden = count === 0;

    if (bump) updateBadge(cartCount, count);
    else { cartCount.textContent = count; cartCount.classList.toggle("has-items", count > 0); }
  }

  // Add to Cart buttons on every product card
  $$("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.closest(".product-card").dataset.id;
      addToCart(id);
      btn.textContent = "Added ✓";
      btn.classList.add("is-added");
      setTimeout(() => { btn.textContent = "Add to Cart"; btn.classList.remove("is-added"); }, 1400);
    });
  });

  $("#clearCart").addEventListener("click", () => { cart = []; persistCart(false); });
  $("#checkoutBtn").addEventListener("click", () => {
    cart = [];
    persistCart(false);
    closeDrawers();
    showToast("Thank you! This is a demo store — no real order was placed.");
  });


  /* ---------- 7. WISHLIST ---------- */
  const wishCount = $("#wishlistCount");
  const wishListEl = $("#wishList");
  const wishEmpty = $("#wishEmpty");

  function syncWishButtons() {
    $$(".wish-btn").forEach((btn) => {
      const id = btn.closest(".product-card").dataset.id;
      btn.setAttribute("aria-pressed", String(wishlist.includes(id)));
    });
  }

  function toggleWishlist(id) {
    const index = wishlist.indexOf(id);
    const p = getProduct(id);
    if (index > -1) { wishlist.splice(index, 1); showToast("Removed from wishlist"); }
    else { wishlist.push(id); showToast(p.name + " saved to wishlist"); }
    save("vestire-wishlist", wishlist);
    syncWishButtons();
    renderWishlist(true);
  }

  function renderWishlist(bump = false) {
    wishListEl.textContent = "";

    wishlist.forEach((id) => {
      const product = getProduct(id);
      if (!product) return;

      const side = document.createElement("div");
      side.className = "line-item__side";
      const remove = document.createElement("button");
      remove.className = "line-item__remove";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => toggleWishlist(id));
      side.appendChild(remove);

      const moveBtn = document.createElement("button");
      moveBtn.className = "btn btn--dark btn--sm line-item__move";
      moveBtn.textContent = "Add to bag";
      moveBtn.addEventListener("click", () => { addToCart(id); });

      wishListEl.appendChild(buildLine(product, { info: moveBtn, side }));
    });

    wishEmpty.hidden = wishlist.length > 0;
    if (bump) updateBadge(wishCount, wishlist.length);
    else { wishCount.textContent = wishlist.length; wishCount.classList.toggle("has-items", wishlist.length > 0); }
  }

  $$(".wish-btn").forEach((btn) => {
    btn.addEventListener("click", () => toggleWishlist(btn.closest(".product-card").dataset.id));
  });


  /* ---------- 8. DRAWERS ---------- */
  const overlay = $("#overlay");
  const cartDrawer = $("#cartDrawer");
  const wishDrawer = $("#wishlistDrawer");
  let lastFocus = null;

  function openDrawer(drawer) {
    closeDrawers(false);
    lastFocus = document.activeElement;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    overlay.hidden = false;
    document.body.classList.add("no-scroll");
    $("[data-close-drawer]", drawer).focus();
  }

  function closeDrawers(restoreFocus = true) {
    [cartDrawer, wishDrawer].forEach((d) => {
      d.classList.remove("is-open");
      d.setAttribute("aria-hidden", "true");
    });
    overlay.hidden = true;
    document.body.classList.remove("no-scroll");
    if (restoreFocus && lastFocus) lastFocus.focus();
  }

  $("#cartToggle").addEventListener("click", () => openDrawer(cartDrawer));
  $("#wishlistToggle").addEventListener("click", () => openDrawer(wishDrawer));
  overlay.addEventListener("click", () => closeDrawers());
  $$("[data-close-drawer]").forEach((btn) => btn.addEventListener("click", () => closeDrawers()));

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeDrawers();
    setNav(false);
    if (!searchBar.hidden) closeSearch();
  });


  /* ---------- 9. NEWSLETTER ---------- */
  const newsForm = $("#newsletterForm");
  const newsEmail = $("#newsEmail");
  const newsMsg = $("#newsMsg");
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  newsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = newsEmail.value.trim();
    newsMsg.className = "newsletter__msg";

    if (!emailPattern.test(value)) {
      newsEmail.classList.add("is-invalid");
      newsMsg.classList.add("is-error");
      newsMsg.textContent = "Please enter a valid email address.";
      newsEmail.focus();
      return;
    }
    newsEmail.classList.remove("is-invalid");
    newsMsg.classList.add("is-success");
    newsMsg.textContent = "Welcome to the inner circle! Check your inbox for 10% off.";
    newsForm.reset();
  });
  newsEmail.addEventListener("input", () => newsEmail.classList.remove("is-invalid"));


  /* ---------- 10. SALE COUNTDOWN ---------- */
  const cdEls = { d: $("#cdDays"), h: $("#cdHours"), m: $("#cdMins"), s: $("#cdSecs") };
  const saleEnd = new Date("2026-11-30T23:59:59").getTime();
  const pad = (n) => String(n).padStart(2, "0");

  function tick() {
    const diff = Math.max(0, saleEnd - Date.now());
    cdEls.d.textContent = pad(Math.floor(diff / 86400000));
    cdEls.h.textContent = pad(Math.floor(diff / 3600000) % 24);
    cdEls.m.textContent = pad(Math.floor(diff / 60000) % 60);
    cdEls.s.textContent = pad(Math.floor(diff / 1000) % 60);
  }
  tick();
  setInterval(tick, 1000);


  /* ---------- 11. SCROLL EFFECTS ---------- */
  window.addEventListener("scroll", () => {
    header.classList.toggle("is-scrolled", window.scrollY > 10);
  }, { passive: true });

  // Reveal sections / cards as they enter the viewport
  const revealTargets = $$(".section__head, .cat-card, .review, .story__grid, .promo__content, .newsletter__inner");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealTargets.forEach((el) => { el.classList.add("reveal"); io.observe(el); });
  }

  // Highlight the nav link of the section currently in view (Home only; filters have their own state)
  const homeLink = $('.nav__link[href="#home"]');
  if (homeLink) homeLink.classList.add("is-active");


  /* ---------- 12. IMAGE FALLBACK ---------- */
  // If a remote photo fails to load, show a tidy placeholder instead of a broken icon.
  // "error" does not bubble, so listen in the capture phase.
  document.addEventListener("error", (e) => {
    const el = e.target;
    if (el && el.tagName === "IMG" && el.parentElement) {
      el.parentElement.classList.add("img-fallback");
    }
  }, true);
  $$("img").forEach((img) => {
    if (img.complete && img.naturalWidth === 0 && img.parentElement) img.parentElement.classList.add("img-fallback");
  });


  /* ---------- INIT ---------- */
  syncWishButtons();
  renderCart(false);
  renderWishlist(false);
  applyFilters();
})();
