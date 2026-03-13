import express from 'express'
import router from "./router/router.ts"

const PORT = 5000;

const app = express()

app.use(express.json())
app.use(router)

app.listen(PORT, () => console.log("SERVER STARTED ON PORT " + PORT))