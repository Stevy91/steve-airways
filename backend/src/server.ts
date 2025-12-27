import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';


import mysql, { Pool } from 'mysql2/promise';
import http from "http";
import { Server } from "socket.io";



import { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import Stripe from "stripe";
import paypal from "@paypal/checkout-server-sdk";
import nodemailer from "nodemailer";
import { OkPacket } from "mysql2";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { COUNTRIES } from "./constants/country";

dotenv.config();

const app = express();
const server = http.createServer(app);
// Création du serveur Socket.IO
export const io = new Server(server, {
  cors: {
    origin: "*", // ou ton domaine frontend
    methods: ["GET", "POST"],
  },
});
app.use(cors());
app.use(express.json());



// Configuration MySQL
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: process.env.STRIPE_API_VERSION as any,
});

const pool = mysql.createPool({
  host: 'srv1387.hstgr.io',
  user: 'u566035799_trogonAirWays',
  password: '2024Mapbon@',
  database: 'u566035799_trogon',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z', // 🔹 Utiliser UTC
  dateStrings: true,
  charset: 'utf8mb4',
});




// Interface pour typage des locations
interface Flight extends mysql.RowDataPacket {
  id: number | string;
  departure_location_id: number;
  arrival_location_id: number;
  departure_time: Date;
  arrival_time: Date;
  price: number;
  type: string;
  flight_number?: string;

  airline: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;

  seats_available: string;
}



// types/dashboard.ts
export interface Booking {
  id: number;
  booking_reference: string;
  total_price: number;
  status: string;
  created_at: string;
  passenger_count: number;
  contact_email: string;
  type_vol: "plane" | "helicopter";
  type_v: "onway" | "roundtrip";
  created_by_name?: string;  // NOUVEAU CHAMP
  created_by_email?: string; // NOUVEAU CHAMP
}

export interface Flights {
  id: number;
  type: "plane" | "helicopter";
  departure_time: string;
  price: number;
  seats_available: number;
}

export interface DashboardStats {
  totalRevenue: number;
  totalBookings: number;
  flightsAvailable: number;
  averageBookingValue: number;
  bookingsByStatus: { name: string; value: number }[];
  revenueByMonth: { name: string; total: number }[];
  bookingsByFlightType: { name: string; value: number }[];
  recentBookings: Booking[];
}

export interface BookingStats {
  recentBookings: Booking[];
}
interface Location extends mysql.RowDataPacket {
  id: number;
  name: string;
  city: string;
  code: string;
  country: string;
}

interface Passenger extends mysql.RowDataPacket {
  id: number;
  booking_id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  date_of_birth: Date;

  created_at: Date;
  typeVol: "plane" | "helicopter";
  typeVolV: "oneway" | "roundtrip";
}

interface Payment extends mysql.RowDataPacket {
  id: number;
  booking_id: number;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  created_at: Date;
}

interface Flight {
  id: number | string;
  price: number;
  seat: number;
}

interface Passenger {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // Préférez un nom de champ cohérent (soit dob soit dateOfBirth)
  type: "adult" | "child" | "infant";
  typeVol: "plane" | "helicopter";

  // Champs optionnels regroupés
  personalDetails?: {
    middleName?: string;
    gender?: "male" | "female" | "other";
    title?: "mr" | "mrs" | "ms" | "dr";
  };

  contactDetails?: {
    email?: string;
    phone?: string;
    address?: string;
  };

  nationalityDetails?: {
    country?: string;
    nationality?: string;
  };

  flightDetails?: {
    typeVol?: "plane" | "helicopter"; // Plus explicite que typeVol seul
  };
}

interface ContactInfo {
  email: string;
  phone: string;
  // Ajout possible :
  notificationPreferences?: {
    sms?: boolean;
    email?: boolean;
  };
}


// Endpoint de test
app.get('/api/hello', (req: Request, res: Response) => {
  res.json({ message: 'Hello from backend!' });
});

function getCountryName(code: string): string | null {
  const country = COUNTRIES.find((c) => c.code === code.toLowerCase());
  return country ? country.name : null;
}
// Routes pour les vols
app.get("/api/flightall", async (req: Request, res: Response) => {
  try {

    const [rows] = await pool.query<Flight[]>("SELECT * FROM flights");

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/api/flights", async (req: Request, res: Response) => {
  try {
    const { from, to, date, tab: type } = req.query as {
      from: string;
      to: string;
      date: string;
      tab: string;
    };

    // Validation des paramètres
    if (!from || !to || !date || !type) {
      return res.status(400).json({
        error: "Paramètres manquants",
        required: ["from", "to", "date", "tab"],
        received: { from, to, date, type },
      });
    }

    const validTypes = ["plane", "helicopter"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: "Type invalide",
        validTypes,
        received: type,
      });
    }

    // Vérification des aéroports
    const [departureAirport] = await pool.query(
      "SELECT id FROM locations WHERE code = ?",
      [from]
    );
    const [arrivalAirport] = await pool.query(
      "SELECT id FROM locations WHERE code = ?",
      [to]
    );

    if ((departureAirport as any[]).length === 0 || (arrivalAirport as any[]).length === 0) {
      return res.status(404).json({ error: "Aéroport non trouvé" });
    }

    // Plage horaire : toujours toute la journée
    const startOfDay = `${date} 00:00:00`;
    const endOfDay = `${date} 23:59:59`;

    // Requête principale pour les vols aller
    const [flights] = await pool.query(
      `SELECT f.*, dep.code as departure_code, arr.code as arrival_code
       FROM flights f
       JOIN locations dep ON f.departure_location_id = dep.id
       JOIN locations arr ON f.arrival_location_id = arr.id
       WHERE dep.code = ? 
         AND arr.code = ? 
         AND f.type = ? 
         AND f.departure_time BETWEEN ? AND ?
       ORDER BY f.departure_time`,
      [from, to, type, startOfDay, endOfDay]
    );

    // Vols retour si return_date présent
    if (req.query.return_date) {
      const returnDate = req.query.return_date as string;
      const startReturn = `${returnDate} 00:00:00`;
      const endReturn = `${returnDate} 23:59:59`;

      const [returnFlights] = await pool.query(
        `SELECT f.*, dep.code as departure_code, arr.code as arrival_code
         FROM flights f
         JOIN locations dep ON f.departure_location_id = dep.id
         JOIN locations arr ON f.arrival_location_id = arr.id
         WHERE dep.code = ? 
           AND arr.code = ? 
           AND f.type = ? 
           AND f.departure_time BETWEEN ? AND ?
         ORDER BY f.departure_time`,
        [to, from, type, startReturn, endReturn]
      );

      return res.json({
        outbound: flights,
        return: returnFlights,
      });
    }

    // Si pas de retour, on renvoie seulement les vols aller
    res.json(flights);
  } catch (err) {
    console.error("Erreur:", err);
    res.status(500).json({
      error: "Erreur serveur",
      details: err instanceof Error ? err.message : String(err),
    });
  }
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


export function getErrorDetails(error: unknown): {
  message: string;
  details?: string;
  stack?: string;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }
  return {
    message: typeof error === "string" ? error : "Erreur inconnue",
  };
}
function generateBookingRef(): string {
  return `BOOK-${Math.floor(100000 + Math.random() * 900000)}`;
}


app.post("/api/create-payment-intent", async (req: Request, res: Response) => {

  try {
    // 1. Validation renforcée
    const { flightId, returnFlightId, passengerCount, email } = req.body;

    if (!flightId || !passengerCount || !email) {
      return res.status(400).json({
        error: "Paramètres manquants",
        details: {
          received: req.body,
          required: ["flightId", "passengerCount", "email"],
        },
      });
    }

    // 2. Préparation des IDs pour la requête
    const flightIds = [flightId];
    if (returnFlightId) flightIds.push(returnFlightId);

    // ✅ CORRECTION IMPORTANTE ICI : pour éviter [ [1, 2] ] au lieu de [1, 2]
    const placeholders = flightIds.map(() => "?").join(",");
    const [flights] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT id, price, seats_available FROM flights WHERE id IN (${placeholders})`,
      flightIds,
    );

    // 3. Récupération des vols
    const outboundFlight = flights.find((f) => f.id === flightId);
    if (!outboundFlight) {
      return res.status(404).json({ error: "Outbound flight not found", flightId });
    }

    let returnFlight = null;
    if (returnFlightId) {
      returnFlight = flights.find((f) => f.id === returnFlightId);
      if (!returnFlight) {
        return res.status(404).json({ error: "Return flight not found", returnFlightId });
      }
    }

    // 4. Vérification de la capacité
    if (outboundFlight.seats_available < passengerCount) {
      return res.status(400).json({
        error: "Insufficient capacity for the outbound flight",
        available: outboundFlight.seats_available,
        requested: passengerCount,
      });
    }

    if (returnFlight && returnFlight.seats_available < passengerCount) {
      return res.status(400).json({
        error: "Insufficient capacity for return flight",
        available: returnFlight.seats_available,
        requested: passengerCount,
      });
    }

    // 5. Calcul du montant total pour Stripe
    const totalAmount = outboundFlight.price * passengerCount + (returnFlight ? returnFlight.price * passengerCount : 0);

    // 6. Création du PaymentIntent Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // en centimes
      currency: "usd",
      metadata: {
        flightId: flightId.toString(),
        returnFlightId: returnFlightId?.toString() || "none",
        passengerCount: passengerCount.toString(),
      },
      receipt_email: email,
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      amount: totalAmount,
      currency: "usd",
    });
  } catch (error) {
    console.error("Erreur détaillée:", {
      error,
      requestBody: req.body,
    });

    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    res.status(500).json({
      error: "Payment creation failed",
      details: errorMessage,
    });
  }
});
function formatDateToSQL(date?: string | Date | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null; // invalide → null
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}





// Récupérer les passagers d’un vol
app.get("/api/flights/:flightId/passengers", async (req, res) => {
  const { flightId } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT 
          p.id,
          p.first_name,
          p.last_name,
          p.email,
          p.phone,
          b.created_at AS booking_date,
          CASE 
            WHEN b.flight_id = ? THEN 'outbound'
            WHEN b.return_flight_id = ? THEN 'return'
          END AS segment
       FROM passengers p
       INNER JOIN bookings b ON p.booking_id = b.id
       WHERE b.flight_id = ? OR b.return_flight_id = ?`,
      [flightId, flightId, flightId, flightId]
    );

    res.json(rows);
  } catch (err) {
    console.error("❌ Erreur récupération passagers:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Dans votre backend - route de test
app.get("/api/flights-debug", async (req: Request, res: Response) => {
  try {
    const { from, to, date, tab: type } = req.query;

    const [flightsResult] = await pool.query(
      `SELECT 
        f.*,
        DATE(CONVERT_TZ(f.departure_time, '+00:00', '-04:00')) as date_haiti,
        TIME(CONVERT_TZ(f.departure_time, '+00:00', '-04:00')) as time_haiti,
        CONVERT_TZ(f.departure_time, '+00:00', '-04:00') as full_dt_haiti
       FROM flights f
       JOIN locations dep ON f.departure_location_id = dep.id
       JOIN locations arr ON f.arrival_location_id = arr.id
       WHERE dep.code = ? 
         AND arr.code = ? 
         AND f.type = ? 
         AND DATE(CONVERT_TZ(f.departure_time, '+00:00', '-04:00')) = ?
       ORDER BY f.departure_time`,
      [from, to, type, date]
    );
    const flights = flightsResult as mysql.RowDataPacket[];

    const now = new Date();
    const nowHaiti = new Date(now.toLocaleString("en-US", { timeZone: "America/Port-au-Prince" }));

    res.json({
      debug_info: {
        requête: { from, to, date, type },
        heure_actuelle: {
          utc: now,
          haiti: nowHaiti,
          haiti_local: nowHaiti.toLocaleString("fr-FR")
        },
        nombre_vols: flights.length
      },
      flights: flights
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Erreur inconnue" });
  }
});

app.post("/api/confirm-booking", async (req: Request, res: Response) => {

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Validation complète des données
    const requiredFields = ["paymentIntentId", "passengers", "contactInfo", "flightId", "totalPrice"];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    const { paymentIntentId, passengers, contactInfo, flightId, totalPrice, returnFlightId, departureDate, returnDate, paymentMethod = "card", } = req.body;
    const typeVol = passengers[0]?.typeVol || "plane";
    const typeVolV = passengers[0]?.typeVolV || "onway";

    // 2. Vérification Stripe
    if (!paymentIntentId.startsWith("pi_")) {
      throw new Error("Format PaymentIntent ID invalide");
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== "succeeded") {
      throw new Error("Payment not confirmed");
    }

    // 3. Validation des passagers
    if (!Array.isArray(passengers) || passengers.length === 0) {
      throw new Error("Invalid passenger list");
    }

    passengers.forEach((passenger, index) => {
      if (!passenger.firstName || !passenger.lastName) {
        throw new Error(`Passager ${index + 1}: Full name required`);
      }
      if (!passenger.type) {
        throw new Error(`Passager ${index + 1}: Type manquant (Adult/Child/Infant)`);
      }
    });

    // 4. Vérification des vols
    const flightIds = returnFlightId ? [flightId, returnFlightId] : [flightId];
    const [flights] = await connection.query<mysql.RowDataPacket[]>("SELECT id, seats_available FROM flights WHERE id IN (?) FOR UPDATE", [
      flightIds,
    ]);


    if (flights.length !== flightIds.length) {
      throw new Error("One or more flights missing");
    }

    for (const flight of flights) {
      if (flight.seats_available < passengers.length) {
        throw new Error(`Not enough seats available for the flight ${flight.id}`);
      }
    }


    if (flights.length !== flightIds.length) {
      throw new Error("One or more flights missing");
    }



    // 5. Création de la réservation
    const now = new Date();
    const bookingReference = `BOOK-${Math.floor(100000 + Math.random() * 900000)}`;

    const [bookingResult] = await connection.query<mysql.OkPacket>(
      `INSERT INTO bookings (
                flight_id, payment_intent_id,
                total_price, contact_email, contact_phone,
                status, type_vol, type_v, guest_user, guest_email,
                created_at, updated_at, departure_date,
                return_date, passenger_count, booking_reference, return_flight_id, payment_method
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        flightId,
        paymentIntentId,
        totalPrice,
        contactInfo.email,
        contactInfo.phone,
        "confirmed",
        typeVol,
        typeVolV,
        1,
        contactInfo.email,
        now,
        now,
        departureDate || null,
        returnDate || null,
        passengers.length,
        bookingReference,
        returnFlightId || null,
        paymentMethod,
      ],
    );

    // 6. Insertion des passagers avec gestion d'erreur
    for (const passenger of passengers) {
      console.log("Inserting passenger:", {
        firstName: passenger.firstName,
        lastName: passenger.lastName,
        type: passenger.type,
        // Ajoutez d'autres champs pertinents
      });
      try {
        await connection.query(
          `INSERT INTO passengers (
                        booking_id, first_name, middle_name, last_name,
                        date_of_birth, gender, title, address, type,
                        type_vol, type_v, country, nationality,
                        phone, email, nom_urgence, email_urgence, tel_urgence created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            bookingResult.insertId,
            passenger.firstName,
            passenger.middleName || null,
            passenger.lastName,
            passenger.dateOfBirth || null,
            passenger.gender || "other",
            passenger.title || "Mr",
            passenger.address || null,
            passenger.type,
            passenger.typeVol || "plane",
            passenger.typeVolV || "onway",
            getCountryName(passenger.country) || passenger.country,
            passenger.nationality || null,
            passenger.phone || contactInfo.phone,
            passenger.email || contactInfo.email,
            passenger.nom_urgence || null,
            passenger.email_urgence || null,
            passenger.tel_urgence || null,
            now,
            now,
          ],
        );
      } catch (passengerError) {
        console.error("Erreur insertion passager:", passengerError);
        throw new Error(`Échec création passager: ${passenger.firstName} ${passenger.lastName}`);
      }
    }

    // 5. Mise à jour des sièges pour tous les vols concernés
    for (const flight of flights) {
      await connection.execute("UPDATE flights SET seats_available = seats_available - ? WHERE id = ?", [passengers.length, flight.id]);
    }

    await connection.query(
      `INSERT INTO notifications (type, message, booking_id, seen, created_at)
        VALUES (?, ?, ?, ?, ?)`,
      [
        "booking",
        ` ${bookingReference} avec ${passengers.length} passager(s).`,
        bookingResult.insertId,
        false,
        now,
      ]
    );
    // Envoyer la notif au front
    io.emit("new-notification", {
      message: ` ${bookingReference} avec ${passengers.length} passager(s).`,
      bookingId: bookingResult.insertId,
      createdAt: now,
    });

    await connection.commit();


    res.json({
      success: true,
      bookingId: bookingResult.insertId,
      bookingReference,
      passengerCount: passengers.length,
    });
  } catch (error: unknown) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error("Échec rollback:", rollbackError);
    }

    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("Erreur réservation:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
    });

    res.status(500).json({
      error: "Reservation failed",
      details: process.env.NODE_ENV !== "production" ? errorMessage : undefined,
      reference: Date.now().toString(36),
    });
  } finally {
    try {
      connection.release();
    } catch (releaseError) {
      console.error("Échec libération connexion:", releaseError);
    }
  }
});

app.post("/api/confirm-booking-paylater", async (req: Request, res: Response) => {

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();



    const { paymentMethod, paymentIntentId, passengers, contactInfo, flightId, totalPrice, returnFlightId, departureDate, returnDate } = req.body;
    const typeVol = passengers[0]?.typeVol || "plane";
    const typeVolV = passengers[0]?.typeVolV || "onway";
    const requiredFields = ["passengers", "contactInfo", "flightId", "totalPrice"];
    if (paymentMethod !== "paylater") {
      requiredFields.push("paymentIntentId");
    }

    for (const field of requiredFields) {
      if (!req.body[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // 3. Validation des passagers
    if (!Array.isArray(passengers) || passengers.length === 0) {
      throw new Error("Invalid passenger list");
    }

    passengers.forEach((passenger, index) => {
      if (!passenger.firstName || !passenger.lastName) {
        throw new Error(`Passager ${index + 1}: Full name required`);
      }
      if (!passenger.type) {
        throw new Error(`Passager ${index + 1}: Type manquant (Adult/Child/Infant)`);
      }
    });

    // 4. Vérification des vols


    const flightIds = returnFlightId ? [flightId, returnFlightId] : [flightId];
    const [flights] = await connection.query<mysql.RowDataPacket[]>("SELECT id, seats_available FROM flights WHERE id IN (?) FOR UPDATE", [
      flightIds,
    ]);


    if (flights.length !== flightIds.length) {
      throw new Error("One or more flights missing");
    }

    for (const flight of flights) {
      if (flight.seats_available < passengers.length) {
        throw new Error(`Not enough seats available for the flight ${flight.id}`);
      }
    }


    if (flights.length !== flightIds.length) {
      throw new Error("One or more flights missing");
    }

    // 5. Création de la réservation
    const now = new Date();
    const bookingReference = `BOOK-${Math.floor(100000 + Math.random() * 900000)}`;

    const [bookingResult] = await connection.query<mysql.OkPacket>(
      `INSERT INTO bookings (
                flight_id, payment_intent_id,
                total_price, contact_email, contact_phone,
                status, type_vol, type_v, guest_user, guest_email,
                created_at, updated_at, departure_date,
                return_date, passenger_count, booking_reference, return_flight_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        flightId,
        paymentIntentId,
        totalPrice,
        contactInfo.email,
        contactInfo.phone,
        "pending",
        typeVol,
        typeVolV,
        1,
        contactInfo.email,
        now,
        now,
        departureDate || null,
        returnDate || null,
        passengers.length,
        bookingReference,
        returnFlightId || null,
      ],
    );

    // 6. Insertion des passagers avec gestion d'erreur
    for (const passenger of passengers) {
      console.log("Inserting passenger:", {
        firstName: passenger.firstName,
        lastName: passenger.lastName,
        type: passenger.type,
        // Ajoutez d'autres champs pertinents
      });
      try {
        await connection.query(
          `INSERT INTO passengers (
                        booking_id, first_name, middle_name, last_name,
                        date_of_birth, gender, title, address, type,
                        type_vol, type_v, country, nationality,
                        phone, email, nom_urgence, email_urgence, tel_urgence, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            bookingResult.insertId,
            passenger.firstName,
            passenger.middleName || null,
            passenger.lastName,
            passenger.dateOfBirth || null,
            passenger.gender || "other",
            passenger.title || "Mr",
            passenger.address || null,
            passenger.type,
            passenger.typeVol || "plane",
            passenger.typeVolV || "onway",
            getCountryName(passenger.country) || passenger.country,
            passenger.nationality || null,
            passenger.phone || contactInfo.phone,
            passenger.email || contactInfo.email,
            passenger.nom_urgence || null,
            passenger.email_urgence || null,
            passenger.tel_urgence || null,
            now,
            now,
          ],
        );
      } catch (passengerError) {
        console.error("Erreur insertion passager:", passengerError);
        throw new Error(`Failed temporary creation: ${passenger.firstName} ${passenger.lastName}`);
      }
    }

    // 5. Mise à jour des sièges pour tous les vols concernés
    for (const flight of flights) {
      await connection.execute("UPDATE flights SET seats_available = seats_available - ? WHERE id = ?", [passengers.length, flight.id]);
    }
    await connection.query(
      `INSERT INTO notifications (type, message, booking_id, seen, created_at)
        VALUES (?, ?, ?, ?, ?)`,
      [
        "booking",
        ` ${bookingReference} avec ${passengers.length} passager(s).`,
        bookingResult.insertId,
        false,
        now,
      ]
    );
    // Envoyer la notif au front
    io.emit("new-notification", {
      message: `${bookingReference} avec ${passengers.length} passager(s).`,
      bookingId: bookingResult.insertId,
      createdAt: now,
    });

    await connection.commit();

    res.json({
      success: true,
      bookingId: bookingResult.insertId,
      bookingReference,
      passengerCount: passengers.length,
    });
  } catch (error: unknown) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error("Échec rollback:", rollbackError);
    }

    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("Erreur réservation:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
    });

    res.status(500).json({
      error: "Reservation failed",
      details: process.env.NODE_ENV !== "production" ? errorMessage : undefined,
      reference: Date.now().toString(36),
    });
  } finally {
    try {
      connection.release();
    } catch (releaseError) {
      console.error("Échec libération connexion:", releaseError);
    }
  }
});
// POST /api/verify-flight
app.post("/api/verify-flight", async (req: Request, res: Response) => {
  const connection = await pool.getConnection();
  try {
    const { flightId, returnFlightId } = req.body as { flightId: number; returnFlightId?: number };

    if (!flightId) return res.status(400).json({ error: "flightId manquant" });

    // Vérifie le vol aller
    const [outboundFlights] = await connection.query<mysql.RowDataPacket[]>("SELECT seats_available FROM flights WHERE id = ?", [flightId]);
    if (!outboundFlights.length) return res.status(404).json({ error: "Outbound flight not found" });
    if (outboundFlights[0].seats_available <= 0) return res.status(400).json({ error: "No seat available on the outbound flight" });

    // Vérifie le vol retour si nécessaire
    if (returnFlightId) {
      const [returnFlights] = await connection.query<mysql.RowDataPacket[]>("SELECT seats_available FROM flights WHERE id = ?", [returnFlightId]);
      if (!returnFlights.length) return res.status(404).json({ error: "Return flight not found" });
      if (returnFlights[0].seats_available <= 0) return res.status(400).json({ error: "No seat available on the return flight" });
    }

    res.json({ valid: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});


app.get("/api/notifications", async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20"
    );
    res.json({ success: true, notifications: rows });
  } catch (error) {
    console.error("Erreur récupération notifications:", error);
    res.status(500).json({ success: false, error: "Impossible de récupérer les notifications" });
  }
});



app.patch("/api/notifications/:id/seen", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query(
      "UPDATE notifications SET seen = TRUE, read_at = NOW() WHERE id = ?",
      [id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Erreur mise à jour notification:", error);
    res.status(500).json({ success: false, error: "Impossible de mettre à jour la notification" });
  }
});

app.delete("/api/notifications/cleanup", async (req: Request, res: Response) => {
  try {
    await pool.query(
      "DELETE FROM notifications WHERE seen = TRUE AND read_at < DATE_SUB(NOW(), INTERVAL 2 DAY)"
    );
    res.json({ success: true, message: "Notifications nettoyées" });
  } catch (error) {
    console.error("Erreur nettoyage notifications:", error);
    res.status(500).json({ success: false, error: "Impossible de nettoyer les notifications" });
  }
});


//--------------------------------------------------dashboard-----------------------------------------

interface FlightWithAirports extends mysql.RowDataPacket {
  id: number;
  flight_number: string;
  type: "plane" | "helicopter";
  airline: string;
  departure_time: Date;
  arrival_time: Date;
  price: number;
  seats_available: number;
  departure_airport_name: string;
  departure_city: string;
  departure_code: string;
  arrival_airport_name: string;
  arrival_city: string;
  arrival_code: string;
}
interface User extends mysql.RowDataPacket {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  phone?: string | null;
  created_at: Date;
}


//-------------------------user------------------------------------------------------

// app.post("/api/create-ticket", authMiddleware, async (req: any, res: Response) => {
//   const connection = await pool.getConnection();
//   const userId = req.user.id; // Récupérer l'ID de l'utilisateur connecté

//   try {
//     await connection.beginTransaction();
//     console.log("✅ Transaction started");

//     const requiredFields = ["flightId", "passengers", "contactInfo", "totalPrice"];
//     for (const field of requiredFields) {
//       if (!req.body[field]) {
//         console.error(`Missing field: ${field}`);
//         throw new Error(`Missing required field: ${field}`);
//       }
//     }

//     const {
//       flightId,
//       passengers,
//       contactInfo,
//       totalPrice,
//       referenceNumber,
//       unpaid,
//       returnFlightId,
//       departureDate,
//       returnDate,
//       paymentMethod = "card",
//     } = req.body;

//     const typeVol = passengers[0]?.typeVol || "plane";
//     const typeVolV = passengers[0]?.typeVolV || "onway";

//     // Vérifier les vols
//     const flightIds = returnFlightId ? [flightId, returnFlightId] : [flightId];
//     const [flightsRows] = await connection.query<mysql.RowDataPacket[]>(
//       "SELECT id, seats_available FROM flights WHERE id IN (?) FOR UPDATE",
//       [flightIds],
//     );

//     const flights = flightsRows as mysql.RowDataPacket[];

//     if (flights.length !== flightIds.length) {
//       throw new Error("One or more flights not found");
//     }

//     for (const flight of flights) {
//       if (flight.seats_available < passengers.length) {
//         throw new Error(`Not enough seats available for flight ${flight.id}`);
//       }
//     }

//     // Création réservation - AJOUT du champ user_created_booking
//     const now = new Date();
//     const bookingReference = `TICKET-${Math.floor(100000 + Math.random() * 900000)}`;

//     const depDate = formatDateToSQL(departureDate);
//     const retDate = formatDateToSQL(returnDate);

//     const [bookingResultRows] = await connection.query<mysql.OkPacket>(
//       `INSERT INTO bookings (
//           flight_id, payment_intent_id, total_price,
//           contact_email, contact_phone, status,
//           type_vol, type_v, guest_user, guest_email,
//           created_at, updated_at, departure_date,
//           return_date, passenger_count, booking_reference, return_flight_id,
//           payment_method, user_created_booking
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, // Ajout d'un ? supplémentaire
//       [
//         flightId,
//         referenceNumber,
//         totalPrice,
//         contactInfo.email,
//         contactInfo.phone,
//         unpaid || "confirmed",
//         typeVol,
//         typeVolV,
//         1,
//         contactInfo.email,
//         now,
//         now,
//         depDate,
//         retDate,
//         passengers.length,
//         bookingReference,
//         returnFlightId || null,
//         paymentMethod,
//         userId,
//       ],
//     );

//     const bookingResult = bookingResultRows as mysql.OkPacket;

//     // Enregistrer les passagers (reste identique)
//     for (const passenger of passengers) {
//       await connection.query(
//         `INSERT INTO passengers (
//           booking_id, first_name, middle_name, last_name,
//           date_of_birth, gender, title, address, type,
//           type_vol, type_v, country, nationality,
//           phone, email, nom_urgence, email_urgence, tel_urgence, created_at, updated_at
//         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           bookingResult.insertId,
//           passenger.firstName,
//           passenger.middleName || null,
//           passenger.lastName,
//           passenger.dateOfBirth || null,
//           passenger.gender || "other",
//           passenger.title || "Mr",
//           passenger.address || null,
//           passenger.type,
//           passenger.typeVol || "plane",
//           passenger.typeVolV || "onway",
//           passenger.country,
//           passenger.nationality || null,
//           passenger.phone || contactInfo.phone,
//           passenger.email || contactInfo.email,
//           passenger.nom_urgence || null,
//           passenger.email_urgence || null,
//           passenger.tel_urgence || null,
//           now,
//           now,
//         ],
//       );
//     }

//     // Mise à jour des sièges (reste identique)
//     for (const flight of flights) {
//       await connection.execute(
//         "UPDATE flights SET seats_available = seats_available - ? WHERE id = ?",
//         [passengers.length, flight.id],
//       );
//     }

//     // Notification (reste identique)
//     try {
//       await connection.query(
//         `INSERT INTO notifications (type, message, booking_id, seen, created_at)
//          VALUES (?, ?, ?, ?, ?)`,
//         [
//           "ticket",
//           `Création d'un ticket ${bookingReference} (${passengers.length} passager(s)).`,
//           bookingResult.insertId,
//           false,
//           now,
//         ],
//       );

//       io.emit("new-notification", {
//         message: `Création d'un ticket ${bookingReference} (${passengers.length} passager(s)).`,
//         bookingId: bookingResult.insertId,
//         createdAt: now,
//       });
//     } catch (notifyErr) {
//       console.error("⚠️ Notification error (non bloquant):", notifyErr);
//     }

//     // Commit final
//     await connection.commit();

//     // ✅ Réponse succès
//     res.status(200).json({
//       success: true,
//       bookingId: bookingResult.insertId,
//       bookingReference,
//       passengerCount: passengers.length,
//       paymentMethod,
//       createdBy: userId, // Optionnel: retourner l'ID de l'utilisateur
//     });

//   } catch (error: any) {
//     await connection.rollback();
//     console.error("❌ ERREUR DÉTAILLÉE:", {
//       message: error.message,
//       stack: error.stack,
//       sqlMessage: error.sqlMessage,
//       code: error.code,
//       sql: error.sql
//     });

//     res.status(500).json({
//       error: "Ticket creation failed",
//       details: process.env.NODE_ENV !== "production" ? error.message : undefined,
//     });
//   } finally {
//     connection.release();
//   }
// });


// app.post("/api/create-ticket", authMiddleware, async (req: any, res: Response) => {
//   const connection = await pool.getConnection();
//   const userId = req.user.id;

//   try {
//     await connection.beginTransaction();
//     console.log("✅ Transaction started");

//     const requiredFields = ["flightId", "passengers", "contactInfo", "totalPrice"];
//     for (const field of requiredFields) {
//       if (!req.body[field]) {
//         console.error(`Missing field: ${field}`);
//         throw new Error(`Missing required field: ${field}`);
//       }
//     }

//     const {
//       flightId,
//       passengers,
//       contactInfo,
//       totalPrice,
//       referenceNumber,
//       unpaid,
//       returnFlightId,
//       departureDate,
//       returnDate,
//       paymentMethod = "card",
//     } = req.body;

//     const typeVol = passengers[0]?.typeVol || "plane";
//     const typeVolV = passengers[0]?.typeVolV || "onway";

//     // VÉRIFICATION : S'assurer qu'il y a au moins un passager
//     if (!passengers || passengers.length === 0) {
//       await connection.rollback();
//       return res.status(400).json({
//         error: "Au moins un passager est requis pour créer un ticket",
//         details: "La liste des passagers est vide"
//       });
//     }

//     // Vérifier les vols
//     const flightIds = returnFlightId ? [flightId, returnFlightId] : [flightId];
//     const [flightsRows] = await connection.query<mysql.RowDataPacket[]>(
//       "SELECT id, seats_available FROM flights WHERE id IN (?) FOR UPDATE",
//       [flightIds],
//     );

//     const flights = flightsRows as mysql.RowDataPacket[];

//     if (flights.length !== flightIds.length) {
//       await connection.rollback();
//       throw new Error("One or more flights not found");
//     }

//     for (const flight of flights) {
//       if (flight.seats_available < passengers.length) {
//         await connection.rollback();
//         return res.status(400).json({
//           error: "Not enough seats available",
//           details: `Not enough seats available for flight ${flight.id}`,
//           flightId: flight.id,
//           seatsAvailable: flight.seats_available,
//           passengersNeeded: passengers.length
//         });
//       }
//     }

//     // VÉRIFICATION DES DOUBLONS : Version améliorée
//     console.log("🔍 Vérification des doublons de réservation...");

//     const duplicatePassengers = [];
//     const now = new Date();

//     for (const passenger of passengers) {
//       if (!passenger.firstName || !passenger.lastName) {
//         await connection.rollback();
//         return res.status(400).json({
//           error: "Informations passager incomplètes",
//           details: `Le passager doit avoir un prénom et un nom de famille`
//         });
//       }



//       // Normaliser le nom pour la comparaison
//       const normalizedFirstName = passenger.firstName.trim().toLowerCase();
//       const normalizedLastName = passenger.lastName.trim().toLowerCase();

//       // OPTION 1: Vérification stricte avec date de naissance si disponible
//       // if (passenger.dateOfBirth) {
//       //   const [existingWithDOB] = await connection.query<mysql.RowDataPacket[]>(
//       //     `SELECT 
//       //         p.first_name, 
//       //         p.last_name,
//       //         p.date_of_birth,
//       //         b.booking_reference,
//       //         b.status,
//       //         b.departure_date,
//       //         f.flight_number
//       //      FROM passengers p
//       //      JOIN bookings b ON p.booking_id = b.id
//       //      JOIN flights f ON b.flight_id = f.id
//       //      WHERE LOWER(p.first_name) = ? 
//       //        AND LOWER(p.last_name) = ?
//       //        AND p.date_of_birth = ?
//       //        AND b.flight_id = ?
//       //        AND b.status NOT IN ('cancelled', 'refunded')
//       //        AND DATE(b.departure_date) = DATE(?)`,
//       //     [
//       //       normalizedFirstName, 
//       //       normalizedLastName, 
//       //       passenger.dateOfBirth,
//       //       flightId,
//       //       departureDate
//       //     ]
//       //   );

//       //   if (existingWithDOB.length > 0) {
//       //     duplicatePassengers.push({
//       //       passenger: `${passenger.firstName} ${passenger.lastName}`,
//       //       reason: "Même passager avec même date de naissance sur même vol et même date",
//       //       existingBookings: existingWithDOB.map(b => ({
//       //         bookingReference: b.booking_reference,
//       //         status: b.status,
//       //         flightNumber: b.flight_number,
//       //         departureDate: b.departure_date
//       //       }))
//       //     });
//       //     continue; // Passer au passager suivant
//       //   }
//       // }

//       // OPTION 2: Vérification avec email si disponible
//       // if (passenger.email) {
//       //   const [existingWithEmail] = await connection.query<mysql.RowDataPacket[]>(
//       //     `SELECT 
//       //         p.first_name, 
//       //         p.last_name,
//       //         p.email,
//       //         b.booking_reference,
//       //         b.status,
//       //         b.departure_date,
//       //         f.flight_number
//       //      FROM passengers p
//       //      JOIN bookings b ON p.booking_id = b.id
//       //      JOIN flights f ON b.flight_id = f.id
//       //      WHERE LOWER(p.email) = LOWER(?)
//       //        AND b.flight_id = ?
//       //        AND b.status NOT IN ('cancelled', 'refunded')
//       //        AND DATE(b.departure_date) = DATE(?)`,
//       //     [
//       //       passenger.email,
//       //       flightId,
//       //       departureDate
//       //     ]
//       //   );

//       //   if (existingWithEmail.length > 0) {
//       //     duplicatePassengers.push({
//       //       passenger: `${passenger.firstName} ${passenger.lastName}`,
//       //       reason: "Même email sur même vol et même date",
//       //       existingBookings: existingWithEmail.map(b => ({
//       //         bookingReference: b.booking_reference,
//       //         status: b.status,
//       //         flightNumber: b.flight_number,
//       //         departureDate: b.departure_date
//       //       }))
//       //     });
//       //     continue; // Passer au passager suivant
//       //   }
//       // }

//       // OPTION 3: Vérification basique (nom + prénom) pour même vol et même date
//       const [existingBasic] = await connection.query<mysql.RowDataPacket[]>(
//         `SELECT 
//             p.first_name, 
//             p.last_name,
//             b.booking_reference,
//             b.status,
//             b.departure_date,
//             f.flight_number
//          FROM passengers p
//          JOIN bookings b ON p.booking_id = b.id
//          JOIN flights f ON b.flight_id = f.id
//          WHERE LOWER(p.first_name) = ? 
//            AND LOWER(p.last_name) = ?
//            AND b.flight_id = ?
//            AND b.status NOT IN ('cancelled', 'refunded')
//            AND DATE(b.departure_date) = DATE(?)`,
//         [
//           normalizedFirstName,
//           normalizedLastName,
//           flightId,
//           departureDate
//         ]
//       );

//       if (existingBasic.length > 0) {
//         duplicatePassengers.push({
//           passenger: `${passenger.firstName} ${passenger.lastName}`,
//           reason: "Même nom et prénom sur même vol et même date",
//           existingBookings: existingBasic.map(b => ({
//             bookingReference: b.booking_reference,
//             status: b.status,
//             flightNumber: b.flight_number,
//             departureDate: b.departure_date
//           }))
//         });
//       }
//     }

//     // Si des doublons sont trouvés, annuler et retourner une erreur
//     if (duplicatePassengers.length > 0) {
//       await connection.rollback();
//       console.log("❌ Doublons détectés:", duplicatePassengers);

//       const duplicateNames = duplicatePassengers.map(p => p.passenger).join(', ');

//       return res.status(409).json({
//         success: false,
//         error: "Duplicate booking detected",
//         details: "Un ou plusieurs passagers ont déjà une réservation sur ce vol pour cette date",
//         duplicatePassengers: duplicatePassengers,
//         message: `Impossible de créer le ticket. Le passager suivants ont déjà une réservation sur ce vol : ${duplicateNames}`
//       });
//     }

//     console.log("✅ Aucun doublon détecté, poursuite de la création du ticket");

//     // Création réservation
//     const bookingReference = `TICKET-${Math.floor(100000 + Math.random() * 900000)}`;

//     const depDate = formatDateToSQL(departureDate);
//     const retDate = formatDateToSQL(returnDate);

//     const [bookingResultRows] = await connection.query<mysql.OkPacket>(
//       `INSERT INTO bookings (
//           flight_id, payment_intent_id, total_price,
//           contact_email, contact_phone, status,
//           type_vol, type_v, guest_user, guest_email,
//           created_at, updated_at, departure_date,
//           return_date, passenger_count, booking_reference, return_flight_id,
//           payment_method, user_created_booking
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         flightId,
//         referenceNumber,
//         totalPrice,
//         contactInfo.email,
//         contactInfo.phone,
//         unpaid || "confirmed",
//         typeVol,
//         typeVolV,
//         1,
//         contactInfo.email,
//         now,
//         now,
//         depDate,
//         retDate,
//         passengers.length,
//         bookingReference,
//         returnFlightId || null,
//         paymentMethod,
//         userId,
//       ],
//     );

//     const bookingResult = bookingResultRows as mysql.OkPacket;

//     // Enregistrer les passagers
//     for (const passenger of passengers) {
//       await connection.query(
//         `INSERT INTO passengers (
//           booking_id, first_name, middle_name, last_name,
//           date_of_birth, gender, title, address, type,
//           type_vol, type_v, country, nationality,
//           phone, email, nom_urgence, email_urgence, tel_urgence, created_at, updated_at
//         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           bookingResult.insertId,
//           passenger.firstName,
//           passenger.middleName || null,
//           passenger.lastName,
//           passenger.dateOfBirth || null,
//           passenger.gender || "other",
//           passenger.title || "Mr",
//           passenger.address || null,
//           passenger.type,
//           passenger.typeVol || "plane",
//           passenger.typeVolV || "onway",
//           passenger.country,
//           passenger.nationality || null,
//           passenger.phone || contactInfo.phone,
//           passenger.email || contactInfo.email,
//           passenger.nom_urgence || null,
//           passenger.email_urgence || null,
//           passenger.tel_urgence || null,
//           now,
//           now,
//         ],
//       );
//     }

//     // Mise à jour des sièges
//     for (const flight of flights) {
//       await connection.execute(
//         "UPDATE flights SET seats_available = seats_available - ? WHERE id = ?",
//         [passengers.length, flight.id],
//       );
//     }

//     // Notification
//     try {
//       await connection.query(
//         `INSERT INTO notifications (type, message, booking_id, seen, created_at)
//          VALUES (?, ?, ?, ?, ?)`,
//         [
//           "ticket",
//           `Création d'un ticket ${bookingReference} (${passengers.length} passager(s)).`,
//           bookingResult.insertId,
//           false,
//           now,
//         ],
//       );

//       io.emit("new-notification", {
//         message: `Création d'un ticket ${bookingReference} (${passengers.length} passager(s)).`,
//         bookingId: bookingResult.insertId,
//         createdAt: now,
//       });
//     } catch (notifyErr) {
//       console.error("⚠️ Notification error (non bloquant):", notifyErr);
//     }

//     // Commit final
//     await connection.commit();

//     // ✅ Réponse succès
//     res.status(200).json({
//       success: true,
//       bookingId: bookingResult.insertId,
//       bookingReference,
//       passengerCount: passengers.length,
//       paymentMethod,
//       createdBy: userId,
//       message: `Ticket créé avec succès pour ${passengers.length} passager(s)`
//     });

//   } catch (error: any) {
//     await connection.rollback();
//     console.error("❌ ERREUR DÉTAILLÉE:", {
//       message: error.message,
//       stack: error.stack,
//       sqlMessage: error.sqlMessage,
//       code: error.code,
//       sql: error.sql
//     });

//     // Vérifier si c'est une erreur de doublon SQL
//     if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
//       return res.status(409).json({
//         success: false,
//         error: "Duplicate entry",
//         details: "Une réservation similaire existe déjà",
//         message: "Impossible de créer le ticket : une réservation similaire existe déjà"
//       });
//     }

//     res.status(500).json({
//       success: false,
//       error: "Ticket creation failed",
//       details: process.env.NODE_ENV !== "production" ? error.message : undefined,
//     });
//   } finally {
//     connection.release();
//   }
// });



app.post("/api/create-ticket", authMiddleware, async (req: any, res: Response) => {
  const connection = await pool.getConnection();
  const userId = req.user.id;

  try {
    await connection.beginTransaction();
    console.log("✅ Transaction started");

    const requiredFields = ["flightId", "passengers", "contactInfo", "totalPrice"];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        console.error(`Missing field: ${field}`);
        throw new Error(`Missing required field: ${field}`);
      }
    }

    const {
      flightId,
      passengers,
      contactInfo,
      totalPrice,
      referenceNumber,
      unpaid,
      returnFlightId,
      departureDate,
      returnDate,
      paymentMethod = "card",
    } = req.body;

    const typeVol = passengers[0]?.typeVol || "plane";
    const typeVolV = passengers[0]?.typeVolV || "onway";

    // VÉRIFICATION : S'assurer qu'il y a au moins un passager
    if (!passengers || passengers.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        error: "Au moins un passager est requis pour créer un ticket",
        details: "La liste des passagers est vide"
      });
    }


    let returnFlightIdResolved = returnFlightId || null;

    // Si le client a fourni un numéro de vol retour
    if (passengers[0]?.flightNumberReturn) {
      const flightNumberReturn = passengers[0].flightNumberReturn.trim().toUpperCase();

      const [returnFlightRows] = await connection.query<mysql.RowDataPacket[]>(
        "SELECT id FROM flights WHERE flight_number = ?",
        [flightNumberReturn]
      );

      if (returnFlightRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          error: "Return flight not found",
          details: `Aucun vol trouvé avec le numéro de vol ${flightNumberReturn}`
        });
      }

      returnFlightIdResolved = returnFlightRows[0].id;
    }


    // Vérifier les vols
    const TotalPrice2 = returnFlightIdResolved ? totalPrice * 2 : totalPrice;
    const flightIds = returnFlightIdResolved ? [flightId, returnFlightIdResolved] : [flightId];
    const [flightsRows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT id, seats_available FROM flights WHERE id IN (?) FOR UPDATE",
      [flightIds],
    );

    const flights = flightsRows as mysql.RowDataPacket[];

    if (flights.length !== flightIds.length) {
      await connection.rollback();
      throw new Error("One or more flights not found");
    }

    for (const flight of flights) {
      if (flight.seats_available < passengers.length) {
        await connection.rollback();
        return res.status(400).json({
          error: "Not enough seats available",
          details: `Not enough seats available for flight ${flight.id}`,
          flightId: flight.id,
          seatsAvailable: flight.seats_available,
          passengersNeeded: passengers.length
        });
      }
    }

    // VÉRIFICATION DES DOUBLONS : Version améliorée
    console.log("🔍 Vérification des doublons de réservation...");

    const duplicatePassengers = [];
    const now = new Date();

    for (const passenger of passengers) {
      if (!passenger.firstName || !passenger.lastName) {
        await connection.rollback();
        return res.status(400).json({
          error: "Informations passager incomplètes",
          details: `Le passager doit avoir un prénom et un nom de famille`
        });
      }



      // Normaliser le nom pour la comparaison
      const normalizedFirstName = passenger.firstName.trim().toLowerCase();
      const normalizedLastName = passenger.lastName.trim().toLowerCase();



      // OPTION 3: Vérification basique (nom + prénom) pour même vol et même date


      const [existingBasic] = await connection.query<mysql.RowDataPacket[]>(
        `SELECT 
            p.first_name, 
            p.last_name,
            b.booking_reference,
            b.status,
            b.departure_date,
            f.flight_number
         FROM passengers p
         JOIN bookings b ON p.booking_id = b.id
         JOIN flights f ON b.flight_id = f.id
         WHERE LOWER(p.first_name) = ? 
           AND LOWER(p.last_name) = ?
           AND b.flight_id = ?
           AND b.status NOT IN ('cancelled', 'refunded')
           AND DATE(b.departure_date) = DATE(?)`,
        [
          normalizedFirstName,
          normalizedLastName,
          flightId,
          departureDate
        ]
      );

      if (existingBasic.length > 0) {
        duplicatePassengers.push({
          passenger: `${passenger.firstName} ${passenger.lastName}`,
          reason: "Même nom et prénom sur même vol et même date",
          existingBookings: existingBasic.map(b => ({
            bookingReference: b.booking_reference,
            status: b.status,
            flightNumber: b.flight_number,
            departureDate: b.departure_date
          }))
        });
      }
    }

    // Si des doublons sont trouvés, annuler et retourner une erreur
    if (duplicatePassengers.length > 0) {
      await connection.rollback();
      console.log("❌ Doublons détectés:", duplicatePassengers);

      const duplicateNames = duplicatePassengers.map(p => p.passenger).join(', ');

      return res.status(409).json({
        success: false,
        error: "Duplicate booking detected",
        details: "Un ou plusieurs passagers ont déjà une réservation sur ce vol pour cette date",
        duplicatePassengers: duplicatePassengers,
        message: `Impossible de créer le ticket. Le passager suivants ont déjà une réservation sur ce vol : ${duplicateNames}`
      });
    }

    console.log("✅ Aucun doublon détecté, poursuite de la création du ticket");

    // Création réservation
    const bookingReference = `TICKET-${Math.floor(100000 + Math.random() * 900000)}`;

    const depDate = formatDateToSQL(departureDate);
    const retDate = formatDateToSQL(returnDate);

    const [bookingResultRows] = await connection.query<mysql.OkPacket>(
      `INSERT INTO bookings (
          flight_id, payment_intent_id, total_price,
          contact_email, contact_phone, status,
          type_vol, type_v, guest_user, guest_email,
          created_at, updated_at, departure_date,
          return_date, passenger_count, booking_reference, return_flight_id,
          payment_method, user_created_booking
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        flightId,
        referenceNumber,
        TotalPrice2,
        contactInfo.email,
        contactInfo.phone,
        unpaid || "confirmed",
        typeVol,
        typeVolV,
        1,
        contactInfo.email,
        now,
        now,
        depDate,
        retDate,
        passengers.length,
        bookingReference,
        returnFlightIdResolved || null,
        paymentMethod,
        userId,
      ],
    );

    const bookingResult = bookingResultRows as mysql.OkPacket;

    // Enregistrer les passagers
    for (const passenger of passengers) {
      await connection.query(
        `INSERT INTO passengers (
          booking_id, first_name, middle_name, last_name,
          date_of_birth, gender, title, address, type,
          type_vol, type_v, country, nationality,
          phone, email, nom_urgence, email_urgence, tel_urgence, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bookingResult.insertId,
          passenger.firstName,
          passenger.middleName || null,
          passenger.lastName,
          passenger.dateOfBirth || null,
          passenger.gender || "other",
          passenger.title || "Mr",
          passenger.address || null,
          passenger.type,
          passenger.typeVol || "plane",
          passenger.typeVolV || "onway",
          passenger.country,
          passenger.nationality || null,
          passenger.phone || contactInfo.phone,
          passenger.email || contactInfo.email,
          passenger.nom_urgence || null,
          passenger.email_urgence || null,
          passenger.tel_urgence || null,
          now,
          now,
        ],
      );
    }

    // Mise à jour des sièges
    for (const flight of flights) {
      await connection.execute(
        "UPDATE flights SET seats_available = seats_available - ? WHERE id = ?",
        [passengers.length, flight.id],
      );
    }

    // Notification
    try {
      await connection.query(
        `INSERT INTO notifications (type, message, booking_id, seen, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          "ticket",
          `Création d'un ticket ${bookingReference} (${passengers.length} passager(s)).`,
          bookingResult.insertId,
          false,
          now,
        ],
      );

      io.emit("new-notification", {
        message: `Création d'un ticket ${bookingReference} (${passengers.length} passager(s)).`,
        bookingId: bookingResult.insertId,
        createdAt: now,
      });
    } catch (notifyErr) {
      console.error("⚠️ Notification error (non bloquant):", notifyErr);
    }

    // Commit final
    await connection.commit();

    // ✅ Réponse succès
    res.status(200).json({
      success: true,
      bookingId: bookingResult.insertId,
      bookingReference,
      passengerCount: passengers.length,
      paymentMethod,
      createdBy: userId,
      message: `Ticket créé avec succès pour ${passengers.length} passager(s)`
    });

  } catch (error: any) {
    await connection.rollback();
    console.error("❌ ERREUR DÉTAILLÉE:", {
      message: error.message,
      stack: error.stack,
      sqlMessage: error.sqlMessage,
      code: error.code,
      sql: error.sql
    });

    // Vérifier si c'est une erreur de doublon SQL
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return res.status(409).json({
        success: false,
        error: "Duplicate entry",
        details: "Une réservation similaire existe déjà",
        message: "Impossible de créer le ticket : une réservation similaire existe déjà"
      });
    }

    res.status(500).json({
      success: false,
      error: "Ticket creation failed",
      details: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  } finally {
    connection.release();
  }
});

// Middleware général pour vérifier le token


function authMiddleware(req: any, res: Response, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Token manquant" });

  jwt.verify(token, process.env.JWT_SECRET || "secretKey", (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Token invalide" });
    req.user = user;
    next();
  });
}

// Middleware adminOnly pour protéger certaines routes
async function adminOnly(req: any, res: Response, next: any) {
  const userId = req.user.id;
  try {
    const [rows] = await pool.query<User[]>("SELECT role FROM users WHERE id = ?", [userId]);
    if (rows.length === 0) return res.status(404).json({ error: "Utilisateur introuvable" });
    if (rows[0].role !== "admin") return res.status(403).json({ error: "Accès refusé" });
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

// Register (protégé)
app.post("/api/register", authMiddleware, adminOnly, async (req: Request, res: Response) => {
  const { name, email, password, phone, role } = req.body; // optionnel: permettre de créer admin
  console.log("Register body:", req.body);

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Nom, email et mot de passe requis" });
  }

  try {
    const [rows] = await pool.query<User[]>("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length > 0) {
      return res.status(400).json({ error: "Email déjà utilisé" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)",
      [name, email, hashedPassword, phone ?? null, role ?? "user"]
    );

    res.status(201).json({ success: true, id: (result as ResultSetHeader).insertId });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});


// Login
app.post("/api/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    // Vérifier si l'utilisateur existe
    const [rows] = await pool.query<User[]>("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    const user = rows[0];

    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    // Générer un JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || "secretKey",
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

//  Récupérer tous les utilisateurs (protégé)
app.get("/api/users", authMiddleware, async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<User[]>(
      "SELECT id, name, email, phone, role, created_at FROM users"
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

//  Récupérer un utilisateur par ID (protégé)
app.get("/api/users/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<User[]>(
      "SELECT id, name, email, phone, created_at FROM users WHERE id = ?",
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});


async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = "api-F876F566C8754DB299476B9DF6E9B82B";
  const sender = "Booking Trogon Airways <booking@trogonairways.com>";

  console.log("🔍 DEBUG sendEmail appelé avec:");
  console.log("  - to:", to);
  console.log("  - subject:", subject);
  console.log("  - sender:", sender);
  console.log("  - apiKey présente:", !!apiKey);

  if (!apiKey || !sender) {
    console.error("❌ Configuration manquante");
    return { success: false, error: "Configuration manquante" };
  }

  const payload = {
    api_key: apiKey,
    sender,
    to: [to],
    subject,
    html_body: html,
  };

  console.log("📦 Payload envoyé à SMTP2GO:", JSON.stringify(payload));

  try {
    console.log("🔄 Envoi de la requête à SMTP2GO...");

    const response = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log("📊 Status HTTP reçu:", response.status);
    console.log("📊 Headers reçus:", response.headers);

    const data = await response.json();
    console.log("📨 Réponse COMPLÈTE SMTP2GO:", JSON.stringify(data, null, 2));

    if (data.data && data.data.succeeded === 1) {
      console.log("✅ SUCCÈS - Email accepté par SMTP2GO");
      return { success: true, data };
    } else {
      console.error("❌ ÉCHEC - SMTP2GO a refusé l'email");
      console.error("   Erreur:", data.data?.error);
      console.error("   Code:", data.data?.error_code);
      return { success: false, error: data };
    }
  } catch (err) {
    console.error("💥 ERREUR RÉSEAU/FETCH:", err);
    if (err instanceof Error) {
      console.error("   Message:", err.message);
      console.error("   Stack:", err.stack);
    }
    return { success: false, error: err };
  }
}

//  Modifier un utilisateur (protégé)
app.put("/api/users/:id", authMiddleware, async (req: any, res: Response) => {
  const { name, email, password, phone } = req.body;
  const userId = parseInt(req.params.id, 10);

  // Vérifier que l’utilisateur connecté modifie son propre compte
  if (req.user.id !== userId) {
    return res.status(403).json({ error: "Non autorisé" });
  }

  try {
    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    await pool.execute(
      "UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), password_hash = COALESCE(?, password_hash), phone = COALESCE(?, phone) WHERE id = ?",
      [name, email, hashedPassword, phone, userId]
    );

    res.json({ success: true, message: "Utilisateur mis à jour" });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

//  Supprimer un utilisateur (protégé)
app.delete("/api/users/:id", authMiddleware, async (req: any, res: Response) => {
  const userId = parseInt(req.params.id, 10);

  if (req.user.id !== userId) {
    return res.status(403).json({ error: "Non autorisé" });
  }

  try {
    await pool.execute("DELETE FROM users WHERE id = ?", [userId]);
    res.json({ success: true, message: "Utilisateur supprimé" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});


app.get("/api/profile", authMiddleware, async (req: any, res: Response) => {
  const [rows] = await pool.query<User[]>("SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?", [req.user.id]);
  res.json(rows[0]);
});

const tokenBlacklist: string[] = [];

app.post("/api/logout", authMiddleware, (req: any, res: Response) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token) {
    tokenBlacklist.push(token); // ajouter à la blacklist
  }
  res.json({ success: true, message: "Déconnecté avec succès" });
});



//--------------------------fin user----------------------------

app.get("/api/locationstables", async (req: Request, res: Response) => {
  try {

    const [locations] = await pool.query<mysql.RowDataPacket[]>("SELECT * FROM locations");

    res.json(locations);
  } catch (err) {
    console.error("Erreur lors de la récupération des aéroports:", err);
    res.status(500).json({
      error: "Erreur serveur",
      details: err instanceof Error ? err.message : "Erreur inconnue",
    });
  }
});

function formatDate(date: Date): string {
  const d = new Date(date);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
// Route pour ajouter un nouveau vol

app.get("/api/flighttableplane", async (req: Request, res: Response) => {
  let connection;
  try {


    const query = `
            SELECT 
                f.id,
                f.flight_number,
                f.type,
                f.airline,
                f.departure_time,
                f.arrival_time,
                f.price,
                f.seats_available,
                dep.name AS departure_airport_name,
                dep.city AS departure_city,
                dep.code AS departure_code,
                arr.name AS arrival_airport_name,
                arr.city AS arrival_city,
                arr.code AS arrival_code
            FROM 
                flights f
            JOIN 
                locations dep ON f.departure_location_id = dep.id
            JOIN 
                locations arr ON f.arrival_location_id = arr.id
            WHERE 
                f.type = 'plane'    
            ORDER BY 
                f.departure_time ASC
        `;

    console.log("Exécution de la requête SQL...");
    const [flights] = await pool.query<FlightWithAirports[]>(query);
    console.log("Requête exécutée avec succès. Nombre de vols:", flights.length);

    // Formater les données
    const formattedFlights = flights.map((flight) => ({
      id: flight.id,
      flight_number: flight.flight_number,
      type: flight.type,
      airline: flight.airline,
      from: `${flight.departure_airport_name} (${flight.departure_code})`,
      to: `${flight.arrival_airport_name} (${flight.arrival_code})`,
      departure: flight.departure_time,
      arrival: flight.arrival_time,
      price: flight.price,
      seats_available: flight.seats_available.toString(),
      departure_city: flight.departure_city,
      arrival_city: flight.arrival_city,
    }));


    res.json(formattedFlights);
  } catch (err) {
    console.error("ERREUR DÉTAILLÉE:", {
      message: err instanceof Error ? err.message : "Erreur inconnue",
      stack: err instanceof Error ? err.stack : undefined,

    });

    if (connection)
      res.status(500).json({
        error: "Erreur serveur",
        details: process.env.NODE_ENV !== "production" ? (err instanceof Error ? err.message : "Erreur inconnue") : undefined,
      });
  }
});



import fetch from "node-fetch";

import pdf from 'html-pdf-node'
import { format, parseISO, isValid, parse } from "date-fns";
import { toZonedTime } from "date-fns-tz";



app.get("/api/generate/:reference", async (req: Request, res: Response) => {
  const { reference } = req.params;

  try {
    // 1️⃣ Récupérer booking, passengers, flights
    const [bookingRows]: any = await pool.query(
      "SELECT * FROM bookings WHERE booking_reference = ?",
      [reference]
    );
    if (!bookingRows.length)
      return res.status(404).json({ error: "Réservation introuvable" });

    const booking = bookingRows[0];

    const [passengers]: any = await pool.query(
      "SELECT * FROM passengers WHERE booking_id = ?",
      [booking.id]
    );

    // Définir l'interface
    interface Flight {
      id: number;
      flight_number: string;
      departure_time: string | null;
      arrival_time: string | null;
      dep_name: string;
      dep_code: string;
      arr_name: string;
      arr_code: string;
      departure_location_id: number;
      arrival_location_id: number;
      // Ajoutez d'autres propriétés si nécessaire
    }

    interface Passenger {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      phone?: string;
      booking_id: number;
    }

    // Récupérer les vols
    const flightIds = [booking.flight_id, booking.return_flight_id].filter(Boolean);
    let flights: Flight[] = [];

    if (flightIds.length > 0) {
      const placeholders = flightIds.map(() => '?').join(',');
      const [flightsResult]: any = await pool.query(
        `SELECT f.*, dep.name AS dep_name, dep.code AS dep_code, arr.name AS arr_name, arr.code AS arr_code
     FROM flights f
     JOIN locations dep ON dep.id = f.departure_location_id
     JOIN locations arr ON arr.id = f.arrival_location_id
     WHERE f.id IN (${placeholders})`,
        flightIds
      );
      flights = flightsResult as Flight[];
    }

    // Identifier les vols aller et retour
    const outboundFlight = flights.find((f: Flight) => f.id === booking.flight_id);
    const returnFlight = flights.find((f: Flight) => f.id === booking.return_flight_id);

    // Fonction utilitaire pour formater les dates
    const formatDateSafe = (dateString: string | null, dateFormat: string): string => {
      if (!dateString) return 'Non spécifié';
      try {
        return format(parseISO(dateString), dateFormat);
      } catch (error) {
        console.error('Erreur de formatage de date:', dateString, error);
        return 'Date invalide';
      }
    };

    // 2️⃣ QR Code
    const qrCodeDataUrl = `https://barcode.tec-it.com/barcode.ashx?data=${reference}&code=Code128&dpi=96`;

    // 3️⃣ HTML Template - Version corrigée
    const htmlContent = `
    <html>
    <head>
      
    </head>
    <body>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f0f7ff; padding: 20px; text-align: center; border-radius: 5px; }
        .flight-card {  border-radius: 5px; padding: 15px; margin-bottom: 20px; }
        .flight-header { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .flight-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .passenger-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .passenger-table th, .passenger-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .passenger-table th { background-color: #f2f2f2; }
        .footer { margin-top: 30px; font-size: 12px; color: #777; text-align: center; }
    </style>
      
      <!-- PREMIÈRE PAGE (Anglais) -->
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="display: block; width: 100%; background-color: #1A237E; color: white; padding: 20px; text-align: center;">
          <img src="https://trogonairways.com/logo-trogonpng.png" alt="" style="height: 55px; vertical-align: middle" />
          <p style="margin: 5px 0 0; font-size: 1.2em">Your Booking is Confirmed</p>
        </div>

        <div style="padding: 8px">
          <p>
            Dear ${passengers.map((p: any) => p.first_name + " " + p.last_name).join(", ")}
          </p>
          <p>
            Thank you for choosing Trogon Airways. Please find your e-ticket below. We
            recommend printing this section or having it available on your mobile
            device at the airport.
          </p>
        </div>

        <!-- E-Ticket Section -->
        <div style="border-top: 2px dashed #ccc; margin: 0 20px; padding-top: 8px">
          <div style="padding: 8px; text-align: center">
            <p style="margin: 0; color: #1a237e; font-size: 0.9em">
              <strong>Payment Method:</strong>
              ${booking.payment_method === "cash" ? "Cash" : booking.payment_method === "card" ? "Credit/Debit Card" : booking.payment_method === "cheque" ? "Bank Check" : booking.payment_method === "virement" ? "Bank transfer" : booking.payment_method === "transfert" ? "Transfer" : "Contract"}
            </p>
            <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Flight Type:</strong> ${booking.type_vol === "helicopter" ? "Helicopter" : "Air Plane"}</p>
          </div>

          <div style="background: rgba(0, 28, 150, 0.3); border: 1px solid #eee; padding: 8px; border-radius: 8px;">
            <table width="100%" style="border-collapse: collapse">
              <tr>
                <td style="padding-bottom: 20px; border-bottom: 1px solid #eee">
                  <span style="font-size: 1.5em; font-weight: bold; color: #1a237e; vertical-align: middle; margin-left: 10px;">Boarding Pass</span>
                </td>
                <td style="padding-bottom: 20px; border-bottom: 1px solid #eee; text-align: right;">
                  <img src="${qrCodeDataUrl}" alt="Booking Barcode" style="height: 50px" />
                </td>
              </tr>

              <tr>
                <td colspan="2" style="padding-top: 8px">
                  <div style="padding: 20px; text-align: center">
                    <h3 style="color: #1a237e; margin: 0">${booking.return_flight_id ? "Round Trip" : "One Way"}</h3>
                  </div>
                  <h3 style="color: #1a237e; margin: 0">Itinerary</h3>

                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <!-- OUTBOUND -->
                      <td width="50%" valign="top" align="left">
                      ${outboundFlight ? `
                        <div class="flight-card">
                          <div class="flight-header">Outbound Flight</div>
                        
                            <div>
                                                <strong>From:</strong> ${outboundFlight.dep_name} (${outboundFlight.dep_code})<br />
                                                <strong>To:</strong> ${outboundFlight.arr_name} (${outboundFlight.arr_code})<br />
                                                <strong>Date:</strong> ${formatDateSafe(outboundFlight.departure_time, "EEE, dd MMM yyyy")}<br />
                                                <strong>Departure:</strong> ${formatDateSafe(outboundFlight.departure_time, "HH:mm")}<br />
                                                <strong>Arrival:</strong> ${formatDateSafe(outboundFlight.arrival_time, "HH:mm")}<br />
                                                <strong>Flight Number:</strong> ${outboundFlight.flight_number}
                            </div>
                          
                        </div>
                        ` : ''}
                      </td>

                      <!-- RETURN -->
                      <td width="50%" valign="top">
                    ${returnFlight ? `
                    <table align="right" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <div class="flight-card" style="text-align:left;">
                            <div class="flight-header">Return Flight</div>
                            <div >
                              
                                <strong>From:</strong> ${returnFlight.dep_name} (${returnFlight.dep_code})<br />
                                <strong>To:</strong> ${returnFlight.arr_name} (${returnFlight.arr_code})<br />
                                <strong>Date:</strong> ${formatDateSafe(returnFlight.departure_time, "EEE, dd MMM yyyy")}<br />
                                <strong>Departure:</strong> ${formatDateSafe(returnFlight.departure_time, "HH:mm")}<br />
                                <strong>Arrival:</strong> ${formatDateSafe(returnFlight.arrival_time, "HH:mm")}<br />
                                <strong>Flight Number:</strong> ${returnFlight.flight_number}
                            
                            </div>
                          </div>
                        </td>
                      </tr>
                    </table>
                    ` : ''}
                  </td>

                    </tr>
                  </table>
            
                </td>
              </tr>

              <tr>
                <td colspan="2" style="padding-top: 8px; border-top: 1px solid #eee">
                  <h3 style="color: #1a237e; margin: 0 0 10px 0">Passengers</h3>
                  <p style="margin: 0">
                    ${passengers.map((p: any) => `
                    <strong>Passenger:</strong> ${p.first_name || ''} ${p.last_name || ''}<br />
                    <strong>Email:</strong> ${p.email || 'N/A'}<br />
                    ${p.phone ? `<strong>Phone:</strong> ${p.phone}<br /><br />` : ``}                                                          
                    `).join("")}
                  </p>
                </td>
              </tr>

              <tr>
                <td colspan="2" style="padding-top: 8px; border-top: 1px solid #eee">
                  <table width="100%">
                    <tr>
                      <td>
                        <h3 style="color: #1a237e; margin: 0">Booking Details</h3>
                        <p style="margin: 0; font-size: 0.9em">
                          <strong>Booking ID:</strong> ${booking.booking_reference || 'N/A'}
                        </p>
                        <p style="margin: 0; font-size: 0.9em">
                          <strong>Booking Date:</strong> ${formatDateSafe(booking.created_at, "EEE, dd MMM yyyy")}
                        </p>
                      </td>
                      <td style="text-align: right">
                        <h3 style="color: #1a237e; margin: 0">Payment</h3>
                        <p style="margin: 0; font-size: 1.1em">
                          <strong>Total:</strong> $${booking.total_price || '0.00'}
                        </p>
                        <p style="margin: 0; font-size: 0.9em">
                          <strong>Status: </strong>
                          ${['cash', 'card', 'cheque', 'virement', 'transfert'].includes(booking.payment_method) ? 'Paid' : 'UnPaid'}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        </div>
        <!-- End E-Ticket Section -->

        ${booking.type_vol === "plane" ? `
        <div style="padding: 8px; font-size: 0.9em; color: #555">
          <p><strong>Important:</strong> Please arrive at the airport at least 1 hour before your departure time. All passengers must present a valid ID at check-in.</p>
          <p><strong>Baggage Limitation:</strong> The maximum allowance for passenger baggage is 30 lb. <strong>Luggage dimensions 65*40*25</strong></p>
          <p><strong>Remarks:</strong> The company declines all responsibility for flight delays, cancellations, or changes resulting from circumstances beyond its control, such as, technical problems, strikes, or any other problems. The customer is responsible for their own personal arrangements (airport arrival time, travel formalities, etc.). No refund or compensation can be claimed in the event of a missed flight for these reasons.</p>
          <p><strong>Remarks 2:</strong> Any cancellation on the day of or the day before your trip will result in a 50% cancellation fee being charged.</p>
          <p>We look forward to welcoming you on board.</p>
          <p>Sincerely,<br />The Trogon Airways Team</p>
        </div>` : `
        <div style="padding: 20px; font-size: 0.9em; color: #555;">
          <p><strong>Important:</strong> Please arrive at the airport at least 1 hour before your departure time. All passengers must present a valid ID at check-in.</p>
          <p><strong>Baggage Limitation:</strong> The maximum allowance for passenger baggage is 20 lb. <strong>Luggage dimensions 35*55*25, Carry on, soft skin</strong></p>
          <p><strong>Remarks:</strong> The company declines all responsibility for flight delays, cancellations, or changes resulting from circumstances beyond its control, such as, technical problems, strikes, or any other problems. The customer is responsible for their own personal arrangements (airport arrival time, travel formalities, etc.). No refund or compensation can be claimed in the event of a missed flight for these reasons.</p>
          <p><strong>Remarks 2:</strong> Any cancellation on the day of or the day before your trip will result in a 50% cancellation fee being charged.</p>
          <p>We look forward to welcoming you on board.</p>
          <p>Sincerely,<br>The Trogon Airways Team</p>
        </div>`}
      </div>

      <!-- FORCER NOUVELLE PAGE -->
      <div style="page-break-after: always;"></div>

      <!-- DEUXIÈME PAGE (Français) -->
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="display: block; width: 100%; background-color: #1A237E; color: white; padding: 20px; text-align: center;">
          <img src="https://trogonairways.com/logo-trogonpng.png" alt="" style="height: 55px; vertical-align: middle" />
          <p style="margin: 5px 0 0; font-size: 1.2em">Votre réservation est confirmée</p>
        </div>

        <div style="padding: 8px">
          <p>
            Cher(e) ${passengers.map((p: any) => p.first_name + " " + p.last_name).join(", ")}
          </p>
          <p>Merci d'avoir choisi Trogon Airways. Veuillez trouver ci-dessous votre billet électronique. Nous vous recommandons d'imprimer cette section ou de la présenter sur votre appareil mobile à l'aéroport.</p>
        </div>

        <!-- Section E-Ticket -->
        <div style="border-top: 2px dashed #ccc; margin: 0 20px; padding-top: 8px">
          <div style="padding: 8px; text-align: center">
            <p style="margin: 0; color: #1a237e; font-size: 0.9em">
              <strong>Mode de paiement:</strong>
              ${booking.payment_method === "cash" ? "Espèces" : booking.payment_method === "card" ? "Carte bancaire" : booking.payment_method === "cheque" ? "Chèque bancaire" : booking.payment_method === "virement" ? "Virement bancaire" : booking.payment_method === "transfert" ? "Transfert" : "Contrat"}
            </p>
            <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Type de vol:</strong> ${booking.type_vol === "helicopter" ? "Hélicoptère" : "Avion"}</p>
          </div>

          <div style="background: rgba(0, 28, 150, 0.3); border: 1px solid #eee; padding: 8px; border-radius: 8px;">
            <table width="100%" style="border-collapse: collapse">
              <tr>
                <td style="padding-bottom: 20px; border-bottom: 1px solid #eee">
                  <span style="font-size: 1.5em; font-weight: bold; color: #1a237e; vertical-align: middle; margin-left: 10px;">Carte d'embarquement</span>
                </td>
                <td style="padding-bottom: 20px; border-bottom: 1px solid #eee; text-align: right;">
                  <img src="${qrCodeDataUrl}" alt="Code-barres de réservation" style="height: 50px" />
                </td>
              </tr>

              <tr>
                <td colspan="2" style="padding-top: 8px">
                  <div style="padding: 20px; text-align: center">
                    <h3 style="color: #1a237e; margin: 0">${booking.return_flight_id ? "Vol Aller-Retour" : "Vol Simple"}</h3>
                  </div>
                  <h3 style="color: #1a237e; margin: 0">Itinéraire</h3>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <!-- OUTBOUND -->
                      <td width="50%" valign="top" align="left">
                      ${outboundFlight ? `
                        <div class="flight-card">
                          <div class="flight-header">Vol Aller</div>
                        
                            <div>
                                                <strong>De:</strong> ${outboundFlight.dep_name} (${outboundFlight.dep_code})<br />
                                                <strong>À:</strong> ${outboundFlight.arr_name} (${outboundFlight.arr_code})<br />
                                                <strong>Date:</strong> ${formatDateSafe(outboundFlight.departure_time, "EEE, dd MMM yyyy")}<br />
                                                <strong>Départ:</strong> ${formatDateSafe(outboundFlight.departure_time, "HH:mm")}<br />
                                                <strong>Arrivée:</strong> ${formatDateSafe(outboundFlight.arrival_time, "HH:mm")}<br />
                                                <strong>Numéro du vol:</strong> ${outboundFlight.flight_number}
                            </div>
                          
                        </div>
                        ` : ''}
                      </td>

                      <!-- RETURN -->
                      <td width="50%" valign="top">
                    ${returnFlight ? `
                    <table align="right" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <div class="flight-card" style="text-align:left;">
                            <div class="flight-header">Vol Retour</div>
                            <div >
                              
                                <strong>De:</strong> ${returnFlight.dep_name} (${returnFlight.dep_code})<br />
                                <strong>À:</strong> ${returnFlight.arr_name} (${returnFlight.arr_code})<br />
                                <strong>Date:</strong> ${formatDateSafe(returnFlight.departure_time, "EEE, dd MMM yyyy")}<br />
                                <strong>Départ:</strong> ${formatDateSafe(returnFlight.departure_time, "HH:mm")}<br />
                                <strong>Arrivée:</strong> ${formatDateSafe(returnFlight.arrival_time, "HH:mm")}<br />
                                <strong>Numéro du vol:</strong> ${returnFlight.flight_number}
                            
                            </div>
                          </div>
                        </td>
                      </tr>
                    </table>
                    ` : ''}
                  </td>

                    </tr>
                  </table>

                     
                </td>
              </tr>

              <tr>
                <td colspan="2" style="padding-top: 8px; border-top: 1px solid #eee">
                  <h3 style="color: #1a237e; margin: 0 0 10px 0">Passagers</h3>
                  <p style="margin: 0">
                    ${passengers.map((p: any) => `
                    <strong>Passager:</strong> ${p.first_name || ''} ${p.last_name || ''}<br />
                    <strong>Email:</strong> ${p.email || 'N/A'}<br />
                    ${p.phone ? `<strong>Téléphone:</strong> ${p.phone}<br /><br />` : ``}                                                          
                    `).join("")}
                  </p>
                </td>
              </tr>

              <tr>
                <td colspan="2" style="padding-top: 8px; border-top: 1px solid #eee">
                  <table width="100%">
                    <tr>
                      <td>
                        <h3 style="color: #1a237e; margin: 0">Détails de la réservation</h3>
                        <p style="margin: 0; font-size: 0.9em">
                          <strong>Réservation ID:</strong> ${booking.booking_reference || 'N/A'}
                        </p>
                        <p style="margin: 0; font-size: 0.9em">
                          <strong>Date de réservation:</strong> ${formatDateSafe(booking.created_at, "EEE, dd MMM yyyy")}
                        </p>
                      </td>
                      <td style="text-align: right">
                        <h3 style="color: #1a237e; margin: 0">Paiement</h3>
                        <p style="margin: 0; font-size: 1.1em">
                          <strong>Total:</strong> $${booking.total_price || '0.00'}
                        </p>
                        <p style="margin: 0; font-size: 0.9em">
                          <strong>Statut: </strong>
                          ${['cash', 'card', 'cheque', 'virement', 'transfert'].includes(booking.payment_method) ? 'Payé' : 'Non payé'}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        </div>
        <!-- Fin Section E-Ticket -->

        ${booking.type_vol === "plane" ? `
        <div style="padding: 20px; font-size: 0.9em; color: #555;">
          <p><strong>Important:</strong> Veuillez vous présenter à l'aéroport au moins une heure avant votre départ. Tous les passagers doivent présenter une pièce d'identité valide lors de l'enregistrement.</p>
          <p><strong>Limitation des bagages:</strong> La franchise maximale pour les bagages des passagers est de 30 lb. <strong>Mallette dimension 65*40*25</strong></p>
          <p><strong>Remarques:</strong> La compagnie décline toute responsabilité en cas de retard, d'annulation ou de modification de vol imputable à des circonstances indépendantes de sa volonté dû à des problèmes techniques, grèves ou tout autre incident ne relevant pas de sa responsabilité. Le client est responsable de ses propres dispositions (heure d'arrivée à l'aéroport, formalités de voyage, etc.). Aucun remboursement ni indemnisation ne sera accordé en cas de vol manqué pour ces raisons.</p>
          <p><strong>Remarques 2:</strong> Toute annulation le jour même ou la veille de votre voyage entraînera une retenue de 50% du montant total à titre de frais d'annulation.</p>
          <p>Nous nous réjouissons de vous accueillir à bord.</p>
          <p>Cordialement,<br>L'équipe de Trogon Airways</p>
        </div>` : `
        <div style="padding: 20px; font-size: 0.9em; color: #555;">
          <p><strong>Important:</strong> Veuillez vous présenter à l'aéroport au moins une heure avant votre départ. Tous les passagers doivent présenter une pièce d'identité valide lors de l'enregistrement.</p>
          <p><strong>Limitation des bagages:</strong> La franchise maximale pour les bagages des passagers est de 20 lb. <strong>Mallette dimension 35*55*25, Carry on, soft skin</strong></p>
          <p><strong>Remarques:</strong> La compagnie décline toute responsabilité en cas de retard, d'annulation ou de modification de vol imputable à des circonstances indépendantes de sa volonté dû à des problèmes techniques, grèves ou tout autre incident ne relevant pas de sa responsabilité. Le client est responsable de ses propres dispositions (heure d'arrivée à l'aéroport, formalités de voyage, etc.). Aucun remboursement ni indemnisation ne sera accordé en cas de vol manqué pour ces raisons.</p>
          <p><strong>Remarques 2:</strong> Toute annulation le jour même ou la veille de votre voyage entraînera une retenue de 50% du montant total à titre de frais d'annulation.</p>
          <p>Nous nous réjouissons de vous accueillir à bord.</p>
          <p>Cordialement,<br>L'équipe de Trogon Airways</p>
        </div>`}
      </div>
    </body>
    </html>
    `;



    // 4️⃣ Générer le PDF
    const file = { content: htmlContent };
    const options = { format: 'A3', printBackground: true, margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' } };

    const pdfBuffer = await pdf.generatePdf(file, options);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${reference}.pdf`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error("❌ ERREUR PDF :", err);
    res.status(500).json({ error: "Erreur lors de la génération du billet" });
  }
});










app.post("/api/addflighttable", async (req: Request, res: Response) => {
  console.log("Données reçues:", req.body); // Ajouté pour le debug
  // Vérifier que toutes les valeurs requises sont présentes
  const requiredFields = ["flight_number", "type", "departure_location_id", "arrival_location_id", "departure_time", "arrival_time"];

  for (const field of requiredFields) {
    if (req.body[field] === undefined) {
      return res.status(400).json({
        error: `Le champ ${field} est requis`,
        details: `Received: ${req.body[field]}`,
      });
    }
  }

  try {
    // Convertir created_at en heure Haïti
    const now = new Date();


    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO flights 
             (flight_number, type, airline, departure_location_id, arrival_location_id, 
              departure_time, arrival_time, price, seats_available, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.body.flight_number ?? null,
        req.body.type ?? null,
        req.body.airline ?? null,
        req.body.departure_location_id ?? null,
        req.body.arrival_location_id ?? null,
        req.body.departure_time ?? null,
        req.body.arrival_time ?? null,
        req.body.price ?? null,
        req.body.seats_available ?? null,
        now,
      ],
    );
    console.log("Résultat INSERT:", result); // Ajouté pour le debug

    const [rows] = await pool.query<Flight[]>("SELECT * FROM flights WHERE id = ?", [result.insertId]);

    res.status(201).json(rows[0]);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Erreur MySQL:", error);
      res.status(500).json({
        error: "Erreur lors de l'ajout du vol",
        details: error.message,
      });
    } else {
      console.error("Erreur inconnue:", error);
      res.status(500).json({
        error: "Erreur inconnue lors de l'ajout du vol",
      });
    }
  }
});


// Endpoint pour les données du dashboard
// app.get("/api/dashboard-stats", async (req: Request, res: Response) => {
//     let connection;
//     try {


//         // 1. Récupérer les réservations avec un typage explicite
//         const [bookingRows] = await pool.query<mysql.RowDataPacket[]>(`
//       SELECT 
//         id, 
//         booking_reference, 
//         total_price, 
//         status, 
//         created_at, 
//         passenger_count, 
//         contact_email,
//         type_vol,
//         type_v
//       FROM bookings
//       ORDER BY created_at DESC
//     `);

//         // Convertir en type Booking[]
//         const bookings: Booking[] = bookingRows.map((row) => ({
//             id: row.id,
//             booking_reference: row.booking_reference,
//             total_price: Number(row.total_price),
//             status: row.status,
//             created_at: new Date(row.created_at).toISOString(),
//             passenger_count: row.passenger_count,
//             contact_email: row.contact_email,
//             type_vol: row.type_vol,
//             type_v: row.type_v,
//         }));

//         // 2. Récupérer les vols avec un typage explicite
//         const [flightRows] = await pool.query<mysql.RowDataPacket[]>(`
//       SELECT id, type, departure_time, price, seats_available 
//       FROM flights
//     `);

//         // Convertir en type Flight[]
//         const flights: Flights[] = flightRows.map((row) => ({
//             id: row.id,
//             type: row.type,
//             departure_time: new Date(row.departure_time).toISOString(),
//             price: Number(row.price),
//             seats_available: row.seats_available,
//         }));

//         // 3. Calcul des statistiques avec typage fort
//         const totalRevenue = bookings.reduce((sum, booking) => sum + booking.total_price, 0);
//         const totalBookings = bookings.length;
//         const flightsAvailable = flights.length;
//         const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

//         // 4. Statistiques par statut
//         const statusCounts = bookings.reduce((acc: Record<string, number>, booking) => {
//             acc[booking.status] = (acc[booking.status] || 0) + 1;
//             return acc;
//         }, {});

//         const bookingsByStatus = Object.entries(statusCounts).map(([name, value]) => ({
//             name,
//             value,
//         }));

//         // 5. Statistiques par type de vol
//         const flightTypeCounts = bookings.reduce((acc: Record<string, number>, booking) => {
//             const type = booking.type_vol === "plane" ? "Avion" : "Hélicoptère";
//             acc[type] = (acc[type] || 0) + 1;
//             return acc;
//         }, {});

//         const bookingsByFlightType = Object.entries(flightTypeCounts).map(([name, value]) => ({
//             name,
//             value,
//         }));

//         // 6. Revenu par mois
//         const monthlyRevenue = bookings.reduce((acc: Record<string, number>, booking) => {
//             const date = new Date(booking.created_at);
//             const month = date.toLocaleString("fr-FR", { month: "short" });
//             acc[month] = (acc[month] || 0) + booking.total_price;
//             return acc;
//         }, {});

//         const revenueByMonth = Object.entries(monthlyRevenue).map(([name, total]) => ({
//             name,
//             total,
//         }));


//         const recentBookings = bookings.slice(0, 6);

//         // 8. Construction de la réponse
//         const response: DashboardStats = {
//             totalRevenue,
//             totalBookings,
//             flightsAvailable,
//             averageBookingValue,
//             bookingsByStatus,
//             revenueByMonth,
//             bookingsByFlightType,
//             recentBookings,
//         };

//         res.json(response);
//     } catch (error) {
//         console.error("Dashboard error:", error);
//         res.status(500).json({ error: "Erreur lors de la récupération des statistiques" });
//     } 
// });


app.get("/api/dashboard-stats", async (req: Request, res: Response) => {
  let connection;
  try {
    const { startDate, endDate } = req.query;

    // Construire la clause WHERE pour les dates
    let dateWhereClause = "";
    let dateParams: any[] = [];

    if (startDate && endDate) {
      dateWhereClause = "WHERE DATE(created_at) BETWEEN ? AND ?";
      dateParams = [startDate, endDate];
    }

    // 1. Récupérer les réservations avec un typage explicite
    const [bookingRows] = await pool.query<mysql.RowDataPacket[]>(`
      SELECT 
        id, 
        booking_reference, 
        total_price, 
        status, 
        created_at, 
        passenger_count, 
        contact_email,
        type_vol,
        type_v
      FROM bookings
      ${dateWhereClause}
      ORDER BY created_at DESC
    `, dateParams);

    // Convertir en type Booking[]
    const bookings: Booking[] = bookingRows.map((row) => ({
      id: row.id,
      booking_reference: row.booking_reference,
      total_price: Number(row.total_price),
      status: row.status,
      created_at: new Date(row.created_at).toISOString(),
      passenger_count: row.passenger_count,
      contact_email: row.contact_email,
      type_vol: row.type_vol,
      type_v: row.type_v,
    }));

    // 2. Récupérer les vols avec un typage explicite
    const [flightRows] = await pool.query<mysql.RowDataPacket[]>(`
      SELECT id, type, departure_time, price, seats_available 
      FROM flights
    `);

    // Convertir en type Flight[]
    const flights: Flights[] = flightRows.map((row) => ({
      id: row.id,
      type: row.type,
      departure_time: new Date(row.departure_time).toISOString(),
      price: Number(row.price),
      seats_available: row.seats_available,
    }));

    // 3. Calcul des statistiques avec typage fort
    const totalRevenue = bookings.reduce((sum, booking) => sum + booking.total_price, 0);
    const totalBookings = bookings.length;
    const flightsAvailable = flights.length;
    const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    // 4. Statistiques par statut
    const statusCounts = bookings.reduce((acc: Record<string, number>, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      return acc;
    }, {});

    const bookingsByStatus = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }));

    // 5. Statistiques par type de vol
    const flightTypeCounts = bookings.reduce((acc: Record<string, number>, booking) => {
      const type = booking.type_vol === "plane" ? "Avion" : "Hélicoptère";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const bookingsByFlightType = Object.entries(flightTypeCounts).map(([name, value]) => ({
      name,
      value,
    }));

    // 6. Revenu par mois
    const monthlyRevenue = bookings.reduce((acc: Record<string, number>, booking) => {
      const date = new Date(booking.created_at);
      const month = date.toLocaleString("fr-FR", { month: "short" });
      acc[month] = (acc[month] || 0) + booking.total_price;
      return acc;
    }, {});

    const revenueByMonth = Object.entries(monthlyRevenue).map(([name, total]) => ({
      name,
      total,
    }));


    const recentBookings = bookings.slice(0, 10);

    // 8. Construction de la réponse
    const response: DashboardStats = {
      totalRevenue,
      totalBookings,
      flightsAvailable,
      averageBookingValue,
      bookingsByStatus,
      revenueByMonth,
      bookingsByFlightType,
      recentBookings,
    };

    res.json(response);
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des statistiques" });
  }
});


// app.put("/api/bookings/:reference", async (req: Request, res: Response) => {
//   const { reference } = req.params;
//   const {
//     passengers,
//     flights: updatedFlights,
//     contactEmail,
//     contactPhone,
//     totalPrice,
//     adminNotes,
//     paymentStatus,
//     bookingReference,
//     typeVol,
//     payment_method
//   } = req.body;

//   console.log(`🔍 DEBUG - Début modification réservation: ${reference}`);
//   console.log(`📦 Données reçues:`, JSON.stringify(req.body, null, 2));

//   let connection;
//   try {
//     connection = await pool.getConnection();
//     await connection.beginTransaction();
//     console.log(`✅ Transaction démarrée`);

//     // 1. Vérifier que la réservation existe
//     const [bookings] = await connection.query<mysql.RowDataPacket[]>(
//       `SELECT 
//           id, 
//           status, 
//           flight_id, 
//           return_flight_id, 
//           passenger_count,
//           booking_reference,
//           total_price,
//           contact_email,
//           contact_phone,
//           type_vol,
//           payment_method
//        FROM bookings 
//        WHERE booking_reference = ? FOR UPDATE`,
//       [reference]
//     );

//     if (bookings.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({
//         success: false,
//         error: "Réservation non trouvée"
//       });
//     }

//     const booking = bookings[0];
//     console.log(`📋 Réservation trouvée: ID ${booking.id}, Flight ID: ${booking.flight_id}`);

//     // 2. VÉRIFIER SI LE NUMÉRO DE VOL A CHANGÉ
//     let flightChanged = false;
//     let flightChangeError = null;
//     let newFlightId = booking.flight_id;
//     let newReturnFlightId = booking.return_flight_id;

//     if (updatedFlights && updatedFlights.length > 0 && updatedFlights[0].code) {
//       try {
//         // Récupérer le vol actuel de la réservation
//         let currentFlightNumber = null;
//         if (booking.flight_id) {
//           const [currentFlights] = await connection.query<mysql.RowDataPacket[]>(
//             "SELECT flight_number FROM flights WHERE id = ?",
//             [booking.flight_id]
//           );

//           if (currentFlights.length > 0) {
//             currentFlightNumber = currentFlights[0].flight_number;
//             console.log(`Numéro du vol actuel: ${currentFlightNumber}`);
//           }
//         }

//         // Vérifier si le numéro de vol a changé
//         if (currentFlightNumber !== updatedFlights[0].code) {
//           console.log(`🔄 Changement de vol détecté: ${currentFlightNumber || 'N/A'} -> ${updatedFlights[0].code}`);

//           // Rechercher le nouveau vol par son numéro (flight_number)
//           const [newFlight] = await connection.query<mysql.RowDataPacket[]>(
//             `SELECT f.id, f.flight_number, f.seats_available, f.type,
//                     l1.code as departure_code, l1.name as departure_name,
//                     l2.code as arrival_code, l2.name as arrival_name
//              FROM flights f
//              JOIN locations l1 ON f.departure_location_id = l1.id
//              JOIN locations l2 ON f.arrival_location_id = l2.id
//              WHERE f.flight_number = ?
//              LIMIT 1 FOR UPDATE`,
//             [updatedFlights[0].code]
//           );

//           if (newFlight.length === 0) {
//             flightChangeError = `Aucun vol trouvé avec le numéro: ${updatedFlights[0].code}`;
//             console.log(`❌ ${flightChangeError}`);
//             await connection.rollback();
//             return res.status(400).json({
//               success: false,
//               error: "Le vol n'existe pas",
//               details: flightChangeError
//             });
//           }

//           console.log(`✅ Nouveau vol trouvé: ID ${newFlight[0].id}, Numéro: ${newFlight[0].flight_number}`);

//           // Vérifier les sièges disponibles
//           const passengerCount = passengers ? passengers.length : booking.passenger_count;
//           if (newFlight[0].seats_available < passengerCount) {
//             flightChangeError = `Pas assez de sièges disponibles. Vol ${newFlight[0].flight_number}: ${newFlight[0].seats_available} sièges disponibles, besoin de ${passengerCount}`;
//             console.log(`❌ ${flightChangeError}`);
//             await connection.rollback();
//             return res.status(400).json({
//               success: false,
//               error: "Pas assez de sièges disponibles",
//               details: flightChangeError,
//               seatsAvailable: newFlight[0].seats_available,
//               passengersNeeded: passengerCount
//             });
//           }

//           // Libérer les sièges de l'ancien vol
//           if (booking.flight_id) {
//             await connection.execute(
//               "UPDATE flights SET seats_available = seats_available + ? WHERE id = ?",
//               [booking.passenger_count, booking.flight_id]
//             );
//             console.log(`🔄 Sièges libérés pour l'ancien vol ID ${booking.flight_id}`);
//           }

//           // Réserver les sièges du nouveau vol
//           await connection.execute(
//             "UPDATE flights SET seats_available = seats_available - ? WHERE id = ?",
//             [passengerCount, newFlight[0].id]
//           );
//           console.log(`✅ Sièges réservés pour le nouveau vol ID ${newFlight[0].id}`);

//           newFlightId = newFlight[0].id;
//           flightChanged = true;

//           // Mettre à jour l'ID du vol dans la réservation
//           await connection.query(
//             "UPDATE bookings SET flight_id = ?, updated_at = NOW() WHERE id = ?",
//             [newFlightId, booking.id]
//           );
//           console.log(`✅ ID du vol mis à jour dans la réservation`);
//         }
//       } catch (error: any) {
//         console.error("❌ Erreur lors de la vérification du vol:", error);
//         await connection.rollback();
//         return res.status(500).json({
//           success: false,
//           error: "Erreur lors de la vérification du vol",
//           details: error.message
//         });
//       }
//     }

//     // 3. Mettre à jour les informations générales de la réservation
//     const updateFields = [];
//     const updateValues = [];

//     if (contactEmail !== undefined) {
//       updateFields.push("contact_email = ?");
//       updateValues.push(contactEmail);
//     }
//     if (contactPhone !== undefined) {
//       updateFields.push("contact_phone = ?");
//       updateValues.push(contactPhone);
//     }
//     if (totalPrice !== undefined) {
//       updateFields.push("total_price = ?");
//       updateValues.push(totalPrice);
//     }
//     if (adminNotes !== undefined) {
//       updateFields.push("adminNotes = ?");
//       updateValues.push(adminNotes);
//     }
//     if (paymentStatus !== undefined) {
//       updateFields.push("status = ?");
//       updateValues.push(paymentStatus);
//     }
//     if (typeVol !== undefined) {
//       updateFields.push("type_vol = ?");
//       updateValues.push(typeVol);
//     }
//     if (payment_method !== undefined) {
//       updateFields.push("payment_method = ?");
//       updateValues.push(payment_method);
//     }

//     if (updateFields.length > 0) {
//       updateValues.push(booking.id);
//       await connection.query(
//         `UPDATE bookings SET ${updateFields.join(", ")}, updated_at = NOW() WHERE id = ?`,
//         updateValues
//       );
//       console.log(`✅ Informations générales mises à jour`);
//     }

//     // 4. GESTION DES SIÈGES - ajustement si nombre de passagers change
//     const oldPassengerCount = booking.passenger_count;
//     const newPassengerCount = passengers ? passengers.length : oldPassengerCount;

//     if (newPassengerCount !== oldPassengerCount && !flightChanged) {
//       console.log(`🔄 Ajustement des sièges: ${oldPassengerCount} → ${newPassengerCount} passagers`);

//       const seatDifference = newPassengerCount - oldPassengerCount;

//       // Mettre à jour le vol actuel
//       if (booking.flight_id) {
//         await connection.execute(
//           "UPDATE flights SET seats_available = seats_available - ? WHERE id = ?",
//           [seatDifference, booking.flight_id]
//         );
//         console.log(`✅ Sièges ajustés pour le vol ${booking.flight_id}: ${seatDifference}`);
//       }

//       // Mettre à jour le vol retour si existe
//       if (booking.return_flight_id) {
//         await connection.execute(
//           "UPDATE flights SET seats_available = seats_available - ? WHERE id = ?",
//           [seatDifference, booking.return_flight_id]
//         );
//         console.log(`✅ Sièges ajustés pour le vol retour ${booking.return_flight_id}: ${seatDifference}`);
//       }
//     }

//     // 5. Mettre à jour les passagers
//     if (passengers && Array.isArray(passengers)) {
//       console.log(`👥 Mise à jour de ${passengers.length} passager(s)`);

//       // Supprimer les anciens passagers
//       await connection.query(
//         `DELETE FROM passengers WHERE booking_id = ?`,
//         [booking.id]
//       );
//       console.log(`🗑️ Anciens passagers supprimés`);
//       const emailResults = [];
//       // Insérer les nouveaux passagers
//       for (const passenger of passengers) {
//         await connection.query(
//           `INSERT INTO passengers (
//             booking_id, first_name, middle_name, last_name,
//             date_of_birth, gender, title, address, type,
//             type_vol, type_v, country, nationality,
//             phone, email, nom_urgence, email_urgence, tel_urgence, created_at, updated_at
//           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//           [
//             booking.id,
//             passenger.firstName || passenger.name || '',
//             passenger.middleName || null,
//             passenger.lastName || '',
//             passenger.dateOfBirth || passenger.dob || null,
//             passenger.gender || "other",
//             passenger.title || "Mr",
//             passenger.address || null,
//             passenger.type || "adult",
//             passenger.typeVol || "plane",
//             passenger.typeVolV || "onway",
//             passenger.country || null,
//             passenger.nationality || null,
//             passenger.phone || null,
//             passenger.email || null,
//             passenger.nom_urgence || null,
//             passenger.email_urgence || null,
//             passenger.tel_urgence || null,
//             new Date(),
//             new Date()
//           ]
//         );

//          const formatDateSafely = (dateString: string, formatString: string) => {
//       try {
//         const date = new Date(dateString);
//         if (isNaN(date.getTime())) {
//           return "Invalid date";
//         }
//         return format(date, formatString);
//       } catch (error) {
//         return "Invalid date";
//       }
//     };


//          const qrCodeDataUrl = `https://barcode.tec-it.com/barcode.ashx?data=${reference}&code=Code128&dpi=96`;

// const emailHtml = `
//   <html>
//     <head>  
//     </head>
//     <body>
//       <style>
//         body {
//           font-family: Arial, sans-serif;
//           line-height: 1.6;
//           color: #333;
//         }
//         .container {
//           max-width: 600px;
//           margin: 0 auto;
//           padding: 20px;
//         }
//         .header {
//           background-color: #f0f7ff;
//           padding: 20px;
//           text-align: center;
//           border-radius: 5px;
//         }
//         .flight-card {

//           padding: 15px;
//           margin-bottom: 20px;
//         }
//         .flight-header {
//           font-size: 18px;
//           font-weight: bold;
//           margin-bottom: 10px;
//         }
//         .flight-details {
//           display: grid;
//           grid-template-columns: 1fr 1fr;
//           gap: 10px;
//         }
//         .passenger-table {
//           width: 100%;
//           border-collapse: collapse;
//           margin-top: 20px;
//         }
//         .passenger-table th,
//         .passenger-table td {
//           border: 1px solid #ddd;
//           padding: 8px;
//           text-align: left;
//         }
//         .passenger-table th {
//           background-color: #f2f2f2;
//         }
//         .footer {
//           margin-top: 30px;
//           font-size: 12px;
//           color: #777;
//           text-align: center;
//         }
//       </style>
//       <div
//         style="
//           font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
//             'Helvetica Neue', Arial, sans-serif;
//           line-height: 1.6;
//           color: #333;
//           max-width: 800px;
//           margin: 0 auto;
//           border: 1px solid #ddd;
//           border-radius: 8px;
//           overflow: hidden;
//         "
//       >
//         <div
//           style="
//             display: block;
//             width: 100%;
//             background-color: #1A237E; /* ou 'blue' */
//             color: white;
//             padding: 20px;
//             text-align: center;
//           "
//           >
//           <img
//             src="https://trogonairways.com/logo-trogonpng.png"
//             alt=""
//             style="height: 55px; vertical-align: middle"
//           />
//           <p style="margin: 5px 0 0; font-size: 1.2em">Your Booking is Confirmed</p>
//         </div>

//         <div style="padding: 8px">
//           <p>
//             Dear ${passenger.firstName} ${passenger.lastName},
//           </p>
//           <p>
//             Thank you for choosing Trogon Airways. Please find your e-ticket below. We
//             recommend printing this section or having it available on your mobile
//             device at the airport.
//           </p>
//         </div>

//         <!-- E-Ticket Section -->
//         <div style="border-top: 2px dashed #ccc; margin: 0 20px; padding-top: 8px">
//             <div style="padding: 8px; text-align: center">
//               <p style="margin: 0; color: #1a237e; font-size: 0.9em">
//                 <strong>Payment Method:</strong>

//                 ${payment_method === "cash" ? "Cash" : payment_method
//                     === "card" ? "Credit/Debit Card" : payment_method === "cheque" ?
//                     "Bank Check" : payment_method === "virement" ? "Bank transfer" :
//                       payment_method === "transfert" ? "Transfer" : "Contrat"}
//               </p>

//               <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Flight Type:</strong> ${typeVol === "helicopter" ? "Helicopter" : "Air Plane"
//                   }</p>
//             </div>

//           <div
//             style="
//               background: rgba(0, 28, 150, 0.3);
//               border: 1px solid #eee;
//               padding: 8px;
//               border-radius: 8px;
//             "
//           >
//             <table width="100%" style="border-collapse: collapse">
//               <tr>
//                 <td style="padding-bottom: 20px; border-bottom: 1px solid #eee">

//                   <span
//                     style="
//                       font-size: 1.5em;
//                       font-weight: bold;
//                       color: #1a237e;
//                       vertical-align: middle;
//                       margin-left: 10px;
//                     "
//                     >Boarding Pass</span
//                   >
//                 </td>
//                 <td style="padding-bottom: 20px; border-bottom: 1px solid #eee; text-align: right;">
//                 <img src="${qrCodeDataUrl}" alt="Booking Barcode" style="height: 50px;">
//               </td>

//               </tr>

//               <tr>
//                 <td colspan="2" style="padding-top: 8px">
//                   <div style="padding: 20px; text-align: center">
//                     <h3 style="color: #1a237e; margin: 0">One Way</h3>
//                   </div>
//                   <h3 style="color: #1a237e; margin: 0">Itinerary</h3>

//                   <table width="100%">
//                     <tr>
//                       <td>
//                         <div class="flight-card">
//                           <div class="flight-header">Outbound Flight</div>
//                           ${updatedFlights.map((f: any, idx: number) => `
//                           <div class="flight-details">
//                             <div>

//                               <strong>From:</strong> ${f.from}<br />
//                               <strong>To:</strong> ${f.to}  <br />
//                               <strong>Date:</strong> ${formatDateSafely(f.date, "EEE, dd MMM yy")} <br />
//                               <strong>Departure:</strong> ${(() => {
//                     try {
//                       const date = new Date(f.date);
//                       return isNaN(date.getTime())
//                         ? "Invalid time"
//                         : date.toLocaleTimeString("fr-FR", {
//                           hour: "2-digit",
//                           minute: "2-digit",
//                         });
//                     } catch (error) {
//                       return "Invalid time";
//                     }
//                   })()} <br />
//                               <strong>Arrival:</strong> ${(() => {
//                     try {
//                       const date = new Date(f.arrival_date);
//                       return isNaN(date.getTime())
//                         ? "Invalid time"
//                         : date.toLocaleTimeString("fr-FR", {
//                           hour: "2-digit",
//                           minute: "2-digit",
//                         });
//                     } catch (error) {
//                       return "Invalid time";
//                     }
//                   })()} <br />

//                               <strong>Flight Number:</strong> ${f.code}
//                           </div>
//                           `).join("")}
//                         </div>
//                       </td>
//                     </tr>
//                   </table>
//                 </td>
//               </tr>

//               <tr>
//                 <td colspan="2" style="padding-top: 8px; border-top: 1px solid #eee">
//                   <h3 style="color: #1a237e; margin: 0 0 10px 0">Passengers</h3>

//                   <p style="margin: 0">
//                     <strong>Adult:</strong> ${passenger.firstName} ${passenger.lastName}<br />
//                     <strong>Email:</strong> ${passenger.email}
//                   </p>

//                 </td>
//               </tr>

//               <tr>
//                 <td colspan="2" style="padding-top: 8px; border-top: 1px solid #eee">
//                   <table width="100%">
//                     <tr>
//                       <td>
//                         <h3 style="color: #1a237e; margin: 0">Booking Details</h3>
//                         <p style="margin: 0; font-size: 0.9em">
//                           <strong>Booking ID:</strong> ${reference}
//                         </p>

//                       </td>
//                       <td style="text-align: right">
//                         <h3 style="color: #1a237e; margin: 0">Payment</h3>
//                         <p style="margin: 0; font-size: 1.1em">
//                           <strong>Total:</strong> $${totalPrice}
//                         </p>
//                         <p style="margin: 0; font-size: 0.9em">
//                           <strong>Status: </strong>
//                           ${payment_method === "cash" ? "Paid" :
//                   payment_method === "card" ? "Paid" :
//                     payment_method === "cheque" ? "Paid" :
//                       payment_method === "virement" ? "Paid" :
//                         payment_method === "transfert" ? "Paid" : "UnPaid"}
//                         </p>
//                       </td>
//                     </tr>
//                   </table>
//                 </td>
//               </tr>
//             </table>
//           </div>
//         </div>
//         <!-- End E-Ticket Section -->

//         ${passenger.typeVol === "plane" ? `
//           <div style="padding: 8px; font-size: 0.9em; color: #555">
//             <p>
//               <strong>Important:</strong> Please arrive at the airport at least 1 hour
//               before your departure time. All passengers must present a valid ID at
//               check-in.
//             </p>
//             <p>
//               <strong>Baggage Limitation: **</strong> The maximum allowance for
//               passenger baggage is 30 lb.
//             </p>
//             <p>
//               <strong>Remarks: **</strong> The company declines all responsibility for
//               flight delays, cancellations, or changes resulting from circumstances
//               beyond its control, such as, technical problems, strikes, or any other
//               problems. The customer is responsible for their own personal arrangements
//               (airport arrival time, travel formalities, etc.). No refund or
//               compensation can be claimed in the event of a missed flight
//               for these reasons.
//             </p>
//             <p>
//               <strong>Remarks 2: **</strong> Any cancellation on the day of or the day
//               before your trip will result in a 50% cancellation fee being charged..
//             </p>
//             <p>We look forward to welcoming you on board.</p>
//             <p>Sincerely,<br />The Trogon Airways Team</p>
//           </div>` :
//           `<div style="padding: 20px; font-size: 0.9em; color: #555;">
//               <p><strong>Important: **</strong> Please arrive at the airport at least 1 hour before your departure time. All passengers must present a valid ID at check-in.</p>
//               <p><strong>Baggage Limitation: **</strong>The maximum allowance for passenger baggage is 20 lb.</p>
//               <p><strong>Remarks: **</strong> The company declines all responsibility for flight delays, cancellations, or changes resulting from circumstances beyond its control, such as, technical problems, strikes, or any other problems. The customer is responsible for their own personal arrangements (airport arrival time, travel formalities, etc.). No refund or compensation can be claimed in the event of a missed flight for these reasons.</p>
//               <p><strong>Remarks 2: **</strong> Any cancellation on the day of or the day before your trip will result in a 50% cancellation fee being charged..</p>
//               <p>We look forward to welcoming you on board.</p>
//               <p>Sincerely,<br>The Trogon Airways Team</p>
//             </div>
//         `}
//       </div>
//       <br /><br /><br />

//       <div
//   style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
//   <div style="background-color: #1A237E; color: white; padding: 20px; text-align: center;">
//     <img src="https://trogonairways.com/logo-trogonpng.png" alt="" style="height: 55px; vertical-align: middle;">
//     <p style="margin: 5px 0 0; font-size: 1.2em;">Votre réservation est confirmée.</p>
//   </div>

//   <div style="padding: 20px;">
//     <p>Cher(e), ${passenger.firstName} ${passenger.lastName},</p>
//     <p>Merci d'avoir choisi Trogon Airways. Veuillez trouver ci-dessous votre billet électronique. Nous vous
//       recommandons d'imprimer cette section ou de la présenter sur votre appareil mobile au comptoire de l'aéroport.</p>
//   </div>

//   <!-- E-Ticket Section -->
//   <div style="border-top: 2px dashed #ccc; margin: 0 20px; padding-top: 20px;">
//     <div style="padding: 20px; text-align: center;">
//       <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Mode de paiement:</strong>


//         ${payment_method === "cash" ? "Cash" : payment_method === "card" ? "Carte bancaire" : payment_method ===
//         "cheque" ? "chèque bancaire" : payment_method === "virement" ? "Virement bancaire" : payment_method ===
//         "transfert" ? "Transfert" : "Contrat"}
//       </p>
//       <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Type de vol:</strong> ${typeVol === "helicopter" ?
//         "Helicopter" : "Avion"}</p>
//     </div>

//     <div style=" background: rgba(0, 28, 150, 0.3);
//               border: 1px solid #eee;
//               padding: 8px;
//               border-radius: 8px;">
//       <table width="100%" style="border-collapse: collapse;">
//         <tr>
//           <td style="padding-bottom: 20px; border-bottom: 1px solid #eee;">

//             <span
//               style="font-size: 1.5em; font-weight: bold; color: #1A237E; vertical-align: middle; margin-left: 10px;">Carte
//               d'embarquement</span>
//           </td>
//          <td style="padding-bottom: 20px; border-bottom: 1px solid #eee; text-align: right;">
//                 <img src="${qrCodeDataUrl}" alt="Booking Barcode" style="height: 50px;">
//               </td>
//         </tr>

//         <tr>
//           <td colspan="2" style="padding-top: 20px;">
//             <div style="padding: 20px; text-align: center;">
//               <h3 style="color: #1A237E; margin: 0;"> Vol Simple</h3>
//             </div>
//             <h3 style="color: #1A237E; margin: 0;">Itinéraire</h3>


//             <table width="100%">
//               <tr>
//                 <td>
//                   <div class="flight-card">
//                     <div class="flight-header">Vol aller</div>


//                     ${updatedFlights.map((f: any, idx: number) => `
//                     <div class="flight-details">
//                       <div>

//                         <strong>De:</strong> ${f.from}<br />
//                         <strong>A:</strong> ${f.to} <br />
//                         <strong>Date:</strong> ${formatDateSafely(f.date, "EEE, dd MMM yy")} <br />
//                         <strong>Départ:</strong> ${(() => {
//                         try {
//                         const date = new Date(f.date);
//                         return isNaN(date.getTime())
//                         ? "Invalid time"
//                         : date.toLocaleTimeString("fr-FR", {
//                         hour: "2-digit",
//                         minute: "2-digit",
//                         });
//                         } catch (error) {
//                         return "Invalid time";
//                         }
//                         })()} <br />
//                         <strong>Arrivée:</strong> ${(() => {
//                         try {
//                         const date = new Date(f.arrival_date);
//                         return isNaN(date.getTime())
//                         ? "Invalid time"
//                         : date.toLocaleTimeString("fr-FR", {
//                         hour: "2-digit",
//                         minute: "2-digit",
//                         });
//                         } catch (error) {
//                         return "Invalid time";
//                         }
//                         })()} <br />

//                         <strong>Numéro du vol:</strong> ${f.code}
//                       </div>
//                       `).join("")}
//                     </div>
//                 </td>

//               </tr>
//             </table>
//           </td>
//         </tr>

//         <tr>
//           <td colspan="2" style="padding-top: 20px; border-top: 1px solid #eee;">
//             <h3 style="color: #1A237E; margin: 0 0 10px 0;">Passager</h3>

//             <p style="margin: 0">
//               <strong>Adult:</strong> ${passenger.firstName} ${passenger.lastName}<br />
//               <strong>Email:</strong> ${passenger.email}
//             </p>



//           </td>
//         </tr>

//         <tr>
//           <td colspan="2" style="padding-top: 20px; border-top: 1px solid #eee;">
//             <table width="100%">
//               <tr>
//                 <td>
//                   <h3 style="color: #1A237E; margin: 0;">Détails de la réservation</h3>
//                   <p style="margin: 0; font-size: 0.9em;"><strong>Réservation ID:</strong> ${reference}</p>

//                 </td>
//                 <td style="text-align: right;">
//                   <h3 style="color: #1A237E; margin: 0;">Paiement</h3>
//                   <p style="margin: 0; font-size: 1.1em;"><strong>Total:</strong> $${totalPrice}</p>
//                   <p style="margin: 0; font-size: 0.9em;"><strong>Status: </strong>

//                     ${payment_method === "cash" ? "Payé" : payment_method === "card" ? "Payé" : payment_method ===
//                     "cheque" ? "Payé" : payment_method === "virement" ? "Payé" : payment_method === "transfert" ? "Payé"
//                     : "Non rémunéré"}
//                   </p>
//                 </td>
//               </tr>
//             </table>
//           </td>
//         </tr>
//       </table>
//     </div>
//   </div>
//   <!-- End E-Ticket Section -->

// ${passenger.typeVol === "plane" ? `<div style="padding: 20px; font-size: 0.9em; color: #555;">
//   <p><strong>Important: **</strong> Veuillez vous présenter à l'aéroport au moins une heure avant votre départ. Tous
//     les passagers doivent présenter une pièce d'identité valide lors de l'enregistrement..</p>
//   <p><strong>Limitation des bagages: **</strong> La franchise maximale pour les bagages des passagers est de 30 lb.
//   </p>
//   <p><strong>Remarques:**</strong> La compagnie décline toute responsabilité en cas de retard, d'annulation ou de
//     modification de vol imputable à des circonstances indépendantes de sa volonté dû à des problèmes techniques,
//     grèves ou tout autre incident ne relevant pas de sa responsabilité.
//     Le client est responsable de ses propres dispositions (heure d'arrivée à l'aéroport, formalités de voyage, etc.).
//     Aucun remboursement ni indemnisation ne sera accordé en cas de vol manqué pour ces raisons.
//   </p>
//   <p><strong>Remarques 2:</strong> Toute annulation le jour même ou la veille de votre voyage, entraînera une retenue
//     de 50% du montant total à titre de frais d'annulation.</p>
//   <p>Nous nous réjouissons de vous accueillir à bord.</p>
//   <p>Cordialement,<br>L'équipe de Trogon Airways</p>
// </div>` : `<div style="padding: 20px; font-size: 0.9em; color: #555;">
//   <p><strong>Important: **</strong> Veuillez vous présenter à l'aéroport au moins une heure avant votre départ. Tous
//     les passagers doivent présenter une pièce d'identité valide lors de l'enregistrement..</p>
//   <p><strong>Limitation des bagages: **</strong> La franchise maximale pour les bagages des passagers est de 20 lb.
//   </p>
//   <p><strong>Remarques:**</strong> La compagnie décline toute responsabilité en cas de retard, d'annulation ou de
//     modification de vol
//     imputable à des circonstances indépendantes de sa volonté dû à des problèmes techniques, grèves ou tout autre
//     incident ne relevant pas de sa responsabilité. Le client est responsable de ses propres dispositions (heure
//     d'arrivée à
//     l'aéroport, formalités de voyage, etc.). Aucun remboursement ni indemnisation ne sera accordé en cas de vol manqué
//     pour ces raisons.</p>
//   <p><strong>Remarques 2: **</strong> Toute annulation le jour même ou la veille de votre voyage, entraînera une
//     retenue de 50% du montant total à titre de frais d'annulation.</p>
//   <p>Nous nous réjouissons de vous accueillir à bord.</p>
//   <p>Cordialement,<br>L'équipe de Trogon Airways</p>
// </div>`}
// </div>
//     </body>
//   </html>
//     `;

//         const emailResult = await sendEmail(
//           passenger.email,
//           "Trogon Airways, New Ticket",
//           emailHtml
//         );

//         console.log(`📊 DEBUG - Résultat email ${passenger.email}:`, emailResult.success ? 'SUCCÈS' : 'ÉCHEC');
//         if (!emailResult.success) {
//           console.log(`❌ DEBUG - Erreur email:`, emailResult.error);
//         }

//         emailResults.push({
//           passenger: passenger.email,
//           success: emailResult.success,
//           error: emailResult.error
//         })
//       }
//       console.log(`✅ ${passengers.length} passager(s) insérés`);

//       // Mettre à jour le nombre de passagers dans la réservation
//       await connection.query(
//         "UPDATE bookings SET passenger_count = ? WHERE id = ?",
//         [passengers.length, booking.id]
//       );
//       console.log(`✅ Nombre de passagers mis à jour: ${passengers.length}`);
//     }

//     // 6. Créer une notification
//     await connection.query(
//       `INSERT INTO notifications (type, message, booking_id, seen, created_at)
//        VALUES (?, ?, ?, ?, ?)`,
//       [
//         flightChanged ? "flight_change" : "update",
//         `Réservation ${reference} modifiée.${flightChanged ? ' Changement de vol effectué.' : ''}`,
//         booking.id,
//         false,
//         new Date()
//       ]
//     );

//     // ✅ COMMIT
//     await connection.commit();
//     console.log(`💾 Transaction commitée`);

//     // Récupérer la réservation mise à jour avec les détails du vol
//     const [updatedBooking] = await connection.query<mysql.RowDataPacket[]>(
//       `SELECT b.*, 
//               f.flight_number as flight_code,
//               l1.name as departure_city,
//               l2.name as arrival_city
//        FROM bookings b
//        LEFT JOIN flights f ON b.flight_id = f.id
//        LEFT JOIN locations l1 ON f.departure_location_id = l1.id
//        LEFT JOIN locations l2 ON f.arrival_location_id = l2.id
//        WHERE b.booking_reference = ?`,
//       [reference]
//     );

//     const [updatedPassengers] = await connection.query<mysql.RowDataPacket[]>(
//       `SELECT * FROM passengers WHERE booking_id = ?`,
//       [booking.id]
//     );

//     res.json({
//       success: true,
//       message: "Réservation mise à jour avec succès",
//       flightChanged: flightChanged,
//       booking: updatedBooking[0],
//       passengers: updatedPassengers,
//       updatedAt: new Date()
//     });

//   } catch (error: any) {
//     console.error("❌ Erreur modification réservation:", error);
//     if (connection) {
//       await connection.rollback();
//     }
//     res.status(500).json({
//       success: false,
//       error: "Échec de la modification de la réservation",
//       details: process.env.NODE_ENV !== "production" ? error.message : undefined,
//       sqlMessage: process.env.NODE_ENV !== "production" ? error.sqlMessage : undefined
//     });
//   } finally {
//     if (connection) {
//       connection.release();
//     }
//     console.log(`🏁 Fin modification réservation: ${reference}`);
//   }
// });





// API pour rechercher un vol par son code


app.put("/api/bookings/:reference", async (req: Request, res: Response) => {
  const { reference } = req.params;
  const {
    passengers,
    flights: updatedFlights,
    contactEmail,
    contactPhone,
    totalPrice,
    adminNotes,
    paymentStatus,
    bookingReference,
    typeVol,
    payment_method,
    flightId,
    returnFlightId
  } = req.body;

  console.log(`🔍 DEBUG - Début modification réservation: ${reference}`);
  console.log(`📦 Données reçues:`, JSON.stringify(req.body, null, 2));

  let connection: mysql.PoolConnection | undefined;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    console.log(`✅ Transaction démarrée`);

    // 1. Vérifier que la réservation existe
    const [bookings] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT 
          id, 
          status, 
          flight_id, 
          return_flight_id, 
          passenger_count,
          booking_reference,
          total_price,
          contact_email,
          contact_phone,
          type_vol,
          payment_method,
          departure_date,
          return_date
       FROM bookings 
       WHERE booking_reference = ? FOR UPDATE`,
      [reference]
    );

    if (bookings.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: "Réservation non trouvée"
      });
    }

    const booking = bookings[0];
    console.log(`📋 Réservation trouvée: ID ${booking.id}, Flight ID: ${booking.flight_id}, Return Flight ID: ${booking.return_flight_id}`);

    // 2. VÉRIFIER SI LES VOLS ONT CHANGÉ (aller ET/OU retour)
    let flightChanged = false;
    let returnFlightChanged = false;
    let newFlightId: number | null = booking.flight_id;
    let newReturnFlightId: number | null = booking.return_flight_id;
    let newFlightDetails: mysql.RowDataPacket | null = null;
    let newReturnFlightDetails: mysql.RowDataPacket | null = null;

    // Fonction pour vérifier et mettre à jour un vol
    const checkAndUpdateFlight = async (
      currentFlightId: number | null,
      newFlightCode: string | undefined,
      flightType: 'aller' | 'retour'
    ) => {
      if (!newFlightCode) return { changed: false, newFlightId: currentFlightId, details: null };

      let currentFlightNumber = null;

      // Récupérer le vol actuel
      if (currentFlightId) {
        const [currentFlights] = await connection!.query<mysql.RowDataPacket[]>(
          "SELECT flight_number FROM flights WHERE id = ?",
          [currentFlightId]
        );

        if (currentFlights.length > 0) {
          currentFlightNumber = currentFlights[0].flight_number;
          console.log(`Numéro du vol ${flightType} actuel: ${currentFlightNumber}`);
        }
      }

      // Vérifier si le numéro de vol a changé
      if (currentFlightNumber !== newFlightCode) {
        console.log(`🔄 Changement de vol ${flightType} détecté: ${currentFlightNumber || 'N/A'} -> ${newFlightCode}`);

        // Rechercher le nouveau vol par son numéro
        const [newFlight] = await connection!.query<mysql.RowDataPacket[]>(
          `SELECT f.id, f.flight_number, f.seats_available, f.type,
                  f.departure_time, f.arrival_time,
                  l1.code as departure_code, l1.name as departure_name,
                  l2.code as arrival_code, l2.name as arrival_name
           FROM flights f
           JOIN locations l1 ON f.departure_location_id = l1.id
           JOIN locations l2 ON f.arrival_location_id = l2.id
           WHERE f.flight_number = ?
           LIMIT 1 FOR UPDATE`,
          [newFlightCode]
        );

        if (newFlight.length === 0) {
          throw new Error(`Aucun vol trouvé avec le numéro: ${newFlightCode}`);
        }

        console.log(`✅ Nouveau vol ${flightType} trouvé: ID ${newFlight[0].id}, Numéro: ${newFlight[0].flight_number}`);

        // Vérifier les sièges disponibles
        const passengerCount = passengers ? passengers.length : booking.passenger_count;
        if (newFlight[0].seats_available < passengerCount) {
          throw new Error(`Pas assez de sièges disponibles. Vol ${newFlight[0].flight_number}: ${newFlight[0].seats_available} sièges disponibles, besoin de ${passengerCount}`);
        }

        // Libérer les sièges de l'ancien vol
        if (currentFlightId) {
          await connection!.execute(
            "UPDATE flights SET seats_available = seats_available + ? WHERE id = ?",
            [booking.passenger_count, currentFlightId]
          );
          console.log(`🔄 Sièges libérés pour l'ancien vol ${flightType} ID ${currentFlightId}`);
        }

        // Réserver les sièges du nouveau vol
        await connection!.execute(
          "UPDATE flights SET seats_available = seats_available - ? WHERE id = ?",
          [passengerCount, newFlight[0].id]
        );
        console.log(`✅ Sièges réservés pour le nouveau vol ${flightType} ID ${newFlight[0].id}`);

        return {
          changed: true,
          newFlightId: newFlight[0].id,
          details: newFlight[0]
        };
      }

      return { changed: false, newFlightId: currentFlightId, details: null };
    };

    // Vérifier le vol aller (index 0)
    if (updatedFlights && updatedFlights.length > 0 && updatedFlights[0]?.code) {
      try {
        const result = await checkAndUpdateFlight(
          booking.flight_id,
          updatedFlights[0].code,
          'aller'
        );

        if (result.changed) {
          flightChanged = true;
          newFlightId = result.newFlightId;
          newFlightDetails = result.details;
        }
      } catch (error: any) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: `Erreur vol aller: ${error.message}`
        });
      }
    }

    // Vérifier le vol retour (index 1) s'il existe
    if (updatedFlights && updatedFlights.length > 1 && updatedFlights[1]?.code) {
      try {
        const result = await checkAndUpdateFlight(
          booking.return_flight_id,
          updatedFlights[1].code,
          'retour'
        );

        if (result.changed) {
          returnFlightChanged = true;
          newReturnFlightId = result.newFlightId;
          newReturnFlightDetails = result.details;
        }
      } catch (error: any) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: `Erreur vol retour: ${error.message}`
        });
      }
    }

    // 3. Mettre à jour les IDs de vol dans la réservation si changement
    if (flightChanged || returnFlightChanged) {
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (flightChanged && newFlightId) {
        updateFields.push("flight_id = ?");
        updateValues.push(newFlightId);
      }

      if (returnFlightChanged && newReturnFlightId) {
        updateFields.push("return_flight_id = ?");
        updateValues.push(newReturnFlightId);
      }

      updateFields.push("updated_at = NOW()");
      updateValues.push(booking.id);

      await connection.query(
        `UPDATE bookings SET ${updateFields.join(", ")} WHERE id = ?`,
        updateValues
      );
      console.log(`✅ IDs de vol mis à jour dans la réservation`);
    }

    // 4. Mettre à jour les informations générales de la réservation
    const updateGeneralFields: string[] = [];
    const updateGeneralValues: any[] = [];

    if (contactEmail !== undefined) {
      updateGeneralFields.push("contact_email = ?");
      updateGeneralValues.push(contactEmail);
    }
    if (contactPhone !== undefined) {
      updateGeneralFields.push("contact_phone = ?");
      updateGeneralValues.push(contactPhone);
    }
    if (totalPrice !== undefined) {
      updateGeneralFields.push("total_price = ?");
      updateGeneralValues.push(totalPrice);
    }
    if (adminNotes !== undefined) {
      updateGeneralFields.push("adminNotes = ?");
      updateGeneralValues.push(adminNotes);
    }
    if (paymentStatus !== undefined) {
      updateGeneralFields.push("status = ?");
      updateGeneralValues.push(paymentStatus);
    }
    if (typeVol !== undefined) {
      updateGeneralFields.push("type_vol = ?");
      updateGeneralValues.push(typeVol);
    }
    if (payment_method !== undefined) {
      updateGeneralFields.push("payment_method = ?");
      updateGeneralValues.push(payment_method);
    }

    if (updateGeneralFields.length > 0) {
      updateGeneralValues.push(booking.id);
      await connection.query(
        `UPDATE bookings SET ${updateGeneralFields.join(", ")}, updated_at = NOW() WHERE id = ?`,
        updateGeneralValues
      );
      console.log(`✅ Informations générales mises à jour`);
    }

    // 5. GESTION DES SIÈGES - ajustement si nombre de passagers change
    const oldPassengerCount = booking.passenger_count;
    const newPassengerCount = passengers ? passengers.length : oldPassengerCount;

    if (newPassengerCount !== oldPassengerCount && !flightChanged && !returnFlightChanged) {
      console.log(`🔄 Ajustement des sièges: ${oldPassengerCount} → ${newPassengerCount} passagers`);

      const seatDifference = newPassengerCount - oldPassengerCount;

      // Mettre à jour le vol aller
      if (booking.flight_id) {
        await connection.execute(
          "UPDATE flights SET seats_available = seats_available - ? WHERE id = ?",
          [seatDifference, booking.flight_id]
        );
        console.log(`✅ Sièges ajustés pour le vol aller ${booking.flight_id}: ${seatDifference}`);
      }

      // Mettre à jour le vol retour si existe
      if (booking.return_flight_id) {
        await connection.execute(
          "UPDATE flights SET seats_available = seats_available - ? WHERE id = ?",
          [seatDifference, booking.return_flight_id]
        );
        console.log(`✅ Sièges ajustés pour le vol retour ${booking.return_flight_id}: ${seatDifference}`);
      }
    }

    // 6. Mettre à jour les passagers et envoyer les emails
    const emailResults = [];

    if (passengers && Array.isArray(passengers)) {
      console.log(`👥 Mise à jour de ${passengers.length} passager(s)`);

      // Supprimer les anciens passagers
      await connection.query(
        `DELETE FROM passengers WHERE booking_id = ?`,
        [booking.id]
      );
      console.log(`🗑️ Anciens passagers supprimés`);

      // Récupérer les informations des vols pour l'email
      const flightInfosForEmail: Array<{
        code: string;
        from: string;
        to: string;
        date: string;
        arrival_date: string;
        type: 'aller' | 'retour';
      }> = [];

      // Vol aller
      if (flightChanged && newFlightDetails) {
        flightInfosForEmail.push({
          code: newFlightDetails.flight_number,
          from: newFlightDetails.departure_name,
          to: newFlightDetails.arrival_name,
          date: newFlightDetails.departure_time,
          arrival_date: newFlightDetails.arrival_time,
          type: 'aller'
        });
      } else if (booking.flight_id) {
        const [flightInfo] = await connection.query<mysql.RowDataPacket[]>(
          `SELECT f.flight_number as code, 
                  f.departure_time as date, 
                  f.arrival_time as arrival_date,
                  l1.name as from_city,
                  l2.name as to_city
           FROM flights f
           JOIN locations l1 ON f.departure_location_id = l1.id
           JOIN locations l2 ON f.arrival_location_id = l2.id
           WHERE f.id = ?`,
          [booking.flight_id]
        );

        if (flightInfo.length > 0) {
          flightInfosForEmail.push({
            code: flightInfo[0].code,
            from: flightInfo[0].from_city,
            to: flightInfo[0].to_city,
            date: flightInfo[0].date,
            arrival_date: flightInfo[0].arrival_date,
            type: 'aller'
          });
        }
      }

      // Vol retour
      if (returnFlightChanged && newReturnFlightDetails) {
        flightInfosForEmail.push({
          code: newReturnFlightDetails.flight_number,
          from: newReturnFlightDetails.departure_name,
          to: newReturnFlightDetails.arrival_name,
          date: newReturnFlightDetails.departure_time,
          arrival_date: newReturnFlightDetails.arrival_time,
          type: 'retour'
        });
      } else if (booking.return_flight_id) {
        const [returnFlightInfo] = await connection.query<mysql.RowDataPacket[]>(
          `SELECT f.flight_number as code, 
                  f.departure_time as date, 
                  f.arrival_time as arrival_date,
                  l1.name as from_city,
                  l2.name as to_city
           FROM flights f
           JOIN locations l1 ON f.departure_location_id = l1.id
           JOIN locations l2 ON f.arrival_location_id = l2.id
           WHERE f.id = ?`,
          [booking.return_flight_id]
        );

        if (returnFlightInfo.length > 0) {
          flightInfosForEmail.push({
            code: returnFlightInfo[0].code,
            from: returnFlightInfo[0].from_city,
            to: returnFlightInfo[0].to_city,
            date: returnFlightInfo[0].date,
            arrival_date: returnFlightInfo[0].arrival_date,
            type: 'retour'
          });
        }
      }

      // Fonctions de formatage
      const formatDateSafely = (dateString: string, formatString: string) => {
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) {
            return "Invalid date";
          }
          return format(date, formatString);
        } catch (error) {
          return "Invalid date";
        }
      };

      const formatTimeSafely = (dateString: string) => {
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) {
            return "Invalid time";
          }
          return date.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          });
        } catch (error) {
          return "Invalid time";
        }
      };

      // Insérer les nouveaux passagers et envoyer les emails
      for (const passenger of passengers) {
        await connection.query(
          `INSERT INTO passengers (
            booking_id, first_name, middle_name, last_name,
            date_of_birth, gender, title, address, type,
            type_vol, type_v, country, nationality,
            phone, email, nom_urgence, email_urgence, tel_urgence, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            booking.id,
            passenger.firstName || passenger.name || '',
            passenger.middleName || null,
            passenger.lastName || '',
            passenger.dateOfBirth || passenger.dob || null,
            passenger.gender || "other",
            passenger.title || "Mr",
            passenger.address || null,
            passenger.type || "adult",
            passenger.typeVol || "plane",
            passenger.typeVolV || "onway",
            passenger.country || null,
            passenger.nationality || null,
            passenger.phone || null,
            passenger.email || null,
            passenger.nom_urgence || null,
            passenger.email_urgence || null,
            passenger.tel_urgence || null,
            new Date(),
            new Date()
          ]
        );

        // Générer le QR Code
        const qrCodeDataUrl = `https://barcode.tec-it.com/barcode.ashx?data=${reference}&code=Code128&dpi=96`;

        // Extraire les vols aller et retour du tableau
        const outboundFlight = flightInfosForEmail.find(f => f.type === 'aller');
        const returnFlight = flightInfosForEmail.find(f => f.type === 'retour');

        const hasOutboundFlight = outboundFlight !== undefined;
        const hasReturnFlight = returnFlight !== undefined;

        // Section HTML pour les détails du vol aller
        const outboundFlightHtml = hasOutboundFlight ? `

  <div class="flight-details">
    <div>
      <strong>From:</strong> ${outboundFlight!.from}<br />
      <strong>To:</strong> ${outboundFlight!.to}<br />
      <strong>Date:</strong> ${formatDateSafely(outboundFlight!.date, "EEE, dd MMM yy")}<br />
      <strong>Departure:</strong> ${formatTimeSafely(outboundFlight!.date)}<br />
      <strong>Arrival:</strong> ${formatTimeSafely(outboundFlight!.arrival_date)}<br />
      <strong>Flight Number:</strong> ${outboundFlight!.code}
    </div>
  </div>
` : `
  <div class="flight-details">
    <div> 
      <strong>Flight Information:</strong> Not available<br />
      <strong>Please contact customer service for flight details.</strong>
    </div>
  </div>
`;

        // Section HTML pour les détails du vol retour
        const returnFlightHtml = hasReturnFlight ? `
  <div class="flight-details">
    <div>
      <strong>From:</strong> ${returnFlight!.from}<br />
      <strong>To:</strong> ${returnFlight!.to}<br />
      <strong>Date:</strong> ${formatDateSafely(returnFlight!.date, "EEE, dd MMM yy")}<br />
      <strong>Departure:</strong> ${formatTimeSafely(returnFlight!.date)}<br />
      <strong>Arrival:</strong> ${formatTimeSafely(returnFlight!.arrival_date)}<br />
      <strong>Flight Number:</strong> ${returnFlight!.code}
    </div>
  </div>
` : '';

        // Section HTML pour les détails du vol aller en français
        const outboundFlightHtmlFr = hasOutboundFlight ? `
  <div class="flight-details">
    <div>
      <strong>De:</strong> ${outboundFlight!.from}<br />
      <strong>À:</strong> ${outboundFlight!.to}<br />
      <strong>Date:</strong> ${formatDateSafely(outboundFlight!.date, "EEE, dd MMM yy")}<br />
      <strong>Départ:</strong> ${formatTimeSafely(outboundFlight!.date)}<br />
      <strong>Arrivée:</strong> ${formatTimeSafely(outboundFlight!.arrival_date)}<br />
      <strong>Numéro du vol:</strong> ${outboundFlight!.code}
    </div>
  </div>
` : `
  <div class="flight-details">
    <div>
      <strong>Informations du vol:</strong> Non disponibles<br />
      <strong>Veuillez contacter le service client pour les détails du vol.</strong>
    </div>
  </div>
`;

        // Section HTML pour les détails du vol retour en français
        const returnFlightHtmlFr = hasReturnFlight ? `
  <div class="flight-details">
    <div>
      <strong>De:</strong> ${returnFlight!.from}<br />
      <strong>À:</strong> ${returnFlight!.to}<br />
      <strong>Date:</strong> ${formatDateSafely(returnFlight!.date, "EEE, dd MMM yy")}<br />
      <strong>Départ:</strong> ${formatTimeSafely(returnFlight!.date)}<br />
      <strong>Arrivée:</strong> ${formatTimeSafely(returnFlight!.arrival_date)}<br />
      <strong>Numéro du vol:</strong> ${returnFlight!.code}
    </div>
  </div>
` : '';

        // EMAIL EN ANGLAIS
        const englishHtml = `
  <!DOCTYPE html>
  <html>

  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trogon Airways - ${flightChanged ? 'Flight Updated' : 'Booking Confirmation'}</title>
  </head>

  <body>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
      }

      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }

      .header {
        background-color: #f0f7ff;
        padding: 20px;
        text-align: center;
        border-radius: 5px;
      }

      .flight-card {

        padding: 15px;
        margin-bottom: 20px;
      }

      .flight-header {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 10px;
      }

      .flight-details {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .passenger-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }

      .passenger-table th,
      .passenger-table td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }

      .passenger-table th {
        background-color: #f2f2f2;
      }

      .footer {
        margin-top: 30px;
        font-size: 12px;
        color: #777;
        text-align: center;
      }
    </style>
    <div style="
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
                'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              border: 1px solid #ddd;
              border-radius: 8px;
              overflow: hidden;
            ">
      <div style="
                display: block;
                width: 100%;
                background-color: #1A237E; /* ou 'blue' */
                color: white;
                padding: 20px;
                text-align: center;
              ">
        <img src="https://trogonairways.com/logo-trogonpng.png" alt="" style="height: 55px; vertical-align: middle" />
        <p style="margin: 5px 0 0; font-size: 1.2em">${flightChanged ? 'Your Flight Has Been Updated' : 'Your Booking is Confirmed'}</p>
      </div>

      <div style="padding: 8px">
        <p>Dear ${passenger.firstName} ${passenger.lastName},</p>
        <p>
          ${flightChanged ?
            'Your flight booking has been updated. Please find your new e-ticket below.' :
            'Thank you for choosing Trogon Airways. Please find your e-ticket below.'}
          We recommend printing this section or having it available on your mobile device at the airport.
        </p>
      </div>

      <!-- E-Ticket Section -->
      <div style="border-top: 2px dashed #ccc; margin: 0 20px; padding-top: 8px">
        <div style="padding: 8px; text-align: center">
          <p style="margin: 0; color: #1a237e; font-size: 0.9em">
            <strong>Payment Method:</strong>

            ${payment_method === "cash" ? "Cash" : payment_method === "card" ? "Credit/Debit Card" :
            payment_method === "cheque" ? "Bank Check" : payment_method === "virement" ? "Bank Transfer" :
              payment_method === "transfert" ? "Transfer" : "Contract"}
          </p>

          <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Flight Type:</strong> ${typeVol === "helicopter"
            ? "Helicopter" : "Air Plane"
          }</p>
          ${flightChanged ?
            `<p style="margin: 10px 0 0; color: #ff9900; font-size: 1em;">
            <strong>⚠️ Important: Your flight details have been updated</strong>
          </p>` : ''}
        </div>

        <div style="
                  background: rgba(0, 28, 150, 0.3);
                  border: 1px solid #eee;
                  padding: 8px;
                  border-radius: 8px;
                ">
          <table width="100%" style="border-collapse: collapse">
            <tr>
              <td style="padding-bottom: 20px; border-bottom: 1px solid #eee">

                <span style="
                          font-size: 1.5em;
                          font-weight: bold;
                          color: #1a237e;
                          vertical-align: middle;
                          margin-left: 10px;
                        ">Boarding Pass</span>
              </td>
              <td style="padding-bottom: 20px; border-bottom: 1px solid #eee; text-align: right;">
                <img src="${qrCodeDataUrl}" alt="Booking Barcode" style="height: 50px;">
              </td>

            </tr>

            <tr>
              <td colspan="2" style="padding-top: 8px">
                <div style="padding: 20px; text-align: center">
                  <h3 style="color: #1a237e; margin: 0">${hasReturnFlight ? "Round Trip" : "One Way"}</h3>
                </div>
                <h3 style="color: #1a237e; margin: 0">Itinerary</h3>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        ${hasOutboundFlight ? `
                          <td width="50%" valign="top" align="left">
                            <div class="flight-card">
                              <div class="flight-header">Outbound Flight</div>
                              ${outboundFlightHtml}
                            </div>
                          </td>
                        ` : ''}
                        ${hasReturnFlight ? `
                          <td width="50%" valign="top">
                            <table align="right" cellpadding="0" cellspacing="0">
                              <tr>
                                <td>
                                  <div class="flight-card">
                                    <div class="flight-header">Return Flight</div>
                                    ${returnFlightHtml}
                                  </div>
                                </td> 
                              </tr>
                            </table>
                          </td>
                        ` : ''}
                      </tr>
                    </table>
              </td>
            </tr>

            <tr>
              <td colspan="2" style="padding-top: 8px; border-top: 1px solid #eee">
                <h3 style="color: #1a237e; margin: 0 0 10px 0">Passengers</h3>

                <p style="margin: 0">
                  <strong>Adult:</strong> ${passenger.firstName} ${passenger.lastName}<br />
                  <strong>Email:</strong> ${passenger.email}
                </p>

              </td>
            </tr>

            <tr>
              <td colspan="2" style="padding-top: 8px; border-top: 1px solid #eee">
                <table width="100%">
                  <tr>
                    <td>
                      <h3 style="color: #1a237e; margin: 0">Booking Details</h3>
                      <p style="margin: 0; font-size: 0.9em">
                        <strong>Booking ID:</strong> ${reference}
                      </p>

                    </td>
                    <td style="text-align: right">
                      <h3 style="color: #1a237e; margin: 0">Payment</h3>
                      <p style="margin: 0; font-size: 1.1em">
                        <strong>Total:</strong> $${totalPrice}
                      </p>
                      <p style="margin: 0; font-size: 0.9em">
                        <strong>Status: </strong>
                        ${payment_method === "cash" || payment_method === "card" || payment_method === "cheque" ||
            payment_method === "virement" || payment_method === "transfert" ? "Paid" : "Unpaid"}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      </div>
      <!-- End E-Ticket Section -->

      ${passenger.typeVol === "plane" ? `
      <div style="padding: 8px; font-size: 0.9em; color: #555">
        <p>
          <strong>Important:</strong> Please arrive at the airport at least 1 hour
          before your departure time. All passengers must present a valid ID at
          check-in.
        </p>
        <p>
          <strong>Baggage Limitation: **</strong> The maximum allowance for
          passenger baggage is 30 lb. <strong>Luggage dimensions 65*40*25</strong>
        </p>
        <p>
          <strong>Remarks: **</strong> The company declines all responsibility for
          flight delays, cancellations, or changes resulting from circumstances
          beyond its control, such as, technical problems, strikes, or any other
          problems. The customer is responsible for their own personal arrangements
          (airport arrival time, travel formalities, etc.). No refund or
          compensation can be claimed in the event of a missed flight
          for these reasons.
        </p>
        <p>
          <strong>Remarks 2: **</strong> Any cancellation on the day of or the day
          before your trip will result in a 50% cancellation fee being charged..
        </p>
        <p>We look forward to welcoming you on board.</p>
        <p>Sincerely,<br />The Trogon Airways Team</p>
      </div>` :
            `<div style="padding: 20px; font-size: 0.9em; color: #555;">
        <p><strong>Important: **</strong> Please arrive at the airport at least 1 hour before your departure time. All
          passengers must present a valid ID at check-in.</p>
        <p><strong>Baggage Limitation: **</strong>The maximum allowance for passenger baggage is 20 lb. <strong>Luggage dimensions 35*55*25, Carry on, soft skin</strong></p>
        <p><strong>Remarks: **</strong> The company declines all responsibility for flight delays, cancellations, or
          changes resulting from circumstances beyond its control, such as, technical problems, strikes, or any other
          problems. The customer is responsible for their own personal arrangements (airport arrival time, travel
          formalities, etc.). No refund or compensation can be claimed in the event of a missed flight for these reasons.
        </p>
        <p><strong>Remarks 2: **</strong> Any cancellation on the day of or the day before your trip will result in a 50%
          cancellation fee being charged..</p>
        <p>We look forward to welcoming you on board.</p>
        <p>Sincerely,<br>The Trogon Airways Team</p>
      </div>
      `}
    </div>

  </body>
  </html>
`;

        // EMAIL EN FRANÇAIS
        const frenchHtml = `
<!DOCTYPE html>
<html>

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trogon Airways - ${flightChanged ? 'Vol Modifié' : 'Réservation Confirmée'}</title>
</head>

<body>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      background-color: #f0f7ff;
      padding: 20px;
      text-align: center;
      border-radius: 5px;
    }

    .flight-card {

      padding: 15px;
      margin-bottom: 20px;
    }

    .flight-header {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 10px;
    }

    .flight-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .passenger-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }

    .passenger-table th,
    .passenger-table td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }

    .passenger-table th {
      background-color: #f2f2f2;
    }

    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #777;
      text-align: center;
    }
  </style>
  <div style="
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
              'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
          ">
    <div style="
              display: block;
              width: 100%;
              background-color: #1A237E; /* ou 'blue' */
              color: white;
              padding: 20px;
              text-align: center;
            ">
      <img src="https://trogonairways.com/logo-trogonpng.png" alt="" style="height: 55px; vertical-align: middle" />
      <p style="margin: 5px 0 0; font-size: 1.2em">${flightChanged ? 'Votre vol a été modifié' : 'Votre réservation est confirmée'}</p>
    </div>

    <div style="padding: 8px">
      <p>Cher(e) ${passenger.firstName} ${passenger.lastName},</p>
      <p>
        ${flightChanged ?
            'Votre réservation de vol a été modifiée. Veuillez trouver votre nouveau billet électronique ci-dessous.' :
            'Merci d\'avoir choisi Trogon Airways. Veuillez trouver votre billet électronique ci-dessous.'}
        Nous vous recommandons d'imprimer cette section ou de la présenter sur votre appareil mobile à l'aéroport.
      </p>
    </div>

    <!-- E-Ticket Section -->
    <div style="border-top: 2px dashed #ccc; margin: 0 20px; padding-top: 8px">
      <div style="padding: 8px; text-align: center">
        <p style="margin: 0; color: #1a237e; font-size: 0.9em">
          <strong>Payment Method:</strong>
          ${payment_method === "cash" ? "Cash" : payment_method === "card" ? "Carte bancaire" :
            payment_method === "cheque" ? "Chèque bancaire" : payment_method === "virement" ? "Virement bancaire" :
              payment_method === "transfert" ? "Transfert" : "Contrat"}
        </p>

        <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Type de vol:</strong> ${typeVol === "helicopter"
            ? "Hélicoptère" : "Avion"}</p>

        ${flightChanged ?
            `<p style="margin: 10px 0 0; color: #ff9900; font-size: 1em;">
          <strong>⚠️ Important: Vos détails de vol ont été modifiés</strong>
        </p>` : ''}
      </div>

      <div style="
                background: rgba(0, 28, 150, 0.3);
                border: 1px solid #eee;
                padding: 8px;
                border-radius: 8px;
              ">
        <table width="100%" style="border-collapse: collapse">
          <tr>
            <td style="padding-bottom: 20px; border-bottom: 1px solid #eee">

              <span style="
                        font-size: 1.5em;
                        font-weight: bold;
                        color: #1a237e;
                        vertical-align: middle;
                        margin-left: 10px;
                      ">Carte d'embarquement</span>
            </td>
            <td style="padding-bottom: 20px; border-bottom: 1px solid #eee; text-align: right;">
              <img src="${qrCodeDataUrl}" alt="Booking Barcode" style="height: 50px;">
            </td>

          </tr>

            <tr>
              <td colspan="2" style="padding-top: 8px">
                <div style="padding: 20px; text-align: center">
                  <h3 style="color: #1a237e; margin: 0">${hasReturnFlight ? "Aller-Retour" : "Simple Aller"}</h3>
                </div>
                <h3 style="color: #1a237e; margin: 0">Itinéraire</h3>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        ${hasOutboundFlight ? `
                          <td width="50%" valign="top" align="left">
                            <div class="flight-card">
                              <div class="flight-header">Vol Aller</div>
                              ${outboundFlightHtmlFr}
                            </div>
                          </td>
                        ` : ''}
                        ${hasReturnFlight ? `
                          <td width="50%" valign="top">
                            <table align="right" cellpadding="0" cellspacing="0">
                              <tr>
                                <td>
                                  <div class="flight-card">
                                    <div class="flight-header">Vol Retour</div>
                                    ${returnFlightHtmlFr}
                                  </div>
                                </td> 
                              </tr>
                            </table>
                          </td>
                        ` : ''}
                      </tr>
                    </table>
              </td>
            </tr>

          <tr>
            <td colspan="2" style="padding-top: 8px; border-top: 1px solid #eee">
              <h3 style="color: #1a237e; margin: 0 0 10px 0">Passager</h3>

              <p style="margin: 0">
                <strong>Adult:</strong> ${passenger.firstName} ${passenger.lastName}<br />
                <strong>Email:</strong> ${passenger.email}
              </p>

            </td>
          </tr>

          <tr>
            <td colspan="2" style="padding-top: 8px; border-top: 1px solid #eee">
              <table width="100%">
                <tr>
                  <td>
                    <h3 style="color: #1a237e; margin: 0">Détails de la Réservation</h3>
                    <p style="margin: 0; font-size: 0.9em">
                      <strong>Réservation ID:</strong> ${reference}
                    </p>

                  </td>
                  <td style="text-align: right">
                    <h3 style="color: #1a237e; margin: 0">Paiement</h3>
                    <p style="margin: 0; font-size: 1.1em">
                      <strong>Total:</strong> $${totalPrice}
                    </p>
                    <p style="margin: 0; font-size: 0.9em">
                      <strong>Status: </strong>
                      ${payment_method === "cash" || payment_method === "card" || payment_method === "cheque" ||
            payment_method === "virement" || payment_method === "transfert" ? "Payé" : "Non payé"}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    </div>
    <!-- End E-Ticket Section -->

    ${passenger.typeVol === "plane" ? `<div style="padding: 20px; font-size: 0.9em; color: #555;">
      <p><strong>Important: **</strong> Veuillez vous présenter à l'aéroport au moins une heure avant votre départ. Tous
        les passagers doivent présenter une pièce d'identité valide lors de l'enregistrement..</p>
      <p><strong>Limitation des bagages: **</strong> La franchise maximale pour les bagages des passagers est de 30 lb. <strong>Mallette dimension 65*40*25</strong>
      </p>
      <p><strong>Remarques:**</strong> La compagnie décline toute responsabilité en cas de retard, d'annulation ou de
        modification de vol imputable à des circonstances indépendantes de sa volonté dû à des problèmes techniques,
        grèves ou tout autre incident ne relevant pas de sa responsabilité.
        Le client est responsable de ses propres dispositions (heure d'arrivée à l'aéroport, formalités de voyage,
        etc.).
        Aucun remboursement ni indemnisation ne sera accordé en cas de vol manqué pour ces raisons.
      </p>
      <p><strong>Remarques 2:</strong> Toute annulation le jour même ou la veille de votre voyage, entraînera une
        retenue
        de 50% du montant total à titre de frais d'annulation.</p>
      <p>Nous nous réjouissons de vous accueillir à bord.</p>
      <p>Cordialement,<br>L'équipe de Trogon Airways</p>
    </div>` : `<div style="padding: 20px; font-size: 0.9em; color: #555;">
      <p><strong>Important: **</strong> Veuillez vous présenter à l'aéroport au moins une heure avant votre départ. Tous
        les passagers doivent présenter une pièce d'identité valide lors de l'enregistrement..</p>
      <p><strong>Limitation des bagages: **</strong> La franchise maximale pour les bagages des passagers est de 20 lb. <strong>Mallette dimension 35*55*25, Carry on, soft skin</strong>
      </p>
      <p><strong>Remarques:**</strong> La compagnie décline toute responsabilité en cas de retard, d'annulation ou de
        modification de vol
        imputable à des circonstances indépendantes de sa volonté dû à des problèmes techniques, grèves ou tout autre
        incident ne relevant pas de sa responsabilité. Le client est responsable de ses propres dispositions (heure
        d'arrivée à
        l'aéroport, formalités de voyage, etc.). Aucun remboursement ni indemnisation ne sera accordé en cas de vol
        manqué
        pour ces raisons.</p>
      <p><strong>Remarques 2: **</strong> Toute annulation le jour même ou la veille de votre voyage, entraînera une
        retenue de 50% du montant total à titre de frais d'annulation.</p>
      <p>Nous nous réjouissons de vous accueillir à bord.</p>
      <p>Cordialement,<br>L'équipe de Trogon Airways</p>
    </div>`}
  </div>

</body>

</html>`;

        // Combiner les deux versions dans un seul email
        const combinedHtml = `${englishHtml}<hr style="margin: 40px 0; border: 1px solid #ddd;">${frenchHtml}`;

        // Envoyer l'email
        const emailResult = await sendEmail(
          passenger.email,
          (flightChanged || returnFlightChanged) ?
            `Trogon Airways - Flight Updated / Vol Modifié - ${reference}` :
            `Trogon Airways - Booking Confirmation / Réservation Confirmée - ${reference}`,
          combinedHtml
        );

        emailResults.push({
          passenger: passenger.email,
          success: emailResult.success,
          error: emailResult.error
        });
      }

      // Mettre à jour le nombre de passagers
      await connection.query(
        "UPDATE bookings SET passenger_count = ? WHERE id = ?",
        [passengers.length, booking.id]
      );
      console.log(`✅ Nombre de passagers mis à jour: ${passengers.length}`);
    }

    // 7. Créer une notification
    await connection.query(
      `INSERT INTO notifications (type, message, booking_id, seen, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        (flightChanged || returnFlightChanged) ? "flight_change" : "update",
        `Réservation ${reference} modifiée.${flightChanged || returnFlightChanged ? ' Changement de vol effectué.' : ''}`,
        booking.id,
        false,
        new Date()
      ]
    );

    // ✅ COMMIT
    await connection.commit();

    // Réponse
    res.json({
      success: true,
      message: "Réservation mise à jour avec succès",
      flightChanged: flightChanged || returnFlightChanged,
      booking: {
        ...booking,
        flight_id: newFlightId,
        return_flight_id: newReturnFlightId
      },
      updatedAt: new Date()
    });

  } catch (error: any) {
    console.error("❌ Erreur modification réservation:", error);
    if (connection) {
      await connection.rollback();
    }
    res.status(500).json({
      success: false,
      error: "Échec de la modification de la réservation",
      details: process.env.NODE_ENV !== "production" ? error.message : undefined
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


// app.put("/api/bookings2/:reference", async (req: Request, res: Response) => {
//   const { reference } = req.params;
//   const {
//     passengers,
//     flights: updatedFlights,
//     contactEmail,
//     contactPhone,
//     totalPrice,
//     adminNotes,
//     paymentStatus,
//     bookingReference,
//     typeVol,
//     payment_method
//   } = req.body;

//   console.log(`🔍 DEBUG - Début modification réservation: ${reference}`);
//   console.log(`📦 Données reçues:`, JSON.stringify(req.body, null, 2));

//   let connection;
//   try {
//     connection = await pool.getConnection();
//     await connection.beginTransaction();
//     console.log(`✅ Transaction démarrée`);

//     // 1. Vérifier que la réservation existe
//     const [bookings] = await connection.query<mysql.RowDataPacket[]>(
//       `SELECT 
//           id, 
//           status, 
//           flight_id, 
//           return_flight_id, 
//           passenger_count,
//           booking_reference,
//           total_price,
//           contact_email,
//           contact_phone,
//           type_vol,
//           payment_method,
//           departure_date
//        FROM bookings 
//        WHERE booking_reference = ? FOR UPDATE`,
//       [reference]
//     );

//     if (bookings.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({
//         success: false,
//         error: "Réservation non trouvée"
//       });
//     }

//     const booking = bookings[0];
//     console.log(`📋 Réservation trouvée: ID ${booking.id}, Flight ID: ${booking.flight_id}`);

//     // 2. VÉRIFIER SI LE NUMÉRO DE VOL A CHANGÉ
//     let flightChanged = false;
//     let newFlightId = booking.flight_id;
//     let newFlightDetails = null;

//     if (updatedFlights && updatedFlights.length > 0 && updatedFlights[0].code) {
//       try {
//         // Récupérer le vol actuel de la réservation
//         let currentFlightNumber = null;
//         if (booking.flight_id) {
//           const [currentFlights] = await connection.query<mysql.RowDataPacket[]>(
//             "SELECT flight_number FROM flights WHERE id = ?",
//             [booking.flight_id]
//           );



//           if (currentFlights.length > 0) {
//             currentFlightNumber = currentFlights[0].flight_number;
//             console.log(`Numéro du vol actuel: ${currentFlightNumber}`);
//           }
//         }

//         // Vérifier si le numéro de vol a changé
//         if (currentFlightNumber !== updatedFlights[0].code) {
//           console.log(`🔄 Changement de vol détecté: ${currentFlightNumber || 'N/A'} -> ${updatedFlights[0].code}`);

//           // Rechercher le nouveau vol par son numéro (flight_number)
//           const [newFlight] = await connection.query<mysql.RowDataPacket[]>(
//             `SELECT f.id, f.flight_number, f.seats_available, f.type,
//                     f.departure_time, f.arrival_time,
//                     l1.code as departure_code, l1.name as departure_name,
//                     l2.code as arrival_code, l2.name as arrival_name
//              FROM flights f
//              JOIN locations l1 ON f.departure_location_id = l1.id
//              JOIN locations l2 ON f.arrival_location_id = l2.id
//              WHERE f.flight_number = ?
//              LIMIT 1 FOR UPDATE`,
//             [updatedFlights[0].code]
//           );

//           if (newFlight.length === 0) {
//             await connection.rollback();
//             return res.status(400).json({
//               success: false,
//               error: "Le vol n'existe pas",
//               details: `Aucun vol trouvé avec le numéro: ${updatedFlights[0].code}`
//             });
//           }

//           console.log(`✅ Nouveau vol trouvé: ID ${newFlight[0].id}, Numéro: ${newFlight[0].flight_number}`);

//           // Vérifier les sièges disponibles
//           const passengerCount = passengers ? passengers.length : booking.passenger_count;
//           if (newFlight[0].seats_available < passengerCount) {
//             await connection.rollback();
//             return res.status(400).json({
//               success: false,
//               error: "Pas assez de sièges disponibles",
//               details: `Vol ${newFlight[0].flight_number}: ${newFlight[0].seats_available} sièges disponibles, besoin de ${passengerCount}`,
//               seatsAvailable: newFlight[0].seats_available,
//               passengersNeeded: passengerCount
//             });
//           }

//           // Libérer les sièges de l'ancien vol
//           if (booking.flight_id) {
//             await connection.execute(
//               "UPDATE flights SET seats_available = seats_available + ? WHERE id = ?",
//               [booking.passenger_count, booking.flight_id]
//             );
//             console.log(`🔄 Sièges libérés pour l'ancien vol ID ${booking.flight_id}`);
//           }

//           // Réserver les sièges du nouveau vol
//           await connection.execute(
//             "UPDATE flights SET seats_available = seats_available - ? WHERE id = ?",
//             [passengerCount, newFlight[0].id]
//           );
//           console.log(`✅ Sièges réservés pour le nouveau vol ID ${newFlight[0].id}`);

//           newFlightId = newFlight[0].id;
//           flightChanged = true;
//           newFlightDetails = newFlight[0];

//           // Mettre à jour l'ID du vol et les dates dans la réservation
//           await connection.query(
//             "UPDATE bookings SET flight_id = ?, departure_date = ?, updated_at = NOW() WHERE id = ?",
//             [newFlightId, newFlight[0].departure_time, booking.id]
//           );
//           console.log(`✅ ID du vol et dates mis à jour dans la réservation`);
//         }
//       } catch (error: any) {
//         console.error("❌ Erreur lors de la vérification du vol:", error);
//         await connection.rollback();
//         return res.status(500).json({
//           success: false,
//           error: "Erreur lors de la vérification du vol",
//           details: error.message
//         });
//       }
//     }

//     // 3. Mettre à jour les informations générales de la réservation
//     const updateFields = [];
//     const updateValues = [];

//     if (contactEmail !== undefined) {
//       updateFields.push("contact_email = ?");
//       updateValues.push(contactEmail);
//     }
//     if (contactPhone !== undefined) {
//       updateFields.push("contact_phone = ?");
//       updateValues.push(contactPhone);
//     }
//     if (totalPrice !== undefined) {
//       updateFields.push("total_price = ?");
//       updateValues.push(totalPrice);
//     }
//     if (adminNotes !== undefined) {
//       updateFields.push("adminNotes = ?");
//       updateValues.push(adminNotes);
//     }
//     if (paymentStatus !== undefined) {
//       updateFields.push("status = ?");
//       updateValues.push(paymentStatus);
//     }
//     if (typeVol !== undefined) {
//       updateFields.push("type_vol = ?");
//       updateValues.push(typeVol);
//     }
//     if (payment_method !== undefined) {
//       updateFields.push("payment_method = ?");
//       updateValues.push(payment_method);
//     }

//     if (updateFields.length > 0) {
//       updateValues.push(booking.id);
//       await connection.query(
//         `UPDATE bookings SET ${updateFields.join(", ")}, updated_at = NOW() WHERE id = ?`,
//         updateValues
//       );
//       console.log(`✅ Informations générales mises à jour`);
//     }

//     // 4. GESTION DES SIÈGES - ajustement si nombre de passagers change
//     const oldPassengerCount = booking.passenger_count;
//     const newPassengerCount = passengers ? passengers.length : oldPassengerCount;

//     if (newPassengerCount !== oldPassengerCount && !flightChanged) {
//       console.log(`🔄 Ajustement des sièges: ${oldPassengerCount} → ${newPassengerCount} passagers`);

//       const seatDifference = newPassengerCount - oldPassengerCount;

//       // Mettre à jour le vol actuel
//       if (booking.flight_id) {
//         await connection.execute(
//           "UPDATE flights SET seats_available = seats_available - ? WHERE id = ?",
//           [seatDifference, booking.flight_id]
//         );
//         console.log(`✅ Sièges ajustés pour le vol ${booking.flight_id}: ${seatDifference}`);
//       }

//       // Mettre à jour le vol retour si existe
//       if (booking.return_flight_id) {
//         await connection.execute(
//           "UPDATE flights SET seats_available = seats_available - ? WHERE id = ?",
//           [seatDifference, booking.return_flight_id]
//         );
//         console.log(`✅ Sièges ajustés pour le vol retour ${booking.return_flight_id}: ${seatDifference}`);
//       }
//     }

//     // 5. Mettre à jour les passagers et envoyer les emails
//     const emailResults = [];


//     if (passengers && Array.isArray(passengers)) {
//       console.log(`👥 Mise à jour de ${passengers.length} passager(s)`);

//       // Supprimer les anciens passagers
//       await connection.query(
//         `DELETE FROM passengers WHERE booking_id = ?`,
//         [booking.id]
//       );
//       console.log(`🗑️ Anciens passagers supprimés`);

//       // Récupérer les informations du vol pour l'email - CORRECTION ICI
//       // Récupérer les informations du vol pour l'email - CORRECTION ICI
//       let flightInfoForEmail: {
//         code: string;
//         from: string;
//         to: string;
//         date: string;
//         arrival_date: string;
//       } | null = null;

//       if (flightChanged && newFlightDetails) {
//         // Utiliser les informations du nouveau vol
//         flightInfoForEmail = {
//           code: newFlightDetails.flight_number,
//           from: newFlightDetails.departure_name,
//           to: newFlightDetails.arrival_name,
//           date: newFlightDetails.departure_time,
//           arrival_date: newFlightDetails.arrival_time
//         };
//         console.log(`✅ Informations du NOUVEAU vol pour l'email:`, flightInfoForEmail);
//       } else {
//         // Récupérer les informations du vol actuel
//         if (booking.flight_id) {
//           const [currentFlightInfo] = await connection.query<mysql.RowDataPacket[]>(
//             `SELECT f.flight_number as code, 
//               f.departure_time as date, 
//               f.arrival_time as arrival_date,
//               l1.name as departure_city,
//               l2.name as arrival_city
//        FROM flights f
//        JOIN locations l1 ON f.departure_location_id = l1.id
//        JOIN locations l2 ON f.arrival_location_id = l2.id
//        WHERE f.id = ?`,
//             [booking.flight_id]
//           );

//           if (currentFlightInfo.length > 0) {
//             flightInfoForEmail = {
//               code: currentFlightInfo[0].code,
//               from: currentFlightInfo[0].departure_city,
//               to: currentFlightInfo[0].arrival_city,
//               date: currentFlightInfo[0].date,
//               arrival_date: currentFlightInfo[0].arrival_date
//             };
//             console.log(`✅ Informations du vol ACTUEL pour l'email:`, flightInfoForEmail);
//           } else {
//             console.log(`⚠️ Aucune information de vol trouvée pour l'ID ${booking.flight_id}`);

//             // Alternative: utiliser les données envoyées depuis le frontend
//             if (updatedFlights && updatedFlights.length > 0) {
//               flightInfoForEmail = {
//                 code: updatedFlights[0].code || 'N/A',
//                 from: updatedFlights[0].from || 'N/A',
//                 to: updatedFlights[0].to || 'N/A',
//                 date: updatedFlights[0].date || 'N/A',
//                 arrival_date: updatedFlights[0].arrival_date || 'N/A'
//               };
//               console.log(`✅ Utilisation des données du frontend pour l'email:`, flightInfoForEmail);
//             }
//           }
//         } else {
//           console.log(`⚠️ Aucun flight_id dans la réservation`);
//         }
//       }

//       // Fonction pour formater les dates
//       const formatDateSafely = (dateString: string, formatString: string) => {
//         try {
//           const date = new Date(dateString);
//           if (isNaN(date.getTime())) {
//             return "Invalid date";
//           }
//           return format(date, formatString);
//         } catch (error) {
//           return "Invalid date";
//         }
//       };

//       // Fonction pour formater l'heure
//       const formatTimeSafely = (dateString: string) => {
//         try {
//           const date = new Date(dateString);
//           if (isNaN(date.getTime())) {
//             return "Invalid time";
//           }
//           return date.toLocaleTimeString("fr-FR", {
//             hour: "2-digit",
//             minute: "2-digit",
//           });
//         } catch (error) {
//           return "Invalid time";
//         }
//       };

//       // Insérer les nouveaux passagers et envoyer les emails
//       for (const passenger of passengers) {
//         await connection.query(
//           `INSERT INTO passengers (
//         booking_id, first_name, middle_name, last_name,
//         date_of_birth, gender, title, address, type,
//         type_vol, type_v, country, nationality,
//         phone, email, nom_urgence, email_urgence, tel_urgence, created_at, updated_at
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//           [
//             booking.id,
//             passenger.firstName || passenger.name || '',
//             passenger.middleName || null,
//             passenger.lastName || '',
//             passenger.dateOfBirth || passenger.dob || null,
//             passenger.gender || "other",
//             passenger.title || "Mr",
//             passenger.address || null,
//             passenger.type || "adult",
//             passenger.typeVol || "plane",
//             passenger.typeVolV || "onway",
//             passenger.country || null,
//             passenger.nationality || null,
//             passenger.phone || null,
//             passenger.email || null,
//             passenger.nom_urgence || null,
//             passenger.email_urgence || null,
//             passenger.tel_urgence || null,
//             new Date(),
//             new Date()
//           ]
//         );

//         // Générer le QR Code
//         const qrCodeDataUrl = `https://barcode.tec-it.com/barcode.ashx?data=${reference}&code=Code128&dpi=96`;



//         // Section HTML pour les détails du vol (à insérer dans vos emails)
//         // Vérifier si on a des informations de vol pour l'email
//         const hasFlightInfo = flightInfoForEmail !== null;

//         // Section HTML pour les détails du vol (à insérer dans vos emails)
//         const flightDetailsHtml = hasFlightInfo ? `
//   <div class="flight-details">
//     <div>
//       <strong>From:</strong> ${flightInfoForEmail!.from}<br />
//       <strong>To:</strong> ${flightInfoForEmail!.to}<br />
//       <strong>Date:</strong> ${formatDateSafely(flightInfoForEmail!.date, "EEE, dd MMM yy")}<br />
//       <strong>Departure:</strong> ${formatTimeSafely(flightInfoForEmail!.date)}<br />
//       <strong>Arrival:</strong> ${formatTimeSafely(flightInfoForEmail!.arrival_date)}<br />
//       <strong>Flight Number:</strong> ${flightInfoForEmail!.code}
//     </div>
//   </div>
// ` : `
//   <div class="flight-details">
//     <div> 
//       <strong>Flight Information:</strong> Not available<br />
//       <strong>Please contact customer service for flight details.</strong>
//     </div>
//   </div>
// `;

//         // Section HTML pour les détails du vol en français
//         const flightDetailsHtmlFr = hasFlightInfo ? `
//   <div class="flight-details">
//     <div>
//       <strong>De:</strong> ${flightInfoForEmail!.from}<br />
//       <strong>À:</strong> ${flightInfoForEmail!.to}<br />
//       <strong>Date:</strong> ${formatDateSafely(flightInfoForEmail!.date, "EEE, dd MMM yy")}<br />
//       <strong>Départ:</strong> ${formatTimeSafely(flightInfoForEmail!.date)}<br />
//       <strong>Arrivée:</strong> ${formatTimeSafely(flightInfoForEmail!.arrival_date)}<br />
//       <strong>Numéro du vol:</strong> ${flightInfoForEmail!.code}
//     </div>
//   </div>
// ` : `
//   <div class="flight-details">
//     <div>
//       <strong>Informations du vol:</strong> Non disponibles<br />
//       <strong>Veuillez contacter le service client pour les détails du vol.</strong>
//     </div>
//   </div>
// `;



//         // EMAIL EN ANGLAIS
//         const englishHtml = `
//   <!DOCTYPE html>
//   <html>

//   <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>Trogon Airways - ${flightChanged ? 'Flight Updated' : 'Booking Confirmation'}</title>
//   </head>

//   <body>
//     <style>
//       body {
//         font-family: Arial, sans-serif;
//         line-height: 1.6;
//         color: #333;
//       }

//       .container {
//         max-width: 600px;
//         margin: 0 auto;
//         padding: 20px;
//       }

//       .header {
//         background-color: #f0f7ff;
//         padding: 20px;
//         text-align: center;
//         border-radius: 5px;
//       }

//       .flight-card {

//         padding: 15px;
//         margin-bottom: 20px;
//       }

//       .flight-header {
//         font-size: 18px;
//         font-weight: bold;
//         margin-bottom: 10px;
//       }

//       .flight-details {
//         display: grid;
//         grid-template-columns: 1fr 1fr;
//         gap: 10px;
//       }

//       .passenger-table {
//         width: 100%;
//         border-collapse: collapse;
//         margin-top: 20px;
//       }

//       .passenger-table th,
//       .passenger-table td {
//         border: 1px solid #ddd;
//         padding: 8px;
//         text-align: left;
//       }

//       .passenger-table th {
//         background-color: #f2f2f2;
//       }

//       .footer {
//         margin-top: 30px;
//         font-size: 12px;
//         color: #777;
//         text-align: center;
//       }
//     </style>
//     <div style="
//               font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
//                 'Helvetica Neue', Arial, sans-serif;
//               line-height: 1.6;
//               color: #333;
//               max-width: 800px;
//               margin: 0 auto;
//               border: 1px solid #ddd;
//               border-radius: 8px;
//               overflow: hidden;
//             ">
//       <div style="
//                 display: block;
//                 width: 100%;
//                 background-color: #1A237E; /* ou 'blue' */
//                 color: white;
//                 padding: 20px;
//                 text-align: center;
//               ">
//         <img src="https://trogonairways.com/logo-trogonpng.png" alt="" style="height: 55px; vertical-align: middle" />
//         <p style="margin: 5px 0 0; font-size: 1.2em">${flightChanged ? 'Your Flight Has Been Updated' : 'Your Booking is Confirmed'}</p>
//       </div>

//       <div style="padding: 8px">
//         <p>Dear ${passenger.firstName} ${passenger.lastName},</p>
//         <p>
//           ${flightChanged ?
//             'Your flight booking has been updated. Please find your new e-ticket below.' :
//             'Thank you for choosing Trogon Airways. Please find your e-ticket below.'}
//           We recommend printing this section or having it available on your mobile device at the airport.
//         </p>
//       </div>

//       <!-- E-Ticket Section -->
//       <div style="border-top: 2px dashed #ccc; margin: 0 20px; padding-top: 8px">
//         <div style="padding: 8px; text-align: center">
//           <p style="margin: 0; color: #1a237e; font-size: 0.9em">
//             <strong>Payment Method:</strong>

//             ${payment_method === "cash" ? "Cash" : payment_method === "card" ? "Credit/Debit Card" :
//             payment_method === "cheque" ? "Bank Check" : payment_method === "virement" ? "Bank Transfer" :
//               payment_method === "transfert" ? "Transfer" : "Contract"}
//           </p>

//           <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Flight Type:</strong> ${typeVol === "helicopter"
//             ? "Helicopter" : "Air Plane"
//           }</p>
//           ${flightChanged ?
//             `<p style="margin: 10px 0 0; color: #ff9900; font-size: 1em;">
//             <strong>⚠️ Important: Your flight details have been updated</strong>
//           </p>` : ''}
//         </div>

//         <div style="
//                   background: rgba(0, 28, 150, 0.3);
//                   border: 1px solid #eee;
//                   padding: 8px;
//                   border-radius: 8px;
//                 ">
//           <table width="100%" style="border-collapse: collapse">
//             <tr>
//               <td style="padding-bottom: 20px; border-bottom: 1px solid #eee">

//                 <span style="
//                           font-size: 1.5em;
//                           font-weight: bold;
//                           color: #1a237e;
//                           vertical-align: middle;
//                           margin-left: 10px;
//                         ">Boarding Pass</span>
//               </td>
//               <td style="padding-bottom: 20px; border-bottom: 1px solid #eee; text-align: right;">
//                 <img src="${qrCodeDataUrl}" alt="Booking Barcode" style="height: 50px;">
//               </td>

//             </tr>

//             <tr>
//               <td colspan="2" style="padding-top: 8px">
//                 <div style="padding: 20px; text-align: center">
//                   <h3 style="color: #1a237e; margin: 0">One Way</h3>
//                 </div>
//                 <h3 style="color: #1a237e; margin: 0">Itinerary</h3>

//                 <table width="100%">
//                   <tr>
//                     <td>
//                       <div class="flight-card">
//                         <div class="flight-header">Outbound Flight</div>
//                         ${flightDetailsHtml}
//                     </td>
//                   </tr>
//                 </table>
//               </td>
//             </tr>

//             <tr>
//               <td colspan="2" style="padding-top: 8px; border-top: 1px solid #eee">
//                 <h3 style="color: #1a237e; margin: 0 0 10px 0">Passengers</h3>

//                 <p style="margin: 0">
//                   <strong>Adult:</strong> ${passenger.firstName} ${passenger.lastName}<br />
//                   <strong>Email:</strong> ${passenger.email}
//                 </p>

//               </td>
//             </tr>

//             <tr>
//               <td colspan="2" style="padding-top: 8px; border-top: 1px solid #eee">
//                 <table width="100%">
//                   <tr>
//                     <td>
//                       <h3 style="color: #1a237e; margin: 0">Booking Details</h3>
//                       <p style="margin: 0; font-size: 0.9em">
//                         <strong>Booking ID:</strong> ${reference}
//                       </p>

//                     </td>
//                     <td style="text-align: right">
//                       <h3 style="color: #1a237e; margin: 0">Payment</h3>
//                       <p style="margin: 0; font-size: 1.1em">
//                         <strong>Total:</strong> $${totalPrice}
//                       </p>
//                       <p style="margin: 0; font-size: 0.9em">
//                         <strong>Status: </strong>
//                         ${payment_method === "cash" || payment_method === "card" || payment_method === "cheque" ||
//             payment_method === "virement" || payment_method === "transfert" ? "Paid" : "Unpaid"}
//                       </p>
//                     </td>
//                   </tr>
//                 </table>
//               </td>
//             </tr>
//           </table>
//         </div>
//       </div>
//       <!-- End E-Ticket Section -->

//       ${passenger.typeVol === "plane" ? `
//       <div style="padding: 8px; font-size: 0.9em; color: #555">
//         <p>
//           <strong>Important:</strong> Please arrive at the airport at least 1 hour
//           before your departure time. All passengers must present a valid ID at
//           check-in.
//         </p>
//         <p>
//           <strong>Baggage Limitation: **</strong> The maximum allowance for
//           passenger baggage is 30 lb.
//         </p>
//         <p>
//           <strong>Remarks: **</strong> The company declines all responsibility for
//           flight delays, cancellations, or changes resulting from circumstances
//           beyond its control, such as, technical problems, strikes, or any other
//           problems. The customer is responsible for their own personal arrangements
//           (airport arrival time, travel formalities, etc.). No refund or
//           compensation can be claimed in the event of a missed flight
//           for these reasons.
//         </p>
//         <p>
//           <strong>Remarks 2: **</strong> Any cancellation on the day of or the day
//           before your trip will result in a 50% cancellation fee being charged..
//         </p>
//         <p>We look forward to welcoming you on board.</p>
//         <p>Sincerely,<br />The Trogon Airways Team</p>
//       </div>` :
//             `<div style="padding: 20px; font-size: 0.9em; color: #555;">
//         <p><strong>Important: **</strong> Please arrive at the airport at least 1 hour before your departure time. All
//           passengers must present a valid ID at check-in.</p>
//         <p><strong>Baggage Limitation: **</strong>The maximum allowance for passenger baggage is 20 lb.</p>
//         <p><strong>Remarks: **</strong> The company declines all responsibility for flight delays, cancellations, or
//           changes resulting from circumstances beyond its control, such as, technical problems, strikes, or any other
//           problems. The customer is responsible for their own personal arrangements (airport arrival time, travel
//           formalities, etc.). No refund or compensation can be claimed in the event of a missed flight for these reasons.
//         </p>
//         <p><strong>Remarks 2: **</strong> Any cancellation on the day of or the day before your trip will result in a 50%
//           cancellation fee being charged..</p>
//         <p>We look forward to welcoming you on board.</p>
//         <p>Sincerely,<br>The Trogon Airways Team</p>
//       </div>
//       `}
//     </div>

//   </body>
//   </html>
// `;

//         // EMAIL EN FRANÇAIS
//         const frenchHtml = `
// <!DOCTYPE html>
// <html>

// <head>
//   <meta charset="UTF-8">
//   <meta name="viewport" content="width=device-width, initial-scale=1.0">
//   <title>Trogon Airways - ${flightChanged ? 'Vol Modifié' : 'Réservation Confirmée'}</title>
// </head>

// <body>
//   <style>
//     body {
//       font-family: Arial, sans-serif;
//       line-height: 1.6;
//       color: #333;
//     }

//     .container {
//       max-width: 600px;
//       margin: 0 auto;
//       padding: 20px;
//     }

//     .header {
//       background-color: #f0f7ff;
//       padding: 20px;
//       text-align: center;
//       border-radius: 5px;
//     }

//     .flight-card {

//       padding: 15px;
//       margin-bottom: 20px;
//     }

//     .flight-header {
//       font-size: 18px;
//       font-weight: bold;
//       margin-bottom: 10px;
//     }

//     .flight-details {
//       display: grid;
//       grid-template-columns: 1fr 1fr;
//       gap: 10px;
//     }

//     .passenger-table {
//       width: 100%;
//       border-collapse: collapse;
//       margin-top: 20px;
//     }

//     .passenger-table th,
//     .passenger-table td {
//       border: 1px solid #ddd;
//       padding: 8px;
//       text-align: left;
//     }

//     .passenger-table th {
//       background-color: #f2f2f2;
//     }

//     .footer {
//       margin-top: 30px;
//       font-size: 12px;
//       color: #777;
//       text-align: center;
//     }
//   </style>
//   <div style="
//             font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
//               'Helvetica Neue', Arial, sans-serif;
//             line-height: 1.6;
//             color: #333;
//             max-width: 800px;
//             margin: 0 auto;
//             border: 1px solid #ddd;
//             border-radius: 8px;
//             overflow: hidden;
//           ">
//     <div style="
//               display: block;
//               width: 100%;
//               background-color: #1A237E; /* ou 'blue' */
//               color: white;
//               padding: 20px;
//               text-align: center;
//             ">
//       <img src="https://trogonairways.com/logo-trogonpng.png" alt="" style="height: 55px; vertical-align: middle" />
//       <p style="margin: 5px 0 0; font-size: 1.2em">${flightChanged ? 'Votre vol a été modifié' : 'Votre réservation est confirmée'}</p>
//     </div>

//     <div style="padding: 8px">
//       <p>Cher(e) ${passenger.firstName} ${passenger.lastName},</p>
//       <p>
//         ${flightChanged ?
//             'Votre réservation de vol a été modifiée. Veuillez trouver votre nouveau billet électronique ci-dessous.' :
//             'Merci d\'avoir choisi Trogon Airways. Veuillez trouver votre billet électronique ci-dessous.'}
//         Nous vous recommandons d'imprimer cette section ou de la présenter sur votre appareil mobile à l'aéroport.
//       </p>
//     </div>

//     <!-- E-Ticket Section -->
//     <div style="border-top: 2px dashed #ccc; margin: 0 20px; padding-top: 8px">
//       <div style="padding: 8px; text-align: center">
//         <p style="margin: 0; color: #1a237e; font-size: 0.9em">
//           <strong>Payment Method:</strong>
//           ${payment_method === "cash" ? "Cash" : payment_method === "card" ? "Carte bancaire" :
//             payment_method === "cheque" ? "Chèque bancaire" : payment_method === "virement" ? "Virement bancaire" :
//               payment_method === "transfert" ? "Transfert" : "Contrat"}
//         </p>

//         <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Type de vol:</strong> ${typeVol === "helicopter"
//             ? "Hélicoptère" : "Avion"}</p>

//         ${flightChanged ?
//             `<p style="margin: 10px 0 0; color: #ff9900; font-size: 1em;">
//           <strong>⚠️ Important: Vos détails de vol ont été modifiés</strong>
//         </p>` : ''}
//       </div>

//       <div style="
//                 background: rgba(0, 28, 150, 0.3);
//                 border: 1px solid #eee;
//                 padding: 8px;
//                 border-radius: 8px;
//               ">
//         <table width="100%" style="border-collapse: collapse">
//           <tr>
//             <td style="padding-bottom: 20px; border-bottom: 1px solid #eee">

//               <span style="
//                         font-size: 1.5em;
//                         font-weight: bold;
//                         color: #1a237e;
//                         vertical-align: middle;
//                         margin-left: 10px;
//                       ">Carte d'embarquement</span>
//             </td>
//             <td style="padding-bottom: 20px; border-bottom: 1px solid #eee; text-align: right;">
//               <img src="${qrCodeDataUrl}" alt="Booking Barcode" style="height: 50px;">
//             </td>

//           </tr>

//           <tr>
//             <td colspan="2" style="padding-top: 8px">
//               <div style="padding: 20px; text-align: center">
//                 <h3 style="color: #1a237e; margin: 0">Vol Simple</h3>
//               </div>
//               <h3 style="color: #1a237e; margin: 0">Itinéraire</h3>

//               <table width="100%">
//                 <tr>
//                   <td>
//                     <div class="flight-card">
//                       <div class="flight-header">Vol Aller</div>
//                       ${flightDetailsHtmlFr}
//                   </td>
//                 </tr>
//               </table>
//             </td>
//           </tr>

//           <tr>
//             <td colspan="2" style="padding-top: 8px; border-top: 1px solid #eee">
//               <h3 style="color: #1a237e; margin: 0 0 10px 0">Passager</h3>

//               <p style="margin: 0">
//                 <strong>Adult:</strong> ${passenger.firstName} ${passenger.lastName}<br />
//                 <strong>Email:</strong> ${passenger.email}
//               </p>

//             </td>
//           </tr>

//           <tr>
//             <td colspan="2" style="padding-top: 8px; border-top: 1px solid #eee">
//               <table width="100%">
//                 <tr>
//                   <td>
//                     <h3 style="color: #1a237e; margin: 0">Détails de la Réservation</h3>
//                     <p style="margin: 0; font-size: 0.9em">
//                       <strong>Réservation ID:</strong> ${reference}
//                     </p>

//                   </td>
//                   <td style="text-align: right">
//                     <h3 style="color: #1a237e; margin: 0">Paiement</h3>
//                     <p style="margin: 0; font-size: 1.1em">
//                       <strong>Total:</strong> $${totalPrice}
//                     </p>
//                     <p style="margin: 0; font-size: 0.9em">
//                       <strong>Status: </strong>
//                       ${payment_method === "cash" || payment_method === "card" || payment_method === "cheque" ||
//             payment_method === "virement" || payment_method === "transfert" ? "Payé" : "Non payé"}
//                     </p>
//                   </td>
//                 </tr>
//               </table>
//             </td>
//           </tr>
//         </table>
//       </div>
//     </div>
//     <!-- End E-Ticket Section -->

//     ${passenger.typeVol === "plane" ? `<div style="padding: 20px; font-size: 0.9em; color: #555;">
//       <p><strong>Important: **</strong> Veuillez vous présenter à l'aéroport au moins une heure avant votre départ. Tous
//         les passagers doivent présenter une pièce d'identité valide lors de l'enregistrement..</p>
//       <p><strong>Limitation des bagages: **</strong> La franchise maximale pour les bagages des passagers est de 30 lb.
//       </p>
//       <p><strong>Remarques:**</strong> La compagnie décline toute responsabilité en cas de retard, d'annulation ou de
//         modification de vol imputable à des circonstances indépendantes de sa volonté dû à des problèmes techniques,
//         grèves ou tout autre incident ne relevant pas de sa responsabilité.
//         Le client est responsable de ses propres dispositions (heure d'arrivée à l'aéroport, formalités de voyage,
//         etc.).
//         Aucun remboursement ni indemnisation ne sera accordé en cas de vol manqué pour ces raisons.
//       </p>
//       <p><strong>Remarques 2:</strong> Toute annulation le jour même ou la veille de votre voyage, entraînera une
//         retenue
//         de 50% du montant total à titre de frais d'annulation.</p>
//       <p>Nous nous réjouissons de vous accueillir à bord.</p>
//       <p>Cordialement,<br>L'équipe de Trogon Airways</p>
//     </div>` : `<div style="padding: 20px; font-size: 0.9em; color: #555;">
//       <p><strong>Important: **</strong> Veuillez vous présenter à l'aéroport au moins une heure avant votre départ. Tous
//         les passagers doivent présenter une pièce d'identité valide lors de l'enregistrement..</p>
//       <p><strong>Limitation des bagages: **</strong> La franchise maximale pour les bagages des passagers est de 20 lb.
//       </p>
//       <p><strong>Remarques:**</strong> La compagnie décline toute responsabilité en cas de retard, d'annulation ou de
//         modification de vol
//         imputable à des circonstances indépendantes de sa volonté dû à des problèmes techniques, grèves ou tout autre
//         incident ne relevant pas de sa responsabilité. Le client est responsable de ses propres dispositions (heure
//         d'arrivée à
//         l'aéroport, formalités de voyage, etc.). Aucun remboursement ni indemnisation ne sera accordé en cas de vol
//         manqué
//         pour ces raisons.</p>
//       <p><strong>Remarques 2: **</strong> Toute annulation le jour même ou la veille de votre voyage, entraînera une
//         retenue de 50% du montant total à titre de frais d'annulation.</p>
//       <p>Nous nous réjouissons de vous accueillir à bord.</p>
//       <p>Cordialement,<br>L'équipe de Trogon Airways</p>
//     </div>`}
//   </div>

// </body>

// </html>`;

//         // Combiner les deux versions dans un seul email
//         const combinedHtml = `${englishHtml}<hr style="margin: 40px 0; border: 1px solid #ddd;">${frenchHtml}`;

//         // Envoyer l'email
//         const emailResult = await sendEmail(
//           passenger.email,
//           flightChanged ?
//             `Trogon Airways - Flight Updated / Vol Modifié - ${reference}` :
//             `Trogon Airways - Booking Confirmation / Réservation Confirmée - ${reference}`,
//           combinedHtml
//         );

//         console.log(`📧 Email envoyé à ${passenger.email}:`, emailResult.success ? 'SUCCÈS' : 'ÉCHEC');
//         if (!emailResult.success) {
//           console.log(`❌ Erreur email:`, emailResult.error);
//         }

//         emailResults.push({
//           passenger: passenger.email,
//           success: emailResult.success,
//           error: emailResult.error
//         });
//       }
//       console.log(`✅ ${passengers.length} passager(s) insérés et emails envoyés`);

//       // Mettre à jour le nombre de passagers dans la réservation
//       await connection.query(
//         "UPDATE bookings SET passenger_count = ? WHERE id = ?",
//         [passengers.length, booking.id]
//       );
//       console.log(`✅ Nombre de passagers mis à jour: ${passengers.length}`);
//     }

//     // 6. Créer une notification
//     await connection.query(
//       `INSERT INTO notifications (type, message, booking_id, seen, created_at)
//        VALUES (?, ?, ?, ?, ?)`,
//       [
//         flightChanged ? "flight_change" : "update",
//         `Réservation ${reference} modifiée.${flightChanged ? ' Changement de vol effectué.' : ''}`,
//         booking.id,
//         false,
//         new Date()
//       ]
//     );

//     // ✅ COMMIT
//     await connection.commit();
//     console.log(`💾 Transaction commitée`);

//     // Récupérer la réservation mise à jour avec les détails du vol
//     const [updatedBooking] = await connection.query<mysql.RowDataPacket[]>(
//       `SELECT b.*, 
//               f.flight_number as flight_code,
//               l1.name as departure_city,
//               l2.name as arrival_city,
//               f.departure_time,
//               f.arrival_time
//        FROM bookings b
//        LEFT JOIN flights f ON b.flight_id = f.id
//        LEFT JOIN locations l1 ON f.departure_location_id = l1.id
//        LEFT JOIN locations l2 ON f.arrival_location_id = l2.id
//        WHERE b.booking_reference = ?`,
//       [reference]
//     );

//     const [updatedPassengers] = await connection.query<mysql.RowDataPacket[]>(
//       `SELECT * FROM passengers WHERE booking_id = ?`,
//       [booking.id]
//     );

//     res.json({
//       success: true,
//       message: "Réservation mise à jour avec succès",
//       flightChanged: flightChanged,
//       booking: updatedBooking[0],
//       passengers: updatedPassengers,
//       emailResults: emailResults,
//       updatedAt: new Date()
//     });

//   } catch (error: any) {
//     console.error("❌ Erreur modification réservation:", error);
//     if (connection) {
//       await connection.rollback();
//     }
//     res.status(500).json({
//       success: false,
//       error: "Échec de la modification de la réservation",
//       details: process.env.NODE_ENV !== "production" ? error.message : undefined,
//       sqlMessage: process.env.NODE_ENV !== "production" ? error.sqlMessage : undefined
//     });
//   } finally {
//     if (connection) {
//       connection.release();
//     }
//     console.log(`🏁 Fin modification réservation: ${reference}`);
//   }
// });



app.get("/api/flights/:flightNumber", async (req: Request, res: Response) => {
  try {
    const { flightNumber } = req.params;

    if (!flightNumber) {
      return res.status(400).json({
        error: "Le numéro de vol est requis",
      });
    }

    // Requête pour trouver le vol par numéro
    const [flights] = await pool.query(
      `SELECT f.*, dep.code AS departure_code, dep.name AS departure_name,
              arr.code AS arrival_code, arr.name AS arrival_name
       FROM flights f
       JOIN locations dep ON f.departure_location_id = dep.id
       JOIN locations arr ON f.arrival_location_id = arr.id
       WHERE f.flight_number = ?`,
      [flightNumber]
    );

    const flightArray = flights as any[];

    if (flightArray.length === 0) {
      return res.status(404).json({ error: "Vol non trouvé" });
    }

    // Retourne le vol trouvé
    const flight = flightArray[0];

    res.json({
      flight_number: flight.flight_number,
      type: flight.type,
      departure_time: flight.departure_time,
      arrival_time: flight.arrival_time,
      fromCity: flight.departure_name,
      from: flight.departure_code,
      toCity: flight.arrival_name,
      to: flight.arrival_code,
      price: flight.price,
    });
  } catch (err) {
    console.error("Erreur:", err);
    res.status(500).json({
      error: "Erreur serveur",
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

export default app;



app.get("/api/flights/search", async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Le code du vol est requis" });
  }

  try {
    const [flights] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT id, code, seats_available, departure, arrival FROM flights WHERE code = ?",
      [code]
    );

    res.json(flights);
  } catch (error) {
    console.error("Erreur recherche vol:", error);
    res.status(500).json({ error: "Erreur lors de la recherche du vol" });
  }
});


// API pour modifier une réservation (passagers, vols, etc.)







// API pour récupérer les détails d'une réservation par référence

app.get("/api/bookings/:reference", async (req: Request, res: Response) => {
  const { reference } = req.params;

  try {
    // Récupérer la réservation avec les informations utilisateur
    const [bookings] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT 
          b.*,
          u.name as created_by_name,
          u.email as created_by_email
       FROM bookings b
       LEFT JOIN users u ON b.user_created_booking = u.id
       WHERE b.booking_reference = ?`,
      [reference]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Réservation non trouvée"
      });
    }

    const booking = bookings[0];

    // Récupérer les passagers
    const [passengers] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT * FROM passengers WHERE booking_id = ?`,
      [booking.id]
    );

    // Récupérer les vols
    const flightIds = [booking.flight_id];
    if (booking.return_flight_id) {
      flightIds.push(booking.return_flight_id);
    }

    const [flights] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT 
          f.*,
          dep.name AS departure_airport_name,
          dep.city AS departure_city,
          dep.code AS departure_code,
          arr.name AS arrival_airport_name,
          arr.city AS arrival_city,
          arr.code AS arrival_code
       FROM flights f
       JOIN locations dep ON f.departure_location_id = dep.id
       JOIN locations arr ON f.arrival_location_id = arr.id
       WHERE f.id IN (?)`,
      [flightIds]
    );

    res.json({
      success: true,
      booking: {
        ...booking,
        passengers: passengers,
        flights: flights
      }
    });

  } catch (error) {
    console.error("❌ Erreur récupération réservation:", error);
    res.status(500).json({
      success: false,
      error: "Échec de la récupération de la réservation",
      details: error instanceof Error ? error.message : "Erreur inconnue"
    });
  }
});


// app.get("/api/booking-plane", async (req: Request, res: Response) => {
//     let connection;
//     try {

//         // 1. Récupérer les réservations avec un typage explicite
//    const [bookingRows] = await pool.query<mysql.RowDataPacket[]>(
//             `SELECT 
//                 b.id, 
//                 b.booking_reference, 
//                 b.payment_intent_id, 
//                 b.total_price, 
//                 b.status, 
//                 b.created_at, 
//                 b.passenger_count, 
//                 b.payment_method, 
//                 b.contact_email, 
//                 b.type_vol, 
//                 b.type_v,
//                 u.name as created_by_name,  
//                 u.email as created_by_email 
//             FROM bookings b
//             LEFT JOIN users u ON b.user_created_booking = u.id  
//             WHERE b.type_vol = ?
//             ORDER BY b.created_at DESC`,
//             ["plane"]
//         );
//         // Convertir en type Booking[]
//         const bookings: Booking[] = bookingRows.map((row) => ({
//             id: row.id,
//             booking_reference: row.booking_reference,
//             payment_intent_id: row.payment_intent_id,
//             total_price: Number(row.total_price),
//             status: row.status,
//             created_at: new Date(row.created_at).toISOString(),
//             passenger_count: row.passenger_count,
//             payment_method: row.payment_method,
//             contact_email: row.contact_email,
//             type_vol: row.type_vol,
//             type_v: row.type_v,
//             created_by_name: row.created_by_name,  // AJOUT DU CHAMP
//             created_by_email: row.created_by_email // AJOUT DU CHAMP (optionnel)
//         }));

//          const recentBookings = bookings.slice(0, 10);

//         // 8. Construction de la réponse
//         const response: BookingStats = {
//             recentBookings,
//         };

//         res.json(response);
//     } catch (error) {
//         console.error("Dashboard error:", error);
//         res.status(500).json({ error: "Erreur lors de la récupération des statistiques" });
//     } 
// });


// Endpoint pour les données du dashboard

app.get("/api/booking-plane", async (req: Request, res: Response) => {
  try {
    const [bookingRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT 
                  b.id,
  b.booking_reference, 
  b.payment_intent_id,
  b.total_price,
  b.status,
  b.created_at,
  b.passenger_count,
  b.payment_method,
  b.contact_email,
  b.type_vol,
  b.type_v,
  u.name AS created_by_name,
  u.email AS created_by_email,
  p.first_name,
  p.last_name
FROM bookings b
LEFT JOIN users u ON b.user_created_booking = u.id
LEFT JOIN passengers p 
  ON p.id = (
    SELECT id FROM passengers
    WHERE booking_id = b.id
    ORDER BY id ASC
    LIMIT 1
  )
            WHERE b.type_vol = ?
            ORDER BY b.created_at DESC`,
      ["plane"]
    );

    const bookings: Booking[] = bookingRows.map((row) => ({
      id: row.id,
      booking_reference: row.booking_reference,
      payment_intent_id: row.payment_intent_id,
      total_price: Number(row.total_price),
      status: row.status,
      created_at: row.created_at,
      passenger_count: row.passenger_count,
      payment_method: row.payment_method,
      contact_email: row.contact_email,
      first_name: row.first_name,
      last_name: row.last_name,
      type_vol: row.type_vol,
      type_v: row.type_v,
      created_by_name: row.created_by_name,
      created_by_email: row.created_by_email
    }));

    // 👉 IMPORTANT : envoyer TOUTES les réservations
    res.json({ recentBookings: bookings });

  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Erreur lors de la récupération" });
  }
});



// 🔍 Recherche avancée sur les bookings avion
app.get("/api/booking-plane-search", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, transactionType, status, name } = req.query;

    // Conditions dynamiques
    let conditions = " WHERE b.type_vol = 'plane' ";
    const params: any[] = [];

    // 🔹 Aucun filtre → date du jour
    if (!startDate && !endDate && !transactionType && !status && !name) {
      conditions += " AND DATE(b.created_at) = CURDATE() ";
    }

    // 🔹 Avec Date Début
    if (startDate) {
      conditions += " AND DATE(b.created_at) >= ? ";
      params.push(startDate);
    }

    // 🔹 Avec Date Fin
    if (endDate) {
      conditions += " AND DATE(b.created_at) <= ? ";
      params.push(endDate);
    }

    // 🔹 Avec type de transaction
    if (transactionType) {
      conditions += " AND b.payment_method = ? ";
      params.push(transactionType);
    }

    // 🔹 Avec type de status
    if (status) {
      conditions += " AND b.status = ? ";
      params.push(status);
    }

    // 🔹 Avec nom du client
    if (name) {
      conditions += " AND p.first_name LIKE ? ";
      params.push(`%${name}%`);
    }

    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT 
                b.id, 
                b.booking_reference, 
                b.payment_intent_id, 
                b.total_price, 
                b.status, 
                b.created_at, 
                b.passenger_count, 
                b.payment_method, 
                b.contact_email, 
                b.type_vol, 
                b.type_v,
                p.first_name,
                u.name AS created_by_name,
                u.email AS created_by_email
            FROM bookings b
            LEFT JOIN users u ON b.user_created_booking = u.id
            LEFT JOIN passengers p ON b.id = p.booking_id
            ${conditions}
            ORDER BY b.created_at DESC`,
      params
    );

    res.json({ bookings: rows });

  } catch (error) {
    console.error("Erreur recherche booking:", error);
    res.status(500).json({ error: "Erreur lors de la recherche" });
  }
});



app.get("/api/booking-plane-export", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, transactionType, status, name } = req.query;

    let conditions = " WHERE b.type_vol = 'plane' ";
    const params: any[] = [];

    // Filtre dates
    if (startDate) {
      conditions += " AND DATE(b.created_at) >= ? ";
      params.push(startDate);
    }

    if (endDate) {
      conditions += " AND DATE(b.created_at) <= ? ";
      params.push(endDate);
    }

    // Filtre payment_method (insensible à la casse + espaces)
    if (transactionType) {
      conditions += " AND LOWER(TRIM(b.payment_method)) = LOWER(TRIM(?)) ";
      params.push(transactionType);
    }

    // Filtre status
    if (status) {
      conditions += " AND b.status = ? ";
      params.push(status);
    }

    // Filtre name
    if (name) {
      conditions += " AND p.first_name LIKE ? ";
      params.push(`%${name}%`);
    }

    // 🟦 EXÉCUTION SQL + typage RowDataPacket[]
    const [rowsUntyped] = await pool.query(`
            SELECT 
                b.booking_reference,
                b.payment_intent_id,
                b.type_vol,
                b.type_v,
                b.contact_email,
                b.total_price,
                b.passenger_count,
                b.status,
                b.payment_method,
                p.first_name,
                p.last_name,
                u.name AS created_by_name,
                b.created_at
            FROM bookings b
            LEFT JOIN users u ON b.user_created_booking = u.id
            LEFT JOIN passengers p ON b.id = p.booking_id
            ${conditions}
            ORDER BY b.created_at DESC
        `, params);

    const rows = rowsUntyped as mysql.RowDataPacket[];

    // 🟩 Génération Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Bookings");

    // 1️⃣ Titre fusionné
    sheet.mergeCells('A1:K1');
    const headerRow = sheet.getRow(1);
    headerRow.getCell(1).value = "TROGON AVION TRANSACTIONS";
    headerRow.getCell(1).font = { bold: true, size: 14 };
    headerRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // 2️⃣ En-têtes
    const headers = [
      "Booking Reference",
      "Payment Ref",
      "Type",
      "Trajet",
      "Client",
      "Email",
      "Total",
      "Passagers",
      "Status",
      "Méthode",
      "Créé par",
      "Date"
    ];

    const titleRow = sheet.addRow(headers);
    titleRow.eachCell((cell) => {
      cell.font = { bold: true };
    });

    // 3️⃣ Définition des colonnes
    sheet.columns = [
      { key: "booking_reference" },
      { key: "payment_intent_id" },
      { key: "type_vol" },
      { key: "type_v" },
      { key: "first_name" },
      { key: "contact_email" },
      { key: "total_price" },
      { key: "passenger_count" },
      { key: "status" },
      { key: "payment_method" },
      { key: "created_by_name" },
      { key: "created_at" }
    ];

    // 4️⃣ Ajout des données
    rows.forEach((row) => {
      sheet.addRow([
        row.booking_reference,
        row.payment_intent_id,
        row.type_vol,
        row.type_v,
        `${row.first_name} ${row.last_name}`,
        row.contact_email,
        row.total_price,
        row.passenger_count,
        row.status === "confirmed" ? "Paid" : row.status === "pending" ? "Unpaid" : "Cancelled",
        row.payment_method,
        row.created_by_name,
        row.created_at
      ]);
    });

    // 5️⃣ Auto-size colonnes
    sheet.columns.forEach((column) => {
      if (column && column.eachCell) {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const len = cell.value ? cell.value.toString().length : 10;
          if (len > maxLength) maxLength = len;
        });
        column.width = maxLength + 2;
      }
    });

    // 6️⃣ Headers HTTP
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Trogon Transactions Avion.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Erreur Excel:", error);
    res.status(500).json({ error: "Erreur export Excel" });
  }
});


app.get("/api/booking-helico", async (req: Request, res: Response) => {
  try {
    const [bookingRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT 
  b.id,
  b.booking_reference, 
  b.payment_intent_id,
  b.total_price,
  b.status,
  b.created_at,
  b.passenger_count,
  b.payment_method,
  b.contact_email,
  b.type_vol,
  b.type_v,
  u.name AS created_by_name,
  u.email AS created_by_email,
  p.first_name,
  p.last_name
FROM bookings b
LEFT JOIN users u ON b.user_created_booking = u.id
LEFT JOIN passengers p 
  ON p.id = (
    SELECT id FROM passengers
    WHERE booking_id = b.id
    ORDER BY id ASC
    LIMIT 1
  )
           
            WHERE b.type_vol = ?
            ORDER BY b.created_at DESC`,
      ["helicopter"]
    );

    const bookings: Booking[] = bookingRows.map((row) => ({
      id: row.id,
      booking_reference: row.booking_reference,
      payment_intent_id: row.payment_intent_id,
      total_price: Number(row.total_price),
      status: row.status,
      created_at: row.created_at,
      passenger_count: row.passenger_count,
      payment_method: row.payment_method,
      first_name: row.first_name,
      last_name: row.last_name,
      contact_email: row.contact_email,
      type_vol: row.type_vol,
      type_v: row.type_v,
      created_by_name: row.created_by_name,
      created_by_email: row.created_by_email
    }));

    // 👉 IMPORTANT : envoyer TOUTES les réservations
    res.json({ recentBookings: bookings });

  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Erreur lors de la récupération" });
  }
});


app.get("/api/booking-helico-search", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, transactionType, status, name } = req.query;

    // Conditions dynamiques
    let conditions = " WHERE b.type_vol = 'helicopter' ";
    const params: any[] = [];

    // 🔹 Aucun filtre → date du jour
    if (!startDate && !endDate && !transactionType && !status && !name) {
      conditions += " AND DATE(b.created_at) = CURDATE() ";
    }

    // 🔹 Avec Date Début
    if (startDate) {
      conditions += " AND DATE(b.created_at) >= ? ";
      params.push(startDate);
    }

    // 🔹 Avec Date Fin
    if (endDate) {
      conditions += " AND DATE(b.created_at) <= ? ";
      params.push(endDate);
    }

    // 🔹 Avec type de transaction
    if (transactionType) {
      conditions += " AND b.payment_method = ? ";
      params.push(transactionType);
    }

    // 🔹 Avec type de status
    if (status) {
      conditions += " AND b.status = ? ";
      params.push(status);
    }

       // 🔹 Avec type de name
        if (name) {
      conditions += " AND p.first_name LIKE ? ";
      params.push(`%${name}%`);
    }

    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT 
                b.id, 
                b.booking_reference, 
                b.payment_intent_id, 
                b.total_price, 
                b.status, 
                b.created_at, 
                b.passenger_count, 
                b.payment_method, 
                b.contact_email, 
                b.type_vol, 
                b.type_v,
                p.first_name,
                u.name AS created_by_name,
                u.email AS created_by_email
            FROM bookings b
            LEFT JOIN users u ON b.user_created_booking = u.id
            LEFT JOIN passengers p ON b.id = p.booking_id
            ${conditions}
            ORDER BY b.created_at DESC`,
      params
    );

    res.json({ bookings: rows });

  } catch (error) {
    console.error("Erreur recherche booking:", error);
    res.status(500).json({ error: "Erreur lors de la recherche" });
  }
});


app.get("/api/flighttablehelico", async (req: Request, res: Response) => {
  let connection;
  try {


    const query = `
            SELECT 
                f.id,
                f.flight_number,
                f.type,
                f.airline,
                f.departure_time,
                f.arrival_time,
                f.price,
                f.seats_available,
                dep.name AS departure_airport_name,
                dep.city AS departure_city,
                dep.code AS departure_code,
                arr.name AS arrival_airport_name,
                arr.city AS arrival_city,
                arr.code AS arrival_code
            FROM 
                flights f
            JOIN 
                locations dep ON f.departure_location_id = dep.id
            JOIN 
                locations arr ON f.arrival_location_id = arr.id
            WHERE 
                f.type = 'helicopter'    
            ORDER BY 
                f.departure_time ASC
        `;

    console.log("Exécution de la requête SQL...");
    const [flights] = await pool.query<FlightWithAirports[]>(query);
    console.log("Requête exécutée avec succès. Nombre de vols:", flights.length);

    // Formater les données
    const formattedFlights = flights.map((flight) => ({
      id: flight.id,
      flight_number: flight.flight_number,
      type: flight.type,
      airline: flight.airline,
      from: `${flight.departure_airport_name} (${flight.departure_code})`,
      to: `${flight.arrival_airport_name} (${flight.arrival_code})`,
      departure: flight.departure_time,
      arrival: flight.arrival_time,
      price: flight.price,
      seats_available: flight.seats_available.toString(),
      departure_city: flight.departure_city,
      arrival_city: flight.arrival_city,
    }));


    res.json(formattedFlights);
  } catch (err) {
    console.error("ERREUR DÉTAILLÉE:", {
      message: err instanceof Error ? err.message : "Erreur inconnue",
      stack: err instanceof Error ? err.stack : undefined,

    });

    if (connection)
      res.status(500).json({
        error: "Erreur serveur",
        details: process.env.NODE_ENV !== "production" ? (err instanceof Error ? err.message : "Erreur inconnue") : undefined,
      });
  }
});

app.get("/api/flighttablehelico2", async (req: Request, res: Response) => {
  let connection;
  try {


    const query = `
            SELECT 
                f.id,
                f.flight_number,
                f.type,
                f.airline,
                f.departure_time,
                f.arrival_time,
                f.price,
                f.seats_available,
                dep.name AS departure_airport_name,
                dep.city AS departure_city,
                dep.code AS departure_code,
                arr.name AS arrival_airport_name,
                arr.city AS arrival_city,
                arr.code AS arrival_code
            FROM 
                flights f
            JOIN 
                locations dep ON f.departure_location_id = dep.id
            JOIN 
                locations arr ON f.arrival_location_id = arr.id
            WHERE 
                f.type = 'helicopter'    
            ORDER BY 
                f.departure_time ASC
        `;

    console.log("Exécution de la requête SQL...");
    const [flights] = await pool.query<FlightWithAirports[]>(query);
    console.log("Requête exécutée avec succès. Nombre de vols:", flights.length);

    // Formater les données
    const formattedFlights = flights.map((flight) => ({
      id: flight.id,
      flight_number: flight.flight_number,
      type: flight.type,
      airline: flight.airline,
      from: `${flight.departure_airport_name} (${flight.departure_code})`,
      to: `${flight.arrival_airport_name} (${flight.arrival_code})`,
      departure: flight.departure_time,
      arrival: flight.arrival_time,
      price: flight.price,
      seats_available: flight.seats_available.toString(),
      departure_city: flight.departure_city,
      arrival_city: flight.arrival_city,
    }));


     // 👉 IMPORTANT : envoyer TOUTES les réservations
    res.json({ recentBookings: formattedFlights });
  } catch (err) {
    console.error("ERREUR DÉTAILLÉE:", {
      message: err instanceof Error ? err.message : "Erreur inconnue",
      stack: err instanceof Error ? err.stack : undefined,

    });

    if (connection)
      res.status(500).json({
        error: "Erreur serveur",
        details: process.env.NODE_ENV !== "production" ? (err instanceof Error ? err.message : "Erreur inconnue") : undefined,
      });
  }
});



app.get("/api/flight-helico-search", async (req: Request, res: Response) => {
  try {
    // const { startDate, endDate, transactionType, status, name } = req.query;
    const { flightNumb, tailNumber, dateDeparture } = req.query;

    // Conditions dynamiques
    let conditions = " WHERE f.type = 'helicopter' ";
    const params: any[] = [];

  
    if (flightNumb) {
      conditions += "  AND f.flight_number = ? ";
      params.push(flightNumb);
    }

   
    if (tailNumber) {
      conditions += "  AND f.airline = ? ";
      params.push(tailNumber);
    }

   
    if (dateDeparture) {
     
      conditions += " AND DATE(f.departure_time) = ? ";
      params.push(dateDeparture);
    }

   

    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT 
                f.id,
                f.flight_number,
                f.type,
                f.airline,
                f.departure_time,
                f.arrival_time,
                f.price,
                f.seats_available,
                dep.name AS departure_airport_name,
                dep.city AS departure_city,
                dep.code AS departure_code,
                arr.name AS arrival_airport_name,
                arr.city AS arrival_city,
                arr.code AS arrival_code
            FROM 
                flights f
            JOIN 
                locations dep ON f.departure_location_id = dep.id
            JOIN 
                locations arr ON f.arrival_location_id = arr.id
            ${conditions}
            ORDER BY f.created_at DESC`,
      params
    );

       

    // Formater les données
    const formattedFlights = rows.map((flight) => ({
      id: flight.id,
      flight_number: flight.flight_number,
      type: flight.type,
      airline: flight.airline,
      from: `${flight.departure_airport_name} (${flight.departure_code})`,
      to: `${flight.arrival_airport_name} (${flight.arrival_code})`,
      departure: flight.departure_time,
      arrival: flight.arrival_time,
      price: flight.price,
      seats_available: flight.seats_available.toString(),
      departure_city: flight.departure_city,
      arrival_city: flight.arrival_city,
    }));


     // 👉 IMPORTANT : envoyer TOUTES les réservations
    res.json({ bookings: formattedFlights });

   

  } catch (error) {
    console.error("Erreur recherche booking:", error);
    res.status(500).json({ error: "Erreur lors de la recherche" });
  }
});

app.get("/api/booking-helico-export", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, transactionType, status, name } = req.query;

    let conditions = " WHERE b.type_vol = 'helicopter' ";
    const params: any[] = [];

    // Filtre dates
    if (startDate) {
      conditions += " AND DATE(b.created_at) >= ? ";
      params.push(startDate);
    }

    if (endDate) {
      conditions += " AND DATE(b.created_at) <= ? ";
      params.push(endDate);
    }

    // Filtre payment_method (insensible à la casse + espaces)
    if (transactionType) {
      conditions += " AND LOWER(TRIM(b.payment_method)) = LOWER(TRIM(?)) ";
      params.push(transactionType);
    }

    // Filtre status
    if (status) {
      conditions += " AND b.status = ? ";
      params.push(status);
    }

    // Filtre name
    if (name) {
      conditions += " AND p.first_name LIKE ? ";
      params.push(`%${name}%`);
    }

    // 🟦 EXÉCUTION SQL + typage RowDataPacket[]
    const [rowsUntyped] = await pool.query(`
            SELECT 
                b.booking_reference,
                b.payment_intent_id,
                b.type_vol,
                b.type_v,
                b.contact_email,
                b.total_price,
                b.passenger_count,
                b.status,
                b.payment_method,
                p.first_name,
                p.last_name
                u.name AS created_by_name,
                b.created_at
            FROM bookings b
            LEFT JOIN users u ON b.user_created_booking = u.id
            LEFT JOIN passengers p ON b.id = p.booking_id
            ${conditions}
            ORDER BY b.created_at DESC
        `, params);

    const rows = rowsUntyped as mysql.RowDataPacket[];

    // 🟩 Génération Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Bookings");

    // 1️⃣ Titre fusionné
    sheet.mergeCells('A1:K1');
    const headerRow = sheet.getRow(1);
    headerRow.getCell(1).value = "TROGON AVION TRANSACTIONS";
    headerRow.getCell(1).font = { bold: true, size: 14 };
    headerRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // 2️⃣ En-têtes
    const headers = [
      "Booking Reference",
      "Payment Ref",
      "Type",
      "Trajet",
      "Client",
      "Email",
      "Total",
      "Passagers",
      "Status",
      "Méthode",
      "Créé par",
      "Date"
    ];

    const titleRow = sheet.addRow(headers);
    titleRow.eachCell((cell) => {
      cell.font = { bold: true };
    });

    // 3️⃣ Définition des colonnes
    sheet.columns = [
      { key: "booking_reference" },
      { key: "payment_intent_id" },
      { key: "type_vol" },
      { key: "type_v" },
      { key: "first_name"},
      { key: "contact_email" },
      { key: "total_price" },
      { key: "passenger_count" },
      { key: "status" },
      { key: "payment_method" },
      { key: "created_by_name" },
      { key: "created_at" }
    ];

    // 4️⃣ Ajout des données
    rows.forEach((row) => {
      sheet.addRow([
        row.booking_reference,
        row.payment_intent_id,
        row.type_vol,
        row.type_v,
        `${row.first_name} ${row.last_name}`,
        row.contact_email,
        row.total_price,
        row.passenger_count,
        row.status === "confirmed" ? "Paid" : row.status === "pending" ? "Unpaid" : "Cancelled",
        row.payment_method,
        row.created_by_name,
        row.created_at
      ]);
    });

    // 5️⃣ Auto-size colonnes
    sheet.columns.forEach((column) => {
      if (column && column.eachCell) {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const len = cell.value ? cell.value.toString().length : 10;
          if (len > maxLength) maxLength = len;
        });
        column.width = maxLength + 2;
      }
    });

    // 6️⃣ Headers HTTP
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Trogon Transactions Helico.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Erreur Excel:", error);
    res.status(500).json({ error: "Erreur export Excel" });
  }
});




app.get("/api/generate/:flightId/passengers-list", async (req: Request, res: Response) => { 
  const flightId = Number(req.params.flightId);
  if (!flightId) return res.status(400).json({ error: "Flight ID missing" });

  try {
    // 🔹 Récupérer le vol avec les noms des lieux via JOIN
    const [flightRows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        f.flight_number, 
        f.airline, 
        f.departure_time,
        f.arrival_time,
        f.price,
        f.seats_available,
        dep.name as departure_location_name,
        arr.name as arrival_location_name,
        dep.city as departure_city,
        arr.city as arrival_city,
        dep.country as departure_country,
        arr.country as arrival_country
      FROM flights f
      LEFT JOIN locations dep ON f.departure_location_id = dep.id
      LEFT JOIN locations arr ON f.arrival_location_id = arr.id
      WHERE f.id = ?`,
      [flightId]
    );
    
    const flight = flightRows[0];
    if (!flight) return res.status(404).json({ error: "Flight not found" });

    // 🔹 Récupérer les passagers via la table bookings
    const [passengerRows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        p.first_name, 
        p.last_name, 
        p.email, 
        p.phone, 
        p.created_at as booking_date,
        p.type,
        p.nationality,
        p.gender,
        p.date_of_birth
      FROM passengers p
      INNER JOIN bookings b ON p.booking_id = b.id
      WHERE b.flight_id = ? 
      ORDER BY p.id ASC`,
      [flightId]
    );

    const passengerRowsHTML = passengerRows.map((p) => `
        <tr key="${p.id}" class="border-b hover:bg-gray-50">
            <td class="table-cell px-6 py-4">${p.first_name || '-'}</td>
            <td class="table-cell px-6 py-4">${p.last_name || '-'}</td>
            <td class="table-cell px-6 py-4">${p.email || '-'}</td>
            <td class="table-cell px-6 py-4">${p.phone || 'No Number'}</td>
            <td class="table-cell px-6 py-4">${p.nationality || '-'}</td>
            <td class="table-cell px-6 py-4">${p.date_of_birth || '-'}</td>
            <td class="table-cell px-6 py-4">${formatDate(p.booking_date)}</td>
        </tr>
    `).join('');


  const htmlContent = `
    <html>
    <head>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                margin: 0;
                padding: 20px;
            }
            .container { 
                max-width: 800px; 
                margin: 0 auto; 
                border: 1px solid #ddd; 
                border-radius: 8px; 
                overflow: hidden;
            }
            .header { 
                background-color: #1A237E; 
                color: white; 
                padding: 20px; 
                text-align: center;
            }
            .logo {
                height: 55px;
                vertical-align: middle;
            }
            .content {
                padding: 20px;
            }
            .passenger-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 20px;
                font-size: 12px;
            }
            .passenger-table th { 
                background-color: #f2f2f2; 
                border: 1px solid #ddd; 
                padding: 8px; 
                text-align: left;
                font-weight: bold;
            }
            .passenger-table td { 
                border: 1px solid #ddd; 
                padding: 8px; 
                text-align: left;
            }
            .border-b {
                border-bottom: 1px solid #e5e7eb;
            }
            .hover-bg-gray-50 tr:hover {
                background-color: #f9fafb;
            }
            .px-6 {
                padding-left: 1.5rem;
                padding-right: 1.5rem;
            }
            .py-4 {
                padding-top: 1rem;
                padding-bottom: 1rem;
            }
            .table-cell {
                border: 1px solid #ddd;
                padding: 0.75rem;
            }
            .title {
                text-align: center;
                font-size: 24px;
                margin-bottom: 20px;
                color: #1A237E;
            }
            .flight-info {
                margin-bottom: 20px;
                padding: 15px;
                background-color: #f8f9fa;
                border-radius: 5px;
            }
            .flight-info p {
                margin: 5px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://trogonairways.com/logo-trogonpng.png" alt="Trogon Airways Logo" class="logo" />
                <h1 style="margin: 10px 0 0 0; font-size: 24px;">Passenger List</h1>
            </div>

            <div class="content">
                <div class="title">Passenger List -${flight.flight_number}</div>
                
                <div class="flight-info">
                    <p><strong>Total Passengers:</strong> ${passengerRows.length}</p>
                   

                        <p><strong>Airline: </strong>${flight.airline}</p>
                        <p><strong>Departure: </strong>${flight.departure_location_name}</p>
                        <p><strong>Departure Time: </strong>${new Date(flight.departure_time).toLocaleString()}</p>
                        <p><strong>Arrival: </strong>${flight.arrival_location_name} </p>
                        <p><strong>Arrival Time: </strong>${new Date(flight.arrival_time).toLocaleString()}</p>
                       
                        <p><strong>Available Seats: </strong>${flight.seats_available}</p>

                </div>

                <table class="passenger-table hover-bg-gray-50">
                    <thead>
                        <tr>
                            <th>First Name</th>
                            <th>Last Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Nationality</th>
                            <th>Date of Birth</th>
                         
                            <th>Booking Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${passengerRowsHTML}
                    </tbody>
                </table>
                
                <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #777;">
                    <p>Generated by Trogon Airways Passenger Management System</p>
                    
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
// 4️⃣ Générer le PDF
    const file = { content: htmlContent };
    const options = { format: 'A3', printBackground: true, margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' } };

    const pdfBuffer = await pdf.generatePdf(file, options);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${flight}.pdf`);
    res.send(pdfBuffer);


  } catch (err) {
    console.error("Erreur lors de la génération du PDF:", err);
    res.status(500).json({ error: "Erreur lors de la génération du PDF" });
  }
});


// app.get("/api/booking-plane-export", async (req: Request, res: Response) => {
//     try {
//         const { startDate, endDate, transactionType, status } = req.query;

//         let conditions = " WHERE b.type_vol = 'plane' ";
//         const params: any[] = [];

//         if (startDate) {
//             conditions += " AND DATE(b.created_at) >= ? ";
//             params.push(startDate);
//         }

//         if (endDate) {
//             conditions += " AND DATE(b.created_at) <= ? ";
//             params.push(endDate);
//         }

//         if (transactionType) {
//             conditions += " AND b.payment_method = ? ";
//             params.push(transactionType);
//         }

//         if (status) {
//             conditions += " AND b.status = ? ";
//             params.push(status);
//         }

//         const [rows] = await pool.query<mysql.RowDataPacket[]>(`
//             SELECT 
//                 b.booking_reference,
//                 b.payment_intent_id,
//                 b.type_vol,
//                 b.type_v,
//                 b.contact_email,
//                 b.total_price,
//                 b.passenger_count,
//                 b.status,
//                 b.payment_method,
//                 u.name AS created_by_name,
//                 b.created_at
//             FROM bookings b
//             LEFT JOIN users u ON b.user_created_booking = u.id
//             ${conditions}
//             ORDER BY b.created_at DESC
//         `, params);

//                   const workbook = new ExcelJS.Workbook();
//         const sheet = workbook.addWorksheet("Bookings");

//         // 1️⃣ Ajouter un en-tête global au milieu en gras (fusionné)
//         sheet.mergeCells('A1:K1');
//         const headerRow = sheet.getRow(1);
//         const headerCell = headerRow.getCell(1);
//         headerCell.value = "TROGON AVION TRANSACTIONS";
//         headerCell.font = { bold: true, size: 14 };
//         headerCell.alignment = { horizontal: 'center', vertical: 'middle' };

//         // 2️⃣ Ajouter les en-têtes de colonnes sur la ligne 2
//         const headers = [
//             "Booking Reference", 
//             "Payment Ref", 
//             "Type", 
//             "Trajet", 
//             "Email", 
//             "Total", 
//             "Passagers", 
//             "Status", 
//             "Méthode", 
//             "Créé par", 
//             "Date"
//         ];

//         // Ajouter la ligne d'en-têtes
//         const titleRow = sheet.addRow(headers);

//         // 3️⃣ Mettre les en-têtes en gras
//         titleRow.eachCell((cell) => {
//             cell.font = { bold: true };
//         });

//         // 4️⃣ Définir les clés pour les colonnes (facultatif mais utile)
//         sheet.columns = [
//             { key: "booking_reference" },
//             { key: "payment_intent_id" },
//             { key: "type_vol" },
//             { key: "type_v" },
//             { key: "contact_email" },
//             { key: "total_price" },
//             { key: "passenger_count" },
//             { key: "status" },
//             { key: "payment_method" },
//             { key: "created_by_name" },
//             { key: "created_at" }
//         ];

//         // 5️⃣ Ajouter les données (commençant à la ligne 3)
//         rows.forEach((row) => {
//             sheet.addRow([
//                 row.booking_reference,
//                 row.payment_intent_id,
//                 row.type_vol,
//                 row.type_v,
//                 row.contact_email,
//                 row.total_price,
//                 row.passenger_count,
//                 row.status,
//                 row.payment_method,
//                 row.created_by_name,
//                 row.created_at
//             ]);
//         });

//         // OU si vos objets ont exactement les mêmes propriétés que les clés :
//         // rows.forEach((r) => sheet.addRow(r));

//         // 6️⃣ Ajuster la largeur des colonnes automatiquement
//         sheet.columns.forEach((column) => {
//             if (column && column.eachCell) {
//                 let maxLength = 0;
//                 column.eachCell({ includeEmpty: true }, (cell) => {
//                     const columnLength = cell.value ? cell.value.toString().length : 10;
//                     if (columnLength > maxLength) {
//                         maxLength = columnLength;
//                     }
//                 });
//                 column.width = maxLength < 10 ? 10 : maxLength + 2;
//             }
//         });

//         res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
//         res.setHeader("Content-Disposition", "attachment; filename=Trogon Transactions Avion.xlsx");

//         await workbook.xlsx.write(res);
//         res.end();

//     } catch (error) {
//         console.error("Erreur Excel:", error);
//         res.status(500).json({ error: "Erreur export Excel" });
//     }
// });

// app.get("/api/booking-helico-export", async (req: Request, res: Response) => {
//     try {
//         const { startDate, endDate, transactionType, status } = req.query;

//         let conditions = " WHERE b.type_vol = 'helicopter' ";
//         const params: any[] = [];

//         if (startDate) {
//             conditions += " AND DATE(b.created_at) >= ? ";
//             params.push(startDate);
//         }

//         if (endDate) {
//             conditions += " AND DATE(b.created_at) <= ? ";
//             params.push(endDate);
//         }

//         if (transactionType) {
//             conditions += " AND b.payment_method = ? ";
//             params.push(transactionType);
//         }

//         if (status) {
//             conditions += " AND b.status = ? ";
//             params.push(status);
//         }

//         const [rows] = await pool.query<mysql.RowDataPacket[]>(`
//             SELECT 
//                 b.booking_reference,
//                 b.payment_intent_id,
//                 b.type_vol,
//                 b.type_v,
//                 b.contact_email,
//                 b.total_price,
//                 b.passenger_count,
//                 b.status,
//                 b.payment_method,
//                 u.name AS created_by_name,
//                 b.created_at
//             FROM bookings b
//             LEFT JOIN users u ON b.user_created_booking = u.id
//             ${conditions}
//             ORDER BY b.created_at DESC
//         `, params);

//         // Génération Excel

//         const workbook = new ExcelJS.Workbook();
//         const sheet = workbook.addWorksheet("Bookings");

//         // 1️⃣ Ajouter un en-tête global au milieu en gras (fusionné)
//         sheet.mergeCells('A1:K1');
//         const headerRow = sheet.getRow(1);
//         const headerCell = headerRow.getCell(1);
//         headerCell.value = "TROGON HELICO TRANSACTIONS";
//         headerCell.font = { bold: true, size: 14 };
//         headerCell.alignment = { horizontal: 'center', vertical: 'middle' };

//         // 2️⃣ Ajouter les en-têtes de colonnes sur la ligne 2
//         const headers = [
//             "Booking Reference", 
//             "Payment Ref", 
//             "Type", 
//             "Trajet", 
//             "Email", 
//             "Total", 
//             "Passagers", 
//             "Status", 
//             "Méthode", 
//             "Créé par", 
//             "Date"
//         ];

//         // Ajouter la ligne d'en-têtes
//         const titleRow = sheet.addRow(headers);

//         // 3️⃣ Mettre les en-têtes en gras
//         titleRow.eachCell((cell) => {
//             cell.font = { bold: true };
//         });

//         // 4️⃣ Définir les clés pour les colonnes (facultatif mais utile)
//         sheet.columns = [
//             { key: "booking_reference" },
//             { key: "payment_intent_id" },
//             { key: "type_vol" },
//             { key: "type_v" },
//             { key: "contact_email" },
//             { key: "total_price" },
//             { key: "passenger_count" },
//             { key: "status" },
//             { key: "payment_method" },
//             { key: "created_by_name" },
//             { key: "created_at" }
//         ];

//         // 5️⃣ Ajouter les données (commençant à la ligne 3)
//         rows.forEach((row) => {
//             sheet.addRow([
//                 row.booking_reference,
//                 row.payment_intent_id,
//                 row.type_vol,
//                 row.type_v,
//                 row.contact_email,
//                 row.total_price,
//                 row.passenger_count,
//                 row.status,
//                 row.payment_method,
//                 row.created_by_name,
//                 row.created_at
//             ]);
//         });

//         // OU si vos objets ont exactement les mêmes propriétés que les clés :
//         // rows.forEach((r) => sheet.addRow(r));

//         // 6️⃣ Ajuster la largeur des colonnes automatiquement
//         sheet.columns.forEach((column) => {
//             if (column && column.eachCell) {
//                 let maxLength = 0;
//                 column.eachCell({ includeEmpty: true }, (cell) => {
//                     const columnLength = cell.value ? cell.value.toString().length : 10;
//                     if (columnLength > maxLength) {
//                         maxLength = columnLength;
//                     }
//                 });
//                 column.width = maxLength < 10 ? 10 : maxLength + 2;
//             }
//         });

//         res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
//         res.setHeader("Content-Disposition", "attachment; filename=Trogon Transactions Helico.xlsx");

//         await workbook.xlsx.write(res);
//         res.end();
//     } catch (error) {
//         console.error("Erreur Excel:", error);
//         res.status(500).json({ error: "Erreur export Excel" });
//     }
// });



// app.get("/api/booking-helico", async (req: Request, res: Response) => {
//     let connection;
//     try {
//         // 1. Récupérer les réservations avec jointure pour avoir le nom de l'utilisateur
//         const [bookingRows] = await pool.query<mysql.RowDataPacket[]>(
//             `SELECT 
//                 b.id, 
//                 b.booking_reference, 
//                 b.payment_intent_id, 
//                 b.total_price, 
//                 b.status, 
//                 b.created_at, 
//                 b.passenger_count, 
//                 b.payment_method, 
//                 b.contact_email, 
//                 b.type_vol, 
//                 b.type_v,
//                 u.name as created_by_name,  
//                 u.email as created_by_email 
//             FROM bookings b
//             LEFT JOIN users u ON b.user_created_booking = u.id  
//             WHERE b.type_vol = ?
//             ORDER BY b.created_at DESC`,
//             ["helicopter"]
//         );

//         // Convertir en type Booking[] avec le nouveau champ
//         const bookings: Booking[] = bookingRows.map((row) => ({
//             id: row.id,
//             booking_reference: row.booking_reference,
//             payment_intent_id: row.payment_intent_id,
//             total_price: Number(row.total_price),
//             status: row.status,
//             created_at: new Date(row.created_at).toISOString(),
//             passenger_count: row.passenger_count,
//             payment_method: row.payment_method,
//             contact_email: row.contact_email,
//             type_vol: row.type_vol,
//             type_v: row.type_v,
//             created_by_name: row.created_by_name,  // AJOUT DU CHAMP
//             created_by_email: row.created_by_email // AJOUT DU CHAMP (optionnel)
//         }));

//         const recentBookings = bookings.slice(0, 10);

//         // 8. Construction de la réponse
//         const response: BookingStats = {
//             recentBookings,
//         };

//         res.json(response);
//     } catch (error) {
//         console.error("Dashboard error:", error);
//         res.status(500).json({ error: "Erreur lors de la récupération des statistiques" });
//     } 
// });






app.put("/api/booking-plane/:reference/payment-status", async (req: Request, res: Response) => {
  const { reference } = req.params;
  const { paymentStatus } = req.body;

  console.log(`🔍 DEBUG - Début update payment-status`);
  console.log(`  - Reference: ${reference}`);
  console.log(`  - PaymentStatus: ${paymentStatus}`);
  console.log(`  - Body complet:`, JSON.stringify(req.body, null, 2));

  // 1️⃣ Validation du statut
  if (!["pending", "confirmed", "cancelled"].includes(paymentStatus)) {
    console.log(`❌ DEBUG - Statut invalide: ${paymentStatus}`);
    return res.status(400).json({ error: "Invalid payment status" });
  }

  let connection;
  try {
    console.log(`🔗 DEBUG - Obtention connexion DB`);
    connection = await pool.getConnection();
    await connection.beginTransaction();
    console.log(`✅ DEBUG - Transaction démarrée`);

    // 2️⃣ Récupérer la réservation complète
    console.log(`📋 DEBUG - Recherche booking: ${reference}`);
    const [bookings] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT id, flight_id, return_flight_id, passenger_count, status 
       FROM bookings WHERE booking_reference = ? FOR UPDATE`,
      [reference]
    );

    console.log(`📊 DEBUG - Résultats recherche: ${bookings.length} booking(s) trouvé(s)`);

    if (bookings.length === 0) {
      console.log(`❌ DEBUG - Booking non trouvé: ${reference}`);
      await connection.rollback();
      return res.status(404).json({ error: "Booking not found" });
    }

    const booking = bookings[0];
    console.log(`📖 DEBUG - Booking trouvé:`, {
      id: booking.id,
      flight_id: booking.flight_id,
      return_flight_id: booking.return_flight_id,
      passenger_count: booking.passenger_count,
      status: booking.status
    });

    // 3️⃣ Mise à jour du statut
    console.log(`🔄 DEBUG - Mise à jour status: ${paymentStatus}`);
    await connection.query(
      `UPDATE bookings SET status = ? WHERE booking_reference = ?`,
      [paymentStatus, reference]
    );
    console.log(`✅ DEBUG - Status booking mis à jour`);

    // 4️⃣ Si la réservation est annulée
    if (paymentStatus === "cancelled") {
      console.log(`🚨 DEBUG - Traitement annulation démarré`);
      const { id: bookingId, flight_id, return_flight_id, passenger_count } = booking;

      console.log(`📊 DEBUG - Données annulation:`, {
        bookingId,
        flight_id,
        return_flight_id,
        passenger_count
      });

      // 🔍 CORRECTION : Récupérer les passagers AVANT suppression
      console.log(`👥 DEBUG - Récupération passagers pour booking_id: ${bookingId}`);
      const [passengersBeforeDelete] = await connection.query<mysql.RowDataPacket[]>(
        `SELECT 
          first_name,
          last_name,
          email
         FROM passengers 
         WHERE booking_id = ?`,
        [bookingId]
      );

      console.log(`📧 DEBUG - Passagers récupérés: ${passengersBeforeDelete.length}`);
      console.log(`📋 DEBUG - Détails passagers:`, JSON.stringify(passengersBeforeDelete, null, 2));

      // Vérification des emails
      for (const passenger of passengersBeforeDelete) {
        const emailValid = typeof passenger.email === 'string' && passenger.email.includes('@');
        console.log(`✅ DEBUG - Email ${passenger.email}: ${emailValid ? 'VALIDE' : 'INVALIDE'}`);
      }

      // 🧹 Supprimer les passagers liés
      console.log(`🗑️ DEBUG - Suppression des passagers`);
      const deleteResult = await connection.query(`DELETE FROM passengers WHERE booking_id = ?`, [bookingId]);
      console.log(`✅ DEBUG - Passagers supprimés`);

      // ✈️ Réaugmentation du nombre de sièges disponibles
      console.log(`🔄 DEBUG - Mise à jour sièges vol aller: ${flight_id} (+${passenger_count})`);
      await connection.query(
        `UPDATE flights SET seats_available = seats_available + ? WHERE id = ?`,
        [passenger_count, flight_id]
      );

      if (return_flight_id) {
        console.log(`🔄 DEBUG - Mise à jour sièges vol retour: ${return_flight_id} (+${passenger_count})`);
        await connection.query(
          `UPDATE flights SET seats_available = seats_available + ? WHERE id = ?`,
          [passenger_count, return_flight_id]
        );
      }

      // ✉️ Envoyer un email à chaque passager
      console.log(`📨 DEBUG - Début envoi des emails à ${passengersBeforeDelete.length} passager(s)`);
      const emailResults = [];

      for (const [index, passenger] of passengersBeforeDelete.entries()) {
        console.log(`\n📧 DEBUG - Envoi email ${index + 1}/${passengersBeforeDelete.length} à: ${passenger.email}`);

        const emailHtml = `
                  
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #f0f7ff; padding: 20px; text-align: center; border-radius: 5px; }
                .flight-card { border: 1px solid #ddd; border-radius: 5px; padding: 15px; margin-bottom: 20px; }
                .flight-header { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
                .flight-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                .passenger-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .passenger-table th, .passenger-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                .passenger-table th { background-color: #f2f2f2; }
                .footer { margin-top: 30px; font-size: 12px; color: #777; text-align: center; }
            </style>
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #1A237E; color: white; padding: 20px; text-align: center;">
                <img src="https://trogonairways.com/logo-trogonpng.png" alt="" style="height: 55px; vertical-align: middle;">
              
                <p style="margin: 5px 0 0; font-size: 1.2em;">Flight cancellation</p>
              </div>

              <div style="padding: 20px;">
                <p></p>Dear, ${passenger.first_name} ${passenger.last_name},</p>
              
              <p>We are sorry to inform you that your reservation has been <b>cancelled</b>.</p>
              
                
                <p>Booking reference : <b>${reference}</b></p>
              </div>


              <div style="padding: 20px; font-size: 0.9em; color: #555;">
              <p>Thank you for choosing Trogon Airways.</p>
              
            
                <p>Sincerely,<br>The Trogon Airways Team</p>
              </div>
            </div>

        `;

        console.log(`📝 DEBUG - HTML email généré pour ${passenger.email}`);
        const emailResult = await sendEmail(
          passenger.email,
          "Trogon Airways, Flight cancellation",
          emailHtml
        );

        console.log(`📊 DEBUG - Résultat email ${passenger.email}:`, emailResult.success ? 'SUCCÈS' : 'ÉCHEC');
        if (!emailResult.success) {
          console.log(`❌ DEBUG - Erreur email:`, emailResult.error);
        }

        emailResults.push({
          passenger: passenger.email,
          success: emailResult.success,
          error: emailResult.error
        });
      }

      console.log(`📋 DEBUG - Résumé envoi emails:`, JSON.stringify(emailResults, null, 2));

      // 🔔 Notification d'annulation
      console.log(`🔔 DEBUG - Création notification annulation`);
      await connection.query(
        `INSERT INTO notifications (type, message, booking_id, seen, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        ["cancellation", `Réservation ${reference} annulée.`, bookingId, false, new Date()]
      );
      console.log(`✅ DEBUG - Notification créée`);
    }

    console.log(`💾 DEBUG - Commit transaction`);
    await connection.commit();
    console.log(`✅ DEBUG - Transaction commitée`);

    res.json({
      success: true,
      reference,
      newStatus: paymentStatus,
      message:
        paymentStatus === "cancelled"
          ? "Booking cancelled, passengers deleted and seats restored."
          : "Booking status updated successfully.",
    });

  } catch (err) {
    console.error("❌ ERROR - Erreur update payment status:", err);
    console.error("❌ ERROR - Stack:", err instanceof Error ? err.stack : undefined);
    if (connection) {
      console.log(`🔙 DEBUG - Rollback transaction`);
      await connection.rollback();
    }
    res.status(500).json({ error: "Failed to update payment status" });
  } finally {
    if (connection) {
      console.log(`🔓 DEBUG - Libération connexion`);
      connection.release();
    }
    console.log(`🏁 DEBUG - Fin traitement payment-status`);
  }
});


app.get("/api/booking-plane-pop/:id", async (req: Request, res: Response) => {
  try {
    const bookingId = req.params.id;

    // Récupérer la réservation avec jointure pour avoir le nom de l'utilisateur
    const [bookingRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT 
          b.*,
          u.name as created_by_name,  
          u.email as created_by_email 
       FROM bookings b
       LEFT JOIN users u ON b.user_created_booking = u.id
       WHERE b.id = ?`,
      [bookingId]
    );

    if (bookingRows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const booking = bookingRows[0];

    // Récupérer les passagers liés (reste identique)
    const [passengerRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT 
          id, 
          booking_id, 
          first_name, middle_name, last_name,
          date_of_birth, gender, title, address, type,
          type_vol, type_v, country, nationality,
          phone, email, nom_urgence, email_urgence, tel_urgence, created_at, updated_at
       FROM passengers 
       WHERE booking_id = ?`,
      [bookingId]
    );

    // Récupérer les vols liés avec JOIN sur locations (reste identique)
    const flightIds = [booking.flight_id];
    if (booking.return_flight_id) flightIds.push(booking.return_flight_id);

    const flightQuery = `
      SELECT 
          f.id,
          f.flight_number AS code,
          f.type,
          f.airline,
          f.departure_time AS date,
          f.arrival_time AS arrival_date,
          f.price,
          f.seats_available,
          dep.name AS departure_airport_name,
          dep.city AS departure_city,
          dep.code AS departure_code,
          arr.name AS arrival_airport_name,
          arr.city AS arrival_city,
          arr.code AS arrival_code
      FROM flights f
      JOIN locations dep ON f.departure_location_id = dep.id
      JOIN locations arr ON f.arrival_location_id = arr.id
      WHERE f.id IN (?)
    `;

    const [flightRows] = await pool.query<mysql.RowDataPacket[]>(
      flightQuery,
      [flightIds]
    );

    // Construction de la réponse avec les nouveaux champs
    const details = {
      id: booking.id,
      booking_reference: booking.booking_reference,
      total_price: Number(booking.total_price),
      status: booking.status,
      payment_method: booking.payment_method,
      created_at: new Date(booking.created_at).toISOString(),
      passenger_count: booking.passenger_count,
      contact_email: booking.contact_email,
      type_vol: booking.type_vol,
      type_v: booking.type_v,
      adminNotes: booking.adminNotes,
      created_by_name: booking.created_by_name,  // AJOUT DU CHAMP
      created_by_email: booking.created_by_email, // AJOUT DU CHAMP (optionnel)
      user_created_booking: booking.user_created_booking, // ID de l'utilisateur
      passengers: passengerRows,
      flights: flightRows,
    };

    res.json(details);
  } catch (error) {
    console.error("Booking detail error:", error);
    res.status(500).json({ error: "Erreur lors de la récupération du détail de la réservation" });
  }
});


app.put("/api/updateflight/:id", async (req: Request, res: Response) => {
  const flightId = req.params.id;

  const allowedFields = [
    "flight_number",
    "type",
    "airline",
    "departure_location_id",
    "arrival_location_id",
    "departure_time",
    "arrival_time",
    "price",
    "seats_available",
  ];

  const setFields: string[] = [];
  const values: any[] = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      setFields.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  }

  if (setFields.length === 0) {
    return res.status(400).json({ error: "Aucun champ à mettre à jour" });
  }

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE flights SET ${setFields.join(", ")} WHERE id = ?`,
      [...values, flightId]
    );

    // Récupérer le vol mis à jour
    const [rows] = await pool.query<Flight[]>("SELECT * FROM flights WHERE id = ?", [flightId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Vol non trouvé" });
    }

    res.status(200).json(rows[0]);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error);
      res.status(500).json({ error: "Erreur MySQL", details: error.message });
    } else {
      res.status(500).json({ error: "Erreur inconnue" });
    }
  }
});

// Route pour supprimer un vol
app.delete("/api/deleteflights/:id", async (req: Request, res: Response) => {
  const flightId = Number(req.params.id);

  if (isNaN(flightId)) {
    return res.status(400).json({ error: "ID de vol invalide" });
  }

  try {
    // Vérification de l'existence du vol
    const [checkResult] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT id FROM flights WHERE id = ?",
      [flightId]
    );

    if (Array.isArray(checkResult) && checkResult.length === 0) {
      return res.status(404).json({ error: "Vol non trouvé" });
    }

    // Suppression du vol
    const [deleteResult] = await pool.execute<mysql.OkPacket>(
      "DELETE FROM flights WHERE id = ?",
      [flightId]
    );

    if ("affectedRows" in deleteResult && deleteResult.affectedRows === 0) {
      return res.status(404).json({ error: "Aucun vol supprimé" });
    }

    res.status(200).json({
      success: true,
      message: `Vol ${flightId} supprimé avec succès`,
      affectedRows: deleteResult.affectedRows,
    });
  } catch (error) {
    console.error("Erreur MySQL:", error);
    res.status(500).json({
      error: "Erreur lors de la suppression",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
  // ❌ Ne fais PAS pool.end() ici
});


const PORT = process.env.PORT || 3009;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
