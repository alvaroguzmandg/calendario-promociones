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

  const demoPromos = [];

  const state = {
    currentDate: clampMonth(new Date(2026, 4, 26)),
    adminUnlocked: sessionStorage.getItem("promoAdminUnlocked") === "true",
    editingPromoId: null,
    drag: null,
    pointerDrag: null,
    resize: null,
    suppressNextClick: false,
    promos: [],
    apiEnabled: location.protocol.startsWith("http") && !["localhost", "127.0.0.1", ""].includes(location.hostname) && !location.hostname.includes("sharepoint.com"),
    sharePointEnabled: Boolean(window._spPageContextInfo) || location.hostname.includes("sharepoint.com"),
  };

  const els = {
    adminLoginForm: document.getElementById("adminLoginForm"),
    adminPanel: document.getElementById("adminPanel"),
    adminPanelTitle: document.getElementById("adminPanelTitle"),
    adminPassword: document.getElementById("adminPassword"),
    adminToggle: document.getElementById("adminToggle"),
    adminUser: document.getElementById("adminUser"),
    calendarGrid: document.getElementById("calendarGrid"),
    cancelEditButton: document.getElementById("cancelEditButton"),
    channelFilter: document.getElementById("channelFilter"),
    closeAdmin: document.getElementById("closeAdmin"),
    countryFilter: document.getElementById("countryFilter"),
    dialog: document.getElementById("promoDialog"),
    dialogBranches: document.getElementById("dialogBranches"),
    dialogClose: document.getElementById("dialogClose"),
    dialogDates: document.getElementById("dialogDates"),
    dialogDelete: document.getElementById("dialogDelete"),
    dialogEdit: document.getElementById("dialogEdit"),
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
    els.dialogEdit.addEventListener("click", editDialogPromo);
    els.dialogDelete.addEventListener("click", deleteDialogPromo);
    els.adminLoginForm.addEventListener("submit", unlockAdmin);
    els.form.addEventListener("submit", savePromo);
    els.cancelEditButton.addEventListener("click", resetPromoForm);
  }

  async function loadPromos() {
    setMessage("Cargando promociones...");
    try {
      if (state.apiEnabled) {
        const data = await fetchApiPromos();
        state.promos = data.promos;
        setMessage(data.mode === "shared" ? "" : "Modo demo. Configurá Supabase para guardar promos compartidas.");
        return;
      }

      if (!state.sharePointEnabled) {
        state.promos = demoPromos;
        setMessage("");
        return;
      }

      const items = await fetchSharePointItems();
      state.promos = items.map(fromSharePointItem);
      setMessage("");
    } catch (error) {
      state.promos = demoPromos;
      setMessage("No se pudieron leer promociones.");
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
    day.dataset.date = toISODate(date);
    if (date.getMonth() !== state.currentDate.getMonth()) day.classList.add("outside-month");
    if (sameDay(date, new Date())) day.classList.add("today");
    day.addEventListener("dragover", handleDayDragOver);
    day.addEventListener("dragleave", handleDayDragLeave);
    day.addEventListener("drop", handleDayDrop);

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
    const beginsVisibleSegment = starts || date.getDay() === 1 || date.getDate() === 1;
    chip.type = "button";
    chip.className = "promo-chip";
    chip.dataset.promoId = promo.id;
    chip.dataset.date = toISODate(date);
    chip.style.background = colorForPromo(promo);
    chip.setAttribute("aria-label", promo.title);
    chip.title = promo.title;
    chip.draggable = state.adminUnlocked;
    if (parseDate(promo.startDate) < stripTime(date)) chip.classList.add("continues-left");
    if (parseDate(promo.endDate) > stripTime(date)) chip.classList.add("continues-right");
    if (state.adminUnlocked && starts) {
      chip.classList.add("has-resize-start");
      chip.appendChild(renderResizeHandle("start"));
    }
    const label = document.createElement("span");
    label.className = "promo-label";
    label.textContent = beginsVisibleSegment ? promo.title : "";
    chip.appendChild(label);
    if (state.adminUnlocked && sameDay(parseDate(promo.endDate), date)) {
      chip.classList.add("has-resize-end");
      chip.appendChild(renderResizeHandle("end"));
    }
    chip.addEventListener("dragstart", handlePromoDragStart);
    chip.addEventListener("dragend", handlePromoDragEnd);
    chip.addEventListener("pointerdown", handlePromoPointerDown);
    chip.addEventListener("click", (event) => {
      if (state.suppressNextClick) {
        event.preventDefault();
        event.stopPropagation();
        state.suppressNextClick = false;
        return;
      }
      openPromoDialog(promo);
    });
    return chip;
  }

  function renderResizeHandle(edge) {
    const handle = document.createElement("span");
    handle.className = `promo-resize-handle ${edge}`;
    handle.dataset.resizeEdge = edge;
    handle.setAttribute("aria-hidden", "true");
    handle.addEventListener("dragstart", (event) => event.preventDefault());
    handle.addEventListener("pointerdown", handleResizePointerDown);
    return handle;
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
    els.dialog.dataset.promoId = promo.id;
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
    els.dialogEdit.hidden = !state.adminUnlocked;
    els.dialogDelete.hidden = !state.adminUnlocked;
    els.dialog.showModal();
  }

  function editDialogPromo() {
    const promo = state.promos.find((item) => item.id === els.dialog.dataset.promoId);
    if (!promo || !state.adminUnlocked) return;
    els.dialog.close();
    openPromoEditor(promo);
  }

  async function deleteDialogPromo() {
    const promo = state.promos.find((item) => item.id === els.dialog.dataset.promoId);
    if (!promo || !state.adminUnlocked) return;
    const confirmed = window.confirm(`¿Eliminar "${promo.title}"?`);
    if (!confirmed) return;
    els.dialog.close();
    await deletePromo(promo.id);
  }

  async function savePromo(event) {
    event.preventDefault();
    const formData = new FormData(els.form);
    const promo = Object.fromEntries(formData.entries());
    if (state.editingPromoId) promo.id = state.editingPromoId;

    if (parseDate(promo.endDate) < parseDate(promo.startDate)) {
      setMessage("La fecha final no puede ser anterior a la inicial.");
      return;
    }

    if (state.editingPromoId) {
      await updatePromo(promo, "Promoción actualizada.");
      return;
    }

    if (!state.sharePointEnabled) {
      if (state.apiEnabled) {
        try {
          setMessage("Guardando...");
          const saved = await createApiPromo(promo);
          state.promos.push(saved);
          resetPromoForm();
          setMessage("Promoción guardada.");
          render();
        } catch (error) {
          console.error(error);
          setMessage(`No se pudo guardar en Supabase: ${error.message}`);
        }
        return;
      }

      promo.id = `local-${Date.now()}`;
      state.promos.push(promo);
      resetPromoForm();
      setMessage("Guardado en modo demo. En SharePoint quedará compartido para el equipo.");
      render();
      return;
    }

    try {
      setMessage("Guardando en SharePoint...");
      const item = await createSharePointItem(toSharePointItem(promo));
      state.promos.push(fromSharePointItem(item));
      resetPromoForm();
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

  async function fetchApiPromos() {
    const response = await fetch("/api/promos", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`API read failed: ${response.status}`);
    return response.json();
  }

  async function createApiPromo(promo) {
    const response = await fetch("/api/promos", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(promo),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `API create failed: ${response.status}`);
    return data.promo;
  }

  async function updateApiPromo(promo) {
    const response = await fetch("/api/promos", {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(promo),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `API update failed: ${response.status}`);
    return data.promo;
  }

  async function deleteApiPromo(id) {
    const response = await fetch(`/api/promos?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `API delete failed: ${response.status}`);
    return data;
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

  async function updateSharePointItem(promo) {
    const digest = await requestDigest();
    const response = await fetch(`${siteUrl()}/_api/web/lists/getbytitle('${encodeURIComponent(LIST_TITLE)}')/items(${encodeURIComponent(promo.id)})`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json;odata=nometadata",
        "Content-Type": "application/json;odata=nometadata",
        "IF-MATCH": "*",
        "X-HTTP-Method": "MERGE",
        "X-RequestDigest": digest,
      },
      body: JSON.stringify(toSharePointItem(promo)),
    });
    if (!response.ok) throw new Error(`SharePoint update failed: ${response.status}`);
    return promo;
  }

  async function deleteSharePointItem(id) {
    const digest = await requestDigest();
    const response = await fetch(`${siteUrl()}/_api/web/lists/getbytitle('${encodeURIComponent(LIST_TITLE)}')/items(${encodeURIComponent(id)})`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json;odata=nometadata",
        "IF-MATCH": "*",
        "X-HTTP-Method": "DELETE",
        "X-RequestDigest": digest,
      },
    });
    if (!response.ok) throw new Error(`SharePoint delete failed: ${response.status}`);
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

  async function updatePromo(promo, successMessage = "Promoción actualizada.") {
    try {
      setMessage("Guardando cambios...");
      let saved = { ...promo };
      if (state.apiEnabled) saved = await updateApiPromo(promo);
      else if (state.sharePointEnabled) saved = await updateSharePointItem(promo);

      state.promos = state.promos.map((item) => (item.id === saved.id ? saved : item));
      resetPromoForm();
      setMessage(successMessage);
      render();
    } catch (error) {
      console.error(error);
      setMessage(`No se pudieron guardar los cambios: ${error.message}`);
    }
  }

  async function deletePromo(id) {
    try {
      setMessage("Eliminando promoción...");
      if (state.apiEnabled) await deleteApiPromo(id);
      else if (state.sharePointEnabled) await deleteSharePointItem(id);
      state.promos = state.promos.filter((item) => item.id !== id);
      resetPromoForm();
      setMessage("Promoción eliminada.");
      render();
    } catch (error) {
      console.error(error);
      setMessage(`No se pudo eliminar la promoción: ${error.message}`);
    }
  }

  function openPromoEditor(promo) {
    state.editingPromoId = promo.id;
    els.adminPanelTitle.textContent = "Editar promoción";
    els.cancelEditButton.hidden = false;
    setMessage("");
    fillPromoForm(promo);
    openAdmin();
  }

  function fillPromoForm(promo) {
    els.form.elements.title.value = promo.title || "";
    els.form.elements.startDate.value = promo.startDate || "";
    els.form.elements.endDate.value = promo.endDate || "";
    els.form.elements.country.value = promo.country || "Argentina";
    els.form.elements.channel.value = promo.channel || "Locales";
    els.form.elements.branches.value = promo.branches || "";
    els.form.elements.linkUrl.value = promo.linkUrl || "";
    els.form.elements.notes.value = promo.notes || "";
  }

  function resetPromoForm() {
    state.editingPromoId = null;
    els.adminPanelTitle.textContent = "Nueva promoción";
    els.cancelEditButton.hidden = true;
    els.form.reset();
  }

  function handlePromoDragStart(event) {
    if (!state.adminUnlocked || state.resize || event.target.closest("[data-resize-edge]")) {
      event.preventDefault();
      return;
    }
    const chip = event.currentTarget;
    state.drag = {
      promoId: chip.dataset.promoId,
      fromDate: chip.dataset.date,
    };
    chip.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", JSON.stringify(state.drag));
  }

  function handlePromoDragEnd(event) {
    event.currentTarget.classList.remove("dragging");
    document.querySelectorAll(".day.drop-target").forEach((day) => day.classList.remove("drop-target"));
    state.drag = null;
  }

  function handleDayDragOver(event) {
    if (!state.adminUnlocked || !state.drag) return;
    event.preventDefault();
    event.currentTarget.classList.add("drop-target");
    event.dataTransfer.dropEffect = "move";
  }

  function handleDayDragLeave(event) {
    event.currentTarget.classList.remove("drop-target");
  }

  async function handleDayDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove("drop-target");
    if (!state.adminUnlocked || !state.drag) return;

    const promo = state.promos.find((item) => item.id === state.drag.promoId);
    const targetDate = event.currentTarget.dataset.date;
    if (!promo || !targetDate) return;

    const offset = daysBetween(parseDate(state.drag.fromDate), parseDate(targetDate));
    const moved = {
      ...promo,
      startDate: toISODate(addDays(parseDate(promo.startDate), offset)),
      endDate: toISODate(addDays(parseDate(promo.endDate), offset)),
    };
    await updatePromo(moved, "Promoción movida.");
  }

  function handlePromoPointerDown(event) {
    if (!state.adminUnlocked || event.button !== 0) return;
    if (event.target.closest("[data-resize-edge]")) return;
    const chip = event.currentTarget;
    state.pointerDrag = {
      active: false,
      chip,
      fromDate: chip.dataset.date,
      promoId: chip.dataset.promoId,
      startX: event.clientX,
      startY: event.clientY,
    };
    chip.setPointerCapture?.(event.pointerId);
    document.addEventListener("pointermove", handlePromoPointerMove);
    document.addEventListener("pointerup", handlePromoPointerUp, { once: true });
  }

  function handlePromoPointerMove(event) {
    if (!state.pointerDrag) return;
    const dx = event.clientX - state.pointerDrag.startX;
    const dy = event.clientY - state.pointerDrag.startY;
    if (!state.pointerDrag.active && Math.hypot(dx, dy) < 8) return;

    state.pointerDrag.active = true;
    state.pointerDrag.chip.classList.add("dragging");
    state.pointerDrag.chip.style.transform = `translate(${dx}px, ${dy}px) scale(0.98)`;

    document.querySelectorAll(".day.drop-target").forEach((day) => day.classList.remove("drop-target"));
    const targetDay = document.elementFromPoint(event.clientX, event.clientY)?.closest(".day");
    if (targetDay) targetDay.classList.add("drop-target");
  }

  async function handlePromoPointerUp(event) {
    document.removeEventListener("pointermove", handlePromoPointerMove);
    const drag = state.pointerDrag;
    state.pointerDrag = null;
    document.querySelectorAll(".day.drop-target").forEach((day) => day.classList.remove("drop-target"));
    if (!drag) return;

    drag.chip.classList.remove("dragging");
    drag.chip.style.transform = "";
    if (!drag.active) return;

    state.suppressNextClick = true;
    window.setTimeout(() => {
      state.suppressNextClick = false;
    }, 0);

    const targetDay = document.elementFromPoint(event.clientX, event.clientY)?.closest(".day");
    if (!targetDay?.dataset.date) return;

    const promo = state.promos.find((item) => item.id === drag.promoId);
    if (!promo) return;

    const offset = daysBetween(parseDate(drag.fromDate), parseDate(targetDay.dataset.date));
    if (offset === 0) return;

    const moved = {
      ...promo,
      startDate: toISODate(addDays(parseDate(promo.startDate), offset)),
      endDate: toISODate(addDays(parseDate(promo.endDate), offset)),
    };
    await updatePromo(moved, "Promoción movida.");
  }

  function handleResizePointerDown(event) {
    if (!state.adminUnlocked || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const handle = event.currentTarget;
    const chip = handle.closest(".promo-chip");
    if (!chip) return;

    state.resize = {
      active: false,
      chip,
      edge: handle.dataset.resizeEdge,
      fromDate: chip.dataset.date,
      promoId: chip.dataset.promoId,
      startX: event.clientX,
      startY: event.clientY,
    };
    chip.setPointerCapture?.(event.pointerId);
    document.addEventListener("pointermove", handleResizePointerMove);
    document.addEventListener("pointerup", handleResizePointerUp, { once: true });
  }

  function handleResizePointerMove(event) {
    if (!state.resize) return;
    const dx = event.clientX - state.resize.startX;
    const dy = event.clientY - state.resize.startY;
    if (!state.resize.active && Math.hypot(dx, dy) < 6) return;

    state.resize.active = true;
    state.resize.chip.classList.add("resizing");

    document.querySelectorAll(".day.drop-target").forEach((day) => day.classList.remove("drop-target"));
    const targetDay = document.elementFromPoint(event.clientX, event.clientY)?.closest(".day");
    if (targetDay) targetDay.classList.add("drop-target");
  }

  async function handleResizePointerUp(event) {
    document.removeEventListener("pointermove", handleResizePointerMove);
    const resize = state.resize;
    state.resize = null;
    document.querySelectorAll(".day.drop-target").forEach((day) => day.classList.remove("drop-target"));
    if (!resize) return;

    resize.chip.classList.remove("resizing");
    state.suppressNextClick = true;
    window.setTimeout(() => {
      state.suppressNextClick = false;
    }, 0);

    if (!resize.active) return;

    const targetDay = document.elementFromPoint(event.clientX, event.clientY)?.closest(".day");
    if (!targetDay?.dataset.date) return;

    const promo = state.promos.find((item) => item.id === resize.promoId);
    if (!promo) return;

    const changed = resize.edge === "start"
      ? { ...promo, startDate: targetDay.dataset.date }
      : { ...promo, endDate: targetDay.dataset.date };

    if (parseDate(changed.startDate) < MIN_DATE) changed.startDate = toISODate(MIN_DATE);
    if (parseDate(changed.endDate) > MAX_DATE) changed.endDate = toISODate(MAX_DATE);
    if (parseDate(changed.startDate) > parseDate(changed.endDate)) return;
    if (changed.startDate === promo.startDate && changed.endDate === promo.endDate) return;

    await updatePromo(changed, "Duración de promoción actualizada.");
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

  function toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function daysBetween(from, to) {
    const dayMs = 24 * 60 * 60 * 1000;
    return Math.round((stripTime(to) - stripTime(from)) / dayMs);
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
