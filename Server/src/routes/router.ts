import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

interface User {
    id: number;
    name: string;
    password: string;
    role: 'user' | 'admin';
    email?: string;
    phone?: string;
}

interface Product {
    id: number;
    name: string;
    price: number;
    count: number;
    hero?: string;
    description?: string;
    rarity?: string;
    ownerId?: number;
}

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

interface CartItem {
    productId: number;
    qty: number;
}

interface Cart {
    userId: number;
    items: CartItem[];
}

declare module 'express-session' {
    interface SessionData {
        userId?: number;
    }
}

const router = Router();

const dataDir = path.join(__dirname, '..', 'data');
const usersPath = path.join(dataDir, 'users.json');
const productsPath = path.join(dataDir, 'products.json');
const purchasesPath = path.join(dataDir, 'purchases.json');
const cartsPath = path.join(dataDir, 'carts.json');

const ensureFile = <T>(filePath: string, defaultValue: T[]): void => {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
};

const readJsonFile = <T>(filePath: string, defaultValue: T[] = []): T[] => {
    ensureFile(filePath, defaultValue);
    const raw = fs.readFileSync(filePath, 'utf-8').trim();
    if (!raw) return [];
    try {
        return JSON.parse(raw) as T[];
    } catch {
        return defaultValue;
    }
};

const writeJsonFile = <T>(filePath: string, data: T[]): void => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

const getOrCreateCart = (userId: number): { carts: Cart[]; cart: Cart } => {
    const carts = readJsonFile<Cart>(cartsPath, []);
    let cart = carts.find(c => c.userId === userId);
    if (!cart) {
        cart = { userId, items: [] };
        carts.push(cart);
        writeJsonFile(cartsPath, carts);
    }
    return { carts, cart };
};

router.post('/register', (req: Request, res: Response) => {
    const { name, password, email, phone } = req.body;
    if (!name || !password) return res.status(400).json({ message: 'Name and password required' });

    const users = readJsonFile<User>(usersPath, []);
    if (users.find(u => u.name === name)) return res.status(400).json({ message: 'User exists' });

    const newUser: User = {
        id: Date.now(),
        name: String(name),
        password: String(password),
        role: 'user',
        email: email ? String(email) : undefined,
        phone: phone ? String(phone) : undefined
    };

    users.push(newUser);
    writeJsonFile(usersPath, users);
    req.session.userId = newUser.id;
    res.status(201).json({ message: 'Registered', user: { id: newUser.id, name: newUser.name } });
});

router.post('/login', (req: Request, res: Response) => {
    const { name, password } = req.body;
    if (!name || !password) return res.status(400).json({ message: 'Name and password required' });

    const users = readJsonFile<User>(usersPath, []);
    const user = users.find(u => u.name === String(name) && u.password === String(password));
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    req.session.userId = user.id;
    res.json({ message: 'Logged in', user: { id: user.id, name: user.name } });
});

router.post('/logout', (req: Request, res: Response) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ message: 'Logout error' });
        res.json({ message: 'Logged out' });
    });
});

router.get('/me', (req: Request, res: Response) => {
    if (!req.session.userId) return res.json({ user: null });
    const users = readJsonFile<User>(usersPath, []);
    const user = users.find(u => u.id === req.session.userId);
    if (!user) return res.json({ user: null });
    res.json({ user: { id: user.id, name: user.name } });
});

router.get('/products', (req: Request, res: Response) => {
    let products = readJsonFile<Product>(productsPath, []);
    const { search, sort, hero, inStock } = req.query as Record<string, string>;

    if (search) {
        const q = search.toLowerCase();
        products = products.filter(p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
    }
    if (hero) {
        products = products.filter(p => (p.hero || '').toLowerCase() === hero.toLowerCase());
    }
    if (inStock === 'true') {
        products = products.filter(p => p.count > 0);
    }
    if (sort === 'price_asc') products = products.sort((a, b) => a.price - b.price);
    if (sort === 'price_desc') products = products.sort((a, b) => b.price - a.price);

    res.json(products);
});

router.post('/products', (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(403).json({ message: 'Login required' });

    const { name, price, count, hero, description, rarity } = req.body;
    if (!name || !price) return res.status(400).json({ message: 'Name and price required' });

    const products = readJsonFile<Product>(productsPath, []);
    const newProduct: Product = {
        id: Date.now(),
        name: String(name),
        price: Number(price),
        count: Number(count || 1),
        hero: hero ? String(hero) : undefined,
        description: description ? String(description) : undefined,
        rarity: rarity ? String(rarity) : undefined,
        ownerId: req.session.userId
    };

    products.push(newProduct);
    writeJsonFile(productsPath, products);
    res.status(201).json({ message: 'Product added', product: newProduct });
});

router.get('/my-lots', (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Login required' });
    const products = readJsonFile<Product>(productsPath, []);
    res.json(products.filter(p => (p.ownerId || 0) === req.session.userId));
});

router.delete('/my-lots/:id', (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Login required' });
    const id = Number(req.params.id);
    const products = readJsonFile<Product>(productsPath, []);
    const idx = products.findIndex(p => p.id === id && (p.ownerId || 0) === req.session.userId);
    if (idx === -1) return res.status(404).json({ message: 'Lot not found or not owner' });
    products.splice(idx, 1);
    writeJsonFile(productsPath, products);
    res.json({ message: 'Deleted' });
});

router.post('/buy/:id', (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Login required' });
    const id = Number(req.params.id);
    const products = readJsonFile<Product>(productsPath, []);
    const productIdx = products.findIndex(p => p.id === id);
    if (productIdx === -1) return res.status(404).json({ message: 'Товар не найден' });

    const product = products[productIdx];
    if (product.ownerId === req.session.userId) return res.status(400).json({ message: 'Нельзя купить свой лот' });

    const purchases = readJsonFile<Purchase>(purchasesPath, []);
    const purchase: Purchase = {
        id: Date.now(),
        productId: product.id,
        name: product.name,
        price: product.price,
        sellerId: product.ownerId,
        buyerId: req.session.userId,
        boughtAt: new Date().toISOString(),
        qty: 1
    };

    purchases.push(purchase);
    writeJsonFile(purchasesPath, purchases);

    if (product.count > 1) {
        product.count -= 1;
        products[productIdx] = product;
    } else {
        products.splice(productIdx, 1);
    }
    writeJsonFile(productsPath, products);

    const carts = readJsonFile<Cart>(cartsPath, []);
    let cartsChanged = false;
    for (const cart of carts) {
        const itemIndex = cart.items.findIndex(item => item.productId === id);
        if (itemIndex !== -1) {
            cart.items.splice(itemIndex, 1);
            cartsChanged = true;
        }
    }
    if (cartsChanged) writeJsonFile(cartsPath, carts);

    res.json({ message: 'Purchased', purchase });
});

router.post('/cart/checkout', (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Login required' });
    const { carts, cart } = getOrCreateCart(req.session.userId);
    if (cart.items.length === 0) return res.status(400).json({ message: 'Cart is empty' });

    const products = readJsonFile<Product>(productsPath, []);
    const purchases = readJsonFile<Purchase>(purchasesPath, []);
    const results: Array<{ productId: number; status: 'purchased' | 'not_found' | 'own_lot' | 'out_of_stock'; purchase?: Purchase }> = [];

    for (const item of [...cart.items]) {
        const productIdx = products.findIndex(p => p.id === item.productId);
        if (productIdx === -1) {
            results.push({ productId: item.productId, status: 'not_found' });
            cart.items = cart.items.filter(x => x.productId !== item.productId);
            continue;
        }

        const product = products[productIdx];
        if (product.ownerId === req.session.userId) {
            results.push({ productId: item.productId, status: 'own_lot' });
            continue;
        }
        if (product.count <= 0) {
            results.push({ productId: item.productId, status: 'out_of_stock' });
            cart.items = cart.items.filter(x => x.productId !== item.productId);
            continue;
        }

        const qtyToBuy = Math.min(product.count, item.qty || 1);
        const purchase: Purchase = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            productId: product.id,
            name: product.name,
            price: product.price,
            sellerId: product.ownerId,
            buyerId: req.session.userId,
            boughtAt: new Date().toISOString(),
            qty: qtyToBuy
        };

        purchases.push(purchase);
        results.push({ productId: item.productId, status: 'purchased', purchase });

        if (product.count > qtyToBuy) {
            product.count -= qtyToBuy;
            products[productIdx] = product;
        } else {
            products.splice(productIdx, 1);
        }

        cart.items = cart.items.filter(x => x.productId !== item.productId);

        for (const otherCart of carts.filter(c => c.userId !== req.session.userId)) {
            const index = otherCart.items.findIndex(i => i.productId === item.productId);
            if (index !== -1) otherCart.items.splice(index, 1);
        }
    }

    writeJsonFile(productsPath, products);
    writeJsonFile(purchasesPath, purchases);
    writeJsonFile(cartsPath, carts);

    res.json({ message: 'Checkout completed', results });
});

router.get('/inventory', (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Login required' });
    const purchases = readJsonFile<Purchase>(purchasesPath, []);
    res.json(purchases.filter(p => p.buyerId === req.session.userId));
});

router.get('/cart', (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Login required' });
    const { cart } = getOrCreateCart(req.session.userId);
    const products = readJsonFile<Product>(productsPath, []);
    const enriched = cart.items.map(item => {
        const product = products.find(pr => pr.id === item.productId);
        return {
            productId: item.productId,
            qty: item.qty,
            name: product ? product.name : '',
            price: product ? product.price : 0
        };
    });
    res.json(enriched);
});

router.post('/cart', (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Login required' });
    const productId = Number(req.body.productId);
    const qty = Number(req.body.qty);
    if (!productId || !qty) return res.status(400).json({ message: 'productId and qty required' });

    const products = readJsonFile<Product>(productsPath, []);
    const product = products.find(p => p.id === productId);
    if (!product) return res.status(404).json({ message: 'Товар не найден' });
    if (product.ownerId === req.session.userId) return res.status(400).json({ message: 'Нельзя добавить свой лот в корзину' });
    if (product.count <= 0) return res.status(400).json({ message: 'Товар отсутствует' });

    const { carts, cart } = getOrCreateCart(req.session.userId);
    const existingItem = cart.items.find(item => item.productId === productId);
    if (existingItem) {
        existingItem.qty += qty;
    } else {
        cart.items.push({ productId, qty });
    }

    writeJsonFile(cartsPath, carts);
    res.json({ message: 'Added', cart: cart.items });
});

router.put('/cart/:productId', (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Login required' });
    const productId = Number(req.params.productId);
    const qty = Number(req.body.qty);
    if (Number.isNaN(qty)) return res.status(400).json({ message: 'qty required' });

    const { carts, cart } = getOrCreateCart(req.session.userId);
    const item = cart.items.find(entry => entry.productId === productId);
    if (!item) return res.status(404).json({ message: 'Item not found in cart' });
    item.qty = qty;
    writeJsonFile(cartsPath, carts);
    res.json({ message: 'Updated', cart: cart.items });
});

router.delete('/cart/:productId', (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Login required' });
    const productId = Number(req.params.productId);
    const { carts, cart } = getOrCreateCart(req.session.userId);
    const idx = cart.items.findIndex(item => item.productId === productId);
    if (idx === -1) return res.status(404).json({ message: 'Item not found' });
    cart.items.splice(idx, 1);
    writeJsonFile(cartsPath, carts);
    res.json({ message: 'Removed', cart: cart.items });
});

export default router;
