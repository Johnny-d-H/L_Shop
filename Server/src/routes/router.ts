import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

// 1. Описываем интерфейсы для объектов (Требование ИТК по типизации)
interface User {
    id: number;
    username: string;
    password?: string;
    role: 'user' | 'admin';
}

interface Product {
    id: number;
    name: string;
    price: number;
    count: number;
    hero?: string;
}

// 2. Расширяем типы сессии, чтобы убрать any из req.session
declare module 'express-session' {
    interface SessionData {
        userId: number;
    }
}

const router = Router();

const dataDir = path.join(__dirname, '..', 'data');
const usersPath = path.join(dataDir, 'users.json');
const productsPath = path.join(dataDir, 'products.json');

// 3. Используем Generics <T> для функции чтения, чтобы она возвращала нужный тип
const getFileData = <T>(filePath: string): T[] => {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '[]');
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T[];
};

// --- СЕКЦИЯ ЮЗЕРОВ ---

router.post('/register', (req: Request, res: Response) => {
    const { username, password } = req.body;
    const users = getFileData<User>(usersPath);

    if (users.find((u: User) => u.username === username)) {
        return res.status(400).json({ message: "Такой юзер уже есть" });
    }

    const newUser: User = { 
        id: Date.now(), 
        username, 
        password, 
        role: 'user' 
    };

    users.push(newUser);
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
    res.status(201).json({ message: "Регистрация успешна!" });
});

router.post('/login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    const users = getFileData<User>(usersPath);
    
    const user = users.find((u: User) => u.username === username && u.password === password);
    
    if (user) {
        // Теперь здесь нет any, так как мы расширили SessionData выше
        req.session.userId = user.id;
        res.json({ message: `Привет, ${username}!`, role: user.role });
    } else {
        res.status(401).json({ message: "Неверный логин" });
    }
});

// --- СЕКЦИЯ ТОВАРОВ ---

router.get('/products', (req: Request, res: Response) => {
    const products = getFileData<Product>(productsPath);
    res.json(products);
});

router.post('/products', (req: Request, res: Response) => {
    // Проверка авторизации (ИТК: безопасность доступа)
    if (!req.session.userId) {
        return res.status(403).json({ message: "Добавление доступно только после входа" });
    }

    const { name, price, count, hero } = req.body;
    const products = getFileData<Product>(productsPath);

    const newProduct: Product = {
        id: Date.now(),
        name: String(name),
        price: Number(price),
        count: Number(count),
        hero: hero ? String(hero) : undefined
    };

    products.push(newProduct);
    fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
    
    res.status(201).json({ message: "Товар добавлен!", product: newProduct });
});

export default router;