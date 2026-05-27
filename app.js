(function () {
  const MIN_DATE = new Date(2026, 0, 1);
  const MAX_DATE = new Date(2030, 11, 31);
  const LIST_TITLE = "Promociones";
  const ADMIN_USER = "admin";
  const ADMIN_PASSWORD = "promos2026";
  const SHAREPOINT_FIELDS = {
    id: "Id",
    title: "Title",
    startDate: "StartDate",
    endDate: "EndDate",
    country: "Country",
    channel: "Channel",
    branches: "Branches",
    linkUrl: "LinkUrl",
    notes: "Notes",
  };

  const colorMap = {
    "Argentina|Locales": "var(--arg-locales)",
    "Argentina|Online": "var(--arg-online)",
    "Uruguay|Locales": "var(--uru-locales)",
    "Uruguay|Online": "var(--uru-online)",
  };

  const demoPromos = [
    {
      id: "demo-1",
      title: "10% extra Apple Childs",
      startDate: "2026-05-26",
      endDate: "2026-05-30",
      country: "Argentina",
      channel: "Locales",
      branches: "Todas las sucursales",
      linkUrl: "",
      notes: "Ejemplo de carga para validar la vista mensual.",
    },
    {
      id: "demo-2",
      title: "Hot Sale accesorios",
      startDate: "2026-05-25",
      endDate: "2026-06-02",
      country: "Uruguay",
      channel: "Online",
      branches: "Ecommerce Uruguay",
      linkUrl: "",
      notes: "Promo visible cruzando meses.",
    },
  ];

  const state = {
    currentDate: clampMonth(new Date(2026, 4, 26)),
    adminUnlocked: sessionStorage.getItem("promoAdminUnlocked") === "true",
    promos: [],
    sharePointEnabled: Boolean(window._spPageContextInfo) || location.hostname.includes("sharepoint.com"),
  };

  const els = {
    adminLoginForm: document.getElementById("adminLoginForm"),
    adminPanel: document.getElementById("adminPanel"),
    adminPassword: document.getElementById("adminPassword"),
    adminToggle: document.getElementById("adminToggle"),
    adminUser: document.getElementById("adminUser"),
    calendarGrid: document.getElementById("calendarGrid"),
    channelFilter: document.getElementById("channelFilter"),
    closeAdmin: document.getElementById("closeAdmin"),
    countryFilter: document.getElementById("countryFilter"),
    dialog: document.getElementById("promoDialog"),
    dialogBranches: document.getElementById("dialogBranches"),
    dialogClose: document.getElementById("dialogClose"),
    dialogDates: document.getElementById("dialogDates"),
    dialogLink: document.getElementById("dialogLink"),
    dialogMeta: document.getElementById("dialogMeta"),
    dialogNotes: document.getElementById("dialogNotes"),
    dialogTitle: document.getElementById("dialogTitle"),
    form: document.getElementById("promoForm"),
    formMessage: document.getElementById("formMessage"),
    legend: document.getElementById("legend"),
    loginMessage: document.getElementById("loginMessage"),
    monthTitle: document.getElementById("monthTitle"),
    nextMonth: document.getElementById("nextMonth"),
    prevMonth: document.getElementById("prevMonth"),
    todayButton: document.getElementById("todayButton"),
  };

  init();

  async function init() {
    bindEvents();
    renderLegend();
    await loadPromos();
    render();
  }

  function bindEvents() {
    els.prevMonth.addEventListener("click", () => moveMonth(-1));
    els.nextMonth.addEventListener("click", () => moveMonth(1));
    els.todayButton.addEventListener("click", () => {
      state.currentDate = clampMonth(new Date());
      render();
    });
    els.countryFilter.addEventListener("change", render);
    els.channelFilter.addEventListener("change", render);
    els.adminToggle.addEventListener("click", openAdmin);
    els.closeAdmin.addEventListener("click", closeAdmin);
    els.dialogClose.addEventListener("click", () => els.dialog.close());
    els.adminLoginForm.addEventListener("submit", unlockAdmin);
    els.form.addEventListener("submit", savePromo);
  }

  async function loadPromos() {
    setMessage("Cargando promociones...");
    if (!state.sharePointEnabled) {
      state.promos = demoPromos;
      setMessage("Modo demo local. En SharePoint se leerá la lista real.");
      return;
    }

    try {
      const items = await fetchSharePointItems();
      state.promos = items.map(fromSharePointItem);
      setMessage("");
    } catch (error) {
      state.promos = demoPromos;
      setMessage("No se pudo leer SharePoint. Mostrando datos demo.");
      console.error(error);
    }
  }

  function render() {
    renderMonthTitle();
    renderAdminState();
    renderCalendar();
    updateNavState();
  }

  function renderMonthTitle() {
    els.monthTitle.textContent = monthLabel(state.currentDate);
  }

  function renderLegend() {
    els.legend.innerHTML = "";
    Object.keys(colorMap).forEach((key) => {
      const [country, channel] = key.split("|");
      const item = document.createElement("span");
      item.className = "legend-item";
      item.innerHTML = `<span class="legend-dot" style="background:${colorMap[key]}"></span>${country} · ${channel}`;
      els.legend.appendChild(item);
    });
  }

  function renderCalendar() {
    els.calendarGrid.innerHTML = "";
    const monthStart = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth(), 1);
    const gridStart = addDays(monthStart, -mondayWeekday(monthStart));
    const visiblePromos = filteredPromos();

    for (let index = 0; index < 42; index += 1) {
      const date = addDays(gridStart, index);
      const dayPromos = visiblePromos
        .filter((promo) => dateInPromo(date, promo))
        .sort((a, b) => parseDate(a.startDate) - parseDate(b.startDate) || a.title.localeCompare(b.title));
      els.calendarGrid.appendChild(renderDay(date, dayPromos));
    }
  }

  function renderDay(date, dayPromos) {
    const day = document.createElement("div");
    day.className = "day";
    if (date.getMonth() !== state.currentDate.getMonth()) day.classList.add("outside-month");
    if (sameDay(date, new Date())) day.classList.add("today");

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = String(date.getDate());
    day.appendChild(number);

    const list = document.createElement("div");
    list.className = "promo-list";
    dayPromos.slice(0, 5).forEach((promo) => list.appendChild(renderPromoChip(date, promo)));
    if (dayPromos.length > 5) {
      const more = document.createElement("span");
      more.className = "more-count";
      more.textContent = `+${dayPromos.length - 5} más`;
      list.appendChild(more);
    }
    day.appendChild(list);
    return day;
  }

  function renderPromoChip(date, promo) {
    const chip = document.createElement("button");
    const starts = sameDay(parseDate(promo.startDate), date);
    const beginsVisibleSegment = starts || date.getDay() === 0 || date.getDate() === 1;
    chip.type = "button";
    chip.className = "promo-chip";
    chip.style.background = colorForPromo(promo);
    chip.textContent = beginsVisibleSegment ? promo.title : "";
    chip.setAttribute("aria-label", promo.title);
    chip.title = promo.title;
    if (parseDate(promo.startDate) < stripTime(date)) chip.classList.add("continues-left");
    if (parseDate(promo.endDate) > stripTime(date)) chip.classList.add("continues-right");
    chip.addEventListener("click", () => openPromoDialog(promo));
    return chip;
  }

  function filteredPromos() {
    const country = els.countryFilter.value;
    const channel = els.channelFilter.value;
    return state.promos.filter((promo) => {
      const countryMatch = country === "all" || promo.country === country;
      const channelMatch = channel === "all" || promo.channel === channel;
      return countryMatch && channelMatch;
    });
  }

  function openPromoDialog(promo) {
    els.dialogMeta.textContent = `${promo.country} · ${promo.channel}`;
    els.dialogTitle.textContent = promo.title;
    els.dialogDates.textContent = `${formatDate(promo.startDate)} al ${formatDate(promo.endDate)}`;
    els.dialogBranches.textContent = promo.branches || "Sin detalle";
    els.dialogNotes.textContent = promo.notes || "Sin comentarios";
    if (promo.linkUrl) {
      els.dialogLink.href = promo.linkUrl;
      els.dialogLink.hidden = false;
    } else {
      els.dialogLink.hidden = true;
    }
    els.dialog.showModal();
  }

  async function savePromo(event) {
    event.preventDefault();
    const formData = new FormData(els.form);
    const promo = Object.fromEntries(formData.entries());

    if (parseDate(promo.endDate) < parseDate(promo.startDate)) {
      setMessage("La fecha final no puede ser anterior a la inicial.");
      return;
    }

    if (!state.sharePointEnabled) {
      promo.id = `local-${Date.now()}`;
      state.promos.push(promo);
      els.form.reset();
      setMessage("Guardado en modo demo. En SharePoint quedará compartido para el equipo.");
      render();
      return;
    }

    try {
      setMessage("Guardando en SharePoint...");
      const item = await createSharePointItem(toSharePointItem(promo));
      state.promos.push(fromSharePointItem(item));
      els.form.reset();
      setMessage("Promoción guardada.");
      render();
    } catch (error) {
      console.error(error);
      setMessage("No se pudo guardar. Revisá permisos y nombres de columnas.");
    }
  }

  async function fetchSharePointItems() {
    const select = Object.values(SHAREPOINT_FIELDS).join(",");
    const url = `${siteUrl()}/_api/web/lists/getbytitle('${encodeURIComponent(LIST_TITLE)}')/items?$select=${select}&$top=5000`;
    const response = await fetch(url, {
      headers: { Accept: "application/json;odata=nometadata" },
      credentials: "same-origin",
    });
    if (!response.ok) throw new Error(`SharePoint read failed: ${response.status}`);
    const data = await response.json();
    return data.value || data.d?.results || [];
  }

  async function createSharePointItem(payload) {
    const digest = await requestDigest();
    const response = await fetch(`${siteUrl()}/_api/web/lists/getbytitle('${encodeURIComponent(LIST_TITLE)}')/items`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json;odata=nometadata",
        "Content-Type": "application/json;odata=nometadata",
        "X-RequestDigest": digest,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`SharePoint create failed: ${response.status}`);
    return response.json();
  }

  async function requestDigest() {
    const response = await fetch(`${siteUrl()}/_api/contextinfo`, {
      method: "POST",
      credentials: "same-origin",
      headers: { Accept: "application/json;odata=nometadata" },
    });
    if (!response.ok) throw new Error(`Digest failed: ${response.status}`);
    const data = await response.json();
    return data.FormDigestValue || data.d?.GetContextWebInformation?.FormDigestValue;
  }

  function fromSharePointItem(item) {
    return {
      id: String(item[SHAREPOINT_FIELDS.id]),
      title: item[SHAREPOINT_FIELDS.title] || "",
      startDate: normalizeSharePointDate(item[SHAREPOINT_FIELDS.startDate]),
      endDate: normalizeSharePointDate(item[SHAREPOINT_FIELDS.endDate]),
      country: item[SHAREPOINT_FIELDS.country] || "",
      channel: item[SHAREPOINT_FIELDS.channel] || "",
      branches: item[SHAREPOINT_FIELDS.branches] || "",
      linkUrl: item[SHAREPOINT_FIELDS.linkUrl]?.Url || item[SHAREPOINT_FIELDS.linkUrl] || "",
      notes: item[SHAREPOINT_FIELDS.notes] || "",
    };
  }

  function toSharePointItem(promo) {
    return {
      [SHAREPOINT_FIELDS.title]: promo.title,
      [SHAREPOINT_FIELDS.startDate]: promo.startDate,
      [SHAREPOINT_FIELDS.endDate]: promo.endDate,
      [SHAREPOINT_FIELDS.country]: promo.country,
      [SHAREPOINT_FIELDS.channel]: promo.channel,
      [SHAREPOINT_FIELDS.branches]: promo.branches || "",
      [SHAREPOINT_FIELDS.linkUrl]: promo.linkUrl || "",
      [SHAREPOINT_FIELDS.notes]: promo.notes || "",
    };
  }

  function moveMonth(offset) {
    state.currentDate = clampMonth(new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() + offset, 1));
    render();
  }

  function updateNavState() {
    const prev = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() - 1, 1);
    const next = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() + 1, 1);
    els.prevMonth.disabled = prev < new Date(MIN_DATE.getFullYear(), MIN_DATE.getMonth(), 1);
    els.nextMonth.disabled = next > new Date(MAX_DATE.getFullYear(), MAX_DATE.getMonth(), 1);
  }

  function openAdmin() {
    els.adminPanel.classList.add("open");
    els.adminPanel.setAttribute("aria-hidden", "false");
    renderAdminState();
    if (state.adminUnlocked) {
      document.getElementById("promoTitle").focus();
    } else {
      els.adminUser.focus();
    }
  }

  function closeAdmin() {
    els.adminPanel.classList.remove("open");
    els.adminPanel.setAttribute("aria-hidden", "true");
  }

  function unlockAdmin(event) {
    event.preventDefault();
    const user = els.adminUser.value.trim();
    const password = els.adminPassword.value;
    if (user !== ADMIN_USER || password !== ADMIN_PASSWORD) {
      els.loginMessage.textContent = "Usuario o contraseña incorrectos.";
      return;
    }
    state.adminUnlocked = true;
    sessionStorage.setItem("promoAdminUnlocked", "true");
    els.adminLoginForm.reset();
    els.loginMessage.textContent = "";
    renderAdminState();
    document.getElementById("promoTitle").focus();
  }

  function renderAdminState() {
    els.adminLoginForm.classList.toggle("unlocked", state.adminUnlocked);
    els.form.classList.toggle("locked", !state.adminUnlocked);
  }

  function setMessage(message) {
    els.formMessage.textContent = message;
  }

  function siteUrl() {
    if (window._spPageContextInfo?.webAbsoluteUrl) return window._spPageContextInfo.webAbsoluteUrl;
    const match = location.pathname.match(/^\/(sites|teams)\/[^/]+/i);
    if (match) return `${location.origin}${match[0]}`;
    return location.origin;
  }

  function colorForPromo(promo) {
    return colorMap[`${promo.country}|${promo.channel}`] || "#556070";
  }

  function dateInPromo(date, promo) {
    const day = stripTime(date);
    return day >= parseDate(promo.startDate) && day <= parseDate(promo.endDate);
  }

  function parseDate(value) {
    const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function stripTime(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function normalizeSharePointDate(value) {
    if (!value) return "";
    return String(value).slice(0, 10);
  }

  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function mondayWeekday(date) {
    return (date.getDay() + 6) % 7;
  }

  function sameDay(a, b) {
    return stripTime(a).getTime() === stripTime(b).getTime();
  }

  function clampMonth(date) {
    const month = new Date(date.getFullYear(), date.getMonth(), 1);
    const min = new Date(MIN_DATE.getFullYear(), MIN_DATE.getMonth(), 1);
    const max = new Date(MAX_DATE.getFullYear(), MAX_DATE.getMonth(), 1);
    if (month < min) return min;
    if (month > max) return max;
    return month;
  }

  function monthLabel(date) {
    return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(date);
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" }).format(parseDate(value));
  }
})();
