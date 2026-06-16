import { useState, useEffect, useCallback, useRef } from "react";
import {
    Users,
    Search,
    Plane,
    CheckCircle2,
    Clock,
    UserCheck,
    Printer,
    ChevronDown,
    ChevronUp,
    Edit2,
    X,
    Check,
    AlertCircle,
    Calendar,
    Filter,
    Receipt,
    Package,
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
    bag_count_hold:  number;
    bag_weight_hold: number | null;
    bag_count_cabin: number;
    excess_fee:      number;
    excess_currency: string;
    bag_tag:         string | null;
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
    { value: "economy", label: "Économie", icon: "✈️", color: "blue" },
    { value: "business", label: "Business", icon: "💼", color: "purple" },
    { value: "first", label: "Première Classe", icon: "✦", color: "amber" },
] as const;

// Rang des classes — on ne peut pas descendre en classe
const CLASS_RANK: Record<string, number> = { economy: 1, business: 2, first: 3 };

const classBadge: Record<string, string> = {
    economy: "bg-blue-100 text-blue-700",
    business: "bg-purple-100 text-purple-700",
    first: "bg-amber-100 text-amber-700",
};
const classLabel: Record<string, string> = {
    economy: "Économie",
    business: "Business",
    first: "Première",
};
const payMethodLabel: Record<string, string> = {
    cash: "Espèces",
    card: "Carte",
    cheque: "Chèque",
    virement: "Virement",
    transfert: "Dépôt",
    contrat: "Contrat",
};

// ─── Baggage label printer ───────────────────────────────────────────────────
function printBaggageLabel(opts: {
    passengerName: string;
    flightNumber: string;
    fromCode: string;
    toCode: string;
    fromCity: string;
    toCity: string;
    departureTime: string;
    bagTag: string;
    bagCountHold: number;
    bagWeightHold: number | null;
    bookingRef: string;
}) {
    const dep = new Date(opts.departureTime).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" });
    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${opts.bagTag}&code=Code128&dpi=96&dataseparator=`;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Étiquette — ${opts.bagTag}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; background:#f0f4f8; display:flex; justify-content:center; align-items:flex-start; padding:24px; }
  .label { background:white; border:3px solid #1e3a5f; border-radius:12px; width:340px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,.15); }
  .label-header { background:#1e3a5f; color:white; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; }
  .airline-name { font-size:15px; font-weight:900; letter-spacing:1px; }
  .label-type { font-size:10px; opacity:.7; text-transform:uppercase; letter-spacing:1px; margin-top:2px; }
  .route-band { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:2px dashed #e2e8f0; background:#f8fafc; }
  .airport-code { font-size:38px; font-weight:900; color:#1e3a5f; line-height:1; }
  .airport-name { font-size:11px; color:#64748b; margin-top:3px; }
  .arrow { font-size:24px; color:#3b82f6; }
  .tag-section { padding:14px 20px; border-bottom:1px dashed #e2e8f0; text-align:center; }
  .tag-label { font-size:10px; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; }
  .tag-number { font-size:28px; font-weight:900; color:#1e3a5f; letter-spacing:3px; font-family:monospace; }
  .barcode-section { padding:10px 20px; text-align:center; border-bottom:1px dashed #e2e8f0; }
  .barcode-section img { max-width:100%; height:50px; }
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:0; }
  .info-cell { padding:10px 16px; border-right:1px dashed #e2e8f0; border-bottom:1px dashed #e2e8f0; }
  .info-cell:nth-child(2n) { border-right:none; }
  .info-cell:nth-last-child(-n+2) { border-bottom:none; }
  .info-cell-label { font-size:9px; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-bottom:3px; }
  .info-cell-val { font-size:13px; font-weight:700; color:#1e293b; }
  .passenger-band { background:#1e3a5f; color:white; padding:10px 16px; text-align:center; }
  .passenger-name { font-size:16px; font-weight:800; letter-spacing:.5px; }
  .ref-small { font-size:10px; opacity:.7; margin-top:2px; }
  .controls { text-align:center; padding:14px; border-top:1px solid #eee; display:flex; gap:10px; justify-content:center; }
  button { padding:9px 20px; background:#1e3a5f; color:white; border:none; border-radius:4px; cursor:pointer; font-size:13px; }
  button.close { background:#e2e8f0; color:#333; }
  @media print { body{background:white;padding:0;} .label{box-shadow:none;border:2px solid #1e3a5f;} .controls{display:none;} }
  * { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
</style></head><body>
<div class="label">
  <div class="label-header">
    <div>
      <div class="airline-name">✈ TROGON AIRWAYS</div>
      <div class="label-type">Étiquette bagage</div>
    </div>
    <div style="text-align:right;font-size:11px;opacity:.8;">${dep}</div>
  </div>
  <div class="passenger-band">
    <div class="passenger-name">${opts.passengerName.toUpperCase()}</div>
    <div class="ref-small">${opts.bookingRef}</div>
  </div>
  <div class="route-band">
    <div>
      <div class="airport-code">${opts.fromCode}</div>
      <div class="airport-name">${opts.fromCity}</div>
    </div>
    <div class="arrow">→</div>
    <div style="text-align:right;">
      <div class="airport-code">${opts.toCode}</div>
      <div class="airport-name">${opts.toCity}</div>
    </div>
  </div>
  <div class="tag-section">
    <div class="tag-label">N° Étiquette bagage</div>
    <div class="tag-number">${opts.bagTag}</div>
  </div>
  <div class="barcode-section">
    <img src="${barcodeUrl}" alt="${opts.bagTag}">
  </div>
  <div class="info-grid">
    <div class="info-cell">
      <div class="info-cell-label">Vol</div>
      <div class="info-cell-val">${opts.flightNumber}</div>
    </div>
    <div class="info-cell">
      <div class="info-cell-label">Date départ</div>
      <div class="info-cell-val">${dep}</div>
    </div>
    <div class="info-cell">
      <div class="info-cell-label">Nb. bagages soute</div>
      <div class="info-cell-val">${opts.bagCountHold} sac(s)</div>
    </div>
    <div class="info-cell">
      <div class="info-cell-label">Poids total</div>
      <div class="info-cell-val">${opts.bagWeightHold != null ? opts.bagWeightHold + " kg" : "—"}</div>
    </div>
  </div>
</div>
<div class="controls">
  <button onclick="window.print()">🖨️ Imprimer étiquette</button>
  <button class="close" onclick="window.close()">Fermer</button>
</div>
</body></html>`;
    const win = window.open("", "_blank", "width=440,height=780");
    if (win) { win.document.write(html); win.document.close(); }
    else alert("Autorisez les popups pour imprimer l'étiquette.");
}

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
    // Bagages
    bagTag?: string | null;
    bagCountHold?: number;
    bagWeightHold?: number | null;
    bagCountCabin?: number;
    excessFee?: number;
    excessCurrency?: string;
    // Classe cabin
    cabinClass?: string;
}) {
    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${opts.bookingRef}&code=Code128&dpi=96&dataseparator=`;
    const now = new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
    const noteHtml = opts.noteLines
        ? opts.noteLines.map((l) => `<div class="info-line" style="color:#d97706;font-style:italic;">${l}</div>`).join("")
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
    <img src="https://trogonairways.com/logo-trogonpng.png" alt="Trogon Airways" style="height:45px;margin-bottom:4px;"
         onerror="this.style.display='none'">
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
  ${opts.cabinClass && opts.cabinClass !== "economy" ? `<div class="info-line"><span>Classe:</span><span style="float:right;"><span class="badge ${opts.cabinClass === "business" ? "biz" : "fst"}">${opts.cabinClass === "business" ? "Business" : "Première Classe"}</span></span></div>` : ""}
  ${opts.bagTag ? `
  <div class="divider"></div>
  <div class="section-title" style="color:#b45309;">🧳 BAGAGES</div>
  <div class="info-line"><span>Étiquette:</span><span style="float:right;font-family:monospace;font-weight:bold;color:#1A237E;">${opts.bagTag}</span></div>
  ${(opts.bagCountHold ?? 0) > 0 ? `<div class="info-line"><span>Soute:</span><span style="float:right;">${opts.bagCountHold} sac(s)${opts.bagWeightHold != null ? " · " + opts.bagWeightHold + " kg" : ""}</span></div>` : ""}
  ${(opts.bagCountCabin ?? 0) > 0 ? `<div class="info-line"><span>Cabine:</span><span style="float:right;">${opts.bagCountCabin} sac(s)</span></div>` : ""}
  ${(opts.excessFee ?? 0) > 0 ? `<div class="info-line" style="color:#d32f2f;"><span>⚠ Surpoids:</span><span style="float:right;font-weight:bold;">${Number(opts.excessFee).toFixed(2)} ${(opts.excessCurrency || "USD").toUpperCase()}</span></div>` : ""}
  ` : ""}
  <div class="divider"></div>
  <div class="section-title">PAIEMENT</div>
  <div class="info-line"><span>${opts.totalLabel}:</span><span style="float:right;" class="total">${opts.totalAmount.toFixed(2)} ${opts.currency.toUpperCase()}</span></div>
  ${(opts.excessFee ?? 0) > 0 ? `<div class="info-line" style="color:#d32f2f;"><span>Surpoids:</span><span style="float:right;font-weight:bold;">+ ${Number(opts.excessFee).toFixed(2)} ${(opts.excessCurrency||"USD").toUpperCase()}</span></div>` : ""}
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
    const [seatModal, setSeatModal] = useState<{ open: boolean; passenger: PassengerRow | null; flight: Flight | null }>({
        open: false,
        passenger: null,
        flight: null,
    });
    const [seatInput, setSeatInput] = useState("");
    const [cabinClass, setCabinClass] = useState<"economy" | "business" | "first">("economy");
    const [surplusPayMethod, setSurplusPayMethod] = useState<string>("cash");
    const [occupiedSeats, setOccupiedSeats] = useState<string[]>([]);
    const [loadingOccupied, setLoadingOccupied] = useState(false);

    const prevClassRef = useRef<string>("economy");
    const prevPriceRef = useRef<number>(0);

    // Baggage modal
    const [bagModal, setBagModal] = useState<{ open: boolean; passenger: PassengerRow | null; flight: Flight | null }>({
        open: false, passenger: null, flight: null,
    });
    const [bagForm, setBagForm] = useState({ bag_count_hold: 0, bag_weight_hold: "", bag_count_cabin: 0, excess_fee: "", excess_currency: "USD" });
    const [savingBag, setSavingBag] = useState(false);
    const [savedTag, setSavedTag] = useState<string | null>(null);

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
                setFlights([]);
                return;
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

    useEffect(() => {
        fetchFlights();
    }, [fetchFlights]);

    // Load occupied seats when modal opens
    useEffect(() => {
        if (!seatModal.open || !seatModal.flight) return;
        setLoadingOccupied(true);
        fetch(`${API}/api/occupied-seats/${seatModal.flight.flight_id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((d) => {
                if (d.success && d.occupiedSeats) {
                    const taken = d.occupiedSeats.map((s: any) => s.selectedSeat || s).filter((s: string) => s !== seatModal.passenger?.seat_number);
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

    const openBagModal = (p: PassengerRow, f: Flight) => {
        setBagModal({ open: true, passenger: p, flight: f });
        setBagForm({
            bag_count_hold: p.bag_count_hold || 0,
            bag_weight_hold: p.bag_weight_hold != null ? String(p.bag_weight_hold) : "",
            bag_count_cabin: p.bag_count_cabin || 0,
            excess_fee: p.excess_fee ? String(p.excess_fee) : "",
            excess_currency: p.excess_currency || "USD",
        });
        setSavedTag(p.bag_tag || null);
    };

    const handleSaveBaggage = async () => {
        if (!bagModal.passenger) return;
        setSavingBag(true);
        try {
            const res = await fetch(`${API}/api/passengers/${bagModal.passenger.id}/baggage`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    bag_count_hold:  Number(bagForm.bag_count_hold),
                    bag_weight_hold: bagForm.bag_weight_hold ? parseFloat(bagForm.bag_weight_hold) : null,
                    bag_count_cabin: Number(bagForm.bag_count_cabin),
                    excess_fee:      bagForm.excess_fee ? parseFloat(bagForm.excess_fee) : 0,
                    excess_currency: bagForm.excess_currency,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erreur serveur");
            setSavedTag(data.bag_tag || null);
            toast.success("Bagages enregistrés ✓");
            fetchFlights();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSavingBag(false);
        }
    };

    const toggleExpand = (id: number) => {
        setExpanded((prev) => {
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
        } catch {
            toast.error("Erreur lors de l'enregistrement");
        } finally {
            setSavingId(null);
        }
    };

    const getClassPrice = (flight: Flight | null, cls: string): number => {
        if (!flight) return 0;
        // Retourne 0 (pas le prix économie) si la classe n'a pas de prix défini
        if (cls === "business") return flight.price_business ? Number(flight.price_business) : 0;
        if (cls === "first") return flight.price_first ? Number(flight.price_first) : 0;
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
                    seatModal.passenger,
                    seatModal.flight,
                    prevClassRef.current,
                    cabinClass,
                    prevPriceRef.current,
                    fullNewPrice,
                    Math.max(0, surplus),
                    surplusPayMethod,
                    effectiveSeat,
                );
            }

            setSeatModal({ open: false, passenger: null, flight: null });
            setSeatInput("");
            fetchFlights();
        } catch {
            toast.error("Erreur lors de l'assignation du siège");
        } finally {
            setSavingId(null);
        }
    };

    /** Receipt for class upgrade — shows surplus only */
    const handlePrintClassChangeReceipt = (
        p: PassengerRow,
        flight: Flight,
        oldClass: string,
        newClass: string,
        oldPrice: number,
        newPrice: number,
        surplus: number,
        payMethod: string,
        seat: string,
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
            fromCity: flight.from_city,
            toCity: flight.to_city,
            fromCode: flight.from_code,
            toCode: flight.to_code,
            departureTime: flight.departure_time,
            arrivalTime: flight.arrival_time,
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
            if (!win) {
                toast.error("Popup bloquée — autorisez les popups pour ce site dans votre navigateur");
                return;
            }
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
                fromCity: flight.from_city,
                toCity: flight.to_city,
                fromCode: flight.from_code,
                toCode: flight.to_code,
                departureTime: flight.departure_time,
                arrivalTime: flight.arrival_time,
                totalLabel: "TOTAL",
                totalAmount: Number(p.total_price) || 0,
                currency: p.currency || "USD",
                paymentMethod: p.payment_method || "cash",
                paymentStatus: p.booking_status === "confirmed" ? "Confirmé" : "En attente",
                // Bagages
                bagTag:        p.bag_tag        || null,
                bagCountHold:  p.bag_count_hold  || 0,
                bagWeightHold: p.bag_weight_hold ?? null,
                bagCountCabin: p.bag_count_cabin || 0,
                excessFee:     p.excess_fee      || 0,
                excessCurrency:p.excess_currency || "USD",
                // Classe
                cabinClass:    p.cabin_class     || "economy",
            });
            openReceiptWindow(html, 400, 900);
        } catch (err: any) {
            toast.error("Erreur reçu: " + (err?.message || "erreur inconnue"));
        }
    };

    const handlePrintTicket = (p: PassengerRow, flight: Flight) => {
        const dep = new Date(flight.departure_time);
        const arr = new Date(flight.arrival_time);
        const fmtDate = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
        const fmtTime = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        const cabinDisplay = classLabel[p.cabin_class] || "ÉCONOMIE";
        const classBadgeCls =
            p.cabin_class === "business" ? "#ede9fe;color:#7c3aed" : p.cabin_class === "first" ? "#fef3c7;color:#d97706" : "#dbeafe;color:#1d4ed8";

        const logoUrl = "https://trogonairways.com/logo-carte2.png";
        const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${p.booking_reference}&code=Code128&dpi=96&dataseparator=`;
        const passengerName = (p.title ? p.title + " " : "") + p.first_name + " " + p.last_name;
        const cabinLabel = p.cabin_class === "business" ? "BUSINESS CLASS" : p.cabin_class === "first" ? "PREMIÈRE CLASSE" : "ECONOMY CLASS";
        const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
<title>Carte d'embarquement — ${p.first_name} ${p.last_name}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,sans-serif;background:#b8d3e8;display:flex;flex-direction:column;align-items:center;padding:28px;}
.wrap{display:flex;flex-direction:column;align-items:center;}

/* ═══ CARD ═══ */
.card{
  display:flex;
  width:720px;
  height:272px;
  background:white;
  border-radius:12px;
  overflow:visible;
  box-shadow:0 6px 28px rgba(0,0,0,.18);
  position:relative;
}

/* ═══ MAIN SECTION (490px) ═══ */
.main{
  width:490px;
  flex-shrink:0;
  display:flex;
  flex-direction:column;
  border-radius:12px 0 0 12px;
  overflow:hidden;
}

/* ═══ DIVIDER WITH NOTCHES ═══ */
.div-wrap{
  width:2px;
  flex-shrink:0;
  position:relative;
  border-left:2px dashed #8ab3cc;
}
.div-wrap::before{
  content:'';position:absolute;
  top:-9px;left:-9px;
  width:16px;height:16px;
  background:#b8d3e8;
  border-radius:50%;
}
.div-wrap::after{
  content:'';position:absolute;
  bottom:-9px;left:-9px;
  width:16px;height:16px;
  background:#b8d3e8;
  border-radius:50%;
}

/* ═══ STUB (228px) ═══ */
.stub{
  flex:1;
  display:flex;
  flex-direction:column;
  border-radius:0 12px 12px 0;
  overflow:hidden;
}

/* ─── HEADER ROW (55px) ─── */
.main-hdr{
  height:55px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:0 16px;
  background:white;
}
.stub-hdr{
  height:55px;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:0 12px;
  background:white;
}
/* Airline logo area */
.airline{display:flex;align-items:center;gap:0;}
.speed{display:flex;flex-direction:column;gap:3px;margin-right:5px;}
.sl{height:2px;background:#0c3566;border-radius:1px;}
.sl1{width:26px;}
.sl2{width:20px;}
.sl3{width:14px;}
.apl{font-size:20px;color:#0099cc;margin-right:5px;line-height:1;}
.aname{font-size:12px;font-weight:900;color:#0c3566;letter-spacing:.8px;font-style:italic;text-transform:uppercase;white-space:nowrap;}

.bp-title{font-size:17px;font-weight:900;color:#0c3566;letter-spacing:1.5px;text-transform:uppercase;white-space:nowrap;}
.class-lbl{font-size:17px;font-weight:900;color:#0c3566;letter-spacing:1.5px;text-transform:uppercase;text-align:center;white-space:nowrap;}

/* ─── BLUE ROUTE BAND (68px) ─── */
.main-route{
  height:68px;
  background:#0099cc;
  display:flex;
  align-items:center;
  padding:0 16px;
  flex-shrink:0;
}
.stub-route{
  height:68px;
  background:#0099cc;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-shrink:0;
}
.code{font-size:70px;font-weight:900;color:white;letter-spacing:-1px;line-height:1;font-family:'Arial Black',Arial,sans-serif;}
.stub-codes{font-size:26px;font-weight:900;color:white;letter-spacing:2px;font-family:'Arial Black',Arial,sans-serif;}

/* Arrow: two lines + plane */
.arrow-wrap{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:0 8px;}
.a-row{display:flex;align-items:center;width:100%;}
.a-line{flex:1;height:2px;background:rgba(255,255,255,.75);}
.a-plane{font-size:20px;color:white;flex-shrink:0;}

/* ─── INFO SECTION (fills rest ~149px) ─── */
.info{
  flex:1;
  display:flex;
  overflow:hidden;
}
/* Left column: NAME DATE BOARDING + barcode */
.info-left{
  width:196px;
  flex-shrink:0;
  padding:10px 12px 8px 16px;
  display:flex;
  flex-direction:column;
  gap:5px;
}
/* Right column: FLIGHT GATE SEAT (large) */
.info-right{
  flex:1;
  padding:10px 12px 8px 10px;
  display:flex;
  flex-direction:column;
  gap:2px;
  position:relative;
}

/* Label-value row (left col): "NAME   Dean M. Winters" */
.i-row{display:flex;align-items:baseline;gap:8px;}
.i-lbl{font-size:12px;font-weight:600;color:#0c3566;text-transform:uppercase;letter-spacing:.5px;min-width:46px;flex-shrink:0;}

.i-val{font-size:12px;font-weight:400;color:#222;}

/* Barcode */
.bc-wrap{margin-top:4px;}
.bc-img{height:38px;width:158px;object-fit:fill;display:block;}
.bc-num{font-family:monospace;font-size:8px;color:#666;letter-spacing:.5px;margin-top:2px;}

/* Label + big value rows (right col) */
.f-row{display:flex;align-items:baseline;gap:8px;margin-bottom:1px;}
.f-lbl{font-size:10px;font-weight:900;color:#0c3566;text-transform:uppercase;letter-spacing:.5px;min-width:46px;flex-shrink:0;}
.f-val{font-size:28px;font-weight:900;color:#0c3566;line-height:1;font-family:'Arial Black',Arial,sans-serif;white-space:nowrap;}
.f-val-sm{font-size:14px;font-weight:900;color:#0c3566;line-height:1;font-family:'Arial Black',Arial,sans-serif;white-space:nowrap;}

/* Footer: website + plane (bottom right of info-right) */
.info-foot{
  position:absolute;
  bottom:7px;right:8px;
  display:flex;align-items:center;gap:4px;
  font-size:8px;color:#8ab;letter-spacing:.8px;font-weight:700;
}

/* ─── STUB INFO ─── */
.stub-info{
  flex:1;
  padding:9px 12px 6px;
  display:flex;
  flex-direction:column;
  gap:4px;
}
/* Inline pairs: "FLIGHT GA6657   GATE 5" */
.s-line{display:flex;align-items:baseline;gap:10px;}
.s-lbl{font-size:9px;font-weight:900;color:#0c3566;text-transform:uppercase;letter-spacing:.4px;}
.s-val{font-size:8px;font-weight:900;color:#0c3566;font-family:'Arial Black',Arial,sans-serif;}
.s-sep{flex:1;}
/* Name/Date rows */
.s-full{display:flex;align-items:baseline;gap:8px;margin-top:2px;}
.s-full .s-lbl{min-width:44px;}
.s-full .s-val{font-size:8px;font-family:Arial,sans-serif;font-weight:400;color:#222;}

/* Stub barcode */
.stub-bc{
  padding:5px 12px 9px;
  border-top:1px dashed #8ab3cc;
  text-align:center;
}
.stub-bc img{width:100%;height:34px;display:block;}
.stub-bc-num{font-family:monospace;font-size:7px;color:#777;letter-spacing:.5px;margin-top:2px;}

/* Controls */
.controls{margin-top:16px;display:flex;gap:10px;}
button{padding:9px 22px;background:#0c3566;color:white;border:none;border-radius:7px;cursor:pointer;font-size:13px;font-weight:700;}
button.close-btn{background:#dde5ed;color:#374151;}
@media print{
  body{background:white;padding:0;}
  .div-wrap::before,.div-wrap::after{background:white;}
  .controls{display:none!important;}
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
}
</style></head>
<body>
<div class="wrap">
<div class="card">

  <!-- ═══ MAIN ═══ -->
  <div class="main">
    <div class="main-hdr">
        <div class="airline">
            <div class="speed">
            <div class="sl sl1"></div>
            <div class="sl sl2"></div>
            <div class="sl sl3"></div>
            </div>
            <!-- <span class="apl">✈</span> -->
            <img src="${logoUrl}" alt="" style="height:26px;object-fit:contain;" onerror="this.style.display='none'">
            
        </div>
      <div class="bp-title">BOARDING PASS</div>
    </div>

    <div class="main-route">
      <div class="code">${flight.from_code || "—"}</div>
      <div class="arrow-wrap">
        <div class="a-row"></div>
        <div class="a-row">
          <div class="a-line"></div>
          <div class="a-plane">✈</div>
          <div class="a-line"></div>
        </div>
      </div>
      <div class="code">${flight.to_code || "—"}</div>
    </div>

    <div class="info">
      <div class="info-left">
        <div class="i-row"><div class="i-lbl">NAME</div><div class="i-val">${passengerName}</div></div>
        <div class="i-row"><div class="i-lbl">DATE</div><div class="i-val">${fmtDate(dep)}</div></div>
        <div class="i-row"><div class="i-lbl">BOARDING</div><div class="i-val">${fmtTime(dep)}</div></div>
        <div class="bc-wrap">
          <img class="bc-img" src="${barcodeUrl}" alt="${p.booking_reference}">
         <!-- <div class="bc-num">${p.booking_reference}</div> -->
        </div>
      </div>
      <div class="info-right">
        <div class="f-row"><div class="f-lbl">FLIGHT</div><div class="f-val-sm">${flight.flight_number || "—"}</div></div>
        <div class="f-row"><div class="f-lbl">GATE</div><div class="f-val">—</div></div>
        <div class="f-row"><div class="f-lbl">SEAT</div><div class="f-val">${p.seat_number || "—"}</div></div>
        <div class="info-foot">TROGONAIRWAYS.COM &nbsp;✈</div>
      </div>
    </div>
  </div>

  <!-- ═══ DIVIDER ═══ -->
  <div class="div-wrap"></div>

  <!-- ═══ STUB ═══ -->
  <div class="stub">
    <div class="stub-hdr">
      <div class="class-lbl">${cabinLabel}</div>
    </div>
    <div class="stub-route">
      <div class="stub-codes">${flight.from_code || "—"} - ${flight.to_code || "—"}</div>
    </div>
    <div class="stub-info">
      <div class="s-line">
        <span class="s-lbl">FLIGHT</span><span class="s-val" style="font-size:9px;">${flight.flight_number || "—"}</span>
        <span class="s-sep"></span>
        <span class="s-lbl">GATE</span><span class="s-val">—</span>
      </div>
      <div class="s-line">
        <span class="s-lbl">BOARDING</span><span class="s-val">${fmtTime(dep)}</span>
        <span class="s-sep"></span>
        <span class="s-lbl">SEAT</span><span class="s-val">${p.seat_number || "—"}</span>
      </div>
      <div class="s-full"><span class="s-lbl">NAME</span><span class="s-val">${p.first_name} ${p.last_name}</span></div>
      <div class="s-full"><span class="s-lbl">DATE</span><span class="s-val">${fmtDate(dep)}</span></div>
    </div>
    <div class="stub-bc">
      <img src="${barcodeUrl}" alt="${p.booking_reference}">
     <!-- <div class="stub-bc-num">${p.booking_reference}</div> -->
    </div>
  </div>

</div>
<div class="controls">
  <button onclick="window.print()">🖨️ Imprimer</button>
  <button class="close-btn" onclick="window.close()">Fermer</button>
</div>
</div>
</body></html>`;
        openReceiptWindow(html, 850, 500);
    };

    // Styles
    const cardBg = dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200";
    const textMain = dark ? "text-white" : "text-gray-900";
    const textSub = dark ? "text-slate-400" : "text-gray-500";
    const inputCls = `rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${dark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-gray-50 border-gray-300 text-gray-900"}`;

    const totalPassengers = flights.reduce((s, f) => s + f.total_passengers, 0);
    const totalCheckedIn = flights.reduce((s, f) => s + f.checked_in_count, 0);
    const typeIcon = (t: string) => (t === "helicopter" ? "🚁" : t === "charter" ? "🛩" : "✈️");

    // Modal derived values
    const seatRows = Math.floor((seatModal.flight?.total_seat || 30) / 6) || 5;
    const classChanged = cabinClass !== prevClassRef.current;
    const fullNewPrice = getClassPrice(seatModal.flight, cabinClass);
    const surplus = Math.max(0, fullNewPrice - prevPriceRef.current);

    return (
        <div className="space-y-5 p-6">
            {/* En-tête */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 p-2">
                        <Users
                            className="text-white"
                            size={22}
                        />
                    </div>
                    <div>
                        <h1 className={`text-2xl font-bold ${textMain}`}>Gestion des Passagers</h1>
                        <p className={`text-sm ${textSub}`}>
                            {flights.length} vol(s) · {totalPassengers} passager(s) · {totalCheckedIn} enregistré(s)
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${cardBg}`}>
                        <CheckCircle2
                            size={15}
                            className="text-green-500"
                        />
                        <span className={textMain}>
                            {totalCheckedIn} / {totalPassengers} check-in
                        </span>
                    </div>
                    {totalPassengers > 0 && (
                        <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${cardBg}`}>
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-600">
                                <div
                                    className="h-full rounded-full bg-green-500 transition-all"
                                    style={{ width: `${Math.round((totalCheckedIn / totalPassengers) * 100)}%` }}
                                />
                            </div>
                            <span className={textSub}>{Math.round((totalCheckedIn / totalPassengers) * 100)}%</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Filtres */}
            <div className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 ${cardBg}`}>
                <div className="flex items-center gap-2">
                    <Calendar
                        size={16}
                        className={textSub}
                    />
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className={inputCls}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter
                        size={16}
                        className={textSub}
                    />
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className={inputCls}
                    >
                        <option value="">Tous les types</option>
                        <option value="plane">✈️ Avion</option>
                        <option value="helicopter">🚁 Hélicoptère</option>
                        <option value="charter">🛩 Charter</option>
                    </select>
                </div>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        setSearch(searchInput);
                    }}
                    className="flex min-w-48 flex-1 items-center gap-2"
                >
                    <Search
                        size={16}
                        className={textSub}
                    />
                    <input
                        type="text"
                        placeholder="Nom, passeport, réservation, vol..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className={`${inputCls} flex-1`}
                    />
                    <button
                        type="submit"
                        className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600"
                    >
                        Chercher
                    </button>
                    {search && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch("");
                                setSearchInput("");
                            }}
                            className={`text-xs ${textSub} hover:text-red-400`}
                        >
                            Effacer
                        </button>
                    )}
                </form>
                <button
                    onClick={fetchFlights}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${dark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                    Actualiser
                </button>
            </div>

            {/* Contenu */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" />
                </div>
            ) : apiError ? (
                <div className="rounded-2xl border border-red-300 bg-red-50 py-20 text-center dark:border-red-700 dark:bg-red-900/20">
                    <AlertCircle
                        size={40}
                        className="mx-auto mb-3 text-red-400"
                    />
                    <p className="font-medium text-red-600 dark:text-red-400">Erreur de chargement</p>
                    <p className="mx-auto mt-1 max-w-md px-4 text-sm text-red-500 dark:text-red-300">{apiError}</p>
                    <button
                        onClick={fetchFlights}
                        className="mt-4 rounded-lg bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600"
                    >
                        Réessayer
                    </button>
                </div>
            ) : flights.length === 0 ? (
                <div className={`rounded-2xl border py-20 text-center ${cardBg}`}>
                    <Plane
                        size={40}
                        className={`mx-auto mb-3 ${textSub}`}
                    />
                    <p className={`font-medium ${textMain}`}>Aucun vol avec passagers</p>
                    <p className={`mt-1 text-sm ${textSub}`}>Essayez une autre date ou effacez les filtres</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {flights.map((flight) => {
                        const isOpen = expanded.has(flight.flight_id);
                        const dep = new Date(flight.departure_time);
                        const pct = flight.total_passengers > 0 ? Math.round((flight.checked_in_count / flight.total_passengers) * 100) : 0;
                        const allChecked = flight.checked_in_count === flight.total_passengers;
                        return (
                            <div
                                key={flight.flight_id}
                                className={`overflow-hidden rounded-2xl border ${cardBg}`}
                            >
                                <div
                                    className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                    onClick={() => toggleExpand(flight.flight_id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-xl font-bold ${flight.type_vol === "helicopter" ? "bg-purple-500/10" : flight.type_vol === "charter" ? "bg-amber-500/10" : "bg-blue-500/10"}`}
                                        >
                                            {typeIcon(flight.type_vol)}
                                        </div>
                                        <div>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <span className={`text-lg font-bold ${textMain}`}>
                                                    {flight.from_code || flight.from_city} → {flight.to_code || flight.to_city}
                                                </span>
                                                <span
                                                    className={`rounded-full px-2 py-0.5 font-mono text-xs font-semibold ${dark ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-600"}`}
                                                >
                                                    {flight.flight_number || "Vol sans N°"}
                                                </span>
                                                {allChecked && (
                                                    <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-500">
                                                        ✅ Complet
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-4">
                                                <span className={`text-sm ${textSub}`}>
                                                    {dep.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })} ·{" "}
                                                    {dep.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                                <span className={`text-sm ${textSub}`}>
                                                    {flight.from_city} → {flight.to_city}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="hidden text-right sm:block">
                                            <p className={`text-xs font-semibold ${textMain}`}>
                                                {flight.checked_in_count} / {flight.total_passengers} enregistrés
                                            </p>
                                            <div className="mt-1 h-2 w-32 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-600">
                                                <div
                                                    className={`h-full rounded-full transition-all ${allChecked ? "bg-green-500" : "bg-blue-500"}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <p className={`text-xs ${textSub} mt-0.5`}>{pct}%</p>
                                        </div>
                                        <div
                                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${dark ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-600"}`}
                                        >
                                            <Users size={14} />
                                            {flight.total_passengers}
                                        </div>
                                        {isOpen ? (
                                            <ChevronUp
                                                size={18}
                                                className={textSub}
                                            />
                                        ) : (
                                            <ChevronDown
                                                size={18}
                                                className={textSub}
                                            />
                                        )}
                                    </div>
                                </div>

                                {isOpen && (
                                    <div className={`border-t ${dark ? "border-slate-700" : "border-gray-100"}`}>
                                        <div
                                            className={`flex items-center justify-between px-4 py-2 text-xs ${dark ? "bg-slate-700/30 text-slate-400" : "bg-gray-50 text-gray-500"}`}
                                        >
                                            <span>
                                                {flight.total_passengers} passager(s) · {flight.checked_in_count} enregistré(s)
                                            </span>
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    const unchecked = flight.passengers.filter((p) => !p.checked_in);
                                                    if (unchecked.length === 0) {
                                                        toast("Tous déjà enregistrés");
                                                        return;
                                                    }
                                                    for (const p of unchecked) {
                                                        await fetch(`${API}/api/passengers/${p.id}/checkin`, {
                                                            method: "PUT",
                                                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                                            body: JSON.stringify({ checked_in: true }),
                                                        });
                                                    }
                                                    toast.success(`✅ ${unchecked.length} passager(s) enregistrés`);
                                                    fetchFlights();
                                                }}
                                                className="font-medium text-blue-500 hover:text-blue-600 hover:underline"
                                            >
                                                Tout enregistrer
                                            </button>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className={dark ? "bg-slate-700/20" : "bg-gray-50/50"}>
                                                        {["Passager", "Passeport", "Siège", "Classe", "Réservation", "Check-in", "Actions"].map(
                                                            (h) => (
                                                                <th
                                                                    key={h}
                                                                    className={`px-4 py-2.5 text-left text-xs font-semibold ${textSub}`}
                                                                >
                                                                    {h}
                                                                </th>
                                                            ),
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {flight.passengers.map((p) => (
                                                        <tr
                                                            key={p.id}
                                                            className={`border-t transition-colors ${dark ? "border-slate-700/50 hover:bg-slate-700/20" : "border-gray-100 hover:bg-gray-50/70"} ${p.checked_in ? (dark ? "bg-green-900/10" : "bg-green-50/50") : ""}`}
                                                        >
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div
                                                                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${p.checked_in ? "bg-green-500" : "bg-gradient-to-r from-blue-500 to-indigo-500"}`}
                                                                    >
                                                                        {p.checked_in ? (
                                                                            <Check size={14} />
                                                                        ) : (
                                                                            (p.first_name?.[0] || "?").toUpperCase()
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <p className={`font-semibold ${textMain}`}>
                                                                            {p.title ? p.title + " " : ""}
                                                                            {p.first_name} {p.last_name}
                                                                        </p>
                                                                        <p className={`text-xs ${textSub}`}>{p.nationality || "—"}</p>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            <td className={`px-4 py-3 font-mono text-xs ${textMain}`}>{p.passport_number || "—"}</td>

                                                            <td className="px-4 py-3">
                                                                {p.seat_number ? (
                                                                    <span
                                                                        className={`rounded-lg px-2 py-1 text-xs font-bold ${dark ? "bg-blue-900/40 text-blue-300" : "bg-blue-50 text-blue-700"}`}
                                                                    >
                                                                        {p.seat_number}
                                                                    </span>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => openSeatModal(p, flight)}
                                                                        className="flex items-center gap-1 text-xs font-medium text-amber-500 hover:text-amber-600"
                                                                    >
                                                                        <AlertCircle size={12} /> Assigner
                                                                    </button>
                                                                )}
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                <span
                                                                    className={`rounded-lg px-2 py-1 text-xs font-bold ${classBadge[p.cabin_class] || classBadge.economy}`}
                                                                >
                                                                    {classLabel[p.cabin_class] || "Économie"}
                                                                </span>
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                <span className="font-mono text-xs text-blue-500">{p.booking_reference}</span>
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                {p.checked_in ? (
                                                                    <div>
                                                                        <span className="flex items-center gap-1 text-xs font-semibold text-green-500">
                                                                            <CheckCircle2 size={13} /> Enregistré
                                                                        </span>
                                                                        {p.checked_in_by && (
                                                                            <p className={`text-xs ${textSub} mt-0.5`}>par {p.checked_in_by}</p>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="flex items-center gap-1 text-xs font-medium text-amber-500">
                                                                        <Clock size={13} /> En attente
                                                                    </span>
                                                                )}
                                                                {/* Résumé bagages */}
                                                                {p.bag_tag && (
                                                                    <div className="mt-1.5 rounded-lg bg-amber-50 border border-amber-100 px-2 py-1 text-xs">
                                                                        <div className="font-mono font-bold text-amber-700">{p.bag_tag}</div>
                                                                        <div className="text-amber-600">
                                                                            {p.bag_count_hold > 0 && `🧳 ${p.bag_count_hold} soute`}
                                                                            {p.bag_weight_hold != null && ` · ${p.bag_weight_hold}kg`}
                                                                            {p.bag_count_cabin > 0 && ` · 🎒 ${p.bag_count_cabin} cabine`}
                                                                        </div>
                                                                        {p.excess_fee > 0 && (
                                                                            <div className="text-red-600 font-semibold">Surpoids: {p.excess_fee} {p.excess_currency}</div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>

                                                            <td className="px-4 py-3">
                                                                {(() => {
                                                                    const isConfirmed = p.booking_status === "confirmed";
                                                                    return (
                                                                        <div className="flex items-center gap-1.5">
                                                                            {!isConfirmed && (
                                                                                <span
                                                                                    className={`rounded-lg px-2 py-1 text-xs font-medium ${dark ? "bg-yellow-900/40 text-yellow-400" : "bg-yellow-50 text-yellow-600"}`}
                                                                                >
                                                                                    Non confirmé
                                                                                </span>
                                                                            )}

                                                                            {/* Check-in — ouvre le modal bagages pour les passagers non enregistrés */}
                                                                            <button
                                                                                onClick={() => p.checked_in ? handleCheckin(p, false) : openBagModal(p, flight)}
                                                                                disabled={savingId === p.id || !isConfirmed}
                                                                                title={
                                                                                    !isConfirmed
                                                                                        ? "Réservation non confirmée"
                                                                                        : p.checked_in
                                                                                          ? "Annuler l'enregistrement"
                                                                                          : "Enregistrer le passager + bagages"
                                                                                }
                                                                                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${p.checked_in ? (dark ? "bg-slate-700 text-slate-300 hover:bg-red-900/30 hover:text-red-400" : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500") : "bg-green-500 text-white hover:bg-green-600"}`}
                                                                            >
                                                                                {savingId === p.id ? (
                                                                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                                                ) : p.checked_in ? (
                                                                                    <><X size={12} /> Annuler</>
                                                                                ) : (
                                                                                    <><UserCheck size={12} /> Check-in</>
                                                                                )}
                                                                            </button>

                                                                            {/* Siège / Classe */}
                                                                            <button
                                                                                onClick={() => openSeatModal(p, flight)}
                                                                                disabled={!isConfirmed}
                                                                                title={
                                                                                    !isConfirmed
                                                                                        ? "Réservation non confirmée"
                                                                                        : "Modifier le siège / la classe"
                                                                                }
                                                                                className={`rounded-lg p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${dark ? "text-slate-400 hover:bg-slate-700" : "text-gray-500 hover:bg-gray-100"}`}
                                                                            >
                                                                                <Edit2 size={13} />
                                                                            </button>

                                                                            {/* Bagages — toujours visible */}
                                                                            <button
                                                                                onClick={() => openBagModal(p, flight)}
                                                                                disabled={!isConfirmed}
                                                                                title={p.bag_tag ? `Bagages enregistrés: ${p.bag_tag}` : "Enregistrer les bagages"}
                                                                                className={`relative rounded-lg p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${p.bag_tag ? (dark ? "text-amber-400 hover:bg-amber-900/30" : "text-amber-600 hover:bg-amber-50") : (dark ? "text-slate-400 hover:bg-slate-700" : "text-gray-500 hover:bg-gray-100")}`}
                                                                            >
                                                                                <Package size={13} />
                                                                                {p.bag_tag && (
                                                                                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400 ring-1 ring-white" />
                                                                                )}
                                                                            </button>

                                                                            {/* Reçu de paiement */}
                                                                            <button
                                                                                onClick={() => handlePrintPaymentReceipt(p, flight)}
                                                                                disabled={!isConfirmed}
                                                                                title={
                                                                                    !isConfirmed
                                                                                        ? "Réservation non confirmée"
                                                                                        : "Imprimer le reçu de paiement"
                                                                                }
                                                                                className={`rounded-lg p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${dark ? "text-amber-400 hover:bg-slate-700" : "text-amber-500 hover:bg-amber-50"}`}
                                                                            >
                                                                                <Receipt size={13} />
                                                                            </button>

                                                                            {/* Carte d'embarquement */}
                                                                            <button
                                                                                onClick={() => handlePrintTicket(p, flight)}
                                                                                disabled={!isConfirmed}
                                                                                title={
                                                                                    !isConfirmed
                                                                                        ? "Réservation non confirmée"
                                                                                        : "Imprimer la carte d'embarquement"
                                                                                }
                                                                                className={`rounded-lg p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${dark ? "text-slate-400 hover:bg-slate-700" : "text-gray-500 hover:bg-gray-100"}`}
                                                                            >
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className={`flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${cardBg}`}>
                        {/* Header */}
                        <div
                            className={`flex flex-shrink-0 items-center justify-between border-b p-5 ${dark ? "border-slate-700" : "border-gray-200"}`}
                        >
                            <div>
                                <h2 className={`text-lg font-bold ${textMain}`}>Siège &amp; Classe</h2>
                                <p className={`text-xs ${textSub} mt-0.5`}>
                                    {seatModal.passenger.title ? seatModal.passenger.title + " " : ""}
                                    {seatModal.passenger.first_name} {seatModal.passenger.last_name}
                                    {" · "}
                                    {seatModal.flight.flight_number} · {seatModal.flight.from_code} → {seatModal.flight.to_code}
                                </p>
                            </div>
                            <button
                                onClick={() => setSeatModal({ open: false, passenger: null, flight: null })}
                                className={`rounded-lg p-1.5 ${dark ? "text-slate-400 hover:bg-slate-700" : "text-gray-500 hover:bg-gray-100"}`}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex flex-1 flex-col overflow-auto md:flex-row">
                            {/* LEFT — Seat map */}
                            <div className={`flex-1 border-b p-5 md:border-b-0 md:border-r ${dark ? "border-slate-700" : "border-gray-200"}`}>
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className={`text-sm font-semibold ${textMain}`}>Plan de cabine</h3>
                                    {loadingOccupied && <span className="animate-pulse text-xs text-slate-400">Chargement...</span>}
                                </div>

                                {seatInput && (
                                    <div
                                        className={`mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 ${dark ? "border-blue-700/40 bg-blue-900/20" : "border-blue-100 bg-blue-50"}`}
                                    >
                                        <span className="text-xs font-semibold text-blue-500">Siège sélectionné :</span>
                                        <span className="font-mono font-bold text-blue-600">{seatInput}</span>
                                        <button
                                            onClick={() => setSeatInput("")}
                                            className="ml-auto text-xs text-slate-400 hover:text-red-400"
                                        >
                                            Effacer
                                        </button>
                                    </div>
                                )}

                                <div
                                    className={`max-h-60 space-y-2 overflow-y-auto rounded-xl border p-3 ${dark ? "border-slate-700 bg-slate-900/30" : "border-slate-200 bg-slate-50"}`}
                                >
                                    {Array.from({ length: seatRows }).map((_, row) => (
                                        <div
                                            key={row}
                                            className="flex items-center"
                                        >
                                            <div className={`w-6 text-center text-xs font-bold ${textSub}`}>{row + 1}</div>
                                            <div className="ml-2 flex flex-1 justify-between">
                                                <div className="flex gap-1">
                                                    {["A", "B", "C"].map((s) => {
                                                        const sid = `${row + 1}${s}`;
                                                        const occ = occupiedSeats.includes(sid);
                                                        const sel = seatInput === sid;
                                                        return (
                                                            <button
                                                                key={s}
                                                                type="button"
                                                                onClick={() => setSeatInput(sid)}
                                                                disabled={occ}
                                                                className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${sel ? "bg-blue-500 text-white shadow-lg" : occ ? "cursor-not-allowed bg-red-400 text-white opacity-70" : dark ? "bg-slate-700 text-slate-300 hover:bg-blue-500/20" : "border border-slate-300 bg-white text-slate-700 hover:border-blue-400"}`}
                                                            >
                                                                {s}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <div className="flex w-8 items-center justify-center">
                                                    <div className={`h-px w-full ${dark ? "bg-slate-600" : "bg-slate-300"}`} />
                                                </div>
                                                <div className="flex gap-1">
                                                    {["D", "E", "F"].map((s) => {
                                                        const sid = `${row + 1}${s}`;
                                                        const occ = occupiedSeats.includes(sid);
                                                        const sel = seatInput === sid;
                                                        return (
                                                            <button
                                                                key={s}
                                                                type="button"
                                                                onClick={() => setSeatInput(sid)}
                                                                disabled={occ}
                                                                className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${sel ? "bg-blue-500 text-white shadow-lg" : occ ? "cursor-not-allowed bg-red-400 text-white opacity-70" : dark ? "bg-slate-700 text-slate-300 hover:bg-blue-500/20" : "border border-slate-300 bg-white text-slate-700 hover:border-blue-400"}`}
                                                            >
                                                                {s}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-3 flex gap-4 text-xs">
                                    {[
                                        {
                                            cls: dark ? "bg-slate-700 border border-slate-600" : "bg-white border border-slate-300",
                                            label: "Disponible",
                                        },
                                        { cls: "bg-blue-500", label: "Sélectionné" },
                                        { cls: "bg-red-400 opacity-70", label: "Occupé" },
                                    ].map(({ cls, label }) => (
                                        <div
                                            key={label}
                                            className="flex items-center gap-1.5"
                                        >
                                            <div className={`h-4 w-4 rounded ${cls}`} />
                                            <span className={textSub}>{label}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4">
                                    <label className={`mb-1 block text-xs font-semibold ${textSub}`}>Ou saisir manuellement</label>
                                    <input
                                        type="text"
                                        value={seatInput}
                                        onChange={(e) => setSeatInput(e.target.value.toUpperCase())}
                                        placeholder="Ex: 12A, 3B..."
                                        className={`w-full rounded-xl border px-3 py-2 font-mono text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 ${dark ? "border-slate-600 bg-slate-700 text-white placeholder-slate-500" : "border-gray-300 bg-gray-50 text-gray-900"}`}
                                    />
                                </div>
                            </div>

                            {/* RIGHT — Cabin class + surplus payment + actions */}
                            <div className="flex w-full flex-shrink-0 flex-col gap-4 p-5 md:w-80">
                                {/* Cabin class */}
                                <div>
                                    <h3 className={`mb-3 text-sm font-semibold ${textMain}`}>Classe de cabine</h3>
                                    <div className="flex flex-col gap-2">
                                        {CABIN_CLASSES.map((cls) => {
                                            const price = getClassPrice(seatModal.flight, cls.value);
                                            const noPrice = cls.value !== "economy" && price === 0;
                                            // ⛔ Interdit de descendre en classe inférieure
                                            const isDowngrade = CLASS_RANK[cls.value] < CLASS_RANK[prevClassRef.current];
                                            const unavailable = noPrice || isDowngrade;
                                            const active = cabinClass === cls.value;
                                            const borderColor = {
                                                blue: active
                                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                                                    : "border-slate-200 dark:border-slate-700 hover:border-blue-300",
                                                purple: active
                                                    ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30"
                                                    : "border-slate-200 dark:border-slate-700 hover:border-purple-300",
                                                amber: active
                                                    ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30"
                                                    : "border-slate-200 dark:border-slate-700 hover:border-amber-300",
                                            }[cls.color];
                                            const labelColor = {
                                                blue: active ? "text-blue-700 dark:text-blue-300" : textMain,
                                                purple: active ? "text-purple-700 dark:text-purple-300" : textMain,
                                                amber: active ? "text-amber-700 dark:text-amber-300" : textMain,
                                            }[cls.color];
                                            const subLabel = isDowngrade
                                                ? "⛔ Déclassement interdit"
                                                : noPrice
                                                  ? "Non disponible"
                                                  : `$${price.toFixed(2)}`;
                                            return (
                                                <button
                                                    key={cls.value}
                                                    type="button"
                                                    disabled={unavailable}
                                                    onClick={() => setCabinClass(cls.value)}
                                                    title={isDowngrade ? "Impossible de descendre en classe inférieure" : undefined}
                                                    className={`relative flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-40 ${borderColor}`}
                                                >
                                                    <span className="flex-shrink-0 text-xl">{cls.icon}</span>
                                                    <div className="flex-1">
                                                        <p className={`text-sm font-bold ${labelColor}`}>{cls.label}</p>
                                                        <p
                                                            className={`text-xs font-semibold ${unavailable ? "text-red-400" : "text-green-600 dark:text-green-400"}`}
                                                        >
                                                            {subLabel}
                                                        </p>
                                                    </div>
                                                    {active && (
                                                        <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500">
                                                            <svg
                                                                className="h-2.5 w-2.5 text-white"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                                strokeWidth={3}
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    d="M5 13l4 4L19 7"
                                                                />
                                                            </svg>
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Price / Surplus summary */}
                                {classChanged ? (
                                    <div
                                        className={`space-y-1.5 rounded-xl border p-3 ${dark ? "border-amber-700/40 bg-amber-900/10" : "border-amber-100 bg-amber-50"}`}
                                    >
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
                                        <div
                                            className={`flex justify-between border-t pt-1 text-sm font-bold ${dark ? "border-amber-700/40" : "border-amber-200"}`}
                                        >
                                            <span className="text-amber-600">Supplément à payer</span>
                                            <span className="text-amber-700">${surplus.toFixed(2)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className={`rounded-xl border p-3 text-center ${dark ? "border-slate-700 bg-slate-700/30" : "border-slate-200 bg-slate-50"}`}
                                    >
                                        <p className={`mb-0.5 text-xs font-semibold ${textSub}`}>Prix de la classe</p>
                                        <p className={`text-xl font-bold ${textMain}`}>${fullNewPrice.toFixed(2)}</p>
                                    </div>
                                )}

                                {/* Surplus payment method — only visible when class changes */}
                                {classChanged && (
                                    <div>
                                        <label className={`mb-1.5 block text-xs font-semibold ${textSub}`}>Mode de paiement du supplément</label>
                                        <select
                                            value={surplusPayMethod}
                                            onChange={(e) => setSurplusPayMethod(e.target.value)}
                                            className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${dark ? "border-slate-600 bg-slate-700 text-white" : "border-slate-200 bg-white text-slate-700"}`}
                                        >
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
                                    <button
                                        onClick={handleAssignSeat}
                                        disabled={
                                            savingId !== null ||
                                            // Désactivé seulement si rien à faire : ni siège, ni changement de classe
                                            (!seatInput.trim() && !classChanged)
                                        }
                                        className="w-full rounded-xl bg-blue-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                                    >
                                        {savingId !== null ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                Enregistrement...
                                            </span>
                                        ) : classChanged ? (
                                            `Confirmer · Supplément $${surplus.toFixed(2)}`
                                        ) : (
                                            "Confirmer le siège"
                                        )}
                                    </button>

                                    {classChanged && (seatInput.trim() || seatModal.passenger?.seat_number) && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handlePrintClassChangeReceipt(
                                                    seatModal.passenger!,
                                                    seatModal.flight!,
                                                    prevClassRef.current,
                                                    cabinClass,
                                                    prevPriceRef.current,
                                                    fullNewPrice,
                                                    surplus,
                                                    surplusPayMethod,
                                                    seatInput.trim() || seatModal.passenger?.seat_number || "",
                                                )
                                            }
                                            className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2 text-xs font-medium transition-colors ${dark ? "border-amber-700/50 text-amber-400 hover:bg-amber-900/20" : "border-amber-200 text-amber-600 hover:bg-amber-50"}`}
                                        >
                                            <Receipt size={13} /> Aperçu du reçu de supplément
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setSeatModal({ open: false, passenger: null, flight: null })}
                                        className={`w-full rounded-xl border py-2 text-sm font-medium transition-colors ${dark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                                    >
                                        Annuler
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════
                MODAL BAGAGES + CHECK-IN
            ═══════════════════════════════════════════════════ */}
            {bagModal.open && bagModal.passenger && bagModal.flight && (() => {
                const p = bagModal.passenger!;
                const f = bagModal.flight!;
                const isHeli = f.type_vol === "helicopter";
                // Franchise: 30 lbs avion (13.6 kg) / 20 lbs hélico (9.07 kg)
                const franchiseKg = isHeli ? 9.07 : 13.6;
                const franchiseLbs = isHeli ? 20 : 30;
                const weightKg = parseFloat(bagForm.bag_weight_hold) || 0;
                const excessKg = Math.max(0, weightKg - franchiseKg);
                const alreadyCheckedIn = p.checked_in;

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                        <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${dark ? "bg-slate-800" : "bg-white"}`}>
                            {/* Header */}
                            <div className="flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4 text-white">
                                <div>
                                    <div className="flex items-center gap-2 font-bold text-base">
                                        <Package size={18} />
                                        {alreadyCheckedIn ? "Bagages enregistrés" : "Check-in + Bagages"}
                                    </div>
                                    <div className="text-xs opacity-80 mt-0.5">
                                        {p.first_name} {p.last_name} · {f.flight_number}
                                    </div>
                                </div>
                                <button onClick={() => { setBagModal({ open: false, passenger: null, flight: null }); setSavedTag(null); }}
                                    className="rounded-full bg-white/20 p-1.5 hover:bg-white/30 transition-colors">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="p-5 space-y-4">
                                {/* Franchise info */}
                                <div className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${dark ? "bg-blue-900/30 border border-blue-700/40" : "bg-blue-50 border border-blue-100"}`}>
                                    <span className="text-2xl">{isHeli ? "🚁" : "✈️"}</span>
                                    <div>
                                        <div className={`font-semibold ${dark ? "text-blue-300" : "text-blue-800"}`}>
                                            Franchise incluse : {franchiseLbs} lbs ({franchiseKg} kg)
                                        </div>
                                        <div className={`text-xs ${dark ? "text-blue-400" : "text-blue-500"}`}>
                                            {isHeli ? "Hélicoptère · Mallette 35×55×25 cm, Carry-on" : "Avion · Mallette 65×40×25 cm"}
                                        </div>
                                    </div>
                                </div>

                                {/* Bagages en soute */}
                                <div className={`rounded-xl border p-4 space-y-3 ${dark ? "border-slate-700 bg-slate-700/30" : "border-slate-200 bg-slate-50"}`}>
                                    <div className={`text-xs font-bold uppercase tracking-wider ${dark ? "text-slate-300" : "text-slate-500"}`}>🧳 Bagages en soute</div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <label className={`block text-xs font-medium mb-1 ${dark ? "text-slate-400" : "text-slate-600"}`}>Nombre de bagages</label>
                                            <div className="flex items-center gap-2">
                                                <button type="button"
                                                    onClick={() => setBagForm(f => ({ ...f, bag_count_hold: Math.max(0, f.bag_count_hold - 1) }))}
                                                    className={`flex h-8 w-8 items-center justify-center rounded-lg border text-lg font-bold transition-colors ${dark ? "border-slate-600 text-slate-300 hover:bg-slate-600" : "border-slate-300 text-slate-600 hover:bg-slate-100"}`}>−</button>
                                                <span className={`w-8 text-center text-lg font-bold ${dark ? "text-white" : "text-slate-800"}`}>{bagForm.bag_count_hold}</span>
                                                <button type="button"
                                                    onClick={() => setBagForm(f => ({ ...f, bag_count_hold: f.bag_count_hold + 1 }))}
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white text-lg font-bold hover:bg-amber-600 transition-colors">+</button>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <label className={`block text-xs font-medium mb-1 ${dark ? "text-slate-400" : "text-slate-600"}`}>Poids total (kg)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                value={bagForm.bag_weight_hold}
                                                onChange={e => setBagForm(f => ({ ...f, bag_weight_hold: e.target.value }))}
                                                placeholder="ex: 22.5"
                                                className={`w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${dark ? "border-slate-600 bg-slate-700 text-white" : "border-slate-200 bg-white text-slate-700"}`}
                                            />
                                        </div>
                                    </div>

                                    {/* Surpoids indicator */}
                                    {excessKg > 0 && (
                                        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                                            ⚠️ Surpoids : <strong>{excessKg.toFixed(2)} kg</strong> au-delà de la franchise
                                        </div>
                                    )}

                                    {/* Frais surpoids */}
                                    {excessKg > 0 && (
                                        <div>
                                            <label className={`block text-xs font-medium mb-1 text-red-500`}>Frais de surpoids</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={bagForm.excess_fee}
                                                    onChange={e => setBagForm(f => ({ ...f, excess_fee: e.target.value }))}
                                                    placeholder="Montant"
                                                    className="flex-1 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
                                                />
                                                <select
                                                    value={bagForm.excess_currency}
                                                    onChange={e => setBagForm(f => ({ ...f, excess_currency: e.target.value }))}
                                                    className={`rounded-lg border px-2 py-1.5 text-sm focus:outline-none ${dark ? "border-slate-600 bg-slate-700 text-white" : "border-slate-200 bg-white"}`}
                                                >
                                                    {["USD","HTG","EUR","CAD"].map(c => <option key={c}>{c}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Bagages cabine */}
                                <div className={`rounded-xl border p-4 ${dark ? "border-slate-700 bg-slate-700/30" : "border-slate-200 bg-slate-50"}`}>
                                    <div className={`text-xs font-bold uppercase tracking-wider mb-3 ${dark ? "text-slate-300" : "text-slate-500"}`}>🎒 Bagages cabine</div>
                                    <div className="flex items-center gap-3">
                                        <button type="button"
                                            onClick={() => setBagForm(f => ({ ...f, bag_count_cabin: Math.max(0, f.bag_count_cabin - 1) }))}
                                            className={`flex h-8 w-8 items-center justify-center rounded-lg border text-lg font-bold transition-colors ${dark ? "border-slate-600 text-slate-300 hover:bg-slate-600" : "border-slate-300 text-slate-600 hover:bg-slate-100"}`}>−</button>
                                        <span className={`w-8 text-center text-lg font-bold ${dark ? "text-white" : "text-slate-800"}`}>{bagForm.bag_count_cabin}</span>
                                        <button type="button"
                                            onClick={() => setBagForm(f => ({ ...f, bag_count_cabin: f.bag_count_cabin + 1 }))}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-white text-lg font-bold hover:bg-blue-600 transition-colors">+</button>
                                        <span className={`text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>bagage(s) cabine</span>
                                    </div>
                                </div>

                                {/* Étiquette générée */}
                                {savedTag && (
                                    <div className={`rounded-xl border p-4 text-center ${dark ? "border-amber-700/50 bg-amber-900/20" : "border-amber-200 bg-amber-50"}`}>
                                        <div className={`mb-1 text-xs font-semibold uppercase tracking-widest ${dark ? "text-amber-400" : "text-amber-600"}`}>N° Étiquette bagage</div>
                                        <div className={`font-mono text-2xl font-black tracking-widest ${dark ? "text-amber-300" : "text-amber-800"}`}>{savedTag}</div>
                                        <button
                                            onClick={() => printBaggageLabel({
                                                passengerName: `${bagModal.passenger!.first_name} ${bagModal.passenger!.last_name}`,
                                                flightNumber:  bagModal.flight!.flight_number,
                                                fromCode:      bagModal.flight!.from_code,
                                                toCode:        bagModal.flight!.to_code,
                                                fromCity:      bagModal.flight!.from_city,
                                                toCity:        bagModal.flight!.to_city,
                                                departureTime: bagModal.flight!.departure_time,
                                                bagTag:        savedTag,
                                                bagCountHold:  Number(bagForm.bag_count_hold),
                                                bagWeightHold: bagForm.bag_weight_hold ? parseFloat(bagForm.bag_weight_hold) : null,
                                                bookingRef:    bagModal.passenger!.booking_reference,
                                            })}
                                            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
                                        >
                                            🖨️ Imprimer l'étiquette
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className={`flex gap-3 border-t px-5 py-4 ${dark ? "border-slate-700" : "border-slate-200"}`}>
                                <button
                                    type="button"
                                    onClick={() => { setBagModal({ open: false, passenger: null, flight: null }); setSavedTag(null); }}
                                    className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors ${dark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="button"
                                    disabled={savingBag}
                                    onClick={async () => {
                                        const p = bagModal.passenger!;
                                        const alreadyIn = p.checked_in;
                                        await handleSaveBaggage();
                                        if (!alreadyIn) await handleCheckin(p, true);
                                        setBagModal({ open: false, passenger: null, flight: null });
                                    }}
                                    className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                                >
                                    {savingBag ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            Enregistrement...
                                        </span>
                                    ) : bagModal.passenger?.checked_in ? "💾 Enregistrer bagages" : "✅ Check-in + Enregistrer bagages"}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
