import type { Request, Response } from 'express';
import fs from 'fs/promises';

class User {
  id: number;
  name: string;
  password: string;
  email?: string;
  phone?: string;

  constructor(id: number, name: string, password: string) {
    this.id = id;
    this.name = name;
    this.password = password;
  }
}

const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({
        error: 'Неверные данные',
        message: 'Имя и пароль обязательны для регистрации'
      });
    }

    const rawUsers = await fs.readFile('../database/users.json', 'utf8');
    const users: User[] = JSON.parse(rawUsers);

    if (users.some(user => user.name === name)) {
      return res.status(400).json({
        error: 'Неверные данные',
        message: 'Пользователь с таким именем уже существует.'
      });
    }

    const newId = users.length > 0 ? users[users.length - 1].id + 1 : 0;
    const newUser = new User(newId, name, password);

    users.push(newUser);

    await fs.writeFile('../database/users.json', JSON.stringify(users, null, 2));

    res.status(200).json('Успех!');
  } 
  catch (e: unknown) {
    if (e instanceof Error) {
        return res.status(500).json({ error: e.message });
    }
    return res.status(500).json({ error: 'Неизвестная ошибка' });
}
};

export default registerUser;
