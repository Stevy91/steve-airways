import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';


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

export interface BookingStats{
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
                        phone, email, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    

        const {paymentMethod, paymentIntentId, passengers, contactInfo, flightId, totalPrice, returnFlightId, departureDate, returnDate } = req.body;
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
                        phone, email, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

app.post("/api/create-ticket", authMiddleware, async (req: any, res: Response) => {
  const connection = await pool.getConnection();
  const userId = req.user.id; // Récupérer l'ID de l'utilisateur connecté

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
      returnFlightId,
      departureDate,
      returnDate,
      paymentMethod = "card",
    } = req.body;

    const typeVol = passengers[0]?.typeVol || "plane";
    const typeVolV = passengers[0]?.typeVolV || "onway";

    // Vérifier les vols
    const flightIds = returnFlightId ? [flightId, returnFlightId] : [flightId];
    const [flightsRows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT id, seats_available FROM flights WHERE id IN (?) FOR UPDATE",
      [flightIds],
    );

    const flights = flightsRows as mysql.RowDataPacket[];
    
    if (flights.length !== flightIds.length) {
      throw new Error("One or more flights not found");
    }

    for (const flight of flights) {
      if (flight.seats_available < passengers.length) {
        throw new Error(`Not enough seats available for flight ${flight.id}`);
      }
    }

    // Création réservation - AJOUT du champ user_created_booking
    const now = new Date();
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, // Ajout d'un ? supplémentaire
      [
        flightId,
        referenceNumber,
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
        depDate,
        retDate,
        passengers.length,
        bookingReference,
        returnFlightId || null,
        paymentMethod,
        userId, 
      ],
    );

    const bookingResult = bookingResultRows as mysql.OkPacket;

    // Enregistrer les passagers (reste identique)
    for (const passenger of passengers) {
      await connection.query(
        `INSERT INTO passengers (
          booking_id, first_name, middle_name, last_name,
          date_of_birth, gender, title, address, type,
          type_vol, type_v, country, nationality,
          phone, email, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          now,
          now,
        ],
      );
    }

    // Mise à jour des sièges (reste identique)
    for (const flight of flights) {
      await connection.execute(
        "UPDATE flights SET seats_available = seats_available - ? WHERE id = ?",
        [passengers.length, flight.id],
      );
    }

    // Notification (reste identique)
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
      createdBy: userId, // Optionnel: retourner l'ID de l'utilisateur
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

    res.status(500).json({
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
      "SELECT id, name, email, phone, created_at FROM users"
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
                f.id DESC
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
                f.id DESC
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
app.get("/api/dashboard-stats", async (req: Request, res: Response) => {
    let connection;
    try {
       

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
      ORDER BY created_at DESC
    `);

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

       
        const recentBookings = bookings.slice(0, 6);

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

// Endpoint pour les données du dashboard
app.get("/api/booking-plane", async (req: Request, res: Response) => {
    let connection;
    try {
       
        // 1. Récupérer les réservations avec un typage explicite
   const [bookingRows] = await pool.query<mysql.RowDataPacket[]>(
  `SELECT 
      id, booking_reference, total_price, status, created_at, 
      passenger_count, contact_email, type_vol, type_v
   FROM bookings 
   WHERE type_vol = ?
   ORDER BY created_at DESC`,
  ["plane"]
);
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

        const allBookings = bookings; // toutes les réservations
        const response: BookingStats = {
    recentBookings: allBookings, // ou renommer recentBookings en bookings si tu veux
};

   

        res.json(response);
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ error: "Erreur lors de la récupération des statistiques" });
    } 
});


// API pour modifier une réservation (passagers, vols, etc.)
app.put("/api/bookings/:reference", async (req: Request, res: Response) => {
  const { reference } = req.params;
  const {
    passengers,
    flights,
    contactEmail,
    contactPhone,
    totalPrice,
    paymentStatus
  } = req.body;

  console.log(`🔍 DEBUG - Début modification réservation: ${reference}`);
  console.log(`📦 Données reçues:`, JSON.stringify(req.body, null, 2));

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    console.log(`✅ Transaction démarrée`);

    // 1. Vérifier que la réservation existe
    const [bookings] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT id, status, flight_id, return_flight_id, passenger_count FROM bookings WHERE booking_reference = ? FOR UPDATE`,
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
    console.log(`📋 Réservation trouvée:`, booking);

    // 2. Mettre à jour les informations générales de la réservation
    if (contactEmail || contactPhone || totalPrice || paymentStatus) {
      const updateFields = [];
      const updateValues = [];

      if (contactEmail) {
        updateFields.push("contact_email = ?");
        updateValues.push(contactEmail);
      }
      if (contactPhone) {
        updateFields.push("contact_phone = ?");
        updateValues.push(contactPhone);
      }
      if (totalPrice) {
        updateFields.push("total_price = ?");
        updateValues.push(totalPrice);
      }
      if (paymentStatus) {
        updateFields.push("status = ?");
        updateValues.push(paymentStatus);
      }

      if (updateFields.length > 0) {
        updateValues.push(reference);
        await connection.query(
          `UPDATE bookings SET ${updateFields.join(", ")}, updated_at = NOW() WHERE booking_reference = ?`,
          updateValues
        );
        console.log(`✅ Informations réservation mises à jour`);
      }
    }

    // 3. GESTION DES SIÈGES - AVANT la modification des passagers
    const oldPassengerCount = booking.passenger_count;
    const newPassengerCount = passengers ? passengers.length : oldPassengerCount;
    
    if (newPassengerCount !== oldPassengerCount) {
      console.log(`🔄 Ajustement des sièges: ${oldPassengerCount} → ${newPassengerCount} passagers`);
      
      // Récupérer les vols de la réservation
      const flightIds = [booking.flight_id];
      if (booking.return_flight_id) {
        flightIds.push(booking.return_flight_id);
      }

      // Calculer la différence
      const seatDifference = newPassengerCount - oldPassengerCount;
      
      if (seatDifference !== 0) {
        for (const flightId of flightIds) {
          if (flightId) {
            await connection.execute(
              "UPDATE flights SET seats_available = seats_available - ? WHERE id = ?",
              [seatDifference, flightId]
            );
            console.log(`✅ Sièges ajustés pour le vol ${flightId}: ${seatDifference}`);
          }
        }
      }
    }

    // 4. Mettre à jour les passagers
    if (passengers && Array.isArray(passengers)) {
      console.log(`👥 Mise à jour de ${passengers.length} passager(s)`);
      
      // Supprimer les anciens passagers
      await connection.query(
        `DELETE FROM passengers WHERE booking_id = ?`,
        [booking.id]
      );
      console.log(`🗑️ Anciens passagers supprimés`);

      // Insérer les nouveaux passagers
      for (const passenger of passengers) {
        await connection.query(
          `INSERT INTO passengers (
            booking_id, first_name, middle_name, last_name,
            date_of_birth, gender, title, address, type,
            type_vol, type_v, country, nationality,
            phone, email, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            new Date(),
            new Date()
          ]
        );
      }
      console.log(`✅ ${passengers.length} passager(s) insérés`);

      // Mettre à jour le nombre de passagers dans la réservation
      if (newPassengerCount !== oldPassengerCount) {
        await connection.query(
          "UPDATE bookings SET passenger_count = ? WHERE id = ?",
          [newPassengerCount, booking.id]
        );
        console.log(`✅ Nombre de passagers mis à jour: ${newPassengerCount}`);
      }
    }

    // 5. Créer une notification pour la modification
    await connection.query(
      `INSERT INTO notifications (type, message, booking_id, seen, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        "update",
        `Réservation ${reference} modifiée.`,
        booking.id,
        false,
        new Date()
      ]
    );
    console.log(`🔔 Notification de modification créée`);

    // 6. Récupérer la réservation mise à jour pour la réponse
    const [updatedBooking] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT 
          b.*,
          u.name as created_by_name,
          u.email as created_by_email
       FROM bookings b
       LEFT JOIN users u ON b.user_created_booking = u.id
       WHERE b.booking_reference = ?`,
      [reference]
    );

    const [updatedPassengers] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT * FROM passengers WHERE booking_id = ?`,
      [booking.id]
    );

    // ✅ COMMIT APRÈS toutes les opérations
    await connection.commit();
    console.log(`💾 Transaction commitée`);

    res.json({
      success: true,
      message: "Réservation mise à jour avec succès",
      booking: updatedBooking[0],
      passengers: updatedPassengers,
      updatedAt: new Date()
    });

  } catch (error) {
    console.error("❌ Erreur modification réservation:", error);
    if (connection) {
      await connection.rollback();
    }
    res.status(500).json({
      success: false,
      error: "Échec de la modification de la réservation",
      details: error instanceof Error ? error.message : "Erreur inconnue"
    });
  } finally {
    if (connection) {
      connection.release();
    }
    console.log(`🏁 Fin modification réservation: ${reference}`);
  }
});
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



app.get("/api/booking-helico", async (req: Request, res: Response) => {
    let connection;
    try {
        // 1. Récupérer les réservations avec jointure pour avoir le nom de l'utilisateur
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
                u.name as created_by_name,  
                u.email as created_by_email 
            FROM bookings b
            LEFT JOIN users u ON b.user_created_booking = u.id  
            WHERE b.type_vol = ?
            ORDER BY b.created_at DESC`,
            ["helicopter"]
        );

        // Convertir en type Booking[] avec le nouveau champ
        const bookings: Booking[] = bookingRows.map((row) => ({
            id: row.id,
            booking_reference: row.booking_reference,
            payment_intent_id: row.payment_intent_id,
            total_price: Number(row.total_price),
            status: row.status,
            created_at: new Date(row.created_at).toISOString(),
            passenger_count: row.passenger_count,
            payment_method: row.payment_method,
            contact_email: row.contact_email,
            type_vol: row.type_vol,
            type_v: row.type_v,
            created_by_name: row.created_by_name,  // AJOUT DU CHAMP
            created_by_email: row.created_by_email // AJOUT DU CHAMP (optionnel)
        }));

        const recentBookings = bookings.slice(0, 6);

        // 8. Construction de la réponse
        const response: BookingStats = {
            recentBookings,
        };

        res.json(response);
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ error: "Erreur lors de la récupération des statistiques" });
    } 
});


async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = "api-3E50B3ECEA894D1E8A8FFEF38495B5C4";
  const sender = "info@kashpaw.com";

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
          phone, email, created_at, updated_at
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
          f.arrival_time,
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
      created_at: new Date(booking.created_at).toISOString(),
      passenger_count: booking.passenger_count,
      contact_email: booking.contact_email,
      type_vol: booking.type_vol,
      type_v: booking.type_v,
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
