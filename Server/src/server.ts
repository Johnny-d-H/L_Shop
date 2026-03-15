import express from 'express';
import session from 'express-session';
import router from './routes/router';
import path from 'path';

const app = express();
const PORT = 5000;

// 1. Настройка сессий
app.use(session({
  secret: 'chernushin-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 600000 }
}));

app.use(express.json());

// 2. Указываем путь к папке public
// Используем resolve, чтобы путь всегда был абсолютным и точным
const publicPath = path.resolve(__dirname, '../public');
app.use(express.static(publicPath));

// 3. Твои API роуты
app.use('/api', router);

// 4. ДОБАВЬ ЭТО: Явный проброс index.html для главной страницы
// Если статика не сработала сама, этот код принудительно отдаст главную страницу
app.get('*', (req, res) => {
    // Если запрос не к API, отдаем наш фронт
    if (!req.url.startsWith('/api')) {
        res.sendFile(path.join(publicPath, 'index.html'));
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server on port ${PORT}`);
    console.log(`🏠 Website: http://localhost:${PORT}`);
});