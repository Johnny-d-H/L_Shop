import express from 'express';
import session from 'express-session';
import router from './routes/router';

const app = express();
const PORT = 5000;

app.use(session({
  secret: 'chernushin-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 600000 }
}));

app.use(express.json());
app.use('/api', router);

app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));