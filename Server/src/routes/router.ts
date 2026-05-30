import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { localizationService, type Locale } from '../services/localizationService';

interface User {
    id: number;
    name: string;
    password: string;
    role: 'user' | 'admin';
    email?: string;
    phone?: string;
}

interface Review {
    id: number;
    productId: number;
    userId: number;
    username: string;
    rating: number;
    comment: string;
    createdAt: string;
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
    tags?: string[];
    blocked?: boolean;
    averageRating?: number;
    reviewCount?: number;
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

interface UserLikes {
    userId: number;
    likedProductIds: number[];
    recommendedTags: string[];
    lastUpdate: string;
}

declare module 'express-session' {
    interface SessionData {
        userId?: number;
        locale?: Locale;
    }
}

const router = Router();

const dataDir = path.join(__dirname, '..', 'data');
const usersPath = path.join(dataDir, 'users.json');
const productsPath = path.join(dataDir, 'products.json');
const purchasesPath = path.join(dataDir, 'purchases.json');
const cartsPath = path.join(dataDir, 'carts.json');
const reviewsPath = path.join(dataDir, 'reviews.json');
const userLikesPath = path.join(dataDir, 'userLikes.json');

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
    res.status(201).json({ message: 'Registered', user: { id: newUser.id, name: newUser.name, role: newUser.role } });
});

router.post('/login', (req: Request, res: Response) => {
    const { name, password } = req.body;
    if (!name || !password) return res.status(400).json({ message: 'Name and password required' });

    const users = readJsonFile<User>(usersPath, []);
    const user = users.find(u => u.name === String(name) && u.password === String(password));
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    req.session.userId = user.id;
    res.json({ message: 'Logged in', user: { id: user.id, name: user.name, role: user.role } });
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
    res.json({ user: { id: user.id, name: user.name, role: user.role } });
});

router.get('/products', (req: Request, res: Response) => {
    const products = readJsonFile<Product>(productsPath, []);
    const reviews = readJsonFile<Review>(reviewsPath, []);
    const enrichedProducts = products.map(product => {
        const productReviews = reviews.filter(review => review.productId === product.id);
        const averageRating = productReviews.length > 0
            ? productReviews.reduce((sum, review) => sum + review.rating, 0) / productReviews.length
            : 0;
        return {
            ...product,
            averageRating,
            reviewCount: productReviews.length
        };
    });

    const { search, sort, hero, inStock } = req.query as Record<string, string>;
    let filtered = enrichedProducts;

    if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
    }
    if (hero) {
        filtered = filtered.filter(p => (p.hero || '').toLowerCase() === hero.toLowerCase());
    }
    if (inStock === 'true') {
        filtered = filtered.filter(p => p.count > 0);
    }
    if (sort === 'price_asc') filtered = filtered.sort((a, b) => a.price - b.price);
    if (sort === 'price_desc') filtered = filtered.sort((a, b) => b.price - a.price);

    const users = readJsonFile<User>(usersPath, []);
    const currentUser = req.session.userId ? users.find(u => u.id === req.session.userId) : undefined;
    if (!currentUser || currentUser.role !== 'admin') {
        filtered = filtered.filter(p => !p.blocked);
    }

    res.json(filtered);
});

router.post('/products', (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(403).json({ message: 'Login required' });

    const { name, price, count, hero, description, rarity, tags } = req.body;
    if (!name || !price) return res.status(400).json({ message: 'Name and price required' });

    const parsedTags = tags
        ? Array.isArray(tags)
            ? tags.map((tag: unknown) => String(tag).trim()).filter(Boolean)
            : String(tags).split(',').map(tag => tag.trim()).filter(Boolean)
        : undefined;

    const products = readJsonFile<Product>(productsPath, []);
    const newProduct: Product = {
        id: Date.now(),
        name: String(name),
        price: Number(price),
        count: Number(count || 1),
        hero: hero ? String(hero) : undefined,
        description: description ? String(description) : undefined,
        rarity: rarity ? String(rarity) : undefined,
        tags: parsedTags,
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

// ===== LOCALIZATION ENDPOINTS =====
router.get('/locale', (req: Request, res: Response) => {
    const locale = (req.session.locale || 'ru') as Locale;
    const translations = localizationService.getLocale(locale);
    res.json({ locale, translations });
});

router.post('/locale', (req: Request, res: Response) => {
    const { locale } = req.body as { locale: Locale };
    if (!['ru', 'en'].includes(locale)) {
        return res.status(400).json({ message: 'Invalid locale' });
    }
    req.session.locale = locale;
    const translations = localizationService.getLocale(locale);
    res.json({ locale, translations });
});

router.get('/locale/detect', (req: Request, res: Response) => {
    const country = (req.headers['cf-ipcountry'] as string) || 'US';
    const detectedLocale = localizationService.detectLocaleFromCountry(country);
    res.json({ detectedLocale, country });
});

// ===== REVIEWS & RATINGS ENDPOINTS =====
router.post('/reviews', (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Login required' });
    
    const { productId, rating, comment } = req.body;
    if (!productId || !rating || !comment) {
        return res.status(400).json({ message: 'productId, rating, and comment required' });
    }
    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const users = readJsonFile<User>(usersPath, []);
    const user = users.find(u => u.id === req.session.userId);
    if (!user) return res.status(401).json({ message: 'User not found' });

    const reviews = readJsonFile<Review>(reviewsPath, []);
    const existingReview = reviews.find(r => r.productId === Number(productId) && r.userId === req.session.userId);
    
    if (existingReview) {
        existingReview.rating = Number(rating);
        existingReview.comment = String(comment);
        existingReview.createdAt = new Date().toISOString();
    } else {
        const newReview: Review = {
            id: Date.now(),
            productId: Number(productId),
            userId: req.session.userId,
            username: user.name,
            rating: Number(rating),
            comment: String(comment),
            createdAt: new Date().toISOString()
        };
        reviews.push(newReview);
    }
    
    writeJsonFile(reviewsPath, reviews);
    res.status(201).json({ message: 'Review added', review: reviews.find(r => r.productId === Number(productId) && r.userId === req.session.userId) });
});

router.get('/reviews/:productId', (req: Request, res: Response) => {
    const productId = Number(req.params.productId);
    const reviews = readJsonFile<Review>(reviewsPath, []);
    const productReviews = reviews.filter(r => r.productId === productId);
    
    const averageRating = productReviews.length > 0 
        ? productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length 
        : 0;
    
    res.json({ reviews: productReviews, averageRating, count: productReviews.length });
});

// ===== LIKES & RECOMMENDATIONS ENDPOINTS =====
router.post('/likes/:productId', (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Login required' });
    
    const productId = Number(req.params.productId);
    const products = readJsonFile<Product>(productsPath, []);
    const product = products.find(p => p.id === productId);
    
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    const userLikes = readJsonFile<UserLikes>(userLikesPath, []);
    let userLike = userLikes.find(ul => ul.userId === req.session.userId);
    
    if (!userLike) {
        userLike = {
            userId: req.session.userId,
            likedProductIds: [],
            recommendedTags: [],
            lastUpdate: new Date().toISOString()
        };
        userLikes.push(userLike);
    }
    
    if (!userLike.likedProductIds.includes(productId)) {
        userLike.likedProductIds.push(productId);
        
        if (product.tags) {
            product.tags.forEach(tag => {
                if (!userLike!.recommendedTags.includes(tag)) {
                    userLike!.recommendedTags.push(tag);
                }
            });
        }
        
        userLike.lastUpdate = new Date().toISOString();
        writeJsonFile(userLikesPath, userLikes);
    }
    
    res.json({ message: 'Product liked' });
});

router.get('/recommendations', (req: Request, res: Response) => {
    if (!req.session.userId) return res.json({ recommendations: [] });
    
    const userLikes = readJsonFile<UserLikes>(userLikesPath, []);
    const userLike = userLikes.find(ul => ul.userId === req.session.userId);
    
    if (!userLike || userLike.recommendedTags.length === 0) {
        return res.json({ recommendations: [] });
    }
    
    const lastUpdateTime = new Date(userLike.lastUpdate).getTime();
    const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
    const now = new Date().getTime();
    
    if (now - lastUpdateTime > threeDaysInMs) {
        userLike.recommendedTags = [];
        const userLikesData = readJsonFile<UserLikes>(userLikesPath, []);
        const idx = userLikesData.findIndex(ul => ul.userId === req.session.userId);
        if (idx !== -1) {
            userLikesData[idx] = userLike;
            writeJsonFile(userLikesPath, userLikesData);
        }
        return res.json({ recommendations: [] });
    }
    
    const products = readJsonFile<Product>(productsPath, []);
    const recommendations = products.filter(p => 
        p.tags && 
        p.tags.some(tag => userLike!.recommendedTags.includes(tag)) &&
        !userLike!.likedProductIds.includes(p.id) &&
        p.ownerId !== req.session.userId &&
        !p.blocked
    );
    
    res.json({ recommendations });
});

// ===== ADMIN ENDPOINTS =====
const requireAdmin = (req: Request, res: Response, next: Function) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Login required' });
    const users = readJsonFile<User>(usersPath, []);
    const user = users.find(u => u.id === req.session.userId);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

router.post('/admin/products', requireAdmin, (req: Request, res: Response) => {
    const { name, price, count, hero, description, rarity, tags } = req.body;
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
        tags: tags ? String(tags).split(',').map(t => t.trim()) : [],
        ownerId: req.session.userId
    };

    products.push(newProduct);
    writeJsonFile(productsPath, products);
    res.status(201).json({ message: 'Product added', product: newProduct });
});

router.put('/admin/products/:id', requireAdmin, (req: Request, res: Response) => {
    const productId = Number(req.params.id);
    const { name, price, count, hero, description, rarity, tags, blocked } = req.body;
    
    const products = readJsonFile<Product>(productsPath, []);
    const idx = products.findIndex(p => p.id === productId);
    
    if (idx === -1) return res.status(404).json({ message: 'Product not found' });
    
    products[idx] = {
        ...products[idx],
        name: name ? String(name) : products[idx].name,
        price: price ? Number(price) : products[idx].price,
        count: count !== undefined ? Number(count) : products[idx].count,
        hero: hero ? String(hero) : products[idx].hero,
        description: description ? String(description) : products[idx].description,
        rarity: rarity ? String(rarity) : products[idx].rarity,
        tags: tags ? String(tags).split(',').map(t => t.trim()) : products[idx].tags,
        blocked: typeof blocked === 'boolean' ? blocked : products[idx].blocked
    };
    
    writeJsonFile(productsPath, products);
    res.json({ message: 'Product updated', product: products[idx] });
});

router.put('/admin/products/:id/block', requireAdmin, (req: Request, res: Response) => {
    const productId = Number(req.params.id);
    const { blocked } = req.body;

    if (typeof blocked !== 'boolean') {
        return res.status(400).json({ message: 'Blocked flag required' });
    }

    const products = readJsonFile<Product>(productsPath, []);
    const idx = products.findIndex(p => p.id === productId);
    if (idx === -1) return res.status(404).json({ message: 'Product not found' });

    products[idx].blocked = blocked;
    writeJsonFile(productsPath, products);
    res.json({ message: blocked ? 'Product blocked' : 'Product unblocked', product: products[idx] });
});

router.delete('/admin/products/:id', requireAdmin, (req: Request, res: Response) => {
    const productId = Number(req.params.id);
    const products = readJsonFile<Product>(productsPath, []);
    const idx = products.findIndex(p => p.id === productId);
    if (idx === -1) return res.status(404).json({ message: 'Product not found' });

    products.splice(idx, 1);
    writeJsonFile(productsPath, products);
    res.json({ message: 'Product deleted' });
});

router.get('/admin/products', requireAdmin, (req: Request, res: Response) => {
    const products = readJsonFile<Product>(productsPath, []);
    res.json(products);
});

export default router;
