import { useState, useEffect } from "react";
import { PlusCircle, Plane,  Trash2, UserPlus, Search, X } from "lucide-react";
import { useTheme } from "../../../contexts/theme-context";
import { useAuth } from "../../../hooks/useAuth";
import toast from "react-hot-toast";

const API = "https://steve-airways.onrender.com";

type Flight = { id: number; flight_number: string; from: string; to: string; departure_time: string; departure: string; price: number; seats_available: string; type: string; };
type Passenger = { first_name: string; last_name: string; date_of_birth: string; passport_number: string; nationality: string; seat_number: string; };

const emptyPassenger = (): Passenger => ({ first_name: "", last_name: "", date_of_birth: "", passport_number: "", nationality: "", seat_number: "" });

export default function ManualBookingPage() {
  const { theme } = useTheme();
  const { isAdmin, hasPermission } = useAuth();
  const dark = theme === "dark";

  const [step, setStep] = useState(1);
  const [flightType, setFlightType] = useState<"plane" | "helicopter" | "charter">("plane");
  const [flights, setFlights] = useState<Flight[]>([]);
  const [filteredFlights, setFilteredFlights] = useState<Flight[]>([]);
  const [flightSearch, setFlightSearch] = useState("");
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [passengers, setPassengers] = useState<Passenger[]>([emptyPassenger()]);
  const [contactInfo, setContactInfo] = useState({ name: "", email: "", phone: "" });
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loadingFlights, setLoadingFlights] = useState(false);

  const token = localStorage.getItem("token");

  const fetchFlights = async () => {
    setLoadingFlights(true);
    try {
      const endpoint = flightType === "plane" ? "/api/flighttableplane" : flightType === "helicopter" ? "/api/flighttablehelico" : "/api/flighttablecharter";
      const res = await fetch(`${API}${endpoint}`);
      const data = await res.json();
      const list = data.recentBookings || data.flights || [];
      setFlights(list);
      setFilteredFlights(list);
    } catch { toast.error("Impossible de charger les vols"); }
    finally { setLoadingFlights(false); }
  };

  useEffect(() => { fetchFlights(); setSelectedFlight(null); setFlightSearch(""); }, [flightType]);

  useEffect(() => {
    if (!flightSearch) { setFilteredFlights(flights); return; }
    const q = flightSearch.toLowerCase();
    setFilteredFlights(flights.filter((f: Flight) =>
      f.flight_number?.toLowerCase().includes(q) || f.from?.toLowerCase().includes(q) || f.to?.toLowerCase().includes(q)
    ));
  }, [flightSearch, flights]);

  const addPassenger = () => setPassengers(p => [...p, emptyPassenger()]);
  const removePassenger = (i: number) => setPassengers(p => p.filter((_, idx) => idx !== i));
  const updatePassenger = (i: number, field: keyof Passenger, val: string) => setPassengers(p => p.map((pas, idx) => idx === i ? { ...pas, [field]: val } : pas));

  const totalPrice = selectedFlight ? Number(selectedFlight.price) * passengers.length : 0;

  const handleSubmit = async () => {
    if (!selectedFlight) return toast.error("Sélectionnez un vol");
    if (passengers.some(p => !p.first_name || !p.last_name)) return toast.error("Prénom et nom requis pour chaque passager");
    if (!contactInfo.email) return toast.error("Email de contact requis");
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/manual-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ flightId: selectedFlight.id, passengers, contactInfo, totalPrice, currency, paymentMethod, notes, flight_type: flightType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setStep(4);
      toast.success("Réservation créée avec succès !");
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const cardBg = dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200";
  const textMain = dark ? "text-white" : "text-gray-900";
  const textSub = dark ? "text-slate-400" : "text-gray-500";
  const inputCls = `w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${dark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-gray-50 border-gray-300 text-gray-900"}`;

  const steps = ["Type de vol", "Sélection vol", "Passagers & Contact", "Confirmation"];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500">
          <PlusCircle className="text-white" size={22} />
        </div>
        <div>
          <h1 className={`text-2xl font-bold ${textMain}`}>Réservation Manuelle</h1>
          <p className={`text-sm ${textSub}`}>Créez une réservation directement depuis le backoffice</p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${step === i + 1 ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white" : step > i + 1 ? "bg-green-500/20 text-green-500" : dark ? "bg-slate-700 text-slate-400" : "bg-gray-100 text-gray-400"}`}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center bg-white/20 text-xs">{i + 1}</span> {s}
            </div>
            {i < steps.length - 1 && <div className={`h-0.5 w-6 ${step > i + 1 ? "bg-green-500" : dark ? "bg-slate-700" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className={`rounded-2xl border p-6 space-y-4 ${cardBg}`}>
          <h2 className={`font-semibold ${textMain}`}>Choisissez le type de vol</h2>
          <div className="grid grid-cols-3 gap-4">
            {([["plane","Avion",Plane],["helicopter","Hélicoptère",Plane],["charter","Charter",Plane]] as const).map(([type, label, Icon]) => (
              <button key={type} onClick={() => setFlightType(type as any)}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${flightType === type ? "border-blue-500 bg-blue-500/10" : dark ? "border-slate-600 hover:border-slate-500" : "border-gray-200 hover:border-gray-300"}`}>
                <Icon size={28} className={flightType === type ? "text-blue-500" : textSub} />
                <span className={`font-semibold text-sm ${flightType === type ? "text-blue-500" : textMain}`}>{label}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setStep(2)} className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:opacity-90">
            Suivant →
          </button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className={`rounded-2xl border p-6 space-y-4 ${cardBg}`}>
          <h2 className={`font-semibold ${textMain}`}>Sélectionnez un vol</h2>
          <div className={`flex items-center gap-3 rounded-xl border px-4 py-2 ${dark ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-300"}`}>
            <Search size={16} className={textSub} />
            <input value={flightSearch} onChange={e => setFlightSearch(e.target.value)} placeholder="Rechercher par numéro, départ, arrivée..."
              className={`flex-1 bg-transparent outline-none text-sm ${textMain}`} />
          </div>
          {loadingFlights ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {filteredFlights.length === 0 ? <p className={`text-center py-6 ${textSub}`}>Aucun vol disponible</p> : filteredFlights.map(f => (
                <button key={f.id} onClick={() => setSelectedFlight(f)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedFlight?.id === f.id ? "border-blue-500 bg-blue-500/10" : dark ? "border-slate-600 hover:border-blue-500/50" : "border-gray-200 hover:border-blue-300"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-semibold text-sm ${textMain}`}>{f.flight_number || `Vol #${f.id}`} — {f.from} → {f.to}</p>
                      <p className={`text-xs ${textSub}`}>{f.departure_time ? new Date(f.departure_time).toLocaleString('fr-FR') : ''} · {f.seats_available} sièges dispo</p>
                    </div>
                    <span className="font-bold text-blue-500">{Number(f.price).toFixed(2)} $</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className={`flex-1 py-2 rounded-xl border font-medium ${dark ? "border-slate-600 text-slate-300" : "border-gray-300 text-gray-600"}`}>← Retour</button>
            <button onClick={() => { if (!selectedFlight) return toast.error("Sélectionnez un vol"); setStep(3); }} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:opacity-90">Suivant →</button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Vol sélectionné */}
          {selectedFlight && (
            <div className={`rounded-2xl border p-4 flex items-center justify-between ${cardBg}`}>
              <div>
                <p className={`font-semibold ${textMain}`}>{selectedFlight.flight_number || `Vol #${selectedFlight.id}`} — {selectedFlight.from} → {selectedFlight.to}</p>
                <p className={`text-xs ${textSub}`}>{selectedFlight.departure_time ? new Date(selectedFlight.departure_time).toLocaleString('fr-FR') : ''}</p>
              </div>
              <span className="text-lg font-bold text-blue-500">{(Number(selectedFlight.price) * passengers.length).toFixed(2)} $</span>
            </div>
          )}

          {/* Passagers */}
          <div className={`rounded-2xl border p-6 space-y-4 ${cardBg}`}>
            <div className="flex items-center justify-between">
              <h2 className={`font-semibold ${textMain}`}>Passagers ({passengers.length})</h2>
              <button onClick={addPassenger} className="flex items-center gap-1 text-blue-500 text-sm font-medium hover:opacity-80">
                <UserPlus size={16} /> Ajouter
              </button>
            </div>
            {passengers.map((p, i) => (
              <div key={i} className={`p-4 rounded-xl border space-y-3 ${dark ? "border-slate-600 bg-slate-700/30" : "border-gray-200 bg-gray-50"}`}>
                <div className="flex items-center justify-between">
                  <span className={`font-medium text-sm ${textMain}`}>Passager {i + 1}</span>
                  {passengers.length > 1 && <button onClick={() => removePassenger(i)} className="text-red-400 hover:text-red-500"><Trash2 size={15} /></button>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={`block text-xs mb-1 ${textSub}`}>Prénom *</label><input className={inputCls} value={p.first_name} onChange={e => updatePassenger(i, "first_name", e.target.value)} /></div>
                  <div><label className={`block text-xs mb-1 ${textSub}`}>Nom *</label><input className={inputCls} value={p.last_name} onChange={e => updatePassenger(i, "last_name", e.target.value)} /></div>
                  <div><label className={`block text-xs mb-1 ${textSub}`}>Passeport</label><input className={inputCls} value={p.passport_number} onChange={e => updatePassenger(i, "passport_number", e.target.value)} /></div>
                  <div><label className={`block text-xs mb-1 ${textSub}`}>Nationalité</label><input className={inputCls} value={p.nationality} onChange={e => updatePassenger(i, "nationality", e.target.value)} /></div>
                  <div><label className={`block text-xs mb-1 ${textSub}`}>Date de naissance</label><input type="date" className={inputCls} value={p.date_of_birth} onChange={e => updatePassenger(i, "date_of_birth", e.target.value)} /></div>
                  <div><label className={`block text-xs mb-1 ${textSub}`}>Siège</label><input className={inputCls} placeholder="Ex: 12A" value={p.seat_number} onChange={e => updatePassenger(i, "seat_number", e.target.value)} /></div>
                </div>
              </div>
            ))}
          </div>

          {/* Contact & Paiement */}
          <div className={`rounded-2xl border p-6 space-y-4 ${cardBg}`}>
            <h2 className={`font-semibold ${textMain}`}>Contact & Paiement</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label className={`block text-xs mb-1 ${textSub}`}>Nom contact</label><input className={inputCls} value={contactInfo.name} onChange={e => setContactInfo(c => ({ ...c, name: e.target.value }))} /></div>
              <div><label className={`block text-xs mb-1 ${textSub}`}>Email *</label><input type="email" className={inputCls} value={contactInfo.email} onChange={e => setContactInfo(c => ({ ...c, email: e.target.value }))} /></div>
              <div><label className={`block text-xs mb-1 ${textSub}`}>Téléphone</label><input className={inputCls} value={contactInfo.phone} onChange={e => setContactInfo(c => ({ ...c, phone: e.target.value }))} /></div>
              <div><label className={`block text-xs mb-1 ${textSub}`}>Méthode de paiement</label>
                <select className={inputCls} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option value="cash">Espèces</option>
                  <option value="card">Carte</option>
                  <option value="transfer">Virement</option>
                  <option value="mobile">Mobile Money</option>
                </select>
              </div>
              <div><label className={`block text-xs mb-1 ${textSub}`}>Devise</label>
                <select className={inputCls} value={currency} onChange={e => setCurrency(e.target.value)}>
                  <option value="USD">USD</option>
                  <option value="HTG">HTG</option>
                </select>
              </div>
            </div>
            <div><label className={`block text-xs mb-1 ${textSub}`}>Notes internes</label>
              <textarea className={`${inputCls} h-20 resize-none`} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes optionnelles..." />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className={`flex-1 py-2 rounded-xl border font-medium ${dark ? "border-slate-600 text-slate-300" : "border-gray-300 text-gray-600"}`}>← Retour</button>
            <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:opacity-90 disabled:opacity-50">
              {submitting ? "Création..." : `Créer la réservation — ${totalPrice.toFixed(2)} ${currency}`}
            </button>
          </div>
        </div>
      )}

      {/* Step 4 - Confirmation */}
      {step === 4 && result && (
        <div className={`rounded-2xl border p-8 text-center space-y-4 ${cardBg}`}>
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className={`text-xl font-bold ${textMain}`}>Réservation créée !</h2>
          <p className={textSub}>Référence de réservation :</p>
          <div className="inline-block px-6 py-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <span className="text-2xl font-mono font-bold text-blue-500">{result.booking_reference}</span>
          </div>
          <p className={`text-sm ${textSub}`}>{passengers.length} passager(s) · {selectedFlight?.from} → {selectedFlight?.to}</p>
          <button onClick={() => { setStep(1); setSelectedFlight(null); setPassengers([emptyPassenger()]); setContactInfo({ name: "", email: "", phone: "" }); setResult(null); }}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:opacity-90">
            Nouvelle réservation
          </button>
        </div>
      )}
    </div>
  );
}
