import Router from 'express'
import registerUser from '../controllers/users/usersController.ts'
const router = Router()

router.post('/registration', async (req, res) => {
  registerUser(req,res);
});


router.get('/', (req, res) => {
    res.status(200).json({ message: 'Успех!' });
});

export default router;