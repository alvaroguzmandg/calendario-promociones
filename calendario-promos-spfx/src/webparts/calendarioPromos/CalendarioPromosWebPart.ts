import { Version } from '@microsoft/sp-core-library';
import { type IPropertyPaneConfiguration } from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';

import styles from './CalendarioPromosWebPart.module.scss';

export interface ICalendarioPromosWebPartProps {}

interface IPromo {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  country: string;
  channel: string;
  branches: string;
  linkUrl: string;
  notes: string;
}

interface ISharePointPromoItem {
  Id: number;
  Title: string;
  StartDate: string;
  EndDate: string;
  Country: string;
  Channel: string;
  Branches: string;
  LinkUrl: string;
  Notes: string;
}

export default class CalendarioPromosWebPart extends BaseClientSideWebPart<ICalendarioPromosWebPartProps> {
  private readonly _listTitle: string = 'Promociones';
  private readonly _adminUser: string = 'admin';
  private readonly _adminPassword: string = 'promos2026';
  private readonly _minDate: Date = new Date(2026, 0, 1);
  private readonly _maxDate: Date = new Date(2030, 11, 31);
  private _currentDate: Date = new Date(2026, 4, 26);
  private _adminUnlocked: boolean = false;
  private _promos: IPromo[] = [];

  public async onInit(): Promise<void> {
    this._adminUnlocked = sessionStorage.getItem('promoAdminUnlocked') === 'true';
    this._currentDate = this._clampMonth(new Date());
    await this._loadPromos();
  }

  public render(): void {
    this.domElement.innerHTML = `
      <section class="${styles.calendarioPromos}">
        <header class="${styles.appHeader}">
          <div>
            <p class="${styles.eyebrow}">Equipo comercial</p>
            <h1>Calendario de promociones</h1>
          </div>
          <div class="${styles.headerActions}">
            <button class="${styles.iconButton}" data-action="prev" type="button" aria-label="Mes anterior">‹</button>
            <button class="${styles.todayButton}" data-action="today" type="button">Hoy</button>
            <button class="${styles.iconButton}" data-action="next" type="button" aria-label="Mes siguiente">›</button>
            <button class="${styles.primaryButton}" data-action="admin" type="button">Admin</button>
          </div>
        </header>

        <main class="${styles.appShell}">
          <section class="${styles.toolbar}" aria-label="Filtros del calendario">
            <div>
              <h2 data-role="month-title">${this._monthLabel(this._currentDate)}</h2>
            </div>
            <div class="${styles.filters}">
              <label>
                País
                <select data-role="country-filter">
                  <option value="all">Todos</option>
                  <option value="Argentina">Argentina</option>
                  <option value="Uruguay">Uruguay</option>
                </select>
              </label>
              <label>
                Canal
                <select data-role="channel-filter">
                  <option value="all">Todos</option>
                  <option value="Locales">Locales</option>
                  <option value="Online">Online</option>
                </select>
              </label>
            </div>
          </section>

          <section class="${styles.legend}" data-role="legend" aria-label="Referencias de color"></section>

          <section class="${styles.calendar}" aria-label="Calendario mensual">
            <div class="${styles.weekdays}">
              <span>Lun</span>
              <span>Mar</span>
              <span>Mié</span>
              <span>Jue</span>
              <span>Vie</span>
              <span>Sáb</span>
              <span>Dom</span>
            </div>
            <div class="${styles.calendarGrid}" data-role="calendar-grid"></div>
          </section>
        </main>

        <aside class="${styles.adminPanel}" data-role="admin-panel" aria-hidden="true">
          <div class="${styles.panelHeader}">
            <div>
              <p class="${styles.eyebrow}">Carga</p>
              <h2>Nueva promoción</h2>
            </div>
            <button class="${styles.iconButton}" data-action="close-admin" type="button" aria-label="Cerrar admin">×</button>
          </div>
          <form data-role="admin-login-form" class="${styles.adminLogin}">
            <label>
              Usuario
              <input data-role="admin-user" name="adminUser" autocomplete="username" required placeholder="admin" />
            </label>
            <label>
              Contraseña
              <input data-role="admin-password" name="adminPassword" type="password" autocomplete="current-password" required placeholder="••••••••" />
            </label>
            <button class="${styles.primaryButton} ${styles.full}" type="submit">Ingresar</button>
            <p class="${styles.formMessage}" data-role="login-message" role="status"></p>
          </form>
          <form data-role="promo-form" class="${this._adminUnlocked ? '' : styles.locked}">
            <label>
              Título
              <input data-field="title" name="title" required placeholder="10% extra Apple Childs" />
            </label>
            <div class="${styles.formRow}">
              <label>
                Desde
                <input data-field="startDate" name="startDate" type="date" min="2026-01-01" max="2030-12-31" required />
              </label>
              <label>
                Hasta
                <input data-field="endDate" name="endDate" type="date" min="2026-01-01" max="2030-12-31" required />
              </label>
            </div>
            <div class="${styles.formRow}">
              <label>
                País
                <select data-field="country" name="country" required>
                  <option>Argentina</option>
                  <option>Uruguay</option>
                </select>
              </label>
              <label>
                Canal
                <select data-field="channel" name="channel" required>
                  <option>Locales</option>
                  <option>Online</option>
                </select>
              </label>
            </div>
            <label>
              Sucursales / alcance
              <input data-field="branches" name="branches" placeholder="Online, todas las sucursales, GBA, Montevideo..." />
            </label>
            <label>
              Link SharePoint
              <input data-field="linkUrl" name="linkUrl" type="url" placeholder="https://..." />
            </label>
            <label>
              Comentarios
              <textarea data-field="notes" name="notes" rows="4" placeholder="Condiciones, productos incluidos, excepciones..."></textarea>
            </label>
            <button class="${styles.primaryButton} ${styles.full}" type="submit">Guardar promoción</button>
            <p class="${styles.formMessage}" data-role="form-message" role="status"></p>
          </form>
        </aside>

        <dialog data-role="promo-dialog">
          <article class="${styles.dialogCard}">
            <button class="${styles.iconButton} ${styles.dialogClose}" data-action="dialog-close" type="button" aria-label="Cerrar">×</button>
            <p class="${styles.eyebrow}" data-role="dialog-meta"></p>
            <h2 data-role="dialog-title"></h2>
            <dl class="${styles.detailList}">
              <div>
                <dt>Fechas</dt>
                <dd data-role="dialog-dates"></dd>
              </div>
              <div>
                <dt>Alcance</dt>
                <dd data-role="dialog-branches"></dd>
              </div>
              <div>
                <dt>Notas</dt>
                <dd data-role="dialog-notes"></dd>
              </div>
            </dl>
            <a class="${styles.primaryButton} ${styles.asLink}" data-role="dialog-link" href="#" target="_blank" rel="noreferrer">Abrir archivo</a>
          </article>
        </dialog>
      </section>`;

    this._bindEvents();
    this._renderLegend();
    this._renderAdminState();
    this._renderCalendar();
    this._updateNavState();
  }

  private _bindEvents(): void {
    this._qs('[data-action="prev"]')?.addEventListener('click', () => this._moveMonth(-1));
    this._qs('[data-action="next"]')?.addEventListener('click', () => this._moveMonth(1));
    this._qs('[data-action="today"]')?.addEventListener('click', () => {
      this._currentDate = this._clampMonth(new Date());
      this._renderMonth();
    });
    this._qs('[data-action="admin"]')?.addEventListener('click', () => this._openAdmin());
    this._qs('[data-action="close-admin"]')?.addEventListener('click', () => this._closeAdmin());
    this._qs('[data-action="dialog-close"]')?.addEventListener('click', () => this._dialog()?.close());
    this._qs('[data-role="country-filter"]')?.addEventListener('change', () => this._renderCalendar());
    this._qs('[data-role="channel-filter"]')?.addEventListener('change', () => this._renderCalendar());
    this._qs('[data-role="admin-login-form"]')?.addEventListener('submit', (event: Event) => this._unlockAdmin(event));
    this._qs('[data-role="promo-form"]')?.addEventListener('submit', (event: Event) => this._savePromo(event));
  }

  private async _loadPromos(): Promise<void> {
    try {
      const select: string = 'Id,Title,StartDate,EndDate,Country,Channel,Branches,LinkUrl,Notes';
      const url: string = `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('${this._escapeODataString(this._listTitle)}')/items?$select=${select}&$top=5000`;
      const response: SPHttpClientResponse = await this.context.spHttpClient.get(url, SPHttpClient.configurations.v1);

      if (!response.ok) {
        throw new Error(`SharePoint read failed: ${response.status}`);
      }

      const data: { value: ISharePointPromoItem[] } = await response.json();
      this._promos = (data.value || []).map((item: ISharePointPromoItem): IPromo => this._fromSharePointItem(item));
    } catch (error) {
      this._promos = [];
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  private async _savePromo(event: Event): Promise<void> {
    event.preventDefault();

    if (!this._adminUnlocked) {
      this._setFormMessage('Ingresá como admin antes de guardar.');
      return;
    }

    const promo: IPromo = this._readPromoForm();

    if (this._parseDate(promo.endDate) < this._parseDate(promo.startDate)) {
      this._setFormMessage('La fecha final no puede ser anterior a la inicial.');
      return;
    }

    try {
      this._setFormMessage('Guardando en SharePoint...');
      const url: string = `${this.context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('${this._escapeODataString(this._listTitle)}')/items`;
      const response: SPHttpClientResponse = await this.context.spHttpClient.post(url, SPHttpClient.configurations.v1, {
        headers: {
          Accept: 'application/json;odata=nometadata',
          'Content-Type': 'application/json;odata=nometadata'
        },
        body: JSON.stringify(this._toSharePointItem(promo))
      });

      if (!response.ok) {
        throw new Error(`SharePoint create failed: ${response.status}`);
      }

      const item: ISharePointPromoItem = await response.json();
      this._promos.push(this._fromSharePointItem(item));
      (this._qs('[data-role="promo-form"]') as HTMLFormElement).reset();
      this._setFormMessage('Promoción guardada.');
      this._renderCalendar();
    } catch (error) {
      this._setFormMessage('No se pudo guardar. Revisá permisos y columnas de la lista.');
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  private _renderMonth(): void {
    const title: HTMLElement | null = this._qs('[data-role="month-title"]');
    if (title) {
      title.textContent = this._monthLabel(this._currentDate);
    }
    this._renderCalendar();
    this._updateNavState();
  }

  private _renderLegend(): void {
    const legend: HTMLElement | null = this._qs('[data-role="legend"]');
    if (!legend) return;

    const items: string[] = [
      ['Argentina', 'Locales', styles.argLocales].join('|'),
      ['Argentina', 'Online', styles.argOnline].join('|'),
      ['Uruguay', 'Locales', styles.uruLocales].join('|'),
      ['Uruguay', 'Online', styles.uruOnline].join('|')
    ];

    legend.innerHTML = items.map((item: string): string => {
      const [country, channel, colorClass] = item.split('|');
      return `<span class="${styles.legendItem}"><span class="${styles.legendDot} ${colorClass}"></span>${country} · ${channel}</span>`;
    }).join('');
  }

  private _renderCalendar(): void {
    const grid: HTMLElement | null = this._qs('[data-role="calendar-grid"]');
    if (!grid) return;

    grid.innerHTML = '';
    const monthStart: Date = new Date(this._currentDate.getFullYear(), this._currentDate.getMonth(), 1);
    const gridStart: Date = this._addDays(monthStart, -this._mondayWeekday(monthStart));
    const visiblePromos: IPromo[] = this._filteredPromos();

    for (let index: number = 0; index < 42; index += 1) {
      const date: Date = this._addDays(gridStart, index);
      const dayPromos: IPromo[] = visiblePromos
        .filter((promo: IPromo): boolean => this._dateInPromo(date, promo))
        .sort((a: IPromo, b: IPromo): number => this._parseDate(a.startDate).getTime() - this._parseDate(b.startDate).getTime() || a.title.localeCompare(b.title));
      grid.appendChild(this._renderDay(date, dayPromos));
    }
  }

  private _renderDay(date: Date, dayPromos: IPromo[]): HTMLElement {
    const day: HTMLElement = document.createElement('div');
    day.className = styles.day;
    if (date.getMonth() !== this._currentDate.getMonth()) day.classList.add(styles.outsideMonth);
    if (this._sameDay(date, new Date())) day.classList.add(styles.today);

    const number: HTMLElement = document.createElement('span');
    number.className = styles.dayNumber;
    number.textContent = String(date.getDate());
    day.appendChild(number);

    const list: HTMLElement = document.createElement('div');
    list.className = styles.promoList;
    dayPromos.slice(0, 5).forEach((promo: IPromo): void => {
      list.appendChild(this._renderPromoChip(date, promo));
    });

    if (dayPromos.length > 5) {
      const more: HTMLElement = document.createElement('span');
      more.className = styles.moreCount;
      more.textContent = `+${dayPromos.length - 5} más`;
      list.appendChild(more);
    }

    day.appendChild(list);
    return day;
  }

  private _renderPromoChip(date: Date, promo: IPromo): HTMLElement {
    const chip: HTMLButtonElement = document.createElement('button');
    const starts: boolean = this._sameDay(this._parseDate(promo.startDate), date);
    const beginsVisibleSegment: boolean = starts || date.getDay() === 1 || date.getDate() === 1;
    chip.type = 'button';
    chip.className = `${styles.promoChip} ${this._colorClassForPromo(promo)}`;
    chip.textContent = beginsVisibleSegment ? promo.title : '';
    chip.setAttribute('aria-label', promo.title);
    chip.title = promo.title;

    if (this._parseDate(promo.startDate) < this._stripTime(date)) chip.classList.add(styles.continuesLeft);
    if (this._parseDate(promo.endDate) > this._stripTime(date)) chip.classList.add(styles.continuesRight);

    chip.addEventListener('click', () => this._openPromoDialog(promo));
    return chip;
  }

  private _openPromoDialog(promo: IPromo): void {
    const dialog: HTMLDialogElement | null = this._dialog();
    if (!dialog) return;

    this._setText('[data-role="dialog-meta"]', `${promo.country} · ${promo.channel}`);
    this._setText('[data-role="dialog-title"]', promo.title);
    this._setText('[data-role="dialog-dates"]', `${this._formatDate(promo.startDate)} al ${this._formatDate(promo.endDate)}`);
    this._setText('[data-role="dialog-branches"]', promo.branches || 'Sin detalle');
    this._setText('[data-role="dialog-notes"]', promo.notes || 'Sin comentarios');

    const link: HTMLAnchorElement | null = this._qs('[data-role="dialog-link"]') as HTMLAnchorElement;
    if (link) {
      if (promo.linkUrl) {
        link.href = promo.linkUrl;
        link.hidden = false;
      } else {
        link.hidden = true;
      }
    }

    dialog.showModal();
  }

  private _openAdmin(): void {
    const panel: HTMLElement | null = this._qs('[data-role="admin-panel"]');
    if (!panel) return;
    panel.classList.add(styles.open);
    panel.setAttribute('aria-hidden', 'false');
    this._renderAdminState();
  }

  private _closeAdmin(): void {
    const panel: HTMLElement | null = this._qs('[data-role="admin-panel"]');
    if (!panel) return;
    panel.classList.remove(styles.open);
    panel.setAttribute('aria-hidden', 'true');
  }

  private _unlockAdmin(event: Event): void {
    event.preventDefault();
    const user: string = (this._qs('[data-role="admin-user"]') as HTMLInputElement).value.trim();
    const password: string = (this._qs('[data-role="admin-password"]') as HTMLInputElement).value;

    if (user !== this._adminUser || password !== this._adminPassword) {
      this._setText('[data-role="login-message"]', 'Usuario o contraseña incorrectos.');
      return;
    }

    this._adminUnlocked = true;
    sessionStorage.setItem('promoAdminUnlocked', 'true');
    (this._qs('[data-role="admin-login-form"]') as HTMLFormElement).reset();
    this._setText('[data-role="login-message"]', '');
    this._renderAdminState();
  }

  private _renderAdminState(): void {
    const login: HTMLElement | null = this._qs('[data-role="admin-login-form"]');
    const form: HTMLElement | null = this._qs('[data-role="promo-form"]');
    if (login) login.classList.toggle(styles.unlocked, this._adminUnlocked);
    if (form) form.classList.toggle(styles.locked, !this._adminUnlocked);
  }

  private _readPromoForm(): IPromo {
    return {
      id: `local-${Date.now()}`,
      title: this._fieldValue('title'),
      startDate: this._fieldValue('startDate'),
      endDate: this._fieldValue('endDate'),
      country: this._fieldValue('country'),
      channel: this._fieldValue('channel'),
      branches: this._fieldValue('branches'),
      linkUrl: this._fieldValue('linkUrl'),
      notes: this._fieldValue('notes')
    };
  }

  private _fieldValue(name: string): string {
    const field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null = this._qs(`[data-field="${name}"]`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    return field?.value || '';
  }

  private _setFormMessage(message: string): void {
    this._setText('[data-role="form-message"]', message);
  }

  private _filteredPromos(): IPromo[] {
    const country: string = (this._qs('[data-role="country-filter"]') as HTMLSelectElement)?.value || 'all';
    const channel: string = (this._qs('[data-role="channel-filter"]') as HTMLSelectElement)?.value || 'all';

    return this._promos.filter((promo: IPromo): boolean => {
      const countryMatch: boolean = country === 'all' || promo.country === country;
      const channelMatch: boolean = channel === 'all' || promo.channel === channel;
      return countryMatch && channelMatch;
    });
  }

  private _fromSharePointItem(item: ISharePointPromoItem): IPromo {
    return {
      id: String(item.Id),
      title: item.Title || '',
      startDate: this._normalizeSharePointDate(item.StartDate),
      endDate: this._normalizeSharePointDate(item.EndDate),
      country: item.Country || '',
      channel: item.Channel || '',
      branches: item.Branches || '',
      linkUrl: item.LinkUrl || '',
      notes: item.Notes || ''
    };
  }

  private _toSharePointItem(promo: IPromo): Partial<ISharePointPromoItem> {
    return {
      Title: promo.title,
      StartDate: promo.startDate,
      EndDate: promo.endDate,
      Country: promo.country,
      Channel: promo.channel,
      Branches: promo.branches,
      LinkUrl: promo.linkUrl,
      Notes: promo.notes
    };
  }

  private _moveMonth(offset: number): void {
    this._currentDate = this._clampMonth(new Date(this._currentDate.getFullYear(), this._currentDate.getMonth() + offset, 1));
    this._renderMonth();
  }

  private _updateNavState(): void {
    const previous: Date = new Date(this._currentDate.getFullYear(), this._currentDate.getMonth() - 1, 1);
    const next: Date = new Date(this._currentDate.getFullYear(), this._currentDate.getMonth() + 1, 1);
    (this._qs('[data-action="prev"]') as HTMLButtonElement).disabled = previous < new Date(this._minDate.getFullYear(), this._minDate.getMonth(), 1);
    (this._qs('[data-action="next"]') as HTMLButtonElement).disabled = next > new Date(this._maxDate.getFullYear(), this._maxDate.getMonth(), 1);
  }

  private _colorClassForPromo(promo: IPromo): string {
    const key: string = `${promo.country}|${promo.channel}`;
    if (key === 'Argentina|Locales') return styles.argLocales;
    if (key === 'Argentina|Online') return styles.argOnline;
    if (key === 'Uruguay|Locales') return styles.uruLocales;
    if (key === 'Uruguay|Online') return styles.uruOnline;
    return styles.fallbackPromo;
  }

  private _dateInPromo(date: Date, promo: IPromo): boolean {
    const day: Date = this._stripTime(date);
    return day >= this._parseDate(promo.startDate) && day <= this._parseDate(promo.endDate);
  }

  private _parseDate(value: string): Date {
    const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private _stripTime(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private _normalizeSharePointDate(value: string): string {
    if (!value) return '';
    return String(value).slice(0, 10);
  }

  private _addDays(date: Date, days: number): Date {
    const result: Date = new Date(date.getTime());
    result.setDate(result.getDate() + days);
    return result;
  }

  private _sameDay(a: Date, b: Date): boolean {
    return this._stripTime(a).getTime() === this._stripTime(b).getTime();
  }

  private _clampMonth(date: Date): Date {
    const month: Date = new Date(date.getFullYear(), date.getMonth(), 1);
    const min: Date = new Date(this._minDate.getFullYear(), this._minDate.getMonth(), 1);
    const max: Date = new Date(this._maxDate.getFullYear(), this._maxDate.getMonth(), 1);
    if (month < min) return min;
    if (month > max) return max;
    return month;
  }

  private _mondayWeekday(date: Date): number {
    return (date.getDay() + 6) % 7;
  }

  private _monthLabel(date: Date): string {
    return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(date);
  }

  private _formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).format(this._parseDate(value));
  }

  private _escapeODataString(value: string): string {
    return value.replace(/'/g, "''");
  }

  private _setText(selector: string, text: string): void {
    const element: HTMLElement | null = this._qs(selector);
    if (element) {
      element.textContent = text;
    }
  }

  private _dialog(): HTMLDialogElement | null {
    return this._qs('[data-role="promo-dialog"]') as HTMLDialogElement;
  }

  private _qs<T extends HTMLElement = HTMLElement>(selector: string): T | null {
    return this.domElement.querySelector(selector);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: []
    };
  }
}
