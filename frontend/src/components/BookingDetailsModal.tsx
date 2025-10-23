import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plane, Calendar, Mail, Edit, Save, Plus, Trash2 } from "lucide-react";

export type Flight = { 
  code: string; 
  from: string; 
  to: string; 
  date: string;
  id?: number;
  flight_number?: string;
  airline?: string;
  departure?: string;
  arrival?: string;
  price?: number;
};

export type Passenger = { 
  id?: number;
  name: string; 
  email: string; 
  dob: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  gender?: string;
  title?: string;
  phone?: string;
  nationality?: string;
  country?: string;
};

export type BookingDetails = {
  reference: string;
  contactEmail: string;
  contactPhone?: string;
  bookedOn: string;
  paymentStatus: string;
  flights: Flight[];
  passengers: Passenger[];
  totalPrice: string;
  id?: string;
  typeVol?: string;
  typeV?: string;
  created_by_name?: string;  
  created_by_email?: string; 
  user_created_booking?: number; 
  adminNotes?: string;
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
  const [paymentStatus, setPaymentStatus] = useState<string>(data?.paymentStatus || "pending");
  const [isEditing, setIsEditing] = useState(false);
  const [editedBooking, setEditedBooking] = useState<BookingDetails | null>(null);
  const [saving, setSaving] = useState(false);
  
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (data) {
      setBooking(data);
      setEditedBooking(data);
      setPaymentStatus(data.paymentStatus);
      setLoading(false);
    }
  }, [data]);

  const handleEditToggle = () => {
    if (isEditing) {
      // Annuler l'édition
      setEditedBooking(booking || null);
    }
    setIsEditing(!isEditing);
  };

  const handlePassengerChange = (index: number, field: keyof Passenger, value: string) => {
    if (!editedBooking) return;
    
    const updatedPassengers = [...editedBooking.passengers];
    updatedPassengers[index] = {
      ...updatedPassengers[index],
      [field]: value
    };
    
    setEditedBooking({
      ...editedBooking,
      passengers: updatedPassengers
    });
  };

  const handleFlightChange = (index: number, field: keyof Flight, value: string) => {
    if (!editedBooking) return;
    
    const updatedFlights = [...editedBooking.flights];
    updatedFlights[index] = {
      ...updatedFlights[index],
      [field]: value
    };
    
    setEditedBooking({
      ...editedBooking,
      flights: updatedFlights
    });
  };

  const handleAddPassenger = () => {
    if (!editedBooking) return;
    
    const newPassenger: Passenger = {
      name: "",
      email: "",
      dob: "",
      firstName: "",
      lastName: ""
    };
    
    setEditedBooking({
      ...editedBooking,
      passengers: [...editedBooking.passengers, newPassenger]
    });
  };

  const handleRemovePassenger = (index: number) => {
    if (!editedBooking) return;
    
    const updatedPassengers = editedBooking.passengers.filter((_, i) => i !== index);
    setEditedBooking({
      ...editedBooking,
      passengers: updatedPassengers
    });
  };

  const handleAddFlight = () => {
    if (!editedBooking) return;
    
    const newFlight: Flight = {
      code: "",
      from: "",
      to: "",
      date: ""
    };
    
    setEditedBooking({
      ...editedBooking,
      flights: [...editedBooking.flights, newFlight]
    });
  };

  const handleRemoveFlight = (index: number) => {
    if (!editedBooking) return;
    
    const updatedFlights = editedBooking.flights.filter((_, i) => i !== index);
    setEditedBooking({
      ...editedBooking,
      flights: updatedFlights
    });
  };

  const handleGeneralInfoChange = (field: keyof BookingDetails, value: string) => {
    if (!editedBooking) return;
    
    setEditedBooking({
      ...editedBooking,
      [field]: value
    });
  };

  const handleSaveChanges = async () => {
    if (!editedBooking) return;
    
    setSaving(true);
    try {
      // Sauvegarder les modifications via API
      const res = await fetch(
        `https://steve-airways.onrender.com/api/bookings/${editedBooking.reference}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            passengers: editedBooking.passengers,
            flights: editedBooking.flights,
            contactEmail: editedBooking.contactEmail,
            contactPhone: editedBooking.contactPhone,
            totalPrice: editedBooking.totalPrice,
            paymentStatus: paymentStatus
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erreur lors de la mise à jour");
      }

      const updatedData = await res.json();
      
      // Mettre à jour le state local
      setBooking(editedBooking);
      setIsEditing(false);
      
      // Callback pour le parent
      onSave && onSave(editedBooking);
      
    } catch (err) {
      console.error("❌ Failed to update booking", err);
      alert("Impossible de mettre à jour la réservation.");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePaymentStatus = async (newStatus: "pending" | "confirmed" | "cancelled") => {
    if (!booking) return;

    try {
      const res = await fetch(
        `https://steve-airways.onrender.com/api/booking-plane/${booking.reference}/payment-status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentStatus: newStatus }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erreur API");
      }

      const data = await res.json();
      console.log("✅ Payment status updated:", data);

      // Met à jour le state local
      setBooking((prev) => (prev ? { ...prev, paymentStatus: data.newStatus } : prev));
      setEditedBooking((prev) => (prev ? { ...prev, paymentStatus: data.newStatus } : prev));

      onSave && onSave({ ...booking, paymentStatus: data.newStatus });
    } catch (err) {
      console.error("❌ Failed to update payment status", err);
      alert("Impossible de mettre à jour le paiement.");
    }
  };

  if (!open) return null;
  if (loading || !booking || !editedBooking)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-lg bg-white p-6 shadow-lg">
          <p className="text-gray-600">Chargement des détails...</p>
        </div>
      </div>
    );

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
            className="absolute inset-0 mx-auto my-6 flex max-w-4xl items-start justify-center p-4 sm:my-12"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
          >
            <div className="relative w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
              {/* Header */}
              <div className="sticky top-0 z-10 bg-white px-6 pb-4 pt-6 sm:px-8">
                <div className="flex items-center justify-between">
                  <h2 id="booking-dialog-title" className="text-xl font-semibold text-slate-800 sm:text-2xl">
                    Booking Details: <span className="text-blue-900">{booking.reference}</span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleEditToggle}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-white hover:bg-blue-600"
                    >
                      {isEditing ? <X size={16} /> : <Edit size={16} />}
                      {isEditing ? "Annuler" : "Modifier"}
                    </button>
                    <button
                      onClick={onClose}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 text-sm text-slate-500 mt-2">
                  <Mail className="h-4 w-4" />
                  <span>Contact:</span>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editedBooking.contactEmail}
                      onChange={(e) => handleGeneralInfoChange("contactEmail", e.target.value)}
                      className="rounded border px-2 py-1 text-sm"
                    />
                  ) : (
                    <a className="text-blue-900 hover:underline" href={`mailto:${booking.contactEmail}`}>
                      {booking.contactEmail}
                    </a>
                  )}
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
                      {paymentStatus === "confirmed" ? "Paid" : paymentStatus === "pending" ? "Unpaid" : "cancelled"}
                    </span>
                  </div>
                </section>

                {/* Flights */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-700">Flights</h3>
                    {isEditing && (
                      <button
                        onClick={handleAddFlight}
                        className="flex items-center gap-2 rounded-lg bg-green-500 px-3 py-1 text-white hover:bg-green-600"
                      >
                        <Plus size={16} /> Ajouter un vol
                      </button>
                    )}
                  </div>
                  <ul className="space-y-3">
                    {editedBooking.flights.map((flight, idx) => (
                      <li key={idx} className="flex items-center gap-3 p-3 border rounded-lg">
                        <Plane className="h-4 w-4 flex-shrink-0" />
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                          {isEditing ? (
                            <>
                              <input
                                value={flight.code}
                                onChange={(e) => handleFlightChange(idx, "code", e.target.value)}
                                placeholder="Code vol"
                                className="rounded border px-2 py-1 text-sm"
                              />
                              <input
                                value={flight.from}
                                onChange={(e) => handleFlightChange(idx, "from", e.target.value)}
                                placeholder="De"
                                className="rounded border px-2 py-1 text-sm"
                              />
                              <input
                                value={flight.to}
                                onChange={(e) => handleFlightChange(idx, "to", e.target.value)}
                                placeholder="Vers"
                                className="rounded border px-2 py-1 text-sm"
                              />
                              <input
                                type="datetime-local"
                                value={flight.date}
                                onChange={(e) => handleFlightChange(idx, "date", e.target.value)}
                                className="rounded border px-2 py-1 text-sm"
                              />
                            </>
                          ) : (
                            <span className="text-sm text-slate-600">
                              {flight.from} → {flight.to} ({flight.date}) - {flight.code}
                            </span>
                          )}
                        </div>
                        {isEditing && editedBooking.flights.length > 1 && (
                          <button
                            onClick={() => handleRemoveFlight(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Passengers */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-700">Passengers</h3>
                    {isEditing && (
                      <button
                        onClick={handleAddPassenger}
                        className="flex items-center gap-2 rounded-lg bg-green-500 px-3 py-1 text-white hover:bg-green-600"
                      >
                        <Plus size={16} /> Ajouter passager
                      </button>
                    )}
                  </div>
                  <ul className="space-y-3">
                    {editedBooking.passengers.map((passenger, idx) => (
                      <li key={idx} className="p-3 border rounded-lg space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-slate-700">Passager {idx + 1}</span>
                          {isEditing && editedBooking.passengers.length > 1 && (
                            <button
                              onClick={() => handleRemovePassenger(idx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {isEditing ? (
                            <>
                              <input
                                value={passenger.name}
                                onChange={(e) => handlePassengerChange(idx, "name", e.target.value)}
                                placeholder="Nom complet"
                                className="rounded border px-2 py-1 text-sm"
                              />
                              <input
                                type="email"
                                value={passenger.email}
                                onChange={(e) => handlePassengerChange(idx, "email", e.target.value)}
                                placeholder="Email"
                                className="rounded border px-2 py-1 text-sm"
                              />
                              <input
                                type="date"
                                value={passenger.dob}
                                onChange={(e) => handlePassengerChange(idx, "dob", e.target.value)}
                                placeholder="Date de naissance"
                                className="rounded border px-2 py-1 text-sm"
                              />
                              <input
                                value={passenger.phone || ""}
                                onChange={(e) => handlePassengerChange(idx, "phone", e.target.value)}
                                placeholder="Téléphone"
                                className="rounded border px-2 py-1 text-sm"
                              />
                            </>
                          ) : (
                            <div className="text-sm text-slate-600">
                              <div>{passenger.name}</div>
                              <div>{passenger.email}</div>
                              <div>Naissance: {passenger.dob}</div>
                              {passenger.phone && <div>Tél: {passenger.phone}</div>}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Total Price */}
                <section className="space-y-2">
                  <div className="text-lg font-bold text-amber-500">
                    Total Price: {isEditing ? (
                      <input
                        value={editedBooking.totalPrice}
                        onChange={(e) => handleGeneralInfoChange("totalPrice", e.target.value)}
                        className="rounded border px-2 py-1 text-sm w-32"
                      />
                    ) : (
                      booking.totalPrice
                    )}
                  </div>
                </section>

                {/* Admin Controls */}
                <section className="space-y-4">
                  <h3 className="text-xl font-semibold text-blue-900">Admin Controls</h3>
                  
                  {/* Payment Status Control */}
                  <div className="grid gap-3 sm:max-w-md">
                    <label className="text-sm font-medium text-slate-600">Payment Status</label>
                    <div className="relative">
                      <select
                        value={paymentStatus}
                        onChange={(e) => setPaymentStatus(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      >
                        {["pending", "confirmed", "cancelled"].map((s) => (
                          <option key={s} value={s}>
                            {s === "confirmed" ? "Paid" : s === "pending" ? "Unpaid" : "Cancelled"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Admin Notes */}
                  <div className="grid gap-3">
                    <label className="text-sm font-medium text-slate-600">Admin Notes</label>
                    {isEditing ? (
                      <textarea
                        value={editedBooking.adminNotes || ""}
                        onChange={(e) => handleGeneralInfoChange("adminNotes", e.target.value)}
                        placeholder="Notes administratives..."
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        rows={3}
                      />
                    ) : (
                      <div className="text-sm text-slate-600 p-2 bg-slate-50 rounded">
                        {booking.adminNotes || "Aucune note"}
                      </div>
                    )}
                  </div>
                </section>

                {/* Save Buttons */}
                <div className="flex items-center justify-end gap-3 rounded-b-2xl border-t border-slate-100 bg-slate-50 px-6 py-4 sm:px-8">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    Fermer
                  </button>
                  
                  {isEditing ? (
                    <button
                      type="button"
                      onClick={handleSaveChanges}
                      disabled={saving}
                      className="flex items-center gap-2 rounded-md bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:bg-gray-400"
                    >
                      <Save size={16} />
                      {saving ? "Sauvegarde..." : "Sauvegarder"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSavePaymentStatus(paymentStatus as "pending" | "confirmed" | "cancelled")}
                      className="rounded-md bg-amber-500 px-4 py-2 text-white hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      Mettre à jour le statut
                    </button>
                  )}
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