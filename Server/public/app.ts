/**
 * Интерфейс продукта, возвращаемый с API
 */
interface Product {
  id: number;
  name: string;
  price: number;
  count?: number;
  hero?: string;
  description?: string;
  rarity?: string;
  ownerId?: number;
}

/**
 * Интерфейс товара в корзине
 */
interface CartItem {
  productId: number;
  qty: number;
  name?: string;
  price?: number;
}

/**
 * Интерфейс пользователя
 */
interface User {
  id: number;
  name: string;
}

/**
 * Интерфейс покупки из инвентаря
 */
interface Purchase {
  id: number;
  productId: number;
  name: string;
  price: number;
  sellerId?: number;
  buyerId: number;
  boughtAt: string;
  qty: number;
}

/**
 * Интерфейс результата API запроса
 * @template T - Тип данных ответа
 */
type ApiResult<T> = { res: Response; data: T | null };

/**
 * Интерфейс ответа авторизации/регистрации
 */
interface AuthResponse {
  message?: string;
  user?: User;
}

/**
 * Интерфейс ответа покупки
 */
interface BuyResponse {
  message?: string;
  purchase?: Purchase;
}

/**
 * Интерфейс ответа при оформлении корзины
 */
interface CheckoutResponse {
  message?: string;
  results?: Array<{
    productId: number;
    status: 'purchased' | 'not_found' | 'own_lot' | 'out_of_stock';
    purchase?: Purchase;
  }>;
}

/**
 * Интерфейс элемента инвентаря
 */
interface InventoryItem {
  id: number;
  productId: number;
  name: string;
  price: number;
  sellerId?: number;
  buyerId: number;
  boughtAt: string;
  qty: number;
}

/**
 * Интерфейс ответа при добавлении товара
 */
interface AddProductResponse {
  message?: string;
  product?: Product;
}

/**
 * Интерфейс ответа при добавлении товара в корзину
 */
interface AddToCartResponse {
  message?: string;
  cart?: CartItem[];
}

/**
 * Интерфейс ответа при обновлении корзины
 */
interface UpdateCartResponse {
  message?: string;
  cart?: CartItem[];
}

/**
 * Безопасно получает элемент из DOM по CSS селектору
 * @template T - Тип HTML элемента
 * @param {string} selector - CSS селектор для поиска
 * @returns {T | null} Найденный элемент или null
 */
const qs = <T extends HTMLElement>(selector: string): T | null => document.querySelector(selector) as T | null;

/**
 * Получает все элементы из DOM по CSS селектору в виде массива
 * @template T - Тип HTML элемента
 * @param {string} selector - CSS селектор для поиска
 * @returns {T[]} Массив найденных элементов
 */
const qsa = <T extends HTMLElement>(selector: string): T[] => Array.from(document.querySelectorAll(selector)) as T[];

const mainSection = qs<HTMLElement>('#main-section');
const detailSection = qs<HTMLElement>('#detail-section');
const authModal = qs<HTMLDivElement>('#auth-modal');
const listEl = qs<HTMLDivElement>('#list');
const detailEl = qs<HTMLDivElement>('#detail-content');
const sidebarItems = qsa<HTMLAnchorElement>('.sidebar-item');
const composeBtn = qs<HTMLButtonElement>('#compose');
const authLinkTop = qs<HTMLAnchorElement>('#auth-link-top');
const authUsername = qs<HTMLSpanElement>('#auth-username');
const logo = qs<HTMLDivElement>('#logo');
const searchInput = qs<HTMLInputElement>('#search');
const sortInput = qs<HTMLSelectElement>('#sort');
const applyFiltersBtn = qs<HTMLButtonElement>('#apply-filters');
const showLoginBtn = qs<HTMLButtonElement>('#show-login');
const showRegisterBtn = qs<HTMLButtonElement>('#show-register');
const loginForm = qs<HTMLFormElement>('#login-form');
const registerForm = qs<HTMLFormElement>('#register-form');
const loginNameInput = qs<HTMLInputElement>('#login-name');
const loginPassInput = qs<HTMLInputElement>('#login-pass');
const regNameInput = qs<HTMLInputElement>('#reg-name');
const regPassInput = qs<HTMLInputElement>('#reg-pass');
const regEmailInput = qs<HTMLInputElement>('#reg-email');
const regPhoneInput = qs<HTMLInputElement>('#reg-phone');
const authMsg = qs<HTMLParagraphElement>('#auth-msg');

let currentUser: User | null = null;
let currentView = 'items';
let currentProducts: Product[] = [];

/**
 * Выполняет API запрос и возвращает результат с типизированными данными
 * @template T - Тип данных в ответе API
 * @async
 * @param {string} path - URL пути для запроса
 * @param {RequestInit} [opts={}] - Параметры fetch запроса (метод, headers, body и т.д.)
 * @returns {Promise<ApiResult<T>>} Объект с ответом и спарсенными данными
 * @description Безопасно обрабатывает ошибки JSON парсинга и сетевые ошибки
 */
async function api<T>(path: string, opts: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, opts);
    let data: T | null = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { res, data };
  } catch {
    return { res: { ok: false } as Response, data: null };
  }
}

/**
 * Экранирует HTML специальные символы для безопасного отображения текста
 * @param {string} [value] - Текст для экранирования
 * @returns {string} Экранированный текст или пустая строка
 * @description Защищает от XSS атак путем замены опасных символов
 */
function escapeHtml(value?: string): string {
  if (!value) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Получает текущий маршрут из URL хеша
 * @returns {string} Текущий маршрут или 'items' по умолчанию
 */
function getRoute(): string {
  return window.location.hash.slice(1) || 'items';
}

/**
 * Проверяет, требует ли маршрут авторизацию пользователя
 * @param {string} route - Название маршрута
 * @returns {boolean} true если маршрут требует авторизацию, false иначе
 */
function routeRequiresAuth(route: string): boolean {
  return ['cart', 'my-lots', 'inventory'].includes(route);
}

/**
 * Устанавливает активный элемент навигации согласно текущему маршруту
 * @param {string} route - Текущий маршрут
 * @returns {void}
 */
function setActiveNavigation(route: string): void {
  sidebarItems.forEach(item => item.classList.toggle('active', item.getAttribute('href') === `#${route}`));
}

/**
 * Показывает или скрывает секции интерфейса в зависимости от маршрута
 * @param {string} route - Текущий маршрут
 * @returns {void}
 */
function showSection(route: string): void {
  authModal?.classList.toggle('hidden', route !== 'login' && route !== 'register');
}

/**
 * Обновляет представление авторизации (ссылка и имя пользователя в заголовке)
 * @returns {void}
 */
function updateAuthView(): void {
  if (!authLinkTop || !authUsername) return;
  if (currentUser) {
    authLinkTop.textContent = 'Выйти';
    authLinkTop.setAttribute('href', '#items');
    authUsername.textContent = currentUser.name;
  } else {
    authLinkTop.textContent = 'Войти';
    authLinkTop.setAttribute('href', '#login');
    authUsername.textContent = '';
  }
}

/**
 * Переключает между режимами входа и регистрации в модальном окне
 * @param {'login' | 'register'} mode - Режим отображения (логин или регистрация)
 * @returns {void}
 */
function showAuthMode(mode: 'login' | 'register'): void {
  if (!showLoginBtn || !showRegisterBtn || !loginForm || !registerForm) return;
  showLoginBtn.classList.toggle('active', mode === 'login');
  showRegisterBtn.classList.toggle('active', mode === 'register');
  loginForm.classList.toggle('hidden', mode !== 'login');
  registerForm.classList.toggle('hidden', mode !== 'register');
  if (authMsg) authMsg.textContent = '';
}

/**
 * Обрабатывает изменение маршрута и загружает соответствующие данные
 * @async
 * @returns {Promise<void>}
 * @description Проверяет авторизацию, показывает правильную секцию и загружает данные
 */
async function handleRoute(): Promise<void> {
  const route = getRoute();
  if (routeRequiresAuth(route) && !currentUser) {
    window.location.hash = '#login';
    return;
  }
  if ((route === 'login' || route === 'register') && currentUser) {
    window.location.hash = '#items';
    return;
  }

  if (route === 'login' || route === 'register') {
    showSection(route);
    showAuthMode(route);
    return;
  }

  currentView = route;
  setActiveNavigation(route);
  showSection(route);

  if (route === 'items') {
    await loadProducts();
  } else {
    await renderList();
  }
}

/**
 * Получает данные текущего авторизованного пользователя с API
 * @async
 * @returns {Promise<void>}
 * @description Делает запрос к /api/me и обновляет состояние currentUser
 */
async function fetchMe(): Promise<void> {
  const { data } = await api<{ user: User | null }>('/api/me');
  currentUser = data?.user ?? null;
  updateAuthView();
}

/**
 * Загружает товары с API с учетом фильтров поиска и сортировки
 * @async
 * @returns {Promise<void>}
 * @description Получает параметры из формы и запрашивает товары с API
 */
async function loadProducts(): Promise<void> {
  if (!listEl) return;
  const params = new URLSearchParams();
  if (searchInput?.value) params.set('search', searchInput.value);
  if (sortInput?.value) params.set('sort', sortInput.value);
  const url = '/api/products' + (params.toString() ? `?${params.toString()}` : '');
  const { data } = await api<Product[]>(url);
  currentProducts = data ?? [];
  await renderList();
}

/**
 * Рендирует список товаров, корзину, инвентарь или лоты в зависимости от текущего вида
 * @async
 * @returns {Promise<void>}
 * @description Отображает правильные данные и присоединяет обработчики событий к кнопкам
 */
async function renderList(): Promise<void> {
  if (!listEl) return;

  if (currentView === 'items') {
    if (currentProducts.length === 0) {
      listEl.innerHTML = '<p>Товары не найдены</p>';
      return;
    }

    listEl.innerHTML = currentProducts.map(product => {
      const isOwner = currentUser && product.ownerId === currentUser.id;
      return `
        <div class="list-item" data-id="${product.id}">
          <div>
            <div class="list-title">${escapeHtml(product.name)}</div>
            <div class="list-sub">${escapeHtml(product.hero || 'Universal')} · <span>${product.price} BYN</span></div>
          </div>
          <div>
            <button class="btn-small btn-buy" data-id="${product.id}" ${isOwner ? 'disabled' : ''}>Купить</button>
            ${isOwner ? '<span class="muted">Мой лот</span>' : `<button class="btn-small btn-add" data-id="${product.id}">В корзину</button>`}
          </div>
        </div>
      `;
    }).join('');

    qsa<HTMLDivElement>('.list-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = Number(el.getAttribute('data-id'));
        if (!Number.isNaN(id)) showDetail(id);
      });
    });

    qsa<HTMLButtonElement>('.btn-buy').forEach(button => {
      button.addEventListener('click', async event => {
        event.stopPropagation();
        const id = Number(button.getAttribute('data-id'));
        if (!Number.isNaN(id)) await buyProduct(id);
      });
    });

    qsa<HTMLButtonElement>('.btn-add').forEach(button => {
      button.addEventListener('click', async event => {
        event.stopPropagation();
        const id = Number(button.getAttribute('data-id'));
        if (Number.isNaN(id)) return;
        if (!currentUser) {
          window.location.hash = '#login';
          return;
        }
        const { res } = await api<AddToCartResponse>('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: id, qty: 1 })
        });
        if (res.ok) showModal('<p>Добавлено в корзину</p>');
        else showModal('<p>Ошибка добавления в корзину</p>');
      });
    });
    return;
  }

  if (currentView === 'my-lots') {
    const { res, data } = await api<Product[]>('/api/my-lots');
    if (!res.ok || !data) {
      listEl.innerHTML = '<p>Требуется вход</p>';
      return;
    }
    if (data.length === 0) {
      listEl.innerHTML = '<p>У вас нет собственных лотов</p>';
      return;
    }

    listEl.innerHTML = data.map(product => `
      <div class="list-item">
        <div>
          <div class="list-title">${escapeHtml(product.name)}</div>
          <div class="list-sub">${escapeHtml(product.hero || '')} · ${product.price} BYN</div>
        </div>
        <div><button class="btn-small btn-delete" data-id="${product.id}">Удалить</button></div>
      </div>
    `).join('');

    qsa<HTMLButtonElement>('.btn-delete').forEach(button => {
      button.addEventListener('click', async () => {
        const id = Number(button.getAttribute('data-id'));
        if (Number.isNaN(id)) return;
        const { res } = await api(`/api/my-lots/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showModal('<p>Лот удалён</p>');
          await renderList();
        } else {
          showModal('<p>Не удалось удалить</p>');
        }
      });
    });
    return;
  }

  if (currentView === 'cart') {
    const { res, data } = await api<CartItem[]>('/api/cart');
    if (!res.ok || !data) {
      listEl.innerHTML = '<p>Требуется вход</p>';
      return;
    }
    if (data.length === 0) {
      listEl.innerHTML = '<p>Корзина пуста</p>';
      return;
    }

    const total = data.reduce((sum, item) => sum + (item.price || 0) * item.qty, 0);
    listEl.innerHTML = `
      <div class="cart-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <strong>Корзина</strong>
        <div><span style="margin-right:12px">Итого: ${total} BYN</span><button id="buy-all" class="btn-small">Оформить заказ</button></div>
      </div>
      ${data.map(item => `
        <div class="list-item">
          <div>
            <div class="list-title">${escapeHtml(item.name || '')}</div>
            <div class="list-sub">Кол-во: ${item.qty} · <span>${item.price || 0} BYN</span></div>
          </div>
          <div><button class="btn-small btn-remove" data-id="${item.productId}">Удалить</button></div>
        </div>
      `).join('')}
    `;

    qs('#buy-all')?.addEventListener('click', async () => {
      const { res, data } = await api<CheckoutResponse>('/api/cart/checkout', { method: 'POST' });
      if (res.ok) {
        const summary = data?.results ? data.results.map(r => `<div>${r.productId}: ${escapeHtml(r.status)}</div>`).join('') : '';
        showModal(`<p>Заказ оформлен</p><div>${summary}</div>`);
        window.location.hash = '#inventory';
      } else {
        showModal('<p>Ошибка оформления</p>');
      }
    });

    qsa<HTMLButtonElement>('.btn-remove').forEach(button => {
      button.addEventListener('click', async () => {
        const id = Number(button.getAttribute('data-id'));
        if (Number.isNaN(id)) return;
        const { res } = await api(`/api/cart/${id}`, { method: 'DELETE' });
        if (res.ok) {
          await renderList();
          showModal('<p>Товар удалён</p>');
        } else {
          showModal('<p>Не удалось удалить</p>');
        }
      });
    });
    return;
  }

  if (currentView === 'inventory') {
    const { res, data } = await api<InventoryItem[]>('/api/inventory');
    if (!res.ok || !data) {
      listEl.innerHTML = '<p>Требуется вход</p>';
      return;
    }
    if (data.length === 0) {
      listEl.innerHTML = '<p>Покупок нет</p>';
      return;
    }
    listEl.innerHTML = data.map(item => `
      <div class="list-item">
        <div>
          <div class="list-title">${escapeHtml(item.name)}</div>
          <div class="list-sub">Куплено: ${escapeHtml(new Date(item.boughtAt).toLocaleString())} · ${item.price} BYN</div>
        </div>
      </div>
    `).join('');
    return;
  }

  listEl.innerHTML = '<p>Страница не найдена</p>';
}

/**
 * Показывает детальную информацию о товаре и добавляет кнопки для покупки/добавления в корзину
 * @async
 * @param {number} id - ID товара для отображения
 * @returns {Promise<void>}
 */
async function showDetail(id: number): Promise<void> {
  const product = currentProducts.find(item => item.id === id);
  if (!product || !detailEl) return;
  const isOwner = currentUser ? product.ownerId === currentUser.id : false;
  detailEl.innerHTML = `
    <h2>${escapeHtml(product.name)}</h2>
    <p class="list-sub">${escapeHtml(product.hero || '')} · ${product.price} BYN</p>
    <p>${escapeHtml(product.description || '')}</p>
    <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap">
      <button class="btn-small" id="detail-buy" ${isOwner ? 'disabled' : ''}>Купить</button>
      ${isOwner ? '<span class="muted">Это ваш лот</span>' : '<button class="btn-small" id="detail-add">В корзину</button>'}
    </div>
  `;

  qs<HTMLButtonElement>('#detail-buy')?.addEventListener('click', async () => {
    if (isOwner) return;
    await buyProduct(product.id);
  });

  qs<HTMLButtonElement>('#detail-add')?.addEventListener('click', async () => {
    if (!currentUser) {
      window.location.hash = '#login';
      return;
    }
    const { res } = await api<AddToCartResponse>('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, qty: 1 })
    });
    if (res.ok) showModal('<p>Добавлено в корзину</p>');
    else showModal('<p>Ошибка добавления в корзину</p>');
  });
}

/**
 * Покупает товар с указанным ID и обновляет список товаров
 * @async
 * @param {number} id - ID товара для покупки
 * @returns {Promise<void>}
 * @description Отправляет запрос покупки на API, обновляет список и показывает результат
 */
async function buyProduct(id: number): Promise<void> {
  const { res, data } = await api<BuyResponse>('/api/buy/' + id, { method: 'POST' });
  if (res.ok) {
    await loadProducts();
    await renderList();
    showModal('<p>Покупка прошла успешно</p>');
  } else {
    showModal(`<p>${escapeHtml(data?.message || 'Ошибка покупки')}</p>`);
  }
}

/**
 * Показывает модальное окно с HTML содержимым и кнопкой закрытия
 * @param {string} html - HTML содержимое для отображения в модале
 * @returns {void}
 * @description Удаляет предыдущий модал (если он есть) и создает новый с предоставленным контентом
 */
function showModal(html: string): void {
  qs<HTMLElement>('#app-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'app-modal';
  modal.className = 'app-modal';
  modal.innerHTML = `<div class="app-modal-backdrop"></div><div class="app-modal-body">${html}<div style="margin-top:16px;text-align:right"><button id="app-modal-close" class="btn-small">Закрыть</button></div></div>`;
  document.body.appendChild(modal);
  qs<HTMLButtonElement>('#app-modal-close')?.addEventListener('click', closeModal);
  modal.querySelector('.app-modal-backdrop')?.addEventListener('click', closeModal);
}

/**
 * Закрывает текущее модальное окно
 * @returns {void}
 */
function closeModal(): void {
  qs<HTMLElement>('#app-modal')?.remove();
}

/**
 * Присоединяет обработчики событий для форм авторизации и регистрации
 * @returns {void}
 * @description Устанавливает слушатели на кнопки входа, регистрации и их переключатели
 */
function attachAuthEvents(): void {
  showLoginBtn?.addEventListener('click', () => { window.location.hash = '#login'; });
  showRegisterBtn?.addEventListener('click', () => { window.location.hash = '#register'; });
  qs<HTMLButtonElement>('#auth-close')?.addEventListener('click', () => { window.location.hash = '#items'; });
  authModal?.addEventListener('click', event => {
    if ((event.target as HTMLElement).classList.contains('auth-modal-backdrop')) {
      window.location.hash = '#items';
    }
  });

  qs<HTMLButtonElement>('#login-btn')?.addEventListener('click', async () => {
    const name = loginNameInput?.value.trim() ?? '';
    const password = loginPassInput?.value.trim() ?? '';
    if (!name || !password) {
      if (authMsg) authMsg.textContent = 'Введите имя и пароль';
      return;
    }
    const { res, data } = await api<AuthResponse>('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password })
    });
    if (res.ok) {
      currentUser = data?.user ?? null;
      updateAuthView();
      window.location.hash = '#items';
    } else {
      if (authMsg) authMsg.textContent = data?.message || 'Ошибка входа';
    }
  });

  qs<HTMLButtonElement>('#reg-btn')?.addEventListener('click', async () => {
    const name = regNameInput?.value.trim() ?? '';
    const password = regPassInput?.value.trim() ?? '';
    const email = regEmailInput?.value.trim() ?? '';
    const phone = regPhoneInput?.value.trim() ?? '';
    if (!name || !password) {
      if (authMsg) authMsg.textContent = 'Введите имя и пароль';
      return;
    }
    const { res, data } = await api<AuthResponse>('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password, email, phone })
    });
    if (res.ok) {
      currentUser = data?.user ?? null;
      updateAuthView();
      window.location.hash = '#items';
    } else {
      if (authMsg) authMsg.textContent = data?.message || 'Ошибка регистрации';
    }
  });
}

/**
 * Присоединяет обработчики событий для главного интерфейса
 * @returns {void}
 * @description Устанавливает слушатели на навигацию, фильтры, форму товаров, выход и другие UI элементы
 */
function attachUiEvents(): void {
  sidebarItems.forEach(item => item.addEventListener('click', () => {
    const route = item.getAttribute('href')?.slice(1) ?? 'items';
    window.location.hash = `#${route}`;
  }));

  composeBtn?.addEventListener('click', () => {
    if (!currentUser) {
      window.location.hash = '#login';
      return;
    }
    if (!detailEl) return;
    detailEl.innerHTML = `
      <div class="sell-form">
        <h3>Добавить товар</h3>
        <div class="row"><label>Название</label><input id="item-name" placeholder="Название товара" /></div>
        <div class="row"><label>Герой</label><input id="hero" placeholder="Герой" /></div>
        <div class="row"><label>Редкость</label><select id="rarity"><option>Common</option><option>Rare</option><option>Immortal</option><option>Arcana</option></select></div>
        <div class="row"><label>Цена</label><input id="price" type="number" min="1" placeholder="Цена" /></div>
        <div class="row full"><label>Описание</label><textarea id="desc" placeholder="Описание товара"></textarea></div>
        <div style="margin-top:8px;text-align:right"><button id="sell-submit" class="btn-small">Выставить</button></div>
      </div>
    `;

    qs<HTMLButtonElement>('#sell-submit')?.addEventListener('click', async () => {
      const values = {
        name: (qs<HTMLInputElement>('#item-name')?.value ?? '').trim(),
        hero: (qs<HTMLInputElement>('#hero')?.value ?? '').trim(),
        rarity: (qs<HTMLSelectElement>('#rarity')?.value ?? '').trim(),
        price: Number(qs<HTMLInputElement>('#price')?.value ?? 0),
        description: (qs<HTMLTextAreaElement>('#desc')?.value ?? '').trim()
      };
      const { res } = await api<AddProductResponse>('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      if (res.ok) {
        showModal('<p>Товар добавлен</p>');
        window.location.hash = '#items';
        await loadProducts();
      } else {
        showModal('<p>Ошибка добавления товара</p>');
      }
    });
  });

  authLinkTop?.addEventListener('click', async event => {
    if (!currentUser) return;
    event.preventDefault();
    const { res } = await api('/api/logout', { method: 'POST' });
    if (res.ok) {
      currentUser = null;
      updateAuthView();
      window.location.hash = '#items';
      await loadProducts();
    }
  });

  applyFiltersBtn?.addEventListener('click', async () => {
    if (currentView === 'items') await loadProducts();
  });

  logo?.addEventListener('click', () => {
    window.location.hash = '#items';
  });
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', async () => {
  await fetchMe();
  attachAuthEvents();
  attachUiEvents();
  await handleRoute();
});
