import { useState, useEffect } from "react";
import { RefreshCcw, Search, DollarSign, AlertCircle, Check, X } from "lucide-react";
import { useTheme } from "../../../contexts/theme-context";
import { useAuth } from "../../../hooks/useAuth";
import toast from "react-hot-toast";

const API = "https://steve-airways.onrender.com";

type Booking = {
  booking_reference: string;
  status: string;
  total_price: number;
  currency: string;
  contact_email: string;
  created_at: string;
  type_vol: string;
  payment_intent_id: string;
  payment_method: string;
  paid_amount: number;
  payment_status: string;
};

export default function RefundsPage() {
  const { theme } = useTheme();
  const { isAdmin, hasPermission } = useAuth();
  const dark = theme === "dark";

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchRef, setSearchRef] = useState("");
  const [filtered, setFiltered] = useState<Booking[]>([]);
  const [refundModal, setRefundModal] = useState<Booking | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("Demande client");
  const [processing, setProcessing] = useState(false);

  const token = localStorage.getItem("token");

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/refunds`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setBookings(data.refunds || []);
      setFiltered(data.refunds || []);
    } catch { toast.error("Impossible de charger les remboursements"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRefunds(); }, []);

  useEffect(() => {
    if (!searchRef) { setFiltered(bookings); return; }
    const q = searchRef.toLowerCase();
    setFiltered(bookings.filter(b =>
      b.booking_reference?.toLowerCase().includes(q) || b.contact_email?.toLowerCase().includes(q)
    ));
  }, [searchRef, bookings]);

  const handleRefund = async () => {
    if (!refundModal) return;
    setProcessing(true);
    try {
      const body: any = { reason: refundReason };
      if (refundAmount && Number(refundAmount) > 0) body.amount = Number(refundAmount);
      const res = await fetch(`${API}/api/refunds/${refundModal.booking_reference}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Remboursement effectué: ${data.refund_id}`);
      setRefundModal(null);
      fetchRefunds();
    } catch (err: any) { toast.error(err.message); }
    finally { setProcessing(false); }
  };

  const canRefund = (b: Booking) => b.payment_intent_id && b.status !== "refunded" && b.status !== "cancelled" && b.payment_method !== "cash";

  const cardBg = dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200";
  const textMain = dark ? "text-white" : "text-gray-900";
  const textSub = dark ? "text-slate-400" : "text-gray-500";
  const inputCls = `w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${dark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-gray-50 border-gray-300 text-gray-900"}`;

  const statusColor = (s: string) => {
    if (s === "confirmed") return "bg-green-500/10 text-green-500";
    if (s === "refunded") return "bg-orange-500/10 text-orange-500";
    if (s === "cancelled") return "bg-red-500/10 text-red-500";
    if (s === "pending") return "bg-yellow-500/10 text-yellow-500";
    return "bg-gray-500/10 text-gray-500";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500">
          <RefreshCcw className="text-white" size={22} />
        </div>
        <div>
          <h1 className={`text-2xl font-bold ${textMain}`}>Remboursements</h1>
          <p className={`text-sm ${textSub}`}>Gérez les remboursements Stripe des réservations</p>
        </div>
      </div>

      {/* Info */}
      <div className={`flex items-start gap-3 p-4 rounded-xl border ${dark ? "bg-orange-500/5 border-orange-500/20" : "bg-orange-50 border-orange-200"}`}>
        <AlertCircle size={18} className="text-orange-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-orange-600 dark:text-orange-400">
          Seules les réservations payées par Stripe peuvent être remboursées ici. Les paiements en espèces ou en attente doivent être gérés manuellement.
        </p>
      </div>

      {/* Search */}
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-2 ${cardBg}`}>
        <Search size={18} className={textSub} />
        <input type="text" placeholder="Référence de réservation ou email..." value={searchRef} onChange={e => setSearchRef(e.target.value)}
          className={`flex-1 bg-transparent outline-none text-sm ${textMain}`} />
      </div>

      {/* Table */}
      <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={dark ? "bg-slate-700/50" : "bg-gray-50"}>
                  {["Référence", "Email", "Montant", "Devise", "Type", "Paiement", "Statut", "Date", "Action"].map(h => (
                    <th key={h} className={`px-4 py-3 text-left font-semibold text-xs ${textSub}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className={`text-center py-12 ${textSub}`}>Aucune réservation trouvée</td></tr>
                ) : filtered.map((b, i) => (
                  <tr key={i} className={`border-t ${dark ? "border-slate-700 hover:bg-slate-700/30" : "border-gray-100 hover:bg-gray-50"}`}>
                    <td className="px-4 py-3"><span className="font-mono text-xs text-blue-500">{b.booking_reference}</span></td>
                    <td className={`px-4 py-3 text-xs ${textSub}`}>{b.contact_email}</td>
                    <td className={`px-4 py-3 font-semibold ${textMain}`}>{Number(b.total_price).toFixed(2)}</td>
                    <td className={`px-4 py-3 ${textSub}`}>{b.currency}</td>
                    <td className={`px-4 py-3 capitalize ${textSub}`}>{b.type_vol}</td>
                    <td className={`px-4 py-3 capitalize ${textSub}`}>{b.payment_method || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(b.status)}`}>{b.status}</span>
                    </td>
                    <td className={`px-4 py-3 text-xs ${textSub}`}>{new Date(b.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3">
                      {canRefund(b) ? (
                        <button onClick={() => { setRefundModal(b); setRefundAmount(""); setRefundReason("Demande client"); }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 transition-colors">
                          <RefreshCcw size={12} /> Rembourser
                        </button>
                      ) : (
                        <span className={`text-xs ${textSub}`}>{b.status === "refunded" ? "✅ Remboursé" : b.payment_method === "cash" ? "Espèces" : "—"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refund Modal */}
      {refundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4 ${cardBg}`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-lg font-bold ${textMain}`}>Confirmer le remboursement</h2>
              <button onClick={() => setRefundModal(null)} className={`p-2 rounded-lg hover:bg-gray-500/10 ${textSub}`}><X size={18} /></button>
            </div>
            <div className={`p-4 rounded-xl ${dark ? "bg-slate-700/50" : "bg-gray-50"}`}>
              <p className={`text-xs ${textSub}`}>Réservation</p>
              <p className={`font-mono font-bold text-blue-500`}>{refundModal.booking_reference}</p>
              <p className={`text-xs ${textSub} mt-1`}>Montant payé: <span className={`font-semibold ${textMain}`}>{Number(refundModal.total_price).toFixed(2)} {refundModal.currency}</span></p>
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Montant à rembourser (laisser vide = remboursement total)</label>
              <div className="relative">
                <DollarSign size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSub}`} />
                <input type="number" step="0.01" min="0" max={refundModal.total_price} className={`${inputCls} pl-8`}
                  placeholder={`Max: ${Number(refundModal.total_price).toFixed(2)}`} value={refundAmount} onChange={e => setRefundAmount(e.target.value)} />
              </div>
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Raison</label>
              <select className={inputCls} value={refundReason} onChange={e => setRefundReason(e.target.value)}>
                <option>Demande client</option>
                <option>Vol annulé</option>
                <option>Vol retardé</option>
                <option>Erreur de réservation</option>
                <option>Doublon</option>
                <option>Autre</option>
              </select>
            </div>
            <div className={`p-3 rounded-xl border ${dark ? "bg-red-500/5 border-red-500/20" : "bg-red-50 border-red-200"}`}>
              <p className="text-xs text-red-500">⚠️ Cette action est irréversible. Le remboursement sera traité via Stripe.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRefundModal(null)} className={`flex-1 py-2 rounded-xl border font-medium text-sm ${dark ? "border-slate-600 text-slate-300" : "border-gray-300 text-gray-600"}`}>Annuler</button>
              <button onClick={handleRefund} disabled={processing}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium text-sm hover:opacity-90 disabled:opacity-50">
                {processing ? "Traitement..." : "Confirmer le remboursement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
