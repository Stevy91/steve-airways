import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plane, Calendar, Mail, CreditCard, BadgeCheck } from "lucide-react";

export type Flight = {
    code: string;
    from: string;
    to: string;
    date: string;
};

export type Passenger = {
    name: string;
    email: string;
    dob: string;
};

export type BookingDetails = {
    reference: string;
    contactEmail: string;
    bookedOn: string;
    paymentStatus: string;
    paymentIntentId?: string;
    flights: Flight[];
    passengers: Passenger[];
    totalPrice: string;
    adminNotes?: string;
    typeVol?: string;
    typeV?: string;
    id?: string;
};

type BookingDetailsModalProps = {
    open: boolean;
    data?: BookingDetails;
    onClose: () => void;
    onSave: (updated: BookingDetails) => void;
};

const badgeStyles: Record<string, string> = {
    confirmed: "bg-green-100 text-green-800 ring-1 ring-green-200",
    pending: "bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200",
    cancelled: "bg-red-100 text-red-800 ring-1 ring-red-200",
};

const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({ open, data, onClose, onSave }) => {
    const [booking, setBooking] = useState<BookingDetails | undefined>(data);
    const [loading, setLoading] = useState(true);
    const [paymentStatus, setPaymentStatus] = useState<string>(data?.paymentStatus || "Pending");

    const dialogRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (data) {
            setBooking(data);
            setPaymentStatus(data.paymentStatus);

            setLoading(false);
        }
    }, [data]);

    if (!open) return null;

    if (loading || !booking) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="rounded-lg bg-white p-6 shadow-lg">
                    <p className="text-gray-600">Chargement des détails...</p>
                </div>
            </div>
        );
    }

    // const handleSave = async () => {
    //     if (!booking) return;

    //     try {
    //         const response = await fetch(`https://steve-airways-production.up.railway.app/api/booking-plane/${booking.reference}/payment-status`, {
    //             method: "PUT",
    //             headers: {
    //                 "Content-Type": "application/json",
    //             },
    //             body: JSON.stringify({ paymentStatus: booking.paymentStatus }),
    //         });

    //         if (!response.ok) {
    //             throw new Error("Erreur API");
    //         }

    //         const result = await response.json();
    //         console.log("✅ Payment status updated:", result);

    //         onSave(booking); // callback parent
    //         onClose();
    //     } catch (err) {
    //         console.error("❌ Failed to update payment status", err);
    //         alert("Impossible de mettre à jour le paiement.");
    //     }
    // };

    const handleSave = async (newStatus: "pending" | "confirmed" | "cancelled") => {
        if (!booking) return; // <-- utilise booking ici

        try {
            const res = await fetch(`https://steve-airways-production.up.railway.app/api/booking-plane/${booking.reference}/payment-status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ paymentStatus: newStatus }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Erreur API");
            }

            const data = await res.json();
            console.log("✅ Payment status updated:", data);

            // Met à jour le state local pour refléter le nouveau statut
            setBooking((prev) => (prev ? { ...prev, status: data.newStatus } : prev));

            // Appelle la callback si elle existe
            onSave && onSave(data);
        } catch (err) {
            console.error("❌ Failed to update payment status", err);
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50">
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-black/50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Dialog */}
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="booking-dialog-title"
                        ref={dialogRef}
                        className="absolute inset-0 mx-auto my-6 flex max-w-3xl items-start justify-center p-4 sm:my-12"
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    >
                        <div className="relative w-full overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
                            {/* Close button */}
                            <button
                                onClick={onClose}
                                className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            {/* Header */}
                            <div className="space-y-1 px-6 pb-4 pt-6 sm:px-8">
                                <h2
                                    id="booking-dialog-title"
                                    className="text-xl font-semibold text-slate-800 sm:text-2xl"
                                >
                                    Booking Details: <span className="text-blue-900">{booking.reference}</span>
                                </h2>
                                <div className="flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
                                    <Mail className="h-4 w-4" />
                                    <span>Contact:</span>
                                    <a
                                        className="text-blue-900 hover:underline"
                                        href={`mailto:${booking.contactEmail}`}
                                    >
                                        {booking.contactEmail}
                                    </a>
                                    <span className="mx-1">|</span>
                                    <Calendar className="h-4 w-4" />
                                    <span>Booked on: {booking.bookedOn}</span>
                                </div>
                            </div>

                            <div className="h-px w-full bg-slate-100" />

                            {/* Body */}
                            <div className="space-y-6 px-6 py-6 sm:px-8">
                                {/* Payment Status */}
                                <section className="space-y-2">
                                    <h3 className="text-base font-semibold text-slate-700">Payment Status</h3>
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-sm font-medium ${
                                                badgeStyles[paymentStatus] || "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                                            }`}
                                        >
                                            {paymentStatus}
                                        </span>
                                    </div>
                                </section>

                                {/* Flights */}
                                <section className="space-y-2">
                                    <h3 className="text-base font-semibold text-slate-700">Flights</h3>
                                    <ul className="space-y-1">
                                        {booking.flights.map((flight, idx) => (
                                            <li
                                                key={idx}
                                                className="flex items-center gap-2 text-sm text-slate-600"
                                            >
                                                <Plane className="h-4 w-4" />
                                                <span>
                                                    {flight.from} → {flight.to} ({flight.date})
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </section>

                                {/* Passengers */}
                                <section className="space-y-2">
                                    <h3 className="text-base font-semibold text-slate-700">Passengers</h3>
                                    <ul className="space-y-1">
                                        {booking.passengers.map((p, idx) => (
                                            <li
                                                key={idx}
                                                className="text-sm text-slate-600"
                                            >
                                                {p.name} ({p.email}, {p.dob})
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                                {/* Total Price*/}
                                <section className="space-y-2">
                                    <div className="text-lg font-bold text-orange-400">Total Price: {booking.totalPrice}</div>
                                </section>
                                <section className="space-y-2">
                                    <h3 className="text-2xl font-semibold text-blue-900">Admin Controls</h3>
                                    <div className="grid gap-3 sm:max-w-md">
                                        <label className="text-sm font-medium text-slate-600">Payment Status</label>
                                        <div className="relative">
                                            <select
                                                value={paymentStatus}
                                                onChange={(e) => setPaymentStatus(e.target.value)}
                                                className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                            >
                                                {["confirmed", "pending", "cancelled"].map((s) => (
                                                    <option
                                                        key={s}
                                                        value={s}
                                                    >
                                                        {s === "confirmed" ? "Paid" : s === "pending" ? "Unpaid" : "Pending"}
                                                    </option>
                                                ))}
                                            </select>
                                            <svg
                                                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                                                width="20"
                                                height="20"
                                                viewBox="0 0 20 20"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <path
                                                    d="M6 8l4 4 4-4"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                </section>
                                {/* Admin Notes */}
                                {/* <section className="space-y-2">
                                    <h3 className="text-sm font-medium text-slate-600">Admin Notes</h3>
                                    <textarea
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        className="w-full rounded-md border border-slate-300 p-2 text-sm"
                                        rows={3}
                                    />
                                </section> */}
                                {/* Save Button */}
                                <div className="flex items-center justify-end gap-3 rounded-b-2xl border-t border-slate-100 bg-slate-50 px-6 py-4 sm:px-8">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="rounded-md bg-blue-900 px-4 py-2 text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        Save changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default BookingDetailsModal;
