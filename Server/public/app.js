const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => Array.from(document.querySelectorAll(selector));
const mainSection = qs('#main-section');
const detailSection = qs('#detail-section');
const authModal = qs('#auth-modal');
const listEl = qs('#list');
const detailEl = qs('#detail-content');
const sidebarItems = qsa('.sidebar-item');
const composeBtn = qs('#compose');
const langSwitchBtn = qs('#lang-switch');
const authLinkTop = qs('#auth-link-top');
const authUsername = qs('#auth-username');
const adminPanelBtn = qs('#admin-panel-btn');
const logo = qs('#logo');
const searchInput = qs('#search');
const sortInput = qs('#sort');
const applyFiltersBtn = qs('#apply-filters');
let currentUser = null;
let currentView = 'items';
let currentProducts = [];
let recommendedProducts = [];
let currentLocale = 'ru';
let translations = {};
async function api(path, opts = {}) {
    try {
        const res = await fetch(path, opts);
        let data = null;
        try {
            data = await res.json();
        }
        catch {
            data = null;
        }
        return { res, data };
    }
    catch {
        return { res: { ok: false }, data: null };
    }
}
function t(path) {
    const keys = path.split('.');
    let value = translations;
    for (const key of keys) {
        value = value?.[key];
    }
    return typeof value === 'string' ? value : path;
}
function escapeHtml(value) {
    if (!value)
        return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
function getRoute() {
    return window.location.hash.slice(1) || 'items';
}
function routeRequiresAuth(route) {
    return ['cart', 'my-lots', 'inventory', 'admin'].includes(route);
}
function setActiveNavigation(route) {
    sidebarItems.forEach(item => item.classList.toggle('active', item.getAttribute('href') === `#${route}`));
}
function showSection(route) {
    authModal?.classList.toggle('hidden', route !== 'login' && route !== 'register');
}
function updateAuthView() {
    if (!authLinkTop || !authUsername)
        return;
    if (currentUser) {
        authLinkTop.textContent = t('header.logout');
        authLinkTop.setAttribute('href', '#items');
        authUsername.textContent = currentUser.name;
        // Show admin button for admins
        if (adminPanelBtn) {
            adminPanelBtn.classList.toggle('hidden', currentUser.role !== 'admin');
        }
    }
    else {
        authLinkTop.textContent = t('header.login');
        authLinkTop.setAttribute('href', '#login');
        authUsername.textContent = '';
        // Hide admin button for non-logged-in users
        if (adminPanelBtn) {
            adminPanelBtn.classList.add('hidden');
        }
    }
}
function showAuthMode(mode) {
    const showLoginBtn = qs('#show-login');
    const showRegisterBtn = qs('#show-register');
    const loginForm = qs('#login-form');
    const registerForm = qs('#register-form');
    if (!showLoginBtn || !showRegisterBtn || !loginForm || !registerForm)
        return;
    showLoginBtn.classList.toggle('active', mode === 'login');
    showRegisterBtn.classList.toggle('active', mode === 'register');
    loginForm.classList.toggle('hidden', mode !== 'login');
    registerForm.classList.toggle('hidden', mode !== 'register');
    const authTitle = qs('.auth-header h2');
    if (authTitle)
        authTitle.textContent = mode === 'login' ? t('auth.login') : t('auth.register');
    const authMsg = qs('#auth-msg');
    if (authMsg)
        authMsg.textContent = '';
}
async function initLocale() {
    const { data } = await api('/api/locale');
    if (data) {
        currentLocale = data.locale;
        translations = data.translations;
    }
    updateUIText();
    const localeAccepted = sessionStorage.getItem('locale-accepted');
    if (!localeAccepted) {
        await showLocaleSelector();
    }
}
function updateUIText() {
    if (logo)
        logo.textContent = t('header.title');
    const sidebar = document.querySelector('.sidebar-footer');
    if (sidebar)
        sidebar.textContent = t('header.title');
    qsa('.sidebar-item').forEach(item => {
        const href = item.getAttribute('href');
        const key = href?.slice(1);
        if (key === 'items')
            item.textContent = t('sidebar.items');
        if (key === 'cart')
            item.textContent = t('sidebar.cart');
        if (key === 'my-lots')
            item.textContent = t('sidebar.myLots');
        if (key === 'inventory')
            item.textContent = t('sidebar.inventory');
        if (key === 'admin')
            item.textContent = t('sidebar.admin');
    });
    if (composeBtn)
        composeBtn.textContent = t('toolbar.sell');
    if (langSwitchBtn)
        langSwitchBtn.textContent = currentLocale === 'ru' ? 'EN' : 'RU';
    if (searchInput)
        searchInput.placeholder = t('toolbar.search');
    if (sortInput) {
        sortInput.options[0].textContent = t('toolbar.sort');
        sortInput.options[1].textContent = t('toolbar.sortAsc');
        sortInput.options[2].textContent = t('toolbar.sortDesc');
    }
    if (applyFiltersBtn)
        applyFiltersBtn.textContent = t('toolbar.apply');
    const authTitle = qs('.auth-header h2');
    if (authTitle)
        authTitle.textContent = t('auth.login');
    const showLoginBtn = qs('#show-login');
    const showRegisterBtn = qs('#show-register');
    if (showLoginBtn)
        showLoginBtn.textContent = t('auth.login');
    if (showRegisterBtn)
        showRegisterBtn.textContent = t('auth.register');
    const loginNameInput = qs('#login-name');
    const loginPassInput = qs('#login-pass');
    const regNameInput = qs('#reg-name');
    const regPassInput = qs('#reg-pass');
    const regEmailInput = qs('#reg-email');
    const regPhoneInput = qs('#reg-phone');
    const loginBtn = qs('#login-btn');
    const regBtn = qs('#reg-btn');
    if (loginNameInput)
        loginNameInput.placeholder = t('auth.username');
    if (loginPassInput)
        loginPassInput.placeholder = t('auth.password');
    if (regNameInput)
        regNameInput.placeholder = t('auth.username');
    if (regPassInput)
        regPassInput.placeholder = t('auth.password');
    if (regEmailInput)
        regEmailInput.placeholder = t('auth.email');
    if (regPhoneInput)
        regPhoneInput.placeholder = t('auth.phone');
    if (loginBtn)
        loginBtn.textContent = t('auth.login');
    if (regBtn)
        regBtn.textContent = t('auth.register');
}
async function showLocaleSelector() {
    const existing = qs('#locale-selector');
    if (existing)
        existing.remove();
    const { data } = await api('/api/locale/detect');
    const country = data?.country || 'Unknown';
    const selector = document.createElement('div');
    selector.id = 'locale-selector';
    selector.className = 'locale-selector';
    selector.innerHTML = `
    <div class="locale-content">
      <p>${t('locale.detected')} <strong>${escapeHtml(country)}</strong>. ${t('locale.question')}</p>
      <div style="display: flex; gap: 10px;">
        <button id="locale-yes" class="btn-small">${t('locale.yes')}</button>
        <button id="locale-no" class="btn-small">${t('locale.no')}</button>
      </div>
    </div>
  `;
    document.body.appendChild(selector);
    qs('#locale-yes')?.addEventListener('click', () => {
        selector.remove();
        sessionStorage.setItem('locale-accepted', 'true');
        if (data?.detectedLocale) {
            setLocale(data.detectedLocale);
        }
    });
    qs('#locale-no')?.addEventListener('click', () => {
        const newLocale = currentLocale === 'ru' ? 'en' : 'ru';
        setLocale(newLocale);
        selector.remove();
        sessionStorage.setItem('locale-accepted', 'true');
    });
}
async function setLocale(locale) {
    const { data } = await api('/api/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale })
    });
    if (data) {
        currentLocale = data.locale;
        translations = data.translations;
        updateUIText();
    }
}
async function handleRoute() {
    const route = getRoute();
    if (routeRequiresAuth(route) && !currentUser) {
        window.location.hash = '#login';
        return;
    }
    if ((route === 'login' || route === 'register') && currentUser) {
        if (currentUser.role === 'admin') {
            window.location.hash = '#admin';
        }
        else {
            window.location.hash = '#items';
        }
        return;
    }
    // Auto-redirect admin to admin panel if trying to access items
    if (currentUser?.role === 'admin' && route === 'items') {
        window.location.hash = '#admin';
        return;
    }
    if (route === 'admin' && currentUser?.role !== 'admin') {
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
    }
    else if (route === 'admin') {
        await loadAdminPanel();
    }
    else {
        await renderList();
    }
}
async function fetchMe() {
    const { data } = await api('/api/me');
    currentUser = data?.user ?? null;
    updateAuthView();
}
async function loadProducts() {
    if (!listEl)
        return;
    const params = new URLSearchParams();
    if (searchInput?.value)
        params.set('search', searchInput.value);
    if (sortInput?.value)
        params.set('sort', sortInput.value);
    const url = '/api/products' + (params.toString() ? `?${params.toString()}` : '');
    const { data } = await api(url);
    currentProducts = data ?? [];
    if (currentUser) {
        const rec = await api('/api/recommendations');
        recommendedProducts = rec.data?.recommendations ?? [];
    }
    else {
        recommendedProducts = [];
    }
    await renderList();
}
async function renderList() {
    if (!listEl)
        return;
    if (currentView === 'items') {
        if (currentProducts.length === 0 && recommendedProducts.length === 0) {
            listEl.innerHTML = `<p>${t('detail.selectItem')}</p>`;
            return;
        }
        const recommendedIds = new Set(recommendedProducts.map(product => product.id));
        const recommendedSection = recommendedProducts.length > 0
            ? `
        <div class="recommendation-block">
          <div class="recommendation-header"><strong>${t('recommendations.title')}</strong></div>
          ${recommendedProducts.slice(0, 2).map(product => {
                const rating = product.averageRating ? product.averageRating.toFixed(1) : '—';
                return `
              <div class="list-item recommended" data-id="${product.id}">
                <div>
                  <div class="list-title">${escapeHtml(product.name)}</div>
                  <div class="list-sub">${escapeHtml(product.hero || 'Universal')} · <span>${product.price} BYN</span> · ⭐ ${rating}</div>
                </div>
                <div>
                  <button class="btn-small btn-buy" data-id="${product.id}">${t('detail.buyNow')}</button>
                  <button class="btn-small btn-add" data-id="${product.id}">${t('detail.addToCart')}</button>
                  <button class="btn-small btn-reviews" data-id="${product.id}">${t('detail.reviews')}</button>
                </div>
              </div>
            `;
            }).join('')}
        </div>
      `
            : '';
        const regularProducts = currentProducts.filter(product => !recommendedIds.has(product.id));
        const productsHtml = regularProducts.length > 0
            ? regularProducts.map(product => {
                const isOwner = currentUser && product.ownerId === currentUser.id;
                const rating = product.averageRating ? product.averageRating.toFixed(1) : '—';
                return `
          <div class="list-item" data-id="${product.id}">
            <div>
              <div class="list-title">${escapeHtml(product.name)}</div>
              <div class="list-sub">${escapeHtml(product.hero || 'Universal')} · <span>${product.price} BYN</span> · ⭐ ${rating}</div>
            </div>
            <div>
              <button class="btn-small btn-buy" data-id="${product.id}" ${isOwner ? 'disabled' : ''}>${t('detail.buyNow')}</button>
              ${isOwner ? `<span class="muted">${t('detail.posted')}</span>` : `<button class="btn-small btn-add" data-id="${product.id}">${t('detail.addToCart')}</button>`}
              <button class="btn-small btn-reviews" data-id="${product.id}">${t('detail.reviews')}</button>
            </div>
          </div>
        `;
            }).join('')
            : '';
        listEl.innerHTML = recommendedSection + productsHtml;
        qsa('.list-item').forEach(el => {
            el.addEventListener('click', () => {
                const id = Number(el.getAttribute('data-id'));
                if (!Number.isNaN(id))
                    showDetail(id);
            });
        });
        qsa('.btn-buy').forEach(button => {
            button.addEventListener('click', async (event) => {
                event.stopPropagation();
                const id = Number(button.getAttribute('data-id'));
                if (!Number.isNaN(id))
                    await buyProduct(id);
            });
        });
        qsa('.btn-reviews').forEach(button => {
            button.addEventListener('click', async (event) => {
                event.stopPropagation();
                const id = Number(button.getAttribute('data-id'));
                if (!Number.isNaN(id))
                    await showDetail(id);
            });
        });
        qsa('.btn-add').forEach(button => {
            button.addEventListener('click', async (event) => {
                event.stopPropagation();
                const id = Number(button.getAttribute('data-id'));
                if (Number.isNaN(id))
                    return;
                if (!currentUser) {
                    window.location.hash = '#login';
                    return;
                }
                const { res } = await api('/api/cart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId: id, qty: 1 })
                });
                if (res.ok)
                    showModal(`<p>${t('messages.added')}</p>`);
                else
                    showModal(`<p>${t('messages.error')}</p>`);
            });
        });
        return;
    }
    if (currentView === 'my-lots') {
        const { res, data } = await api('/api/my-lots');
        if (!res.ok || !data) {
            listEl.innerHTML = `<p>${t('messages.loginRequired')}</p>`;
            return;
        }
        if (data.length === 0) {
            listEl.innerHTML = `<p>${t('myLots.empty')}</p>`;
            return;
        }
        listEl.innerHTML = data.map(product => `
      <div class="list-item">
        <div>
          <div class="list-title">${escapeHtml(product.name)}</div>
          <div class="list-sub">${escapeHtml(product.hero || '')} · ${product.price} BYN</div>
        </div>
        <div><button class="btn-small btn-delete" data-id="${product.id}">${t('myLots.delete')}</button></div>
      </div>
    `).join('');
        qsa('.btn-delete').forEach(button => {
            button.addEventListener('click', async () => {
                const id = Number(button.getAttribute('data-id'));
                if (Number.isNaN(id))
                    return;
                const { res } = await api(`/api/my-lots/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    showModal(`<p>${t('messages.productDeleted')}</p>`);
                    await renderList();
                }
                else {
                    showModal(`<p>${t('messages.error')}</p>`);
                }
            });
        });
        return;
    }
    if (currentView === 'cart') {
        const { res, data } = await api('/api/cart');
        if (!res.ok || !data) {
            listEl.innerHTML = `<p>${t('messages.loginRequired')}</p>`;
            return;
        }
        if (data.length === 0) {
            listEl.innerHTML = `<p>${t('cart.empty')}</p>`;
            return;
        }
        const total = data.reduce((sum, item) => sum + (item.price || 0) * item.qty, 0);
        listEl.innerHTML = `
      <div class="cart-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <strong>${t('sidebar.cart')}</strong>
        <div><span style="margin-right:12px">${t('cart.total')}: ${total} BYN</span><button id="buy-all" class="btn-small">${t('cart.checkout')}</button></div>
      </div>
      ${data.map(item => `
        <div class="list-item">
          <div>
            <div class="list-title">${escapeHtml(item.name || '')}</div>
            <div class="list-sub">${t('detail.quantity')}: ${item.qty} · <span>${item.price || 0} BYN</span></div>
          </div>
          <div><button class="btn-small btn-remove" data-id="${item.productId}">${t('cart.remove')}</button></div>
        </div>
      `).join('')}
    `;
        qs('#buy-all')?.addEventListener('click', async () => {
            const { res, data } = await api('/api/cart/checkout', { method: 'POST' });
            if (res.ok) {
                showModal(`<p>${t('messages.purchased')}</p>`);
                window.location.hash = '#inventory';
            }
            else {
                showModal(`<p>${t('messages.error')}</p>`);
            }
        });
        qsa('.btn-remove').forEach(button => {
            button.addEventListener('click', async () => {
                const id = Number(button.getAttribute('data-id'));
                if (Number.isNaN(id))
                    return;
                const { res } = await api(`/api/cart/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    await renderList();
                    showModal(`<p>${t('messages.removed')}</p>`);
                }
                else {
                    showModal(`<p>${t('messages.error')}</p>`);
                }
            });
        });
        return;
    }
    if (currentView === 'inventory') {
        const { res, data } = await api('/api/inventory');
        if (!res.ok || !data) {
            listEl.innerHTML = `<p>${t('messages.loginRequired')}</p>`;
            return;
        }
        if (data.length === 0) {
            listEl.innerHTML = `<p>${t('inventory.empty')}</p>`;
            return;
        }
        listEl.innerHTML = data.map(item => `
      <div class="list-item">
        <div>
          <div class="list-title">${escapeHtml(item.name)}</div>
          <div class="list-sub">${escapeHtml(new Date(item.boughtAt).toLocaleString())} · ${item.price} BYN</div>
        </div>
      </div>
    `).join('');
        return;
    }
    listEl.innerHTML = `<p>${t('detail.selectItem')}</p>`;
}
async function showDetail(id) {
    const product = currentProducts.find(item => item.id === id);
    if (!product || !detailEl)
        return;
    const isOwner = currentUser ? product.ownerId === currentUser.id : false;
    const { data: reviewData } = await api(`/api/reviews/${id}`);
    const reviews = reviewData?.reviews ?? [];
    const averageRating = reviewData?.averageRating ?? 0;
    detailEl.innerHTML = `
    <h2>${escapeHtml(product.name)}</h2>
    <p class="list-sub">${escapeHtml(product.hero || '')} · ${product.price} BYN · ⭐ ${averageRating.toFixed(1)} (${reviews.length})</p>
    <p>${escapeHtml(product.description || '')}</p>
    <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap" data-product-id="${product.id}">
      <button class="btn-small" id="detail-buy" ${isOwner ? 'disabled' : ''} data-id="${product.id}">${t('detail.buyNow')}</button>
      ${isOwner ? `<span class="muted">${t('myLots.title')}</span>` : `<button class="btn-small" id="detail-add" data-id="${product.id}">${t('detail.addToCart')}</button>`}
      <button class="btn-small" id="like-btn" data-id="${product.id}">❤️ ${t('sidebar.items')}</button>
    </div>
    
    <div class="reviews-panel">
      <h3>${t('detail.reviews')}</h3>
      ${currentUser ? `
        <div class="review-form">
          <div class="review-form-row">
            <label>${t('detail.rating')}:</label>
            <select id="review-rating">
              <option value="5">5 ⭐</option>
              <option value="4">4 ⭐</option>
              <option value="3">3 ⭐</option>
              <option value="2">2 ⭐</option>
              <option value="1">1 ⭐</option>
            </select>
          </div>
          <div class="review-form-row">
            <textarea id="review-comment" placeholder="${t('detail.addReview')}"></textarea>
          </div>
          <button id="submit-review" class="btn-small">${t('messages.reviewAdded')}</button>
        </div>
      ` : `<p>${t('messages.loginRequired')}</p>`}
      
      <div id="reviews-list" class="reviews-list">
        ${reviews.length === 0 ? `<p class="muted">${t('detail.reviews')}</p>` : reviews.map(review => `
          <div class="review-card">
            <div class="review-meta">
              <strong>${escapeHtml(review.username)}</strong>
              <span>⭐ ${review.rating}</span>
            </div>
            <p class="review-text">${escapeHtml(review.comment)}</p>
            <small class="review-date">${new Date(review.createdAt).toLocaleString()}</small>
          </div>
        `).join('')}
      </div>
    </div>
  `;
    qs('#detail-buy')?.addEventListener('click', async () => {
        if (isOwner)
            return;
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
        if (res.ok)
            showModal(`<p>${t('messages.added')}</p>`);
        else
            showModal(`<p>${t('messages.error')}</p>`);
    });
    qs('#like-btn')?.addEventListener('click', async () => {
        if (!currentUser) {
            window.location.hash = '#login';
            return;
        }
        const { res } = await api(`/api/likes/${id}`, { method: 'POST' });
        if (res.ok)
            showModal('<p>Liked ❤️</p>');
    });
    qs('#submit-review')?.addEventListener('click', async () => {
        const rating = Number(qs('#review-rating')?.value ?? 5);
        const comment = (qs('#review-comment')?.value ?? '').trim();
        if (!comment) {
            showModal(`<p>${t('messages.error')}</p>`);
            return;
        }
        const { res } = await api('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: id, rating, comment })
        });
        if (res.ok) {
            showDetail(id);
            showModal(`<p>${t('messages.reviewAdded')}</p>`);
        }
        else {
            showModal(`<p>${t('messages.error')}</p>`);
        }
    });
}
async function buyProduct(id) {
    const { res, data } = await api('/api/buy/' + id, { method: 'POST' });
    if (res.ok) {
        await loadProducts();
        await renderList();
        showModal(`<p>${t('messages.purchased')}</p>`);
    }
    else {
        showModal(`<p>${escapeHtml((data && data.message) || t('messages.error'))}</p>`);
    }
}
async function loadAdminPanel() {
    if (!listEl)
        return;
    const { data } = await api('/api/admin/products');
    const products = data ?? [];
    listEl.innerHTML = `
    <div style="margin-bottom: 20px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
      <h2>${t('admin.title')}</h2>
      <button id="add-product-btn" class="btn-small">${t('admin.addProduct')}</button>
    </div>
    ${products.map(product => `
      <div class="list-item">
        <div>
          <div class="list-title">${escapeHtml(product.name)}</div>
          <div class="list-sub">${product.price} BYN · ${product.count} ${t('detail.quantity')} · ${product.blocked ? t('admin.blocked') : t('admin.active')}</div>
        </div>
        <div>
          <button class="btn-small btn-edit" data-id="${product.id}">${t('admin.edit')}</button>
          <button class="btn-small btn-delete" data-id="${product.id}">${t('admin.delete')}</button>
          <button class="btn-small btn-block" data-id="${product.id}">${product.blocked ? t('admin.unblock') : t('admin.block')}</button>
        </div>
      </div>
    `).join('')}
  `;
    qs('#add-product-btn')?.addEventListener('click', () => {
        showProductForm(null);
    });
    qsa('.btn-edit').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = Number(btn.getAttribute('data-id'));
            const product = products.find(p => p.id === id);
            if (product)
                showProductForm(product);
        });
    });
    qsa('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = Number(btn.getAttribute('data-id'));
            const { res } = await api(`/api/admin/products/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showModal(`<p>${t('messages.productDeleted')}</p>`);
                await loadAdminPanel();
            }
        });
    });

    qsa('.btn-block').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = Number(btn.getAttribute('data-id'));
            const product = products.find(p => p.id === id);
            if (!product)
                return;
            const { res } = await api(`/api/admin/products/${id}/block`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blocked: !product.blocked })
            });
            if (res.ok) {
                await loadAdminPanel();
            }
        });
    });
}
function showProductForm(product) {
    if (!detailEl)
        return;
    const isEdit = !!product;
    detailEl.innerHTML = `
    <h3>${isEdit ? t('admin.editProduct') : t('admin.addProduct')}</h3>
    <div class="sell-form">
      <div class="row"><label>${t('admin.productName')}</label><input id="item-name" value="${escapeHtml(product?.name || '')}" placeholder="${t('admin.productName')}" /></div>
      <div class="row"><label>${t('admin.productHero')}</label><input id="hero" value="${escapeHtml(product?.hero || '')}" placeholder="${t('admin.productHero')}" /></div>
      <div class="row"><label>${t('admin.productRarity')}</label><select id="rarity"><option>Common</option><option>Rare</option><option>Immortal</option><option>Arcana</option></select></div>
      <div class="row"><label>${t('admin.productPrice')}</label><input id="price" type="number" min="1" value="${product?.price || ''}" placeholder="${t('admin.productPrice')}" /></div>
      <div class="row"><label>${t('admin.productCount')}</label><input id="count" type="number" min="1" value="${product?.count || '1'}" placeholder="${t('admin.productCount')}" /></div>
      <div class="row full"><label>${t('admin.productDescription')}</label><textarea id="desc" placeholder="${t('admin.productDescription')}">${escapeHtml(product?.description || '')}</textarea></div>
      <div class="row full"><label>${t('admin.productTags')}</label><input id="tags" value="${escapeHtml((product?.tags || []).join(', '))}" placeholder="${t('admin.productTags')}" /></div>
      <div style="margin-top:8px;text-align:right;display:flex;gap:10px;justify-content:flex-end">
        <button id="product-cancel" class="btn-small">${t('admin.cancel')}</button>
        <button id="product-submit" class="btn-small">${t('admin.save')}</button>
      </div>
    </div>
  `;
    const selectRarity = qs('#rarity');
    if (selectRarity && product?.rarity) {
        selectRarity.value = product.rarity;
    }
    qs('#product-cancel')?.addEventListener('click', async () => {
        await loadAdminPanel();
    });
    qs('#product-submit')?.addEventListener('click', async () => {
        const values = {
            name: (qs('#item-name')?.value ?? '').trim(),
            hero: (qs('#hero')?.value ?? '').trim(),
            rarity: (qs('#rarity')?.value ?? '').trim(),
            price: Number(qs('#price')?.value ?? 0),
            count: Number(qs('#count')?.value ?? 1),
            description: (qs('#desc')?.value ?? '').trim(),
            tags: (qs('#tags')?.value ?? '').trim()
        };
        const endpoint = isEdit ? `/api/admin/products/${product.id}` : '/api/products';
        const method = isEdit ? 'PUT' : 'POST';
        const { res } = await api(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values)
        });
        if (res.ok) {
            showModal(`<p>${isEdit ? t('messages.productUpdated') : t('messages.productAdded')}</p>`);
            await loadAdminPanel();
        }
        else {
            showModal(`<p>${t('messages.error')}</p>`);
        }
    });
}
function showModal(html) {
    qs('#app-modal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'app-modal';
    modal.className = 'app-modal';
    modal.innerHTML = `<div class="app-modal-backdrop"></div><div class="app-modal-body">${html}<div style="margin-top:16px;text-align:right"><button id="app-modal-close" class="btn-small">${t('admin.cancel')}</button></div></div>`;
    document.body.appendChild(modal);
    qs('#app-modal-close')?.addEventListener('click', closeModal);
    modal.querySelector('.app-modal-backdrop')?.addEventListener('click', closeModal);
}
function closeModal() {
    qs('#app-modal')?.remove();
}
function attachAuthEvents() {
    const showLoginBtn = qs('#show-login');
    const showRegisterBtn = qs('#show-register');
    const loginForm = qs('#login-form');
    const registerForm = qs('#register-form');
    showLoginBtn?.addEventListener('click', () => { window.location.hash = '#login'; });
    showRegisterBtn?.addEventListener('click', () => { window.location.hash = '#register'; });
    qs('#auth-close')?.addEventListener('click', () => { window.location.hash = '#items'; });
    authModal?.addEventListener('click', event => {
        if (event.target.classList.contains('auth-modal-backdrop')) {
            window.location.hash = '#items';
        }
    });
    qs('#login-btn')?.addEventListener('click', async () => {
        const loginNameInput = qs('#login-name');
        const loginPassInput = qs('#login-pass');
        const authMsg = qs('#auth-msg');
        const name = loginNameInput?.value.trim() ?? '';
        const password = loginPassInput?.value.trim() ?? '';
        if (!name || !password) {
            if (authMsg)
                authMsg.textContent = t('messages.error');
            return;
        }
        const { res, data } = await api('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, password })
        });
        if (res.ok) {
            currentUser = data?.user ?? null;
            updateAuthView();
            // Redirect admin to admin panel, regular users to items
            if (currentUser?.role === 'admin') {
                window.location.hash = '#admin';
            }
            else {
                window.location.hash = '#items';
            }
        }
        else {
            if (authMsg)
                authMsg.textContent = data?.message || t('messages.error');
        }
    });
    qs('#reg-btn')?.addEventListener('click', async () => {
        const regNameInput = qs('#reg-name');
        const regPassInput = qs('#reg-pass');
        const regEmailInput = qs('#reg-email');
        const regPhoneInput = qs('#reg-phone');
        const authMsg = qs('#auth-msg');
        const name = regNameInput?.value.trim() ?? '';
        const password = regPassInput?.value.trim() ?? '';
        const email = regEmailInput?.value.trim() ?? '';
        const phone = regPhoneInput?.value.trim() ?? '';
        if (!name || !password) {
            if (authMsg)
                authMsg.textContent = t('messages.error');
            return;
        }
        const { res, data } = await api('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, password, email, phone })
        });
        if (res.ok) {
            currentUser = data?.user ?? null;
            updateAuthView();
            window.location.hash = '#items';
        }
        else {
            if (authMsg)
                authMsg.textContent = data?.message || t('messages.error');
        }
    });
}
function attachUiEvents() {
    sidebarItems.forEach(item => item.addEventListener('click', () => {
        const route = item.getAttribute('href')?.slice(1) ?? 'items';
        window.location.hash = `#${route}`;
    }));
    composeBtn?.addEventListener('click', () => {
        if (!currentUser) {
            window.location.hash = '#login';
            return;
        }
        if (currentUser.role === 'admin') {
            window.location.hash = '#admin';
            return;
        }
        if (!detailEl)
            return;
        detailEl.innerHTML = `
      <div class="sell-form">
        <h3>${t('toolbar.sell')}</h3>
        <div class="row"><label>${t('admin.productName')}</label><input id="item-name" placeholder="${t('admin.productName')}" /></div>
        <div class="row"><label>${t('admin.productHero')}</label><input id="hero" placeholder="${t('admin.productHero')}" /></div>
        <div class="row"><label>${t('admin.productRarity')}</label><select id="rarity"><option>Common</option><option>Rare</option><option>Immortal</option><option>Arcana</option></select></div>
        <div class="row"><label>${t('admin.productPrice')}</label><input id="price" type="number" min="1" placeholder="${t('admin.productPrice')}" /></div>
        <div class="row full"><label>${t('admin.productDescription')}</label><textarea id="desc" placeholder="${t('admin.productDescription')}"></textarea></div>
        <div style="margin-top:8px;text-align:right"><button id="sell-submit" class="btn-small">${t('toolbar.sell')}</button></div>
      </div>
    `;
        qs('#sell-submit')?.addEventListener('click', async () => {
            const values = {
                name: (qs('#item-name')?.value ?? '').trim(),
                hero: (qs('#hero')?.value ?? '').trim(),
                rarity: (qs('#rarity')?.value ?? '').trim(),
                price: Number(qs('#price')?.value ?? 0),
                description: (qs('#desc')?.value ?? '').trim()
            };
            const { res } = await api('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            });
            if (res.ok) {
                showModal(`<p>${t('messages.productAdded')}</p>`);
                window.location.hash = '#items';
                await loadProducts();
            }
            else {
                showModal(`<p>${t('messages.error')}</p>`);
            }
        });
    });
    // Гарантированная смена языка: делаем перезагрузку страницы,
    // чтобы DOM/рендеры точно обновились под новую локаль.
    // Это убирает проблему, когда текущий экран/карточка не успевают корректно перерисоваться.
    if (langSwitchBtn) {
        langSwitchBtn.addEventListener('click', async () => {
            const newLocale = currentLocale === 'ru' ? 'en' : 'ru';
            await setLocale(newLocale);
            window.location.reload();
        });
    }
    authLinkTop?.addEventListener('click', async (event) => {
        if (!currentUser)
            return;
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
        if (currentView === 'items')
            await loadProducts();
    });
    logo?.addEventListener('click', () => {
        window.location.hash = '#items';
    });
    adminPanelBtn?.addEventListener('click', () => {
        window.location.hash = '#admin';
    });
}
window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', async () => {
    await initLocale();
    await fetchMe();
    attachAuthEvents();
    attachUiEvents();
    // Add admin sidebar item for admins and auto-redirect
    if (currentUser?.role === 'admin') {
        const sidebar = document.querySelector('.sidebar-group');
        if (sidebar && !sidebar.querySelector('a[href="#admin"]')) {
            const adminLink = document.createElement('a');
            adminLink.className = 'sidebar-item';
            adminLink.href = '#admin';
            adminLink.textContent = t('sidebar.admin');
            sidebar.appendChild(adminLink);
            adminLink.addEventListener('click', () => {
                window.location.hash = '#admin';
            });
        }
        // Auto-redirect admin to admin panel if no hash or on items
        const currentHash = window.location.hash.slice(1) || 'items';
        if (currentHash === 'items' || !window.location.hash) {
            window.location.hash = '#admin';
        }
        else {
            await handleRoute();
        }
    }
    else {
        await handleRoute();
    }
});
