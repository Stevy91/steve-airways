import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// -------------------
// Routes API
// -------------------
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

// Autres routes API possibles
// app.get('/api/users', (req, res) => { ... })

// -------------------
// Port Railway
// -------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
