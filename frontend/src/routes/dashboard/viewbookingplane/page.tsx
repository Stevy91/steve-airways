import { useState, useEffect } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { useTheme } from "../../../contexts/theme-context";
import { ShoppingCart, Gift, Tags, Plane } from "lucide-react";
import { Footer } from "../../../layouts/footer";

import type { Payload } from "recharts/types/component/DefaultTooltipContent";

// Types pour les données
type Booking = {
    id: number;
    booking_reference: string;
    total_price: number;
    status: string;
    created_at: string;
    updated_at: string;
    passenger_count: number;
    contact_email: string;
    type_vol: string;
    type_v: string;
};

interface ChartData {
    name: string;
    value: number;
}

const data: ChartData[] = [
    { name: "Avion", value: 400 },
    { name: "Hélicoptère", value: 300 },
];

interface DashboardStats {
    totalRevenue: number;
    totalBookings: number;
    flightsAvailable: number;
    averageBookingValue: number;
    bookingsByStatus: { name: string; value: number }[];
    revenueByMonth: { name: string; total: number }[];
    bookingsByFlightType: { name: string; value: number }[];
    recentBookings: Booking[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const ViewBookingPlane = () => {
    const { theme } = useTheme();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);

                const response = await fetch("https://steve-airways-production.up.railway.app/api/dashboard-stats");

                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }

                const data = await response.json();

                setStats({
                    totalRevenue: data.totalRevenue || 0,
                    totalBookings: data.totalBookings || 0,
                    flightsAvailable: data.flightsAvailable || 0,
                    averageBookingValue: data.averageBookingValue || 0,
                    bookingsByStatus: data.bookingsByStatus || [],
                    revenueByMonth: data.revenueByMonth || [],
                    bookingsByFlightType: data.bookingsByFlightType || [],
                    recentBookings: data.recentBookings || [],
                });
            } catch (err) {
                console.error("Erreur de récupération des données:", err);
                setError("Impossible de charger les données du dashboard");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col gap-y-4">
                <h1 className="title">Dashboard</h1>
                <div className="flex h-64 items-center justify-center">
                    <p>Chargement des données...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col gap-y-4">
                <h1 className="title">Dashboard</h1>
                <div className="flex h-64 items-center justify-center">
                    <p className="text-red-500">{error}</p>
                </div>
            </div>
        );
    }

    if (!stats) {
        return null;
    }

    return (
        <div className="flex flex-col gap-y-4">
            <h1 className="title">View Booking Air Plane</h1>



                {/* Tableau des Dernières Réservations */}
                <div className="card col-span-1 md:col-span-2 lg:col-span-4">
                 
                    <div className="card-body h-[300px] overflow-auto p-0">
                        <div className="relative  w-full flex-shrink-0 overflow-auto rounded-none [scrollbar-width:_thin]">
                            <table className="table">
                                <thead className="table-header">
                                    <tr className="table-row ">
                                        <th className="table-head text-center">Référence</th>
                                        <th className="table-head text-center">Type</th>
                                        <th className="table-head text-center">Type Vol</th>
                                        <th className="table-head text-center">Email</th>
                                        <th className="table-head text-center">Total</th>
                                        <th className="table-head text-center">Passagers</th>
                                        <th className="table-head text-center">Statut</th>
                                        <th className="table-head text-center">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="table-body">
                                    {stats.recentBookings.map((booking) => (
                                        <tr
                                            key={booking.id}
                                            className="table-row"
                                        >
                                            <td className="table-cell text-center">
                                                <p className="text-sky-700">{booking.booking_reference}</p>
                                            </td>
                                            <td className="table-cell text-center">
                                                <p className="text-sky-700">{booking.type_vol}</p>
                                            </td>
                                            <td className="table-cell text-center">
                                                <p className="text-sky-700">{booking.type_v}</p>
                                            </td>
                                            <td className="table-cell text-center">{booking.contact_email}</td>
                                            <td className="table-cell text-center">${booking.total_price}</td>
                                            <td className="table-cell text-center">{booking.passenger_count}</td>
                                            <td className="table-cell text-center">
                                                <p
                                                    className={`rounded-3xl px-2 pb-1 text-center text-slate-50 ${
                                                        booking.status === "confirmed"
                                                            ? "bg-green-500"
                                                            : booking.status === "pending"
                                                              ? "bg-yellow-500"
                                                              : "bg-red-500"
                                                    }`}
                                                >
                                                    {booking.status}
                                                </p>
                                            </td>
                                            <td className="table-cell text-center">{new Date(booking.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
        

        </div>
    );
};

export default ViewBookingPlane;
