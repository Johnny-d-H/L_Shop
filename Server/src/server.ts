import express from 'express'
import router from "./router/router.ts"
import session from 'express-session'

const PORT = 5000;

const app = express()

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', 
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000
  }
}));
app.use(express.json())
app.use(router)

app.listen(PORT, () => console.log("SERVER STARTED ON PORT " + PORT))