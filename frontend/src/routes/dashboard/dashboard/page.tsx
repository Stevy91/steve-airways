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

const DashboardPage = () => {
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
            <h1 className="title">Dashboard</h1>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Carte Revenu Total */}
                <div className="card-1">
                    <p className="card-title text-slate-50">REVENU TOTAL</p>
                    <div className="card-body transition-colors dark:bg-slate-950">
                        <div className="flex w-full items-center justify-between">
                            <p className="text-4xl font-bold text-slate-50 transition-colors dark:text-slate-50">
                                ${stats.totalRevenue.toLocaleString()}
                            </p>
                            <div className="h-[90px] w-[90px] items-center justify-center rounded-full bg-slate-50/20 p-6 text-blue-500 transition-colors dark:bg-blue-600/20 dark:text-blue-600">
                                <ShoppingCart
                                    color="#ffffff"
                                    size={40}
                                />
                            </div>
                        </div>
                        <p className="pt-7 text-xl font-bold text-slate-50 transition-colors dark:text-slate-50">Revenu total</p>
                    </div>
                </div>

                {/* Carte Réservations */}
                <div className="card-2">
                    <p className="card-title text-slate-50">RÉSERVATIONS</p>
                    <div className="card-body transition-colors dark:bg-slate-950">
                        <div className="flex w-full items-center justify-between">
                            <p className="text-4xl font-bold text-slate-50 transition-colors dark:text-slate-50">{stats.totalBookings}</p>
                            <div className="h-[90px] w-[90px] items-center justify-center rounded-full bg-slate-50/20 p-6 text-blue-500 transition-colors dark:bg-blue-600/20 dark:text-blue-600">
                                <Tags
                                    color="#ffffff"
                                    size={40}
                                />
                            </div>
                        </div>
                        <p className="pt-7 text-xl font-bold text-slate-50 transition-colors dark:text-slate-50">Total réservations</p>
                    </div>
                </div>

                {/* Carte Vols Disponibles */}
                <div className="card-3">
                    <p className="card-title text-slate-50">VOLS DISPONIBLES</p>
                    <div className="card-body transition-colors dark:bg-slate-950">
                        <div className="flex w-full items-center justify-between">
                            <p className="text-4xl font-bold text-slate-50 transition-colors dark:text-slate-50">{stats.flightsAvailable}</p>
                            <div className="h-[90px] w-[90px] items-center justify-center rounded-full bg-slate-50/20 p-6 text-blue-500 transition-colors dark:bg-blue-600/20 dark:text-blue-600">
                                <Plane
                                    color="#ffffff"
                                    size={40}
                                />
                            </div>
                        </div>
                        <p className="pt-7 text-xl font-bold text-slate-50 transition-colors dark:text-slate-50">Vols disponibles</p>
                    </div>
                </div>

                {/* Carte Valeur Moyenne */}
                <div className="card-4">
                    <p className="card-title text-slate-50">MOYENNE/RÉSERVATION</p>
                    <div className="card-body transition-colors dark:bg-slate-950">
                        <div className="flex w-full items-center justify-between">
                            <p className="text-4xl font-bold text-slate-50 transition-colors dark:text-slate-50">
                                ${stats.averageBookingValue.toFixed(2)}
                            </p>
                            <div className="h-[90px] w-[90px] items-center justify-center rounded-full bg-slate-50/20 p-6 text-blue-500 transition-colors dark:bg-blue-600/20 dark:text-blue-600">
                                <Gift
                                    color="#ffffff"
                                    size={40}
                                />
                            </div>
                        </div>
                        <p className="pt-7 text-xl font-bold text-slate-50 transition-colors dark:text-slate-50">Valeur moyenne</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-8">
                {/* Graphique Revenu par Mois */}
                <div className="card col-span-1 md:col-span-2 lg:col-span-4">
                    <div className="card-header border-b p-3">
                        <p className="card-title">Revenu par mois</p>
                    </div>
                    <div className="card-body p-0">
                        <ResponsiveContainer
                            width="100%"
                            height={300}
                        >
                            <AreaChart data={stats.revenueByMonth}>
                                <defs>
                                    <linearGradient
                                        id="colorTotal"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="5%"
                                            stopColor="#22a89f"
                                            stopOpacity={0.8}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor="#eb2525"
                                            stopOpacity={0}
                                        />
                                    </linearGradient>
                                </defs>
                                <Tooltip
                                    cursor={false}
                                    formatter={(value) => [`$${value}`, "Revenu"]}
                                    labelFormatter={(label) => `Mois: ${label}`}
                                />
                                <XAxis
                                    dataKey="name"
                                    strokeWidth={0}
                                    stroke={theme === "light" ? "#475569" : "#94a3b8"}
                                />
                                <YAxis
                                    strokeWidth={0}
                                    stroke={theme === "light" ? "#475569" : "#94a3b8"}
                                    tickFormatter={(value) => `$${value}`}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#2563eb"
                                    fillOpacity={1}
                                    fill="url(#colorTotal)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Graphique Répartition par Type de Vol */}
                <div className="card col-span-1 md:col-span-2 lg:col-span-4">
                    <div className="card-header border-b p-3">
                        <p className="card-title">Répartition par type de vol</p>
                    </div>
                    <div className="card-body p-0">
                        <ResponsiveContainer
                            width="100%"
                            height={300}
                        >
                            <PieChart
                                width={400}
                                height={400}
                            >
                                <Pie
                                    data={data}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                >
                                    {data.map((_, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number, name: string, payload: Payload<number, string>) => [
                                        `$${value.toFixed(2)}`,
                                        payload.payload?.name || name,
                                    ]}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-8">
                {/* Graphique Réservations par Statut */}
                <div className="card col-span-1 md:col-span-2 lg:col-span-4">
                    <div className="card-header border-b p-3">
                        <p className="card-title">Réservations par statut</p>
                    </div>
                    <div className="card-body p-0">
                        <ResponsiveContainer
                            width="100%"
                            height={300}
                        >
                            <BarChart data={stats.bookingsByStatus}>
                                <XAxis
                                    dataKey="name"
                                    strokeWidth={0}
                                    stroke={theme === "light" ? "#475569" : "#94a3b8"}
                                />
                                <YAxis
                                    strokeWidth={0}
                                    stroke={theme === "light" ? "#475569" : "#94a3b8"}
                                />
                                <Tooltip
                                    cursor={{ fill: "rgba(0, 0, 0, 0.1)" }}
                                    formatter={(value) => [value, "Nombre de réservations"]}
                                    labelFormatter={(label) => `Statut: ${label}`}
                                />
                                <Bar
                                    dataKey="value"
                                    fill="#8884d8"
                                    radius={[4, 4, 0, 0]}
                                >
                                    {stats.bookingsByFlightType.map((_, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Tableau des Dernières Réservations */}
                <div className="card col-span-1 md:col-span-2 lg:col-span-4">
                    <div className="card-header border-b p-3">
                        <p className="card-title">Dernières réservations</p>
                    </div>
                    <div className="card-body h-[300px] overflow-auto p-0">
                        <div className="relative h-[500px] w-full flex-shrink-0 overflow-auto rounded-none [scrollbar-width:_thin]">
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

            <Footer />
        </div>
    );
};

export default DashboardPage;
