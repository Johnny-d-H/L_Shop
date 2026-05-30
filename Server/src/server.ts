import express from 'express';
import session from 'express-session';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger';
import router from './routes/router';
import path from 'path';

const app = express();
const PORT = 5000;

app.use(session({
    secret: 'chernushin-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 600000 }
}));

app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const publicPath = path.resolve(__dirname, '../public');
app.use(express.static(publicPath));

app.use('/api', router);

app.get('*', (req, res) => {
    if (!req.url.startsWith('/api')) {
        res.sendFile(path.join(publicPath, 'index.html'));
    }
});

app.listen(PORT, () => {
    console.log(`Server on port ${PORT}`);
    console.log(`Website: http://localhost:${PORT}`);
});