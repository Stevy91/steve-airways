import React, { useState, useEffect } from "react";

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
};

type BookingDetailsModalProps = {
  open: boolean;
  data?: BookingDetails;
  onClose: () => void;
  onSave: (updated: BookingDetails) => void;
};

const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  open,
  data,
  onClose,
  onSave,
}) => {
  const [booking, setBooking] = useState<BookingDetails | undefined>(data);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (data) {
      setBooking(data);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-3xl rounded-lg bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">
            Réservation {booking.reference}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
          {/* Infos principales */}
          <div>
            <h3 className="mb-2 font-semibold">Infos principales</h3>
            <p>
              <strong>Email :</strong> {booking.contactEmail}
            </p>
            <p>
              <strong>Date :</strong> {booking.bookedOn}
            </p>
            <p>
              <strong>Statut paiement :</strong>{" "}
              <span
                className={`px-2 py-1 rounded text-sm ${
                  booking.paymentStatus === "Paid"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {booking.paymentStatus}
              </span>
            </p>
            <p>
              <strong>Total :</strong> {booking.totalPrice}
            </p>
          </div>

          {/* Vols */}
          <div>
            <h3 className="mb-2 font-semibold">Vols</h3>
            <ul className="space-y-2">
              {booking.flights.map((f, idx) => (
                <li
                  key={idx}
                  className="rounded border p-2 flex justify-between"
                >
                  <span>
                    {f.from} → {f.to}
                  </span>
                  <span>
                    {f.code} - {f.date}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Passagers */}
          <div>
            <h3 className="mb-2 font-semibold">Passagers</h3>
            <ul className="space-y-2">
              {booking.passengers.map((p, idx) => (
                <li
                  key={idx}
                  className="rounded border p-2 flex flex-col sm:flex-row sm:justify-between"
                >
                  <span>{p.name}</span>
                  <span>{p.email}</span>
                  <span>{p.dob}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Notes Admin */}
          <div>
            <h3 className="mb-2 font-semibold">Notes administratives</h3>
            <textarea
              value={booking.adminNotes}
              onChange={(e) =>
                setBooking({ ...booking, adminNotes: e.target.value })
              }
              className="w-full rounded border p-2"
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t p-4">
          <button
            onClick={onClose}
            className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
          >
            Fermer
          </button>
          <button
            onClick={() => booking && onSave(booking)}
            className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsModal;
