import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from "mysql2/promise";

import { ResultSetHeader, RowDataPacket } from "mysql2/promise";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
    host: process.env.DB_HOST || "nozomi.proxy.rlwy.net",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "ZJSOiwrLEsrtuQVoKfhuiwSdiiPGiZet",
    database: process.env.DB_NAME || "railway",
};
interface Location extends mysql.RowDataPacket {
    id: number;
    name: string;
    city: string;
    code: string;
    country: string;
}
app.get('/api/hello', (req: Request, res: Response) => {
  res.json({ message: 'Hello from backend!' });
});

// Routes pour les localisations


app.get("/api/locations", async (req: Request, res: Response) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [allRows] = await connection.execute<Location[]>("SELECT * FROM locations");
    await connection.end();
    res.json(allRows);
  } catch (err) {
    console.error("Errewur MySQL:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});



const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
