import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 1️⃣ Routes API
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

// 2️⃣ Servir le frontend build
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

// 3️⃣ Toutes les autres routes renvoient index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// 4️⃣ Port
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
