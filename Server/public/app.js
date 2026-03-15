"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Находим место на странице, куда вставим товары
const productContainer = document.querySelector('.market-grid');
async function loadProducts() {
    try {
        // Стучимся к нашему серверу
        const response = await fetch('/api/products');
        const products = await response.json();
        if (!productContainer)
            return;
        // Очищаем и рисуем карточки
        productContainer.innerHTML = products.map(p => `
            <div class="item-card">
                <div class="item-info">
                    <div class="item-name" data-title>${p.name}</div>
                    <div class="item-hero">${p.hero || 'Universal'}</div>
                    <div class="item-price" data-price>${p.price} BYN</div>
                    <button class="buy-btn" onclick="addToCart(${p.id})">В корзину</button>
                </div>
            </div>
        `).join('');
    }
    catch (err) {
        console.error("Сервер молчит, проверь терминал!", err);
    }
}
// Запускаем при открытии страницы
loadProducts();
//# sourceMappingURL=app.js.map