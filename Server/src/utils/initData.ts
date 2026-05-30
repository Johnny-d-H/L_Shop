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
    tags?: string[];
}

const dataDir = path.join(__dirname, '..', 'data');

function ensureDataFiles() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const files = [
        { name: 'users.json', data: [] },
        { name: 'products.json', data: [] },
        { name: 'reviews.json', data: [] },
        { name: 'purchases.json', data: [] },
        { name: 'carts.json', data: [] },
        { name: 'userLikes.json', data: [] }
    ];

    files.forEach(({ name, data }) => {
        const filePath = path.join(dataDir, name);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`✓ Created ${name}`);
        }
    });
}

export { ensureDataFiles };
