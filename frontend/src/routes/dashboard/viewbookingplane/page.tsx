import { useState, useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon, Eye, Printer } from "lucide-react";
import BookingDetailsModal, { BookingDetails } from "../../../components/BookingDetailsModal";
import ConfirmPaymentModal from "../../../components/ConfirmPaymentModal";
import CancelBookingModal from "../../../components/CancelBookingModal";
import { useTheme } from "../../../contexts/theme-context";
import { useAuth } from "../../../hooks/useAuth";

// Types
type Booking = {
    id: number;
    booking_reference: string;
    payment_intent_id: string;
    total_price: number;
    currency: string;
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
    first_name?: string;
    last_name?: string;
};

const ViewBookingPlane = () => {
    const { theme } = useTheme();

    const { user, loading: authLoading, isAdmin, hasPermission, permissions } = useAuth();

    // Vérifier plusieurs permissions
    const rapport = isAdmin || hasPermission("rapport");

    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<BookingDetails | undefined>(undefined);

    // Modal — Confirmer paiement
    const [confirmModal, setConfirmModal] = useState<{ open: boolean; id: number; ref: string; pax: number; price: number; currency: string }>({
        open: false, id: 0, ref: "", pax: 0, price: 0, currency: "USD"
    });

    // Modal — Annuler réservation
    const [cancelModal, setCancelModal] = useState<{ open: boolean; id: number; ref: string }>({
        open: false, id: 0, ref: ""
    });

    // Champs filtres
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [transactionType, setTransactionType] = useState("");
    const [status, setStatus] = useState("");
    const [currency, setCurrency] = useState("");
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
            const response = await fetch(`https://steve-airways.onrender.com/api/booking-plane`);
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

            const url = new URL("https://steve-airways.onrender.com/api/booking-plane-search");
            if (startDate) url.searchParams.append("startDate", startDate);
            if (endDate) url.searchParams.append("endDate", endDate);
            if (transactionType) url.searchParams.append("transactionType", transactionType);
            if (status) url.searchParams.append("status", status);
            if (currency) url.searchParams.append("currency", currency);
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
            "https://steve-airways.onrender.com/api/booking-plane-export?" +
            `startDate=${startDate}&endDate=${endDate}&transactionType=${transactionType}&currency=${currency}&status=${status}&name=${name}`;

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

    // Confirmer le paiement via modal
    const handleConfirmPayment = async (paymentReference: string) => {
        const { id, ref } = confirmModal;
        const token = localStorage.getItem("token") || localStorage.getItem("authToken");
        const res = await fetch(`https://steve-airways.onrender.com/api/bookings/${id}/confirm-payment`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ paymentReference: paymentReference || undefined }),
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(
                data.error + (data.details ? `\n${data.details}` : "") +
                (data.flightNumber ? `\nVol: ${data.flightNumber}` : "")
            );
        }
        const emailMsg = data.emails_sent > 0
            ? `E-billet envoyé à ${data.emails_sent} adresse(s)`
            : "Email non envoyé — vérifiez l'adresse";
        alert(`✅ Paiement confirmé — ${ref}\n• ${data.seats_decremented} siège(s) déduits\n• ${emailMsg}`);
        setConfirmModal(m => ({ ...m, open: false }));
        fetchDashboardData();
    };

    // Annuler une réservation pending via modal
    const handleCancelBooking = async (reason: string) => {
        const { id, ref } = cancelModal;
        const token = localStorage.getItem("token") || localStorage.getItem("authToken");
        const res = await fetch(`https://steve-airways.onrender.com/api/bookings/${id}/cancel-pending`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ cancelReason: reason || undefined }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur serveur");
        alert(`Réservation ${ref} annulée.`);
        setCancelModal(m => ({ ...m, open: false }));
        fetchDashboardData();
    };

    // Imprimer le reçu de paiement
    const handlePrintReceipt = async (reference: string, bk: any) => {
        try {
            // Fetch full booking details (public endpoint)
            const res = await fetch(`https://steve-airways.onrender.com/api/bookings/${reference}`);
            const data = await res.json();
            const detail = data.booking || {};
            const passengers: any[] = detail.passengers || [];
            const flights: any[] = detail.flights || [];
            const outFlight = flights.find((f: any) => f.id === detail.flight_id);
            const retFlight  = flights.find((f: any) => f.id === detail.return_flight_id);

            const fmt = (d: string) => { try { return new Date(d).toLocaleString("fr-FR"); } catch { return "N/A"; } };
            const payLabel = (m: string) =>
                m === "cash" ? "Espèces" : m === "card" ? "Carte" : m === "cheque" ? "Chèque"
                : m === "virement" ? "Virement" : m === "transfert" ? "Dépôt" : "Contrat";

            const isRoundTrip = !!detail.return_flight_id;
            const currency = (detail.currency || "USD").toUpperCase();
            const total = Number(detail.total_price || 0).toFixed(2);
            const ref = detail.booking_reference || reference;

            const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Reçu - ${ref}</title>
  <meta charset="UTF-8">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; background:#f5f5f5; padding:20px; }
    .receipt-container { max-width:320px; margin:0 auto; background:white; padding:20px; box-shadow:0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align:center; margin-bottom:15px; }
    .divider { border:none; border-top:1px dashed #ccc; margin:12px 0; }
    .section-title { font-weight:bold; margin:8px 0 4px; color:#1A237E; font-size:13px; }
    .info-line { margin:4px 0; font-size:12px; color:#333; }
    .info-line span.right { float:right; font-weight:bold; }
    .clearfix::after { content:""; display:table; clear:both; }
    .total-val { color:#d32f2f; font-weight:bold; font-size:15px; }
    .barcode { text-align:center; margin:15px 0; }
    .footer-note { font-size:10px; text-align:center; color:#666; margin-top:12px; line-height:1.5; }
    .controls { text-align:center; margin-top:16px; padding-top:12px; border-top:1px solid #eee; }
    button { padding:9px 18px; margin:0 6px; background:#1A237E; color:white; border:none; border-radius:4px; cursor:pointer; font-size:13px; }
    button:hover { background:#283593; }
    @media print {
      body { background:white; padding:0; }
      .receipt-container { box-shadow:none; max-width:80mm; }
      .controls { display:none; }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <img src="https://trogonairways.com/logo-trogonpng.png" alt="Trogon Airways" style="height:45px;margin-bottom:6px;"/>
      <div style="font-weight:bold;font-size:15px;color:#1A237E;">TROGON AIRWAYS</div>
      <div style="font-size:11px;color:#666;margin-top:4px;">
        Reçu de réservation<br/>
        ${new Date().toLocaleDateString("fr-FR", { weekday:"long", year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit" })}
      </div>
    </div>

    <hr class="divider"/>

    <div class="info-line clearfix">
      <span>Caissier:</span>
      <span class="right">${bk.created_by_name || "Agent"}</span>
    </div>

    <hr class="divider"/>

    <div style="text-align:center;font-weight:bold;font-size:13px;color:#1A237E;margin:8px 0;">
      ${isRoundTrip ? "Billet Aller-Retour" : "Billet Aller Simple"}
    </div>
    <div style="text-align:center;font-size:11px;color:#555;">
      Réf: <strong>${ref}</strong>
    </div>

    <hr class="divider"/>

    ${outFlight ? `
    <div class="section-title">VOL ALLER</div>
    <div class="info-line">${outFlight.departure_airport_name || outFlight.dep_name || ""} (${outFlight.departure_code || outFlight.dep_code || ""}) → ${outFlight.arrival_airport_name || outFlight.arr_name || ""} (${outFlight.arrival_code || outFlight.arr_code || ""})</div>
    <div class="info-line">Vol N°: ${outFlight.flight_number}</div>
    <div class="info-line">Départ: ${fmt(outFlight.departure_time)}</div>
    <div class="info-line">Arrivée: ${fmt(outFlight.arrival_time)}</div>
    ` : ""}

    ${retFlight ? `
    <hr class="divider"/>
    <div class="section-title">VOL RETOUR</div>
    <div class="info-line">${retFlight.departure_airport_name || retFlight.dep_name || ""} (${retFlight.departure_code || retFlight.dep_code || ""}) → ${retFlight.arrival_airport_name || retFlight.arr_name || ""} (${retFlight.arrival_code || retFlight.arr_code || ""})</div>
    <div class="info-line">Vol N°: ${retFlight.flight_number}</div>
    <div class="info-line">Départ: ${fmt(retFlight.departure_time)}</div>
    <div class="info-line">Arrivée: ${fmt(retFlight.arrival_time)}</div>
    ` : ""}

    <hr class="divider"/>

    <div class="section-title">PASSAGER(S)</div>
    ${passengers.map((p: any) => `
      <div class="info-line">${p.first_name || ""} ${p.last_name || ""}</div>
    `).join("") || `<div class="info-line">${bk.first_name || ""} ${bk.last_name || ""}</div>`}

    <hr class="divider"/>

    <div class="section-title">PAIEMENT</div>
    <div class="info-line clearfix">
      <span>TOTAL:</span>
      <span class="right total-val">${total} ${currency}</span>
    </div>
    <div class="info-line clearfix">
      <span>Mode:</span>
      <span class="right">${payLabel(detail.payment_method || bk.payment_method)}</span>
    </div>
    ${detail.transaction_reference && !detail.transaction_reference.startsWith("MANUAL-") ? `
    <div class="info-line clearfix">
      <span>Réf. paiement:</span>
      <span class="right" style="font-size:11px;">${detail.transaction_reference}</span>
    </div>` : ""}
    <div class="info-line clearfix">
      <span>Statut:</span>
      <span class="right" style="color:green;font-weight:bold;">
        ${detail.status === "confirmed" ? "Confirmé" : detail.status === "pending" ? "En attente" : "Annulé"}
      </span>
    </div>

    <div class="barcode">
      <img src="https://barcode.tec-it.com/barcode.ashx?data=${ref}&code=Code128&dpi=96&dataseparator="
           alt="Barcode ${ref}" style="max-width:100%;height:auto;"/>
    </div>

    <div class="footer-note">
      <strong>IMPORTANT</strong><br/>
      • Présentez ce reçu à l'enregistrement<br/>
      • Arrivez 1h avant le départ<br/>
      • Pièces d'identité obligatoires<br/>
      <br/>
      Tél: +509 3341 0404 / +509 2995 0404<br/>
      www.trogonairways.com
    </div>

    <div class="controls">
      <button onclick="window.print()">🖨️ Imprimer</button>
      <button onclick="window.close()">Fermer</button>
    </div>
  </div>
</body>
</html>`;

            const win = window.open("", "_blank", "width=420,height=850");
            if (win) { win.document.write(htmlContent); win.document.close(); }
            else { alert("Veuillez autoriser les popups pour imprimer le reçu."); }
        } catch (err) {
            alert("Erreur lors de la génération du reçu.");
            console.error(err);
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
        <div className="flex flex-col gap-y-4 p-6">
            <h1 className="title">View Booking Air Plane</h1>
            {/* Filtres */}

            <div className="mb-6 mt-16 grid grid-cols-1 gap-3 md:grid-cols-7">
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
                    <label className="mb-1 font-medium text-gray-700">Currency</label>
                    <select
                        onChange={(e) => setCurrency(e.target.value)}
                        className="rounded border px-4 py-2 text-sm"
                    >
                        <option value="">All</option>
                        <option value="usd">USD</option>
                        <option value="htg">HTG</option>
                    </select>
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
                        <option value="virement">Bank transfer</option>
                        <option value="contrat">Contrat</option>

                        <option value="transfert">Deposit</option>
                    </select>
                </div>

                <div className="flex flex-col">
                    <label className="mb-7 font-medium text-gray-700"></label>
                    <button
                        type="button"
                        onClick={handleSearch}
                        className="rounded-md bg-gradient-to-r from-amber-500 to-amber-600 px-4 pb-1 pt-2 text-white hover:from-amber-600 hover:to-amber-500 hover:text-black"
                    >
                        Search
                    </button>
                </div>

                {rapport && (
                    <button
                        type="button"
                        onClick={downloadExcel}
                        className="w-24 rounded-md border-2 border-slate-50 bg-slate-200 px-4 py-2 text-slate-700 hover:bg-amber-600 hover:text-slate-50"
                    >
                        Excel
                    </button>
                )}
            </div>

            {/* TABLEAU BOOKINGS */}
            <div className="card col-span-1 rounded-xl border border-gray-100 bg-white shadow-lg md:col-span-2 lg:col-span-4">
                <div className="card-body  p-0">
                    <div className="relative w-full  overflow-auto">
                        <table className="table">
                            <thead className="table-header">
                                <tr className="table-row">
                                    <th className="table-head text-center text-blue-600">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg
                                                className="h-8 w-8"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                                                />
                                            </svg>
                                            <span>Booking Reference</span>
                                        </div>
                                    </th>
                                    <th className="table-head text-center text-blue-600">
                                        <div className="flex items-center justify-center">
                                            <svg
                                                className="h-5 w-5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                                />
                                            </svg>
                                            <span>Payment Reference</span>
                                        </div>
                                    </th>
                                    <th className="table-head text-center text-blue-600">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg
                                                className="h-5 w-5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                />
                                            </svg>
                                            <span>Flight Type</span>
                                        </div>
                                    </th>
                                    <th className="table-head text-center text-blue-600">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                                                />
                                            </svg>
                                            <span>Trip Type</span>
                                        </div>
                                    </th>
                                    <th className="table-head text-center text-blue-600">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                                />
                                            </svg>
                                            <span>Passenger Name</span>
                                        </div>
                                    </th>
                                    <th className="table-head text-center text-blue-600">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg
                                                className="h-7 w-7"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                            <span>Total Price</span>
                                        </div>
                                    </th>
                                    <th className="table-head text-center text-blue-600">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg
                                                className="h-5 w-5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                                />
                                            </svg>
                                            <span>Passager</span>
                                        </div>
                                    </th>
                                    <th className="table-head text-center text-blue-600">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                            <span>Payment</span>
                                        </div>
                                    </th>
                                    <th className="table-head text-center text-blue-600">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                                />
                                            </svg>
                                            <span>Method</span>
                                        </div>
                                    </th>
                                    <th className="table-head text-center text-blue-600">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                                />
                                            </svg>
                                            <span>Created by</span>
                                        </div>
                                    </th>
                                    <th className="table-head text-center text-blue-600">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                />
                                            </svg>
                                            <span>Date</span>
                                        </div>
                                    </th>
                                    <th className="table-head text-center text-blue-600">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                                                />
                                            </svg>
                                            <span>Action</span>
                                        </div>
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="table-body">
                                {currentBookings.map((booking: Booking) => (
                                    <tr
                                        key={booking.id}
                                        className="table-row"
                                    >
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
                                                {booking.type_v === "roundtrip" ? "Round-Trip" : "On-Way"}
                                            </span>
                                        </td>

                                        <td className="table-cell text-center">
                                            {booking.first_name} {booking.last_name}
                                        </td>
                                        <td className="table-cell text-center">
                                            {booking.total_price} {booking.currency === "htg" ? "HTG" : "USD"}
                                        </td>
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
                                                {booking.status === "confirmed" ? "Paid" : booking.status === "pending" ? "Unpaid" : "Cancelled"}
                                            </span>
                                        </td>

                                        <td className="table-cell text-center">
                                            {booking.payment_method === "card"
                                                ? "Card"
                                                : booking.payment_method === "cash"
                                                  ? "Cash"
                                                  : booking.payment_method === "cheque"
                                                    ? "Check"
                                                    : booking.payment_method === "virement"
                                                      ? "Bank Transfer"
                                                      : booking.payment_method === "transfert"
                                                        ? "Deposit"
                                                        : booking.payment_method === "paylater"
                                                          ? "Pay Later"
                                                          : "Contrat"}
                                        </td>
                                        <td className="table-cell text-center">{booking.created_by_name || "Client Online"}</td>

                                        <td className="table-cell text-center">{new Date(booking.created_at).toLocaleDateString()}</td>

                                        <td className="table-cell text-center">
                                            {/* {(isAdmin || isOperateur) && (
                                                <button
                                                    className="flex w-full gap-2 rounded-lg p-2 hover:bg-amber-500"
                                                    onClick={() => handleViewDetails(booking.id)}
                                                >
                                                    <Eye className="h-6 w-4" /> View Details
                                                </button>
                                            )} */}
                                            <div className="flex flex-col gap-1 min-w-[140px]">
                                                {/* Voir détails */}
                                                <button
                                                    className="flex w-full items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-2 py-1.5 text-white text-xs font-medium hover:from-amber-600 hover:to-amber-500"
                                                    onClick={() => handleViewDetails(booking.id)}
                                                >
                                                    <Eye className="h-3.5 w-3.5 flex-shrink-0" /> Voir détails
                                                </button>

                                                {/* Confirmer paiement (pending only) */}
                                                {booking.status === "pending" && (
                                                    <button
                                                        className="flex w-full items-center gap-1.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-2 py-1.5 text-white text-xs font-medium hover:from-green-600 hover:to-emerald-700"
                                                        onClick={() => setConfirmModal({ open: true, id: booking.id, ref: booking.booking_reference, pax: booking.passenger_count, price: booking.total_price, currency: booking.currency || "USD" })}
                                                    >
                                                        <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                                                        Confirmer paiement
                                                    </button>
                                                )}

                                                {/* Annuler (pending only) */}
                                                {booking.status === "pending" && (
                                                    <button
                                                        className="flex w-full items-center gap-1.5 rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-2 py-1.5 text-white text-xs font-medium hover:from-red-600 hover:to-red-700"
                                                        onClick={() => setCancelModal({ open: true, id: booking.id, ref: booking.booking_reference })}
                                                    >
                                                        <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                                                        Annuler
                                                    </button>
                                                )}

                                                {/* Reçu (confirmed only) */}
                                                {booking.status === "confirmed" && (
                                                    <button
                                                        className="flex w-full items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-2 py-1.5 text-white text-xs font-medium hover:from-blue-600 hover:to-indigo-700"
                                                        onClick={() => handlePrintReceipt(booking.booking_reference, booking)}
                                                    >
                                                        <Printer className="h-3.5 w-3.5 flex-shrink-0" /> Reçu paiement
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>


                    </div>
                                            {/* PAGINATION */}
                        {currentBookings.length > 0 && (
                            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-600">
                                        Page <span className="font-semibold">{currentPage}</span> of{" "}
                                        <span className="font-semibold">{totalPages}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <ChevronLeftIcon className="h-4 w-4" />
                                            Previous
                                        </button>

                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let pageNum;
                                                if (totalPages <= 5) {
                                                    pageNum = i + 1;
                                                } else if (currentPage <= 3) {
                                                    pageNum = i + 1;
                                                } else if (currentPage >= totalPages - 2) {
                                                    pageNum = totalPages - 4 + i;
                                                } else {
                                                    pageNum = currentPage - 2 + i;
                                                }

                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        className={`h-10 w-10 rounded-lg text-sm font-medium transition-colors ${
                                                            currentPage === pageNum
                                                                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white"
                                                                : "text-gray-600 hover:bg-gray-100"
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <button
                                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
                                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Next
                                            <ChevronRightIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                </div>

                {/* MODAL */}
                <BookingDetailsModal
                    open={open}
                    data={selectedBooking}
                    onClose={() => setOpen(false)}
                    onSave={() => {}}
                    bookingModify={fetchDashboardData}
                />
                <ConfirmPaymentModal
                    open={confirmModal.open}
                    bookingRef={confirmModal.ref}
                    passengerCount={confirmModal.pax}
                    totalPrice={confirmModal.price}
                    currency={confirmModal.currency}
                    onConfirm={handleConfirmPayment}
                    onClose={() => setConfirmModal(m => ({ ...m, open: false }))}
                />
                <CancelBookingModal
                    open={cancelModal.open}
                    bookingRef={cancelModal.ref}
                    onConfirm={handleCancelBooking}
                    onClose={() => setCancelModal(m => ({ ...m, open: false }))}
                />
            </div>
        </div>
    );
};

const mapApiBookingToBookingDetails = (apiData: any): BookingDetails => {
    return {
        reference: apiData.booking_reference,
        contactEmail: apiData.contact_email || "",
        contactPhone: apiData.contact_phone || "",
        bookedOn: apiData.created_at ? new Date(apiData.created_at).toLocaleDateString("fr-FR") : "",
        paymentStatus: apiData.status || apiData.payment_status || "pending",
        payment_method: apiData.payment_method || "",
        totalPrice: apiData.total_price ? String(apiData.total_price) : "0",
        currency: apiData.currency || "USD",
        id: apiData.id ? String(apiData.id) : undefined,
        typeVol: apiData.type_vol || "",
        typeV: apiData.type_v || "",
        created_by_name: apiData.created_by_name || "",
        created_by_email: apiData.created_by_email || "",
        user_created_booking: apiData.user_created_booking,
        adminNotes: apiData.adminNotes || "",
        flightId: apiData.flight_id,
        flights: (apiData.flights || []).map((f: any) => ({
            code: f.code || f.flight_number || "",
            from: f.departure_city || f.departure_airport_name || f.from || "",
            to: f.arrival_city || f.arrival_airport_name || f.to || "",
            date: f.date || f.departure_time || "",
            arrival_date: f.arrival_date || f.arrival_time || "",
            flight_number: f.code || f.flight_number || "",
            airline: f.airline || "",
            price: f.price,
            departure_code: f.departure_code || "",
            arrival_code: f.arrival_code || "",
        })),
        passengers: (apiData.passengers || []).map((p: any) => ({
            id: p.id,
            name: `${p.first_name || ""} ${p.last_name || ""}`.trim(),
            email: p.email || "",
            dob: p.date_of_birth || "",
            firstName: p.first_name || "",
            lastName: p.last_name || "",
            middleName: p.middle_name || "",
            phone: p.phone || "",
            idTypeClient: p.idTypeClient || "",
            idClient: p.idClient || "",
            nationality: p.nationality || "",
            country: p.country || "",
            address: p.address || "",
            nom_urgence: p.nom_urgence || "",
            email_urgence: p.email_urgence || "",
            tel_urgence: p.tel_urgence || "",
            selectedSeat: p.selectedSeat || "",
        })),
    };
};

export default ViewBookingPlane;
