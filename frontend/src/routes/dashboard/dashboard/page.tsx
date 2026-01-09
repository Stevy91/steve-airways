import { useState, useEffect } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";
import { useTheme } from "../../../contexts/theme-context";
import { ShoppingCart, Gift, Tags, Plane, Search, DollarSign, TrendingUp } from "lucide-react";
import { Footer } from "../../../layouts/footer";

import type { Payload } from "recharts/types/component/DefaultTooltipContent";
import { useAuth } from "../../../hooks/useAuth";

// Types pour les données
type Booking = {
    id: number;
    booking_reference: string;
    total_price: number;
    currency: string;
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

interface DashboardStats2 {
    totalRevenueUSD: number;
    totalRevenueHTG: number;
    totalBookings: number;
    flightsAvailable: number;
    averageBookingValueUSD: number;
    averageBookingValueHTG: number;
    bookingsByStatus: { name: string; value: number }[];
    revenueByMonth: { name: string; usd: number; htg: number }[];
    bookingsByFlightType: { name: string; value: number }[];
    recentBookings: Booking[];
}

interface FilteredStats {
    totalRevenueUSD: number;
    totalRevenueHTG: number;
    totalBookings: number;
    flightsAvailable: number;
    averageBookingValueUSD: number;
    averageBookingValueHTG: number;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const DashboardPage = () => {
    const { theme } = useTheme();
    const [stats, setStats] = useState<DashboardStats2 | null>(null);
    const [filteredStats, setFilteredStats] = useState<FilteredStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [searchLoading, setSearchLoading] = useState(false);

    
    useAuth();

    // Fonction pour formater la date en YYYY-MM-DD
    const formatDateForInput = (date: Date) => {
        return date.toISOString().split('T')[0];
    };

    // Fonction pour initialiser les dates par défaut
    const initializeDefaultDates = () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        
        return {
            start: formatDateForInput(start),
            end: formatDateForInput(end)
        };
    };

    // Initialiser les dates par défaut au chargement du composant
    useEffect(() => {
        const defaultDates = initializeDefaultDates();
        setStartDate(defaultDates.start);
        setEndDate(defaultDates.end);
        
        // Charger les données globales
        fetchDashboardData();
    }, []);

    // Fonction pour charger les données globales (sans filtre de date)
    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            const response = await fetch("https://steve-airways.onrender.com/api/dashboard-stats");

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();

            setStats({
                totalRevenueUSD: data.totalRevenueUSD || 0,
                totalRevenueHTG: data.totalRevenueHTG || 0,
                totalBookings: data.totalBookings || 0,
                flightsAvailable: data.flightsAvailable || 0,
                averageBookingValueUSD: data.averageBookingValueUSD || 0,
                averageBookingValueHTG: data.averageBookingValueHTG || 0,
                bookingsByStatus: data.bookingsByStatus || [],
                revenueByMonth: data.revenueByMonth || [],
                bookingsByFlightType: data.bookingsByFlightType || [],
                recentBookings: data.recentBookings || [],
            });

            // Initialiser les stats filtrées avec les mêmes données globales
            setFilteredStats({
                totalRevenueUSD: data.totalRevenueUSD || 0,
                totalRevenueHTG: data.totalRevenueHTG || 0,
                totalBookings: data.totalBookings || 0,
                flightsAvailable: data.flightsAvailable || 0,
                averageBookingValueUSD: data.averageBookingValueUSD || 0,
                averageBookingValueHTG: data.averageBookingValueHTG || 0,
            });
        } catch (err) {
            console.error("Erreur de récupération des données:", err);
            setError("Impossible de charger les données du dashboard");
        } finally {
            setLoading(false);
        }
    };

    // Fonction pour charger les données filtrées par date
    const fetchFilteredData = async (start: string, end: string) => {
        try {
            setSearchLoading(true);

            // Construire l'URL avec les paramètres de date
            let url = "https://steve-airways.onrender.com/api/dashboard-stats";
            const params = new URLSearchParams();
            
            params.append('startDate', start);
            params.append('endDate', end);
            
            url += `?${params.toString()}`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();

            // Mettre à jour seulement les stats filtrées
            setFilteredStats({
                totalRevenueUSD: data.totalRevenueUSD || 0,
                totalRevenueHTG: data.totalRevenueHTG || 0,
                totalBookings: data.totalBookings || 0,
                flightsAvailable: data.flightsAvailable || 0,
                averageBookingValueUSD: data.averageBookingValueUSD || 0,
                averageBookingValueHTG: data.averageBookingValueHTG || 0,
            });
        } catch (err) {
            console.error("Erreur de récupération des données filtrées:", err);
            alert("Impossible de charger les données filtrées");
        } finally {
            setSearchLoading(false);
        }
    };

    const handleSearch = () => {
        if (!startDate || !endDate) {
            alert("Veuillez sélectionner les deux dates");
            return;
        }
        
        if (new Date(startDate) > new Date(endDate)) {
            alert("La date de début ne peut pas être après la date de fin");
            return;
        }
        
        fetchFilteredData(startDate, endDate);
    };

    const handleReset = () => {
        const defaultDates = initializeDefaultDates();
        setStartDate(defaultDates.start);
        setEndDate(defaultDates.end);
        // Recharger les données globales
        fetchDashboardData();
    };

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

    if (!stats || !filteredStats) {
        return null;
    }

    return (
        <div className="flex flex-col gap-y-4">
            <h1 className="title">Dashboard</h1>

            {/* Filtres de date */}
            <div className="card mb-4">
                <div className="card-body">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                            <div className="flex flex-col">
                                <label htmlFor="startDate" className="mb-2 font-medium text-gray-700">
                                    Date de début
                                </label>
                                <input
                                    type="date"
                                    id="startDate"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                            
                            <div className="flex flex-col">
                                <label htmlFor="endDate" className="mb-2 font-medium text-gray-700">
                                    Date de fin
                                </label>
                                <input
                                    type="date"
                                    id="endDate"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                        </div>
                        
                        <div className="flex gap-2">
                            <button
                                onClick={handleSearch}
                                disabled={searchLoading}
                                className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-white hover:bg-amber-600 disabled:opacity-50"
                            >
                                <Search size={18} />
                                {searchLoading ? "Recherche..." : "Rechercher"}
                            </button>
                            
                            <button
                                onClick={handleReset}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                            >
                                Réinitialiser
                            </button>
                        </div>
                    </div>
                    
                    {startDate && endDate && (
                        <div className="mt-3 text-sm text-gray-600">
                            Période sélectionnée : du {new Date(startDate).toLocaleDateString('fr-FR')} au {new Date(endDate).toLocaleDateString('fr-FR')}
                        </div>
                    )}
                </div>
            </div>

            {/* Cartes de statistiques (affectées par la recherche) */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Carte Revenu Total USD */}
                <div className="card-1">
                    <p className="card-title text-slate-50">REVENU TOTAL USD</p>
                    <div className="card-body transition-colors dark:bg-slate-950">
                        <div className="flex w-full items-center justify-between">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <DollarSign size={20} className="text-green-400" />
                                    <p className="text-3xl font-bold text-slate-50 transition-colors dark:text-slate-50">
                                        ${filteredStats.totalRevenueUSD.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                    </p>
                                </div>
                                <p className="mt-2 text-sm text-slate-200">Revenu en dollars américains</p>
                            </div>
                            <div className="h-[90px] w-[90px] items-center justify-center rounded-full bg-slate-50/20 p-6 text-blue-500 transition-colors dark:bg-blue-600/20 dark:text-blue-600">
                                <ShoppingCart
                                    color="#ffffff"
                                    size={40}
                                />
                            </div>
                        </div>
                        <p className="pt-4 text-xl font-bold text-slate-50 transition-colors dark:text-slate-50">Revenu total USD</p>
                    </div>
                </div>

                {/* Carte Revenu Total HTG */}
                <div className="card-2">
                    <p className="card-title text-slate-50">REVENU TOTAL HTG</p>
                    <div className="card-body transition-colors dark:bg-slate-950">
                        <div className="flex w-full items-center justify-between">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={20} className="text-yellow-400" />
                                    <p className="text-3xl font-bold text-yellow-400 transition-colors dark:text-yellow-400">
                                        {filteredStats.totalRevenueHTG.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} HTG
                                    </p>
                                </div>
                                <p className="mt-2 text-sm text-slate-200">Revenu en gourdes haïtiennes</p>
                            </div>
                            <div className="h-[90px] w-[90px] items-center justify-center rounded-full bg-slate-50/20 p-6 text-blue-500 transition-colors dark:bg-blue-600/20 dark:text-blue-600">
                                <Tags
                                    color="#ffffff"
                                    size={40}
                                />
                            </div>
                        </div>
                        <p className="pt-4 text-xl font-bold text-slate-50 transition-colors dark:text-slate-50">Revenu total HTG</p>
                    </div>
                </div>

                {/* Carte Vols Disponibles */}
                <div className="card-3">
                    <p className="card-title text-slate-50">VOLS DISPONIBLES</p>
                    <div className="card-body transition-colors dark:bg-slate-950">
                        <div className="flex w-full items-center justify-between">
                            <p className="text-4xl font-bold text-slate-50 transition-colors dark:text-slate-50">{filteredStats.flightsAvailable}</p>
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

                {/* Carte Réservations */}
                <div className="card-4">
                    <p className="card-title text-slate-50">RÉSERVATIONS</p>
                    <div className="card-body transition-colors dark:bg-slate-950">
                        <div className="flex w-full items-center justify-between">
                            <div className="flex flex-col">
                                <p className="text-4xl font-bold text-slate-50 transition-colors dark:text-slate-50">{filteredStats.totalBookings}</p>
                                <p className="mt-2 text-sm text-slate-200">Total des réservations</p>
                            </div>
                            <div className="h-[90px] w-[90px] items-center justify-center rounded-full bg-slate-50/20 p-6 text-blue-500 transition-colors dark:bg-blue-600/20 dark:text-blue-600">
                                <Gift
                                    color="#ffffff"
                                    size={40}
                                />
                            </div>
                        </div>
                        <p className="pt-4 text-xl font-bold text-slate-50 transition-colors dark:text-slate-50">Nombre de réservations</p>
                    </div>
                </div>
            </div>

            {/* Graphiques (données globales, non affectées par la recherche) */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-8">
                {/* Graphique Revenu par Mois (USD et HTG) */}
                <div className="card col-span-1 md:col-span-2 lg:col-span-4">
                    <div className="card-header border-b p-3">
                        <p className="card-title">Revenu par mois (USD & HTG)</p>
                    </div>
                    <div className="card-body p-0">
                        <ResponsiveContainer
                            width="100%"
                            height={300}
                        >
                            <AreaChart data={stats.revenueByMonth}>
                                <defs>
                                    {/* Gradient pour USD */}
                                    <linearGradient
                                        id="colorUSD"
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
                                            stopColor="#22a89f"
                                            stopOpacity={0}
                                        />
                                    </linearGradient>
                                    
                                    {/* Gradient pour HTG */}
                                    <linearGradient
                                        id="colorHTG"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="5%"
                                            stopColor="#FFBB28"
                                            stopOpacity={0.8}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor="#FFBB28"
                                            stopOpacity={0}
                                        />
                                    </linearGradient>
                                </defs>
                                <Tooltip
                                    cursor={false}
                                    formatter={(value: number, name: string) => {
                                        if (name === "USD") {
                                            return [`$${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, "USD"];
                                        } else {
                                            return [`${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} HTG`, "HTG"];
                                        }
                                    }}
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
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="usd"
                                    name="USD"
                                    stroke="#22a89f"
                                    strokeWidth={2}
                                    fillOpacity={0.6}
                                    fill="url(#colorUSD)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="htg"
                                    name="HTG"
                                    stroke="#FFBB28"
                                    strokeWidth={2}
                                    fillOpacity={0.6}
                                    fill="url(#colorHTG)"
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
                                    data={stats.bookingsByFlightType}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={(entry) => `${entry.name}: ${entry.value}`}
                                >
                                    {stats.bookingsByFlightType.map((_, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number, name: string) => [
                                        `${value} réservations`,
                                        name,
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
                                    {stats.bookingsByStatus.map((_, index) => (
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
                                        <th className="table-head text-center">Type Vol</th>
                                        <th className="table-head text-center">Email</th>
                                        <th className="table-head text-center">Montant</th>
                                        <th className="table-head text-center">Devise</th>
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
                                                <p className="text-sky-700">{booking.type_vol === "plane" ? "Avion" : "Hélicoptère"}</p>
                                            </td>
                                            <td className="table-cell text-center">{booking.contact_email}</td>
                                            <td className="table-cell text-center">
                                                {booking.currency === 'USD' ? '$' : ''}
                                                {booking.total_price.toFixed(2)}
                                                {booking.currency === 'HTG' ? ' HTG' : ''}
                                            </td>
                                            <td className="table-cell text-center">
                                                <span className={`px-2 py-1 rounded ${booking.currency === 'USD' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                                    {booking.currency}
                                                </span>
                                            </td>
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

            {/* <Footer /> */}
        </div>
    );
};

export default DashboardPage;