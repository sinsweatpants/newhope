import { Router } from 'express';
import admin from 'firebase-admin';

const router = Router();

router.post('/register', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).send({ message: 'Token is required' });
  }

  try {
    // Here you would typically save the token to a database
    // associated with a user. For this example, we'll just log it.
    console.log(`Received token: ${token}`);
    res.status(200).send({ message: 'Token registered successfully' });
  } catch (error) {
    console.error('Error registering token:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

export const notificationsRouter = router;
