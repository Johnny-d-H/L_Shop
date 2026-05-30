const qs = selector => document.querySelector(selector);
const qsa = selector => Array.from(document.querySelectorAll(selector));

const mainSection = qs('#main-section');
const detailSection = qs('#detail-section');
const authModal = qs('#auth-modal');
const listEl = qs('#list');
const detailEl = qs('#detail-content');
const sidebarItems = qsa('.sidebar-item');
const composeBtn = qs('#compose');
const authLinkTop = qs('#auth-link-top');
const authUsername = qs('#auth-username');
const logo = qs('#logo');
const searchInput = qs('#search');
const sortInput = qs('#sort');
const applyFiltersBtn = qs('#apply-filters');
const showLoginBtn = qs('#show-login');
const showRegisterBtn = qs('#show-register');
const loginForm = qs('#login-form');
const registerForm = qs('#register-form');
const loginNameInput = qs('#login-name');
const loginPassInput = qs('#login-pass');
const regNameInput = qs('#reg-name');
const regPassInput = qs('#reg-pass');
const regEmailInput = qs('#reg-email');
const regPhoneInput = qs('#reg-phone');
const authMsg = qs('#auth-msg');

let currentUser = null;
let currentView = 'items';
let currentProducts = [];

async function api(path, opts = {}) {
  try {
    const res = await fetch(path, opts);
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { res, data };
  } catch (error) {
    return { res: { ok: false }, data: null };
  }
}

function escapeHtml(value) {
  if (!value) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getRoute() {
  return window.location.hash.slice(1) || 'items';
}

function routeRequiresAuth(route) {
  return ['cart', 'my-lots', 'inventory'].includes(route);
}

function setActiveNavigation(route) {
  sidebarItems.forEach(item => item.classList.toggle('active', item.getAttribute('href') === `#${route}`));
}

function showSection(route) {
  if (authModal) authModal.classList.toggle('hidden', route !== 'login' && route !== 'register');
}

function updateAuthView() {
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

function showAuthMode(mode) {
  if (!showLoginBtn || !showRegisterBtn || !loginForm || !registerForm) return;
  showLoginBtn.classList.toggle('active', mode === 'login');
  showRegisterBtn.classList.toggle('active', mode === 'register');
  loginForm.classList.toggle('hidden', mode !== 'login');
  registerForm.classList.toggle('hidden', mode !== 'register');
  if (authMsg) authMsg.textContent = '';
}

async function handleRoute() {
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

async function fetchMe() {
  const { data } = await api('/api/me');
  currentUser = data?.user ?? null;
  updateAuthView();
}

async function loadProducts() {
  if (!listEl) return;
  const params = new URLSearchParams();
  if (searchInput?.value) params.set('search', searchInput.value);
  if (sortInput?.value) params.set('sort', sortInput.value);
  const url = '/api/products' + (params.toString() ? `?${params.toString()}` : '');
  const { data } = await api(url);
  currentProducts = data || [];
  await renderList();
}

async function renderList() {
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

    qsa('.list-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = Number(el.getAttribute('data-id'));
        if (!Number.isNaN(id)) showDetail(id);
      });
    });

    qsa('.btn-buy').forEach(button => {
      button.addEventListener('click', async event => {
        event.stopPropagation();
        const id = Number(button.getAttribute('data-id'));
        if (!Number.isNaN(id)) await buyProduct(id);
      });
    });

    qsa('.btn-add').forEach(button => {
      button.addEventListener('click', async event => {
        event.stopPropagation();
        const id = Number(button.getAttribute('data-id'));
        if (Number.isNaN(id)) return;
        if (!currentUser) {
          window.location.hash = '#login';
          return;
        }
        const { res } = await api('/api/cart', {
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
    const { res, data } = await api('/api/my-lots');
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

    qsa('.btn-delete').forEach(button => {
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
    const { res, data } = await api('/api/cart');
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
      const { res, data } = await api('/api/cart/checkout', { method: 'POST' });
      if (res.ok) {
        const summary = data?.results ? data.results.map(r => `<div>${r.productId}: ${escapeHtml(r.status)}</div>`).join('') : '';
        showModal(`<p>Заказ оформлен</p><div>${summary}</div>`);
        window.location.hash = '#inventory';
      } else {
        showModal('<p>Ошибка оформления</p>');
      }
    });

    qsa('.btn-remove').forEach(button => {
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
    const { res, data } = await api('/api/inventory');
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

async function showDetail(id) {
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

  qs('#detail-buy')?.addEventListener('click', async () => {
    if (isOwner) return;
    await buyProduct(product.id);
  });

  qs('#detail-add')?.addEventListener('click', async () => {
    if (!currentUser) {
      window.location.hash = '#login';
      return;
    }
    const { res } = await api('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, qty: 1 })
    });
    if (res.ok) showModal('<p>Добавлено в корзину</p>');
    else showModal('<p>Ошибка добавления в корзину</p>');
  });
}

async function buyProduct(id) {
  const { res, data } = await api('/api/buy/' + id, { method: 'POST' });
  if (res.ok) {
    await loadProducts();
    await renderList();
    showModal('<p>Покупка прошла успешно</p>');
  } else {
    showModal(`<p>${escapeHtml((data && data.message) || 'Ошибка покупки')}</p>`);
  }
}

function showModal(html) {
  qs('#app-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'app-modal';
  modal.className = 'app-modal';
  modal.innerHTML = `<div class="app-modal-backdrop"></div><div class="app-modal-body">${html}<div style="margin-top:16px;text-align:right"><button id="app-modal-close" class="btn-small">Закрыть</button></div></div>`;
  document.body.appendChild(modal);
  qs('#app-modal-close')?.addEventListener('click', closeModal);
  modal.querySelector('.app-modal-backdrop')?.addEventListener('click', closeModal);
}

function closeModal() {
  qs('#app-modal')?.remove();
}

function attachAuthEvents() {
  showLoginBtn?.addEventListener('click', () => { window.location.hash = '#login'; });
  showRegisterBtn?.addEventListener('click', () => { window.location.hash = '#register'; });
  qs('#auth-close')?.addEventListener('click', () => { window.location.hash = '#items'; });
  authModal?.addEventListener('click', event => {
    if (event.target && event.target.classList && event.target.classList.contains('auth-modal-backdrop')) {
      window.location.hash = '#items';
    }
  });

  qs('#login-btn')?.addEventListener('click', async () => {
    const name = loginNameInput?.value.trim() || '';
    const password = loginPassInput?.value.trim() || '';
    if (!name || !password) {
      if (authMsg) authMsg.textContent = 'Введите имя и пароль';
      return;
    }
    const { res, data } = await api('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password })
    });
    if (res.ok) {
      currentUser = data?.user || null;
      updateAuthView();
      window.location.hash = '#items';
    } else {
      if (authMsg) authMsg.textContent = (data && data.message) || 'Ошибка входа';
    }
  });

  qs('#reg-btn')?.addEventListener('click', async () => {
    const name = regNameInput?.value.trim() || '';
    const password = regPassInput?.value.trim() || '';
    const email = regEmailInput?.value.trim() || '';
    const phone = regPhoneInput?.value.trim() || '';
    if (!name || !password) {
      if (authMsg) authMsg.textContent = 'Введите имя и пароль';
      return;
    }
    const { res, data } = await api('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password, email, phone })
    });
    if (res.ok) {
      currentUser = data?.user || null;
      updateAuthView();
      window.location.hash = '#items';
    } else {
      if (authMsg) authMsg.textContent = (data && data.message) || 'Ошибка регистрации';
    }
  });
}

function attachUiEvents() {
  sidebarItems.forEach(item => item.addEventListener('click', () => {
    const route = item.getAttribute('href')?.slice(1) || 'items';
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

    qs('#sell-submit')?.addEventListener('click', async () => {
      const values = {
        name: qs('#item-name')?.value || '',
        hero: qs('#hero')?.value || '',
        rarity: qs('#rarity')?.value || '',
        price: Number(qs('#price')?.value || 0),
        description: qs('#desc')?.value || ''
      };
      const { res } = await api('/api/products', {
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
