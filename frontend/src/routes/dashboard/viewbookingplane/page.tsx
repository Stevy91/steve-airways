import { useState, useEffect } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { useTheme } from "../../../contexts/theme-context";
import { ShoppingCart, Gift, Tags, Plane, Trash2, Eye } from "lucide-react";
import { Footer } from "../../../layouts/footer";

import type { Payload } from "recharts/types/component/DefaultTooltipContent";
import BookingDetailsModal, { BookingDetails } from "../../../components/BookingDetailsModal";

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
    const [open, setOpen] = useState(false);

    const [selectedBooking, setSelectedBooking] = useState<BookingDetails | undefined>(undefined);

const handleViewDetails = async (id: number) => {
  try {
    const res = await fetch(`https://steve-airways-production.up.railway.app/api/booking-plane-pop/${id}`);

    if (!res.ok) {
      const text = await res.text();
      console.error(`Erreur API (${res.status}):`, text);
      alert("Réservation introuvable ou erreur serveur");
      return;
    }

    const apiData = await res.json();
    const mapped = mapApiBookingToBookingDetails(apiData);
    setSelectedBooking(mapped);
    setOpen(true);
  } catch (err) {
    console.error("Erreur fetch booking:", err);
    alert("Impossible de récupérer les détails de la réservation");
  }
};



    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);

                const response = await fetch("https://steve-airways-production.up.railway.app/api/booking-plane");

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
                <div className="card-body overflow-auto p-0">
                    <div className="relative w-full flex-shrink-0 overflow-auto rounded-none [scrollbar-width:_thin]">
                        <table className="table">
                            <thead className="table-header">
                                <tr className="table-row">
                                    <th className="table-head text-center">Booking Reference</th>
                                    <th className="table-head text-center">Type</th>
                                    <th className="table-head text-center">Type Vol</th>
                                    <th className="table-head text-center">Contact Email</th>
                                    <th className="table-head text-center">Total Price</th>
                                    <th className="table-head text-center">Passengers</th>
                                    <th className="table-head text-center">Payment</th>
                                    <th className="table-head text-center">Booking Date</th>
                                    <th className="table-head text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {stats.recentBookings.map((booking) => (
                                    <tr
                                        key={booking.id}
                                        className="table-row"
                                    >
                                        <td className="table-cell text-center">
                                            <p>{booking.booking_reference}</p>
                                        </td>
                                        <td className="table-cell text-center">
                                            <p>{booking.type_vol}</p>
                                        </td>
                                        <td className="table-cell text-center">
                                            <span
                                                className={`rounded-3xl text-center ${
                                                    booking.type_v === "roundtrip"
                                                        ? "bg-blue-900 px-4 pb-1 text-gray-50"
                                                        : booking.type_v === "onway"
                                                          ? "border-2 px-2"
                                                          : "bg-red-600"
                                                }`}
                                            >
                                                {booking.type_v === "roundtrip" ? "Round-Trip" : "On-Way"}
                                            </span>
                                        </td>
                                        <td className="table-cell text-center">{booking.contact_email}</td>
                                        <td className="table-cell text-center">${booking.total_price}</td>
                                        <td className="table-cell text-center">{booking.passenger_count}</td>
                                        <td className="table-cell text-center">
                                            <span
                                                className={`rounded-3xl text-center ${
                                                    booking.status === "confirmed"
                                                        ? "bg-green-700 px-4 text-gray-50"
                                                        : booking.status === "pending"
                                                          ? "border-2 px-2"
                                                          : "bg-red-600"
                                                }`}
                                            >
                                                {booking.status === "confirmed" ? "Paid" : booking.status === "pending" ? "Unpaid" : ""}
                                            </span>
                                        </td>
                                        <td className="table-cell text-center">{new Date(booking.created_at).toLocaleDateString()}</td>
                                        <td className="table-cell text-center">
                                            

                                             <button
                                               onClick={() => {handleViewDetails(booking.id)
                                                 setOpen(true);}}
                                                className="flex w-full gap-2 rounded-lg p-2 text-center hover:bg-amber-500"
                                            >
                                                <Eye className="h-6 w-4" /> <span>View Details</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {/* Popup modal */}

                        <BookingDetailsModal
                            open={open}
                            data={selectedBooking}
                            onClose={() => setOpen(false)}
                            onSave={(updated) => {
                                console.log("Saving...", updated.reference);
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
const mapApiBookingToBookingDetails = (apiData: any): BookingDetails => ({
  reference: apiData.booking_reference,
  contactEmail: apiData.contact_email,
  bookedOn: new Date(apiData.created_at).toLocaleDateString(),
  paymentStatus: apiData.status.charAt(0).toUpperCase() + apiData.status.slice(1), // 'confirmed' => 'Confirmed'
  totalPrice: `$${apiData.total_price}`,
  typeVol: apiData.type_vol,
  typeV: apiData.type_v,
  adminNotes: apiData.admin_notes || "",

  // Passagers
  passengers: apiData.passengers.map((p: any) => ({
    name: [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" "),
    email: p.email,
    dob: p.date_of_birth,
  })),

  // Vols
  flights: apiData.flights.map((f: any) => ({
    code: f.code, // flight_number
    from: f.departure_airport_name,
    to: f.arrival_airport_name,
    date: new Date(f.date).toLocaleString(), // departure_time
  })),
});


export default ViewBookingPlane;
