import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql, { Pool } from 'mysql2/promise';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuration MySQL

const pool = mysql.createPool({
  host: 'nozomi.proxy.rlwy.net',
  user: 'root',
  password: 'ZJSOiwrLEsrtuQVoKfhuiwSdiiPGiZet',
  database: 'railway',
  port: 20921,          // Important : port spécifique fourni par Railway
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
// Création d'un pool de connexions


// Interface pour typage des locations
interface Location extends mysql.RowDataPacket {
    id: number;
    name: string;
    city: string;
    code: string;
    country: string;
}

// Endpoint de test
app.get('/api/hello', (req: Request, res: Response) => {
  res.json({ message: 'Hello from backend!' });
});

// Endpoint pour récupérer les locations
app.get('/api/locations', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<Location[]>("SELECT * FROM locations");
    res.json(rows);
  } catch (err) {
    console.error("Erreur MySQL:", err); // Affiche l'erreur complète
    res.status(500).json({ error: "Erreur serveur" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
