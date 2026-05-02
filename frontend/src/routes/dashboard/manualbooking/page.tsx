import { useState, useEffect, useRef } from "react";
import { PlusCircle, Plane, Search, ChevronLeft } from "lucide-react";
import { useTheme } from "../../../contexts/theme-context";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const API = "https://steve-airways.onrender.com";

type Flight = {
  id: number;
  flight_number: string;
  from: string;
  to: string;
  departure_time: string;
  departure: string;
  price: number;
  price_economy?: number;
  price_business?: number | null;
  price_first?: number | null;
  seats_available: string;
  total_seat: number;
  type: string;
  airline: string;
};

const emptyForm = () => ({
  firstName: "", middleName: "", lastName: "",
  dateOfBirth: "", address: "", idTypeClient: "passport", idClient: "",
  country: "", nationality: "", email: "", phone: "",
  paymentMethod: "cash", devisePayment: "usd", taux_jour: "",
  companyName: "", reference: "", selectedSeat: "",
  nom_urgence: "", email_urgence: "", tel_urgence: "",
  flightNumberReturn: "", notes: "",
  cabinClass: "economy",
});

export default function ManualBookingPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const dark = theme === "dark";

  const [step, setStep] = useState(1);
  const [flightType, setFlightType] = useState<"plane" | "helicopter" | "charter">("plane");
  const [flights, setFlights] = useState<Flight[]>([]);
  const [filteredFlights, setFilteredFlights] = useState<Flight[]>([]);
  const [flightSearch, setFlightSearch] = useState("");
  const [loadingFlights, setLoadingFlights] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);

  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [calculatedPrice2, setCalculatedPrice2] = useState(0);
  const [loadingReturn, setLoadingReturn] = useState(false);
  const [occupiedSeats, setOccupiedSeats] = useState<string[]>([]);
  const [formData, setFormData] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const returnDebounce = useRef<any>(null);

  const token = localStorage.getItem("token") || localStorage.getItem("authToken");

  const cardBg = dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200";
  const textMain = dark ? "text-white" : "text-gray-900";
  const textSub = dark ? "text-slate-400" : "text-gray-500";
  const inputCls = `w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${dark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-200 text-slate-700 placeholder-slate-400"}`;
  const steps = ["Type de vol", "Selection vol", "Passagers & Paiement", "Confirmation"];

  // Load flights
  useEffect(() => {
    setLoadingFlights(true);
    const ep = flightType === "plane" ? "/api/flighttableplane" : flightType === "helicopter" ? "/api/flighttablehelico" : "/api/flighttablecharter";
    fetch(`${API}${ep}`)
      .then(r => r.json())
      .then(d => { const l = d.recentBookings || d.flights || d || []; setFlights(l); setFilteredFlights(l); })
      .catch(() => toast.error("Erreur chargement des vols"))
      .finally(() => setLoadingFlights(false));
    setSelectedFlight(null); setFlightSearch("");
  }, [flightType]);

  useEffect(() => {
    if (!flightSearch) { setFilteredFlights(flights); return; }
    const q = flightSearch.toLowerCase();
    setFilteredFlights(flights.filter(f =>
      f.flight_number?.toLowerCase().includes(q) || f.from?.toLowerCase().includes(q) || f.to?.toLowerCase().includes(q)
    ));
  }, [flightSearch, flights]);

  // Occupied seats
  useEffect(() => {
    if (!selectedFlight) return;
    fetch(`${API}/api/occupied-seats/${selectedFlight.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success && d.occupiedSeats) setOccupiedSeats(d.occupiedSeats.map((s: any) => s.selectedSeat || s)); })
      .catch(() => {});
  }, [selectedFlight]);

  // Return flight price lookup
  const handleReturnFlightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData(f => ({ ...f, flightNumberReturn: val }));
    if (!val || val.trim().length < 2) { setCalculatedPrice2(0); return; }
    clearTimeout(returnDebounce.current);
    returnDebounce.current = setTimeout(async () => {
      if (val.trim().length >= 3) {
        setLoadingReturn(true);
        try {
          const r = await fetch(`${API}/api/flights/get-price/${val.trim().toUpperCase()}`, { headers: { Authorization: `Bearer ${token}` } });
          if (!r.ok) { if (r.status === 404) toast.error(`Vol ${val} non trouve`); setCalculatedPrice2(0); return; }
          const d = await r.json();
          if (d.success && d.price) { setCalculatedPrice2(Number(d.price) || 0); toast.success(`Prix retour: $${d.price}`, { duration: 2500 }); }
          else setCalculatedPrice2(0);
        } catch { setCalculatedPrice2(0); }
        finally { setLoadingReturn(false); }
      }
    }, 500);
  };

  // Price calc with HTG support + cabin class
  const getClassPrice = (flight: Flight | null, cls: string): number => {
    if (!flight) return 0;
    if (cls === "business" && flight.price_business) return Number(flight.price_business);
    if (cls === "first" && flight.price_first) return Number(flight.price_first);
    return Number(flight.price_economy ?? flight.price ?? 0);
  };
  const basePrice = getClassPrice(selectedFlight, formData.cabinClass);
  const taux = Number(formData.taux_jour) || 0;
  const p1 = formData.devisePayment === "htg" && taux > 0 ? basePrice * taux : basePrice;
  const p2 = formData.devisePayment === "htg" && taux > 0 ? calculatedPrice2 * taux : calculatedPrice2;
  const priceCurrency = formData.devisePayment === "htg" ? "HTG" : "USD";
  const totalPrice = isRoundTrip ? p1 + p2 : p1;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "flightNumberReturn") { handleReturnFlightChange(e as React.ChangeEvent<HTMLInputElement>); return; }
    setFormData(f => {
      const u = { ...f, [name]: value };
      if (name === "devisePayment" && value !== "htg") u.taux_jour = "";
      if (name === "paymentMethod" && value !== "cash") { u.devisePayment = "usd"; u.taux_jour = ""; }
      return u;
    });
  };

  const handleSeatSelect = (sid: string) => setFormData(f => ({ ...f, selectedSeat: f.selectedSeat === sid ? "" : sid }));

  const handleSubmit = async () => {
    if (!selectedFlight) return toast.error("Selectionnez un vol");
    const missing = [!formData.firstName && "Prenom", !formData.lastName && "Nom", !formData.email && "Email", !formData.phone && "Telephone", !formData.nationality && "Nationalite", !formData.dateOfBirth && "Date de naissance"].filter(Boolean);
    if (missing.length) return toast.error(`Champs requis: ${missing.join(", ")}`);
    if (isRoundTrip && p2 <= 0) return toast.error("Entrez un numero de vol retour valide");
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/manual-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          flightId: selectedFlight.id,
          passengers: [{
            first_name: formData.firstName,
            last_name: formData.lastName,
            date_of_birth: formData.dateOfBirth,
            passport_number: formData.idClient,
            nationality: formData.nationality,
            seat_number: formData.selectedSeat,
            middleName: formData.middleName,
            address: formData.address,
            idTypeClient: formData.idTypeClient,
            country: formData.country,
            phone: formData.phone,
            email: formData.email,
            companyName: formData.companyName,
            reference: formData.reference,
            nom_urgence: formData.nom_urgence,
            email_urgence: formData.email_urgence,
            tel_urgence: formData.tel_urgence,
            flightNumberReturn: formData.flightNumberReturn,
            typeVolV: isRoundTrip ? "roundtrip" : "onway",
            devisePayment: formData.devisePayment,
            taux_jour: formData.taux_jour,
            price: totalPrice.toString(),
            cabinClass: formData.cabinClass,
          }],
          contactInfo: { name: `${formData.firstName} ${formData.lastName}`, email: formData.email, phone: formData.phone },
          totalPrice,
          currency: formData.devisePayment,
          paymentMethod: formData.paymentMethod,
          notes: formData.notes,
          flight_type: flightType,
          isRoundTrip,
          returnFlightNumber: formData.flightNumberReturn || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          // Problème de sièges
          throw new Error(
            data.error + (data.details ? `\n${data.details}` : "")
          );
        }
        throw new Error(data.error || data.message || "Erreur serveur");
      }
      setResult({ ...data, flight_type: flightType });
      setStep(4);
      toast.success("Réservation créée — en attente de confirmation du paiement");
    } catch (err: any) { toast.error(err.message || "Erreur serveur"); }
    finally { setSubmitting(false); }
  };

  const resetAll = () => {
    setStep(1); setSelectedFlight(null); setFormData(emptyForm());
    setIsRoundTrip(false); setCalculatedPrice2(0); setResult(null);
  };

  const goToBookings = () => {
    const ft = result?.flight_type || flightType;
    const path = ft === "helicopter" ? "bookings-helico" : ft === "charter" ? "bookings-charter" : "bookings-plane";
    navigate(`/en/dashboard/${path}`);
  };

  const seatRows = Math.floor((selectedFlight?.total_seat || 30) / 6) || 5;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500">
          <PlusCircle className="text-white" size={22} />
        </div>
        <div>
          <h1 className={`text-2xl font-bold ${textMain}`}>Reservation Manuelle</h1>
          <p className={`text-sm ${textSub}`}>Creez une reservation directement depuis le backoffice</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 flex-wrap">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${step === i + 1 ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white" : step > i + 1 ? "bg-green-500/20 text-green-500" : dark ? "bg-slate-700 text-slate-400" : "bg-gray-100 text-gray-400"}`}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center bg-white/20 text-xs">{i + 1}</span>
              {s}
            </div>
            {i < steps.length - 1 && <div className={`h-0.5 w-6 ${step > i + 1 ? "bg-green-500" : dark ? "bg-slate-700" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      {/* STEP 1 — Type de vol */}
      {step === 1 && (
        <div className={`rounded-2xl border p-6 space-y-4 ${cardBg}`}>
          <h2 className={`font-semibold ${textMain}`}>Choisissez le type de vol</h2>
          <div className="grid grid-cols-3 gap-4">
            {([["plane", "Avion"], ["helicopter", "Helicoptere"], ["charter", "Charter"]] as const).map(([type, label]) => (
              <button key={type} onClick={() => setFlightType(type)}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all ${flightType === type ? "border-blue-500 bg-blue-500/10" : dark ? "border-slate-600 hover:border-slate-500" : "border-gray-200 hover:border-gray-300"}`}>
                <Plane size={28} className={flightType === type ? "text-blue-500" : textSub} />
                <span className={`font-semibold text-sm ${flightType === type ? "text-blue-500" : textMain}`}>{label}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setStep(2)} className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:opacity-90">
            Suivant →
          </button>
        </div>
      )}

      {/* STEP 2 — Selection du vol */}
      {step === 2 && (
        <div className={`rounded-2xl border p-6 space-y-4 ${cardBg}`}>
          <h2 className={`font-semibold ${textMain}`}>Selectionnez un vol</h2>
          <div className={`flex items-center gap-3 rounded-xl border px-4 py-2 ${dark ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-300"}`}>
            <Search size={16} className={textSub} />
            <input value={flightSearch} onChange={e => setFlightSearch(e.target.value)}
              placeholder="Rechercher par numero, depart, arrivee..."
              className={`flex-1 bg-transparent outline-none text-sm ${textMain}`} />
          </div>
          {loadingFlights ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {filteredFlights.length === 0
                ? <p className={`text-center py-6 ${textSub}`}>Aucun vol disponible</p>
                : filteredFlights.map(f => (
                  <button key={f.id} onClick={() => { if (Number(f.seats_available) === 0) return; setSelectedFlight(f); }}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedFlight?.id === f.id ? "border-blue-500 bg-blue-500/10" : dark ? "border-slate-600 hover:border-blue-500/50" : "border-gray-200 hover:border-blue-300"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-semibold text-sm ${textMain}`}>{f.flight_number || `Vol #${f.id}`} — {f.from} vers {f.to}</p>
                        <p className={`text-xs ${textSub}`}>
                          {(f.departure_time || f.departure) ? new Date(f.departure_time || f.departure).toLocaleString("fr-FR") : ""}
                        </p>
                        <p className={`text-xs font-semibold ${Number(f.seats_available) === 0 ? "text-red-500" : Number(f.seats_available) <= 5 ? "text-amber-500" : "text-green-600"}`}>
                          {Number(f.seats_available) === 0 ? "COMPLET — Aucun siège disponible" : `${f.seats_available} siège(s) disponible(s) sur ${f.total_seat}`}
                        </p>
                      </div>
                      <span className="font-bold text-blue-500">{Number(f.price).toFixed(2)} $</span>
                    </div>
                  </button>
                ))
              }
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className={`flex-1 py-2 rounded-xl border font-medium ${dark ? "border-slate-600 text-slate-300" : "border-gray-300 text-gray-600"}`}>← Retour</button>
            <button onClick={() => { if (!selectedFlight) return toast.error("Selectionnez un vol"); setStep(3); }}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:opacity-90">
              Suivant →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — Formulaire complet */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Vol selectionne + total */}
          <div className={`rounded-2xl border p-4 flex items-center justify-between ${cardBg}`}>
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(2)} className={`p-1.5 rounded-lg ${dark ? "hover:bg-slate-700" : "hover:bg-gray-100"}`}>
                <ChevronLeft size={18} className={textSub} />
              </button>
              <div>
                <p className={`font-semibold ${textMain}`}>{selectedFlight?.flight_number} — {selectedFlight?.from} vers {selectedFlight?.to}</p>
                <p className={`text-xs ${textSub}`}>{(selectedFlight?.departure_time || selectedFlight?.departure) ? new Date((selectedFlight?.departure_time || selectedFlight?.departure)!).toLocaleString("fr-FR") : ""}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-xs ${textSub}`}>Total</p>
              <p className="text-lg font-bold text-blue-500">{totalPrice.toFixed(2)} {priceCurrency}</p>
            </div>
          </div>

          {/* Round-trip toggle */}
          <div className={`rounded-2xl border p-4 ${cardBg}`}>
            <div className="flex items-center gap-4 flex-wrap">
              <span className={`font-semibold ${textMain}`}>Aller-retour</span>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" checked={isRoundTrip}
                  onChange={e => { setIsRoundTrip(e.target.checked); if (!e.target.checked) { setCalculatedPrice2(0); setFormData(f => ({ ...f, flightNumberReturn: "" })); } }} />
                <div className="peer h-7 w-14 rounded-full bg-slate-300 transition-all peer-checked:bg-blue-500"></div>
                <div className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-all peer-checked:translate-x-7"></div>
              </label>
              {isRoundTrip && (
                <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                  <input name="flightNumberReturn" value={formData.flightNumberReturn} onChange={handleChange}
                    placeholder="Numero de vol retour" className={`${inputCls} flex-1`} />
                  {loadingReturn && <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />}
                  {!loadingReturn && p2 > 0 && <span className="text-sm font-bold text-green-500">{p2.toFixed(2)} {priceCurrency}</span>}
                </div>
              )}
              <div className="ml-auto text-right">
                <p className={`text-xs ${textSub}`}>{isRoundTrip && p2 > 0 ? `Aller: ${p1.toFixed(2)} + Retour: ${p2.toFixed(2)} ${priceCurrency}` : `Prix: ${p1.toFixed(2)} ${priceCurrency}`}</p>
                <p className={`text-sm font-bold ${textMain}`}>Total: {totalPrice.toFixed(2)} {priceCurrency}</p>
              </div>
            </div>
          </div>

          {/* Main form + seat map */}
          <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
            <div className="flex flex-col lg:flex-row">
              {/* Form */}
              <div className="flex-1 p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="flex flex-col gap-1">
                    <label className={`text-xs font-semibold ${textSub}`}>Prenom *</label>
                    <input name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Prenom" className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={`text-xs font-semibold ${textSub}`}>Deuxieme prenom</label>
                    <input name="middleName" value={formData.middleName} onChange={handleChange} placeholder="Deuxieme prenom" className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={`text-xs font-semibold ${textSub}`}>Nom *</label>
                    <input name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Nom de famille" className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={`text-xs font-semibold ${textSub}`}>Date de naissance *</label>
                    <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={`text-xs font-semibold ${textSub}`}>Adresse</label>
                    <input name="address" value={formData.address} onChange={handleChange} placeholder="Adresse" className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={`text-xs font-semibold ${textSub}`}>Type identifiant</label>
                    <select name="idTypeClient" value={formData.idTypeClient} onChange={handleChange} className={inputCls}>
                      <option value="passport">Passeport</option>
                      <option value="nimu">NINU</option>
                      <option value="licens">Permis</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={`text-xs font-semibold ${textSub}`}>{formData.idTypeClient === "nimu" ? "Num. NINU" : formData.idTypeClient === "licens" ? "Num. Permis" : "Num. Passeport"}</label>
                    <input name="idClient" value={formData.idClient} onChange={handleChange}
                      placeholder={formData.idTypeClient === "nimu" ? "000-000-000-0" : "Numero"} className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={`text-xs font-semibold ${textSub}`}>Pays</label>
                    <input name="country" value={formData.country} onChange={handleChange} placeholder="Pays" className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={`text-xs font-semibold ${textSub}`}>Nationalite *</label>
                    <input name="nationality" value={formData.nationality} onChange={handleChange} placeholder="Nationalite" className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={`text-xs font-semibold ${textSub}`}>Email *</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={`text-xs font-semibold ${textSub}`}>Telephone *</label>
                    <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Telephone" className={inputCls} />
                  </div>
                  {/* Classe de cabine — uniquement pour les vols avion */}
                  {flightType === "plane" && (
                    <div className="md:col-span-2 flex flex-col gap-2">
                      <label className={`text-xs font-semibold ${textSub}`}>Classe de cabine</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: "economy", label: "Économie", icon: "✈️", color: "blue",
                            price: selectedFlight ? (Number(selectedFlight.price_economy ?? selectedFlight.price ?? 0)) : 0 },
                          { value: "business", label: "Business", icon: "💼", color: "purple",
                            price: selectedFlight ? (selectedFlight.price_business ? Number(selectedFlight.price_business) : null) : null },
                          { value: "first", label: "Première Classe", icon: "✦", color: "amber",
                            price: selectedFlight ? (selectedFlight.price_first ? Number(selectedFlight.price_first) : null) : null },
                        ].map(cls => {
                          const active = formData.cabinClass === cls.value;
                          const unavailable = cls.value !== "economy" && cls.price === null;
                          const colorMap: Record<string, string> = {
                            blue: active ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30" : "border-gray-200 dark:border-slate-600",
                            purple: active ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30" : "border-gray-200 dark:border-slate-600",
                            amber: active ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30" : "border-gray-200 dark:border-slate-600",
                          };
                          const textColor: Record<string, string> = {
                            blue: active ? "text-blue-700 dark:text-blue-300" : `${textMain}`,
                            purple: active ? "text-purple-700 dark:text-purple-300" : `${textMain}`,
                            amber: active ? "text-amber-700 dark:text-amber-300" : `${textMain}`,
                          };
                          return (
                            <button
                              key={cls.value}
                              type="button"
                              disabled={unavailable}
                              onClick={() => setFormData(f => ({ ...f, cabinClass: cls.value }))}
                              className={`relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${colorMap[cls.color]}`}
                            >
                              <span className="text-xl">{cls.icon}</span>
                              <span className={`text-xs font-bold ${textColor[cls.color]}`}>{cls.label}</span>
                              <span className={`text-xs font-semibold ${cls.price !== null ? "text-green-600 dark:text-green-400" : "text-slate-400"}`}>
                                {unavailable ? "Non disponible" : `$${(cls.price ?? 0).toFixed(2)}`}
                              </span>
                              {active && (
                                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                                  <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <label className={`text-xs font-semibold ${textSub}`}>Mode de paiement</label>
                    <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className={inputCls}>
                      <option value="cash">Cash</option>
                      <option value="card">Carte</option>
                      <option value="cheque">Cheque</option>
                      <option value="virement">Virement</option>
                      <option value="transfert">Depot</option>
                      <option value="contrat">Contrat</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={`text-xs font-semibold ${textSub}`}>Prix total (en attente)</label>
                    <div className={`rounded-xl border px-4 py-3 text-center ${dark ? "bg-amber-900/20 border-amber-700/40" : "bg-amber-50 border-amber-100"}`}>
                      <p className="text-xl font-bold text-amber-600">{totalPrice.toFixed(2)} {priceCurrency}</p>
                      <p className={`text-xs mt-0.5 ${dark ? "text-amber-400" : "text-amber-500"}`}>En attente de paiement</p>
                    </div>
                  </div>
                  {formData.paymentMethod === "cash" && (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className={`text-xs font-semibold ${textSub}`}>Devise</label>
                        <select name="devisePayment" value={formData.devisePayment} onChange={handleChange} className={inputCls}>
                          <option value="usd">USD</option>
                          <option value="htg">GOURDE (HTG)</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className={`text-xs font-semibold ${textSub}`}>Taux du jour</label>
                        <input type="number" name="taux_jour" value={formData.taux_jour} onChange={handleChange}
                          disabled={formData.devisePayment !== "htg"} placeholder="ex: 135"
                          className={`${inputCls} ${formData.devisePayment !== "htg" ? "opacity-50 cursor-not-allowed" : ""}`} />
                      </div>
                    </>
                  )}
                  <div className="flex flex-col gap-1">
                    <label className={`text-xs font-semibold ${textSub}`}>Compagnie</label>
                    <input name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Nom de la compagnie" className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={`text-xs font-semibold ${textSub}`}>Reference</label>
                    <input name="reference" value={formData.reference} onChange={handleChange} placeholder="Numero de reference" className={inputCls} />
                  </div>

                  {/* Contact urgence */}
                  <div className="md:col-span-3">
                    <div className={`rounded-2xl border p-5 ${dark ? "border-rose-900/40 bg-rose-900/10" : "border-rose-100 bg-rose-50"}`}>
                      <h3 className={`mb-4 font-semibold ${dark ? "text-rose-300" : "text-rose-800"}`}>Contact d'urgence</h3>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="flex flex-col gap-1">
                          <label className={`text-xs font-semibold ${textSub}`}>Nom du contact</label>
                          <input name="nom_urgence" value={formData.nom_urgence} onChange={handleChange} placeholder="Nom complet" className={inputCls} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className={`text-xs font-semibold ${textSub}`}>Email</label>
                          <input name="email_urgence" value={formData.email_urgence} onChange={handleChange} placeholder="Email" className={inputCls} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className={`text-xs font-semibold ${textSub}`}>Telephone</label>
                          <input name="tel_urgence" value={formData.tel_urgence} onChange={handleChange} placeholder="Telephone" className={inputCls} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="md:col-span-3 flex flex-col gap-1">
                    <label className={`text-xs font-semibold ${textSub}`}>Notes internes</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2}
                      placeholder="Notes optionnelles..." className={`${inputCls} resize-none`} />
                  </div>

                  {/* Submit */}
                  <div className="md:col-span-3 pt-2">
                    <button onClick={handleSubmit} disabled={submitting}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-base hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      {submitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Creation en cours...
                        </span>
                      ) : `Creer la reservation — ${totalPrice.toFixed(2)} ${priceCurrency} (En attente)`}
                    </button>
                  </div>
                </div>
              </div>

              {/* Seat map */}
              <div className={`w-full lg:w-72 border-t lg:border-t-0 lg:border-l p-6 ${dark ? "border-slate-700 bg-slate-900/30" : "border-slate-200 bg-slate-50"}`}>
                <h3 className={`mb-1 font-semibold ${textMain}`}>Selection de siege</h3>
                <p className={`text-xs mb-4 ${textSub}`}>{selectedFlight?.seats_available} places dispo.</p>
                <div className={`rounded-xl border overflow-y-auto max-h-64 p-3 space-y-2 ${dark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"}`}>
                  {Array.from({ length: seatRows }).map((_, row) => (
                    <div key={row} className="flex items-center">
                      <div className={`w-6 text-center text-xs font-bold ${textSub}`}>{row + 1}</div>
                      <div className="ml-2 flex flex-1 justify-between">
                        <div className="flex gap-1">
                          {["A", "B", "C"].map(s => {
                            const sid = `${row + 1}${s}`;
                            const occ = occupiedSeats.includes(sid);
                            const sel = formData.selectedSeat === sid;
                            return (
                              <button key={s} type="button" onClick={() => handleSeatSelect(sid)} disabled={occ}
                                className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${sel ? "bg-blue-500 text-white shadow-lg" : occ ? "bg-red-400 text-white cursor-not-allowed opacity-70" : dark ? "bg-slate-700 text-slate-300 hover:bg-blue-500/20" : "bg-white border border-slate-300 text-slate-700 hover:border-blue-400"}`}>
                                {s}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center w-6 justify-center">
                          <div className={`h-px w-full ${dark ? "bg-slate-600" : "bg-slate-300"}`} />
                        </div>
                        <div className="flex gap-1">
                          {["D", "E", "F"].map(s => {
                            const sid = `${row + 1}${s}`;
                            const occ = occupiedSeats.includes(sid);
                            const sel = formData.selectedSeat === sid;
                            return (
                              <button key={s} type="button" onClick={() => handleSeatSelect(sid)} disabled={occ}
                                className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${sel ? "bg-blue-500 text-white shadow-lg" : occ ? "bg-red-400 text-white cursor-not-allowed opacity-70" : dark ? "bg-slate-700 text-slate-300 hover:bg-blue-500/20" : "bg-white border border-slate-300 text-slate-700 hover:border-blue-400"}`}>
                                {s}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={`mt-3 space-y-1.5 p-3 rounded-xl border ${dark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"}`}>
                  {[{ c: dark ? "bg-slate-700 border border-slate-600" : "bg-white border border-slate-300", l: "Disponible" }, { c: "bg-blue-500", l: "Selectionne" }, { c: "bg-red-400 opacity-70", l: "Occupe" }].map(({ c, l }) => (
                    <div key={l} className="flex items-center gap-2">
                      <div className={`h-5 w-5 rounded ${c}`} />
                      <span className={`text-xs ${textSub}`}>{l}</span>
                    </div>
                  ))}
                </div>
                {formData.selectedSeat && (
                  <div className={`mt-3 rounded-xl border p-3 text-center ${dark ? "border-blue-900/40 bg-blue-900/10" : "border-blue-100 bg-blue-50"}`}>
                    <p className={`text-xs mb-1 ${textSub}`}>Siege selectionne</p>
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-500">
                        <span className="text-base font-bold text-white">{formData.selectedSeat}</span>
                      </div>
                      <button onClick={() => handleSeatSelect("")} className={`text-xs px-2 py-1 rounded-lg border ${dark ? "border-slate-600 text-slate-300" : "border-slate-300 text-slate-600"} hover:opacity-70`}>
                        Changer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4 — Confirmation */}
      {step === 4 && result && (
        <div className={`rounded-2xl border p-8 space-y-5 ${cardBg}`}>
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-400 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className={`text-xl font-bold ${textMain}`}>Réservation créée</h2>
              <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${dark ? "bg-amber-900/40 text-amber-300" : "bg-amber-100 text-amber-700"}`}>
                EN ATTENTE DE PAIEMENT
              </span>
            </div>
          </div>

          {/* Booking reference */}
          <div className={`rounded-xl border p-4 text-center ${dark ? "border-blue-700/40 bg-blue-900/10" : "border-blue-200 bg-blue-50"}`}>
            <p className={`text-xs uppercase tracking-widest mb-1 ${textSub}`}>Référence de réservation</p>
            <span className="text-2xl font-mono font-bold text-blue-500">{result.booking_reference}</span>
          </div>

          {/* Flight summary */}
          <div className={`rounded-xl border divide-y ${dark ? "border-slate-700 divide-slate-700" : "border-gray-200 divide-gray-100"}`}>
            <div className="flex justify-between items-center px-4 py-3">
              <span className={`text-sm ${textSub}`}>Itinéraire</span>
              <span className={`text-sm font-semibold ${textMain}`}>{selectedFlight?.from} → {selectedFlight?.to}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3">
              <span className={`text-sm ${textSub}`}>Vol</span>
              <span className={`text-sm font-semibold ${textMain}`}>{selectedFlight?.flight_number}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3">
              <span className={`text-sm ${textSub}`}>Passager(s)</span>
              <span className={`text-sm font-semibold ${textMain}`}>{formData.firstName} {formData.lastName}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3">
              <span className={`text-sm ${textSub}`}>Montant</span>
              <span className="text-sm font-bold text-blue-500">{totalPrice.toFixed(2)} {priceCurrency}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3">
              <span className={`text-sm ${textSub}`}>Mode de paiement</span>
              <span className={`text-sm font-semibold ${textMain}`}>{formData.paymentMethod}</span>
            </div>
          </div>

          {/* Next step instructions */}
          <div className={`rounded-xl border p-4 ${dark ? "border-amber-700/40 bg-amber-900/10" : "border-amber-200 bg-amber-50"}`}>
            <p className={`text-sm font-bold mb-2 ${dark ? "text-amber-300" : "text-amber-700"}`}>⏳ Prochaine étape</p>
            <p className={`text-sm ${dark ? "text-amber-200/80" : "text-amber-700"}`}>
              La réservation est enregistrée <strong>sans déduire les sièges</strong>. 
              Une fois le paiement reçu, allez dans la liste des réservations et cliquez 
              <strong> "Confirmer paiement"</strong> — cela déduira les sièges et enverra 
              automatiquement l'e-billet au client.
            </p>
          </div>

          {/* Accès rapide par type */}
          <div className={`rounded-xl border p-4 ${dark ? "border-slate-700 bg-slate-800/50" : "border-gray-200 bg-gray-50"}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${dark ? "text-slate-400" : "text-gray-500"}`}>
              Voir les réservations par type
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => navigate("/en/dashboard/bookings-plane")}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition-all ${dark ? "border-slate-600 hover:border-blue-500 hover:bg-blue-900/20 text-slate-300" : "border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-600"}`}
              >
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
                <span>Avion</span>
              </button>
              <button
                onClick={() => navigate("/en/dashboard/bookings-helico")}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition-all ${dark ? "border-slate-600 hover:border-purple-500 hover:bg-purple-900/20 text-slate-300" : "border-gray-200 hover:border-purple-400 hover:bg-purple-50 text-gray-600"}`}
              >
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
                </svg>
                <span>Hélicoptère</span>
              </button>
              <button
                onClick={() => navigate("/en/dashboard/bookings-charter")}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition-all ${dark ? "border-slate-600 hover:border-emerald-500 hover:bg-emerald-900/20 text-slate-300" : "border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 text-gray-600"}`}
              >
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
                <span>Charter</span>
              </button>
            </div>
          </div>

          {/* Actions principales */}
          <div className="flex gap-3">
            <button onClick={resetAll}
              className={`flex-1 px-4 py-2.5 rounded-xl border font-medium text-sm transition-colors ${dark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
              + Nouvelle réservation
            </button>
            <button onClick={goToBookings}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity">
              Voir mes réservations →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
