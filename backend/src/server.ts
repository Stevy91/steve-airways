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

import fetch from "node-fetch";

import pdf from 'html-pdf-node'
import { format, parseISO, isValid, parse } from "date-fns";

import { COUNTRIES } from "./constants/country";
import { fr } from 'date-fns/locale'; // Optionnel: pour le format français
import { printerService } from './printer-service';
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
  affectedRows: string;
flightInfo: string;
  seats_available: string;
}



// types/dashboard.ts
export interface Booking {
  id: number;
  booking_reference: string;
  total_price: number;
  status: string;
  created_at: string;
  currency: string;
  passenger_count: number;
  contact_email: string;
  type_vol: "plane" | "helicopter";
  typecharter: "plane" | "helicopter";
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
  revenueByMonth: { name: string; total: number }[];
  averageBookingValue: number;
  bookingsByStatus: { name: string; value: number }[];
 
  
  bookingsByFlightType: { name: string; value: number }[];
  recentBookings: Booking[];
}


// Dans votre fichier de types ou dans le même fichier
interface DashboardStats2 {
    totalRevenueUSD: number;
    totalRevenueHTG: number;
    totalBookings: number;
    flightsAvailable: number;
    averageBookingValueUSD: number;
    averageBookingValueHTG: number;
    bookingsByStatus: { name: string; value: number }[];
    revenueByMonth: { name: string; total: number }[]; // Garder comme avant
    revenueByMonthDetailed: { name: string; usd: number; htg: number }[]; // Nouveau pour détail USD/HTG
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

// app.post("/api/confirm-booking-paylater", async (req: Request, res: Response) => {

//   const connection = await pool.getConnection();

//   try {
//     await connection.beginTransaction();

//     const { paymentMethod, paymentIntentId, passengers, contactInfo, flightId, totalPrice, returnFlightId, departureDate, returnDate } = req.body;
//     const typeVol = passengers[0]?.typeVol || "plane";
//     const typeVolV = passengers[0]?.typeVolV || "onway";
//     const requiredFields = ["passengers", "contactInfo", "flightId", "totalPrice"];
//     if (paymentMethod !== "paylater") {
//       requiredFields.push("paymentIntentId");
//     }

//     for (const field of requiredFields) {
//       if (!req.body[field]) {
//         throw new Error(`Missing required field: ${field}`);
//       }
//     }

//     // 3. Validation des passagers
//     if (!Array.isArray(passengers) || passengers.length === 0) {
//       throw new Error("Invalid passenger list");
//     }

//     passengers.forEach((passenger, index) => {
//       if (!passenger.firstName || !passenger.lastName) {
//         throw new Error(`Passager ${index + 1}: Full name required`);
//       }
//       if (!passenger.type) {
//         throw new Error(`Passager ${index + 1}: Type manquant (Adult/Child/Infant)`);
//       }
//     });

//     // 4. Vérification des vols


//     const flightIds = returnFlightId ? [flightId, returnFlightId] : [flightId];
//     const [flights] = await connection.query<mysql.RowDataPacket[]>("SELECT id, seats_available FROM flights WHERE id IN (?) FOR UPDATE", [
//       flightIds,
//     ]);


//     if (flights.length !== flightIds.length) {
//       throw new Error("One or more flights missing");
//     }

//     for (const flight of flights) {
//       if (flight.seats_available < passengers.length) {
//         throw new Error(`Not enough seats available for the flight ${flight.id}`);
//       }
//     }


//     if (flights.length !== flightIds.length) {
//       throw new Error("One or more flights missing");
//     }

//     // 5. Création de la réservation
//     const now = new Date();
//     const bookingReference = `BOOK-${Math.floor(100000 + Math.random() * 900000)}`;

//     const [bookingResult] = await connection.query<mysql.OkPacket>(
//       `INSERT INTO bookings (
//                 flight_id, payment_intent_id,
//                 total_price, currency, contact_email, contact_phone,
//                 status, type_vol, type_v, guest_user, guest_email,
//                 created_at, updated_at, departure_date,
//                 return_date, passenger_count, booking_reference, return_flight_id, payment_method
//             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         flightId,
//         paymentIntentId,
//         totalPrice,
//         "usd",
//         contactInfo.email,
//         contactInfo.phone,
//         "pending",
//         typeVol,
//         typeVolV,
//         1,
//         contactInfo.email,
//         now,
//         now,
//         departureDate || null,
//         returnDate || null,
//         passengers.length,
//         bookingReference,
//         returnFlightId || null,
//         paymentMethod,
//       ],
//     );

//     await connection.query<mysql.OkPacket>(
//       `INSERT INTO payments (
//           booking_id, amount, currency,
//           payment_method, payment_status, transaction_reference, created_at
//       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
//       [
//         bookingResult.insertId,
//         totalPrice,
//         "usd",
//         paymentMethod,
//         "pending",
//         paymentIntentId || "paylater",
//         now 
//       ],
//     );

//     // 6. Insertion des passagers avec gestion d'erreur
//     for (const passenger of passengers) {
//       console.log("Inserting passenger:", {
//         firstName: passenger.firstName,
//         lastName: passenger.lastName,
//         type: passenger.type,
//         // Ajoutez d'autres champs pertinents
//       });
//       try {
//         await connection.query(
//           `INSERT INTO passengers (
//                         booking_id, first_name, middle_name, last_name,
//                         date_of_birth, gender, title, address, type,
//                         type_vol, type_v, country, nationality,
//                         phone, email, nom_urgence, email_urgence, tel_urgence, created_at, updated_at
//                     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//           [
//             bookingResult.insertId,
//             passenger.firstName,
//             passenger.middleName || null,
//             passenger.lastName,
//             passenger.dateOfBirth || null,
//             passenger.gender || "other",
//             passenger.title || "Mr",
//             passenger.address || null,
//             passenger.type,
//             passenger.typeVol || "plane",
//             passenger.typeVolV || "onway",
//             getCountryName(passenger.country) || passenger.country,
//             passenger.nationality || null,
//             passenger.phone || contactInfo.phone,
//             passenger.email || contactInfo.email,
//             passenger.nom_urgence || null,
//             passenger.email_urgence || null,
//             passenger.tel_urgence || null,
//             now,
//             now,
//           ],
//         );
//       } catch (passengerError) {
//         console.error("Erreur insertion passager:", passengerError);
//         throw new Error(`Failed temporary creation: ${passenger.firstName} ${passenger.lastName}`);
//       }
//     }

//     // 5. Mise à jour des sièges pour tous les vols concernés
//     for (const flight of flights) {
//       await connection.execute("UPDATE flights SET seats_available = seats_available - ? WHERE id = ?", [passengers.length, flight.id]);
//     }
//     await connection.query(
//       `INSERT INTO notifications (type, message, booking_id, seen, created_at)
//         VALUES (?, ?, ?, ?, ?)`,
//       [
//         "booking",
//         ` ${bookingReference} avec ${passengers.length} passager(s).`,
//         bookingResult.insertId,
//         false,
//         now,
//       ]
//     );
//     // Envoyer la notif au front
//     io.emit("new-notification", {
//       message: `${bookingReference} avec ${passengers.length} passager(s).`,
//       bookingId: bookingResult.insertId,
//       createdAt: now,
//     });

//     await connection.commit();

//     res.json({
//       success: true,
//       bookingId: bookingResult.insertId,
//       bookingReference,
//       passengerCount: passengers.length,
//     });
//   } catch (error: unknown) {
//     try {
//       await connection.rollback();
//     } catch (rollbackError) {
//       console.error("Échec rollback:", rollbackError);
//     }

//     const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
//     console.error("Erreur réservation:", {
//       message: errorMessage,
//       stack: error instanceof Error ? error.stack : undefined,
//       body: req.body,
//     });

//     res.status(500).json({
//       error: "Reservation failed",
//       details: process.env.NODE_ENV !== "production" ? errorMessage : undefined,
//       reference: Date.now().toString(36),
//     });
//   } finally {
//     try {
//       connection.release();
//     } catch (releaseError) {
//       console.error("Échec libération connexion:", releaseError);
//     }
//   }
// });



import cron from 'node-cron';

// Ajoutez cette fonction pour nettoyer les réservations expirées

// async function cleanupExpiredBookings() {
//   const connection = await pool.getConnection();
  
//   try {
//     await connection.beginTransaction();
    

    
//     // 1. Trouver TOUTES les réservations paylater expirées
//     const [expiredBookings] = await connection.query<mysql.RowDataPacket[]>(
//       `SELECT id, flight_id, return_flight_id, passenger_count, booking_reference
// FROM bookings
// WHERE status = 'pending'
//   AND payment_method = 'paylater'
//   AND expires_at <= UTC_TIMESTAMP()
// FOR UPDATE;

//       `
//     );

 

//     // 2. Pour chaque réservation expirée
//     for (const booking of expiredBookings) {
   
      
//       // Libérer les sièges des vols
//       const flightIds = [];
//       if (booking.flight_id) flightIds.push(booking.flight_id);
//       if (booking.return_flight_id) flightIds.push(booking.return_flight_id);
      
//       for (const flightId of flightIds) {
//         await connection.execute(
//           "UPDATE flights SET seats_available = seats_available + ? WHERE id = ?",
//           [booking.passenger_count, flightId]
//         );
//         console.log(`Released ${booking.passenger_count} seats for flight ${flightId}`);
//       }

//       // Mettre à jour le statut de la réservation
//       await connection.execute(
//         "UPDATE bookings SET status = 'expired', updated_at = NOW() WHERE id = ?",
//         [booking.id]
//       );

//       // Mettre à jour le statut du paiement
//       await connection.execute(
//         `UPDATE payments SET payment_status = 'expired', updated_at = NOW() WHERE booking_id = ?
//           AND payment_method = 'paylater'
//           AND payment_status = 'pending'`,
//         [booking.id]
//       );

//       // Ajouter une notification
//       await connection.execute(
//         `INSERT INTO notifications (type, message, booking_id, seen, created_at)
//          VALUES (?, ?, ?, ?, ?)`,
//         [
//           "expiration",
//           `Reservation ${booking.booking_reference} expired due to non-payment (paylater)`,
//           booking.id,
//           false,
//           new Date()
//         ]
//       );

  
//     }

//     await connection.commit();
    
//     if (expiredBookings.length > 0) {
//       // Émettre une notification globale
//       io.emit("paylater-bookings-expired", {
//         count: expiredBookings.length,
//         message: `${expiredBookings.length} paylater bookings have been expired`
//       });
      
//       console.log(`Successfully cleaned up ${expiredBookings.length} expired paylater bookings`);
//     } else {
//       console.log('No expired paylater bookings found');
//     }

//   } catch (error) {
//     await connection.rollback();
//     console.error('Error cleaning up expired paylater bookings:', error);
    
//     // Émettre une erreur
//     io.emit("cleanup-error", {
//       error: error instanceof Error ? error.message : 'Unknown error'
//     });
    
//   } finally {
//     connection.release();
//   }
// }






// // Planifier le nettoyage toutes les 5 minutes

// cron.schedule('* * * * *', cleanupExpiredBookings);
// // cron.schedule('*/5 * * * *', cleanupExpiredBookings);

// Modifiez votre route pour inclure l'expiration automatique
app.post("/api/confirm-booking-paylater", async (req: Request, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { 
      paymentMethod, 
      paymentIntentId, 
      passengers, 
      contactInfo, 
      flightId, 
      totalPrice, 
      returnFlightId, 
      departureDate, 
      returnDate 
    } = req.body;
    
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

    // Créer la réservation avec une date d'expiration
    const now = new Date();
    const bookingReference = `BOOK-${Math.floor(100000 + Math.random() * 900000)}`;
    
    const [bookingResult] = await connection.query<mysql.OkPacket>(
  `INSERT INTO bookings (
    flight_id, payment_intent_id,
    total_price, currency, contact_email, contact_phone,
    status, type_vol, type_v, guest_user, guest_email,
    created_at, updated_at, departure_date,
    return_date, passenger_count, booking_reference, 
    return_flight_id, payment_method, expires_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
    UTC_TIMESTAMP(), UTC_TIMESTAMP(), ?, ?, ?, ?, ?, ?, 
    DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 HOUR)
  )`,
  [
    flightId,
    paymentIntentId || `paylater-${Date.now()}`,
    totalPrice,
    "usd",
    contactInfo.email,
    contactInfo.phone,
    "pending", // status
    typeVol,
    typeVolV,
    1,
    contactInfo.email,
    departureDate || null,
    returnDate || null,
    passengers.length,
    bookingReference,
    returnFlightId || null,
    "paylater"
  ]
);


    // Créer le paiement avec status "pending"
   await connection.query(
  `INSERT INTO payments (
    booking_id, amount, currency,
    payment_method, payment_status, transaction_reference,
    created_at, expires_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 HOUR)
  )`,
  [
    bookingResult.insertId,
    totalPrice,
    "usd",
    "paylater",
    "pending",
    `paylater-${bookingResult.insertId}-${Date.now()}`
  ]
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

    // Ajouter une notification avec le temps d'expiration
    await connection.query(
      `INSERT INTO notifications (type, message, booking_id, seen, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        "booking_pending",
        `Reservation ${bookingReference} created. You have 2 hours to complete payment.`,
        bookingResult.insertId,
        false,
        now,
      ]
    );

    // Envoyer la notification au front avec le temps d'expiration
    io.emit("new-notification", {
      message: `${bookingReference} created with ${passengers.length} passenger(s). Payment due in 2 hours.`,
      bookingId: bookingResult.insertId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      type: "pending_payment"
    });

    await connection.commit();

    res.json({
      success: true,
      bookingId: bookingResult.insertId,
      bookingReference,
      passengerCount: passengers.length,
      expiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000), // Retourner la date d'expiration
      message: "Reservation created. You have 2 hours to complete payment."
    });

  } catch (error: unknown) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error("Rollback failed:", rollbackError);
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Booking error:", errorMessage);

    res.status(500).json({
      error: "Reservation failed",
      details: process.env.NODE_ENV !== "production" ? errorMessage : undefined,
    });
  } finally {
    connection.release();
  }
});


app.get("/api/booking-status/:bookingId", async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    
    const [booking] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT 
        b.*, 
        p.payment_status,
        TIMESTAMPDIFF(MINUTE, NOW(), b.expires_at) as minutes_remaining,
        b.expires_at > NOW() as is_active
       FROM bookings b
       LEFT JOIN payments p ON b.id = p.booking_id
       WHERE b.id = ?`,
      [bookingId]
    );

    if (booking.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const bookingData = booking[0];
    
    res.json({
      bookingId: bookingData.id,
      status: bookingData.status,
      paymentStatus: bookingData.payment_status,
      minutesRemaining: bookingData.minutes_remaining,
      isActive: bookingData.is_active,
      expiresAt: bookingData.expires_at,
      bookingReference: bookingData.booking_reference
    });

  } catch (error) {
    console.error("Error checking booking status:", error);
    res.status(500).json({ error: "Failed to check booking status" });
  }
});




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
function authMiddleware(req: any, res: Response, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Token manquant" });

  jwt.verify(token, process.env.JWT_SECRET || "secretKey", (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Vous n'êtes pas connecté. Vous devez vous connecter pour continuer." });
    req.user = user;
    next();
  });
}

// Middleware adminOnly pour protéger certaines routes
async function adminOnly(req: any, res: Response, next: any) {
  const userId = req.user.id;
  try {
    const [rows] = await pool.query<User[]>("SELECT role, permissions FROM users WHERE id = ?", [userId]);
    if (rows.length === 0) return res.status(404).json({ error: "Utilisateur introuvable" });
    if (rows[0].role !== "admin") return res.status(403).json({ error: "Accès refusé" });
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

app.post("/api/create-ticketdernier", authMiddleware, async (req: any, res: Response) => {
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
      currency,
      price,
      taux_jour,
      contactInfo,
      totalPrice,
      referenceNumber,
      unpaid,
      returnFlightId,
      departureDate,
      companyName,
      paymentMethod = "card",
    } = req.body;

    const typeVol = passengers[0]?.typeVol || "plane";
    

    // VÉRIFICATION : S'assurer qu'il y a au moins un passager
    if (!passengers || passengers.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        error: "Au moins un passager est requis pour créer un ticket",
        details: "La liste des passagers est vide"
      });
    }


    let returnFlightIdResolved = returnFlightId || null;
    let returnDateResolved = null;

    // Si le client a fourni un numéro de vol retour
    if (passengers[0]?.flightNumberReturn) {
      const flightNumberReturn = passengers[0].flightNumberReturn.trim().toUpperCase();

      // CORRECTION : Utiliser departure_time au lieu de departure_date
      const [returnFlightRows] = await connection.query<mysql.RowDataPacket[]>(
        "SELECT id, departure_time FROM flights WHERE flight_number = ?",
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
      // CORRECTION : Récupérer departure_time
      returnDateResolved = returnFlightRows[0].departure_time;
    }

    // SI returnFlightId est fourni directement mais pas returnDate, on le récupère de la DB
    if (returnFlightId && !returnDateResolved) {
      const [flightRows] = await connection.query<mysql.RowDataPacket[]>(
        "SELECT departure_time FROM flights WHERE id = ?",
        [returnFlightId]
      );
      
      if (flightRows.length > 0) {
        returnFlightIdResolved = returnFlightId;
        returnDateResolved = flightRows[0].departure_time;
      }
    }

    // SI returnFlightIdResolved existe mais pas returnDateResolved, on essaie de le trouver
    if (returnFlightIdResolved && !returnDateResolved) {
      const [flightRows] = await connection.query<mysql.RowDataPacket[]>(
        "SELECT departure_time FROM flights WHERE id = ?",
        [returnFlightIdResolved]
      );
      
      if (flightRows.length > 0) {
        returnDateResolved = flightRows[0].departure_time;
      } else {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          error: "Return flight not found in database",
          details: `Aucun vol trouvé avec l'ID ${returnFlightIdResolved}`
        });
      }
    }

  

    // Vérifier les vols
    const TotalPrice2 = returnFlightIdResolved ? totalPrice * 2 : totalPrice;
    const flightIds = returnFlightIdResolved ? [flightId, returnFlightIdResolved] : [flightId];
    const [flightsRows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT id, seats_available FROM flights WHERE id IN (?) FOR UPDATE",
      [flightIds],
    );
    const typeVolV = returnFlightIdResolved ? "roundtrip" : "onway";
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
      // Construction dynamique de la requête en fonction de la présence d'un vol retour
      
      let duplicateCheckQuery = `
        SELECT 
          p.first_name,
          p.last_name,
          b.booking_reference,
          b.status,
          b.departure_date,
          b.return_date,
          f1.flight_number AS outbound_flight,
          f2.flight_number AS return_flight
        FROM passengers p
        JOIN bookings b ON p.booking_id = b.id
        LEFT JOIN flights f1 ON b.flight_id = f1.id
        LEFT JOIN flights f2 ON b.return_flight_id = f2.id
        WHERE LOWER(p.first_name) = ?
          AND LOWER(p.last_name) = ?
          AND b.status NOT IN ('cancelled', 'refunded')
          AND (
            -- 🔹 DÉJÀ SUR LE VOL ALLER
            (
              b.flight_id = ?
              AND DATE(b.departure_date) = DATE(?)
            )
      `;
      
      const queryParams = [
        normalizedFirstName,
        normalizedLastName,
        flightId,
        departureDate
      ];

      // Ajouter la condition pour le vol retour si disponible
      if (returnFlightIdResolved && returnDateResolved) {
        duplicateCheckQuery += `
            -- 🔹 DÉJÀ SUR LE VOL RETOUR
            OR (
              b.return_flight_id = ?
              AND DATE(b.return_date) = DATE(?)
            )

            -- 🔹 DÉJÀ SUR UN ROUNDTRIP COMPLET IDENTIQUE
            OR (
              b.flight_id = ?
              AND b.return_flight_id = ?
              AND DATE(b.departure_date) = DATE(?)
            )
        `;
        
        queryParams.push(
          returnFlightIdResolved,
          returnDateResolved,
          flightId,
          returnFlightIdResolved,
          departureDate
        );
      }

      duplicateCheckQuery += `)`;

      const [existingBasic] = await connection.query<mysql.RowDataPacket[]>(
        duplicateCheckQuery,
        queryParams
      );

      if (existingBasic.length > 0) {
        duplicatePassengers.push({
          passenger: `${passenger.firstName} ${passenger.lastName}`,
          reason: "Même nom et prénom sur même vol et même date",
          existingBookings: existingBasic.map(b => ({
            bookingReference: b.booking_reference,
            status: b.status,
            flightNumber: b.outbound_flight || b.return_flight,
            departureDate: b.departure_date,
            returnDate: b.return_date
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
        message: `Impossible de créer le ticket. Le(s) passager(s) suivant(s) ont déjà une réservation sur ce vol : ${duplicateNames}`
      });
    }

   

    // Création réservation
    const bookingReference = `TICKET-${Math.floor(100000 + Math.random() * 900000)}`;

    const depDate = formatDateToSQL(departureDate);
    const retDate = returnDateResolved ? formatDateToSQL(returnDateResolved) : null;

    const [bookingResultRows] = await connection.query<mysql.OkPacket>(
      `INSERT INTO bookings (
          flight_id, payment_intent_id, total_price, currency,
          contact_email, contact_phone, status,
          type_vol, type_v, guest_user, guest_email,
          created_at, updated_at, departure_date,
          return_date, passenger_count, booking_reference, return_flight_id,
          payment_method, companyName, user_created_booking
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        flightId,
        referenceNumber,
        price,
        currency,
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
        companyName,
        userId,
      ],
    );

    const bookingResult = bookingResultRows as mysql.OkPacket;

    const [pamentResultRows] = await connection.query<mysql.OkPacket>(
      `INSERT INTO payments (
          booking_id, amount, currency,
          payment_method, payment_status, transaction_reference, userId, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookingResult.insertId,
        price,
        currency,
        paymentMethod,
        unpaid || "confirmed",
        referenceNumber,
        userId,
        now 
      ],
    );

    const paymentgResult = pamentResultRows as mysql.OkPacket;

    // Enregistrer les passagers
    for (const passenger of passengers) {
      await connection.query(
        `INSERT INTO passengers (
          booking_id, first_name, middle_name, last_name, date_of_birth, idClient, idTypeClient, gender, title, address, type,
          type_vol, type_v, country, nationality,
          phone, email, nom_urgence, email_urgence, tel_urgence, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bookingResult.insertId,
          passenger.firstName,
          passenger.middleName || null,
          passenger.lastName,
          passenger.dateOfBirth || null,
          passenger.idClient || null,
          passenger.idTypeClient || "passport",
          passenger.gender || "other",
          passenger.title || "Mr",
          passenger.address || null,
          passenger.type,
          passenger.typeVol || "plane",
          typeVolV,
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
      currency,
      price,
      taux_jour,
      contactInfo,
      totalPrice,
      referenceNumber,
      unpaid,
      returnFlightId,
      departureDate,
      companyName,
      paymentMethod = "card",
    } = req.body;

    const typeVol = passengers[0]?.typeVol || "";
    const typecharter = passengers[0]?.typecharter || "";

    // VÉRIFICATION : S'assurer qu'il y a au moins un passager
    if (!passengers || passengers.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        error: "Au moins un passager est requis pour créer un ticket",
        details: "La liste des passagers est vide"
      });
    }


    let returnFlightIdResolved = returnFlightId || null;
    let returnDateResolved = null;

    // Si le client a fourni un numéro de vol retour
    if (passengers[0]?.flightNumberReturn) {
      const flightNumberReturn = passengers[0].flightNumberReturn.trim().toUpperCase();

      // CORRECTION : Utiliser departure_time au lieu de departure_date
      const [returnFlightRows] = await connection.query<mysql.RowDataPacket[]>(
        "SELECT id, departure_time FROM flights WHERE flight_number = ?",
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
      // CORRECTION : Récupérer departure_time
      returnDateResolved = returnFlightRows[0].departure_time;
    }

    // SI returnFlightId est fourni directement mais pas returnDate, on le récupère de la DB
    if (returnFlightId && !returnDateResolved) {
      const [flightRows] = await connection.query<mysql.RowDataPacket[]>(
        "SELECT departure_time FROM flights WHERE id = ?",
        [returnFlightId]
      );
      
      if (flightRows.length > 0) {
        returnFlightIdResolved = returnFlightId;
        returnDateResolved = flightRows[0].departure_time;
      }
    }

    // SI returnFlightIdResolved existe mais pas returnDateResolved, on essaie de le trouver
    if (returnFlightIdResolved && !returnDateResolved) {
      const [flightRows] = await connection.query<mysql.RowDataPacket[]>(
        "SELECT departure_time FROM flights WHERE id = ?",
        [returnFlightIdResolved]
      );
      
      if (flightRows.length > 0) {
        returnDateResolved = flightRows[0].departure_time;
      } else {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          error: "Return flight not found in database",
          details: `Aucun vol trouvé avec l'ID ${returnFlightIdResolved}`
        });
      }
    }

  

    // Vérifier les vols
    const TotalPrice2 = returnFlightIdResolved ? totalPrice * 2 : totalPrice;
    const flightIds = returnFlightIdResolved ? [flightId, returnFlightIdResolved] : [flightId];
    const [flightsRows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT id, seats_available FROM flights WHERE id IN (?) FOR UPDATE",
      [flightIds],
    );
    const typeVolV = returnFlightIdResolved ? "roundtrip" : "onway";
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
      // Construction dynamique de la requête en fonction de la présence d'un vol retour
      
      let duplicateCheckQuery = `
        SELECT 
          p.first_name,
          p.last_name,
          b.booking_reference,
          b.status,
          b.departure_date,
          b.return_date,
          f1.flight_number AS outbound_flight,
          f2.flight_number AS return_flight
        FROM passengers p
        JOIN bookings b ON p.booking_id = b.id
        LEFT JOIN flights f1 ON b.flight_id = f1.id
        LEFT JOIN flights f2 ON b.return_flight_id = f2.id
        WHERE LOWER(p.first_name) = ?
          AND LOWER(p.last_name) = ?
          AND b.status NOT IN ('cancelled', 'refunded')
          AND (
            -- 🔹 DÉJÀ SUR LE VOL ALLER
            (
              b.flight_id = ?
              AND DATE(b.departure_date) = DATE(?)
            )
      `;
      
      const queryParams = [
        normalizedFirstName,
        normalizedLastName,
        flightId,
        departureDate
      ];

      // Ajouter la condition pour le vol retour si disponible
      if (returnFlightIdResolved && returnDateResolved) {
        duplicateCheckQuery += `
            -- 🔹 DÉJÀ SUR LE VOL RETOUR
            OR (
              b.return_flight_id = ?
              AND DATE(b.return_date) = DATE(?)
            )

            -- 🔹 DÉJÀ SUR UN ROUNDTRIP COMPLET IDENTIQUE
            OR (
              b.flight_id = ?
              AND b.return_flight_id = ?
              AND DATE(b.departure_date) = DATE(?)
            )
        `;
        
        queryParams.push(
          returnFlightIdResolved,
          returnDateResolved,
          flightId,
          returnFlightIdResolved,
          departureDate
        );
      }

      duplicateCheckQuery += `)`;

      const [existingBasic] = await connection.query<mysql.RowDataPacket[]>(
        duplicateCheckQuery,
        queryParams
      );

      if (existingBasic.length > 0) {
        duplicatePassengers.push({
          passenger: `${passenger.firstName} ${passenger.lastName}`,
          reason: "Même nom et prénom sur même vol et même date",
          existingBookings: existingBasic.map(b => ({
            bookingReference: b.booking_reference,
            status: b.status,
            flightNumber: b.outbound_flight || b.return_flight,
            departureDate: b.departure_date,
            returnDate: b.return_date
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
        message: `Impossible de créer le ticket. Le(s) passager(s) suivant(s) ont déjà une réservation sur ce vol : ${duplicateNames}`
      });
    }

   

    // Création réservation
    const bookingReference = `TICKET-${Math.floor(100000 + Math.random() * 900000)}`;

    const depDate = formatDateToSQL(departureDate);
    const retDate = returnDateResolved ? formatDateToSQL(returnDateResolved) : null;

    const [bookingResultRows] = await connection.query<mysql.OkPacket>(
      `INSERT INTO bookings (
          flight_id, payment_intent_id, total_price, currency,
          contact_email, contact_phone, status,
          type_vol, typecharter, type_v, guest_user, guest_email,
          created_at, updated_at, departure_date,
          return_date, passenger_count, booking_reference, return_flight_id,
          payment_method, companyName, user_created_booking
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        flightId,
        referenceNumber,
        price,
        currency,
        contactInfo.email,
        contactInfo.phone,
        unpaid || "confirmed",
        typeVol,
        typecharter,
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
        companyName,
        userId,
      ],
    );

    const bookingResult = bookingResultRows as mysql.OkPacket;

    const [pamentResultRows] = await connection.query<mysql.OkPacket>(
      `INSERT INTO payments (
          booking_id, amount, currency,
          payment_method, payment_status, transaction_reference, userId, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookingResult.insertId,
        price,
        currency,
        paymentMethod,
        unpaid || "confirmed",
        referenceNumber,
        userId,
        now 
      ],
    );

    const paymentgResult = pamentResultRows as mysql.OkPacket;

    // Enregistrer les passagers
    for (const passenger of passengers) {
      await connection.query(
        `INSERT INTO passengers (
          booking_id, first_name, middle_name, last_name, date_of_birth, idClient, idTypeClient, gender, title, address, type,
          type_vol, typecharter, type_v, country, nationality,
          phone, email, nom_urgence, email_urgence, tel_urgence, selectedSeat, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bookingResult.insertId,
          passenger.firstName,
          passenger.middleName || null,
          passenger.lastName,
          passenger.dateOfBirth || null,
          passenger.idClient || null,
          passenger.idTypeClient || "passport",
          passenger.gender || "other",
          passenger.title || "Mr",
          passenger.address || null,
          passenger.type,
          passenger.typeVol || "",
          passenger.typecharter || "",
          typeVolV,
          passenger.country,
          passenger.nationality || null,
          passenger.phone || contactInfo.phone,
          passenger.email || contactInfo.email,
          passenger.nom_urgence || null,
          passenger.email_urgence || null,
          passenger.tel_urgence || null,
          passenger.selectedSeat || null,
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



/**
 * API pour vérifier si un siège est déjà sélectionné
 * Méthode: POST
 * Route: /api/check-seat-availability
 */
app.post('/api/check-seat-availability', authMiddleware, async (req: Request, res: Response) => {
    const connection = await pool.getConnection();
    
    try {
        const { flightId, seatNumber, flightNumber } = req.body;

        console.log('🔍 Vérification siège - Données reçues:', { flightId, seatNumber, flightNumber });

        // Validation des données d'entrée
        if (!flightId && !flightNumber) {
            await connection.release();
            return res.status(400).json({
                success: false,
                error: "Missing required fields",
                message: "Veuillez fournir soit flightId, soit flightNumber"
            });
        }



        if (!seatNumber) {
            await connection.release();
            return res.status(400).json({
                success: false,
                error: "Missing required field",
                message: "Le numéro de siège est requis"
            });
        }

        // Nettoyer et normaliser le numéro de siège
        const cleanSeatNumber = seatNumber.trim().toUpperCase();
        console.log('🔍 Siège normalisé:', cleanSeatNumber);

        // Valider le format du siège (ex: 12A, 24F, 1A)
        const seatRegex = /^(\d+)([A-F])$/i;
        if (!seatRegex.test(cleanSeatNumber)) {
            await connection.release();
            return res.status(400).json({
                success: false,
                error: "Invalid seat format",
                message: "Format de siège invalide. Utilisez le format: numéro + lettre (ex: 12A, 24F, 1A)"
            });
        }

        let flightInfo: mysql.RowDataPacket | null = null;

        // Récupérer les informations du vol
        if (flightId) {
            const [flightRows] = await connection.query<mysql.RowDataPacket[]>(
                'SELECT id, flight_number, seats_available, total_seat FROM flights WHERE id = ?',
                [flightId]
            );
            
            if (flightRows.length === 0) {
                await connection.release();
                return res.status(404).json({
                    success: false,
                    error: "Flight not found",
                    message: "Vol non trouvé avec cet ID"
                });
            }
            
            flightInfo = flightRows[0];
        } else if (flightNumber) {
            const [flightRows] = await connection.query<mysql.RowDataPacket[]>(
                'SELECT id, flight_number, seats_available, total_seat FROM flights WHERE flight_number = ?',
                [flightNumber.toUpperCase()]
            );
            
            if (flightRows.length === 0) {
                await connection.release();
                return res.status(404).json({
                    success: false,
                    error: "Flight not found",
                    message: `Vol ${flightNumber} non trouvé`
                });
            }
            
            flightInfo = flightRows[0];
        }

        // Vérifier que flightInfo est bien défini (TypeScript safety)
        if (!flightInfo) {
            await connection.release();
            return res.status(400).json({
                success: false,
                error: "Flight information not found",
                message: "Impossible de récupérer les informations du vol"
            });
        }

        console.log('🔍 Informations vol trouvées:', {
            flightId: flightInfo.id,
            flightNumber: flightInfo.flight_number,
            seatsAvailable: flightInfo.seats_available,
            totalSeats: flightInfo.total_seat
        });

        // Vérifier la capacité du siège
        const seatMatch = cleanSeatNumber.match(seatRegex);
        if (!seatMatch) {
            await connection.release();
            return res.status(400).json({
                success: false,
                error: "Invalid seat format",
                message: "Format de siège invalide"
            });
        }

        const seatRow = parseInt(seatMatch[1]);
        const seatLetter = seatMatch[2].toUpperCase();
        
        // Vérifier si la rangée existe (basée sur le nombre total de sièges)
        const totalRows = Math.ceil(flightInfo.total_seat / 6); // 6 sièges par rangée pour Boeing 737-800
        if (seatRow > totalRows || seatRow < 1) {
            await connection.release();
            return res.status(400).json({
                success: false,
                error: "Invalid seat row",
                message: `La rangée ${seatRow} n'existe pas. Les rangées disponibles sont de 1 à ${totalRows}`
            });
        }

        // Vérifier si la lettre du siège est valide (A-F)
        if (!['A', 'B', 'C', 'D', 'E', 'F'].includes(seatLetter)) {
            await connection.release();
            return res.status(400).json({
                success: false,
                error: "Invalid seat letter",
                message: "La lettre du siège doit être entre A et F"
            });
        }

        console.log('🔍 Recherche sièges occupés pour:', {
            flightId: flightInfo.id,
            seatNumber: cleanSeatNumber
        });

        // 1. Vérifier les sièges occupés (version améliorée)
        const [occupiedSeats] = await connection.query<mysql.RowDataPacket[]>(`
            SELECT 
                p.selectedSeat,
                p.first_name,
                p.last_name,
                b.booking_reference,
                b.status,
                b.departure_date
            FROM passengers p
            JOIN bookings b ON p.booking_id = b.id
            WHERE b.flight_id = ?
                AND TRIM(UPPER(p.selectedSeat)) = ?
                AND b.status NOT IN ('cancelled', 'refunded')
        `, [flightInfo.id, cleanSeatNumber]);

        console.log('🔍 Sièges occupés (vol aller) trouvés:', occupiedSeats.length);

        // 2. Vérifier aussi pour les vols retour
        const [occupiedSeatsReturn] = await connection.query<mysql.RowDataPacket[]>(`
            SELECT 
                p.selectedSeat,
                p.first_name,
                p.last_name,
                b.booking_reference,
                b.status,
                b.return_date
            FROM passengers p
            JOIN bookings b ON p.booking_id = b.id
            WHERE b.return_flight_id = ?
                AND TRIM(UPPER(p.selectedSeat)) = ?
                AND b.status NOT IN ('cancelled', 'refunded')
        `, [flightInfo.id, cleanSeatNumber]);

        console.log('🔍 Sièges occupés (vol retour) trouvés:', occupiedSeatsReturn.length);

        const allOccupiedSeats = [...occupiedSeats, ...occupiedSeatsReturn];

        if (allOccupiedSeats.length > 0) {
            const passengerInfo = allOccupiedSeats[0];
            console.log('❌ Siège occupé par:', passengerInfo);
            
            await connection.release();
            return res.status(409).json({
                success: false,
                available: false,
                seatNumber: cleanSeatNumber,
                occupiedBy: `${passengerInfo.first_name} ${passengerInfo.last_name}`,
                bookingReference: passengerInfo.booking_reference,
                flightNumber: flightInfo.flight_number,
                message: `Le siège ${cleanSeatNumber} est déjà réservé sur le vol ${flightInfo.flight_number}`
            });
        }

        // 3. Si le siège est libre, récupérer tous les sièges occupés pour affichage dans l'interface
        const [allOccupiedSeatsForFlight] = await connection.query<mysql.RowDataPacket[]>(`
            SELECT DISTINCT TRIM(UPPER(p.selectedSeat)) as selectedSeat
            FROM passengers p
            JOIN bookings b ON p.booking_id = b.id
            WHERE (b.flight_id = ? OR b.return_flight_id = ?)
                AND p.selectedSeat IS NOT NULL
                AND p.selectedSeat != ''
                AND TRIM(p.selectedSeat) != ''
                AND b.status NOT IN ('cancelled', 'refunded')
            ORDER BY selectedSeat
        `, [flightInfo.id, flightInfo.id]);

        const occupiedSeatsList = allOccupiedSeatsForFlight
            .map(item => item.selectedSeat)
            .filter(seat => seat && seat.trim() !== '');

        console.log('🔍 Tous les sièges occupés pour ce vol:', occupiedSeatsList);

        // 4. Vérifier aussi dans la table des sièges réservés si elle existe
        let reservedSeats: string[] = [];
        try {
            // Vérifier si la table 'reserved_seats' existe
            const [tableCheck] = await connection.query<mysql.RowDataPacket[]>(`
                SELECT TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'reserved_seats'
            `);

            if (tableCheck.length > 0) {
                const [reservedRows] = await connection.query<mysql.RowDataPacket[]>(`
                    SELECT seat_number 
                    FROM reserved_seats 
                    WHERE flight_id = ? 
                    AND TRIM(UPPER(seat_number)) = ?
                `, [flightInfo.id, cleanSeatNumber]);

                if (reservedRows.length > 0) {
                    console.log('❌ Siège réservé dans table reserved_seats');
                    await connection.release();
                    return res.status(409).json({
                        success: false,
                        available: false,
                        seatNumber: cleanSeatNumber,
                        message: `Le siège ${cleanSeatNumber} est réservé sur le vol ${flightInfo.flight_number}`
                    });
                }
            }
        } catch (tableError) {
            console.log('ℹ️ Table reserved_seats non trouvée, continuation normale');
        }

        // Récupérer les informations du vol pour la réponse
        const [flightDetails] = await connection.query<mysql.RowDataPacket[]>(`
            SELECT 
                f.id,
                f.flight_number,
                f.from,
                f.to,
                f.fromCity,
                f.toCity,
                f.departure_time,
                f.arrival_time,
                f.seats_available,
                f.total_seat,
                f.airline,
                f.type,
                f.price,
                f.currency
            FROM flights f
            WHERE f.id = ?
        `, [flightInfo.id]);

        await connection.release();
        
        console.log('✅ Siège disponible:', cleanSeatNumber);
        
        res.status(200).json({
            success: true,
            available: true,
            seatNumber: cleanSeatNumber,
            flight: flightDetails[0] || flightInfo,
            occupiedSeats: occupiedSeatsList,
            seatsAvailable: flightInfo.seats_available,
            message: `Le siège ${cleanSeatNumber} est disponible sur le vol ${flightInfo.flight_number}`
        });

    } catch (error: any) {
        console.error('❌ ERREUR vérification siège:', error);
        
        if (connection) {
            await connection.release();
        }
        
        res.status(500).json({
            success: false,
            error: "Server error",
            message: "Une erreur est survenue lors de la vérification du siège",
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
});

/**
 * API pour récupérer tous les sièges occupés d'un vol
 * Méthode: GET
 * Route: /api/occupied-seats/:flightId
 */
app.get('/api/occupied-seats/:flightId', authMiddleware, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const flightId = req.params.flightId;

        const [seats] = await connection.query<mysql.RowDataPacket[]>(`
            SELECT DISTINCT 
                p.selectedSeat,
                p.first_name,
                p.last_name,
                b.booking_reference,
                b.status,
                b.departure_date,
                b.return_date,
                f1.flight_number AS outbound_flight,
                f2.flight_number AS return_flight
            FROM passengers p
            JOIN bookings b ON p.booking_id = b.id
            LEFT JOIN flights f1 ON b.flight_id = f1.id
            LEFT JOIN flights f2 ON b.return_flight_id = f2.id
            WHERE (b.flight_id = ? OR b.return_flight_id = ?)
                AND p.selectedSeat IS NOT NULL
                AND p.selectedSeat != ''
                AND b.status NOT IN ('cancelled', 'refunded')
            ORDER BY 
                CAST(SUBSTRING(p.selectedSeat, 1, LENGTH(p.selectedSeat)-1) AS UNSIGNED),
                SUBSTRING(p.selectedSeat, -1)
        `, [flightId, flightId]);

        // Récupérer les informations du vol
        const [flightInfo] = await connection.query<mysql.RowDataPacket[]>(`
            SELECT 
                id,
                flight_number,
                seats_available,
                total_seat
            FROM flights 
            WHERE id = ?
        `, [flightId]);

        if (flightInfo.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Flight not found",
                message: "Vol non trouvé"
            });
        }

        res.status(200).json({
            success: true,
            flightId: flightId,
            flightNumber: flightInfo[0].flight_number,
            totalSeats: flightInfo[0].total_seat,
            seatsAvailable: flightInfo[0].seats_available,
            occupiedSeats: seats,
            count: seats.length
        });

    } catch (error) {
        console.error('❌ ERREUR récupération sièges occupés:', error);
        
        res.status(500).json({
            success: false,
            error: "Server error",
            message: "Une erreur est survenue lors de la récupération des sièges occupés"
        });
    } finally {
        connection.release();
    }
});

/**
 * API pour mettre à jour la sélection de siège après création du ticket
 * Méthode: POST
 * Route: /api/update-seat-selection
 * 
 * 
 
 */

app.post('/api/update-seat-selection', authMiddleware, async (req: Request, res: Response) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

       const { bookingId, passengerIds, seatNumbers } = req.body;
        
        // Utiliser l'assertion de type pour req.user
        const reqWithUser = req as any;
        const userId = reqWithUser.user?.id;
        
        if (!userId) {
            await connection.rollback();
            connection.release();
            return res.status(401).json({
                success: false,
                error: "Unauthorized",
                message: "Utilisateur non authentifié"
            });
        }

        if (!bookingId || !passengerIds || !seatNumbers) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: "Missing required fields",
                message: "bookingId, passengerIds et seatNumbers sont requis"
            });
        }

        if (passengerIds.length !== seatNumbers.length) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                error: "Mismatched arrays",
                message: "Le nombre de passagers et de sièges doit correspondre"
            });
        }

        // Vérifier que la réservation existe et appartient à l'utilisateur
        const [bookingRows] = await connection.query<mysql.RowDataPacket[]>(
            'SELECT id, flight_id, user_created_booking FROM bookings WHERE id = ?',
            [bookingId]
        );

        if (bookingRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                error: "Booking not found",
                message: "Réservation non trouvée"
            });
        }

        const booking = bookingRows[0];

        // Mettre à jour chaque passager avec son siège
        const updates = [];
        for (let i = 0; i < passengerIds.length; i++) {
            const passengerId = passengerIds[i];
            const seatNumber = seatNumbers[i];

            // Valider le format du siège
            const seatRegex = /^(\d+)([A-F])$/i;
            if (!seatRegex.test(seatNumber)) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    error: "Invalid seat format",
                    message: `Format de siège invalide: ${seatNumber}. Utilisez le format: numéro + lettre (ex: 12A)`
                });
            }

            // Vérifier si le siège est déjà pris pour ce vol
            const [existingSeat] = await connection.query<mysql.RowDataPacket[]>(`
                SELECT p.id, p.first_name, p.last_name 
                FROM passengers p
                JOIN bookings b ON p.booking_id = b.id
                WHERE (b.flight_id = ? OR b.return_flight_id = ?)
                    AND p.selectedSeat = ?
                    AND p.id != ?
                    AND b.status NOT IN ('cancelled', 'refunded')
            `, [booking.flight_id, booking.flight_id, seatNumber, passengerId]);

            if (existingSeat.length > 0) {
                await connection.rollback();
                return res.status(409).json({
                    success: false,
                    error: "Seat already taken",
                    seatNumber: seatNumber,
                    occupiedBy: `${existingSeat[0].first_name} ${existingSeat[0].last_name}`,
                    message: `Le siège ${seatNumber} est déjà occupé`
                });
            }

            // Mettre à jour le siège du passager
            const [updateResult] = await pool.execute<mysql.OkPacket>(
                'UPDATE passengers SET selectedSeat = ?, updated_at = NOW() WHERE id = ? AND booking_id = ?',
                [seatNumber, passengerId, bookingId]
            );

            updates.push({
                passengerId: passengerId,
                seatNumber: seatNumber,
                updated: updateResult.affectedRows > 0
            });
        }

        // Log de l'action
        await connection.query(
            'INSERT INTO seat_selection_logs (booking_id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, NOW())',
            [bookingId, userId, 'UPDATE_SEATS', JSON.stringify({ updates, seatNumbers })]
        );

        await connection.commit();

        res.status(200).json({
            success: true,
            bookingId: bookingId,
            updates: updates,
            message: "Sélection de sièges mise à jour avec succès"
        });

    } catch (error) {
        await connection.rollback();
        console.error('❌ ERREUR mise à jour siège:', error);
        
        res.status(500).json({
            success: false,
            error: "Server error",
            message: "Une erreur est survenue lors de la mise à jour des sièges"
        });
    } finally {
        connection.release();
    }
});




// Route pour récupérer uniquement le prix d'un vol
app.get("/api/flights/get-price/:flightNumber", async (req: Request, res: Response) => {
  try {
    const { flightNumber } = req.params;

    if (!flightNumber || flightNumber.trim() === "") {
      return res.status(400).json({ 
        success: false,
        message: "Le numéro de vol est requis"
      });
    }

    const searchTerm = flightNumber.trim();
    
    // Vérifiez d'abord quelles colonnes existent dans votre table
    console.log("🔍 Recherche du vol:", searchTerm);
    
    const [flightRows] = await pool.query<mysql.RowDataPacket[]>(`
      SELECT 
        id,
        flight_number,
        price
      FROM flights
      WHERE 
        flight_number = ? OR
        flight_number LIKE CONCAT(?, '%') OR
        flight_number LIKE CONCAT('%', ?) OR
        id = ?
      LIMIT 1
    `, [searchTerm, searchTerm, searchTerm, searchTerm]);

    console.log("📊 Résultats trouvés:", flightRows.length);

    if (flightRows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: `Vol "${flightNumber}" non trouvé`
      });
    }

    const flight = flightRows[0];
    
    console.log("✅ Vol trouvé:", {
      id: flight.id,
      flight_number: flight.flight_number,
      price: flight.price
    });

    // Retournez simplement le prix, sans currency
    res.json({
      success: true,
      price: Number(flight.price)
      // Ne pas inclure currency si la colonne n'existe pas
    });
  } catch (error) {
    console.error("Erreur récupération prix:", error);
    res.status(500).json({ 
      success: false,
      message: "Erreur serveur"
    });
  }
});



// Register (protégé)
// app.post("/api/register", authMiddleware, adminOnly, async (req: Request, res: Response) => {
//   const { userName, name, email, password, phone, role } = req.body; // optionnel: permettre de créer admin
//   console.log("Register body:", req.body);

//   if (!userName || !name || !email || !password) {
//     return res.status(400).json({ error: "Nom, email et mot de passe requis" });
//   }

//   try {
//     const [rows] = await pool.query<User[]>("SELECT * FROM users WHERE email = ?", [email]);
//     if (rows.length > 0) {
//       return res.status(400).json({ error: "Email déjà utilisé" });
//     }

//      const [rows2] = await pool.query<User[]>("SELECT * FROM users WHERE userName = ?", [userName]);
//     if (rows2.length > 0) {
//       return res.status(400).json({ error: "Nom utilisateur déjà utilisé" });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const [result] = await pool.execute<ResultSetHeader>(
//       "INSERT INTO users (userName, name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?, ?)",
//       [userName, name, email, hashedPassword, phone ?? null, role ?? "user"]
//     );

//     res.status(201).json({ success: true, id: (result as ResultSetHeader).insertId });
//   } catch (err) {
//     console.error("Register error:", err);
//     res.status(500).json({ error: "Erreur serveur" });
//   }
// });

app.post("/api/register", authMiddleware, adminOnly, async (req: Request, res: Response) => {
  const { username, name, password, phone, role } = req.body;
  

  if (!username || !name || !password || !role) {
    return res.status(400).json({
      error: "Username, nom, rôle et mot de passe requis",
    });
  }

  try {
   
    const [usernameExists] = await pool.query<User[]>(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );

    if (usernameExists.length > 0) {
      return res.status(400).json({ error: "Username already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const allowedRoles = ["user", "agent", "admin"];
    const finalRole = allowedRoles.includes(role) ? role : "user";

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO users (username, name, password_hash, phone, role)
       VALUES (?, ?, ?, ?, ?)`,
      [username, name, hashedPassword, phone ?? null, finalRole]
    );

    res.status(201).json({
      success: true,
      id: result.insertId,
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});


// Login
// app.post("/api/login", async (req: Request, res: Response) => {
//   const { email, password } = req.body;

//   try {
//     // Vérifier si l'utilisateur existe
//     const [rows] = await pool.query<User[]>("SELECT * FROM users WHERE email = ?", [email]);
//     if (rows.length === 0) {
//       return res.status(401).json({ error: "Email ou mot de passe incorrect" });
//     }

//     const user = rows[0];

//     // Vérifier le mot de passe
//     const validPassword = await bcrypt.compare(password, user.password_hash);
//     if (!validPassword) {
//       return res.status(401).json({ error: "Email ou mot de passe incorrect" });
//     }

//     // Générer un JWT
//     const token = jwt.sign(
//       { id: user.id, email: user.email },
//       process.env.JWT_SECRET || "secretKey",
//       { expiresIn: "1d" }
//     );

//     res.json({
//       success: true,
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         phone: user.phone,
//         role: user.role,
//       },
//     });
//   } catch (err) {
//     console.error("Login error:", err);
//     res.status(500).json({ error: "Erreur serveur" });
//   }
// });


app.post("/api/login", async (req: Request, res: Response) => {
  const { identifier, password } = req.body; // email OU username

  if (!identifier || !password) {
    return res.status(400).json({ error: "Champs requis manquants" });
  }

  try {
    // 🔐 Vérifier si l'utilisateur existe par email OU username
    const [rows] = await pool.query<User[]>(
      "SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1",
      [identifier, identifier]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Identifiant ou mot de passe incorrect" });
    }

    const user = rows[0];

    // 🔑 Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: "Identifiant ou mot de passe incorrect" });
    }

    // 🎫 Générer le JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
      },
      process.env.JWT_SECRET || "secretKey",
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        permissions: user.permissions,
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
      "SELECT * FROM users ORDER BY id DESC"
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


app.put("/api/usersbon/:id", authMiddleware, async (req: any, res: Response) => {
  const { name, username, email, password_hash, phone, role } = req.body;
  const userId = parseInt(req.params.id, 10);

  // Vérifier que l’utilisateur connecté modifie son propre compte

  if (!req.user || !req.user.id) {
  return res.status(401).json({ error: "Utilisateur non authentifié" });
}

if (req.user.id !== userId) {
  return res.status(403).json({ error: "Non autorisé" });
}


  try {
    let hashedPassword;
    if (password_hash) {
      hashedPassword = await bcrypt.hash(password_hash, 10);
    }

    await pool.execute(
      "UPDATE users SET name = COALESCE(?, name), username = COALESCE(?, username), email = COALESCE(?, email), password_hash = COALESCE(?, password_hash), phone = COALESCE(?, phone), role = COALESCE(?, role) WHERE id = ?",
      [name, username, email, hashedPassword, phone, role, userId]
    );

    res.json({ success: true, message: "Utilisateur mis à jour" });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});



//  Modifier un utilisateur (protégé)
// Modifier un utilisateur (protégé)
app.put("/api/users/:id", authMiddleware, async (req: any, res: Response) => {
  const { name, username, email, password, phone, role } = req.body; // Changez password_hash à password
  const userId = parseInt(req.params.id, 10);

  // Vérifier les permissions
  // Admin peut modifier n'importe quel utilisateur
  // Utilisateur peut modifier seulement son propre compte
  if (req.user.role !== "admin" && req.user.id !== userId) {
    return res.status(403).json({ error: "Non autorisé" });
  }

  // Si l'utilisateur n'est pas admin, il ne peut pas changer son rôle
  if (req.user.role !== "admin" && role && role !== req.user.role) {
    return res.status(403).json({ error: "Vous ne pouvez pas modifier votre rôle" });
  }

  try {
    let hashedPassword = undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Construire dynamiquement la requête
    const updateFields = [];
    const updateValues = [];
    
    if (name) { updateFields.push("name = ?"); updateValues.push(name); }
    if (username) { updateFields.push("username = ?"); updateValues.push(username); }
    if (email) { updateFields.push("email = ?"); updateValues.push(email); }
    if (hashedPassword) { updateFields.push("password_hash = ?"); updateValues.push(hashedPassword); }
    if (phone) { updateFields.push("phone = ?"); updateValues.push(phone); }
    if (role && req.user.role === "admin") { updateFields.push("role = ?"); updateValues.push(role); }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "Aucune donnée à mettre à jour" });
    }

    updateValues.push(userId);
    
    const query = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`;
    
    await pool.execute(query, updateValues);

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

app.put("/api/roles/permissions", authMiddleware, async (req: any, res: Response) => {


  const { userId, permissions } = req.body;

  // Validation stricte
  if (!userId || userId === "" || userId === null || userId === undefined) {
    return res.status(400).json({
      success: false,
      message: "userId est requis et ne peut pas être vide",
    });
  }

  if (!permissions || typeof permissions !== 'object') {
    return res.status(400).json({
      success: false,
      message: "permissions doit être un objet JSON",
    });
  }

  try {
    // Convertir en CSV
    const permissionsArray: string[] = [];
    
    Object.entries(permissions).forEach(([key, value]) => {
      // Vérification stricte du type boolean
      if (value === true || value === "true") {
        permissionsArray.push(key);
      }
    });
    
    const permissionsString = permissionsArray.join(',');
  

    // **IMPORTANT : Convertir les types explicitement**
    const userIdNumber = parseInt(userId.toString(), 10);
    if (isNaN(userIdNumber)) {
      return res.status(400).json({
        success: false,
        message: "userId doit être un nombre valide",
      });
    }

    // Méthode 1: Exécution directe avec types corrects
    console.log("Exécution avec paramètres:", [permissionsString, userIdNumber]);
    
    const [result] = await pool.execute(
      "UPDATE users SET permissions = ? WHERE id = ?",
      [permissionsString, userIdNumber] // Types explicites
    );

 
    
    res.json({ 
      success: true,
      message: "Permissions mises à jour avec succès",
      userId: userIdNumber,
      storedValue: permissionsString,
      affectedRows: (result as any).affectedRows
    });

  } catch (error: any) {
  

    // Tentative avec requête non préparée
    if (error.errno === 1210) {
      try {
       
        
        // Recréer permissionsArray pour l'erreur handler
        const errorPermissionsArray: string[] = [];
        Object.entries(req.body.permissions || {}).forEach(([key, value]: [string, any]) => {
          if (value === true || value === "true") {
            errorPermissionsArray.push(key);
          }
        });
        
        // Utiliser query() au lieu de execute() pour éviter les paramètres préparés
        const [result] = await pool.query(
          `UPDATE users SET permissions = '${errorPermissionsArray.join(',')}' WHERE id = ${parseInt(req.body.userId?.toString() || "0", 10)}`
        );
        
        res.json({ 
          success: true,
          message: "Permissions mises à jour (requête directe)",
          warning: "Utilisation de query() au lieu de execute()"
        });
        
      } catch (directError: any) {

        
        res.status(500).json({
          success: false,
          message: "Erreur MySQL avec les arguments",
          error: {
            code: error.code,
            errno: error.errno,
            message: error.sqlMessage,
            suggestion: "Vérifiez les types des paramètres envoyés à MySQL"
          }
        });
      }
    } else {
      res.status(500).json({
        success: false,
        message: "Erreur serveur",
        error: error.message
      });
    }
  }
});


app.get("/api/users/:id/permissions", authMiddleware, async (req: Request, res: Response) => {
  const userId = req.params.id;

  try {
    const [rows] = await pool.execute(
      "SELECT id, email, name, permissions FROM users WHERE id = ?",
      [userId]
    );

    const user = (rows as any[])[0];
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé"
      });
    }

    res.json({
      success: true,
      permissions: user.permissions,
      name: user.name,
     
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error: any) {
    console.error("Erreur chargement permissions :", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur"
    });
  }
});


app.get("/api/profile", authMiddleware, async (req: any, res: Response) => {
  const [rows] = await pool.query<User[]>("SELECT id, name, email, phone, role, permissions, created_at FROM users WHERE id = ?", [req.user.id]);
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
              ${booking.payment_method === "cash" ? "Cash" : booking.payment_method === "card" ? "Credit/Debit Card" : booking.payment_method === "cheque" ? "Bank Check" : booking.payment_method === "virement" ? "Bank transfer" : booking.payment_method === "transfert" ? "Deposit" : "Contract"}
            </p>
            <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Flight Type:</strong> ${booking.typecharter ? booking.typecharter === "helicopter" ? "Charter Helicopter" : "Charter Plane" : booking.type_vol === "helicopter" ? "Helicopter" : "Air Plane"}
</p>
            
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
                          <strong>Total:</strong> ${booking.total_price}${" "}${booking.currency === "htg" ? "HTG" : "USD"}
                          
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
        ${booking.typecharter ? booking.typecharter === "plane" ? `
        <div style="padding: 8px; font-size: 0.9em; color: #555">
          <p><strong>Important:</strong> Please arrive at the airport at least 1 hour before your departure time. All passengers must present a valid ID at check-in.</p>
          <p><strong>Baggage Limitation:</strong> The maximum allowance for passenger baggage is 30 lb. <strong>Luggage dimensions 65*40*25</strong></p>
          <p><strong>Remarks:</strong> The company declines all responsibility for flight delays, cancellations, or changes resulting from circumstances beyond its control, such as, technical problems, strikes, or any other problems. The customer is responsible for their own personal arrangements (airport arrival time, travel formalities, etc.). No refund or compensation can be claimed in the event of a missed flight for these reasons.</p>
          <p><strong>Remarks 2:</strong> No refund will be given for flights cancelled due to force majeure or technical reasons beyond the airline's control. The ticket price will be retained as a voucher (credit) with the airline, valid for future use in accordance with the applicable fare conditions.</p>
          <p>We look forward to welcoming you on board.</p>
          <p>Sincerely,<br />The Trogon Airways Team</p>
        </div>`  :  `
        <div style="padding: 20px; font-size: 0.9em; color: #555;">
          <p><strong>Important:</strong> Please arrive at the airport at least 1 hour before your departure time. All passengers must present a valid ID at check-in.</p>
          <p><strong>Baggage Limitation:</strong> The maximum allowance for passenger baggage is 20 lb. <strong>Luggage dimensions 35*55*25, Carry on, soft skin</strong></p>
          <p><strong>Remarks:</strong> The company declines all responsibility for flight delays, cancellations, or changes resulting from circumstances beyond its control, such as, technical problems, strikes, or any other problems. The customer is responsible for their own personal arrangements (airport arrival time, travel formalities, etc.). No refund or compensation can be claimed in the event of a missed flight for these reasons.</p>
          <p><strong>Remarks 2:</strong> No refund will be given for flights cancelled due to force majeure or technical reasons beyond the airline's control. The ticket price will be retained as a voucher (credit) with the airline, valid for future use in accordance with the applicable fare conditions.</p>
          <p>We look forward to welcoming you on board.</p>
          <p>Sincerely,<br>The Trogon Airways Team</p>
        </div>` :
        booking.type_vol === "plane" ? `
        <div style="padding: 8px; font-size: 0.9em; color: #555">
          <p><strong>Important:</strong> Please arrive at the airport at least 1 hour before your departure time. All passengers must present a valid ID at check-in.</p>
          <p><strong>Baggage Limitation:</strong> The maximum allowance for passenger baggage is 30 lb. <strong>Luggage dimensions 65*40*25</strong></p>
          <p><strong>Remarks:</strong> The company declines all responsibility for flight delays, cancellations, or changes resulting from circumstances beyond its control, such as, technical problems, strikes, or any other problems. The customer is responsible for their own personal arrangements (airport arrival time, travel formalities, etc.). No refund or compensation can be claimed in the event of a missed flight for these reasons.</p>
          <p><strong>Remarks 2:</strong> No refund will be given for flights cancelled due to force majeure or technical reasons beyond the airline's control. The ticket price will be retained as a voucher (credit) with the airline, valid for future use in accordance with the applicable fare conditions.</p>
          <p>We look forward to welcoming you on board.</p>
          <p>Sincerely,<br />The Trogon Airways Team</p>
        </div>` : `
        <div style="padding: 20px; font-size: 0.9em; color: #555;">
          <p><strong>Important:</strong> Please arrive at the airport at least 1 hour before your departure time. All passengers must present a valid ID at check-in.</p>
          <p><strong>Baggage Limitation:</strong> The maximum allowance for passenger baggage is 20 lb. <strong>Luggage dimensions 35*55*25, Carry on, soft skin</strong></p>
          <p><strong>Remarks:</strong> The company declines all responsibility for flight delays, cancellations, or changes resulting from circumstances beyond its control, such as, technical problems, strikes, or any other problems. The customer is responsible for their own personal arrangements (airport arrival time, travel formalities, etc.). No refund or compensation can be claimed in the event of a missed flight for these reasons.</p>
          <p><strong>Remarks 2:</strong> No refund will be given for flights cancelled due to force majeure or technical reasons beyond the airline's control. The ticket price will be retained as a voucher (credit) with the airline, valid for future use in accordance with the applicable fare conditions.</p>
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
          <p>Merci d'avoir choisi Trogon Airways. Veuillez trouver ci-dessous votre billet électronique. Nous vous recommandons d'imprimer cette section ou de la présenter sur votre appareil mobile à l&apos;aéroport.</p>
        </div>

        <!-- Section E-Ticket -->
        <div style="border-top: 2px dashed #ccc; margin: 0 20px; padding-top: 8px">
          <div style="padding: 8px; text-align: center">
            <p style="margin: 0; color: #1a237e; font-size: 0.9em">
              <strong>Mode de paiement:</strong>
              ${booking.payment_method === "cash" ? "Espèces" : booking.payment_method === "card" ? "Carte bancaire" : booking.payment_method === "cheque" ? "Chèque bancaire" : booking.payment_method === "virement" ? "Virement bancaire" : booking.payment_method === "transfert" ? "Dépôt" : "Contrat"}
            </p>
            <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Type de vol:</strong> ${booking.typecharter ? booking.typecharter === "helicopter" ? "Charter hélicoptère" : "Charter avion" : booking.type_vol === "helicopter" ? "Hélicoptère" : "Avion"}</p>
            
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
                    <h3 style="color: #1a237e; margin: 0">${booking.return_flight_id ? "Vol Aller-Retour" : "Aller Simple"}</h3>
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
                          <strong>Total:</strong> ${booking.total_price}${" "}${booking.currency === "htg" ? "HTG" : "USD"}
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
         ${booking.typecharter ? booking.typecharter === "plane" ? `
        <div style="padding: 20px; font-size: 0.9em; color: #555;">
          <p><strong>Important:</strong> Veuillez vous présenter à l&apos;aéroport au moins une heure avant votre départ. Tous les passagers doivent présenter une pièce d&apos;identité valide lors de l'enregistrement.</p>
          <p><strong>Limitation des bagages:</strong> La franchise maximale pour les bagages des passagers est de 30 lb. <strong>Mallette dimension 65*40*25</strong></p>
          <p><strong>Remarques:</strong> La compagnie décline toute responsabilité en cas de retard, d'annulation ou de modification de vol imputable à des circonstances indépendantes de sa volonté dû à des problèmes techniques, grèves ou tout autre incident ne relevant pas de sa responsabilité. Le client est responsable de ses propres dispositions (heure d'arrivée à l&apos;aéroport, formalités de voyage, etc.). Aucun remboursement ni indemnisation ne sera accordé en cas de vol manqué pour ces raisons.</p>
          <p><strong>Remarques 2:</strong> Tout vol annulé pour cas de force majeure ou pour des raisons techniques indépendantes de la volonté de la compagnie ne donne lieu à aucun remboursement. Le montant du billet sera conservé sous forme d’avoir (crédit) auprès de la compagnie, valable pour une utilisation ultérieure conformément aux conditions tarifaires en vigueur.</p>
          <p>Nous nous réjouissons de vous accueillir à bord.</p>
          <p>Cordialement,<br>L&apos;équipe de Trogon Airways</p>
        </div>`  :  `
        <div style="padding: 20px; font-size: 0.9em; color: #555;">
          <p><strong>Important:</strong> Veuillez vous présenter à l&apos;aéroport au moins une heure avant votre départ. Tous les passagers doivent présenter une pièce d&apos;identité valide lors de l'enregistrement.</p>
          <p><strong>Limitation des bagages:</strong> La franchise maximale pour les bagages des passagers est de 20 lb. <strong>Mallette dimension 35*55*25, Carry on, soft skin</strong></p>
          <p><strong>Remarques:</strong> La compagnie décline toute responsabilité en cas de retard, d'annulation ou de modification de vol imputable à des circonstances indépendantes de sa volonté dû à des problèmes techniques, grèves ou tout autre incident ne relevant pas de sa responsabilité. Le client est responsable de ses propres dispositions (heure d'arrivée à l&apos;aéroport, formalités de voyage, etc.). Aucun remboursement ni indemnisation ne sera accordé en cas de vol manqué pour ces raisons.</p>
          <p><strong>Remarques 2:</strong> Tout vol annulé pour cas de force majeure ou pour des raisons techniques indépendantes de la volonté de la compagnie ne donne lieu à aucun remboursement. Le montant du billet sera conservé sous forme d’avoir (crédit) auprès de la compagnie, valable pour une utilisation ultérieure conformément aux conditions tarifaires en vigueur.</p>
          <p>Nous nous réjouissons de vous accueillir à bord.</p>
          <p>Cordialement,<br>L&apos;équipe de Trogon Airways</p>
        </div>` :
        booking.type_vol === "plane" ? `
         <div style="padding: 20px; font-size: 0.9em; color: #555;">
          <p><strong>Important:</strong> Veuillez vous présenter à l&apos;aéroport au moins une heure avant votre départ. Tous les passagers doivent présenter une pièce d&apos;identité valide lors de l'enregistrement.</p>
          <p><strong>Limitation des bagages:</strong> La franchise maximale pour les bagages des passagers est de 30 lb. <strong>Mallette dimension 65*40*25</strong></p>
          <p><strong>Remarques:</strong> La compagnie décline toute responsabilité en cas de retard, d'annulation ou de modification de vol imputable à des circonstances indépendantes de sa volonté dû à des problèmes techniques, grèves ou tout autre incident ne relevant pas de sa responsabilité. Le client est responsable de ses propres dispositions (heure d'arrivée à l&apos;aéroport, formalités de voyage, etc.). Aucun remboursement ni indemnisation ne sera accordé en cas de vol manqué pour ces raisons.</p>
          <p><strong>Remarques 2:</strong> Tout vol annulé pour cas de force majeure ou pour des raisons techniques indépendantes de la volonté de la compagnie ne donne lieu à aucun remboursement. Le montant du billet sera conservé sous forme d’avoir (crédit) auprès de la compagnie, valable pour une utilisation ultérieure conformément aux conditions tarifaires en vigueur.</p>
          <p>Nous nous réjouissons de vous accueillir à bord.</p>
          <p>Cordialement,<br>L&apos;équipe de Trogon Airways</p>
        </div>` : `
        <div style="padding: 20px; font-size: 0.9em; color: #555;">
          <p><strong>Important:</strong> Veuillez vous présenter à l&apos;aéroport au moins une heure avant votre départ. Tous les passagers doivent présenter une pièce d&apos;identité valide lors de l'enregistrement.</p>
          <p><strong>Limitation des bagages:</strong> La franchise maximale pour les bagages des passagers est de 20 lb. <strong>Mallette dimension 35*55*25, Carry on, soft skin</strong></p>
          <p><strong>Remarques:</strong> La compagnie décline toute responsabilité en cas de retard, d'annulation ou de modification de vol imputable à des circonstances indépendantes de sa volonté dû à des problèmes techniques, grèves ou tout autre incident ne relevant pas de sa responsabilité. Le client est responsable de ses propres dispositions (heure d'arrivée à l&apos;aéroport, formalités de voyage, etc.). Aucun remboursement ni indemnisation ne sera accordé en cas de vol manqué pour ces raisons.</p>
          <p><strong>Remarques 2:</strong> Tout vol annulé pour cas de force majeure ou pour des raisons techniques indépendantes de la volonté de la compagnie ne donne lieu à aucun remboursement. Le montant du billet sera conservé sous forme d’avoir (crédit) auprès de la compagnie, valable pour une utilisation ultérieure conformément aux conditions tarifaires en vigueur.</p>
          <p>Nous nous réjouissons de vous accueillir à bord.</p>
          <p>Cordialement,<br>L&apos;équipe de Trogon Airways</p>
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
  const requiredFields = ["flight_number", "departure_location_id", "arrival_location_id", "departure_time", "arrival_time"];

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
             (flight_number, type, charter, typecharter, airline, departure_location_id, arrival_location_id, 
              departure_time, arrival_time, price, total_seat, seats_available, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.body.flight_number ?? null,
        req.body.type ?? null,
        req.body.charter ?? null,
        req.body.typecharter ?? null,
        req.body.airline ?? null,
        req.body.departure_location_id ?? null,
        req.body.arrival_location_id ?? null,
        req.body.departure_time ?? null,
        req.body.arrival_time ?? null,
        req.body.price ?? null, 
        req.body.seats_available ?? null,
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


// app.get("/api/dashboard-stats", async (req: Request, res: Response) => {
//   let connection;
//   try {
//     const { startDate, endDate } = req.query;

//     // Construire la clause WHERE pour les dates
//     let dateWhereClause = "";
//     let dateParams: any[] = [];

//     if (startDate && endDate) {
//       dateWhereClause = "WHERE DATE(created_at) BETWEEN ? AND ?";
//       dateParams = [startDate, endDate];
//     }

//     // 1. Récupérer les réservations avec un typage explicite
//     const [bookingRows] = await pool.query<mysql.RowDataPacket[]>(`
//       SELECT 
//         id, 
//         booking_reference, 
//         total_price, 
//         currency,
//         status, 
//         created_at, 
//         passenger_count, 
//         contact_email,
//         type_vol,
//         type_v
//       FROM bookings
//       ${dateWhereClause}
//       ORDER BY created_at DESC
//     `, dateParams);

//     // Convertir en type Booking[]
//     const bookings: Booking[] = bookingRows.map((row) => ({
//       id: row.id,
//       booking_reference: row.booking_reference,
//       total_price: Number(row.total_price),
//       currency: row.currency,
//       status: row.status,
//       created_at: new Date(row.created_at).toISOString(),
//       passenger_count: row.passenger_count,
//       contact_email: row.contact_email,
//       type_vol: row.type_vol,
//       type_v: row.type_v,
//     }));

//     // 2. Récupérer les vols avec un typage explicite
//     const [flightRows] = await pool.query<mysql.RowDataPacket[]>(`
//       SELECT id, type, departure_time, price, seats_available 
//       FROM flights
//     `);

//     // Convertir en type Flight[]
//     const flights: Flights[] = flightRows.map((row) => ({
//       id: row.id,
//       type: row.type,
//       departure_time: new Date(row.departure_time).toISOString(),
//       price: Number(row.price),
//       seats_available: row.seats_available,
//     }));

//     // 3. Calcul des statistiques avec typage fort
//     const totalRevenue = bookings.reduce((sum, booking) => sum + booking.total_price, 0);
//     const totalBookings = bookings.length;
//     const flightsAvailable = flights.length;
//     const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

//     // 4. Statistiques par statut
//     const statusCounts = bookings.reduce((acc: Record<string, number>, booking) => {
//       acc[booking.status] = (acc[booking.status] || 0) + 1;
//       return acc;
//     }, {});

//     const bookingsByStatus = Object.entries(statusCounts).map(([name, value]) => ({
//       name,
//       value,
//     }));

//     // 5. Statistiques par type de vol
//     const flightTypeCounts = bookings.reduce((acc: Record<string, number>, booking) => {
//       const type = booking.type_vol === "plane" ? "Avion" : "Hélicoptère";
//       acc[type] = (acc[type] || 0) + 1;
//       return acc;
//     }, {});

//     const bookingsByFlightType = Object.entries(flightTypeCounts).map(([name, value]) => ({
//       name,
//       value,
//     }));

//     // 6. Revenu par mois
//     const monthlyRevenue = bookings.reduce((acc: Record<string, number>, booking) => {
//       const date = new Date(booking.created_at);
//       const month = date.toLocaleString("fr-FR", { month: "short" });
//       acc[month] = (acc[month] || 0) + booking.total_price;
//       return acc;
//     }, {});

//     const revenueByMonth = Object.entries(monthlyRevenue).map(([name, total]) => ({
//       name,
//       total,
//     }));


//     const recentBookings = bookings.slice(0, 10);

//     // 8. Construction de la réponse
//     const response: DashboardStats = {
//       totalRevenue,
//       totalBookings,
//       flightsAvailable,
//       averageBookingValue,
//       bookingsByStatus,
//       revenueByMonth,
//       bookingsByFlightType,
//       recentBookings,
//     };

//     res.json(response);
//   } catch (error) {
//     console.error("Dashboard error:", error);
//     res.status(500).json({ error: "Erreur lors de la récupération des statistiques" });
//   }
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
    // NOTE: on récupère TOUTES les réservations pour les stats de statut,
    // mais on exclut cancelled/refunded du calcul du revenu (voir ci-dessous)
    const [bookingRows] = await pool.query<mysql.RowDataPacket[]>(`
      SELECT 
        id, 
        booking_reference, 
        total_price, 
        currency,
        status, 
        created_at, 
        passenger_count, 
        contact_email,
        type_vol,
        typecharter,
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
      currency: row.currency,
      status: row.status,
      created_at: new Date(row.created_at).toISOString(),
      passenger_count: row.passenger_count,
      contact_email: row.contact_email,
      type_vol: row.type_vol,
      typecharter: row.typecharter,
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
    let totalRevenueUSD = 0;
    let totalRevenueHTG = 0;
    
    // Séparer les revenus par devise — exclure les réservations annulées/remboursées
    const EXCLUDED_STATUSES = ['cancelled', 'canceled', 'refunded', 'annulé'];
    bookings.forEach(booking => {
      if (EXCLUDED_STATUSES.includes((booking.status || '').toLowerCase())) return;
      if (booking.currency === 'usd') {
        totalRevenueUSD += booking.total_price;
      } else if (booking.currency === 'htg') {
        totalRevenueHTG += booking.total_price;
      } else {
        // Par défaut, considérer comme USD
        totalRevenueUSD += booking.total_price;
      }
    });
    
    const totalBookings = bookings.length;
    const flightsAvailable = flights.length;
    const averageBookingValueUSD = totalBookings > 0 ? totalRevenueUSD / totalBookings : 0;
    const averageBookingValueHTG = totalBookings > 0 ? totalRevenueHTG / totalBookings : 0;

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
    // const flightTypeCounts = bookings.reduce((acc: Record<string, number>, booking) => {
    //   const type = booking.typecharter ? "Charter" : booking.type_vol === "plane" ? "Avion" : "Hélicoptère";
    //   acc[type] = (acc[type] || 0) + 1;
    //   return acc;
    // }, {});

    const flightTypeCounts = bookings.reduce((acc: Record<string, number>, booking) => {
    let type: string;

        if (booking.typecharter) {
          type = booking.typecharter === "helicopter" ? "Charter Hélicoptère" : "Charter Avion";
        } else {
          type = booking.type_vol === "plane" ? "Avion" : "Hélicoptère";
        }
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {}
    );
 

    const bookingsByFlightType = Object.entries(flightTypeCounts).map(([name, value]) => ({
      name,
      value,
    }));



    // 6. Revenu par mois (USD et HTG séparés)
    const monthlyRevenue = bookings.reduce((acc: Record<string, { usd: number, htg: number }>, booking) => {
      const date = new Date(booking.created_at);
      const month = date.toLocaleString("fr-FR", { month: "short" });
      
      if (!acc[month]) {
        acc[month] = { usd: 0, htg: 0 };
      }
      
      if (booking.currency === 'usd') {
        acc[month].usd += booking.total_price;
      } else if (booking.currency === 'htg') {
        acc[month].htg += booking.total_price;
      } else {
        acc[month].usd += booking.total_price;
      }
      
      return acc;
    }, {});

    const revenueByMonth = Object.entries(monthlyRevenue).map(([name, totals]) => ({
      name,
      usd: totals.usd,
      htg: totals.htg,
    }));

    // 7. Récupérer les 10 dernières réservations
    const recentBookings = bookings.slice(0, 10);

    // Puis dans votre route API, mettez à jour :
const response: DashboardStats2 = {
  totalRevenueUSD,
  totalRevenueHTG,
  totalBookings,
  flightsAvailable,
  averageBookingValueUSD,
  averageBookingValueHTG,
  bookingsByStatus,
  revenueByMonth: revenueByMonth.map(month => ({
    name: month.name,
    total: month.usd + month.htg // Total combiné
  })),
  revenueByMonthDetailed: revenueByMonth, // Détail séparé USD/HTG
  bookingsByFlightType,
  recentBookings,
};

    res.json(response);
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des statistiques" });
  }
});



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
    typecharter,
    payment_method,
    currency,
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
          typecharter,
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
            date_of_birth, idClient, idTypeClient, gender, title, address, type,
            type_vol, typecharter, type_v, country, nationality,
            phone, email, nom_urgence, email_urgence, tel_urgence, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            booking.id,
            passenger.firstName || passenger.name || '',
            passenger.middleName || null,
            passenger.lastName || '',
            passenger.dateOfBirth || passenger.dob || null,
            passenger.idClient || "",
            passenger.idTypeClient || "",
            passenger.gender || "other",
            passenger.title || "Mr",
            passenger.address || null,
            passenger.type || "adult",
            passenger.typeVol || "",
            typecharter || "",
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
              payment_method === "transfert" ? "Deposit" : "Contract"}
          </p>

          <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Flight Type:</strong> ${typecharter ? typecharter === "helicopter" ? "Charter Helicopter" : "Charter Plane" : typeVol === "helicopter" ? "Helicopter" : "Plane"}</p>
          
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
                        <strong>Total:</strong>  ${totalPrice}${" "}${currency === "htg" ? "HTG" : "USD"}
                       
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
      ${typecharter ? typecharter === "plane" ? `
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
      </div>` : `<div style="padding: 20px; font-size: 0.9em; color: #555;">
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
      ` : typeVol === "plane" ? `
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
      </div>` : `<div style="padding: 20px; font-size: 0.9em; color: #555;">
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
      <p style="margin: 5px 0 0; font-size: 1.2em">${flightChanged ? 'Your flight has been changed' : 'Votre réservation est confirmée'}</p>
    </div>

    <div style="padding: 8px">
      <p>Cher(e) ${passenger.firstName} ${passenger.lastName},</p>
      <p>
        ${flightChanged ?
            'Votre réservation de vol a été modifiée. Veuillez trouver votre nouveau billet électronique ci-dessous.' :
            'Merci d\'avoir choisi Trogon Airways. Veuillez trouver votre billet électronique ci-dessous.'}
        Nous vous recommandons d'imprimer cette section ou de la présenter sur votre appareil mobile à l&apos;aéroport.
      </p>
    </div>

    <!-- E-Ticket Section -->
    <div style="border-top: 2px dashed #ccc; margin: 0 20px; padding-top: 8px">
      <div style="padding: 8px; text-align: center">
        <p style="margin: 0; color: #1a237e; font-size: 0.9em">
          <strong>Payment Method:</strong>
          ${payment_method === "cash" ? "Cash" : payment_method === "card" ? "Carte bancaire" :
            payment_method === "cheque" ? "Chèque bancaire" : payment_method === "virement" ? "Virement bancaire" :
              payment_method === "transfert" ? "Deposit" : "Contrat"}
        </p>

      
            <p style="margin: 0; color: #1A237E; font-size: 0.9em;"><strong>Flight Type:</strong> ${typecharter ? typecharter === "helicopter" ? "Charter Hélicoptère" : "Charter Avion" : typeVol === "helicopter" ? "Hélicoptère" : "Avion"}</p>

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
                  <h3 style="color: #1a237e; margin: 0">${hasReturnFlight ? "Vol Aller-Retour" : "Aller Simple"}</h3>
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
                      <strong>Total:</strong>  ${totalPrice}${" "}${currency === "htg" ? "HTG" : "USD"}
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

          ${typecharter ? typecharter === "plane" ? `<div style="padding: 20px; font-size: 0.9em; color: #555;">
      <p><strong>Important: **</strong> Veuillez vous présenter à l&apos;aéroport au moins une heure avant votre départ. Tous
        les passagers doivent présenter une pièce d&apos;identité valide lors de l'enregistrement..</p>
      <p><strong>Limitation des bagages: **</strong> La franchise maximale pour les bagages des passagers est de 30 lb. <strong>Mallette dimension 65*40*25</strong>
      </p>
      <p><strong>Remarques:**</strong> La compagnie décline toute responsabilité en cas de retard, d'annulation ou de
        modification de vol imputable à des circonstances indépendantes de sa volonté dû à des problèmes techniques,
        grèves ou tout autre incident ne relevant pas de sa responsabilité.
        Le client est responsable de ses propres dispositions (heure d'arrivée à l&apos;aéroport, formalités de voyage,
        etc.).
        Aucun remboursement ni indemnisation ne sera accordé en cas de vol manqué pour ces raisons.
      </p>
      <p><strong>Remarques 2:</strong> Tout vol annulé pour cas de force majeure ou pour des raisons techniques indépendantes de la volonté de la compagnie ne donne lieu à aucun remboursement. Le montant du billet sera conservé sous forme d’avoir (crédit) auprès de la compagnie, valable pour une utilisation ultérieure conformément aux conditions tarifaires en vigueur.</p>
      <p>Nous nous réjouissons de vous accueillir à bord.</p>
      <p>Cordialement,<br>L&apos;équipe de Trogon Airways</p>
    </div>` :`<div style="padding: 20px; font-size: 0.9em; color: #555;">
      <p><strong>Important: **</strong> Veuillez vous présenter à l&apos;aéroport au moins une heure avant votre départ. Tous
        les passagers doivent présenter une pièce d&apos;identité valide lors de l'enregistrement..</p>
      <p><strong>Limitation des bagages: **</strong> La franchise maximale pour les bagages des passagers est de 20 lb. <strong>Mallette dimension 35*55*25, Carry on, soft skin</strong>
      </p>
      <p><strong>Remarques:**</strong> La compagnie décline toute responsabilité en cas de retard, d'annulation ou de
        modification de vol
        imputable à des circonstances indépendantes de sa volonté dû à des problèmes techniques, grèves ou tout autre
        incident ne relevant pas de sa responsabilité. Le client est responsable de ses propres dispositions (heure
        d'arrivée à
        l&apos;aéroport, formalités de voyage, etc.). Aucun remboursement ni indemnisation ne sera accordé en cas de vol
        manqué
        pour ces raisons.</p>
      <p><strong>Remarques 2: **</strong> Tout vol annulé pour cas de force majeure ou pour des raisons techniques indépendantes de la volonté de la compagnie ne donne lieu à aucun remboursement. Le montant du billet sera conservé sous forme d’avoir (crédit) auprès de la compagnie, valable pour une utilisation ultérieure conformément aux conditions tarifaires en vigueur.</p>
      <p>Nous nous réjouissons de vous accueillir à bord.</p>
      <p>Cordialement,<br>L&apos;équipe de Trogon Airways</p>
    </div>` : typeVol === "plane" ? `<div style="padding: 20px; font-size: 0.9em; color: #555;">
      <p><strong>Important: **</strong> Veuillez vous présenter à l&apos;aéroport au moins une heure avant votre départ. Tous
        les passagers doivent présenter une pièce d&apos;identité valide lors de l'enregistrement..</p>
      <p><strong>Limitation des bagages: **</strong> La franchise maximale pour les bagages des passagers est de 30 lb. <strong>Mallette dimension 65*40*25</strong>
      </p>
      <p><strong>Remarques:**</strong> La compagnie décline toute responsabilité en cas de retard, d'annulation ou de
        modification de vol imputable à des circonstances indépendantes de sa volonté dû à des problèmes techniques,
        grèves ou tout autre incident ne relevant pas de sa responsabilité.
        Le client est responsable de ses propres dispositions (heure d'arrivée à l&apos;aéroport, formalités de voyage,
        etc.).
        Aucun remboursement ni indemnisation ne sera accordé en cas de vol manqué pour ces raisons.
      </p>
      <p><strong>Remarques 2:</strong> Tout vol annulé pour cas de force majeure ou pour des raisons techniques indépendantes de la volonté de la compagnie ne donne lieu à aucun remboursement. Le montant du billet sera conservé sous forme d’avoir (crédit) auprès de la compagnie, valable pour une utilisation ultérieure conformément aux conditions tarifaires en vigueur.</p>
      <p>Nous nous réjouissons de vous accueillir à bord.</p>
      <p>Cordialement,<br>L&apos;équipe de Trogon Airways</p>
    </div>` : `<div style="padding: 20px; font-size: 0.9em; color: #555;">
      <p><strong>Important: **</strong> Veuillez vous présenter à l&apos;aéroport au moins une heure avant votre départ. Tous
        les passagers doivent présenter une pièce d&apos;identité valide lors de l'enregistrement..</p>
      <p><strong>Limitation des bagages: **</strong> La franchise maximale pour les bagages des passagers est de 20 lb. <strong>Mallette dimension 35*55*25, Carry on, soft skin</strong>
      </p>
      <p><strong>Remarques:**</strong> La compagnie décline toute responsabilité en cas de retard, d'annulation ou de
        modification de vol
        imputable à des circonstances indépendantes de sa volonté dû à des problèmes techniques, grèves ou tout autre
        incident ne relevant pas de sa responsabilité. Le client est responsable de ses propres dispositions (heure
        d'arrivée à
        l&apos;aéroport, formalités de voyage, etc.). Aucun remboursement ni indemnisation ne sera accordé en cas de vol
        manqué
        pour ces raisons.</p>
      <p><strong>Remarques 2: **</strong> Tout vol annulé pour cas de force majeure ou pour des raisons techniques indépendantes de la volonté de la compagnie ne donne lieu à aucun remboursement. Le montant du billet sera conservé sous forme d’avoir (crédit) auprès de la compagnie, valable pour une utilisation ultérieure conformément aux conditions tarifaires en vigueur.</p>
      <p>Nous nous réjouissons de vous accueillir à bord.</p>
      <p>Cordialement,<br>L&apos;équipe de Trogon Airways</p>
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


// app.put("/api/cancelFlight/:id", async (req: Request, res: Response) => {
//   const flightId = req.params.id;
//   const { cancelNotes, flightNumber } = req.body;

//   // Validate input
//   if (!flightId || isNaN(Number(flightId))) {
//     return res.status(400).json({
//       success: false,
//       error: "ID de vol invalide"
//     });
//   }

//   let connection: mysql.PoolConnection | undefined;
//   try {
//     connection = await pool.getConnection();
//     await connection.beginTransaction();
    
//     // First, check if the flight exists
//     const [existingFlights] = await connection.execute(
//       "SELECT id, activeflight FROM flights WHERE id = ?",
//       [flightId]
//     );
    
//     if (!Array.isArray(existingFlights) || existingFlights.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({
//         success: false,
//         error: "Vol non trouvé"
//       });
//     }

//     // Update the flight
//     await connection.execute(
//       "UPDATE flights SET activeflight = ? WHERE id = ?",
//       ['desactive', flightId]
//     );

//     await connection.commit();
    
//     res.json({
//       success: true,
//       message: "Vol désactivé avec succès",
//       flightId: flightId
//     });

//   } catch (error: any) {
//     console.error("❌ Erreur modification réservation:", error);
//     if (connection) {
//       await connection.rollback();
//     }
//     res.status(500).json({
//       success: false,
//       error: "Échec de la modification de la réservation",
//       details: process.env.NODE_ENV !== "production" ? error.message : undefined
//     });
//   } finally {
//     if (connection) {
//       connection.release();
//     }
//   }
// });


app.put("/api/cancelFlight/:id", async (req: Request, res: Response) => {
  const flightId = req.params.id;
  const { cancelNotes, flightNumber } = req.body;

  // Validate input
  if (!flightId || isNaN(Number(flightId))) {
    return res.status(400).json({
      success: false,
      error: "ID de vol invalide"
    });
  }

  let connection: mysql.PoolConnection | undefined;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
   


     // First, check if the flight exists
    const [existingFlights] = await connection.execute(
      "SELECT id, activeflight FROM flights WHERE id = ?",
      [flightId]
    );
    
    if (!Array.isArray(existingFlights) || existingFlights.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: "Vol non trouvé"
      });
    }

    const flight = existingFlights[0] as any;


    

    // Update the flight status
    await connection.execute(
      "UPDATE flights SET activeflight = ? WHERE id = ?",
      ['desactive', flightId]
    );

    // Récupérer tous les passagers du vol via les bookings
    const [passengersData] = await connection.execute(
      `SELECT p.email, p.first_name, p.last_name, 
              b.booking_reference,
              f.flight_number
       FROM flights f
       JOIN bookings b ON f.id = b.flight_id
       JOIN passengers p ON b.id = p.booking_id
       WHERE f.id = ?`,
      [flightId]
    );

    const passengers = passengersData as any[];

    // Envoyer les emails aux passagers
    if (passengers.length > 0) {
      const emailPromises = passengers.map(async (passenger) => {
        try {
          // Générer le contenu HTML de l'email

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
              
                <p style="margin: 5px 0 0; font-size: 1.2em;">Cancellation of your flight</p>
              </div>

              <div style="padding: 20px;">
                <p></p>Dear, ${passenger.first_name} ${passenger.last_name},</p>
              
              <p>We are sorry to inform you that your reservation has been <b>cancelled</b>.</p>

              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Details of the canceled flight :</h3>
                <p><strong>Booking reference :</strong> ${passenger.booking_reference}</p>
                <p><strong>Flight number :</strong> ${passenger.flight_number}</p>
              
              </div>

              ${cancelNotes ? `
              <div style="background-color: #fee2e2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4 style="color: #991b1b;">Reason for cancellation :</h4>
                <p>${cancelNotes}</p>
              </div>
              ` : ''}


              <div style="background-color: #dbeafe; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Available options:</h4>
                <ul>
                  <li>You can contact our customer service to book another flight.</li>
                  <li>See our cancellation policy for more details.</li>
                </ul>
              </div>

              <p>For any questions, please contact our customer service. :</p>
              <p>📞 +509 334104004</p>
              <p>✉️ info@trogonairways.com.com</p>
              
              </div>


              <div style="padding: 20px; font-size: 0.9em; color: #555;">
              <p>Thank you for choosing Trogon Airways.</p>
              
            
                <p>Sincerely,<br>The Trogon Airways Team</p>
              </div>
            </div>

        `;

          // Utiliser votre fonction sendEmail existante
          const emailResult = await sendEmail(
            passenger.email,
            `Trogn Airways - Annulation du vol ${passenger.flight_number}`,
            emailHtml
          );

          console.log(`✅ Email envoyé à ${passenger.email}`, emailResult);
          return { email: passenger.email, success: true, result: emailResult };
        } catch (emailError) {
          console.error(`❌ Erreur envoi email à ${passenger.email}:`, emailError);
          return { email: passenger.email, success: false, error: emailError };
        }
      });

      // Attendre l'envoi de tous les emails (mais ne pas bloquer la transaction)
      const emailResults = await Promise.allSettled(emailPromises);
      
      // Log des résultats
      const successfulEmails = emailResults.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length;
      
      const failedEmails = emailResults.filter(r => 
        r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
      ).length;
      
      console.log(`📧 Emails envoyés : ${successfulEmails} réussis, ${failedEmails} échecs`);
    }

    await connection.commit();
    
    res.json({
      success: true,
      message: "Vol désactivé avec succès",
      flightId: flightId,
      emailsSent: passengers.length,
      passengerCount: passengers.length
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


// app.put("/api/updaterescheduleflight/:id", async (req: Request, res: Response) => {
//   const flightId = req.params.id;

//   const allowedFields = [
   
//     "departure_time",
//     "arrival_time",

//   ];

//   const setFields: string[] = [];
//   const values: any[] = [];

//   for (const field of allowedFields) {
//     if (req.body[field] !== undefined) {
//       setFields.push(`${field} = ?`);
//       values.push(req.body[field]);
//     }
//   }

//   if (setFields.length === 0) {
//     return res.status(400).json({ error: "Aucun champ à mettre à jour" });
//   }

//   try {
//     const [result] = await pool.execute<ResultSetHeader>(
//       `UPDATE flights SET ${setFields.join(", ")} WHERE id = ?`,
//       [...values, flightId]
//     );

//     // Récupérer le vol mis à jour
//     const [rows] = await pool.query<Flight[]>("SELECT * FROM flights WHERE id = ?", [flightId]);

//     if (rows.length === 0) {
//       return res.status(404).json({ error: "Vol non trouvé" });
//     }

//     res.status(200).json(rows[0]);
//   } catch (error: unknown) {
//     if (error instanceof Error) {
//       console.error(error);
//       res.status(500).json({ error: "Erreur MySQL", details: error.message });
//     } else {
//       res.status(500).json({ error: "Erreur inconnue" });
//     }
//   }
// });

app.put("/api/updaterescheduleflight/:id", async (req: Request, res: Response) => {
  const flightId = req.params.id;

  // Définir les champs autorisés pour la mise à jour
  const allowedFields = [
    "departure_time",
    "arrival_time",
    "activeflight"
  ];

  const setFields: string[] = [];
  const values: any[] = [];
  const changes: { field: string, oldValue: any, newValue: any }[] = [];
  
  // Valeur par défaut pour activeflight si non fournie
  const activeflightValue = req.body.activeflight !== undefined ? req.body.activeflight : "active";

  let connection: mysql.PoolConnection | undefined;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // First, get the current flight data with location information
    const [currentFlights] = await connection.execute<mysql.RowDataPacket[]>(
      `SELECT f.*, 
              dep.city as departure_city, dep.code as departure_code,
              arr.city as arrival_city, arr.code as arrival_code
       FROM flights f
       LEFT JOIN locations dep ON f.departure_location_id = dep.id
       LEFT JOIN locations arr ON f.arrival_location_id = arr.id
       WHERE f.id = ?`,
      [flightId]
    );

    if (!Array.isArray(currentFlights) || currentFlights.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false,
        error: "Vol non trouvé" 
      });
    }

    const currentFlight = currentFlights[0] as any;

    // Prepare update fields and track changes
    for (const field of allowedFields) {
      let newValue;
      
      // Pour activeflight, utiliser la valeur par défaut si non fournie
      if (field === "activeflight") {
        newValue = activeflightValue;
      } else {
        newValue = req.body[field];
      }
      
      // Vérifier si la valeur est définie et différente de la valeur actuelle
      if (newValue !== undefined && newValue !== currentFlight[field]) {
        setFields.push(`${field} = ?`);
        values.push(newValue);
        
        // Track the change for email notification
        changes.push({
          field: field,
          oldValue: currentFlight[field],
          newValue: newValue
        });
      }
    }

    // Ajouter activeflight s'il n'est pas déjà dans les changements mais doit être mis à jour
    if (!changes.some(c => c.field === "activeflight") && 
        activeflightValue !== currentFlight.activeflight) {
      setFields.push("activeflight = ?");
      values.push(activeflightValue);
      
      changes.push({
        field: "activeflight",
        oldValue: currentFlight.activeflight,
        newValue: activeflightValue
      });
    }

    if (setFields.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false,
        error: "Aucun champ à mettre à jour" 
      });
    }

    // Update the flight
    const [result] = await connection.execute<mysql.ResultSetHeader>(
      `UPDATE flights SET ${setFields.join(", ")} WHERE id = ?`,
      [...values, flightId]
    );

    // Get the updated flight with location information
    const [updatedFlights] = await connection.execute<mysql.RowDataPacket[]>(
      `SELECT f.*, 
              dep.city as departure_city, dep.code as departure_code,
              arr.city as arrival_city, arr.code as arrival_code
       FROM flights f
       LEFT JOIN locations dep ON f.departure_location_id = dep.id
       LEFT JOIN locations arr ON f.arrival_location_id = arr.id
       WHERE f.id = ?`,
      [flightId]
    );

    if (updatedFlights.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false,
        error: "Vol non trouvé après mise à jour" 
      });
    }

    const updatedFlight = updatedFlights[0] as any;

    // Récupérer tous les passagers du vol via les bookings
    const [passengersData] = await connection.execute(
      `SELECT DISTINCT p.email, p.first_name, p.last_name, 
              b.booking_reference,
              f.flight_number,
              dep.city as departure_city, dep.code as departure_code,
              arr.city as arrival_city, arr.code as arrival_code,
              DATE_FORMAT(?, '%Y-%m-%d %H:%i') as old_departure,
              DATE_FORMAT(?, '%Y-%m-%d %H:%i') as old_arrival,
              DATE_FORMAT(f.departure_time, '%Y-%m-%d %H:%i') as new_departure,
              DATE_FORMAT(f.arrival_time, '%Y-%m-%d %H:%i') as new_arrival,
              f.activeflight as new_status
       FROM flights f
       LEFT JOIN locations dep ON f.departure_location_id = dep.id
       LEFT JOIN locations arr ON f.arrival_location_id = arr.id
       JOIN bookings b ON f.id = b.flight_id
       JOIN passengers p ON b.id = p.booking_id
       WHERE f.id = ?`,
      [
        currentFlight.departure_time,
        currentFlight.arrival_time,
        flightId
      ]
    );

    const passengers = passengersData as any[];

    // Déterminer si on doit envoyer des emails
    const shouldSendEmails = passengers.length > 0 && 
      (changes.some(c => c.field === "departure_time" || c.field === "arrival_time"));

    // Envoyer les emails aux passagers seulement pour les changements d'horaires
    if (shouldSendEmails) {
      const emailPromises = passengers.map(async (passenger) => {
        try {
          // Formater les dates pour l'affichage
          const formatDateForDisplay = (dateString: string) => {
            try {
              const date = new Date(dateString);
              return date.toLocaleString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            } catch (error) {
              return dateString;
            }
          };

          // Formater la date pour l'affichage court (juste date + heure)
          const formatShortDateTime = (dateString: string) => {
            try {
              const date = new Date(dateString);
              return date.toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            } catch (error) {
              return dateString;
            }
          };

          // Filtrer seulement les changements d'horaires pour l'email
          const scheduleChanges = changes.filter(c => 
            c.field === "departure_time" || c.field === "arrival_time"
          );

          // Générer la section des changements
          let changesHtml = '';
          let hasDepartureChange = false;
          let hasArrivalChange = false;
          let oldDepartureFormatted = '';
          let newDepartureFormatted = '';
          let oldArrivalFormatted = '';
          let newArrivalFormatted = '';

          scheduleChanges.forEach(change => {
            let fieldLabel = '';
            let oldValueDisplay = change.oldValue;
            let newValueDisplay = change.newValue;

            switch (change.field) {
              case 'departure_time':
                fieldLabel = 'Departure time';
                oldValueDisplay = formatDateForDisplay(change.oldValue);
                newValueDisplay = formatDateForDisplay(change.newValue);
                oldDepartureFormatted = formatShortDateTime(change.oldValue);
                newDepartureFormatted = formatShortDateTime(change.newValue);
                hasDepartureChange = true;
                break;
              case 'arrival_time':
                fieldLabel = 'Arrival time';
                oldValueDisplay = formatDateForDisplay(change.oldValue);
                newValueDisplay = formatDateForDisplay(change.newValue);
                oldArrivalFormatted = formatShortDateTime(change.oldValue);
                newArrivalFormatted = formatShortDateTime(change.newValue);
                hasArrivalChange = true;
                break;
            }

            changesHtml += `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${fieldLabel}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; color: #dc3545;">
                  <del>${oldValueDisplay}</del>
                </td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; color: #28a745; font-weight: bold;">
                  ${newValueDisplay}
                </td>
              </tr>
            `;
          });

          // Créer un résumé des changements pour le sujet de l'email
          let changeSummary = '';
          if (hasDepartureChange && hasArrivalChange) {
            changeSummary = `departure ${oldDepartureFormatted} to ${newDepartureFormatted} and arrival of ${oldArrivalFormatted} to ${newArrivalFormatted}`;
          } else if (hasDepartureChange) {
            changeSummary = `departure ${oldDepartureFormatted} to ${newDepartureFormatted}`;
          } else if (hasArrivalChange) {
            changeSummary = `arrival of ${oldArrivalFormatted} to ${newArrivalFormatted}`;
          }

          // Vérifier si le vol est activé/désactivé pour adapter le message
          const isFlightActivated = changes.some(c => 
            c.field === "activeflight" && c.newValue === "active"
          );
          const isFlightDeactivated = changes.some(c => 
            c.field === "activeflight" && c.newValue === "desactive"
          );

          let statusMessage = '';
          if (isFlightActivated) {
            statusMessage = `
              <div style="background-color: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                <strong>🔄 Good news !</strong>
                <p style="margin: 5px 0;">This flight has been reactivated and is available again.</p>
              </div>
            `;
          } else if (isFlightDeactivated) {
            statusMessage = `
              <div style="background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
                <strong>⚠️ Important information</strong>
                <p style="margin: 5px 0;">This flight has been temporarily suspended. Please contact our customer service for more information..</p>
              </div>
            `;
          }

          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Modification de votre vol - Trogon Airways</title>
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
                  line-height: 1.6; 
                  color: #333; 
                  margin: 0; 
                  padding: 0; 
                  background-color: #f5f5f5;
                }
                .container { 
                  max-width: 800px; 
                  margin: 0 auto; 
                  background-color: white;
                }
                .header { 
                  background-color: #1A237E; 
                  color: white; 
                  padding: 30px 20px; 
                  text-align: center;
                }
                .logo { 
                  height: 55px; 
                  vertical-align: middle; 
                  margin-bottom: 15px;
                }
                .content { 
                  padding: 30px 20px;
                }
                .alert-box { 
                  background-color: #fff3cd; 
                  border-left: 4px solid #ffc107; 
                  padding: 15px; 
                  margin: 20px 0; 
                  border-radius: 0 5px 5px 0;
                }
                .flight-info { 
                  background-color: #f8f9fa; 
                  border: 1px solid #dee2e6; 
                  border-radius: 8px; 
                  padding: 20px; 
                  margin: 20px 0;
                }
                .changes-table { 
                  width: 100%; 
                  border-collapse: collapse; 
                  margin: 20px 0;
                }
                .changes-table th { 
                  background-color: #e9ecef; 
                  padding: 12px; 
                  text-align: left; 
                  border-bottom: 2px solid #dee2e6;
                }
                .footer { 
                  background-color: #f8f9fa; 
                  padding: 20px; 
                  text-align: center; 
                  color: #6c757d; 
                  font-size: 0.9em;
                }
                .contact-box { 
                  background-color: #e3f2fd; 
                  padding: 15px; 
                  border-radius: 5px; 
                  margin: 20px 0;
                }
                .badge { 
                  display: inline-block; 
                  padding: 5px 12px; 
                  border-radius: 20px; 
                  font-size: 0.8em; 
                  font-weight: bold; 
                  margin-bottom: 10px;
                }
                .badge-warning { 
                  background-color: #ffc107; 
                  color: #856404;
                }
                .route { 
                  font-size: 1.2em; 
                  font-weight: bold; 
                  color: #1A237E; 
                  margin: 10px 0;
                }
                @media (max-width: 600px) {
                  .content { padding: 20px 15px; }
                  .flight-info { padding: 15px; }
                }
              </style>
            </head>
            <body>
              <div class="container">
                <!-- Header -->
                <div class="header">
                  <img src="https://trogonairways.com/logo-trogonpng.png" alt="Trogon Airways" class="logo">
                  <h1 style="margin: 0; font-size: 1.8em;">Change to your flight</h1>
                </div>

                <!-- Content -->
                <div class="content">
                  <p>Dear, <strong>${passenger.first_name} ${passenger.last_name}</strong>,</p>
                  
                  ${statusMessage}
                  
                  <div class="alert-box">
                    <span class="badge badge-warning">IMPORTANT</span>
                    <p style="margin: 5px 0; font-weight: bold; font-size: 1.1em;">Your flight has been changed</p>
                    <p style="margin: 5px 0;">We would like to inform you that changes have been made to your reservation..</p>
                  </div>

                  <!-- Flight Information -->
                  <div class="flight-info">
                    <h2 style="margin-top: 0; color: #1A237E;">Détails du vol</h2>
                    <div class="route">
                      ${passenger.departure_city} (${passenger.departure_code}) → ${passenger.arrival_city} (${passenger.arrival_code})
                    </div>
                    <p><strong>Booking reference :</strong> <span style="color: #1A237E; font-weight: bold;">${passenger.booking_reference}</span></p>
                    <p><strong>Flight number :</strong> <span style="color: #1A237E; font-weight: bold;">${passenger.flight_number}</span></p>
                    <p><strong>Flight status :</strong> 
                      <span style="padding: 3px 8px; border-radius: 12px; font-size: 0.85em; font-weight: bold; 
                        ${passenger.new_status === 'active' ? 'background-color: #d4edda; color: #155724;' : 'background-color: #f8d7da; color: #721c24;'}">
                        ${passenger.new_status === 'active' ? 'ACTIVE ✓' : 'DISABLED ✗'}
                      </span>
                    </p>
                  </div>

                  <!-- Changes Table -->
                  ${scheduleChanges.length > 0 ? `
                  <h3 style="color: #856404; margin-top: 30px;">Schedule changes :</h3>
                  <table class="changes-table">
                    <thead>
                      <tr>
                        <th>Element</th>
                        <th>Old value</th>
                        <th>New value</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${changesHtml}
                    </tbody>
                  </table>
                  ` : ''}

                  <!-- Important Information -->
                  <div class="contact-box">
                    <h3 style="margin-top: 0; color: #0c5460;">Important instructions :</h3>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                      ${scheduleChanges.length > 0 ? `
                      <li>Arrive at the airport at least <strong>2 hours</strong> before the new departure time</li>
                      <li>Present your ID and booking reference at the check-in desk.</li>
                      <li>Your assigned seat and services remain unchanged.</li>
                      ` : ''}
                      <li>Check our website for the latest updates regarding your flight</li>
                      ${isFlightDeactivated ? `
                      <li><strong>This flight has been temporarily suspended. Contact our customer service for available options..</strong></li>
                      ` : ''}
                    </ul>
                  </div>

                  <!-- Options -->
                 <!--  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1A237E;">Your options :</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px; margin: 15px 0;">
                      ${isFlightDeactivated ? `
                      <div style="flex: 1; min-width: 200px; background-color: white; padding: 15px; border-radius: 5px; border: 1px solid #dee2e6;">
                        <strong>🔄 Change flight</strong>
                        <p style="margin: 5px 0 0; font-size: 0.9em;">Select another flight at no extra cost.</p>
                      </div>
                      <div style="flex: 1; min-width: 200px; background-color: white; padding: 15px; border-radius: 5px; border: 1px solid #dee2e6;">
                        <strong>✕ Get a refund</strong>
                        <p style="margin: 5px 0 0; font-size: 0.9em;">Full refund according to our policy.</p>
                      </div>
                      ` : scheduleChanges.length > 0 ? `
                      <div style="flex: 1; min-width: 200px; background-color: white; padding: 15px; border-radius: 5px; border: 1px solid #dee2e6;">
                        <strong>✓ Accept the changes</strong>
                        <p style="margin: 5px 0 0; font-size: 0.9em;">Your reservation has been automatically updated.</p>
                      </div>
                      <div style="flex: 1; min-width: 200px; background-color: white; padding: 15px; border-radius: 5px; border: 1px solid #dee2e6;">
                        <strong>✎ Modify your reservation</strong>
                        <p style="margin: 5px 0 0; font-size: 0.9em;">Choose another flight at no cost.</p>
                      </div>
                      <div style="flex: 1; min-width: 200px; background-color: white; padding: 15px; border-radius: 5px; border: 1px solid #dee2e6;">
                        <strong>✕ Cancel and refund</strong>
                        <p style="margin: 5px 0 0; font-size: 0.9em;">Refund according to our policy.</p>
                      </div>
                      ` : `
                      <div style="flex: 1; min-width: 200px; background-color: white; padding: 15px; border-radius: 5px; border: 1px solid #dee2e6;">
                        <strong>📞 Contact customer service</strong>
                        <p style="margin: 5px 0 0; font-size: 0.9em;">For more information about your flight.</p>
                      </div>
                      `}
                    </div>
                  </div> -->

                  <!-- Contact Information -->
                  <div style="margin: 20px 0; padding: 20px; background-color: #1A237E; color: white; border-radius: 8px;">
                    <h3 style="margin-top: 0;">Customer service available 24/7</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 20px; margin-top: 15px;">
                      <div style="flex: 1; min-width: 150px;">
                        <div style="font-size: 1.5em;">📞</div>
                        <strong>Phone</strong>
                        <p style="margin: 5px 0;">+509 334104004</p>
                      </div>
                      <div style="flex: 1; min-width: 150px;">
                        <div style="font-size: 1.5em;">✉️</div>
                        <strong>E-mail</strong>
                        <p style="margin: 5px 0;">info@trogonairways.com</p>
                      </div>
                      <div style="flex: 1; min-width: 150px;">
                        <div style="font-size: 1.5em;">🌐</div>
                        <strong>Website</strong>
                        <p style="margin: 5px 0;">trogonairways.com</p>
                      </div>
                    </div>
                    <p style="margin-top: 15px; font-size: 0.9em; opacity: 0.9;">
                      For any changes or cancellations, please contact us within <strong>24 hours</strong>.
                    </p>
                  </div>

                  <p style="font-style: italic; text-align: center; margin-top: 30px; color: #6c757d;">
                    We apologize for the inconvenience and thank you for your understanding.
                  </p>
                </div>

                <!-- Footer -->
                <div class="footer">
                  <p><strong>Thank you for choosing Trogon Airways</strong></p>
                  <p>Kind regards,<br><strong>The Trogon Airways team</strong></p>
                  <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                    <p style="font-size: 0.8em; color: #adb5bd;">
                      This email was sent automatically. Please do not reply.

For any questions, please contact our customer service.
                    </p>
                    <p style="font-size: 0.8em; color: #adb5bd; margin-top: 10px;">
                      © ${new Date().getFullYear()} Trogon Airways. All rights reserved..
                    </p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `;

          // Déterminer le sujet de l'email
          let emailSubject;
          if (isFlightDeactivated) {
            emailSubject = `Trogon Airways - Flight ${passenger.flight_number} disabled`;
          } else if (scheduleChanges.length > 0) {
            emailSubject = `Trogon Airways – Flight Change ${passenger.flight_number} (${changeSummary})`;
          } else {
            emailSubject = `Trogon Airways - Flight Update ${passenger.flight_number}`;
          }

          // Utiliser votre fonction sendEmail existante
          const emailResult = await sendEmail(
            passenger.email,
            emailSubject,
            emailHtml
          );

          console.log(`✅ Email envoyé à ${passenger.email} - Sujet: ${emailSubject}`);
          return { email: passenger.email, success: true, result: emailResult };
        } catch (emailError) {
          console.error(`❌ Erreur envoi email à ${passenger.email}:`, emailError);
          return { email: passenger.email, success: false, error: emailError };
        }
      });

      // Attendre l'envoi de tous les emails
      const emailResults = await Promise.allSettled(emailPromises);
      
      // Log des résultats
      const successfulEmails = emailResults.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length;
      
      const failedEmails = emailResults.filter(r => 
        r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
      ).length;
      
      console.log(`📧 Emails envoyés : ${successfulEmails} réussis, ${failedEmails} échecs`);
    }

    await connection.commit();
    
    res.status(200).json({
      success: true,
      message: "Vol modifié avec succès",
      flight: updatedFlight,
      changes: changes.map(change => ({
        field: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue
      })),
      emailsSent: shouldSendEmails ? passengers.length : 0,
      passengerCount: passengers.length,
      
    });

  } catch (error: any) {
    console.error("❌ Erreur modification du vol:", error);
    if (connection) {
      await connection.rollback();
    }
    res.status(500).json({
      success: false,
      error: "Échec de la modification du vol",
      details: process.env.NODE_ENV !== "production" ? error.message : undefined
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


// app.put("/api/updaterescheduleflight/:id", async (req: Request, res: Response) => {
//   const flightId = req.params.id;

//   const allowedFields = [
//     "departure_time",
//     "arrival_time",
//     "activeflight",
//   ];

//   const setFields: string[] = [];
//   const values: any[] = [];
//   const changes: { field: string, oldValue: any, newValue: any }[] = [];

//   let connection: mysql.PoolConnection | undefined;

//   try {
//     connection = await pool.getConnection();
//     await connection.beginTransaction();

//     // First, get the current flight data with location information
//     const [currentFlights] = await connection.execute<mysql.RowDataPacket[]>(
//       `SELECT f.*, 
//               dep.city as departure_city, dep.code as departure_code,
//               arr.city as arrival_city, arr.code as arrival_code
//        FROM flights f
//        LEFT JOIN locations dep ON f.departure_location_id = dep.id
//        LEFT JOIN locations arr ON f.arrival_location_id = arr.id
//        WHERE f.id = ?`,
//       [flightId]
//     );

//     if (!Array.isArray(currentFlights) || currentFlights.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({ 
//         success: false,
//         error: "Vol non trouvé" 
//       });
//     }

//     const currentFlight = currentFlights[0] as any;

//     // Prepare update fields and track changes
//     for (const field of allowedFields) {
//       if (req.body[field] !== undefined && req.body[field] !== currentFlight[field]) {
//         setFields.push(`${field} = ?`);
//         values.push(req.body[field]);
        
//         // Track the change for email notification
//         changes.push({
//           field: field,
//           oldValue: currentFlight[field],
//           newValue: req.body[field]
//         });
//       }
//     }

//     if (setFields.length === 0) {
//       await connection.rollback();
//       return res.status(400).json({ 
//         success: false,
//         error: "Aucun champ à mettre à jour" 
//       });
//     }

//     // Update the flight
//     const [result] = await connection.execute<mysql.ResultSetHeader>(
//       `UPDATE flights SET ${setFields.join(", ")} WHERE id = ?`,
//       [...values, flightId]
//     );

//     // Get the updated flight with location information
//     const [updatedFlights] = await connection.execute<mysql.RowDataPacket[]>(
//       `SELECT f.*, 
//               dep.city as departure_city, dep.code as departure_code,
//               arr.city as arrival_city, arr.code as arrival_code
//        FROM flights f
//        LEFT JOIN locations dep ON f.departure_location_id = dep.id
//        LEFT JOIN locations arr ON f.arrival_location_id = arr.id
//        WHERE f.id = ?`,
//       [flightId]
//     );

//     if (updatedFlights.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({ 
//         success: false,
//         error: "Vol non trouvé après mise à jour" 
//       });
//     }

//     const updatedFlight = updatedFlights[0] as any;

//     // Récupérer tous les passagers du vol via les bookings
//     const [passengersData] = await connection.execute(
//       `SELECT DISTINCT p.email, p.first_name, p.last_name, 
//               b.booking_reference,
//               f.flight_number,
//               dep.city as departure_city, dep.code as departure_code,
//               arr.city as arrival_city, arr.code as arrival_code,
//               DATE_FORMAT(?, '%Y-%m-%d %H:%i') as old_departure,
//               DATE_FORMAT(?, '%Y-%m-%d %H:%i') as old_arrival,
//               DATE_FORMAT(f.departure_time, '%Y-%m-%d %H:%i') as new_departure,
//               DATE_FORMAT(f.arrival_time, '%Y-%m-%d %H:%i') as new_arrival
//        FROM flights f
//        LEFT JOIN locations dep ON f.departure_location_id = dep.id
//        LEFT JOIN locations arr ON f.arrival_location_id = arr.id
//        JOIN bookings b ON f.id = b.flight_id
//        JOIN passengers p ON b.id = p.booking_id
//        WHERE f.id = ?`,
//       [
//         currentFlight.departure_time,
//         currentFlight.arrival_time,
//         flightId
//       ]
//     );

//     const passengers = passengersData as any[];

//     // Envoyer les emails aux passagers
//     if (passengers.length > 0 && changes.length > 0) {
//       const emailPromises = passengers.map(async (passenger) => {
//         try {
//           // Formater les dates pour l'affichage
//           const formatDateForDisplay = (dateString: string) => {
//             try {
//               const date = new Date(dateString);
//               return date.toLocaleString('fr-FR', {
//                 weekday: 'long',
//                 year: 'numeric',
//                 month: 'long',
//                 day: 'numeric',
//                 hour: '2-digit',
//                 minute: '2-digit'
//               });
//             } catch (error) {
//               return dateString;
//             }
//           };

//           // Formater la date pour l'affichage court (juste date + heure)
//           const formatShortDateTime = (dateString: string) => {
//             try {
//               const date = new Date(dateString);
//               return date.toLocaleString('fr-FR', {
//                 day: '2-digit',
//                 month: '2-digit',
//                 year: 'numeric',
//                 hour: '2-digit',
//                 minute: '2-digit'
//               });
//             } catch (error) {
//               return dateString;
//             }
//           };

//           // Générer la section des changements
//           let changesHtml = '';
//           let hasDepartureChange = false;
//           let hasArrivalChange = false;
//           let oldDepartureFormatted = '';
//           let newDepartureFormatted = '';
//           let oldArrivalFormatted = '';
//           let newArrivalFormatted = '';

//           changes.forEach(change => {
//             let fieldLabel = '';
//             let oldValueDisplay = change.oldValue;
//             let newValueDisplay = change.newValue;

//             switch (change.field) {
//               case 'departure_time':
//                 fieldLabel = 'Heure de départ';
//                 oldValueDisplay = formatDateForDisplay(change.oldValue);
//                 newValueDisplay = formatDateForDisplay(change.newValue);
//                 oldDepartureFormatted = formatShortDateTime(change.oldValue);
//                 newDepartureFormatted = formatShortDateTime(change.newValue);
//                 hasDepartureChange = true;
//                 break;
//               case 'arrival_time':
//                 fieldLabel = 'Heure d\'arrivée';
//                 oldValueDisplay = formatDateForDisplay(change.oldValue);
//                 newValueDisplay = formatDateForDisplay(change.newValue);
//                 oldArrivalFormatted = formatShortDateTime(change.oldValue);
//                 newArrivalFormatted = formatShortDateTime(change.newValue);
//                 hasArrivalChange = true;
//                 break;
//               default:
//                 fieldLabel = change.field;
//             }

//             changesHtml += `
//               <tr>
//                 <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${fieldLabel}</td>
//                 <td style="padding: 8px; border-bottom: 1px solid #eee; color: #dc3545;">
//                   <del>${oldValueDisplay}</del>
//                 </td>
//                 <td style="padding: 8px; border-bottom: 1px solid #eee; color: #28a745; font-weight: bold;">
//                   ${newValueDisplay}
//                 </td>
//               </tr>
//             `;
//           });

//           // Créer un résumé des changements pour le sujet de l'email
//           let changeSummary = '';
//           if (hasDepartureChange && hasArrivalChange) {
//             changeSummary = `départ de ${oldDepartureFormatted} à ${newDepartureFormatted} et arrivée de ${oldArrivalFormatted} à ${newArrivalFormatted}`;
//           } else if (hasDepartureChange) {
//             changeSummary = `départ de ${oldDepartureFormatted} à ${newDepartureFormatted}`;
//           } else if (hasArrivalChange) {
//             changeSummary = `arrivée de ${oldArrivalFormatted} à ${newArrivalFormatted}`;
//           }

//           const emailHtml = `
//             <!DOCTYPE html>
//             <html>
//             <head>
//               <meta charset="UTF-8">
//               <meta name="viewport" content="width=device-width, initial-scale=1.0">
//               <title>Modification de votre vol - Trogon Airways</title>
//               <style>
//                 body { 
//                   font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
//                   line-height: 1.6; 
//                   color: #333; 
//                   margin: 0; 
//                   padding: 0; 
//                   background-color: #f5f5f5;
//                 }
//                 .container { 
//                   max-width: 800px; 
//                   margin: 0 auto; 
//                   background-color: white;
//                 }
//                 .header { 
//                   background-color: #1A237E; 
//                   color: white; 
//                   padding: 30px 20px; 
//                   text-align: center;
//                 }
//                 .logo { 
//                   height: 55px; 
//                   vertical-align: middle; 
//                   margin-bottom: 15px;
//                 }
//                 .content { 
//                   padding: 30px 20px;
//                 }
//                 .alert-box { 
//                   background-color: #fff3cd; 
//                   border-left: 4px solid #ffc107; 
//                   padding: 15px; 
//                   margin: 20px 0; 
//                   border-radius: 0 5px 5px 0;
//                 }
//                 .flight-info { 
//                   background-color: #f8f9fa; 
//                   border: 1px solid #dee2e6; 
//                   border-radius: 8px; 
//                   padding: 20px; 
//                   margin: 20px 0;
//                 }
//                 .changes-table { 
//                   width: 100%; 
//                   border-collapse: collapse; 
//                   margin: 20px 0;
//                 }
//                 .changes-table th { 
//                   background-color: #e9ecef; 
//                   padding: 12px; 
//                   text-align: left; 
//                   border-bottom: 2px solid #dee2e6;
//                 }
//                 .footer { 
//                   background-color: #f8f9fa; 
//                   padding: 20px; 
//                   text-align: center; 
//                   color: #6c757d; 
//                   font-size: 0.9em;
//                 }
//                 .contact-box { 
//                   background-color: #e3f2fd; 
//                   padding: 15px; 
//                   border-radius: 5px; 
//                   margin: 20px 0;
//                 }
//                 .badge { 
//                   display: inline-block; 
//                   padding: 5px 12px; 
//                   border-radius: 20px; 
//                   font-size: 0.8em; 
//                   font-weight: bold; 
//                   margin-bottom: 10px;
//                 }
//                 .badge-warning { 
//                   background-color: #ffc107; 
//                   color: #856404;
//                 }
//                 .route { 
//                   font-size: 1.2em; 
//                   font-weight: bold; 
//                   color: #1A237E; 
//                   margin: 10px 0;
//                 }
//                 @media (max-width: 600px) {
//                   .content { padding: 20px 15px; }
//                   .flight-info { padding: 15px; }
//                 }
//               </style>
//             </head>
//             <body>
//               <div class="container">
//                 <!-- Header -->
//                 <div class="header">
//                   <img src="https://trogonairways.com/logo-trogonpng.png" alt="Trogon Airways" class="logo">
//                   <h1 style="margin: 0; font-size: 1.8em;">Modification de votre vol</h1>
//                 </div>

//                 <!-- Content -->
//                 <div class="content">
//                   <p>Dear, <strong>${passenger.first_name} ${passenger.last_name}</strong>,</p>
                  
//                   <div class="alert-box">
//                     <span class="badge badge-warning">IMPORTANT</span>
//                     <p style="margin: 5px 0; font-weight: bold; font-size: 1.1em;">Your flight has been changed</p>
//                     <p style="margin: 5px 0;">We would like to inform you that changes have been made to your reservation.</p>
//                   </div>

//                   <!-- Flight Information -->
//                   <div class="flight-info">
//                     <h2 style="margin-top: 0; color: #1A237E;">Flight details</h2>
//                     <div class="route">
//                       ${passenger.departure_city} (${passenger.departure_code}) → ${passenger.arrival_city} (${passenger.arrival_code})
//                     </div>
//                     <p><strong>Booking reference :</strong> <span style="color: #1A237E; font-weight: bold;">${passenger.booking_reference}</span></p>
//                     <p><strong>Flight number:</strong> <span style="color: #1A237E; font-weight: bold;">${passenger.flight_number}</span></p>
//                   </div>

//                   <!-- Changes Table -->
//                   ${changes.length > 0 ? `
//                   <h3 style="color: #856404; margin-top: 30px;">Changes made :</h3>
//                   <table class="changes-table">
//                     <thead>
//                       <tr>
//                         <th>Element</th>
//                         <th>Old value</th>
//                         <th>New value</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       ${changesHtml}
//                     </tbody>
//                   </table>
//                   ` : ''}

//                   <!-- Important Information -->
//                   <div class="contact-box">
//                     <h3 style="margin-top: 0; color: #0c5460;">Important instructions:</h3>
//                     <ul style="margin: 10px 0; padding-left: 20px;">
//                       <li>Arrive at the airport at least <strong>2 hours</strong> before the new departure time</li>
//                       <li>Present your ID and booking reference at the check-in desk.</li>
//                       <li>Your assigned seat and services remain unchanged.</li>
//                       <li>Check our website for the latest updates regarding your flight</li>
//                     </ul>
//                   </div>

//                   <!-- Options -->
//                   <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
//                     <h3 style="margin-top: 0; color: #1A237E;">Vos options :</h3>
//                     <div style="display: flex; flex-wrap: wrap; gap: 10px; margin: 15px 0;">
//                       <div style="flex: 1; min-width: 200px; background-color: white; padding: 15px; border-radius: 5px; border: 1px solid #dee2e6;">
//                         <strong>✓ Accept the changes</strong>
//                         <p style="margin: 5px 0 0; font-size: 0.9em;">Your reservation is automatically updated with the new times.</p>
//                       </div>
//                       <div style="flex: 1; min-width: 200px; background-color: white; padding: 15px; border-radius: 5px; border: 1px solid #dee2e6;">
//                         <strong>✎ Modify your reservation</strong>
//                         <p style="margin: 5px 0 0; font-size: 0.9em;">Choose another flight with no change fees.</p>
//                       </div>
//                       <div style="flex: 1; min-width: 200px; background-color: white; padding: 15px; border-radius: 5px; border: 1px solid #dee2e6;">
//                         <strong>✕ Cancel and get a refund</strong>
//                         <p style="margin: 5px 0 0; font-size: 0.9em;">Full refund according to our cancellation policy.</p>
//                       </div>
//                     </div>
//                   </div>

//                   <!-- Contact Information -->
//                   <div style="margin: 20px 0; padding: 20px; background-color: #1A237E; color: white; border-radius: 8px;">
//                     <h3 style="margin-top: 0;">Service client disponible 24h/24</h3>
//                     <div style="display: flex; flex-wrap: wrap; gap: 20px; margin-top: 15px;">
//                       <div style="flex: 1; min-width: 150px;">
//                         <div style="font-size: 1.5em;">📞</div>
//                         <strong>Phone</strong>
//                         <p style="margin: 5px 0;">+509 334104004</p>
//                       </div>
//                       <div style="flex: 1; min-width: 150px;">
//                         <div style="font-size: 1.5em;">✉️</div>
//                         <strong>E-mail</strong>
//                         <p style="margin: 5px 0;">info@trogonairways.com</p>
//                       </div>
//                       <div style="flex: 1; min-width: 150px;">
//                         <div style="font-size: 1.5em;">🌐</div>
//                         <strong>Site web</strong>
//                         <p style="margin: 5px 0;">trogonairways.com</p>
//                       </div>
//                     </div>
//                     <p style="margin-top: 15px; font-size: 0.9em; opacity: 0.9;">
//                      For any changes or cancellations, please contact us within <strong>24 hours</strong>.
//                     </p>
//                   </div>

//                   <p style="font-style: italic; text-align: center; margin-top: 30px; color: #6c757d;">
//                     We apologize for the inconvenience and thank you for your understanding..
//                   </p>
//                 </div>

//                 <!-- Footer -->
//                 <div class="footer">
//                   <p><strong>Thank you for choosing Trogon Airways</strong></p>
//                   <p>Kind regards,<br><strong>The Trogon Airways team</strong></p>
//                   <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6;">
//                     <p style="font-size: 0.8em; color: #adb5bd;">
//                       This email was sent automatically. Please do not reply.<br>
// For any questions, please contact our customer service..
//                     </p>
//                     <p style="font-size: 0.8em; color: #adb5bd; margin-top: 10px;">
//                       © ${new Date().getFullYear()} Trogon Airways. All rights reserved.
//                     </p>
//                   </div>
//                 </div>
//               </div>
//             </body>
//             </html>
//           `;

//           // Utiliser votre fonction sendEmail existante
//           const emailResult = await sendEmail(
//             passenger.email,
//             `Trogon Airways - Modification du vol ${passenger.flight_number} (${changeSummary})`,
//             emailHtml
//           );

//           console.log(`✅ Email de modification envoyé à ${passenger.email}`);
//           return { email: passenger.email, success: true, result: emailResult };
//         } catch (emailError) {
//           console.error(`❌ Erreur envoi email de modification à ${passenger.email}:`, emailError);
//           return { email: passenger.email, success: false, error: emailError };
//         }
//       });

//       // Attendre l'envoi de tous les emails
//       const emailResults = await Promise.allSettled(emailPromises);
      
//       // Log des résultats
//       const successfulEmails = emailResults.filter(r => 
//         r.status === 'fulfilled' && r.value.success
//       ).length;
      
//       const failedEmails = emailResults.filter(r => 
//         r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
//       ).length;
      
//       console.log(`📧 Emails de modification envoyés : ${successfulEmails} réussis, ${failedEmails} échecs`);
//     }

//     await connection.commit();
    
//     res.status(200).json({
//       success: true,
//       message: "Vol modifié avec succès",
//       flight: updatedFlight,
//       changes: changes.map(change => ({
//         field: change.field,
//         oldValue: change.oldValue,
//         newValue: change.newValue
//       })),
//       emailsSent: passengers.length,
//       passengerCount: passengers.length,
      
//     });

//   } catch (error: any) {
//     console.error("❌ Erreur modification du vol:", error);
//     if (connection) {
//       await connection.rollback();
//     }
//     res.status(500).json({
//       success: false,
//       error: "Échec de la modification du vol",
//       details: process.env.NODE_ENV !== "production" ? error.message : undefined
//     });
//   } finally {
//     if (connection) {
//       connection.release();
//     }
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
  b.currency,
  b.status,
  b.created_at,
  b.passenger_count,
  b.payment_method,
  b.contact_email,
  b.type_vol,
  b.typecharter,
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
      currency: row.currency,
      status: row.status,
      created_at: row.created_at,
      passenger_count: row.passenger_count,
      payment_method: row.payment_method,
      contact_email: row.contact_email,
      first_name: row.first_name,
      last_name: row.last_name,
      type_vol: row.type_vol,
      typecharter: row.typecharter,
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
    const { startDate, endDate, transactionType, currency, status, name } = req.query;

    // Conditions dynamiques
    let conditions = " WHERE b.type_vol = 'plane' ";
    const params: any[] = [];

    // 🔹 Aucun filtre → date du jour
    if (!startDate && !endDate && !transactionType && !currency && !status && !name) {
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

    
    // 🔹 Avec type de status
    if (currency) {
      conditions += " AND b.currency = ? ";
      params.push(currency);
    }

    // 🔹 Avec nom du client
    if (name) {
  conditions += " AND (p.first_name LIKE ? OR p.last_name LIKE ?) ";
  params.push(`%${name}%`, `%${name}%`);
}


    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT 
                b.id, 
                b.booking_reference, 
                b.payment_intent_id, 
                b.total_price, 
                b.currency,
                b.status, 
                b.created_at, 
                b.passenger_count, 
                b.payment_method, 
                b.contact_email, 
                b.type_vol, 
                b.typecharter,
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


app.get("/api/booking-helico", async (req: Request, res: Response) => {
  try {
    const [bookingRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT 
  b.id,
  b.booking_reference, 
  b.payment_intent_id,
  b.total_price,
  b.currency,
  b.status,
  b.created_at,
  b.passenger_count,
  b.payment_method,
  b.contact_email,
  b.type_vol,
  b.typecharter,
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
      currency: row.currency,
      status: row.status,
      created_at: row.created_at,
      passenger_count: row.passenger_count,
      payment_method: row.payment_method,
      first_name: row.first_name,
      last_name: row.last_name,
      contact_email: row.contact_email,
      type_vol: row.type_vol,
      typecharter: row.typecharter,
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
    const { startDate, endDate, transactionType, currency, status, name } = req.query;

    // Conditions dynamiques
    let conditions = " WHERE b.type_vol = 'helicopter' ";
    const params: any[] = [];

    // 🔹 Aucun filtre → date du jour
    if (!startDate && !endDate && !transactionType && !currency && !status && !name) {
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

        // 🔹 Avec type de status
    if (currency) {
      conditions += " AND b.currency = ? ";
      params.push(currency);
    }


    if (name) {
  conditions += " AND (p.first_name LIKE ? OR p.last_name LIKE ?) ";
  params.push(`%${name}%`, `%${name}%`);
}

    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT 
                b.id, 
                b.booking_reference, 
                b.payment_intent_id, 
                b.total_price, 
                b.currency, 
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


// app.get("/api/flighttablehelico", async (req: Request, res: Response) => {
//   let connection;
//   try {


//     const query = `
//             SELECT 
//                 f.id,
//                 f.flight_number,
//                 f.type,
//                 f.airline,
//                 f.departure_time,
//                 f.arrival_time,
//                 f.price,
//                 f.seats_available,
//                 dep.name AS departure_airport_name,
//                 dep.city AS departure_city,
//                 dep.code AS departure_code,
//                 arr.name AS arrival_airport_name,
//                 arr.city AS arrival_city,
//                 arr.code AS arrival_code
//             FROM 
//                 flights f
//             JOIN 
//                 locations dep ON f.departure_location_id = dep.id
//             JOIN 
//                 locations arr ON f.arrival_location_id = arr.id
//             WHERE 
//                 f.type = 'helicopter'    
//             ORDER BY 
//                 f.departure_time ASC
//         `;

//     console.log("Exécution de la requête SQL...");
//     const [flights] = await pool.query<FlightWithAirports[]>(query);
//     console.log("Requête exécutée avec succès. Nombre de vols:", flights.length);

//     // Formater les données
//     const formattedFlights = flights.map((flight) => ({
//       id: flight.id,
//       flight_number: flight.flight_number,
//       type: flight.type,
//       airline: flight.airline,
//       from: `${flight.departure_airport_name} (${flight.departure_code})`,
//       to: `${flight.arrival_airport_name} (${flight.arrival_code})`,
//       departure: flight.departure_time,
//       arrival: flight.arrival_time,
//       price: flight.price,
//       seats_available: flight.seats_available.toString(),
//       departure_city: flight.departure_city,
//       arrival_city: flight.arrival_city,
//     }));


//     res.json(formattedFlights);
//   } catch (err) {
//     console.error("ERREUR DÉTAILLÉE:", {
//       message: err instanceof Error ? err.message : "Erreur inconnue",
//       stack: err instanceof Error ? err.stack : undefined,

//     });

//     if (connection)
//       res.status(500).json({
//         error: "Erreur serveur",
//         details: process.env.NODE_ENV !== "production" ? (err instanceof Error ? err.message : "Erreur inconnue") : undefined,
//       });
//   }
// });

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
                f.total_seat,
                f.seats_available,
                f.activeflight,
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
                f.departure_time DESC
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
      total_seat: flight.total_seat,
      seats_available: flight.seats_available.toString(),
      activeflight: flight.activeflight,
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



// app.get("/api/flighttableplane", async (req: Request, res: Response) => {
//   let connection;
//   try {


//     const query = `
//             SELECT 
//                 f.id,
//                 f.flight_number,
//                 f.type,
//                 f.airline,
//                 f.departure_time,
//                 f.arrival_time,
//                 f.price,
//                 f.seats_available,
//                 dep.name AS departure_airport_name,
//                 dep.city AS departure_city,
//                 dep.code AS departure_code,
//                 arr.name AS arrival_airport_name,
//                 arr.city AS arrival_city,
//                 arr.code AS arrival_code
//             FROM 
//                 flights f
//             JOIN 
//                 locations dep ON f.departure_location_id = dep.id
//             JOIN 
//                 locations arr ON f.arrival_location_id = arr.id
//             WHERE 
//                 f.type = 'plane'    
//             ORDER BY 
//                 f.departure_time ASC
//         `;

//     console.log("Exécution de la requête SQL...");
//     const [flights] = await pool.query<FlightWithAirports[]>(query);
//     console.log("Requête exécutée avec succès. Nombre de vols:", flights.length);

//     // Formater les données
//     const formattedFlights = flights.map((flight) => ({
//       id: flight.id,
//       flight_number: flight.flight_number,
//       type: flight.type,
//       airline: flight.airline,
//       from: `${flight.departure_airport_name} (${flight.departure_code})`,
//       to: `${flight.arrival_airport_name} (${flight.arrival_code})`,
//       departure: flight.departure_time,
//       arrival: flight.arrival_time,
//       price: flight.price,
//       seats_available: flight.seats_available.toString(),
//       departure_city: flight.departure_city,
//       arrival_city: flight.arrival_city,
//     }));


//     res.json(formattedFlights);
//   } catch (err) {
//     console.error("ERREUR DÉTAILLÉE:", {
//       message: err instanceof Error ? err.message : "Erreur inconnue",
//       stack: err instanceof Error ? err.stack : undefined,

//     });

//     if (connection)
//       res.status(500).json({
//         error: "Erreur serveur",
//         details: process.env.NODE_ENV !== "production" ? (err instanceof Error ? err.message : "Erreur inconnue") : undefined,
//       });
//   }
// });

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
                f.total_seat,
                f.seats_available,
                f.activeflight,
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
                f.departure_time DESC
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
      total_seat: flight.total_seat,
      seats_available: flight.seats_available.toString(),
      activeflight: flight.activeflight,
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
                f.total_seat,
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
      total_seat: flight.total_seat,
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

app.get("/api/booking-charter", async (req: Request, res: Response) => {
  try {
    const [bookingRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT 
  b.id,
  b.booking_reference, 
  b.payment_intent_id,
  b.total_price,
  b.currency,
  b.status,
  b.created_at,
  b.passenger_count,
  b.payment_method,
  b.contact_email,
  b.type_vol,
  b.typecharter,
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
           
            WHERE b.typecharter IN ('helicopter', 'plane')
            ORDER BY b.created_at DESC`,
    
    );

    const bookings: Booking[] = bookingRows.map((row) => ({
      id: row.id,
      booking_reference: row.booking_reference,
      payment_intent_id: row.payment_intent_id,
      total_price: Number(row.total_price),
      currency: row.currency,
      status: row.status,
      created_at: row.created_at,
      passenger_count: row.passenger_count,
      payment_method: row.payment_method,
      first_name: row.first_name,
      last_name: row.last_name,
      contact_email: row.contact_email,
      type_vol: row.type_vol,
      typecharter: row.typecharter,
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
app.get("/api/booking-charter-search", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, transactionType, currency, status, name } = req.query;

    // Conditions dynamiques
    let conditions = " WHERE b.typecharter IN ('helicopter', 'plane') ";
    const params: any[] = [];

    // 🔹 Aucun filtre → date du jour
    if (!startDate && !endDate && !transactionType && !currency && !status && !name) {
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

        // 🔹 Avec type de status
    if (currency) {
      conditions += " AND b.currency = ? ";
      params.push(currency);
    }


    if (name) {
  conditions += " AND (p.first_name LIKE ? OR p.last_name LIKE ?) ";
  params.push(`%${name}%`, `%${name}%`);
}

    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT 
                b.id, 
                b.booking_reference, 
                b.payment_intent_id, 
                b.total_price, 
                b.currency, 
                b.status, 
                b.created_at, 
                b.passenger_count, 
                b.payment_method, 
                b.contact_email, 
                b.type_vol, 
                b.typecharter,
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

app.get("/api/flighttablecharter", async (req: Request, res: Response) => {
  let connection;
  try {


    const query = `
            SELECT 
                f.id,
                f.flight_number,
                f.type,
                f.charter,
                f.typecharter,
                f.airline,
                f.departure_time,
                f.arrival_time,
                f.price,
                f.total_seat,
                f.seats_available,
                f.activeflight,
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
                f.charter = 'charter'    
            ORDER BY 
                f.departure_time DESC
        `;

    console.log("Exécution de la requête SQL...");
    const [flights] = await pool.query<FlightWithAirports[]>(query);
    console.log("Requête exécutée avec succès. Nombre de vols:", flights.length);

    // Formater les données
    const formattedFlights = flights.map((flight) => ({
      id: flight.id,
      flight_number: flight.flight_number,
      type: flight.type,
      typecharter: flight.typecharter,
      charter: flight.charter,
      airline: flight.airline,
      from: `${flight.departure_airport_name} (${flight.departure_code})`,
      to: `${flight.arrival_airport_name} (${flight.arrival_code})`,
      departure: flight.departure_time,
      arrival: flight.arrival_time,
      price: flight.price,
      total_seat: flight.total_seat,
      seats_available: flight.seats_available.toString(),
      activeflight: flight.activeflight,
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

app.get("/api/flight-charter-search", async (req: Request, res: Response) => {
  try {
    const { flightNumb, tailNumber, dateDeparture } = req.query;

    // Conditions dynamiques
    let conditions = " WHERE (f.typecharter = 'plane' OR f.typecharter = 'helicopter') ";
    const params: any[] = [];

    if (flightNumb) {
      conditions += " AND f.flight_number = ? ";
      params.push(flightNumb);
    }

    if (tailNumber) {
      conditions += " AND f.airline = ? ";
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
                f.typecharter,
                f.airline,
                f.departure_time,
                f.arrival_time,
                f.price,
                f.total_seat, 
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

   
    const formattedFlights = rows.map((flight) => ({
      id: flight.id,
      flight_number: flight.flight_number,
      type: flight.type,
      typecharter: flight.typecharter,
      airline: flight.airline,
      from: `${flight.departure_airport_name} (${flight.departure_code})`,
      to: `${flight.arrival_airport_name} (${flight.arrival_code})`,
      departure: flight.departure_time,
      arrival: flight.arrival_time,
      price: flight.price,
      total_seat: flight.total_seat,
      seats_available: flight.seats_available.toString(),
      departure_city: flight.departure_city,
      arrival_city: flight.arrival_city,
    }));

    
    res.json({ bookings: formattedFlights });

  } catch (error) {
    console.error("Erreur recherche booking:", error);
    res.status(500).json({ error: "Erreur lors de la recherche" });
  }
});


app.get("/api/flight-charter-export", async (req: Request, res: Response) => {
  try {
    const { flightNumb, tailNumber, dateDeparture } = req.query;

    // Formatage de la date pour l'affichage
    let formattedDate = "Toutes dates";
    if (dateDeparture) {
      try {
        // Convertir la chaîne en objet Date
        const dateObj = new Date(dateDeparture as string);
        // Formater la date (ex: "Lun, 15 Janv")
        formattedDate = format(dateObj, "EEE, dd MMM", { locale: fr });
      } catch (error) {
        console.error("Erreur formatage date:", error);
        formattedDate = dateDeparture as string;
      }
    }

    // Conditions dynamiques
    let conditions = " WHERE f.typecharter IN ('helicopter', 'plane') ";
    const params: any[] = [];

    if (flightNumb) {
      conditions += " AND f.flight_number = ? ";
      params.push(flightNumb);
    }

    if (tailNumber) {
      conditions += " AND f.airline = ? ";
      params.push(tailNumber);
    }

    if (dateDeparture) {
      conditions += " AND DATE(f.departure_time) = ? ";
      params.push(dateDeparture);
    }

    // 🟦 EXÉCUTION SQL
    const [rowsUntyped] = await pool.query(`
      SELECT 
    f.id,
    f.flight_number,
    f.typecharter,
    f.airline,
    f.departure_time,
    f.arrival_time,
    f.price,
    f.seats_available,

    COALESCE(
      JSON_ARRAYAGG(
        DISTINCT CASE 
          WHEN p.id IS NOT NULL THEN
            JSON_OBJECT(
              'first_name', p.first_name,
              'last_name', p.last_name,
              'idClient', p.idClient,
              'idTypeClient', p.idTypeClient
            )
        END
      ),
      JSON_ARRAY()
    ) AS passengers,

    dep.name AS departure_airport_name,
    dep.city AS departure_city,
    dep.code AS departure_code,

    arr.name AS arrival_airport_name,
    arr.city AS arrival_city,
    arr.code AS arrival_code

FROM flights f

LEFT JOIN bookings b_out ON f.id = b_out.flight_id
LEFT JOIN bookings b_ret ON f.id = b_ret.return_flight_id
LEFT JOIN passengers p 
       ON p.booking_id IN (b_out.id, b_ret.id)

JOIN locations dep ON f.departure_location_id = dep.id
JOIN locations arr ON f.arrival_location_id = arr.id

${conditions}
GROUP BY f.id
ORDER BY f.departure_time
;
    `, params);

    const rows = rowsUntyped as mysql.RowDataPacket[];

    // Si aucune donnée trouvée
    if (!rows || rows.length === 0) {
      return res.status(404).json({ 
        error: "Aucune donnée trouvée avec les critères spécifiés" 
      });
    }

    const passengerRowsHTML = rows.map((p) => {
      // Parse les passagers si nécessaire
      let passengers = [];
      try {
        passengers = typeof p.passengers === "string" 
          ? JSON.parse(p.passengers) 
          : p.passengers || [];
        
        // Filtrer les entrées null
        passengers = passengers.filter((ps: any) => ps !== null);
      } catch (error) {
        console.error("Erreur parsing passagers:", error);
        passengers = [];
      }

      const seatsAvailable = Number(p.seats_available) || 0;
      const totalReservations = passengers.length;
      const capacity = totalReservations + seatsAvailable;

      // Formater l'heure de départ
      let departureTimeFormatted = 'N/A';
      if (p.departure_time) {
        try {
          const departureDate = new Date(p.departure_time);
          // Format: "HH:mm" (ex: "14:30")
          departureTimeFormatted = format(departureDate, "HH:mm");
        } catch (error) {
          console.error("Erreur formatage heure départ:", error);
          departureTimeFormatted = String(p.departure_time);
        }
      }

            // Formater l'heure de départ
      let arrivalTimeFormatted = 'N/A';
      if (p.departure_time) {
        try {
          const arrivalDate = new Date(p.arrival_time);
          // Format: "HH:mm" (ex: "14:30")
          arrivalTimeFormatted = format(arrivalDate, "HH:mm");
        } catch (error) {
          console.error("Erreur formatage heure départ:", error);
          arrivalTimeFormatted = String(p.arrival_time);
        }
      }


            // Formater la date complète pour le vol (optionnel)
      let departureDateFormatted = '';
      if (p.departure_time) {
        try {
          const departureDate = new Date(p.departure_time);
          // Format: "dd/MM/yyyy" (ex: "15/01/2024")
          departureDateFormatted = format(departureDate, "EEE, dd MMM", { locale: fr });
        } catch (error) {
          departureDateFormatted = '';
        }
      }

      const passengerRows = passengers.length > 0
        ? passengers
            .map(
              (ps: any) => `
                <tr>
                  <td><Strong>${ps.first_name || ''} ${ps.last_name || ''}</Strong></td>
                  <td><Strong>${ps.idTypeClient === "passport" ? "Passport: " : ps.idTypeClient === "nimu" ? "NIMU: " : ps.idTypeClient === "licens" ? "Licens: " : ""}</Strong> ${ps.idClient ? ps.idClient : ""}</td>
                </tr>`
            )
            .join("")
        : `
            <tr>
              <td colspan="2" class="center">Aucun passager</td>
            </tr>
          `;

      return `
        <div class="flight-section">
          <h2>${p.departure_code || ''} → ${p.arrival_code || ''} | ${p.airline || ''}</h2>
          
          <div class="flight-info">
            <span class="flight-number">Vol ${p.flight_number || ''}</span>
         
          </div>
          
          <table class="two-cols">
            <tr>
              <th>Départ</th>
              <td class="red">${departureDateFormatted} ${departureTimeFormatted} - ${arrivalTimeFormatted}</td>
            </tr>
            <tr>
              <th>Réservations</th>
              <td class="center">${totalReservations}</td>
            </tr>
            <tr>
              <th>Capacité</th>
              <td class="center">${capacity}</td>
            </tr>
            <tr>
              <th>Places disponibles</th>
              <td class="center">${seatsAvailable}</td>
            </tr>
          </table>
          
          <table class="names-table">
            <tr>
              <th>Nom complet</th>
              <th>Identifiant</th>
            </tr>
            ${passengerRows}
          </table>
          
          <div class="spacer"></div>
        </div>
      `;
    }).join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>Manifeste Charter</title>
        <style>
          @page {
            size: A4;
            margin: 0.5in;
          }
          
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
            margin: 0;
            padding: 0.5in;
            font-size: 12px;
          }
          
          h1 {
            text-align: center;
            font-size: 20px;
            margin-bottom: 25px;
            color: #1f4e79;
            border-bottom: 2px solid #1f4e79;
            padding-bottom: 10px;
          }
          
          h2 {
            font-size: 16px;
            color: #1f4e79;
            margin: 0 0 5px 0;
          }
          
          .flight-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            font-size: 13px;
            color: #666;
          }
          
          .flight-number {
            font-weight: bold;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 11px;
          }
          
          th, td {
            border: 1px solid #ddd;
            padding: 8px 10px;
            text-align: left;
          }
          
          th {
            background: #f8f9fa;
            font-weight: bold;
            color: #333;
          }
          
          .center {
            text-align: center;
          }
          
          .red {
            color: #d9534f;
            font-weight: bold;
          }
          
          .two-cols th,
          .two-cols td {
            width: 50%;
          }
          
          .names-table th {
            background: #e9ecef;
            text-align: center;
          }
          
          .names-table td {
            text-align: left;
          }
          
          .spacer {
            height: 15px;
            border-bottom: 1px dashed #eee;
            margin: 20px 0;
          }
          
          .flight-section {
            page-break-inside: avoid;
            margin-bottom: 30px;
            padding: 15px;
            border: 1px solid #eee;
            border-radius: 5px;
            background: #fff;
          }
          
          .header-info {
            text-align: center;
            margin-bottom: 25px;
            color: #666;
          }
          
          .date-display {
            font-size: 14px;
            font-weight: bold;
            color: #1f4e79;
            margin-top: 5px;
          }
          
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 10px;
            color: #999;
            border-top: 1px solid #eee;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header-info">
          <h1>MANIFESTE DE VOL</h1>
          <div class="date-display">${formattedDate}</div>
          
        </div>
        
        ${passengerRowsHTML}
        
      
      </body>
      </html>
    `;

    // Générer le PDF
    const file = { content: htmlContent };
    const options = { 
      format: 'A4', 
      printBackground: true,
      displayHeaderFooter: false,
      margin: { 
        top: '0.5in', 
        right: '0.5in', 
        bottom: '0.5in', 
        left: '0.5in' 
      }
    };

    const pdfBuffer = await pdf.generatePdf(file, options);

    // Nom du fichier avec la date formatée
    const fileNameDate = dateDeparture 
      ? format(new Date(dateDeparture as string), 'yyyy-MM-dd')
      : 'all';
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=manifeste-charter-${fileNameDate}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error("Erreur génération PDF:", error);
    res.status(500).json({ 
      error: "Erreur lors de la génération du PDF",
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});




app.get("/api/flight-plane-search", async (req: Request, res: Response) => {
  try {
    // const { startDate, endDate, transactionType, status, name } = req.query;
    const { flightNumb, tailNumber, dateDeparture } = req.query;

    // Conditions dynamiques
    let conditions = " WHERE f.type = 'plane' ";
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
                f.total_seat,
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
      total_seat: flight.total_seat,
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



app.get("/api/passengers/search", async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || String(q).length < 2) {
      return res.json([]);
    }

    const search = `%${q}%`;

    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `
      SELECT p.*
      FROM passengers p
      INNER JOIN (
          SELECT 
              first_name,
              last_name,
              MAX(created_at) AS last_created
          FROM passengers
          WHERE first_name LIKE ? OR last_name LIKE ?
          GROUP BY first_name, last_name
      ) latest
      ON p.first_name = latest.first_name
      AND p.last_name = latest.last_name
      AND p.created_at = latest.last_created
      ORDER BY p.created_at DESC
      LIMIT 10
      `,
      [search, search]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});



app.get("/api/flight-helico-export", async (req: Request, res: Response) => {
  try {
    const { flightNumb, tailNumber, dateDeparture } = req.query;

    // Formatage de la date pour l'affichage
    let formattedDate = "Toutes dates";
    if (dateDeparture) {
      try {
        // Convertir la chaîne en objet Date
        const dateObj = new Date(dateDeparture as string);
        // Formater la date (ex: "Lun, 15 Janv")
        formattedDate = format(dateObj, "EEE, dd MMM", { locale: fr });
      } catch (error) {
        console.error("Erreur formatage date:", error);
        formattedDate = dateDeparture as string;
      }
    }

    // Conditions dynamiques
    let conditions = " WHERE f.type = 'helicopter' ";
    const params: any[] = [];

    if (flightNumb) {
      conditions += " AND f.flight_number = ? ";
      params.push(flightNumb);
    }

    if (tailNumber) {
      conditions += " AND f.airline = ? ";
      params.push(tailNumber);
    }

    if (dateDeparture) {
      conditions += " AND DATE(f.departure_time) = ? ";
      params.push(dateDeparture);
    }

    // 🟦 EXÉCUTION SQL
    const [rowsUntyped] = await pool.query(`
      SELECT 
    f.id,
    f.flight_number,
    f.type,
    f.airline,
    f.departure_time,
    f.arrival_time,
    f.price,
    f.seats_available,

    COALESCE(
      JSON_ARRAYAGG(
        DISTINCT CASE 
          WHEN p.id IS NOT NULL THEN
            JSON_OBJECT(
              'first_name', p.first_name,
              'last_name', p.last_name,
              'idClient', p.idClient,
              'idTypeClient', p.idTypeClient
            )
        END
      ),
      JSON_ARRAY()
    ) AS passengers,

    dep.name AS departure_airport_name,
    dep.city AS departure_city,
    dep.code AS departure_code,

    arr.name AS arrival_airport_name,
    arr.city AS arrival_city,
    arr.code AS arrival_code

FROM flights f

LEFT JOIN bookings b_out ON f.id = b_out.flight_id
LEFT JOIN bookings b_ret ON f.id = b_ret.return_flight_id
LEFT JOIN passengers p 
       ON p.booking_id IN (b_out.id, b_ret.id)

JOIN locations dep ON f.departure_location_id = dep.id
JOIN locations arr ON f.arrival_location_id = arr.id

${conditions}
GROUP BY f.id
ORDER BY f.departure_time
;
    `, params);

    const rows = rowsUntyped as mysql.RowDataPacket[];

    // Si aucune donnée trouvée
    if (!rows || rows.length === 0) {
      return res.status(404).json({ 
        error: "Aucune donnée trouvée avec les critères spécifiés" 
      });
    }

    const passengerRowsHTML = rows.map((p) => {
      // Parse les passagers si nécessaire
      let passengers = [];
      try {
        passengers = typeof p.passengers === "string" 
          ? JSON.parse(p.passengers) 
          : p.passengers || [];
        
        // Filtrer les entrées null
        passengers = passengers.filter((ps: any) => ps !== null);
      } catch (error) {
        console.error("Erreur parsing passagers:", error);
        passengers = [];
      }

      const seatsAvailable = Number(p.seats_available) || 0;
      const totalReservations = passengers.length;
      const capacity = totalReservations + seatsAvailable;

      // Formater l'heure de départ
      let departureTimeFormatted = 'N/A';
      if (p.departure_time) {
        try {
          const departureDate = new Date(p.departure_time);
          // Format: "HH:mm" (ex: "14:30")
          departureTimeFormatted = format(departureDate, "HH:mm");
        } catch (error) {
          console.error("Erreur formatage heure départ:", error);
          departureTimeFormatted = String(p.departure_time);
        }
      }

            // Formater l'heure de départ
      let arrivalTimeFormatted = 'N/A';
      if (p.departure_time) {
        try {
          const arrivalDate = new Date(p.arrival_time);
          // Format: "HH:mm" (ex: "14:30")
          arrivalTimeFormatted = format(arrivalDate, "HH:mm");
        } catch (error) {
          console.error("Erreur formatage heure départ:", error);
          arrivalTimeFormatted = String(p.arrival_time);
        }
      }


            // Formater la date complète pour le vol (optionnel)
      let departureDateFormatted = '';
      if (p.departure_time) {
        try {
          const departureDate = new Date(p.departure_time);
          // Format: "dd/MM/yyyy" (ex: "15/01/2024")
          departureDateFormatted = format(departureDate, "EEE, dd MMM", { locale: fr });
        } catch (error) {
          departureDateFormatted = '';
        }
      }

      const passengerRows = passengers.length > 0
        ? passengers
            .map(
              (ps: any) => `
                <tr>
                  <td><Strong>${ps.first_name || ''} ${ps.last_name || ''}</Strong></td>
                  <td><Strong>${ps.idTypeClient === "passport" ? "Passport: " : ps.idTypeClient === "nimu" ? "NIMU: " : ps.idTypeClient === "licens" ? "Licens: " : ""}</Strong> ${ps.idClient ? ps.idClient : ""}</td>
                </tr>`
            )
            .join("")
        : `
            <tr>
              <td colspan="2" class="center">Aucun passager</td>
            </tr>
          `;

      return `
        <div class="flight-section">
          <h2>${p.departure_code || ''} → ${p.arrival_code || ''} | ${p.airline || ''}</h2>
          
          <div class="flight-info">
            <span class="flight-number">Vol ${p.flight_number || ''}</span>
         
          </div>
          
          <table class="two-cols">
            <tr>
              <th>Départ</th>
              <td class="red">${departureDateFormatted} ${departureTimeFormatted} - ${arrivalTimeFormatted}</td>
            </tr>
            <tr>
              <th>Réservations</th>
              <td class="center">${totalReservations}</td>
            </tr>
            <tr>
              <th>Capacité</th>
              <td class="center">${capacity}</td>
            </tr>
            <tr>
              <th>Places disponibles</th>
              <td class="center">${seatsAvailable}</td>
            </tr>
          </table>
          
          <table class="names-table">
            <tr>
              <th>Nom complet</th>
              <th>Identifiant</th>
            </tr>
            ${passengerRows}
          </table>
          
          <div class="spacer"></div>
        </div>
      `;
    }).join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>Manifeste Hélicoptère</title>
        <style>
          @page {
            size: A4;
            margin: 0.5in;
          }
          
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
            margin: 0;
            padding: 0.5in;
            font-size: 12px;
          }
          
          h1 {
            text-align: center;
            font-size: 20px;
            margin-bottom: 25px;
            color: #1f4e79;
            border-bottom: 2px solid #1f4e79;
            padding-bottom: 10px;
          }
          
          h2 {
            font-size: 16px;
            color: #1f4e79;
            margin: 0 0 5px 0;
          }
          
          .flight-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            font-size: 13px;
            color: #666;
          }
          
          .flight-number {
            font-weight: bold;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 11px;
          }
          
          th, td {
            border: 1px solid #ddd;
            padding: 8px 10px;
            text-align: left;
          }
          
          th {
            background: #f8f9fa;
            font-weight: bold;
            color: #333;
          }
          
          .center {
            text-align: center;
          }
          
          .red {
            color: #d9534f;
            font-weight: bold;
          }
          
          .two-cols th,
          .two-cols td {
            width: 50%;
          }
          
          .names-table th {
            background: #e9ecef;
            text-align: center;
          }
          
          .names-table td {
            text-align: left;
          }
          
          .spacer {
            height: 15px;
            border-bottom: 1px dashed #eee;
            margin: 20px 0;
          }
          
          .flight-section {
            page-break-inside: avoid;
            margin-bottom: 30px;
            padding: 15px;
            border: 1px solid #eee;
            border-radius: 5px;
            background: #fff;
          }
          
          .header-info {
            text-align: center;
            margin-bottom: 25px;
            color: #666;
          }
          
          .date-display {
            font-size: 14px;
            font-weight: bold;
            color: #1f4e79;
            margin-top: 5px;
          }
          
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 10px;
            color: #999;
            border-top: 1px solid #eee;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header-info">
          <h1>MANIFESTE DE VOL - HÉLICOPTÈRE</h1>
          <div class="date-display">${formattedDate}</div>
          
        </div>
        
        ${passengerRowsHTML}
        
      
      </body>
      </html>
    `;

    // Générer le PDF
    const file = { content: htmlContent };
    const options = { 
      format: 'A4', 
      printBackground: true,
      displayHeaderFooter: false,
      margin: { 
        top: '0.5in', 
        right: '0.5in', 
        bottom: '0.5in', 
        left: '0.5in' 
      }
    };

    const pdfBuffer = await pdf.generatePdf(file, options);

    // Nom du fichier avec la date formatée
    const fileNameDate = dateDeparture 
      ? format(new Date(dateDeparture as string), 'yyyy-MM-dd')
      : 'all';
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=manifeste-helico-${fileNameDate}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error("Erreur génération PDF:", error);
    res.status(500).json({ 
      error: "Erreur lors de la génération du PDF",
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});



app.get("/api/flight-plane-export", async (req: Request, res: Response) => {
  try {
    const { flightNumb, tailNumber, dateDeparture } = req.query;

    // Formatage de la date pour l'affichage
    let formattedDate = "Toutes dates";
    if (dateDeparture) {
      try {
        // Convertir la chaîne en objet Date
        const dateObj = new Date(dateDeparture as string);
        // Formater la date (ex: "Lun, 15 Janv")
        formattedDate = format(dateObj, "EEE, dd MMM", { locale: fr });
      } catch (error) {
        console.error("Erreur formatage date:", error);
        formattedDate = dateDeparture as string;
      }
    }

    // Conditions dynamiques
    let conditions = " WHERE f.type = 'plane' ";
    const params: any[] = [];

    if (flightNumb) {
      conditions += " AND f.flight_number = ? ";
      params.push(flightNumb);
    }

    if (tailNumber) {
      conditions += " AND f.airline = ? ";
      params.push(tailNumber);
    }

    if (dateDeparture) {
      conditions += " AND DATE(f.departure_time) = ? ";
      params.push(dateDeparture);
    }

    // 🟦 EXÉCUTION SQL
    const [rowsUntyped] = await pool.query(`
        SELECT 
    f.id,
    f.flight_number,
    f.type,
    f.airline,
    f.departure_time,
    f.arrival_time,
    f.price,
    f.seats_available,

    COALESCE(
      JSON_ARRAYAGG(
        DISTINCT CASE 
          WHEN p.id IS NOT NULL THEN
            JSON_OBJECT(
              'first_name', p.first_name,
              'last_name', p.last_name,
              'idClient', p.idClient,
              'idTypeClient', p.idTypeClient
            )
        END
      ),
      JSON_ARRAY()
    ) AS passengers,

    dep.name AS departure_airport_name,
    dep.city AS departure_city,
    dep.code AS departure_code,

    arr.name AS arrival_airport_name,
    arr.city AS arrival_city,
    arr.code AS arrival_code

FROM flights f

LEFT JOIN bookings b_out ON f.id = b_out.flight_id
LEFT JOIN bookings b_ret ON f.id = b_ret.return_flight_id
LEFT JOIN passengers p 
       ON p.booking_id IN (b_out.id, b_ret.id)

JOIN locations dep ON f.departure_location_id = dep.id
JOIN locations arr ON f.arrival_location_id = arr.id

${conditions}
GROUP BY f.id
ORDER BY f.departure_time;
    `, params);

    const rows = rowsUntyped as mysql.RowDataPacket[];

    // Si aucune donnée trouvée
    if (!rows || rows.length === 0) {
      return res.status(404).json({ 
        error: "Aucune donnée trouvée avec les critères spécifiés" 
      });
    }

    const passengerRowsHTML = rows.map((p) => {
      // Parse les passagers si nécessaire
      let passengers = [];
      try {
        passengers = typeof p.passengers === "string" 
          ? JSON.parse(p.passengers) 
          : p.passengers || [];
        
        // Filtrer les entrées null
        passengers = passengers.filter((ps: any) => ps !== null);
      } catch (error) {
        console.error("Erreur parsing passagers:", error);
        passengers = [];
      }

      const seatsAvailable = Number(p.seats_available) || 0;
      const totalReservations = passengers.length;
      const capacity = totalReservations + seatsAvailable;

      // Formater l'heure de départ
      let departureTimeFormatted = 'N/A';
      if (p.departure_time) {
        try {
          const departureDate = new Date(p.departure_time);
          // Format: "HH:mm" (ex: "14:30")
          departureTimeFormatted = format(departureDate, "HH:mm");
        } catch (error) {
          console.error("Erreur formatage heure départ:", error);
          departureTimeFormatted = String(p.departure_time);
        }
      }

              // Formater l'heure de départ
      let arrivalTimeFormatted = 'N/A';
      if (p.departure_time) {
        try {
          const arrivalDate = new Date(p.arrival_time);
          // Format: "HH:mm" (ex: "14:30")
          arrivalTimeFormatted = format(arrivalDate, "HH:mm");
        } catch (error) {
          console.error("Erreur formatage heure départ:", error);
          arrivalTimeFormatted = String(p.arrival_time);
        }
      }


      // Formater la date complète pour le vol (optionnel)
      let departureDateFormatted = '';
      if (p.departure_time) {
        try {
          const departureDate = new Date(p.departure_time);
          // Format: "dd/MM/yyyy" (ex: "15/01/2024")
          departureDateFormatted = format(departureDate, "EEE, dd MMM", { locale: fr });
        } catch (error) {
          departureDateFormatted = '';
        }
      }

      const passengerRows = passengers.length > 0
        ? passengers
            .map(
              (ps: any) => `
                <tr>
                  <td><Strong>${ps.first_name || ''} ${ps.last_name || ''}</Strong></td>
                  <td><Strong>${ps.idTypeClient === "passport" ? "Passport: " : ps.idTypeClient === "nimu" ? "NIMU: " : ps.idTypeClient === "licens" ? "Licens: " : ""}</Strong> ${ps.idClient ? ps.idClient : ""}</td>
                </tr>`
            )
            .join("")
        : `
            <tr>
              <td colspan="2" class="center">Aucun passager</td>
            </tr>
          `;

      return `
        <div class="flight-section">
          <h2>${p.departure_code || ''} → ${p.arrival_code || ''} | ${p.airline || ''}</h2>
          
          <div class="flight-info">
            <span class="flight-number">Vol ${p.flight_number || ''}</span>
         
          </div>
          
          <table class="two-cols">
            <tr>
              <th>Départ</th>
              <td class="red">${departureDateFormatted} ${departureTimeFormatted} - ${arrivalTimeFormatted}</td>
            </tr>
            <tr>
              <th>Réservations</th>
              <td class="center">${totalReservations}</td>
            </tr>
            <tr>
              <th>Capacité</th>
              <td class="center">${capacity}</td>
            </tr>
            <tr>
              <th>Places disponibles</th>
              <td class="center">${seatsAvailable}</td>
            </tr>
          </table>
          
          <table class="names-table">
            <tr>
              <th>Nom complet</th>
              <th>Identifiant</th>
            </tr>
            ${passengerRows}
          </table>
          
          <div class="spacer"></div>
        </div>
      `;
    }).join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>Manifeste Hélicoptère</title>
        <style>
          @page {
            size: A4;
            margin: 0.5in;
          }
          
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
            margin: 0;
            padding: 0.5in;
            font-size: 12px;
          }
          
          h1 {
            text-align: center;
            font-size: 20px;
            margin-bottom: 25px;
            color: #1f4e79;
            border-bottom: 2px solid #1f4e79;
            padding-bottom: 10px;
          }
          
          h2 {
            font-size: 16px;
            color: #1f4e79;
            margin: 0 0 5px 0;
          }
          
          .flight-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            font-size: 13px;
            color: #666;
          }
          
          .flight-number {
            font-weight: bold;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 11px;
          }
          
          th, td {
            border: 1px solid #ddd;
            padding: 8px 10px;
            text-align: left;
          }
          
          th {
            background: #f8f9fa;
            font-weight: bold;
            color: #333;
          }
          
          .center {
            text-align: center;
          }
          
          .red {
            color: #d9534f;
            font-weight: bold;
          }
          
          .two-cols th,
          .two-cols td {
            width: 50%;
          }
          
          .names-table th {
            background: #e9ecef;
            text-align: center;
          }
          
          .names-table td {
            text-align: left;
          }
          
          .spacer {
            height: 15px;
            border-bottom: 1px dashed #eee;
            margin: 20px 0;
          }
          
          .flight-section {
            page-break-inside: avoid;
            margin-bottom: 30px;
            padding: 15px;
            border: 1px solid #eee;
            border-radius: 5px;
            background: #fff;
          }
          
          .header-info {
            text-align: center;
            margin-bottom: 25px;
            color: #666;
          }
          
          .date-display {
            font-size: 14px;
            font-weight: bold;
            color: #1f4e79;
            margin-top: 5px;
          }
          
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 10px;
            color: #999;
            border-top: 1px solid #eee;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header-info">
          <h1>MANIFESTE DE VOL - AVION</h1>
          <div class="date-display">${formattedDate}</div>
          
        </div>
        
        ${passengerRowsHTML}
        
      
      </body>
      </html>
    `;

    // Générer le PDF
    const file = { content: htmlContent };
    const options = { 
      format: 'A4', 
      printBackground: true,
      displayHeaderFooter: false,
      margin: { 
        top: '0.5in', 
        right: '0.5in', 
        bottom: '0.5in', 
        left: '0.5in' 
      }
    };

    const pdfBuffer = await pdf.generatePdf(file, options);

    // Nom du fichier avec la date formatée
    const fileNameDate = dateDeparture 
      ? format(new Date(dateDeparture as string), 'yyyy-MM-dd')
      : 'all';
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=manifeste-plane-${fileNameDate}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error("Erreur génération PDF:", error);
    res.status(500).json({ 
      error: "Erreur lors de la génération du PDF",
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});


app.get("/api/booking-helico-export", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, transactionType, currency, status, name } = req.query;

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

        // Filtre currency
    if (currency) {
      conditions += " AND b.currency = ? ";
      params.push(currency);
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
        b.currency,
        b.passenger_count,
        b.status,
        b.payment_method,
        MIN(p.first_name) AS first_name,
        MIN(p.last_name) AS last_name,
        u.name AS created_by_name,
        DATE(b.created_at) AS created_at
    FROM bookings b
    LEFT JOIN users u ON b.user_created_booking = u.id
    LEFT JOIN passengers p ON b.id = p.booking_id
    ${conditions}
    GROUP BY b.id
    ORDER BY b.created_at DESC
`, params);

    const rows = rowsUntyped as mysql.RowDataPacket[];

    // 🟩 Génération Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("TRANSACTIONS HELICO");
   // 1️⃣ Titre fusionné
    sheet.mergeCells('A1:M1');
    const headerRow = sheet.getRow(1);
    headerRow.getCell(1).value = "TROGON HELICO TRANSACTIONS";
    headerRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    headerRow.getCell(1).fill = { type: 'pattern',pattern: 'solid',fgColor: { argb: 'FF2E2F8C' }};
    headerRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 45;

     

    // 3️⃣ Définition des colonnes
    sheet.columns = [
      { key: "booking_reference" },
      { key: "payment_intent_id" },
      { key: "type_vol" },
      { key: "type_v" },
      { key: "first_name" },
      { key: "companyName" },
      { key: "contact_email" },
      { key: "total_price" },
 
      { key: "passenger_count" },
      { key: "status" },
      { key: "payment_method" },
      { key: "created_by_name" },
      { key: "created_at" }
    ];



    // 2️⃣ En-têtes
    const headers = [
      "Booking Reference",
      "Payment Ref",
      "Type",
      "Trajet",
      "Client",
      "Company Name",
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
  cell.alignment = { horizontal: 'center' };
});




    const columnColors = [
  'FFE3F2FD', // booking_reference - bleu clair
  'FFFCE4EC', // payment_intent_id - rose clair
  'FFE8F5E9', // type_vol - vert clair
  'FFFFFDE7', // type_v - jaune clair
  'FFF3E5F5', // passenger name - violet clair
  'FFE0F2F1', // company
  'FFFFEBEE', // email
  'FFE1F5FE', // total_price

  'FFFFF3E0', // passenger_count
  'FFE8EAF6', // status
  'FFF1F8E9', // payment_method
  'FFEDE7F6', // created_by
  'FFF5F5F5', // created_at
];



sheet.getColumn(8).numFmt = '#,##0.00 "USD"';

    // 4️⃣ Ajout des données
    rows.forEach((row) => {
      sheet.addRow([
        row.booking_reference,
        row.payment_intent_id,
        row.type_vol,
        row.type_v,
        `${row.first_name} ${row.last_name}`,
        row.companyName,
        row.contact_email,
        row.currency === "htg" ? Number(row.total_price) + " HTG" : Number(row.total_price) + " USD",
        row.passenger_count,
        row.status === "confirmed" ? "Paid" : row.status === "pending" ? "Unpaid" : "Cancelled",
        row.payment_method === "card" ? "Card" : row.payment_method === "cash" ? "Cash" : row.payment_method === "cheque" ? "Check" : row.payment_method === "virement" ? "Bank Transfer" : row.payment_method === "transfert" ? "Deposit" : "Contrat",
        row.created_by_name,
        row.created_at
      ]);
    });

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // ignorer le header si besoin

      row.eachCell((cell, colNumber) => {
        const color = columnColors[colNumber - 1];

        if (color) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: color },
          };
        }
      });
    });


    // 5️⃣ Auto-size colonnes
    sheet.columns.forEach((column) => {
      if (column && column.eachCell) {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const len = cell.value ? cell.value.toString().length : 10;
          if (len > maxLength) maxLength = len;
        });
        column.width = Math.min(Math.max(maxLength + 2, 12), 40);

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


app.get("/api/booking-charter-export", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, transactionType, currency, status, name } = req.query;

    let conditions = " WHERE b.typecharter IN ('helicopter', 'plane') ";
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

        // Filtre currency
    if (currency) {
      conditions += " AND b.currency = ? ";
      params.push(currency);
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
        b.typecharter,
        b.type_v,
        b.contact_email,
        b.total_price,
        b.currency,
        b.passenger_count,
        b.status,
        b.payment_method,
        MIN(p.first_name) AS first_name,
        MIN(p.last_name) AS last_name,
        u.name AS created_by_name,
        DATE(b.created_at) AS created_at
    FROM bookings b
    LEFT JOIN users u ON b.user_created_booking = u.id
    LEFT JOIN passengers p ON b.id = p.booking_id
    ${conditions}
    GROUP BY b.id
    ORDER BY b.created_at DESC
`, params);

    const rows = rowsUntyped as mysql.RowDataPacket[];

    // 🟩 Génération Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("TRANSACTIONS CHARTER");
   // 1️⃣ Titre fusionné
    sheet.mergeCells('A1:M1');
    const headerRow = sheet.getRow(1);
    headerRow.getCell(1).value = "TROGON CHARTER TRANSACTIONS";
    headerRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    headerRow.getCell(1).fill = { type: 'pattern',pattern: 'solid',fgColor: { argb: 'FF2E2F8C' }};
    headerRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 45;

     

    // 3️⃣ Définition des colonnes
    sheet.columns = [
      { key: "booking_reference" },
      { key: "payment_intent_id" },
      { key: "typecharter" },
      { key: "type_v" },
      { key: "first_name" },
      { key: "companyName" },
      { key: "contact_email" },
      { key: "total_price" },
      { key: "passenger_count" },
      { key: "status" },
      { key: "payment_method" },
      { key: "created_by_name" },
      { key: "created_at" }
    ];



    // 2️⃣ En-têtes
    const headers = [
      "Booking Reference",
      "Payment Ref",
      "Type",
      "Trajet",
      "Client",
      "Company Name",
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
  cell.alignment = { horizontal: 'center' };
});




    const columnColors = [
  'FFE3F2FD', // booking_reference - bleu clair
  'FFFCE4EC', // payment_intent_id - rose clair
  'FFE8F5E9', // type_vol - vert clair
  'FFFFFDE7', // type_v - jaune clair
  'FFF3E5F5', // passenger name - violet clair
  'FFE0F2F1', // company
  'FFFFEBEE', // email
  'FFE1F5FE', // total_price

  'FFFFF3E0', // passenger_count
  'FFE8EAF6', // status
  'FFF1F8E9', // payment_method
  'FFEDE7F6', // created_by
  'FFF5F5F5', // created_at
];



sheet.getColumn(8).numFmt = '#,##0.00 "USD"';

    // 4️⃣ Ajout des données
    rows.forEach((row) => {
      sheet.addRow([
        row.booking_reference,
        row.payment_intent_id,
        row.typecharter,
        row.type_v,
        `${row.first_name} ${row.last_name}`,
        row.companyName,
        row.contact_email,
        row.currency === "htg" ? Number(row.total_price) + " HTG" : Number(row.total_price) + " USD",
        row.passenger_count,
        row.status === "confirmed" ? "Paid" : row.status === "pending" ? "Unpaid" : "Cancelled",
        row.payment_method === "card" ? "Card" : row.payment_method === "cash" ? "Cash" : row.payment_method === "cheque" ? "Check" : row.payment_method === "virement" ? "Bank Transfer" : row.payment_method === "transfert" ? "Deposit" : "Contrat",
        row.created_by_name,
        row.created_at
      ]);
    });

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // ignorer le header si besoin

      row.eachCell((cell, colNumber) => {
        const color = columnColors[colNumber - 1];

        if (color) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: color },
          };
        }
      });
    });


    // 5️⃣ Auto-size colonnes
    sheet.columns.forEach((column) => {
      if (column && column.eachCell) {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const len = cell.value ? cell.value.toString().length : 10;
          if (len > maxLength) maxLength = len;
        });
        column.width = Math.min(Math.max(maxLength + 2, 12), 40);

      }
    });



    // 6️⃣ Headers HTTP
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Trogon Transactions Charter.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Erreur Excel:", error);
    res.status(500).json({ error: "Erreur export Excel" });
  }
});


app.get("/api/booking-plane-export", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, transactionType, currency, status, name } = req.query;

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
          // Filtre currency
    if (currency) {
      conditions += " AND b.currency = ? ";
      params.push(currency);
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
        b.currency,
        b.passenger_count,
        b.status,
        b.payment_method,
        MIN(p.first_name) AS first_name,
        MIN(p.last_name) AS last_name,
        u.name AS created_by_name,
        DATE(b.created_at) AS created_at
    FROM bookings b
    LEFT JOIN users u ON b.user_created_booking = u.id
    LEFT JOIN passengers p ON b.id = p.booking_id
    ${conditions}
    GROUP BY b.id
    ORDER BY b.created_at DESC
`, params);


    const rows = rowsUntyped as mysql.RowDataPacket[];

    // 🟩 Génération Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("TRANSACTIONS AVION");

    // 1️⃣ Titre fusionné
    sheet.mergeCells('A1:M1');
    const headerRow = sheet.getRow(1);
    headerRow.getCell(1).value = "TROGON AVION TRANSACTIONS";
    headerRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    headerRow.getCell(1).fill = { type: 'pattern',pattern: 'solid',fgColor: { argb: 'FF2E2F8C' }};
    headerRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 45;

     

    // 3️⃣ Définition des colonnes
    sheet.columns = [
      { key: "booking_reference" },
      { key: "payment_intent_id" },
      { key: "type_vol" },
      { key: "type_v" },
      { key: "first_name" },
      { key: "companyName" },
      { key: "contact_email" },
      { key: "total_price" },
     
      { key: "passenger_count" },
      { key: "status" },
      { key: "payment_method" },
      { key: "created_by_name" },
      { key: "created_at" }
    ];



    // 2️⃣ En-têtes
    const headers = [
      "Booking Reference",
      "Payment Ref",
      "Type",
      "Trajet",
      "Client",
      "Company Name",
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
  cell.alignment = { horizontal: 'center' };
});




    const columnColors = [
  'FFE3F2FD', // booking_reference - bleu clair
  'FFFCE4EC', // payment_intent_id - rose clair
  'FFE8F5E9', // type_vol - vert clair
  'FFFFFDE7', // type_v - jaune clair
  'FFF3E5F5', // passenger name - violet clair
  'FFE0F2F1', // company
  'FFFFEBEE', // email
  'FFE1F5FE', // total_price
 
  'FFFFF3E0', // passenger_count
  'FFE8EAF6', // status
  'FFF1F8E9', // payment_method
  'FFEDE7F6', // created_by
  'FFF5F5F5', // created_at
];



sheet.getColumn(8).numFmt = '#,##0.00 "USD"';

    // 4️⃣ Ajout des données
    rows.forEach((row) => {
      sheet.addRow([
        row.booking_reference,
        row.payment_intent_id,
        row.type_vol,
        row.type_v,
        `${row.first_name} ${row.last_name}`,
        row.companyName,
        row.contact_email,
         row.currency === "htg" ? Number(row.total_price) + " HTG" : Number(row.total_price) + " USD",
        row.currency,
        row.passenger_count,
        row.status === "confirmed" ? "Paid" : row.status === "pending" ? "Unpaid" : "Cancelled",
        row.payment_method === "card" ? "Card" : row.payment_method === "cash" ? "Cash" : row.payment_method === "cheque" ? "Check" : row.payment_method === "virement" ? "Bank Transfer" : row.payment_method === "transfert" ? "Deposit" : "Contrat",
        row.created_by_name,
        row.created_at
      ]);
    });

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // ignorer le header si besoin

      row.eachCell((cell, colNumber) => {
        const color = columnColors[colNumber - 1];

        if (color) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: color },
          };
        }
      });
    });


    // 5️⃣ Auto-size colonnes
    sheet.columns.forEach((column) => {
      if (column && column.eachCell) {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const len = cell.value ? cell.value.toString().length : 10;
          if (len > maxLength) maxLength = len;
        });
        column.width = Math.min(Math.max(maxLength + 2, 12), 40);

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

      await connection.query(
      `UPDATE bookings SET total_price = ? WHERE booking_reference = ?`,
      [0, reference]
    );

      await connection.query(
      `UPDATE payments SET amount = ? WHERE booking_id = ?`,
      [0, booking.id]
    );

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
          date_of_birth, idClient, idTypeClient, gender, title, address, type,
          type_vol, type_v, country, nationality,
          phone, email, nom_urgence, email_urgence, tel_urgence, selectedSeat, created_at, updated_at
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
      currency: booking.currency,
      payment_method: booking.payment_method,
      created_at: new Date(booking.created_at).toISOString(),
      passenger_count: booking.passenger_count,
      contact_email: booking.contact_email,
      type_vol: booking.type_vol,
      typecharter: booking.typecharter,
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
    "typecharter",
    "charter",
    "airline",
    "departure_location_id",
    "arrival_location_id",
    "departure_time",
    "arrival_time",
    "price",
    "seats_available",
    "total_seat",
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


// ============================================================
// =================== MODULES MANQUANTS =====================
// ============================================================

// Initialisation des tables manquantes au démarrage
async function initMissingTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        user_name VARCHAR(100),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id VARCHAR(100),
        details TEXT,
        ip_address VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_created_at (created_at),
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_group VARCHAR(50) DEFAULT 'general',
        description VARCHAR(255),
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await pool.query(`
      INSERT IGNORE INTO app_settings (setting_key, setting_value, setting_group, description) VALUES
      ('company_name', 'Trogon Airways', 'general', 'Nom de la compagnie'),
      ('company_email', 'contact@trogon.com', 'general', 'Email de contact'),
      ('company_phone', '+509 1234-5678', 'general', 'Téléphone de contact'),
      ('company_address', 'Port-au-Prince, Haiti', 'general', 'Adresse'),
      ('default_currency', 'USD', 'finance', 'Devise par défaut'),
      ('tax_rate', '10', 'finance', 'Taux de taxe (%)'),
      ('booking_fee', '5', 'finance', 'Frais de réservation (%)'),
      ('max_seats_per_booking', '9', 'booking', 'Nombre max de passagers par réservation'),
      ('cancellation_deadline_hours', '24', 'booking', 'Délai annulation avant vol (heures)'),
      ('refund_policy_days', '7', 'booking', 'Délai max remboursement (jours)')
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS promo_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        discount_type ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
        discount_value DECIMAL(10,2) NOT NULL,
        min_amount DECIMAL(10,2) DEFAULT 0,
        max_uses INT DEFAULT NULL,
        used_count INT DEFAULT 0,
        valid_from DATE,
        valid_until DATE,
        applies_to ENUM('all','plane','helicopter','charter') DEFAULT 'all',
        is_active TINYINT(1) DEFAULT 1,
        description VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Tables manquantes initialisées');
  } catch (err) {
    console.error('❌ Erreur init tables:', err);
  }
}
initMissingTables();

// Middleware pour logger les actions dans audit_logs
async function logAudit(userId: number | null, userName: string, action: string, entityType: string, entityId: string | number | null, details: string, ip: string) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, details, ip_address) VALUES (?,?,?,?,?,?,?)`,
      [userId, userName, action, entityType, entityId ? String(entityId) : null, details, ip]
    );
  } catch (e) { /* non bloquant */ }
}

// ============================================================
// 1. GESTION DES DESTINATIONS / AÉROPORTS (CRUD complet)
// ============================================================

app.post("/api/locations", authMiddleware, adminOnly, async (req: any, res: Response) => {
  const { name, code, city, country } = req.body;
  if (!name || !code) return res.status(400).json({ error: "name et code sont requis" });
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO locations (name, code, city, country) VALUES (?,?,?,?)",
      [name, code.toUpperCase(), city || null, country || null]
    );
    await logAudit(req.user.id, req.user.name || req.user.username, 'CREATE_LOCATION', 'location', result.insertId, `Créé: ${name} (${code})`, req.ip);
    res.status(201).json({ success: true, id: result.insertId, message: "Destination créée" });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: "Ce code de destination existe déjà" });
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

app.put("/api/locations/:id", authMiddleware, adminOnly, async (req: any, res: Response) => {
  const { id } = req.params;
  const { name, code, city, country } = req.body;
  try {
    const [result] = await pool.execute<OkPacket>(
      "UPDATE locations SET name=?, code=?, city=?, country=? WHERE id=?",
      [name, code?.toUpperCase(), city, country, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Destination non trouvée" });
    await logAudit(req.user.id, req.user.name || req.user.username, 'UPDATE_LOCATION', 'location', id, `Modifié: ${name}`, req.ip);
    res.json({ success: true, message: "Destination mise à jour" });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

app.delete("/api/locations/:id", authMiddleware, adminOnly, async (req: any, res: Response) => {
  const { id } = req.params;
  try {
    const [loc] = await pool.query<mysql.RowDataPacket[]>("SELECT * FROM locations WHERE id=?", [id]);
    if (!loc.length) return res.status(404).json({ error: "Destination non trouvée" });
    const [result] = await pool.execute<OkPacket>("DELETE FROM locations WHERE id=?", [id]);
    await logAudit(req.user.id, req.user.name || req.user.username, 'DELETE_LOCATION', 'location', id, `Supprimé: ${loc[0].name}`, req.ip);
    res.json({ success: true, message: "Destination supprimée" });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// ============================================================
// 2. PROFIL UTILISATEUR (mise à jour)
// ============================================================

app.put("/api/profile", authMiddleware, async (req: any, res: Response) => {
  const userId = req.user.id;
  const { name, phone, current_password, new_password } = req.body;
  try {
    const [rows] = await pool.query<User[]>("SELECT * FROM users WHERE id=?", [userId]);
    if (!rows.length) return res.status(404).json({ error: "Utilisateur non trouvé" });
    const user = rows[0];
    let updateFields = "name=?, phone=?";
    let values: any[] = [name, phone];
    if (new_password) {
      if (!current_password) return res.status(400).json({ error: "Mot de passe actuel requis" });
      const valid = await bcrypt.compare(current_password, user.password_hash);
      if (!valid) return res.status(400).json({ error: "Mot de passe actuel incorrect" });
      const hashed = await bcrypt.hash(new_password, 10);
      updateFields += ", password_hash=?";
      values.push(hashed);
    }
    values.push(userId);
    await pool.execute(`UPDATE users SET ${updateFields} WHERE id=?`, values);
    await logAudit(userId, name, 'UPDATE_PROFILE', 'user', userId, 'Profil mis à jour', req.ip);
    res.json({ success: true, message: "Profil mis à jour" });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// ============================================================
// 3. CRÉATION MANUELLE DE RÉSERVATION PAR UN AGENT
// ============================================================

// ============================================================
// HELPER — build e-ticket HTML email (bilingual EN + FR)
// ============================================================
async function buildBookingConfirmationEmail(bookingId: number): Promise<string> {
  const [bookingRows]: any = await pool.query(
    `SELECT b.*, p2.payment_method AS pay_method
     FROM bookings b
     LEFT JOIN payments p2 ON p2.booking_id = b.id
     WHERE b.id = ? LIMIT 1`, [bookingId]
  );
  if (!bookingRows.length) throw new Error("Réservation introuvable pour email");
  const booking = bookingRows[0];

  const [passengerRows]: any = await pool.query(
    "SELECT * FROM passengers WHERE booking_id = ?", [bookingId]
  );
  const passengers: any[] = passengerRows;

  const flightIds = [booking.flight_id, booking.return_flight_id].filter(Boolean);
  let outboundFlight: any = null;
  let returnFlight: any = null;
  if (flightIds.length > 0) {
    const placeholders = flightIds.map(() => '?').join(',');
    const [flightsResult]: any = await pool.query(
      `SELECT f.*, dep.name AS dep_name, dep.code AS dep_code, arr.name AS arr_name, arr.code AS arr_code
       FROM flights f
       JOIN locations dep ON dep.id = f.departure_location_id
       JOIN locations arr ON arr.id = f.arrival_location_id
       WHERE f.id IN (${placeholders})`, flightIds
    );
    outboundFlight = flightsResult.find((f: any) => f.id === booking.flight_id) || null;
    returnFlight   = flightsResult.find((f: any) => f.id === booking.return_flight_id) || null;
  }

  const fmt = (d: string | null, f: string): string => {
    if (!d) return 'N/A';
    try { return format(parseISO(d), f); } catch { return 'N/A'; }
  };

  const qr = `https://barcode.tec-it.com/barcode.ashx?data=${booking.booking_reference}&code=Code128&dpi=96`;
  const payLabel = (m: string) =>
    m === 'cash' ? 'Cash' : m === 'card' ? 'Credit/Debit Card' : m === 'cheque' ? 'Bank Check'
    : m === 'virement' ? 'Bank Transfer' : m === 'transfert' ? 'Deposit' : m || 'N/A';
  const volLabel = booking.type_vol === 'helicopter' ? 'Helicopter' : 'Airplane';
  const tripLabel = booking.return_flight_id ? 'Round Trip' : 'One Way';
  const pNames = passengers.map((p: any) => `${p.first_name} ${p.last_name}`).join(', ');

  const outboundBlock = (lang: 'en'|'fr') => outboundFlight ? `
    <div style="padding:12px;background:#f0f4ff;border-radius:6px;margin-bottom:8px;">
      <strong style="color:#1A237E;">${lang==='en'?'Outbound Flight':'Vol Aller'}</strong><br/>
      <b>${lang==='en'?'From':'De'}:</b> ${outboundFlight.dep_name} (${outboundFlight.dep_code})<br/>
      <b>${lang==='en'?'To':'À'}:</b> ${outboundFlight.arr_name} (${outboundFlight.arr_code})<br/>
      <b>${lang==='en'?'Date':'Date'}:</b> ${fmt(outboundFlight.departure_time,'EEE dd MMM yyyy')}<br/>
      <b>${lang==='en'?'Departure':'Départ'}:</b> ${fmt(outboundFlight.departure_time,'HH:mm')}<br/>
      <b>${lang==='en'?'Arrival':'Arrivée'}:</b> ${fmt(outboundFlight.arrival_time,'HH:mm')}<br/>
      <b>${lang==='en'?'Flight #':'Vol #'}:</b> ${outboundFlight.flight_number}
    </div>` : '';

  const returnBlock = (lang: 'en'|'fr') => returnFlight ? `
    <div style="padding:12px;background:#f0f4ff;border-radius:6px;margin-bottom:8px;">
      <strong style="color:#1A237E;">${lang==='en'?'Return Flight':'Vol Retour'}</strong><br/>
      <b>${lang==='en'?'From':'De'}:</b> ${returnFlight.dep_name} (${returnFlight.dep_code})<br/>
      <b>${lang==='en'?'To':'À'}:</b> ${returnFlight.arr_name} (${returnFlight.arr_code})<br/>
      <b>${lang==='en'?'Date':'Date'}:</b> ${fmt(returnFlight.departure_time,'EEE dd MMM yyyy')}<br/>
      <b>${lang==='en'?'Departure':'Départ'}:</b> ${fmt(returnFlight.departure_time,'HH:mm')}<br/>
      <b>${lang==='en'?'Arrival':'Arrivée'}:</b> ${fmt(returnFlight.arrival_time,'HH:mm')}<br/>
      <b>${lang==='en'?'Flight #':'Vol #'}:</b> ${returnFlight.flight_number}
    </div>` : '';

  const passengerBlock = (lang: 'en'|'fr') => passengers.map((p: any) => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">${p.first_name} ${p.last_name}</td>
      <td style="padding:8px;border:1px solid #ddd;">${p.nationality || '-'}</td>
      <td style="padding:8px;border:1px solid #ddd;">${p.idClient || '-'}</td>
      <td style="padding:8px;border:1px solid #ddd;">${p.selectedSeat || '-'}</td>
    </tr>`).join('');

  const card = (lang: 'en'|'fr') => `
  <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
    <div style="background:#1A237E;color:white;padding:24px;text-align:center;">
      <img src="https://trogonairways.com/logo-trogonpng.png" alt="Trogon Airways" style="height:55px;vertical-align:middle;"/>
      <p style="margin:8px 0 0;font-size:1.2em;font-weight:bold;">
        ${lang==='en'?'Your Booking is Confirmed':'Votre Réservation est Confirmée'}
      </p>
    </div>
    <div style="padding:20px;">
      <p>${lang==='en'?`Dear ${pNames},`:`Cher(e) ${pNames},`}</p>
      <p>${lang==='en'
        ?'Thank you for choosing Trogon Airways. Please find your e-ticket below.'
        :'Merci de choisir Trogon Airways. Veuillez trouver votre e-billet ci-dessous.'}</p>

      <div style="background:#f9f9f9;border:2px dashed #1A237E;border-radius:8px;padding:16px;margin:16px 0;">
        <table width="100%" style="border-collapse:collapse;margin-bottom:12px;">
          <tr>
            <td><strong style="color:#1A237E;">${lang==='en'?'Booking Ref':'Référence'}:</strong> ${booking.booking_reference}</td>
            <td style="text-align:right;"><img src="${qr}" alt="barcode" style="height:45px;"/></td>
          </tr>
        </table>

        <table width="100%" style="border-collapse:collapse;margin-bottom:8px;">
          <tr>
            <td><b>${lang==='en'?'Trip Type':'Type'}:</b> ${tripLabel}</td>
            <td><b>${lang==='en'?'Flight Type':'Type Vol'}:</b> ${volLabel}</td>
            <td><b>${lang==='en'?'Payment':'Paiement'}:</b> ${payLabel(booking.payment_method || booking.pay_method)}</td>
          </tr>
        </table>

        ${outboundBlock(lang)}
        ${returnBlock(lang)}

        <table width="100%" style="border-collapse:collapse;margin:12px 0;">
          <thead>
            <tr style="background:#1A237E;color:white;">
              <th style="padding:8px;text-align:left;">${lang==='en'?'Passenger':'Passager'}</th>
              <th style="padding:8px;text-align:left;">${lang==='en'?'Nationality':'Nationalité'}</th>
              <th style="padding:8px;text-align:left;">${lang==='en'?'Passport/ID':'Passeport/ID'}</th>
              <th style="padding:8px;text-align:left;">${lang==='en'?'Seat':'Siège'}</th>
            </tr>
          </thead>
          <tbody>${passengerBlock(lang)}</tbody>
        </table>

        <div style="background:#1A237E;color:white;padding:10px;border-radius:6px;text-align:right;">
          <strong>${lang==='en'?'Total':'Total'}:</strong>
          ${booking.total_price} ${(booking.currency||'USD').toUpperCase()}
        </div>
      </div>

      <div style="font-size:0.85em;color:#555;margin-top:16px;padding:12px;background:#fffde7;border-left:4px solid #f59e0b;border-radius:4px;">
        <p><strong>${lang==='en'?'Important':'Important'}:</strong>
          ${lang==='en'
            ?'Please arrive at the airport at least 1 hour before departure. Valid ID required at check-in.'
            :'Veuillez vous présenter à l&apos;aéroport au moins 1 heure avant le départ. Pièce d&apos;identité valide requise.'}</p>
        <p><strong>${lang==='en'?'Baggage':'Bagages'}:</strong>
          ${lang==='en'
            ?'Max 20 lb (helicopter) / 30 lb (plane). Carry-on: 35×55×25 cm.'
            :'Max 20 lb (hélicoptère) / 30 lb (avion). Bagage cabine: 35×55×25 cm.'}</p>
        <p>${lang==='en'
          ?'Trogon Airways is not responsible for delays or cancellations due to circumstances beyond its control.'
          :'Trogon Airways décline toute responsabilité pour les retards ou annulations dus à des circonstances indépendantes de sa volonté.'}</p>
        <p>${lang==='en'?'Sincerely,':'Cordialement,'}<br/><em>The Trogon Airways Team / L&apos;équipe Trogon Airways</em></p>
      </div>
    </div>
  </div>`;

  return `${card('en')}<hr style="margin:40px 0;border:1px solid #ddd;"/>${card('fr')}`;
}

// ============================================================
// RÉSERVATION MANUELLE — création (statut : en attente)
// ============================================================
app.post("/api/manual-booking", authMiddleware, async (req: any, res: Response) => {
  const connection = await pool.getConnection();
  const agentId = req.user.id;
  const agentName = req.user.name || req.user.username;
  try {
    await connection.beginTransaction();

    const { flightId, passengers, contactInfo, totalPrice, currency, paymentMethod, notes, flight_type, returnFlightNumber } = req.body;
    if (!flightId || !passengers?.length || !contactInfo || !totalPrice) {
      await connection.rollback();
      return res.status(400).json({ error: "Champs requis manquants" });
    }

    // ── 1. Vérifier le vol aller avec verrou
    const [flightRows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT * FROM flights WHERE id=? FOR UPDATE", [flightId]
    );
    if (!flightRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: "Vol non trouvé" });
    }
    const flight = flightRows[0];

    // ── 2. Vérifier disponibilité des sièges (vol aller)
    if (flight.seats_available < passengers.length) {
      await connection.rollback();
      return res.status(409).json({
        error: "Pas assez de sièges disponibles",
        details: `Sièges disponibles: ${flight.seats_available}, demandés: ${passengers.length}`,
        seatsAvailable: flight.seats_available
      });
    }

    // ── 3. Résoudre le vol retour si fourni
    let returnFlightId: number | null = null;
    if (returnFlightNumber) {
      const [retRows] = await connection.query<mysql.RowDataPacket[]>(
        "SELECT * FROM flights WHERE flight_number=? FOR UPDATE", [returnFlightNumber.toUpperCase().trim()]
      );
      if (!retRows.length) {
        await connection.rollback();
        return res.status(404).json({ error: `Vol retour introuvable: ${returnFlightNumber}` });
      }
      const retFlight = retRows[0];
      if (retFlight.seats_available < passengers.length) {
        await connection.rollback();
        return res.status(409).json({
          error: "Pas assez de sièges sur le vol retour",
          details: `Sièges disponibles: ${retFlight.seats_available}, demandés: ${passengers.length}`,
          seatsAvailable: retFlight.seats_available
        });
      }
      returnFlightId = retFlight.id;
    }

    // ── 4. Créer la réservation (pending — paiement non encore reçu)
    const bookingRef = `MANUAL-${Math.floor(100000 + Math.random() * 900000)}`;
    const isRoundTrip = !!returnFlightId;
    const [bookingResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO bookings
         (booking_reference, flight_id, return_flight_id, total_price, currency, status,
          passenger_count, contact_email, contact_phone, payment_method, type_vol,
          user_created_booking, adminNotes, type_v)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        bookingRef, flightId, returnFlightId, totalPrice,
        currency || 'USD', 'pending',
        passengers.length, contactInfo.email, contactInfo.phone,
        paymentMethod || 'cash', flight_type || flight.type,
        agentId, notes || '',
        isRoundTrip ? 'roundtrip' : 'onway'
      ]
    );
    const bookingId = bookingResult.insertId;

    // ── 5. Enregistrer les passagers
    for (const p of passengers) {
      await connection.execute(
        `INSERT INTO passengers
           (booking_id, first_name, middle_name, last_name, date_of_birth, idClient,
            idTypeClient, nationality, selectedSeat, phone, email, address, country,
            type_vol, type_v, nom_urgence, email_urgence, tel_urgence)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          bookingId,
          p.first_name, p.middleName || null, p.last_name,
          p.date_of_birth || null, p.passport_number || null,
          p.idTypeClient || 'passport', p.nationality || null,
          p.seat_number || null, p.phone || contactInfo.phone,
          p.email || contactInfo.email, p.address || null,
          p.country || null, flight_type || flight.type,
          isRoundTrip ? 'roundtrip' : 'onway',
          p.nom_urgence || null, p.email_urgence || null, p.tel_urgence || null
        ]
      );
    }

    // ── 6. Enregistrer le paiement (pending)
    await connection.execute<ResultSetHeader>(
      `INSERT INTO payments (booking_id, amount, currency, payment_method, payment_status, transaction_reference)
       VALUES (?,?,?,?,?,?)`,
      [bookingId, totalPrice, currency || 'USD', paymentMethod || 'cash', 'pending', `MANUAL-${Date.now()}`]
    );

    // ── 7. Notification
    try {
      await connection.query(
        `INSERT INTO notifications (type, message, booking_id, seen, created_at) VALUES (?,?,?,?,?)`,
        ['pending', `Réservation manuelle en attente: ${bookingRef} (${passengers.length} pax)`, bookingId, false, new Date()]
      );
    } catch (_) {}

    await connection.commit();
    await logAudit(agentId, agentName, 'MANUAL_BOOKING', 'booking', bookingRef,
      `Réservation manuelle créée: ${bookingRef} — ${passengers.length} pax — en attente paiement`, req.ip);

    res.status(201).json({
      success: true,
      booking_reference: bookingRef,
      booking_id: bookingId,
      flight_type: flight_type || flight.type,
      seats_available: flight.seats_available,
      message: "Réservation créée — en attente de confirmation du paiement"
    });

  } catch (err: any) {
    await connection.rollback();
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  } finally {
    connection.release();
  }
});

// ============================================================
// CONFIRMER LE PAIEMENT — pending → confirmed + sièges + email
// ============================================================
app.put("/api/bookings/:id/confirm-payment", authMiddleware, async (req: any, res: Response) => {
  const { id } = req.params;
  const agentId = req.user.id;
  const agentName = req.user.name || req.user.username;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // ── 1. Charger la réservation
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT * FROM bookings WHERE id=?", [id]
    );
    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ error: "Réservation introuvable" });
    }
    const booking = rows[0];

    if (booking.status === 'confirmed') {
      await connection.rollback();
      return res.status(409).json({ error: "Cette réservation est déjà confirmée" });
    }
    if (booking.status === 'cancelled') {
      await connection.rollback();
      return res.status(409).json({ error: "Impossible de confirmer une réservation annulée" });
    }

    const passengerCount = booking.passenger_count || 1;

    // ── 2. Vérifier et verrouiller le vol aller
    const [outboundRows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT id, flight_number, seats_available, total_seat FROM flights WHERE id=? FOR UPDATE",
      [booking.flight_id]
    );
    if (!outboundRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: "Vol aller introuvable" });
    }
    const outboundFlight = outboundRows[0];

    if (outboundFlight.seats_available < passengerCount) {
      await connection.rollback();
      return res.status(409).json({
        error: "Plus assez de sièges disponibles sur le vol aller",
        details: `Sièges disponibles: ${outboundFlight.seats_available}, passagers: ${passengerCount}`,
        seatsAvailable: outboundFlight.seats_available,
        flightNumber: outboundFlight.flight_number
      });
    }

    // ── 3. Vérifier et verrouiller le vol retour si applicable
    let returnFlightRow: any = null;
    if (booking.return_flight_id) {
      const [retRows] = await connection.query<mysql.RowDataPacket[]>(
        "SELECT id, flight_number, seats_available, total_seat FROM flights WHERE id=? FOR UPDATE",
        [booking.return_flight_id]
      );
      if (retRows.length) {
        returnFlightRow = retRows[0];
        if (returnFlightRow.seats_available < passengerCount) {
          await connection.rollback();
          return res.status(409).json({
            error: "Plus assez de sièges disponibles sur le vol retour",
            details: `Sièges disponibles: ${returnFlightRow.seats_available}, passagers: ${passengerCount}`,
            seatsAvailable: returnFlightRow.seats_available,
            flightNumber: returnFlightRow.flight_number
          });
        }
      }
    }

    // ── 4. Décrémenter les sièges
    await connection.execute(
      "UPDATE flights SET seats_available = seats_available - ? WHERE id = ?",
      [passengerCount, booking.flight_id]
    );
    if (booking.return_flight_id && returnFlightRow) {
      await connection.execute(
        "UPDATE flights SET seats_available = seats_available - ? WHERE id = ?",
        [passengerCount, booking.return_flight_id]
      );
    }

    // ── 5. Confirmer la réservation et le paiement
    const { paymentReference } = req.body;
    await connection.execute(
      "UPDATE bookings SET status='confirmed' WHERE id=?", [id]
    );
    await connection.execute(
      `UPDATE payments SET payment_status='confirmed'${paymentReference ? ", transaction_reference=?" : ""} WHERE booking_id=?`,
      paymentReference ? [paymentReference, id] : [id]
    );

    // ── 6. Notification
    try {
      await connection.query(
        `INSERT INTO notifications (type, message, booking_id, seen, created_at) VALUES (?,?,?,?,?)`,
        ['confirmed', `Réservation confirmée: ${booking.booking_reference} (${passengerCount} pax)`, booking.id, false, new Date()]
      );
    } catch (_) {}

    await connection.commit();

    // ── 7. Envoyer l'email de confirmation (hors transaction)
    const emailResults: any[] = [];
    try {
      const emailHtml = await buildBookingConfirmationEmail(Number(id));
      const recipients = new Set<string>();
      if (booking.contact_email) recipients.add(booking.contact_email);

      // Ajouter les emails des passagers
      const [paxRows] = await pool.query<mysql.RowDataPacket[]>(
        "SELECT email FROM passengers WHERE booking_id=?", [id]
      );
      paxRows.forEach((p: any) => { if (p.email) recipients.add(p.email); });

      for (const email of recipients) {
        const result = await sendEmail(
          email,
          `Trogon Airways — Booking Confirmed / Réservation Confirmée — ${booking.booking_reference}`,
          emailHtml
        );
        emailResults.push({ email, success: result.success, error: result.error });
      }
    } catch (emailErr: any) {
      console.error("⚠️ Erreur envoi email confirmation:", emailErr.message);
    }

    await logAudit(agentId, agentName, 'CONFIRM_PAYMENT', 'booking', booking.booking_reference,
      `Paiement confirmé: ${booking.booking_reference} — ${passengerCount} pax — sièges décrémentés`, req.ip);

    res.json({
      success: true,
      message: "Paiement confirmé avec succès — e-billet envoyé",
      booking_reference: booking.booking_reference,
      seats_decremented: passengerCount,
      emails_sent: emailResults.filter(e => e.success).length,
      email_results: emailResults
    });

  } catch (err: any) {
    await connection.rollback();
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  } finally {
    connection.release();
  }
});

// ============================================================
// ANNULER UNE RÉSERVATION EN ATTENTE
// ============================================================
app.put("/api/bookings/:id/cancel-pending", authMiddleware, async (req: any, res: Response) => {
  const { id } = req.params;
  const { cancelReason } = req.body;
  const agentId = req.user.id;
  const agentName = req.user.name || req.user.username;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT * FROM bookings WHERE id=?", [id]
    );
    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ error: "Réservation introuvable" });
    }
    const booking = rows[0];

    if (booking.status === "confirmed") {
      await connection.rollback();
      return res.status(409).json({ error: "Impossible d\'annuler une réservation déjà confirmée. Utilisez le remboursement." });
    }
    if (booking.status === "cancelled") {
      await connection.rollback();
      return res.status(409).json({ error: "Cette réservation est déjà annulée." });
    }

    // Mettre à jour le statut
    await connection.execute(
      "UPDATE bookings SET status='cancelled', adminNotes=CONCAT(IFNULL(adminNotes,''), ?) WHERE id=?",
      [cancelReason ? `\n[ANNULÉ] ${cancelReason}` : "\n[ANNULÉ par agent]", id]
    );
    await connection.execute(
      "UPDATE payments SET payment_status='cancelled' WHERE booking_id=?", [id]
    );

    // Libérer les sièges si la réservation était déjà confirmée (cas edge)
    // Pour les réservations pending, les sièges n\'ont pas été déduits donc rien à libérer

    // Notification
    try {
      await connection.query(
        `INSERT INTO notifications (type, message, booking_id, seen, created_at) VALUES (?,?,?,?,?)`,
        ["cancelled", `Réservation annulée: ${booking.booking_reference}`, booking.id, false, new Date()]
      );
    } catch (_) {}

    await connection.commit();

    // Envoyer email d\'annulation au client
    try {
      const [paxRows] = await pool.query<mysql.RowDataPacket[]>(
        "SELECT email, first_name, last_name FROM passengers WHERE booking_id=?", [id]
      );
      const recipients = new Set<string>();
      if (booking.contact_email) recipients.add(booking.contact_email);
      paxRows.forEach((p: any) => { if (p.email) recipients.add(p.email); });
      const pax0 = paxRows[0] as any;
      const cancelHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
        <div style="background:#7f1d1d;color:white;padding:24px;text-align:center;">
          <img src="https://trogonairways.com/logo-trogonpng.png" alt="Trogon Airways" style="height:50px;"/>
          <p style="margin:8px 0 0;font-size:1.1em;font-weight:bold;">Réservation Annulée / Booking Cancelled</p>
        </div>
        <div style="padding:24px;">
          <p>Cher(e) ${pax0 ? pax0.first_name + " " + pax0.last_name : "Client"},</p>
          <p>Votre réservation <strong>${booking.booking_reference}</strong> a été annulée.</p>
          ${cancelReason ? `<p><strong>Motif:</strong> ${cancelReason}</p>` : ""}
          <p>Pour toute question, contactez-nous:<br/>
            📞 +509 334104004<br/>
            ✉️ info@trogonairways.com</p>
          <hr style="border:1px solid #eee;margin:16px 0;"/>
          <p><em>Dear ${pax0 ? pax0.first_name + " " + pax0.last_name : "Customer"}, your booking <strong>${booking.booking_reference}</strong> has been cancelled.</em></p>
          <p style="color:#777;font-size:0.9em;">Trogon Airways — The Trogon Airways Team</p>
        </div>
      </div>`;
      for (const email of recipients) {
        await sendEmail(email, `Trogon Airways — Réservation Annulée / Cancelled — ${booking.booking_reference}`, cancelHtml);
      }
    } catch (emailErr: any) {
      console.error("⚠️ Email annulation:", emailErr.message);
    }

    await logAudit(agentId, agentName, "CANCEL_BOOKING", "booking", booking.booking_reference,
      `Réservation annulée: ${booking.booking_reference}${cancelReason ? " — " + cancelReason : ""}`, req.ip);

    res.json({ success: true, message: "Réservation annulée avec succès", booking_reference: booking.booking_reference });
  } catch (err: any) {
    await connection.rollback();
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  } finally {
    connection.release();
  }
});

// ============================================================
// REÇU DE PAIEMENT — HTML imprimable
// ============================================================
app.get("/api/bookings/:id/payment-receipt", async (req: any, res: Response) => {
  // Accept token via query param for direct browser window.open() calls
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  // Inline auth check
  const jwt = require("jsonwebtoken");
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).send("<h3>Non autorisé</h3>");
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key_trogon_airways");
    req.user = decoded;
  } catch {
    return res.status(401).send("<h3>Token invalide</h3>");
  }
  const { id } = req.params;
  try {
    const [bookingRows]: any = await pool.query(
      `SELECT b.*, p2.payment_status, p2.transaction_reference AS payment_ref, p2.payment_method AS pay_method
       FROM bookings b
       LEFT JOIN payments p2 ON p2.booking_id = b.id
       WHERE b.id = ? LIMIT 1`, [id]
    );
    if (!bookingRows.length) return res.status(404).json({ error: "Réservation introuvable" });
    const b = bookingRows[0];

    const [paxRows]: any = await pool.query(
      "SELECT first_name, last_name, nationality, idClient FROM passengers WHERE booking_id=? ORDER BY id ASC", [id]
    );

    const [flightRows]: any = await pool.query(
      `SELECT f.flight_number, f.departure_time, f.arrival_time,
              dep.name AS dep_name, dep.code AS dep_code,
              arr.name AS arr_name, arr.code AS arr_code
       FROM flights f
       JOIN locations dep ON dep.id = f.departure_location_id
       JOIN locations arr ON arr.id = f.arrival_location_id
       WHERE f.id = ? LIMIT 1`, [b.flight_id]
    );
    const flight = flightRows[0];

    const payLabel = (m: string) =>
      m === "cash" ? "Espèces / Cash" :
      m === "card" ? "Carte de crédit / Credit Card" :
      m === "cheque" ? "Chèque / Bank Check" :
      m === "virement" ? "Virement bancaire / Bank Transfer" :
      m === "transfert" ? "Dépôt / Deposit" : m || "N/A";

    const fmt = (d: string) => { try { return new Date(d).toLocaleString("fr-FR"); } catch { return "N/A"; } };
    const receiptNum = `RCP-${b.booking_reference}`;
    const now = new Date().toLocaleString("fr-FR");

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Reçu ${receiptNum}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; color:#1a1a1a; background:#fff; }
    .page { max-width:720px; margin:0 auto; padding:32px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #1A237E; padding-bottom:16px; margin-bottom:24px; }
    .logo-section img { height:50px; }
    .logo-section h1 { color:#1A237E; font-size:1.4em; margin-top:4px; }
    .receipt-meta { text-align:right; }
    .receipt-meta .receipt-num { font-size:1.3em; font-weight:bold; color:#1A237E; }
    .receipt-meta .date { font-size:0.85em; color:#555; }
    .badge { display:inline-block; padding:3px 12px; border-radius:20px; font-size:0.8em; font-weight:bold; }
    .badge-confirmed { background:#dcfce7; color:#166534; }
    .badge-pending   { background:#fef9c3; color:#854d0e; }
    .badge-cancelled { background:#fee2e2; color:#991b1b; }
    h3 { font-size:0.75em; text-transform:uppercase; letter-spacing:1px; color:#6b7280; margin-bottom:8px; }
    .section { margin-bottom:20px; }
    table.info { width:100%; border-collapse:collapse; }
    table.info td { padding:7px 10px; font-size:0.92em; }
    table.info td:first-child { color:#6b7280; width:45%; }
    table.info td:last-child { font-weight:600; }
    table.info tr:nth-child(even) td { background:#f9fafb; }
    .total-box { background:#1A237E; color:white; border-radius:8px; padding:16px 24px; display:flex; justify-content:space-between; align-items:center; margin:20px 0; }
    .total-box .label { font-size:1em; opacity:0.85; }
    .total-box .amount { font-size:1.8em; font-weight:bold; }
    .footer { border-top:1px solid #eee; padding-top:16px; margin-top:24px; font-size:0.8em; color:#9ca3af; text-align:center; }
    .watermark { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-35deg); font-size:6em; font-weight:900; opacity:0.04; color:#1A237E; pointer-events:none; z-index:0; }
    @media print {
      body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .no-print { display:none; }
    }
  </style>
</head>
<body>
<div class="watermark">TROGON AIRWAYS</div>
<div class="page">
  <div class="header">
    <div class="logo-section">
      <img src="https://trogonairways.com/logo-trogonpng.png" alt="Trogon Airways"/>
      <h1>REÇU DE PAIEMENT</h1>
      <div style="font-size:0.8em;color:#6b7280;">PAYMENT RECEIPT</div>
    </div>
    <div class="receipt-meta">
      <div class="receipt-num">${receiptNum}</div>
      <div class="date">Émis le / Issued: ${now}</div>
      <div style="margin-top:6px;">
        <span class="badge badge-${b.status === "confirmed" ? "confirmed" : b.status === "cancelled" ? "cancelled" : "pending"}">
          ${b.status === "confirmed" ? "PAYÉ / PAID" : b.status === "cancelled" ? "ANNULÉ" : "EN ATTENTE"}
        </span>
      </div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
    <div class="section">
      <h3>Client</h3>
      <table class="info">
        ${paxRows.map((p: any) => `<tr><td>Passager</td><td>${p.first_name} ${p.last_name}</td></tr>`).join("")}
        <tr><td>Email</td><td>${b.contact_email || "N/A"}</td></tr>
        <tr><td>Téléphone</td><td>${b.contact_phone || "N/A"}</td></tr>
      </table>
    </div>
    <div class="section">
      <h3>Réservation / Booking</h3>
      <table class="info">
        <tr><td>Référence</td><td>${b.booking_reference}</td></tr>
        <tr><td>Date création</td><td>${fmt(b.created_at)}</td></tr>
        <tr><td>Type</td><td>${b.type_vol === "helicopter" ? "Hélicoptère" : b.type_vol === "charter" ? "Charter" : "Avion"}</td></tr>
        <tr><td>Trajet</td><td>${b.type_v === "roundtrip" ? "Aller-Retour" : "Aller Simple"}</td></tr>
        <tr><td>Passagers</td><td>${b.passenger_count}</td></tr>
      </table>
    </div>
  </div>

  ${flight ? `
  <div class="section">
    <h3>Vol / Flight</h3>
    <table class="info">
      <tr><td>Vol N°</td><td>${flight.flight_number}</td></tr>
      <tr><td>Départ</td><td>${flight.dep_name} (${flight.dep_code})</td></tr>
      <tr><td>Arrivée</td><td>${flight.arr_name} (${flight.arr_code})</td></tr>
      <tr><td>Date départ</td><td>${fmt(flight.departure_time)}</td></tr>
      <tr><td>Date arrivée</td><td>${fmt(flight.arrival_time)}</td></tr>
    </table>
  </div>` : ""}

  <div class="section">
    <h3>Paiement / Payment</h3>
    <table class="info">
      <tr><td>Mode de paiement</td><td>${payLabel(b.payment_method || b.pay_method)}</td></tr>
      ${b.payment_ref ? `<tr><td>Référence paiement</td><td><strong>${b.payment_ref}</strong></td></tr>` : ""}
      <tr><td>Devise</td><td>${(b.currency || "USD").toUpperCase()}</td></tr>
    </table>
  </div>

  <div class="total-box">
    <span class="label">TOTAL PAYÉ / TOTAL PAID</span>
    <span class="amount">${Number(b.total_price).toLocaleString("fr-FR", {minimumFractionDigits:2})} ${(b.currency || "USD").toUpperCase()}</span>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px;">
    <div>
      <p style="font-size:0.85em;color:#6b7280;margin-bottom:4px;">Signature du caissier / Cashier signature:</p>
      <div style="border-bottom:1px solid #d1d5db;margin-top:32px;"></div>
    </div>
    <div>
      <p style="font-size:0.85em;color:#6b7280;margin-bottom:4px;">Cachet / Stamp:</p>
      <div style="border:1px dashed #d1d5db;height:60px;border-radius:4px;"></div>
    </div>
  </div>

  <div class="footer">
    <p>Trogon Airways • info@trogonairways.com • +509 334104004 • trogonairways.com</p>
    <p style="margin-top:4px;">Ce reçu est un justificatif de paiement officiel. / This receipt is an official proof of payment.</p>
  </div>

  <div class="no-print" style="text-align:center;margin-top:24px;">
    <button onclick="window.print()" style="background:#1A237E;color:white;border:none;padding:12px 32px;border-radius:8px;font-size:1em;cursor:pointer;">
      🖨️ Imprimer / Print
    </button>
  </div>
</div>
<script>
  // Auto-print si paramètre print=1
  if (new URLSearchParams(window.location.search).get('print') === '1') {
    window.onload = () => setTimeout(() => window.print(), 500);
  }
</script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err: any) {
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// ============================================================
// 4. GESTION DES PASSAGERS (vue globale)
// ============================================================

app.get("/api/passengers", authMiddleware, async (req: any, res: Response) => {
  const { q, flight_id, booking_ref, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  try {
    let where = "WHERE 1=1";
    const params: any[] = [];
    if (q) {
      where += " AND (p.first_name LIKE ? OR p.last_name LIKE ? OR p.idClient LIKE ? OR p.nationality LIKE ? OR b.booking_reference LIKE ?)";
      const like = `%${q}%`;
      params.push(like, like, like, like, like);
    }
    if (flight_id) { where += " AND b.flight_id=?"; params.push(flight_id); }
    if (booking_ref) { where += " AND b.booking_reference LIKE ?"; params.push(`%${booking_ref}%`); }
    const [countRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM passengers p LEFT JOIN bookings b ON p.booking_id=b.id ${where}`, params
    );
    const total = countRows[0].total;
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT p.id, p.first_name, p.last_name, p.date_of_birth,
              p.idClient AS passport_number, p.nationality, p.selectedSeat AS seat_number,
              b.booking_reference, b.status AS booking_status, b.type_vol,
              f.flight_number, f.departure_time,
              l1.name AS \`from\`, l2.name AS \`to\`
       FROM passengers p
       LEFT JOIN bookings b ON p.booking_id = b.id
       LEFT JOIN flights f ON b.flight_id = f.id
       LEFT JOIN locations l1 ON f.departure_location_id = l1.id
       LEFT JOIN locations l2 ON f.arrival_location_id = l2.id
       ${where}
       ORDER BY p.id DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );
    res.json({ passengers: rows, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// ============================================================
// PASSAGERS AVANCÉS — check-in, siège, groupé par vol
// ============================================================

// Migration automatique : ajouter les colonnes check-in une par une avec try/catch individuels
(async () => {
  const cols = [
    `ALTER TABLE passengers ADD COLUMN checked_in TINYINT(1) NOT NULL DEFAULT 0`,
    `ALTER TABLE passengers ADD COLUMN checked_in_at DATETIME NULL`,
    `ALTER TABLE passengers ADD COLUMN checked_in_by VARCHAR(100) NULL`,
  ];
  for (const sql of cols) {
    try { await pool.execute(sql); } catch (_) { /* colonne déjà présente */ }
  }
})();

// GET /api/passengers/by-flight — passagers groupés par vol (pour le manifest check-in)
app.get("/api/passengers/by-flight", authMiddleware, async (req: any, res: Response) => {
  try {
    const { date, q, type_vol } = req.query;

    // Inclure confirmed ET pending (sauf cancelled/refunded)
    let where = "WHERE b.status NOT IN ('cancelled', 'refunded', 'annulé', 'canceled')";
    const params: any[] = [];

    // Filtre date — seulement si explicitement fourni
    if (date && String(date).trim()) {
      where += " AND DATE(f.departure_time) = ?";
      params.push(String(date).trim());
    }
    if (type_vol && String(type_vol).trim()) {
      where += " AND b.type_vol = ?";
      params.push(String(type_vol).trim());
    }
    if (q && String(q).trim()) {
      where += ` AND (p.first_name LIKE ? OR p.last_name LIKE ? OR p.idClient LIKE ? OR b.booking_reference LIKE ? OR f.flight_number LIKE ?)`;
      const like = `%${String(q).trim()}%`;
      params.push(like, like, like, like, like);
    }

    // Vérifier si la colonne checked_in existe
    let hasCheckinCol = false;
    try {
      await pool.execute("SELECT checked_in FROM passengers LIMIT 1");
      hasCheckinCol = true;
    } catch (_) { hasCheckinCol = false; }

    const checkinSelect = hasCheckinCol
      ? "p.checked_in, p.checked_in_at, p.checked_in_by,"
      : "0 AS checked_in, NULL AS checked_in_at, NULL AS checked_in_by,";

    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT
         f.id AS flight_id, f.flight_number, f.departure_time, f.arrival_time,
         COALESCE(l1.name, 'Départ') AS from_city, COALESCE(l1.code, '???') AS from_code,
         COALESCE(l2.name, 'Arrivée') AS to_city, COALESCE(l2.code, '???') AS to_code,
         b.type_vol, b.status AS booking_status,
         p.id AS passenger_id, p.first_name, p.last_name,
         COALESCE(p.idClient, '') AS passport_number,
         COALESCE(p.nationality, '') AS nationality,
         COALESCE(p.selectedSeat, '') AS seat_number,
         COALESCE(p.gender, '') AS gender, COALESCE(p.title, '') AS title,
         ${checkinSelect}
         b.booking_reference,
         COALESCE(b.contact_email, '') AS contact_email,
         COALESCE(b.contact_phone, '') AS contact_phone,
         COALESCE(b.total_price, 0) AS total_price,
         COALESCE(b.currency, 'USD') AS currency
       FROM passengers p
       JOIN bookings b ON p.booking_id = b.id
       JOIN flights f ON b.flight_id = f.id
       LEFT JOIN locations l1 ON f.departure_location_id = l1.id
       LEFT JOIN locations l2 ON f.arrival_location_id = l2.id
       ${where}
       ORDER BY f.departure_time ASC, f.id, p.last_name ASC`,
      params
    );

    // Grouper par vol
    const flightsMap: Record<number, any> = {};
    rows.forEach((row: any) => {
      if (!flightsMap[row.flight_id]) {
        flightsMap[row.flight_id] = {
          flight_id: row.flight_id,
          flight_number: row.flight_number || `Vol #${row.flight_id}`,
          departure_time: row.departure_time,
          arrival_time: row.arrival_time,
          from_city: row.from_city,
          from_code: row.from_code,
          to_city: row.to_city,
          to_code: row.to_code,
          type_vol: row.type_vol || 'plane',
          passengers: [],
        };
      }
      flightsMap[row.flight_id].passengers.push({
        id: row.passenger_id,
        first_name: row.first_name || '',
        last_name: row.last_name || '',
        passport_number: row.passport_number,
        nationality: row.nationality,
        seat_number: row.seat_number,
        gender: row.gender,
        title: row.title,
        checked_in: !!row.checked_in,
        checked_in_at: row.checked_in_at,
        checked_in_by: row.checked_in_by,
        booking_reference: row.booking_reference,
        booking_status: row.booking_status,
        contact_email: row.contact_email,
        contact_phone: row.contact_phone,
        total_price: row.total_price,
        currency: row.currency,
      });
    });

    const flights = Object.values(flightsMap).map((f: any) => ({
      ...f,
      total_passengers: f.passengers.length,
      checked_in_count: f.passengers.filter((p: any) => p.checked_in).length,
    }));

    res.json({ flights, total_flights: flights.length });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// PUT /api/passengers/:id/checkin — toggle check-in
app.put("/api/passengers/:id/checkin", authMiddleware, async (req: any, res: Response) => {
  const { id } = req.params;
  const { checked_in } = req.body; // true ou false
  try {
    const agentName = req.user?.name || req.user?.username || "Agent";
    await pool.execute(
      `UPDATE passengers SET
         checked_in = ?,
         checked_in_at = ?,
         checked_in_by = ?
       WHERE id = ?`,
      [
        checked_in ? 1 : 0,
        checked_in ? new Date() : null,
        checked_in ? agentName : null,
        id,
      ]
    );
    res.json({ success: true, checked_in: !!checked_in });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// PUT /api/passengers/:id/seat — assigner un siège
app.put("/api/passengers/:id/seat", authMiddleware, async (req: any, res: Response) => {
  const { id } = req.params;
  const { seat_number } = req.body;
  if (!seat_number || !seat_number.trim()) {
    return res.status(400).json({ error: "Numéro de siège requis" });
  }
  try {
    await pool.execute(
      `UPDATE passengers SET selectedSeat = ? WHERE id = ?`,
      [seat_number.trim().toUpperCase(), id]
    );
    res.json({ success: true, seat_number: seat_number.trim().toUpperCase() });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// ============================================================
// 5. GESTION DES RÔLES (Role Manager)
// ============================================================

app.get("/api/roles-list", authMiddleware, adminOnly, async (req: any, res: Response) => {
  try {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      "SELECT id, username, name, email, role, phone, permissions FROM users ORDER BY role, name"
    );

    // Parser les permissions CSV → tableau pour chaque utilisateur
    const parseRawPerms = (raw: string): string[] => {
      if (!raw || !raw.trim()) return [];
      try {
        if (raw.trim().startsWith('[')) return JSON.parse(raw);
        return raw.split(',').map((s: string) => s.trim()).filter(Boolean);
      } catch { return []; }
    };

    const users = rows.map((u: any) => ({
      ...u,
      permissions: parseRawPerms(u.permissions || ''),
    }));

    const roleGroups: Record<string, any[]> = {};
    users.forEach((u: any) => {
      if (!roleGroups[u.role]) roleGroups[u.role] = [];
      roleGroups[u.role].push(u);
    });

    res.json({ users, roleGroups });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.put("/api/roles-list/:userId", authMiddleware, adminOnly, async (req: any, res: Response) => {
  const { userId } = req.params;
  const { role, permissions } = req.body;
  try {
    await pool.execute(
      "UPDATE users SET role=?, permissions=? WHERE id=?",
      [role, Array.isArray(permissions) ? permissions.join(',') : (permissions || ''), userId]
    );
    await logAudit(req.user.id, req.user.name , 'UPDATE_ROLE', 'user', userId, `Rôle changé: ${role}`, req.ip);
    res.json({ success: true, message: "Rôle et permissions mis à jour" });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// ============================================================
// 6. REMBOURSEMENTS STRIPE
// ============================================================

app.get("/api/refunds", authMiddleware, async (req: any, res: Response) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let where = "WHERE p.payment_method != 'cash'";
    const params: any[] = [];
    if (status) { where += " AND b.status=?"; params.push(status); }
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT b.booking_reference, b.status, b.total_price, b.currency, b.contact_email, b.created_at, b.type_vol,
              b.payment_intent_id, p.payment_method, p.amount as paid_amount, p.payment_status
       FROM bookings b
       LEFT JOIN payments p ON p.booking_id=b.id
       ${where}
       ORDER BY b.created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );
    res.json({ refunds: rows });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

app.post("/api/refunds/:reference", authMiddleware, async (req: any, res: Response) => {
  const { reference } = req.params;
  const { reason, amount } = req.body;
  try {
    const [bookings] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT b.*, p.amount as paid_amount FROM bookings b LEFT JOIN payments p ON p.booking_id=b.id WHERE b.booking_reference=?`,
      [reference]
    );
    if (!bookings.length) return res.status(404).json({ error: "Réservation non trouvée" });
    const booking = bookings[0];
    if (!booking.payment_intent_id) return res.status(400).json({ error: "Aucun paiement Stripe associé (paiement cash ou en attente)" });
    const refundAmount = amount ? Math.round(Number(amount) * 100) : undefined;
    const refund = await stripe.refunds.create({
      payment_intent: booking.payment_intent_id,
      ...(refundAmount ? { amount: refundAmount } : {}),
      reason: 'requested_by_customer',
    });
    await pool.execute(
      "UPDATE bookings SET status='refunded' WHERE booking_reference=?",
      [reference]
    );
    await pool.execute(
      "UPDATE payments SET payment_status='refunded' WHERE booking_id=?",
      [booking.id]
    );
    await logAudit(req.user.id, req.user.name || req.user.username, 'REFUND', 'booking', reference, `Remboursement: ${refund.id} - ${reason || ''}`, req.ip);
    res.json({ success: true, refund_id: refund.id, amount: refund.amount / 100, status: refund.status });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur remboursement", details: err.message });
  }
});

// ============================================================
// 7. AUDIT LOGS
// ============================================================

app.get("/api/audit-logs", authMiddleware, adminOnly, async (req: any, res: Response) => {
  const { page = 1, limit = 30, action, entity_type, user_id, start_date, end_date } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  try {
    let where = "WHERE 1=1";
    const params: any[] = [];
    if (action) { where += " AND action LIKE ?"; params.push(`%${action}%`); }
    if (entity_type) { where += " AND entity_type=?"; params.push(entity_type); }
    if (user_id) { where += " AND user_id=?"; params.push(user_id); }
    if (start_date) { where += " AND created_at >= ?"; params.push(start_date); }
    if (end_date) { where += " AND created_at <= ?"; params.push(end_date + ' 23:59:59'); }
    const [countRows] = await pool.query<mysql.RowDataPacket[]>(`SELECT COUNT(*) as total FROM audit_logs ${where}`, params);
    const total = countRows[0].total;
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );
    res.json({ logs: rows, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// ============================================================
// 8. PARAMÈTRES / SETTINGS
// ============================================================

app.get("/api/settings", authMiddleware, adminOnly, async (req: any, res: Response) => {
  try {
    const [rows] = await pool.query<mysql.RowDataPacket[]>("SELECT * FROM app_settings ORDER BY setting_group, setting_key");
    res.json({ settings: rows });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.put("/api/settings", authMiddleware, adminOnly, async (req: any, res: Response) => {
  const { settings } = req.body; // Array of { setting_key, setting_value }
  if (!Array.isArray(settings)) return res.status(400).json({ error: "Format invalide" });
  try {
    for (const s of settings) {
      await pool.execute(
        "UPDATE app_settings SET setting_value=? WHERE setting_key=?",
        [s.setting_value, s.setting_key]
      );
    }
    await logAudit(req.user.id, req.user.name || req.user.username, 'UPDATE_SETTINGS', 'settings', null, `${settings.length} paramètre(s) mis à jour`, req.ip);
    res.json({ success: true, message: "Paramètres sauvegardés" });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// ============================================================
// 9. RAPPORTS FINANCIERS DÉTAILLÉS
// ============================================================

app.get("/api/reports/financial", authMiddleware, async (req: any, res: Response) => {
  const { start_date, end_date, type_vol, currency } = req.query;
  try {
    // Filtres sur bookings (currency stockée en minuscules dans la DB)
    let where = "WHERE b.status NOT IN ('cancelled')";
    const params: any[] = [];
    if (start_date) { where += " AND DATE(b.created_at) >= ?"; params.push(start_date); }
    if (end_date) { where += " AND DATE(b.created_at) <= ?"; params.push(end_date); }
    if (type_vol) { where += " AND b.type_vol=?"; params.push(type_vol); }
    if (currency) { where += " AND UPPER(IFNULL(p.currency, b.currency))=UPPER(?)"; params.push(currency); }

    const joinPayments = `FROM bookings b LEFT JOIN payments p ON p.booking_id=b.id`;

    // Revenus par mois — utilise payments.amount (vrai montant encaissé)
    const [byMonth] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT DATE_FORMAT(b.created_at,'%Y-%m') as month,
              UPPER(IFNULL(p.currency, b.currency)) as currency,
              COUNT(DISTINCT b.id) as bookings,
              SUM(IFNULL(p.amount, b.total_price)) as revenue
       ${joinPayments} ${where}
       GROUP BY month, UPPER(IFNULL(p.currency, b.currency))
       ORDER BY month ASC`, params
    );
    // Revenus par type de vol
    const [byType] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT b.type_vol,
              UPPER(IFNULL(p.currency, b.currency)) as currency,
              COUNT(DISTINCT b.id) as bookings,
              SUM(IFNULL(p.amount, b.total_price)) as revenue
       ${joinPayments} ${where}
       GROUP BY b.type_vol, UPPER(IFNULL(p.currency, b.currency))`, params
    );
    // Revenus par route (départ → arrivée)
    const [byRoute] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT l1.name as departure, l2.name as destination,
              COUNT(DISTINCT b.id) as bookings,
              SUM(IFNULL(p.amount, b.total_price)) as revenue,
              UPPER(IFNULL(p.currency, b.currency)) as currency
       ${joinPayments}
       LEFT JOIN flights f ON b.flight_id=f.id
       LEFT JOIN locations l1 ON f.departure_location_id=l1.id
       LEFT JOIN locations l2 ON f.arrival_location_id=l2.id
       ${where}
       GROUP BY l1.name, l2.name, UPPER(IFNULL(p.currency, b.currency))
       ORDER BY revenue DESC LIMIT 10`, params
    );
    // Totaux globaux
    const [totals] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT UPPER(IFNULL(p.currency, b.currency)) as currency,
              COUNT(DISTINCT b.id) as total_bookings,
              SUM(IFNULL(p.amount, b.total_price)) as total_revenue,
              AVG(IFNULL(p.amount, b.total_price)) as avg_booking_value,
              SUM(b.passenger_count) as total_passengers
       ${joinPayments} ${where}
       GROUP BY UPPER(IFNULL(p.currency, b.currency))`, params
    );

    res.json({
      by_month: byMonth,
      by_type: byType,
      by_route: byRoute,
      totals,
    });
  } catch (err: any) {
    console.error("Reports error:", err);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

server.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});
