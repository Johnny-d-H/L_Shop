import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

const dataDir = path.join(__dirname, '..', 'data');
const usersPath = path.join(dataDir, 'users.json');
// 1. Добавляем путь к файлу с товарами
const productsPath = path.join(dataDir, 'products.json');

const getFileData = (filePath: string) => {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '[]');
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

// --- СЕКЦИЯ ЮЗЕРОВ (Оставляем как было) ---
router.post('/register', (req: Request, res: Response) => {
    const { username, password } = req.body;
    const users = getFileData(usersPath);
    if (users.find((u: any) => u.username === username)) {
        return res.status(400).json({ message: "Такой юзер уже есть" });
    }
    users.push({ id: Date.now(), username, password, role: 'user' });
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
    res.status(201).json({ message: "Регистрация успешна!" });
});

router.post('/login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    const users = getFileData(usersPath);
    const user = users.find((u: any) => u.username === username && u.password === password);
    if (user) {
        (req.session as any).userId = user.id;
        res.json({ message: `Привет, ${username}!`, role: user.role });
    } else {
        res.status(401).json({ message: "Неверный логин" });
    }
});

// --- 2. СЕКЦИЯ ТОВАРОВ (НОВОЕ) ---

// Получить все товары (GET http://localhost:5000/api/products)
router.get('/products', (req: Request, res: Response) => {
    const products = getFileData(productsPath);
    res.json(products);
});

// Добавить товар (POST http://localhost:5000/api/products)
router.post('/products', (req: Request, res: Response) => {
    const { name, price, count } = req.body;
    const products = getFileData(productsPath);

    const newProduct = {
        id: Date.now(),
        name,
        price: Number(price),
        count: Number(count)
    };

    products.push(newProduct);
    fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
    
    res.status(201).json({ message: "Товар добавлен!", product: newProduct });
});

export default router;  