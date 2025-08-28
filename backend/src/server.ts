import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql, { Pool } from 'mysql2/promise';


import { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import Stripe from "stripe";
import paypal from "@paypal/checkout-server-sdk";
import nodemailer from "nodemailer";
import { OkPacket } from "mysql2";
import { COUNTRIES } from "./constants/country";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuration MySQL
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});
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


// -------------------- Nodemailer --------------------



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

    air_line: string;
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
        const {
            from,
            to,
            date,
            tab: type,
        } = req.query as {
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
        const [departureAirport] = await pool.query<Location[]>("SELECT id FROM locations WHERE code = ?", [from]);

        const [arrivalAirport] = await pool.query<Location[]>("SELECT id FROM locations WHERE code = ?", [to]);

        if (departureAirport.length === 0 || arrivalAirport.length === 0) {
           
            return res.status(404).json({ error: "Aéroport non trouvé" });
        }

        // Requête principale
        const [flights] = await pool.query<Flight[]>(
            `SELECT f.*, 
                    dep.code as departure_code, 
                    arr.code as arrival_code
             FROM flights f
             JOIN locations dep ON f.departure_location_id = dep.id
             JOIN locations arr ON f.arrival_location_id = arr.id
             WHERE dep.code = ? 
               AND arr.code = ? 
               AND DATE(f.departure_time) = ?
               AND f.type = ?
             ORDER BY f.departure_time`,
            [from, to, date, type],
        );

        // Gestion des vols aller-retour
        if (req.query.return_date) {
            const returnDate = req.query.return_date as string;

            const [returnFlights] = await pool.query<Flight[]>(
                `SELECT f.*, 
                        dep.code as departure_code, 
                        arr.code as arrival_code
                 FROM flights f
                 JOIN locations dep ON f.departure_location_id = dep.id
                 JOIN locations arr ON f.arrival_location_id = arr.id
                 WHERE dep.code = ? 
                   AND arr.code = ? 
                   AND DATE(f.departure_time) = ?
                   AND f.type = ?
                 ORDER BY f.departure_time`,
                [to, from, returnDate, type],
            );

          
            return res.json({
                outbound: flights,
                return: returnFlights,
            });
        }

      
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
            return res.status(404).json({ error: "Vol aller non trouvé", flightId });
        }

        let returnFlight = null;
        if (returnFlightId) {
            returnFlight = flights.find((f) => f.id === returnFlightId);
            if (!returnFlight) {
                return res.status(404).json({ error: "Vol retour non trouvé", returnFlightId });
            }
        }

        // 4. Vérification de la capacité
        if (outboundFlight.seats_available < passengerCount) {
            return res.status(400).json({
                error: "Capacité insuffisante pour le vol aller",
                available: outboundFlight.seats_available,
                requested: passengerCount,
            });
        }

        if (returnFlight && returnFlight.seats_available < passengerCount) {
            return res.status(400).json({
                error: "Capacité insuffisante pour le vol retour",
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
            error: "Échec de la création du paiement",
            details: errorMessage,
        });
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
                throw new Error(`Champ requis manquant: ${field}`);
            }
        }

        const { paymentIntentId, passengers, contactInfo, flightId, totalPrice, returnFlightId, departureDate, returnDate } = req.body;
        const typeVol = passengers[0]?.typeVol || "plane";
        const typeVolV = passengers[0]?.typeVolV || "onway";

        // 2. Vérification Stripe
        if (!paymentIntentId.startsWith("pi_")) {
            throw new Error("Format PaymentIntent ID invalide");
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status !== "succeeded") {
            throw new Error("Paiement non confirmé");
        }

        // 3. Validation des passagers
        if (!Array.isArray(passengers) || passengers.length === 0) {
            throw new Error("Liste de passagers invalide");
        }

        passengers.forEach((passenger, index) => {
            if (!passenger.firstName || !passenger.lastName) {
                throw new Error(`Passager ${index + 1}: Nom complet requis`);
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
            throw new Error("Un ou plusieurs vols introuvables");
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
            error: "Échec de la réservation",
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


app.post("/api/confirm-booking-paylater", async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { passengers, contactInfo, flightId, totalPrice, returnFlightId, departureDate, returnDate } = req.body;
         const typeVol = passengers[0]?.typeVol || "plane";
        const typeVolV = passengers[0]?.typeVolV || "onway";

        if (!passengers || passengers.length === 0) {
            throw new Error("Liste de passagers invalide");
        }

        // 4. Vérification des vols
        const flightIds = returnFlightId ? [flightId, returnFlightId] : [flightId];
        const [flights] = await connection.query<mysql.RowDataPacket[]>(
            "SELECT id, seats_available FROM flights WHERE id IN (?) FOR UPDATE",
            [flightIds]
        );

        if (flights.length !== flightIds.length) {
            throw new Error("Un ou plusieurs vols introuvables");
        }

        const now = new Date();
        const bookingReference = `BOOK-${Math.floor(100000 + Math.random() * 900000)}`;

        // 5. Création de la réservation
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
                null, // pas de paymentIntent
                totalPrice,
                contactInfo.email,
                contactInfo.phone,
                "pending", // ✅ statut correct pour Pay Later
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
            ]
        );

        // 6. Insertion des passagers
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
                    getCountryName(passenger.country) || passenger.country,
                    passenger.nationality || null,
                    passenger.phone || contactInfo.phone,
                    passenger.email || contactInfo.email,
                    now,
                    now,
                ]
            );
        }

        // 7. Mise à jour des sièges
        for (const flight of flights) {
            await connection.execute(
                "UPDATE flights SET seats_available = seats_available - ? WHERE id = ?",
                [passengers.length, flight.id]
            );
        }

        await connection.commit();

        res.json({
            success: true,
            bookingId: bookingResult.insertId,
            bookingReference,
            status: "pending",
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
            error: "Échec de la réservation",
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
            air_line: flight.airline,
            from: `${flight.departure_airport_name} (${flight.departure_code})`,
            to: `${flight.arrival_airport_name} (${flight.arrival_code})`,
            departure: formatDate(flight.departure_time),
            arrival: formatDate(flight.arrival_time),
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
            air_line: flight.airline,
            from: `${flight.departure_airport_name} (${flight.departure_code})`,
            to: `${flight.arrival_airport_name} (${flight.arrival_code})`,
            departure: formatDate(flight.departure_time),
            arrival: formatDate(flight.arrival_time),
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
        const [result] = await pool.execute<ResultSetHeader>(
            `INSERT INTO flights 
             (flight_number, type, airline, departure_location_id, arrival_location_id, 
              departure_time, arrival_time, price, seats_available)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.body.flight_number ?? null,
                req.body.type ?? null,
                req.body.air_line ?? null,
                req.body.departure_location_id ?? null,
                req.body.arrival_location_id ?? null,
                req.body.departure_time ?? null,
                req.body.arrival_time ?? null,
                req.body.price ?? null,
                req.body.seats_available ?? null,
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


// Route pour supprimer un vol
app.delete("/api/deleteflights/:id", async (req: Request, res: Response) => {
    const flightId = Number(req.params.id);
   

    if (isNaN(flightId)) {
        return res.status(400).json({ error: "ID de vol invalide" });
    }

    try {
        // 1. Vérification de l'existence du vol
        const [checkResult] = await pool.query<mysql.RowDataPacket[]>("SELECT id FROM flights WHERE id = ?", [flightId]);

        // Type guard explicite
        if (Array.isArray(checkResult)) {
            if (checkResult.length === 0) {
                return res.status(404).json({ error: "Vol non trouvé" });
            }
        }

        // 2. Suppression du vol
        const [deleteResult] = await pool.execute<mysql.OkPacket>("DELETE FROM flights WHERE id = ?", [flightId]);

        // Vérification du nombre de lignes affectées
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
    } finally {
        await pool.end();
    }
});





// -------------------- Send Ticket --------------------
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

app.post("/api/send-ticket", async (req, res) => {
  try {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: "Missing email data" });
    }

    const text = html.replace(/<[^>]+>/g, ""); // fallback texte

    await transporter.sendMail({
      from: 'info@lenational.org',
      to,
      subject,
      html,
      text,
    });
   res.json({ success: true });
  } catch (err) {
    console.error("Full sendMail error:", err); // ← log complet
    res.status(500).json({
      error: "Internal server error",
      details: err instanceof Error ? err.message : JSON.stringify(err),
    });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
