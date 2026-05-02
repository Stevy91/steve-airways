import { useState, useEffect, useCallback, useRef } from "react";
import {
  Users, Search, Plane, CheckCircle2, Clock, UserCheck,
  Printer, ChevronDown, ChevronUp, Edit2, X, Check,
  AlertCircle, Calendar, Filter, Receipt
} from "lucide-react";
import { useTheme } from "../../../contexts/theme-context";
import { useProfile } from "../../../hooks/useProfile";
import toast from "react-hot-toast";

const API = "https://steve-airways.onrender.com";

type PassengerRow = {
  id: number;
  first_name: string;
  last_name: string;
  passport_number: string;
  nationality: string;
  seat_number: string;
  gender: string;
  title: string;
  checked_in: boolean;
  checked_in_at: string | null;
  checked_in_by: string | null;
  booking_reference: string;
  booking_status: string;
  contact_email: string;
  contact_phone: string;
  total_price: number;
  currency: string;
  cabin_class: string;
  payment_method: string;
};

type Flight = {
  flight_id: number;
  flight_number: string;
  departure_time: string;
  arrival_time: string;
  from_city: string;
  from_code: string;
  to_city: string;
  to_code: string;
  type_vol: string;
  total_passengers: number;
  checked_in_count: number;
  price_economy: number;
  price_business: number | null;
  price_first: number | null;
  total_seat: number;
  passengers: PassengerRow[];
};

const CABIN_CLASSES = [
  { value: "economy",  label: "Économie",       icon: "✈️", color: "blue"   },
  { value: "business", label: "Business",        icon: "💼", color: "purple" },
  { value: "first",    label: "Première Classe", icon: "✦",  color: "amber"  },
] as const;

// Rang des classes — on ne peut pas descendre en classe
const CLASS_RANK: Record<string, number> = { economy: 1, business: 2, first: 3 };

const classBadge: Record<string, string> = {
  economy:  "bg-blue-100 text-blue-700",
  business: "bg-purple-100 text-purple-700",
  first:    "bg-amber-100 text-amber-700",
};
const classLabel: Record<string, string> = {
  economy: "Économie", business: "Business", first: "Première",
};
const payMethodLabel: Record<string, string> = {
  cash: "Espèces", card: "Carte", cheque: "Chèque",
  virement: "Virement", transfert: "Dépôt", contrat: "Contrat",
};

// ─── Receipt HTML builder (matches bon.tsx style) ────────────────────────────
function buildReceiptHTML(opts: {
  agentName: string;
  bookingRef: string;
  passengerName: string;
  flightNumber: string;
  fromCity: string;
  toCity: string;
  fromCode: string;
  toCode: string;
  departureTime: string;
  arrivalTime: string;
  totalLabel: string;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  noteLines?: string[];
}) {
  const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${opts.bookingRef}&code=Code128&dpi=96&dataseparator=`;
  const now = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const noteHtml = opts.noteLines
    ? opts.noteLines.map(l => `<div class="info-line" style="color:#d97706;font-style:italic;">${l}</div>`).join("")
    : "";
  const depFmt = new Date(opts.departureTime).toLocaleString("fr-FR");
  const arrFmt = new Date(opts.arrivalTime).toLocaleString("fr-FR");

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
<title>Reçu — ${opts.bookingRef}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#f0f4f8; display:flex; justify-content:center; padding:20px; font-family:'Segoe UI',sans-serif; font-size:13px; color:#333; }
.receipt-container { background:white; border-radius:8px; box-shadow:0 4px 20px rgba(0,0,0,.15); padding:20px; width:320px; }
.header { text-align:center; margin-bottom:15px; }
.header img { height:40px; }
.logo-text { font-size:16px; font-weight:800; color:#1A237E; letter-spacing:1px; margin-top:6px; }
.date-line { font-size:11px; color:#666; margin-top:4px; }
.divider { border-top:1px dashed #ccc; margin:10px 0; }
.section-title { font-weight:700; margin:8px 0 4px; color:#1A237E; font-size:12px; text-transform:uppercase; letter-spacing:.5px; }
.info-line { margin:4px 0; font-size:13px; }
.total { font-weight:700; font-size:15px; color:#d32f2f; }
.barcode { text-align:center; margin:16px 0 8px; }
.barcode img { max-width:100%; height:auto; }
.barcode-ref { font-family:monospace; font-size:13px; color:#1A237E; font-weight:700; margin-top:4px; }
.important { font-size:11px; text-align:center; color:#666; margin-top:12px; }
.important b { display:block; margin-bottom:4px; }
.controls { text-align:center; margin-top:16px; padding-top:14px; border-top:1px solid #eee; display:flex; gap:10px; justify-content:center; }
button { padding:9px 20px; background:#1A237E; color:white; border:none; border-radius:4px; cursor:pointer; font-size:13px; }
button:hover { background:#283593; }
button.close { background:#e2e8f0; color:#333; }
button.close:hover { background:#cbd5e1; }
.badge { display:inline-block; padding:2px 8px; border-radius:20px; font-size:11px; font-weight:700; }
.eco { background:#dbeafe; color:#1d4ed8; }
.biz { background:#ede9fe; color:#7c3aed; }
.fst { background:#fef3c7; color:#d97706; }
@media print { body{background:white;padding:0;} .receipt-container{box-shadow:none;max-width:80mm;} .controls{display:none;} }
</style></head><body>
<div class="receipt-container">
  <div class="header">
    <img src="https://trogonairways.com/assets/logo/trogon-bird-color.svg" alt="Trogon Airways"
         onerror="this.style.display='none';document.getElementById('logoText').style.display='block';">
    <div id="logoText" class="logo-text" style="display:none;">TROGON AIRWAYS</div>
    <div class="logo-text">TROGON AIRWAYS</div>
    <div class="date-line">Reçu de réservation<br>${now}</div>
  </div>
  <div class="divider"></div>
  <div class="info-line" style="font-weight:700;">Caissier: ${opts.agentName}</div>
  <div class="divider"></div>
  ${noteHtml}
  ${opts.noteLines ? '<div class="divider"></div>' : ""}
  <div style="text-align:center;font-weight:700;font-size:14px;">Reçu de paiement</div>
  <div style="text-align:center;font-size:11px;color:#666;">Réf: ${opts.bookingRef}</div>
  <div class="divider"></div>
  <div class="section-title">VOL ALLER</div>
  <div class="info-line">${opts.fromCity} (${opts.fromCode}) → ${opts.toCity} (${opts.toCode})</div>
  <div class="info-line">Vol N°: ${opts.flightNumber}</div>
  <div class="info-line">Départ: ${depFmt}</div>
  <div class="info-line">Arrivée: ${arrFmt}</div>
  <div class="divider"></div>
  <div class="section-title">PASSAGER(S)</div>
  <div class="info-line">${opts.passengerName}</div>
  <div class="divider"></div>
  <div class="section-title">PAIEMENT</div>
  <div class="info-line"><span>${opts.totalLabel}:</span><span style="float:right;" class="total">${opts.totalAmount.toFixed(2)} ${opts.currency.toUpperCase()}</span></div>
  <div class="info-line"><span>Mode:</span><span style="float:right;">${payMethodLabel[opts.paymentMethod] || opts.paymentMethod}</span></div>
  <div class="info-line"><span>Statut:</span><span style="float:right;color:green;font-weight:700;">${opts.paymentStatus}</span></div>
  <div class="barcode">
    <img src="${barcodeUrl}" alt="Barcode ${opts.bookingRef}">
    <div class="barcode-ref">${opts.bookingRef}</div>
  </div>
  <div class="important">
    <b>IMPORTANT</b>
    <div>• Présentez ce reçu à l'enregistrement</div>
    <div>• Arrivez 1h avant le départ</div>
    <div>• Pièces d'identité obligatoires</div>
    <div style="margin-top:8px;">Tél: +509 3341 0404 / +509 2995 0404</div>
    <div>www.trogonairways.com</div>
  </div>
  <div class="controls">
    <button onclick="window.print()">🖨 Imprimer</button>
    <button class="close" onclick="window.close()">Fermer</button>
  </div>
</div></body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function PassengersPage() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const user = useProfile();

  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  // Seat + class modal
  const [seatModal, setSeatModal] = useState<{ open: boolean; passenger: PassengerRow | null; flight: Flight | null }>({ open: false, passenger: null, flight: null });
  const [seatInput, setSeatInput] = useState("");
  const [cabinClass, setCabinClass] = useState<"economy" | "business" | "first">("economy");
  const [surplusPayMethod, setSurplusPayMethod] = useState<string>("cash");
  const [occupiedSeats, setOccupiedSeats] = useState<string[]>([]);
  const [loadingOccupied, setLoadingOccupied] = useState(false);

  const prevClassRef = useRef<string>("economy");
  const prevPriceRef = useRef<number>(0);

  const token = localStorage.getItem("token");

  const fetchFlights = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const params = new URLSearchParams();
      if (dateFilter) params.set("date", dateFilter);
      if (search) params.set("q", search);
      if (typeFilter) params.set("type_vol", typeFilter);
      const res = await fetch(`${API}/api/passengers/by-flight?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data?.details || data?.error || `Erreur serveur (${res.status})`);
        setFlights([]); return;
      }
      setFlights(data.flights || []);
      if ((data.flights || []).length <= 3) {
        setExpanded(new Set((data.flights || []).map((f: Flight) => f.flight_id)));
      }
    } catch (err: any) {
      const msg = err?.message || "Erreur de chargement";
      setApiError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, search, typeFilter]);

  useEffect(() => { fetchFlights(); }, [fetchFlights]);

  // Load occupied seats when modal opens
  useEffect(() => {
    if (!seatModal.open || !seatModal.flight) return;
    setLoadingOccupied(true);
    fetch(`${API}/api/occupied-seats/${seatModal.flight.flight_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.occupiedSeats) {
          const taken = d.occupiedSeats
            .map((s: any) => s.selectedSeat || s)
            .filter((s: string) => s !== seatModal.passenger?.seat_number);
          setOccupiedSeats(taken);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingOccupied(false));
  }, [seatModal.open, seatModal.flight]);

  const openSeatModal = (p: PassengerRow, f: Flight) => {
    setSeatModal({ open: true, passenger: p, flight: f });
    setSeatInput(p.seat_number || "");
    const cls = (p.cabin_class || "economy") as "economy" | "business" | "first";
    setCabinClass(cls);
    prevClassRef.current = cls;
    prevPriceRef.current = Number(p.total_price) || 0;
    setSurplusPayMethod(p.payment_method || "cash");
    setOccupiedSeats([]);
  };

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCheckin = async (passenger: PassengerRow, value: boolean) => {
    setSavingId(passenger.id);
    try {
      const res = await fetch(`${API}/api/passengers/${passenger.id}/checkin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ checked_in: value }),
      });
      if (!res.ok) throw new Error();
      toast.success(value ? `✅ ${passenger.first_name} ${passenger.last_name} enregistré` : `↩️ Enregistrement annulé`);
      fetchFlights();
    } catch { toast.error("Erreur lors de l'enregistrement"); }
    finally { setSavingId(null); }
  };

  const getClassPrice = (flight: Flight | null, cls: string): number => {
    if (!flight) return 0;
    // Retourne 0 (pas le prix économie) si la classe n'a pas de prix défini
    if (cls === "business") return flight.price_business ? Number(flight.price_business) : 0;
    if (cls === "first")    return flight.price_first    ? Number(flight.price_first)    : 0;
    return Number(flight.price_economy ?? 0);
  };

  const handleAssignSeat = async () => {
    if (!seatModal.passenger) return;
    // Siège : nouveau saisi > siège existant > vide (autorisé si uniquement changement de classe)
    const effectiveSeat = seatInput.trim() || seatModal.passenger.seat_number || "";
    setSavingId(seatModal.passenger.id);
    const classChanged = cabinClass !== prevClassRef.current;
    const fullNewPrice = getClassPrice(seatModal.flight, cabinClass);
    const body: any = { cabin_class: cabinClass };
    if (effectiveSeat) body.seat_number = effectiveSeat;
    if (classChanged) body.new_price = fullNewPrice;
    try {
      const res = await fetch(`${API}/api/passengers/${seatModal.passenger.id}/seat`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const surplus = fullNewPrice - prevPriceRef.current;
      toast.success(`✅ Siège ${effectiveSeat.toUpperCase()} assigné${classChanged ? ` · Classe → ${classLabel[cabinClass]}` : ""}`);

      // Auto-open class-change receipt
      if (classChanged && seatModal.passenger && seatModal.flight) {
        handlePrintClassChangeReceipt(
          seatModal.passenger, seatModal.flight,
          prevClassRef.current, cabinClass,
          prevPriceRef.current, fullNewPrice,
          Math.max(0, surplus), surplusPayMethod, effectiveSeat
        );
      }

      setSeatModal({ open: false, passenger: null, flight: null });
      setSeatInput("");
      fetchFlights();
    } catch { toast.error("Erreur lors de l'assignation du siège"); }
    finally { setSavingId(null); }
  };

  /** Receipt for class upgrade — shows surplus only */
  const handlePrintClassChangeReceipt = (
    p: PassengerRow, flight: Flight,
    oldClass: string, newClass: string,
    oldPrice: number, newPrice: number,
    surplus: number, payMethod: string, seat: string,
  ) => {
    const agentName = user?.name || "Agent";
    const noteLines = [
      `⚡ CHANGEMENT DE CLASSE`,
      `Ancienne classe: <span class="badge ${oldClass === "economy" ? "eco" : oldClass === "business" ? "biz" : "fst"}">${classLabel[oldClass] || oldClass}</span>`,
      `Nouvelle classe: <span class="badge ${newClass === "economy" ? "eco" : newClass === "business" ? "biz" : "fst"}">${classLabel[newClass] || newClass}</span>`,
      `Siège assigné: <b>${seat.toUpperCase()}</b>`,
      `Prix déjà payé: <b>${oldPrice.toFixed(2)} USD</b>`,
      `Nouveau tarif: <b>${newPrice.toFixed(2)} USD</b>`,
    ];
    const html = buildReceiptHTML({
      agentName,
      bookingRef: p.booking_reference,
      passengerName: `${p.title ? p.title + " " : ""}${p.first_name} ${p.last_name}`,
      flightNumber: flight.flight_number,
      fromCity: flight.from_city, toCity: flight.to_city,
      fromCode: flight.from_code, toCode: flight.to_code,
      departureTime: flight.departure_time, arrivalTime: flight.arrival_time,
      totalLabel: "SUPPLÉMENT À PAYER",
      totalAmount: surplus,
      currency: "USD",
      paymentMethod: payMethod,
      paymentStatus: surplus === 0 ? "Sans supplément" : "Confirmé",
      noteLines,
    });
    openReceiptWindow(html, 400, 750);
  };

  const openReceiptWindow = (html: string, w: number, h: number) => {
    try {
      const win = window.open("", "_blank", `width=${w},height=${h},scrollbars=yes`);
      if (!win) { toast.error("Popup bloquée — autorisez les popups pour ce site dans votre navigateur"); return; }
      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch (err: any) {
      toast.error("Impossible d'ouvrir le reçu: " + (err?.message || "erreur inconnue"));
    }
  };

  /** Standard payment receipt (from passenger table row) */
  const handlePrintPaymentReceipt = (p: PassengerRow, flight: Flight) => {
    try {
      const agentName = user?.name || "Agent";
      const html = buildReceiptHTML({
        agentName,
        bookingRef: p.booking_reference,
        passengerName: `${p.title ? p.title + " " : ""}${p.first_name} ${p.last_name}`,
        flightNumber: flight.flight_number,
        fromCity: flight.from_city, toCity: flight.to_city,
        fromCode: flight.from_code, toCode: flight.to_code,
        departureTime: flight.departure_time, arrivalTime: flight.arrival_time,
        totalLabel: "TOTAL",
        totalAmount: Number(p.total_price) || 0,
        currency: p.currency || "USD",
        paymentMethod: p.payment_method || "cash",
        paymentStatus: p.booking_status === "confirmed" ? "Confirmé" : "En attente",
      });
      openReceiptWindow(html, 400, 870);
    } catch (err: any) {
      toast.error("Erreur reçu: " + (err?.message || "erreur inconnue"));
    }
  };


  const handlePrintTicket = (p: PassengerRow, flight: Flight) => {
    const dep = new Date(flight.departure_time);
    const arr = new Date(flight.arrival_time);
    const fmt = (d: Date) => d.toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const cabinDisplay = classLabel[p.cabin_class] || "Économie";
    const classBadgeCls = p.cabin_class === "business" ? "#ede9fe;color:#7c3aed" : p.cabin_class === "first" ? "#fef3c7;color:#d97706" : "#dbeafe;color:#1d4ed8";

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
<title>Billet — ${p.first_name} ${p.last_name}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Segoe UI',sans-serif; background:#f0f4f8; display:flex; justify-content:center; padding:30px; }
.ticket { background:white; border-radius:16px; overflow:hidden; width:680px; box-shadow:0 8px 40px rgba(0,0,0,.15); }
.header { background:linear-gradient(135deg,#1e40af,#3b82f6); color:white; padding:24px 28px; display:flex; justify-content:space-between; align-items:center; }
.airline { font-size:22px; font-weight:800; letter-spacing:1px; }
.ticket-label { font-size:11px; opacity:.7; text-transform:uppercase; letter-spacing:2px; }
.route { padding:24px 28px; display:flex; align-items:center; gap:12px; border-bottom:1px dashed #e2e8f0; }
.city { flex:1; }
.city-code { font-size:36px; font-weight:800; color:#1e293b; }
.city-name { font-size:13px; color:#64748b; margin-top:2px; }
.city-time { font-size:15px; font-weight:600; color:#1e293b; margin-top:6px; }
.arrow { display:flex; flex-direction:column; align-items:center; gap:4px; padding:0 12px; }
.arrow-line { width:80px; height:2px; background:linear-gradient(90deg,#3b82f6,#8b5cf6); border-radius:2px; }
.plane-icon { font-size:20px; }
.info-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:0; border-bottom:1px dashed #e2e8f0; }
.info-cell { padding:16px 20px; border-right:1px dashed #e2e8f0; }
.info-cell:last-child { border-right:none; }
.info-label { font-size:10px; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; }
.info-value { font-size:14px; font-weight:700; color:#1e293b; }
.class-badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:700; background:${classBadgeCls.split(";")[0]}; color:${classBadgeCls.split("color:")[1]}; }
.passenger-section { padding:20px 28px; display:flex; justify-content:space-between; align-items:center; }
.passenger-name { font-size:20px; font-weight:800; color:#1e293b; }
.passenger-sub { font-size:13px; color:#64748b; margin-top:3px; }
.status-badge { padding:6px 14px; border-radius:20px; font-size:12px; font-weight:700; }
.status-ok { background:#dcfce7; color:#16a34a; }
.status-pending { background:#fef9c3; color:#ca8a04; }
.footer { background:#f8fafc; padding:16px 28px; display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#94a3b8; }
.ref { font-family:monospace; font-size:13px; color:#3b82f6; font-weight:700; }
@media print { body{background:white;padding:0;} .ticket{box-shadow:none;width:100%;} }
</style></head><body>
<div class="ticket">
  <div class="header">
    <div><div class="airline">✈ TROGON AIRWAYS</div><div class="ticket-label">Carte d'embarquement / Boarding Pass</div></div>
    <div style="text-align:right;"><div style="font-size:11px;opacity:.7;">Vol / Flight</div><div style="font-size:22px;font-weight:800;">${flight.flight_number || "—"}</div></div>
  </div>
  <div class="route">
    <div class="city"><div class="city-code">${flight.from_code || "—"}</div><div class="city-name">${flight.from_city || "—"}</div><div class="city-time">${fmt(dep)}</div></div>
    <div class="arrow"><div class="plane-icon">✈</div><div class="arrow-line"></div></div>
    <div class="city" style="text-align:right;"><div class="city-code">${flight.to_code || "—"}</div><div class="city-name">${flight.to_city || "—"}</div><div class="city-time">${fmt(arr)}</div></div>
  </div>
  <div class="info-grid">
    <div class="info-cell"><div class="info-label">Siège</div><div class="info-value">${p.seat_number || "À assigner"}</div></div>
    <div class="info-cell"><div class="info-label">Classe</div><div class="info-value"><span class="class-badge">${cabinDisplay}</span></div></div>
    <div class="info-cell"><div class="info-label">Passeport / ID</div><div class="info-value" style="font-size:12px;">${p.passport_number || "—"}</div></div>
    <div class="info-cell"><div class="info-label">Check-in</div><div class="info-value">${p.checked_in ? "✅ Effectué" : "⏳ En attente"}</div></div>
  </div>
  <div class="passenger-section">
    <div>
      <div class="passenger-name">${p.title ? p.title + " " : ""}${p.first_name} ${p.last_name}</div>
      <div class="passenger-sub">${p.nationality || ""} ${p.passport_number ? "· " + p.passport_number : ""}</div>
    </div>
    <div class="status-badge ${p.checked_in ? "status-ok" : "status-pending"}">${p.checked_in ? "✅ Enregistré" : "⏳ Non enregistré"}</div>
  </div>
  <div class="footer">
    <div>Réf: <span class="ref">${p.booking_reference}</span></div>
    <div>Trogon Airways · Ce billet doit être présenté à l'embarquement</div>
    <button onclick="window.print()" style="background:#3b82f6;color:white;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:11px;">🖨 Imprimer</button>
  </div>
</div></body></html>`;
    openReceiptWindow(html, 780, 620);
  };

  // Styles
  const cardBg = dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200";
  const textMain = dark ? "text-white" : "text-gray-900";
  const textSub = dark ? "text-slate-400" : "text-gray-500";
  const inputCls = `rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${dark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-gray-50 border-gray-300 text-gray-900"}`;

  const totalPassengers = flights.reduce((s, f) => s + f.total_passengers, 0);
  const totalCheckedIn  = flights.reduce((s, f) => s + f.checked_in_count, 0);
  const typeIcon = (t: string) => t === "helicopter" ? "🚁" : t === "charter" ? "🛩" : "✈️";

  // Modal derived values
  const seatRows    = Math.floor(((seatModal.flight?.total_seat || 30)) / 6) || 5;
  const classChanged = cabinClass !== prevClassRef.current;
  const fullNewPrice  = getClassPrice(seatModal.flight, cabinClass);
  const surplus       = Math.max(0, fullNewPrice - prevPriceRef.current);

  return (
    <div className="p-6 space-y-5">

      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600"><Users className="text-white" size={22} /></div>
          <div>
            <h1 className={`text-2xl font-bold ${textMain}`}>Gestion des Passagers</h1>
            <p className={`text-sm ${textSub}`}>{flights.length} vol(s) · {totalPassengers} passager(s) · {totalCheckedIn} enregistré(s)</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium ${cardBg}`}>
            <CheckCircle2 size={15} className="text-green-500" />
            <span className={textMain}>{totalCheckedIn} / {totalPassengers} check-in</span>
          </div>
          {totalPassengers > 0 && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium ${cardBg}`}>
              <div className="w-24 h-2 rounded-full bg-gray-200 dark:bg-slate-600 overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${Math.round((totalCheckedIn / totalPassengers) * 100)}%` }} />
              </div>
              <span className={textSub}>{Math.round((totalCheckedIn / totalPassengers) * 100)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 ${cardBg}`}>
        <div className="flex items-center gap-2">
          <Calendar size={16} className={textSub} />
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className={inputCls} />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className={textSub} />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={inputCls}>
            <option value="">Tous les types</option>
            <option value="plane">✈️ Avion</option>
            <option value="helicopter">🚁 Hélicoptère</option>
            <option value="charter">🛩 Charter</option>
          </select>
        </div>
        <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); }} className="flex items-center gap-2 flex-1 min-w-48">
          <Search size={16} className={textSub} />
          <input type="text" placeholder="Nom, passeport, réservation, vol..." value={searchInput} onChange={e => setSearchInput(e.target.value)} className={`${inputCls} flex-1`} />
          <button type="submit" className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600">Chercher</button>
          {search && <button type="button" onClick={() => { setSearch(""); setSearchInput(""); }} className={`text-xs ${textSub} hover:text-red-400`}>Effacer</button>}
        </form>
        <button onClick={fetchFlights} className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${dark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
          Actualiser
        </button>
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" /></div>
      ) : apiError ? (
        <div className="text-center py-20 rounded-2xl border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700">
          <AlertCircle size={40} className="mx-auto mb-3 text-red-400" />
          <p className="font-medium text-red-600 dark:text-red-400">Erreur de chargement</p>
          <p className="text-sm mt-1 text-red-500 dark:text-red-300 max-w-md mx-auto px-4">{apiError}</p>
          <button onClick={fetchFlights} className="mt-4 px-4 py-2 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600">Réessayer</button>
        </div>
      ) : flights.length === 0 ? (
        <div className={`text-center py-20 rounded-2xl border ${cardBg}`}>
          <Plane size={40} className={`mx-auto mb-3 ${textSub}`} />
          <p className={`font-medium ${textMain}`}>Aucun vol avec passagers</p>
          <p className={`text-sm mt-1 ${textSub}`}>Essayez une autre date ou effacez les filtres</p>
        </div>
      ) : (
        <div className="space-y-4">
          {flights.map(flight => {
            const isOpen = expanded.has(flight.flight_id);
            const dep = new Date(flight.departure_time);
            const pct = flight.total_passengers > 0 ? Math.round((flight.checked_in_count / flight.total_passengers) * 100) : 0;
            const allChecked = flight.checked_in_count === flight.total_passengers;
            return (
              <div key={flight.flight_id} className={`rounded-2xl border overflow-hidden ${cardBg}`}>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors" onClick={() => toggleExpand(flight.flight_id)}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0 ${flight.type_vol === "helicopter" ? "bg-purple-500/10" : flight.type_vol === "charter" ? "bg-amber-500/10" : "bg-blue-500/10"}`}>
                      {typeIcon(flight.type_vol)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`font-bold text-lg ${textMain}`}>{flight.from_code || flight.from_city} → {flight.to_code || flight.to_city}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-semibold ${dark ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-600"}`}>{flight.flight_number || "Vol sans N°"}</span>
                        {allChecked && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 font-semibold">✅ Complet</span>}
                      </div>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <span className={`text-sm ${textSub}`}>{dep.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })} · {dep.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                        <span className={`text-sm ${textSub}`}>{flight.from_city} → {flight.to_city}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className={`text-xs font-semibold ${textMain}`}>{flight.checked_in_count} / {flight.total_passengers} enregistrés</p>
                      <div className="w-32 h-2 rounded-full bg-gray-200 dark:bg-slate-600 overflow-hidden mt-1">
                        <div className={`h-full rounded-full transition-all ${allChecked ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className={`text-xs ${textSub} mt-0.5`}>{pct}%</p>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${dark ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-600"}`}>
                      <Users size={14} />{flight.total_passengers}
                    </div>
                    {isOpen ? <ChevronUp size={18} className={textSub} /> : <ChevronDown size={18} className={textSub} />}
                  </div>
                </div>

                {isOpen && (
                  <div className={`border-t ${dark ? "border-slate-700" : "border-gray-100"}`}>
                    <div className={`flex items-center justify-between px-4 py-2 text-xs ${dark ? "bg-slate-700/30 text-slate-400" : "bg-gray-50 text-gray-500"}`}>
                      <span>{flight.total_passengers} passager(s) · {flight.checked_in_count} enregistré(s)</span>
                      <button onClick={async (e) => {
                        e.stopPropagation();
                        const unchecked = flight.passengers.filter(p => !p.checked_in);
                        if (unchecked.length === 0) { toast("Tous déjà enregistrés"); return; }
                        for (const p of unchecked) {
                          await fetch(`${API}/api/passengers/${p.id}/checkin`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ checked_in: true }) });
                        }
                        toast.success(`✅ ${unchecked.length} passager(s) enregistrés`); fetchFlights();
                      }} className="text-blue-500 hover:text-blue-600 font-medium hover:underline">Tout enregistrer</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className={dark ? "bg-slate-700/20" : "bg-gray-50/50"}>
                            {["Passager", "Passeport", "Siège", "Classe", "Réservation", "Check-in", "Actions"].map(h => (
                              <th key={h} className={`px-4 py-2.5 text-left font-semibold text-xs ${textSub}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {flight.passengers.map(p => (
                            <tr key={p.id} className={`border-t transition-colors ${dark ? "border-slate-700/50 hover:bg-slate-700/20" : "border-gray-100 hover:bg-gray-50/70"} ${p.checked_in ? (dark ? "bg-green-900/10" : "bg-green-50/50") : ""}`}>

                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${p.checked_in ? "bg-green-500" : "bg-gradient-to-r from-blue-500 to-indigo-500"}`}>
                                    {p.checked_in ? <Check size={14} /> : (p.first_name?.[0] || "?").toUpperCase()}
                                  </div>
                                  <div>
                                    <p className={`font-semibold ${textMain}`}>{p.title ? p.title + " " : ""}{p.first_name} {p.last_name}</p>
                                    <p className={`text-xs ${textSub}`}>{p.nationality || "—"}</p>
                                  </div>
                                </div>
                              </td>

                              <td className={`px-4 py-3 font-mono text-xs ${textMain}`}>{p.passport_number || "—"}</td>

                              <td className="px-4 py-3">
                                {p.seat_number ? (
                                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${dark ? "bg-blue-900/40 text-blue-300" : "bg-blue-50 text-blue-700"}`}>{p.seat_number}</span>
                                ) : (
                                  <button onClick={() => openSeatModal(p, flight)} className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-600 font-medium">
                                    <AlertCircle size={12} /> Assigner
                                  </button>
                                )}
                              </td>

                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${classBadge[p.cabin_class] || classBadge.economy}`}>
                                  {classLabel[p.cabin_class] || "Économie"}
                                </span>
                              </td>

                              <td className="px-4 py-3"><span className="text-blue-500 font-mono text-xs">{p.booking_reference}</span></td>

                              <td className="px-4 py-3">
                                {p.checked_in ? (
                                  <div>
                                    <span className="flex items-center gap-1 text-xs text-green-500 font-semibold"><CheckCircle2 size={13} /> Enregistré</span>
                                    {p.checked_in_by && <p className={`text-xs ${textSub} mt-0.5`}>par {p.checked_in_by}</p>}
                                  </div>
                                ) : (
                                  <span className="flex items-center gap-1 text-xs text-amber-500 font-medium"><Clock size={13} /> En attente</span>
                                )}
                              </td>

                              <td className="px-4 py-3">
                                {(() => {
                                  const isConfirmed = p.booking_status === "confirmed";
                                  return (
                                    <div className="flex items-center gap-1.5">
                                      {!isConfirmed && <span className={`text-xs px-2 py-1 rounded-lg font-medium ${dark ? "bg-yellow-900/40 text-yellow-400" : "bg-yellow-50 text-yellow-600"}`}>Non confirmé</span>}

                                      {/* Check-in */}
                                      <button onClick={() => handleCheckin(p, !p.checked_in)} disabled={savingId === p.id || !isConfirmed}
                                        title={!isConfirmed ? "Réservation non confirmée" : p.checked_in ? "Annuler l'enregistrement" : "Enregistrer le passager"}
                                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${p.checked_in ? dark ? "bg-slate-700 text-slate-300 hover:bg-red-900/30 hover:text-red-400" : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500" : "bg-green-500 text-white hover:bg-green-600"}`}>
                                        {savingId === p.id ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : p.checked_in ? <><X size={12} /> Annuler</> : <><UserCheck size={12} /> Check-in</>}
                                      </button>

                                      {/* Siège / Classe */}
                                      <button onClick={() => openSeatModal(p, flight)} disabled={!isConfirmed}
                                        title={!isConfirmed ? "Réservation non confirmée" : "Modifier le siège / la classe"}
                                        className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${dark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}>
                                        <Edit2 size={13} />
                                      </button>

                                      {/* Reçu de paiement */}
                                      <button onClick={() => handlePrintPaymentReceipt(p, flight)} disabled={!isConfirmed}
                                        title={!isConfirmed ? "Réservation non confirmée" : "Imprimer le reçu de paiement"}
                                        className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${dark ? "hover:bg-slate-700 text-amber-400" : "hover:bg-amber-50 text-amber-500"}`}>
                                        <Receipt size={13} />
                                      </button>

                                      {/* Carte d'embarquement */}
                                      <button onClick={() => handlePrintTicket(p, flight)} disabled={!isConfirmed}
                                        title={!isConfirmed ? "Réservation non confirmée" : "Imprimer la carte d'embarquement"}
                                        className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${dark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}>
                                        <Printer size={13} />
                                      </button>
                                    </div>
                                  );
                                })()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════ MODAL — Siège + Classe ═══════ */}
      {seatModal.open && seatModal.passenger && seatModal.flight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`rounded-2xl shadow-2xl w-full max-w-4xl border flex flex-col max-h-[90vh] overflow-hidden ${cardBg}`}>

            {/* Header */}
            <div className={`flex items-center justify-between p-5 border-b flex-shrink-0 ${dark ? "border-slate-700" : "border-gray-200"}`}>
              <div>
                <h2 className={`font-bold text-lg ${textMain}`}>Siège &amp; Classe</h2>
                <p className={`text-xs ${textSub} mt-0.5`}>
                  {seatModal.passenger.title ? seatModal.passenger.title + " " : ""}{seatModal.passenger.first_name} {seatModal.passenger.last_name}
                  {" · "}{seatModal.flight.flight_number} · {seatModal.flight.from_code} → {seatModal.flight.to_code}
                </p>
              </div>
              <button onClick={() => setSeatModal({ open: false, passenger: null, flight: null })}
                className={`p-1.5 rounded-lg ${dark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-col md:flex-row overflow-auto flex-1">

              {/* LEFT — Seat map */}
              <div className={`flex-1 p-5 border-b md:border-b-0 md:border-r ${dark ? "border-slate-700" : "border-gray-200"}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`font-semibold text-sm ${textMain}`}>Plan de cabine</h3>
                  {loadingOccupied && <span className="text-xs text-slate-400 animate-pulse">Chargement...</span>}
                </div>

                {seatInput && (
                  <div className={`mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 ${dark ? "border-blue-700/40 bg-blue-900/20" : "border-blue-100 bg-blue-50"}`}>
                    <span className="text-xs font-semibold text-blue-500">Siège sélectionné :</span>
                    <span className="font-bold text-blue-600 font-mono">{seatInput}</span>
                    <button onClick={() => setSeatInput("")} className="ml-auto text-xs text-slate-400 hover:text-red-400">Effacer</button>
                  </div>
                )}

                <div className={`rounded-xl border overflow-y-auto max-h-60 p-3 space-y-2 ${dark ? "border-slate-700 bg-slate-900/30" : "border-slate-200 bg-slate-50"}`}>
                  {Array.from({ length: seatRows }).map((_, row) => (
                    <div key={row} className="flex items-center">
                      <div className={`w-6 text-center text-xs font-bold ${textSub}`}>{row + 1}</div>
                      <div className="ml-2 flex flex-1 justify-between">
                        <div className="flex gap-1">
                          {["A", "B", "C"].map(s => {
                            const sid = `${row + 1}${s}`; const occ = occupiedSeats.includes(sid); const sel = seatInput === sid;
                            return <button key={s} type="button" onClick={() => setSeatInput(sid)} disabled={occ}
                              className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${sel ? "bg-blue-500 text-white shadow-lg" : occ ? "bg-red-400 text-white cursor-not-allowed opacity-70" : dark ? "bg-slate-700 text-slate-300 hover:bg-blue-500/20" : "bg-white border border-slate-300 text-slate-700 hover:border-blue-400"}`}>{s}</button>;
                          })}
                        </div>
                        <div className="flex items-center w-8 justify-center"><div className={`h-px w-full ${dark ? "bg-slate-600" : "bg-slate-300"}`} /></div>
                        <div className="flex gap-1">
                          {["D", "E", "F"].map(s => {
                            const sid = `${row + 1}${s}`; const occ = occupiedSeats.includes(sid); const sel = seatInput === sid;
                            return <button key={s} type="button" onClick={() => setSeatInput(sid)} disabled={occ}
                              className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${sel ? "bg-blue-500 text-white shadow-lg" : occ ? "bg-red-400 text-white cursor-not-allowed opacity-70" : dark ? "bg-slate-700 text-slate-300 hover:bg-blue-500/20" : "bg-white border border-slate-300 text-slate-700 hover:border-blue-400"}`}>{s}</button>;
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex gap-4 text-xs">
                  {[{ cls: dark ? "bg-slate-700 border border-slate-600" : "bg-white border border-slate-300", label: "Disponible" }, { cls: "bg-blue-500", label: "Sélectionné" }, { cls: "bg-red-400 opacity-70", label: "Occupé" }].map(({ cls, label }) => (
                    <div key={label} className="flex items-center gap-1.5"><div className={`h-4 w-4 rounded ${cls}`} /><span className={textSub}>{label}</span></div>
                  ))}
                </div>

                <div className="mt-4">
                  <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Ou saisir manuellement</label>
                  <input type="text" value={seatInput} onChange={e => setSeatInput(e.target.value.toUpperCase())} placeholder="Ex: 12A, 3B..."
                    className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold tracking-widest ${dark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-500" : "bg-gray-50 border-gray-300 text-gray-900"}`} />
                </div>
              </div>

              {/* RIGHT — Cabin class + surplus payment + actions */}
              <div className="w-full md:w-80 p-5 flex flex-col gap-4 flex-shrink-0">

                {/* Cabin class */}
                <div>
                  <h3 className={`font-semibold text-sm mb-3 ${textMain}`}>Classe de cabine</h3>
                  <div className="flex flex-col gap-2">
                    {CABIN_CLASSES.map(cls => {
                      const price = getClassPrice(seatModal.flight, cls.value);
                      const noPrice   = cls.value !== "economy" && price === 0;
                      // ⛔ Interdit de descendre en classe inférieure
                      const isDowngrade = CLASS_RANK[cls.value] < CLASS_RANK[prevClassRef.current];
                      const unavailable = noPrice || isDowngrade;
                      const active = cabinClass === cls.value;
                      const borderColor = {
                        blue:   active ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"     : "border-slate-200 dark:border-slate-700 hover:border-blue-300",
                        purple: active ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30" : "border-slate-200 dark:border-slate-700 hover:border-purple-300",
                        amber:  active ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30"   : "border-slate-200 dark:border-slate-700 hover:border-amber-300",
                      }[cls.color];
                      const labelColor = {
                        blue:   active ? "text-blue-700 dark:text-blue-300"     : textMain,
                        purple: active ? "text-purple-700 dark:text-purple-300" : textMain,
                        amber:  active ? "text-amber-700 dark:text-amber-300"   : textMain,
                      }[cls.color];
                      const subLabel = isDowngrade ? "⛔ Déclassement interdit" : noPrice ? "Non disponible" : `$${price.toFixed(2)}`;
                      return (
                        <button key={cls.value} type="button" disabled={unavailable} onClick={() => setCabinClass(cls.value)}
                          title={isDowngrade ? "Impossible de descendre en classe inférieure" : undefined}
                          className={`relative flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${borderColor}`}>
                          <span className="text-xl flex-shrink-0">{cls.icon}</span>
                          <div className="flex-1">
                            <p className={`text-sm font-bold ${labelColor}`}>{cls.label}</p>
                            <p className={`text-xs font-semibold ${unavailable ? "text-red-400" : "text-green-600 dark:text-green-400"}`}>
                              {subLabel}
                            </p>
                          </div>
                          {active && <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                            <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          </span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Price / Surplus summary */}
                {classChanged ? (
                  <div className={`rounded-xl border p-3 space-y-1.5 ${dark ? "border-amber-700/40 bg-amber-900/10" : "border-amber-100 bg-amber-50"}`}>
                    <p className={`text-xs font-semibold ${dark ? "text-amber-400" : "text-amber-600"}`}>
                      ⚡ Changement: {classLabel[prevClassRef.current]} → {classLabel[cabinClass]}
                    </p>
                    <div className="flex justify-between text-xs">
                      <span className={textSub}>Déjà payé</span>
                      <span className={`font-semibold ${textMain}`}>${prevPriceRef.current.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className={textSub}>Nouveau tarif</span>
                      <span className={`font-semibold ${textMain}`}>${fullNewPrice.toFixed(2)}</span>
                    </div>
                    <div className={`flex justify-between text-sm font-bold pt-1 border-t ${dark ? "border-amber-700/40" : "border-amber-200"}`}>
                      <span className="text-amber-600">Supplément à payer</span>
                      <span className="text-amber-700">${surplus.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div className={`rounded-xl border p-3 text-center ${dark ? "border-slate-700 bg-slate-700/30" : "border-slate-200 bg-slate-50"}`}>
                    <p className={`text-xs font-semibold mb-0.5 ${textSub}`}>Prix de la classe</p>
                    <p className={`text-xl font-bold ${textMain}`}>${fullNewPrice.toFixed(2)}</p>
                  </div>
                )}

                {/* Surplus payment method — only visible when class changes */}
                {classChanged && (
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${textSub}`}>Mode de paiement du supplément</label>
                    <select value={surplusPayMethod} onChange={e => setSurplusPayMethod(e.target.value)}
                      className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${dark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-200 text-slate-700"}`}>
                      <option value="cash">Espèces</option>
                      <option value="card">Carte bancaire</option>
                      <option value="cheque">Chèque</option>
                      <option value="virement">Virement</option>
                      <option value="transfert">Dépôt</option>
                      <option value="contrat">Contrat</option>
                    </select>
                  </div>
                )}

                <div className="flex-1" />

                {/* Buttons */}
                <div className="flex flex-col gap-2">
                  <button onClick={handleAssignSeat}
                    disabled={
                      savingId !== null ||
                      // Désactivé seulement si rien à faire : ni siège, ni changement de classe
                      (!seatInput.trim() && !classChanged)
                    }
                    className="w-full py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors">
                    {savingId !== null ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Enregistrement...
                      </span>
                    ) : classChanged ? `Confirmer · Supplément $${surplus.toFixed(2)}` : "Confirmer le siège"}
                  </button>

                  {classChanged && (seatInput.trim() || seatModal.passenger?.seat_number) && (
                    <button type="button"
                      onClick={() => handlePrintClassChangeReceipt(seatModal.passenger!, seatModal.flight!, prevClassRef.current, cabinClass, prevPriceRef.current, fullNewPrice, surplus, surplusPayMethod, seatInput.trim() || seatModal.passenger?.seat_number || "")}
                      className={`w-full py-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${dark ? "border-amber-700/50 text-amber-400 hover:bg-amber-900/20" : "border-amber-200 text-amber-600 hover:bg-amber-50"}`}>
                      <Receipt size={13} /> Aperçu du reçu de supplément
                    </button>
                  )}

                  <button onClick={() => setSeatModal({ open: false, passenger: null, flight: null })}
                    className={`w-full py-2 rounded-xl border text-sm font-medium transition-colors ${dark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
