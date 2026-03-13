import Router from 'express'
import auth from '../controllers/users/usersController.ts'     
const router = Router()

router.post('/registration', async (req, res) => {
  auth.registerUser(req,res);
});
router.post('/login', async (req, res) => {
  auth.loginUser(req,res);
});

router.get('/', (req, res) => {
    res.status(200).json({ message: 'Успех!' });
});

export default router;