import express, { Application, Request, Response } from 'express';

const app: Application = express();
const PORT = 3000;

app.use(express.json()); 

app.get('/', (req: Request, res: Response) => {
    res.send('L_Shop Server is running!');
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});