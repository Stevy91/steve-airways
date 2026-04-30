import { useState, useEffect, useRef } from "react";
import { PlusCircle, Plane, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useTheme } from "../../../contexts/theme-context";
import toast from "react-hot-toast";

const API = "https://steve-airways.onrender.com";

type Flight = {
  id: number;
  flight_number: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  price: number;
  seats_available: string;
  total_seat: number;
  type: string;
  airline: string;
};

const emptyForm = () => ({
  firstName: "", middleName: "", lastName: "",
  dateOfBirth: "", address: "", idTypeClient: "passport", idClient: "",
  country: "", nationality: "", email: "", phone: "",
  paymentMethod: "cash", unpaid: "", devisePayment: "usd", taux_jour: "",
  companyName: "", reference: "", selectedSeat: "",
  nom_urgence: "", email_urgence: "", tel_urgence: "",
  flightNumberReturn: "", passengerCount: "1",
});

export default function ManualBookingPage() {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [step, setStep] = useState<1 | 2>(1);
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

  // Fetch flights
  useEffect(() => {
    setLoadingFlights(true);
    const endpoint = flightType === "plane" ? "/api/flighttableplane"
      : flightType === "helicopter" ? "/api/flighttablehelico"
      : "/api/flighttablecharter";
    fetch(`${API}${endpoint}`)
      .then(r => r.json())
      .then(d => {
        const list = d.recentBookings || d.flights || [];
        setFlights(list);
        setFilteredFlights(list);
      })
      .catch(() => toast.error("Erreur chargement des vols"))
      .finally(() => setLoadingFlights(false));
    setSelectedFlight(null);
    setFlightSearch("");
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
    fetch(`${API}/api/flights/${selectedFlight.id}/passengers`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setOccupiedSeats((d.occupiedSeats || []).map((s: any) => s.selectedSeat || s)))
      .catch(() => {});
  }, [selectedFlight]);

  // Return flight lookup — uses same endpoint as bon.tsx
  const handleFlightNumberReturnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const flightNumber = e.target.value;
    setFormData(f => ({ ...f, flightNumberReturn: flightNumber }));

    if (!flightNumber || flightNumber.trim().length < 2) {
      setCalculatedPrice2(0);
      return;
    }

    clearTimeout(returnDebounce.current);
    returnDebounce.current = setTimeout(async () => {
      if (flightNumber.trim().length >= 3) {
        setLoadingReturn(true);
        try {
          const tk = localStorage.getItem("token") || localStorage.getItem("authToken");
          const r = await fetch(`${API}/api/flights/get-price/${flightNumber.trim().toUpperCase()}`, {
            headers: { Authorization: `Bearer ${tk}` },
          });
          if (!r.ok) {
            if (r.status === 404) toast.error(`Vol ${flightNumber} non trouve`);
            setCalculatedPrice2(0);
            return;
          }
          const d = await r.json();
          if (d.success && d.price) {
            setCalculatedPrice2(Number(d.price) || 0);
            toast.success(`Prix retour : $${d.price}`, { duration: 2500 });
          } else {
            setCalculatedPrice2(0);
          }
        } catch { setCalculatedPrice2(0); }
        finally { setLoadingReturn(false); }
      }
    }, 500);
  };

  // Price calculation — mirrors bon.tsx exactly
  const baseFlightPrice = selectedFlight ? Number(selectedFlight.price) : 0;
  const tauxJourNumber = Number(formData.taux_jour) || 0;
  const calculatedPrice = formData.devisePayment === "htg" && tauxJourNumber > 0
    ? baseFlightPrice * tauxJourNumber : baseFlightPrice;
  const calculatedPrice3 = formData.devisePayment === "htg" && tauxJourNumber > 0
    ? calculatedPrice2 * tauxJourNumber : calculatedPrice2;
  const priceCurrency = formData.devisePayment === "htg" ? "HTG" : "USD";
  const price1 = Number(calculatedPrice) || 0;
  const price2 = Number(calculatedPrice3) || 0;
  const totalPrice = isRoundTrip ? price1 + price2 : price1;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (name === "flightNumberReturn") {
      handleFlightNumberReturnChange(e as React.ChangeEvent<HTMLInputElement>);
      return;
    }
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(f => {
      const updated = { ...f, [name]: type === "checkbox" ? (checked ? "pending" : "") : value };
      if (name === "devisePayment" && value !== "htg") updated.taux_jour = "";
      if (name === "paymentMethod" && value !== "cash") { updated.devisePayment = "usd"; updated.taux_jour = ""; }
      return updated;
    });
  };

  const handleSeatSelect = (seatId: string) => {
    setFormData(f => ({ ...f, selectedSeat: f.selectedSeat === seatId ? "" : seatId }));
  };

  const handleSubmit = async () => {
    if (!selectedFlight) return toast.error("Aucun vol selectionne");
    const missing = [
      !formData.firstName && "Prenom",
      !formData.lastName && "Nom",
      !formData.email && "Email",
      !formData.phone && "Telephone",
      !formData.nationality && "Nationalite",
      !formData.dateOfBirth && "Date de naissance",
    ].filter(Boolean);
    if (missing.length) return toast.error(`Champs requis : ${missing.join(", ")}`);
    if (isRoundTrip && price2 <= 0) return toast.error("Entrez un numero de vol retour valide");

    setSubmitting(true);
    const passengers = [{
      firstName: formData.firstName,
      middleName: formData.middleName,
      lastName: formData.lastName,
      flightNumberReturn: formData.flightNumberReturn || "",
      reference: formData.reference || "",
      companyName: formData.companyName || "",
      idClient: formData.idClient || "",
      idTypeClient: formData.idTypeClient || "passport",
      nom_urgence: formData.nom_urgence || "",
      email_urgence: formData.email_urgence || "",
      tel_urgence: formData.tel_urgence || "",
      dateOfBirth: formData.dateOfBirth,
      address: formData.address || "",
      type: "adult",
      typeVol: selectedFlight.type || flightType,
      typeVolV: isRoundTrip ? "roundtrip" : "onway",
      country: formData.country || "",
      nationality: formData.nationality || "",
      phone: formData.phone || "",
      email: formData.email || "",
      devisePayment: formData.devisePayment || "usd",
      price: totalPrice.toString(),
      taux_jour: formData.taux_jour || "",
      selectedSeat: formData.selectedSeat || "",
    }];

    const body = {
      flightId: selectedFlight.id,
      passengers,
      contactInfo: { email: formData.email, phone: formData.phone },
      totalPrice,
      unpaid: formData.unpaid || "confirmed",
      referenceNumber: formData.reference || "",
      currency: formData.devisePayment || "usd",
      price: totalPrice,
      taux_jour: formData.taux_jour || "",
      companyName: formData.companyName || "",
      departureDate: selectedFlight.departure?.split("T")[0],
      paymentMethod: formData.paymentMethod || "cash",
      idClient: formData.idClient || "",
      idTypeClient: formData.idTypeClient || "passport",
      returnFlightNumber: formData.flightNumberReturn || null,
      isRoundTrip,
      selectedSeat: formData.selectedSeat || "",
    };

    try {
      const res = await fetch(`${API}/api/create-ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Erreur");
      setResult(data);
      toast.success("Reservation creee avec succes !");
    } catch (err: any) {
      toast.error(err.message || "Erreur serveur");
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    setStep(1); setSelectedFlight(null); setFormData(emptyForm());
    setIsRoundTrip(false); setCalculatedPrice2(0); setResult(null);
  };

  // ─── STEP 1: Flight selection ───────────────────────────────────────────────
  if (step === 1) return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500">
          <PlusCircle className="text-white" size={22} />
        </div>
        <div>
          <h1 className={`text-2xl font-bold ${textMain}`}>Reservation Manuelle</h1>
          <p className={`text-sm ${textSub}`}>Selectionnez un vol pour commencer</p>
        </div>
      </div>

      {/* Type tabs */}
      <div className={`flex gap-2 p-1 rounded-xl border ${cardBg}`}>
        {(["plane", "helicopter", "charter"] as const).map(t => (
          <button key={t} onClick={() => setFlightType(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${flightType === t ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow" : `${textSub} hover:text-blue-500`}`}>
            {t === "plane" ? "Avion" : t === "helicopter" ? "Helicoptere" : "Charter"}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-2 ${cardBg}`}>
        <Search size={16} className={textSub} />
        <input className={`flex-1 bg-transparent outline-none text-sm ${textMain}`}
          placeholder="Rechercher par numero, depart, arrivee..."
          value={flightSearch} onChange={e => setFlightSearch(e.target.value)} />
      </div>

      {/* Flights list */}
      <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
        {loadingFlights ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : filteredFlights.length === 0 ? (
          <p className={`text-center py-12 ${textSub}`}>Aucun vol disponible</p>
        ) : filteredFlights.map(f => (
          <div key={f.id} onClick={() => setSelectedFlight(prev => prev?.id === f.id ? null : f)}
            className={`flex items-center justify-between px-5 py-4 cursor-pointer transition-all border-b last:border-b-0 ${dark ? "border-slate-700" : "border-gray-100"} ${selectedFlight?.id === f.id ? "bg-blue-500/10 border-l-4 border-l-blue-500" : dark ? "hover:bg-slate-700/40" : "hover:bg-gray-50"}`}>
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-xl ${selectedFlight?.id === f.id ? "bg-blue-500 text-white" : dark ? "bg-slate-700 text-slate-400" : "bg-gray-100 text-gray-500"}`}>
                <Plane size={16} />
              </div>
              <div>
                <p className={`font-bold ${textMain}`}>{f.flight_number}</p>
                <p className={`text-sm ${textSub}`}>{f.from} → {f.to}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-blue-500">${Number(f.price).toFixed(2)}</p>
              <p className={`text-xs ${textSub}`}>{f.seats_available} places</p>
            </div>
            <div className={`text-sm ${textSub} hidden md:block`}>
              {f.departure ? new Date(f.departure).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={() => { if (!selectedFlight) return toast.error("Selectionnez un vol"); setStep(2); }}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:opacity-90 transition-all disabled:opacity-40"
          disabled={!selectedFlight}>
          Continuer <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );

  // ─── SUCCESS ────────────────────────────────────────────────────────────────
  if (result) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      </div>
      <h2 className={`text-2xl font-bold ${textMain}`}>Reservation creee !</h2>
      <p className={textSub}>Reference de reservation :</p>
      <div className="px-6 py-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
        <span className="text-2xl font-mono font-bold text-blue-500">{result.booking_reference || result.bookingReference}</span>
      </div>
      <p className={`text-sm ${textSub}`}>{selectedFlight?.from} → {selectedFlight?.to} · {totalPrice.toFixed(2)} {priceCurrency}</p>
      <button onClick={resetAll} className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:opacity-90">
        Nouvelle reservation
      </button>
    </div>
  );

  // ─── STEP 2: Full form ──────────────────────────────────────────────────────
  const seatRows = Math.floor((selectedFlight?.total_seat || 30) / 6) || 5;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => setStep(1)} className={`p-2 rounded-xl ${dark ? "hover:bg-slate-700" : "hover:bg-gray-100"} ${textSub}`}>
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className={`text-xl font-bold ${textMain}`}>
            Ticket pour vol {selectedFlight?.flight_number}
          </h1>
          <p className={`text-sm ${textSub}`}>{selectedFlight?.from} → {selectedFlight?.to}</p>
        </div>
        <div className="text-right">
          <p className={`text-xs ${textSub}`}>Total</p>
          <p className="text-lg font-bold text-blue-500">{totalPrice.toFixed(2)} {formData.devisePayment?.toUpperCase()}</p>
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
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <input name="flightNumberReturn" value={formData.flightNumberReturn}
                onChange={handleChange} placeholder="Numero de vol retour"
                className={`${inputCls} flex-1`} />
              {loadingReturn && <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />}
              {!loadingReturn && price2 > 0 && <span className="text-sm font-bold text-green-500">{price2.toFixed(2)} {priceCurrency}</span>}
            </div>
          )}
          <div className="ml-auto text-right">
            <p className={`text-xs ${textSub}`}>{isRoundTrip && price2 > 0 ? `Aller: ${price1.toFixed(2)} + Retour: ${price2.toFixed(2)} ${priceCurrency}` : `Prix: ${price1.toFixed(2)} ${priceCurrency}`}</p>
            <p className={`text-sm font-bold ${textMain}`}>Total: {totalPrice.toFixed(2)} {formData.devisePayment?.toUpperCase()}</p>
          </div>
        </div>
      </div>

      {/* Main form + seat map */}
      <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
        <div className="flex flex-col lg:flex-row">

          {/* Form (left) */}
          <div className="flex-1 p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

              {/* Name fields */}
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

              {/* DOB */}
              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${textSub}`}>Date de naissance *</label>
                <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={inputCls} />
              </div>

              {/* Address */}
              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${textSub}`}>Adresse</label>
                <input name="address" value={formData.address} onChange={handleChange} placeholder="Adresse complete" className={inputCls} />
              </div>

              {/* ID Type */}
              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${textSub}`}>Type d'identifiant</label>
                <select name="idTypeClient" value={formData.idTypeClient} onChange={handleChange} className={inputCls}>
                  <option value="passport">Passeport</option>
                  <option value="nimu">NINU</option>
                  <option value="licens">Permis</option>
                </select>
              </div>

              {/* ID Number */}
              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${textSub}`}>
                  {formData.idTypeClient === "nimu" ? "NINU" : formData.idTypeClient === "licens" ? "Num. Permis" : "Num. Passeport"}
                </label>
                <input name="idClient" value={formData.idClient} onChange={handleChange}
                  placeholder={formData.idTypeClient === "nimu" ? "000-000-000-0" : formData.idTypeClient === "licens" ? "Numero permis" : "Numero passeport"}
                  className={inputCls} />
              </div>

              {/* Country */}
              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${textSub}`}>Pays</label>
                <input name="country" value={formData.country} onChange={handleChange} placeholder="Pays" className={inputCls} />
              </div>

              {/* Nationality */}
              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${textSub}`}>Nationalite *</label>
                <input name="nationality" value={formData.nationality} onChange={handleChange} placeholder="Nationalite" className={inputCls} />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${textSub}`}>Email *</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" className={inputCls} />
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${textSub}`}>Telephone *</label>
                <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Telephone" className={inputCls} />
              </div>

              {/* Payment method */}
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

              {/* Payment status */}
              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${textSub}`}>Statut paiement</label>
                <div className={`rounded-xl border px-4 py-3 flex items-center justify-between ${dark ? "bg-slate-700 border-slate-600" : "bg-white border-slate-200"}`}>
                  <span className={`text-sm ${textMain}`}>Marquer impaye</span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" name="unpaid" className="peer sr-only"
                      onChange={e => setFormData(f => ({ ...f, unpaid: e.target.checked ? "pending" : "" }))} />
                    <div className="peer h-6 w-12 rounded-full bg-slate-300 peer-checked:bg-amber-500"></div>
                    <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all peer-checked:translate-x-6"></div>
                  </label>
                </div>
              </div>

              {/* Total price display */}
              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${textSub}`}>Prix total</label>
                <div className={`rounded-xl border px-4 py-3 text-center ${dark ? "bg-slate-700/50 border-slate-600" : "bg-amber-50 border-amber-100"}`}>
                  <p className="text-xl font-bold text-amber-600">{totalPrice.toFixed(2)} {formData.devisePayment?.toUpperCase()}</p>
                </div>
              </div>

              {/* Cash-specific: currency + taux */}
              {formData.paymentMethod === "cash" && (<>
                <div className="flex flex-col gap-1">
                  <label className={`text-xs font-semibold ${textSub}`}>Devise de paiement</label>
                  <select name="devisePayment" value={formData.devisePayment} onChange={handleChange} className={inputCls}>
                    <option value="usd">USD</option>
                    <option value="htg">GOURDE</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={`text-xs font-semibold ${textSub}`}>Taux du jour</label>
                  <input type="number" name="taux_jour" value={formData.taux_jour} onChange={handleChange}
                    disabled={formData.devisePayment !== "htg"} placeholder="ex: 135"
                    className={`${inputCls} ${formData.devisePayment !== "htg" ? "opacity-50 cursor-not-allowed" : ""}`} />
                </div>
              </>)}

              {/* Company name */}
              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${textSub}`}>Nom de la compagnie</label>
                <input name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Compagnie" className={inputCls} />
              </div>

              {/* Reference */}
              <div className="flex flex-col gap-1">
                <label className={`text-xs font-semibold ${textSub}`}>Numero de reference</label>
                <input name="reference" value={formData.reference} onChange={handleChange} placeholder="Reference" className={inputCls} />
              </div>

              {/* Emergency contact */}
              <div className="md:col-span-3">
                <div className={`rounded-2xl border p-5 ${dark ? "border-rose-900/40 bg-rose-900/10" : "border-rose-100 bg-rose-50"}`}>
                  <h3 className={`mb-4 font-semibold ${dark ? "text-rose-300" : "text-rose-800"}`}>Contact d'urgence</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="flex flex-col gap-1">
                      <label className={`text-xs font-semibold ${textSub}`}>Nom du contact</label>
                      <input name="nom_urgence" value={formData.nom_urgence} onChange={handleChange} placeholder="Nom complet" className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className={`text-xs font-semibold ${textSub}`}>Email du contact</label>
                      <input name="email_urgence" value={formData.email_urgence} onChange={handleChange} placeholder="Email" className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className={`text-xs font-semibold ${textSub}`}>Tel. du contact</label>
                      <input name="tel_urgence" value={formData.tel_urgence} onChange={handleChange} placeholder="Telephone" className={inputCls} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="md:col-span-3 pt-2">
                <button onClick={handleSubmit} disabled={submitting}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold text-base hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Creation en cours...
                    </span>
                  ) : "Confirmer et creer le ticket"}
                </button>
              </div>
            </div>
          </div>

          {/* Seat map (right) */}
          <div className={`w-full lg:w-80 border-t lg:border-t-0 lg:border-l p-6 ${dark ? "border-slate-700 bg-slate-900/30" : "border-slate-200 bg-slate-50"}`}>
            <h3 className={`mb-1 font-semibold ${textMain}`}>Selection de siege</h3>
            <p className={`text-xs mb-4 ${textSub}`}>{selectedFlight?.airline} · {selectedFlight?.seats_available} places dispo.</p>

            <div className="flex justify-between px-2 mb-2">
              <span className={`text-xs ${textSub}`}>Gauche</span>
              <span className={`text-xs ${textSub}`}>Droite</span>
            </div>

            <div className={`rounded-xl border overflow-y-auto max-h-72 p-3 space-y-2 ${dark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"}`}>
              {Array.from({ length: seatRows }).map((_, row) => (
                <div key={row} className="flex items-center">
                  <div className={`w-6 text-center text-xs font-bold ${textSub}`}>{row + 1}</div>
                  <div className="ml-2 flex flex-1 justify-between">
                    <div className="flex gap-1">
                      {["A", "B", "C"].map(s => {
                        const sid = `${row + 1}${s}`;
                        const occupied = occupiedSeats.includes(sid);
                        const selected = formData.selectedSeat === sid;
                        return (
                          <button key={s} type="button" onClick={() => handleSeatSelect(sid)} disabled={occupied}
                            className={`h-9 w-9 rounded-lg text-xs font-bold transition-all ${selected ? "bg-gradient-to-br from-blue-400 to-blue-500 text-white shadow-lg" : occupied ? "bg-red-400 text-white cursor-not-allowed opacity-70" : `${dark ? "bg-slate-700 text-slate-300 hover:bg-blue-500/20" : "bg-white border border-slate-300 text-slate-700 hover:border-blue-400"}`}`}
                            title={`Siege ${sid}`}>{s}</button>
                        );
                      })}
                    </div>
                    <div className="flex items-center w-8 justify-center">
                      <div className={`h-px w-full ${dark ? "bg-slate-600" : "bg-slate-300"}`} />
                    </div>
                    <div className="flex gap-1">
                      {["D", "E", "F"].map(s => {
                        const sid = `${row + 1}${s}`;
                        const occupied = occupiedSeats.includes(sid);
                        const selected = formData.selectedSeat === sid;
                        return (
                          <button key={s} type="button" onClick={() => handleSeatSelect(sid)} disabled={occupied}
                            className={`h-9 w-9 rounded-lg text-xs font-bold transition-all ${selected ? "bg-gradient-to-br from-blue-400 to-blue-500 text-white shadow-lg" : occupied ? "bg-red-400 text-white cursor-not-allowed opacity-70" : `${dark ? "bg-slate-700 text-slate-300 hover:bg-blue-500/20" : "bg-white border border-slate-300 text-slate-700 hover:border-blue-400"}`}`}
                            title={`Siege ${sid}`}>{s}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className={`mt-4 rounded-xl border p-3 space-y-2 ${dark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"}`}>
              {[
                { color: dark ? "bg-slate-700 border border-slate-600" : "bg-white border border-slate-300", label: "Disponible" },
                { color: "bg-gradient-to-br from-blue-400 to-blue-500", label: "Selectionne" },
                { color: "bg-red-400 opacity-70", label: "Occupe" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`h-6 w-6 rounded-lg ${color}`} />
                  <span className={`text-xs ${textSub}`}>{label}</span>
                </div>
              ))}
            </div>

            {/* Selected seat */}
            {formData.selectedSeat && (
              <div className={`mt-4 rounded-xl border p-4 text-center ${dark ? "border-blue-900/40 bg-blue-900/10" : "border-blue-100 bg-blue-50"}`}>
                <p className={`text-xs mb-1 ${textSub}`}>Siege selectionne</p>
                <div className="flex items-center justify-center gap-3">
                  <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-500">
                    <span className="text-lg font-bold text-white">{formData.selectedSeat}</span>
                  </div>
                  <button onClick={() => handleSeatSelect("")}
                    className={`text-xs px-3 py-1.5 rounded-lg border ${dark ? "border-slate-600 text-slate-300" : "border-slate-300 text-slate-600"} hover:opacity-70`}>
                    Changer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
