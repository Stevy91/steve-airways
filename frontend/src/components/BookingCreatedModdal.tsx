import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plane, Calendar, Mail } from "lucide-react";
import BookingForm from "./BookingForm";
import BookingFormSearch from "./BookingFormSearch";
import BookingCreatedDashboard from "./BookingCreatedDashboard";

export type Flight = { code: string; from: string; to: string; date: string };
export type Passenger = { name: string; email: string; dob: string };

export type BookingDetails = {
  reference: string;
  contactEmail: string;
  bookedOn: string;
  paymentStatus: string;
  flights: Flight[];
  passengers: Passenger[];
  totalPrice: string;
  id?: string;
  typeVol?: string;
  typeV?: string;
  adminNotes?: string;
};


type BookingCreatedModalProps = {
  open: boolean;
  data?: BookingDetails;
  onClose: () => void;

};

const badgeStyles: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800 ring-1 ring-green-200",
  pending: "bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200",
  cancelled: "bg-red-100 text-red-800 ring-1 ring-red-200",
};

const BookingCreatedModal: React.FC<BookingCreatedModalProps> = ({ open, onClose }) => {

  const [loading, setLoading] = useState(true);
const [flights, setFlights] = useState<Flight[]>([]);
     // Cette fonction sera appelée par BookingForm avec les résultats
    const handleSearch = (foundFlights: any[]) => {
        setFlights(foundFlights);
    };
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
   
      
      setLoading(false);
   
  });

  if (!open) return null;
  if (loading)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-lg bg-white p-6 shadow-lg">
          <p className="text-gray-600">Chargement des détails...</p>
        </div>
      </div>
    );

//   const handleSave = async (newStatus: "pending" | "confirmed" | "cancelled") => {
//     if (!booking) return;

//     try {
//       const res = await fetch(
//         `https://steve-airways.onrender.com/api/booking-plane/${booking.reference}/payment-status`,
//         {
//           method: "PUT",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ paymentStatus: newStatus }),
//         }
//       );

//       if (!res.ok) {
//         const errorData = await res.json();
//         throw new Error(errorData.error || "Erreur API");
//       }

//       const data = await res.json();
//       console.log("✅ Payment status updated:", data);

//       // Met à jour le state local pour refléter le nouveau statut
//       setBooking((prev) => (prev ? { ...prev, paymentStatus: data.newStatus } : prev));
    

//       // Callback pour le parent
//       onSave && onSave({ ...booking, paymentStatus: data.newStatus });
//     } catch (err) {
//       console.error("❌ Failed to update payment status", err);
//       alert("Impossible de mettre à jour le paiement.");
//     }
//   };

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
            className="absolute inset-0 mx-auto my-6 flex max-w-7xl items-start justify-center p-4 sm:my-12"
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
                <h2 id="booking-dialog-title" className="text-xl font-semibold text-slate-800 sm:text-2xl">
                  Booking Details: <span className="text-blue-900">dd</span>
                </h2>
                <div className="flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
                  <Mail className="h-4 w-4" />
                  <span>Contact:</span>
                  <a className="text-blue-900 hover:underline" href="#">
                    steve
                  </a>
                  <span className="mx-1">|</span>
                  <Calendar className="h-4 w-4" />
                  <span>Booked on: </span>
                </div>
              </div>

              <div className="h-px w-full bg-slate-100" />

              {/* Body */}
              <div className="space-y-6 px-6 py-6 sm:px-8">
                 <BookingCreatedDashboard onSearch={handleSearch} />

                {/* Save Button */}
                <div className="flex items-center justify-end gap-3 rounded-b-2xl border-t border-slate-100 bg-slate-50 px-6 py-4 sm:px-8">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    Cancel
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

export default BookingCreatedModal;
