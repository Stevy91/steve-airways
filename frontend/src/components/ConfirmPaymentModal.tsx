import { useState } from "react";
import { X, CheckCircle, AlertTriangle } from "lucide-react";

interface ConfirmPaymentModalProps {
  open: boolean;
  bookingRef: string;
  passengerCount: number;
  totalPrice?: number;
  currency?: string;
  onConfirm: (paymentReference: string) => Promise<void>;
  onClose: () => void;
}

export default function ConfirmPaymentModal({
  open,
  bookingRef,
  passengerCount,
  totalPrice,
  currency,
  onConfirm,
  onClose,
}: ConfirmPaymentModalProps) {
  const [paymentRef, setPaymentRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleConfirm = async () => {
    setError("");
    setLoading(true);
    try {
      await onConfirm(paymentRef.trim());
      setPaymentRef("");
    } catch (err: any) {
      setError(err.message || "Erreur lors de la confirmation");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setPaymentRef("");
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">Confirmer le paiement</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">{bookingRef}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Summary */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-slate-400">Réservation</span>
              <span className="font-semibold text-gray-800 dark:text-white">{bookingRef}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-slate-400">Passager(s)</span>
              <span className="font-semibold text-gray-800 dark:text-white">{passengerCount}</span>
            </div>
            {totalPrice !== undefined && (
              <div className="flex justify-between border-t border-gray-200 dark:border-slate-600 pt-2 mt-1">
                <span className="text-gray-700 dark:text-slate-300 font-semibold">Total</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {Number(totalPrice).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}{" "}
                  {(currency || "USD").toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Payment reference field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
              Référence de paiement
              <span className="ml-1 text-xs font-normal text-gray-400">(optionnel)</span>
            </label>
            <input
              type="text"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="Ex: TXN-2024-001, CHQ-0042, VIRT-12345..."
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
              disabled={loading}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && !loading && handleConfirm()}
            />
            <p className="mt-1.5 text-xs text-gray-400 dark:text-slate-500">
              Numéro de transaction, de chèque, de virement ou autre référence de paiement.
            </p>
          </div>

          {/* Warning */}
          <div className="flex gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Cette action est <strong>irréversible</strong>. Les sièges seront déduits du vol et
              l&apos;e-billet sera envoyé automatiquement au client par email.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-400 font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 pt-0">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-sm hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Confirmer le paiement
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
