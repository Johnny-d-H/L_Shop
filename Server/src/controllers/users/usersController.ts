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
      return res.status(409).json({
        error: 'Неверные данные',
        message: 'Имя и пароль обязательны для регистрации'
      });
    }

    const rawUsers = await fs.readFile('../database/users.json', 'utf8');
    const users: User[] = JSON.parse(rawUsers);

    if (users.some(user => user.name === name)) {
      return res.status(409).json({
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

const loginUser = async (req: Request, res: Response) => {
  try{
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(409).json({
        error: 'Неверные данные',
        message: 'Логин и пароль обязательны для авторизации'
      });
    }
    const rawUsers = await fs.readFile('../database/users.json', 'utf8');
    const users: User[] = JSON.parse(rawUsers);
    
    const user = users.find((u) => u.name === name && u.password === password);
    if(!user){
      return res.status(409).json({
        error: 'Неверные данные',
        message: 'Неверный логин или пароль'
      });
    }
    (req.session as unknown as Record<string, unknown>)['user'] = {
      id: user.id,
      name: user.name
    };
    return res.status(200).json({
      message: 'Успешная авторизация',
      user: { id: user.id, name: user.name }
    });
  }
  catch (e: unknown) {
    if (e instanceof Error) {
        return res.status(500).json({ error: e.message });
    }
    return res.status(500).json({ error: 'Неизвестная ошибка' });
  }
}
const isAutorized = async (req: Request, res: Response) =>
{
  if (!req.session || !('user' in req.session)) {
    return res.status(401).json({
      error: 'Неавторизован',
      message: 'Требуется авторизация для доступа к этому ресурсу'
      });
    }
    if (!req.session.user) {
      return res.status(401).json({
        error: 'Неавторизован',
        message: 'Требуется авторизация для доступа к этому ресурсу'
      });
    }
    res.status(200).json({ message: 'Успех!' });
}
const authControllers = {
  registerUser,
  loginUser,
  isAutorized
};

export default authControllers;
