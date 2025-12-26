import { useState, useEffect } from "react";
import { Eye } from "lucide-react";
import BookingDetailsModal, { BookingDetails } from "../../../components/BookingDetailsModal";
import { useTheme } from "../../../contexts/theme-context";
import { useAuth } from "../../../hooks/useAuth";

// Types
type Booking = {
    id: number;
    booking_reference: string;
    payment_intent_id: string;
    total_price: number;
    status: string;
    created_at: string;
    updated_at: string;
    passenger_count: number;
    contact_email: string;
    payment_method: string;
    adminNotes: string;
    type_vol: string;
    type_v: string;
    created_by_name?: string; 
    created_by_email?: string;
};

const ViewBookingHelico = () => {
    const { theme } = useTheme();
    const { isAdmin, isOperateur } = useAuth();

    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<BookingDetails | undefined>(undefined);

    // Champs filtres
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [transactionType, setTransactionType] = useState("");
    const [status, setStatus] = useState("");
    const [name, setName] = useState("");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentBookings = stats ? stats.recentBookings.slice(indexOfFirstRow, indexOfLastRow) : [];
    const totalPages = stats ? Math.ceil(stats.recentBookings.length / rowsPerPage) : 1;

    // Charger liste par défaut = date du jour
    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`https://steve-airways.onrender.com/api/booking-helico`);
            const data = await response.json();
            setStats(data);
        } catch (err) {
            setError("Impossible de charger les données");
        } finally {
            setLoading(false);
        }
    };

    // API recherche
    

    const handleSearch = async () => {
    try {
        setLoading(true);

        const url = new URL("https://steve-airways.onrender.com/api/booking-helico-search");
        if (startDate) url.searchParams.append("startDate", startDate);
        if (endDate) url.searchParams.append("endDate", endDate);
        if (transactionType) url.searchParams.append("transactionType", transactionType);
        if (status) url.searchParams.append("status", status);
        if (name) url.searchParams.append("name", name);

        const res = await fetch(url.toString());
        const data = await res.json();

        setStats({ recentBookings: data.bookings });
        setCurrentPage(1);
    } catch (err) {
        alert("Erreur lors de la recherche");
    } finally {
        setLoading(false);
    }
};


    // API EXPORT EXCEL
    const downloadExcel = () => {
        let url =
            "https://steve-airways.onrender.com/api/booking-helico-export?" +
            `startDate=${startDate}&endDate=${endDate}&transactionType=${transactionType}&status=${status}`;

        window.open(url, "_blank");
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Voir détails
    const handleViewDetails = async (id: number) => {
        try {
            const res = await fetch(`https://steve-airways.onrender.com/api/booking-plane-pop/${id}`);
            const apiData = await res.json();
            const mapped = mapApiBookingToBookingDetails(apiData);
            setSelectedBooking(mapped);
            setOpen(true);
        } catch (err) {
            alert("Impossible de récupérer les détails");
        }
    };

    if (loading) {
        return (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    if (error) {
        return <p className="text-red-500">{error}</p>;
    }

    if (!stats) return null;

    return (
        <div className="flex flex-col gap-y-4">
            <h1 className="title">View Booking Helico</h1>
            {/* Filtres */}

            {(isAdmin || isOperateur) && (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                            <div className="flex flex-col">
                                <label className="mb-1 font-medium text-gray-700">Start date</label>
                                <input
                                    type="date"
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="rounded border px-4 py-2 text-sm"
                                />
                            </div>

                            <div className="flex flex-col">
                                <label className="mb-1 font-medium text-gray-700">End date</label>
                                <input
                                    type="date"
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="rounded border px-4 py-2 text-sm"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="mb-1 font-medium text-gray-700">Name</label>
                                <input
                                    type="text"
                                    placeholder="Client Name"
                                    onChange={(e) => setName(e.target.value)}
                                    className="rounded border px-4 py-2 text-sm"
                                />
                            </div>
                            
                            <div className="flex flex-col">
                                <label className="mb-1 font-medium text-gray-700">Status</label>
                                <select
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="rounded border px-4 py-2 text-sm"
                                >
                                    <option value="">All</option>
                                    <option value="confirmed">Paid</option>
                                    <option value="pending">UnPaid</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>

                            <div className="flex flex-col">
                                <label className="mb-1 font-medium text-gray-700">Transaction type</label>
                                <select
                                    onChange={(e) => setTransactionType(e.target.value)}
                                    className="rounded border px-4 py-2 text-sm"
                                >
                                    <option value="">All</option>
                                    <option value="cash">Cash</option>
                                    <option value="card">Bank Card</option>
                                    <option value="cheque">Check</option>
                                    <option value="virement">bank transfer</option>
                                    <option value="transfert">Transfer</option>

                                    
                                </select>
                            </div>

                            <div className="flex flex-col">
                                <label className="mb-7 font-medium text-gray-700"></label>
                                <button
                                    type="button"
                                    onClick={handleSearch}
                                    className="rounded-md bg-amber-500 px-4 pb-1 pt-2 text-white hover:bg-amber-600"
                                >
                                    Search
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={downloadExcel}
                                className="rounded-md w-24 bg-slate-200 border-2 border-slate-50 px-4 py-2 text-slate-700 hover:bg-amber-600 hover:text-slate-50"
                            >
                                Excel
                            </button>
                        </div>
            )}
            {/* TABLEAU BOOKINGS */}
            <div className="card col-span-1 md:col-span-2 lg:col-span-4">
                <div className="card-body overflow-auto p-0">
                    <div className="relative w-full flex-shrink-0 overflow-auto">
                        <table className="table">
                            <thead className="table-header">
                                <tr className="table-row">
                                    <th className="table-head text-center">Booking Reference</th>
                                    <th className="table-head text-center">Payment Reference</th>
                                    <th className="table-head text-center">Flight Type</th>
                                    <th className="table-head text-center">Trip Type</th>
                                    <th className="table-head text-center">Contact Email</th>
                                    <th className="table-head text-center">Total Price</th>
                                    <th className="table-head text-center">Passager</th>
                                    <th className="table-head text-center">Payment</th>
                                    <th className="table-head text-center">Method</th>
                                    <th className="table-head text-center">Created by</th>
                                    <th className="table-head text-center">Date</th>
                                    <th className="table-head text-center">Action</th>
                                </tr>
                            </thead>

                            <tbody className="table-body">
                                {currentBookings.map((booking) => (
                                    <tr key={booking.id} className="table-row">
                                        <td className="table-cell text-center">{booking.booking_reference}</td>
                                        <td className="table-cell text-center">{booking.payment_intent_id}</td>
                                        <td className="table-cell text-center">{booking.type_vol}</td>

                                        <td className="table-cell text-center">
                                            <span
                                                className={`rounded-3xl ${
                                                    booking.type_v === "roundtrip"
                                                        ? "bg-blue-900 px-4 pb-1 text-gray-50"
                                                        : booking.type_v === "onway"
                                                        ? "border-2 px-2"
                                                        : "bg-red-600"
                                                }`}
                                            >
                                                {booking.type_v === "roundtrip"
                                                    ? "Round-Trip"
                                                    : "On-Way"}
                                            </span>
                                        </td>

                                        <td className="table-cell text-center">{booking.contact_email}</td>
                                        <td className="table-cell text-center">${booking.total_price}</td>
                                        <td className="table-cell text-center">{booking.passenger_count}</td>

                                        <td className="table-cell text-center">
                                            <span
                                                className={`rounded-3xl ${
                                                    booking.status === "confirmed"
                                                        ? "bg-green-100 px-5 text-green-800 ring-1 ring-green-200"
                                                        : booking.status === "pending"
                                                        ? "bg-yellow-100 px-3 text-yellow-800 ring-1 ring-yellow-200"
                                                        : "bg-red-100 px-2 text-red-800 ring-1 ring-red-200"
                                                }`}
                                            >
                                                {booking.status === "confirmed"
                                                    ? "Paid"
                                                    : booking.status === "pending"
                                                    ? "Unpaid"
                                                    : "Cancelled"}
                                            </span>
                                        </td>

                                        <td className="table-cell text-center">{booking.payment_method}</td>
                                        <td className="table-cell text-center">{booking.created_by_name || "Client Online"}</td>

                                        <td className="table-cell text-center">
                                            {new Date(booking.created_at).toLocaleDateString()}
                                        </td>

                                        <td className="table-cell text-center">
                                            {/* {(isAdmin || isOperateur) && (
                                                <button
                                                    className="flex w-full gap-2 rounded-lg p-2 hover:bg-amber-500"
                                                    onClick={() => handleViewDetails(booking.id)}
                                                >
                                                    <Eye className="h-6 w-4" /> View Details
                                                </button>
                                            )} */}

                                            <button
                                                    className="flex w-full gap-2 rounded-lg p-2 hover:bg-amber-500"
                                                    onClick={() => handleViewDetails(booking.id)}
                                                >
                                                    <Eye className="h-6 w-4" /> View Details
                                                </button>

                                            
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* PAGINATION */}
                        <div className="mt-4 flex justify-center gap-2">
                            <span>
                                Page {currentPage} / {totalPages}
                            </span>

                            <button
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="rounded bg-amber-500 px-3 py-1 text-sm text-gray-50 hover:bg-amber-600 disabled:bg-gray-200"
                            >
                                Previous
                            </button>

                            <button
                                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="rounded bg-amber-500 px-3 py-1 text-sm text-gray-50 hover:bg-amber-600 disabled:bg-gray-200"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>

                {/* MODAL */}
                <BookingDetailsModal
                    open={open}
                    data={selectedBooking}
                    onClose={() => setOpen(false)}
                    onSave={() => {}}
                    bookingModify={fetchDashboardData}
                  
                />
            </div>
        </div>
    );
};

const mapApiBookingToBookingDetails = (apiData: any): BookingDetails => {
    return {
        reference: apiData.booking_reference,
        contactEmail: apiData.contact_email,
        bookedOn: new Date(apiData.created_at).toLocaleDateString(),
        paymentStatus: apiData.status,
        payment_method: apiData.payment_method,
        totalPrice: `${apiData.total_price}`,
        typeVol: apiData.type_vol,
        typeV: apiData.type_v,
        adminNotes: apiData.adminNotes || "",

        passengers: apiData.passengers.map((p: any) => ({
            name: [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" "),
            email: p.email,
            dob: p.date_of_birth,
            firstName: p.first_name,
            lastName: p.last_name,
            middleName: p.middle_name,
            gender: p.gender,
            title: p.title,
            phone: p.phone,
            nationality: p.nationality,
            nom_urgence: p.nom_urgence,
            email_urgence: p.email_urgence,
            tel_urgence: p.tel_urgence,
            country: p.country,
            address: p.address,
            dateOfBirth: p.dateOfBirth,
        })),

        flights: apiData.flights.map((f: any) => ({
            code: f.code,
            from: f.departure_airport_name,
            to: f.arrival_airport_name,
            date: new Date(f.date).toLocaleString(),
            arrival_date: new Date(f.arrival_date).toLocaleString(),
        })),
    };
};

export default ViewBookingHelico;
