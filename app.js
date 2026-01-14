(function () {
  let D = null;

  const LS = {
    cart: "lastbite_cart_v1",
    orders: "lastbite_orders_v1",
    impact: "lastbite_user_impact_v1",
    user: "lastbite_user_v1",
    community: "lastbite_community_impact_v1"
  };

  // DEMO MODE: allow adding to cart any time of day (still DISPLAY pickup windows)
  const DEMO_ORDER_ANYTIME = true;

  /* ---------------------------
     Storage (localStorage + fallback to window.name)
  --------------------------- */
  const NAME_PREFIX = "__lastbite_app_store__=";

  function safeLocalStorageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  function safeLocalStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function readWindowNameStore() {
    try {
      const n = String(window.name || "");
      if (!n.startsWith(NAME_PREFIX)) return {};
      return JSON.parse(n.slice(NAME_PREFIX.length)) || {};
    } catch {
      return {};
    }
  }
  function writeWindowNameStore(obj) {
    try {
      window.name = NAME_PREFIX + JSON.stringify(obj || {});
    } catch {
      // ignore
    }
  }

  function readJSON(key, fallback) {
    try {
      const raw = safeLocalStorageGet(key);
      if (raw != null) return JSON.parse(raw);
    } catch {
      // fall through
    }
    const store = readWindowNameStore();
    return store[key] != null ? store[key] : fallback;
  }

  function writeJSON(key, value) {
    const serialized = JSON.stringify(value);
    const ok = safeLocalStorageSet(key, serialized);

    // always keep fallback store in sync
    const store = readWindowNameStore();
    store[key] = value;
    writeWindowNameStore(store);

    return ok;
  }

  /* ---------------------------
     Helpers
  --------------------------- */
  function money(n) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: "CAD" }).format(Number(n || 0));
    } catch {
      return "$" + (Math.round(Number(n || 0) * 100) / 100).toFixed(2);
    }
  }
  function round1(n) {
    return Math.round(Number(n || 0) * 10) / 10;
  }

  function getCart() {
    const c = readJSON(LS.cart, []);
    return Array.isArray(c) ? c : [];
  }
  function setCart(cart) {
    writeJSON(LS.cart, cart);
    renderCartBadges();
  }

  function getUser() {
    return readJSON(LS.user, null);
  }
  function setUser(u) {
    writeJSON(LS.user, u);
  }

  function getUserImpact() {
    return readJSON(LS.impact, { meals: 0, kgFood: 0, kgCO2e: 0, donated: 0, savings: 0 });
  }
  function setUserImpact(v) {
    writeJSON(LS.impact, v);
  }

  function cartLines(cart) {
    return cart
      .map((it) => {
        const deal = (D && D.DEALS) ? D.DEALS.find((x) => x.id === it.id) : null;
        return deal ? { ...it, deal } : null;
      })
      .filter(Boolean);
  }

  function cartTotals(cart) {
    const lines = cartLines(cart);
    const subtotal = lines.reduce((s, l) => s + Number(l.deal.price || 0) * Number(l.qty || 0), 0);
    const original = lines.reduce((s, l) => s + Number(l.deal.originalValue || 0) * Number(l.qty || 0), 0);
    const savings = Math.max(0, original - subtotal);
    return { lines, subtotal, original, savings };
  }

  function computeImpactForOrder(lines) {
    const meals = lines.reduce((s, l) => s + Number(l.qty || 0), 0);
    const kgFood = meals * Number(D.IMPACT.kgFoodPerMeal || 0);
    const kgCO2e = meals * Number(D.IMPACT.kgCO2ePerMeal || 0);

    const grossProfit = lines.reduce((s, l) => {
      const per = l.mode === "delivery" ? Number(D.IMPACT.grossProfitDelivery || 0) : Number(D.IMPACT.grossProfitPickup || 0);
      return s + per * Number(l.qty || 0);
    }, 0);

    const donated = grossProfit * Number(D.IMPACT.donationRate || 0);
    return { meals, kgFood, kgCO2e, donated, grossProfit };
  }

  function pctOff(deal) {
    const p = Number(deal.price || 0);
    const o = Number(deal.originalValue || 0);
    if (!o) return 0;
    return Math.round((1 - p / o) * 100);
  }

  function parseEndTimeToday(hhmm) {
    const [h, m] = String(hhmm || "23:59").split(":").map(Number);
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 0, m || 0, 0, 0);
  }

  // Display only (does NOT block ordering in demo mode)
  function endsText(deal) {
    const end = parseEndTimeToday(deal.windowEnd);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return DEMO_ORDER_ANYTIME ? "Pickup window ended (demo)" : "Closed";

    const mins = Math.round(diff / 60000);
    if (mins <= 120) return "Ends " + mins + "m";
    return "Ends " + end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function addToCart(dealId, mode, qty) {
    const deal = D && D.DEALS ? D.DEALS.find((x) => x.id === dealId) : null;
    if (!deal) return;

    const m = mode === "delivery" ? "delivery" : "pickup";
    const q = Math.max(1, Math.min(99, Number(qty || 1)));

    const cart = getCart();
    const existing = cart.find((x) => x.id === dealId && x.mode === m);

    if (existing) existing.qty = Number(existing.qty || 0) + q;
    else cart.push({ id: dealId, mode: m, qty: q });

    setCart(cart);
  }

  function renderCartBadges() {
    const cart = getCart();
    const n = cart.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);

    const badge = document.getElementById("cartBadge");
    if (badge) badge.textContent = String(n);

    // optional secondary badge ids (safe)
    const badge2 = document.getElementById("cartCount");
    if (badge2) badge2.textContent = String(n);
  }

  function setActiveTab() {
    const page = document.body.getAttribute("data-page");
    const tabMap = { home: "home", deals: "deals", cart: "cart", impact: "impact", register: "" };
    const active = tabMap[page];

    document.querySelectorAll(".tab").forEach((a) => {
      a.classList.toggle("isOn", a.getAttribute("data-tab") === active);
    });
  }

  function renderAccountLinks() {
    const u = getUser();
    document.querySelectorAll("#accountLink").forEach((el) => {
      el.textContent = u ? (String(u.name || "").split(" ")[0] || "Account") : "Account";
    });
  }

  function ensureCommunityImpact() {
    const existing = readJSON(LS.community, null);
    if (existing) return existing;

    const now = new Date();
    const daySeed = Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
    const meals = 180000 + (daySeed % 9000);

    const kgFood = meals * Number(D.IMPACT.kgFoodPerMeal || 0) * 0.98;
    const kgCO2e = meals * Number(D.IMPACT.kgCO2ePerMeal || 0) * 1.02;
    const savings = meals * 3.6;
    const donated = meals * 0.22;

    const obj = { meals: Math.round(meals), kgFood, kgCO2e, savings, donated };
    writeJSON(LS.community, obj);
    return obj;
  }

  /* ---------------------------
     Click delegation (fixes “button clicks but nothing happens”)
  --------------------------- */
  function flashAdded(btn) {
    if (!btn) return;
    const prev = btn.textContent;
    btn.textContent = "Added ✓";
    btn.disabled = true;
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = prev;
    }, 700);
  }

  function initAddToCartDelegation() {
    if (document.documentElement._lbAddDelegation) return;
    document.documentElement._lbAddDelegation = true;

    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-add], [data-add-del]");
      if (!btn) return;

      // prevent any default navigation/behavior
      e.preventDefault();
      e.stopPropagation();

      const id = btn.getAttribute("data-add") || btn.getAttribute("data-add-del");
      const mode = btn.hasAttribute("data-add-del") ? "delivery" : "pickup";

      addToCart(id, mode, 1);
      renderCartBadges();
      flashAdded(btn);
    });
  }

  /* ---------------------------
     Pages
  --------------------------- */
  function initHome() {
    const pills = document.getElementById("homePills");
    if (pills) {
      pills.innerHTML = `
        <span class="pill">40–70% off</span>
        <span class="pill">Surplus-only</span>
        <span class="pill">Pickup near closing</span>
        <span class="pill">Impact tracker</span>
      `;
    }

    const ui = getUserImpact();
    const impactEl = document.getElementById("homeYourImpact");
    if (impactEl) {
      impactEl.innerHTML = `
        <div class="stat"><div class="stat__k">Meals</div><div class="stat__v">${Number(ui.meals || 0).toLocaleString()}</div></div>
        <div class="stat"><div class="stat__k">Food saved</div><div class="stat__v">${Math.round(Number(ui.kgFood || 0)).toLocaleString()} kg</div></div>
        <div class="stat"><div class="stat__k">CO₂ avoided</div><div class="stat__v">${Math.round(Number(ui.kgCO2e || 0)).toLocaleString()} kg</div></div>
        <div class="stat"><div class="stat__k">You saved</div><div class="stat__v">${money(ui.savings)}</div></div>
      `;
    }

    const list = document.getElementById("homeDeals");
    if (list) {
      const picks = D.DEALS.slice()
        .sort((a, b) => pctOff(b) - pctOff(a) || a.distanceKm - b.distanceKm)
        .slice(0, 4);

      // IMPORTANT: never disable “Add” due to time
      list.innerHTML = picks
        .map((deal) => {
          return `
          <div class="deal">
            <div class="dealTop">
              <div>
                <div class="dealTitle">${deal.emoji || "🍽️"} ${deal.title}</div>
                <div class="dealMeta">${deal.partner} • ${deal.category} • ${endsText(deal)}</div>
                <div class="priceRow" style="margin-top:8px;">
                  <div class="priceNow">${money(deal.price)}</div>
                  <div class="priceWas">${money(deal.originalValue)}</div>
                  <div class="dealMeta">-${pctOff(deal)}%</div>
                </div>
              </div>
            </div>
            <button class="btn btn--primary btn--block" type="button" data-add="${deal.id}">
              Add to cart (Pickup)
            </button>
          </div>
        `;
        })
        .join("");
    }
  }

  function initDeals() {
    const chipsEl = document.getElementById("chips");
    const partnerEl = document.getElementById("partner");
    const tagEl = document.getElementById("tag");
    const sortEl = document.getElementById("sort");
    const qEl = document.getElementById("q");
    const listEl = document.getElementById("dealsList");
    const resultsEl = document.getElementById("resultsCount");
    const emptyEl = document.getElementById("emptyState");
    if (!chipsEl || !partnerEl || !tagEl || !sortEl || !qEl || !listEl || !resultsEl || !emptyEl) return;

    const chips = ["All"].concat(D.CATEGORIES);
    chipsEl.innerHTML = chips
      .map((c, i) => `<button class="chip ${i === 0 ? "isOn" : ""}" type="button" data-chip="${c}">${c}</button>`)
      .join("");

    partnerEl.innerHTML = ["All partners"].concat(D.PARTNERS)
      .map((p, i) => `<option value="${i === 0 ? "all" : p}">${p}</option>`)
      .join("");

    tagEl.innerHTML = ["All", "Vegetarian", "Vegan", "Dairy-free", "Nut-free", "Gluten-free", "Limited", "Best value", "Delivery"]
      .map((t, i) => `<option value="${i === 0 ? "all" : t}">${t}</option>`)
      .join("");

    const state = { category: "All", q: "", partner: "all", tag: "all", sort: "recommended" };
    const norm = (s) => String(s).toLowerCase();

    function matches(deal) {
      const catOk = state.category === "All" ? true : deal.category === state.category;
      const pOk = state.partner === "all" ? true : norm(deal.partner) === norm(state.partner);

      const qOk = !state.q
        ? true
        : [deal.title, deal.partner, deal.description, deal.category].some((x) => norm(x).includes(norm(state.q)));

      const tagOk = (function () {
        if (state.tag === "all") return true;
        const t = norm(state.tag);
        if (t === "delivery") return !!deal.deliveryAvailable;
        const bucket = new Set([].concat(deal.tags || []).concat(deal.dietary || []).map(norm));
        return bucket.has(t);
      })();

      return catOk && pOk && qOk && tagOk;
    }

    function sortDeals(arr) {
      const copy = arr.slice();
      if (state.sort === "bestValue") copy.sort((a, b) => pctOff(b) - pctOff(a));
      else if (state.sort === "endingSoon") copy.sort((a, b) => parseEndTimeToday(a.windowEnd) - parseEndTimeToday(b.windowEnd));
      else if (state.sort === "lowestPrice") copy.sort((a, b) => a.price - b.price);
      else copy.sort((a, b) => pctOff(b) - pctOff(a) || a.distanceKm - b.distanceKm);
      return copy;
    }

    function render() {
      const filtered = D.DEALS.filter(matches);
      const sorted = sortDeals(filtered);

      resultsEl.textContent = `Showing ${sorted.length} deal${sorted.length === 1 ? "" : "s"}.`;
      emptyEl.style.display = sorted.length ? "none" : "block";

      listEl.innerHTML = sorted
        .map((deal) => {
          const deliveryTxt = deal.deliveryAvailable ? "Pickup or delivery" : "Pickup only";

          return `
          <div class="deal">
            <div class="dealTop">
              <div>
                <div class="dealTitle">${deal.emoji || "🍽️"} ${deal.title}</div>
                <div class="dealMeta">${deal.partner} • ${deal.category} • ${deliveryTxt}</div>
                <div class="dealMeta">${deal.window} • ${endsText(deal)} • ${deal.distanceKm.toFixed(1)} km</div>
              </div>
              <div class="dealMeta">-${pctOff(deal)}%</div>
            </div>

            <div class="priceRow">
              <div class="priceNow">${money(deal.price)}</div>
              <div class="priceWas">${money(deal.originalValue)}</div>
            </div>

            <div class="row">
              <button class="btn btn--primary btn--block" type="button" data-add="${deal.id}">
                Add (Pickup)
              </button>
              <button class="btn btn--block" type="button" data-add-del="${deal.id}" ${deal.deliveryAvailable ? "" : "disabled"}>
                Add (Delivery)
              </button>
            </div>
          </div>
        `;
        })
        .join("");
    }

    chipsEl.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-chip]");
      if (!btn) return;
      const val = btn.getAttribute("data-chip");
      state.category = val;
      chipsEl.querySelectorAll(".chip").forEach((b) => b.classList.toggle("isOn", b.getAttribute("data-chip") === val));
      render();
    });

    qEl.addEventListener("input", () => {
      state.q = qEl.value.trim();
      render();
    });
    partnerEl.addEventListener("change", () => {
      state.partner = partnerEl.value;
      render();
    });
    tagEl.addEventListener("change", () => {
      state.tag = tagEl.value;
      render();
    });
    sortEl.addEventListener("change", () => {
      state.sort = sortEl.value;
      render();
    });

    render();
    setInterval(render, 60000);
  }

  function initCart() {
    const itemsEl = document.getElementById("cartItems");
    const emptyEl = document.getElementById("cartEmpty");
    const summaryEl = document.getElementById("cartSummary");
    const form = document.getElementById("checkoutForm");
    const msg = document.getElementById("orderMsg");
    const placeBtn = document.getElementById("placeOrderBtn");
    const loginHint = document.getElementById("loginHint");
    if (!itemsEl || !emptyEl || !summaryEl || !form || !msg || !placeBtn || !loginHint) return;

    function render() {
      const cart = getCart();
      const { lines, subtotal, original, savings } = cartTotals(cart);

      emptyEl.style.display = lines.length ? "none" : "block";
      placeBtn.disabled = lines.length === 0;

      const u = getUser();
      loginHint.innerHTML = u
        ? `Signed in as <strong>${u.name}</strong>`
        : `Not signed in. <a class="chipLink" href="./register.html">Create an account</a> to place orders.`;

      itemsEl.innerHTML = lines
        .map((l) => {
          const modeLabel = l.mode === "delivery" ? "Delivery" : "Pickup";
          return `
          <div class="deal">
            <div class="dealTop">
              <div>
                <div class="dealTitle">${l.deal.emoji || "🍽️"} ${l.deal.title}</div>
                <div class="dealMeta">${l.deal.partner} • ${l.deal.category} • ${modeLabel}</div>
                <div class="priceRow" style="margin-top:8px;">
                  <div class="priceNow">${money(l.deal.price)}</div>
                  <div class="priceWas">${money(l.deal.originalValue)}</div>
                </div>
              </div>
              <button class="btn" type="button" data-remove="${l.deal.id}" data-mode="${l.mode}">Remove</button>
            </div>

            <div class="row">
              <div class="qty">
                <button class="qtyBtn" type="button" data-minus="${l.deal.id}" data-mode="${l.mode}">−</button>
                <div class="qtyVal">${l.qty}</div>
                <button class="qtyBtn" type="button" data-plus="${l.deal.id}" data-mode="${l.mode}">+</button>
              </div>

              <select class="select" data-modepick="${l.deal.id}">
                <option value="pickup" ${l.mode === "pickup" ? "selected" : ""}>Pickup</option>
                ${l.deal.deliveryAvailable ? `<option value="delivery" ${l.mode === "delivery" ? "selected" : ""}>Delivery</option>` : ""}
              </select>
            </div>
          </div>
        `;
        })
        .join("");

      summaryEl.innerHTML = `
        <div class="sumRow"><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
        <div class="sumRow"><span>Original value</span><span>${money(original)}</span></div>
        <div class="sumRow"><span>You save</span><strong>${money(savings)}</strong></div>
      `;

      renderCartBadges();
    }

    function updateQty(id, mode, delta) {
      const cart = getCart();
      const idx = cart.findIndex((x) => x.id === id && x.mode === mode);
      if (idx < 0) return;
      cart[idx].qty = Math.max(0, Number(cart[idx].qty || 0) + Number(delta || 0));
      if (cart[idx].qty === 0) cart.splice(idx, 1);
      setCart(cart);
      render();
    }

    function removeLine(id, mode) {
      setCart(getCart().filter((x) => !(x.id === id && x.mode === mode)));
      render();
    }

    itemsEl.addEventListener("click", (e) => {
      const minus = e.target.closest("[data-minus]");
      const plus = e.target.closest("[data-plus]");
      const rem = e.target.closest("[data-remove]");
      if (minus) updateQty(minus.getAttribute("data-minus"), minus.getAttribute("data-mode"), -1);
      else if (plus) updateQty(plus.getAttribute("data-plus"), plus.getAttribute("data-mode"), +1);
      else if (rem) removeLine(rem.getAttribute("data-remove"), rem.getAttribute("data-mode"));
    });

    itemsEl.addEventListener("change", (e) => {
      const sel = e.target.closest("select[data-modepick]");
      if (!sel) return;

      const id = sel.getAttribute("data-modepick");
      const newMode = sel.value;

      const cart = getCart();
      const lines = cartLines(cart);
      const line = lines.find((l) => l.deal.id === id);
      if (!line) return;

      const oldMode = line.mode;
      if (oldMode === newMode) return;

      const qty = line.qty;

      let next = cart.filter((x) => !(x.id === id && x.mode === oldMode));
      const existing = next.find((x) => x.id === id && x.mode === newMode);
      if (existing) existing.qty = Number(existing.qty || 0) + qty;
      else next.push({ id, mode: newMode, qty });

      setCart(next);
      render();
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const u = getUser();
      if (!u) {
        msg.innerHTML = `Please <a class="chipLink" href="./register.html">create an account</a> before placing an order.`;
        return;
      }

      const cart = getCart();
      const { lines, subtotal, original, savings } = cartTotals(cart);
      if (!lines.length) {
        msg.textContent = "Your cart is empty.";
        return;
      }

      const impact = computeImpactForOrder(lines.map((l) => ({ qty: l.qty, mode: l.mode })));

      const order = {
        id: "ord_" + Date.now(),
        ts: Date.now(),
        user: { name: u.name, email: u.email },
        lines: lines.map((l) => ({ id: l.deal.id, qty: l.qty, mode: l.mode })),
        subtotal,
        original,
        savings,
        impact
      };

      const orders = readJSON(LS.orders, []);
      orders.unshift(order);
      writeJSON(LS.orders, orders.slice(0, 30));

      const ui = getUserImpact();
      setUserImpact({
        meals: Number(ui.meals || 0) + impact.meals,
        kgFood: Number(ui.kgFood || 0) + impact.kgFood,
        kgCO2e: Number(ui.kgCO2e || 0) + impact.kgCO2e,
        donated: Number(ui.donated || 0) + impact.donated,
        savings: Number(ui.savings || 0) + savings
      });

      setCart([]);
      render();
      msg.textContent = "Order placed. Check Your Impact to see your totals.";
    });

    render();
  }

  function initImpact() {
    const your = document.getElementById("yourImpact");
    const comm = document.getElementById("communityImpact");
    const recent = document.getElementById("recentOrders");
    if (!your || !comm || !recent) return;

    const ui = getUserImpact();
    your.innerHTML = `
      <div class="stat"><div class="stat__k">Meals rescued</div><div class="stat__v">${Number(ui.meals || 0).toLocaleString()}</div></div>
      <div class="stat"><div class="stat__k">Food saved</div><div class="stat__v">${Math.round(Number(ui.kgFood || 0)).toLocaleString()} kg</div></div>
      <div class="stat"><div class="stat__k">CO₂ avoided</div><div class="stat__v">${Math.round(Number(ui.kgCO2e || 0)).toLocaleString()} kg</div></div>
      <div class="stat"><div class="stat__k">You saved</div><div class="stat__v">${money(ui.savings)}</div></div>
    `;

    const ci = ensureCommunityImpact();
    comm.innerHTML = `
      <div class="stat"><div class="stat__k">Meals rescued</div><div class="stat__v">${Number(ci.meals || 0).toLocaleString()}</div></div>
      <div class="stat"><div class="stat__k">Food saved</div><div class="stat__v">${Math.round(Number(ci.kgFood || 0)).toLocaleString()} kg</div></div>
      <div class="stat"><div class="stat__k">CO₂ avoided</div><div class="stat__v">${Math.round(Number(ci.kgCO2e || 0)).toLocaleString()} kg</div></div>
      <div class="stat"><div class="stat__k">Est. saved</div><div class="stat__v">${money(ci.savings)}</div></div>
    `;

    const orders = readJSON(LS.orders, []);
    const rows = orders
      .slice(0, 10)
      .map((o) => {
        const d = new Date(o.ts);
        const when = d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

        const title = (o.lines || [])
          .map((l) => {
            const deal = D.DEALS.find((x) => x.id === l.id);
            return deal ? `${l.qty}× ${deal.title}` : `${l.qty}× Item`;
          })
          .join(" • ");

        return `
        <div class="order">
          <div style="font-weight:1100;">${when}</div>
          <div class="meta">${title}</div>
          <div class="meta">Saved ${money(o.savings)} • ${o.impact.meals} meals • ${round1(o.impact.kgCO2e)} kg CO₂e</div>
        </div>
      `;
      })
      .join("");

    recent.innerHTML = rows || `<div class="meta">No orders yet. Add deals and place an order from your cart.</div>`;
  }

  function initRegister() {
    const accountView = document.getElementById("accountView");
    const registerView = document.getElementById("registerView");
    const accountMeta = document.getElementById("accountMeta");
    const form = document.getElementById("registerForm");
    const msg = document.getElementById("registerMsg");
    const logoutBtn = document.getElementById("logoutBtn");
    if (!accountView || !registerView || !form || !msg) return;

    function render() {
      const u = getUser();
      if (u) {
        registerView.style.display = "none";
        accountView.style.display = "block";
        if (accountMeta) accountMeta.textContent = `${u.name} • ${u.email}`;
      } else {
        accountView.style.display = "none";
        registerView.style.display = "block";
      }
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      if (!name || !email || password.length < 6) return;

      setUser({ name, email, createdAt: Date.now() });
      msg.textContent = "Account created. You can start ordering.";
      renderAccountLinks();
      render();
    });

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        try {
          localStorage.removeItem(LS.user);
        } catch {
          // ignore
        }
        const store = readWindowNameStore();
        delete store[LS.user];
        writeWindowNameStore(store);

        renderAccountLinks();
        render();
      });
    }

    render();
  }

  function initCommon() {
    initAddToCartDelegation(); // key fix
    renderCartBadges();
    setActiveTab();
    renderAccountLinks();
  }

  function initPage() {
    const page = document.body.getAttribute("data-page");
    if (page === "home") initHome();
    if (page === "deals") initDeals();
    if (page === "cart") initCart();
    if (page === "impact") initImpact();
    if (page === "register") initRegister();
  }

  function boot() {
    if (!D || !D.DEALS || !D.IMPACT) return;
    initCommon();
    initPage();
  }

  // IMPORTANT: wait for data.js to load
  document.addEventListener("DOMContentLoaded", () => {
    const start = Date.now();
    (function waitForData() {
      D = window.LastBiteData || D;
      if (D || Date.now() - start > 2500) {
        boot();
        return;
      }
      setTimeout(waitForData, 25);
    })();
  });
})();
