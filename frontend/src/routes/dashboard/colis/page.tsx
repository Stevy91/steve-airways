import React, { useEffect, useState, useCallback, useRef } from "react";
import { Package, Plus, Search, Printer, ChevronDown, X, Edit2, Trash2, CheckCircle,
         Plane, AlertCircle, PackageCheck, Loader2, RefreshCw, Camera, Upload } from "lucide-react";

const API = "https://steve-airways.onrender.com";

interface Colis {
  id: number; tracking_code: string;
  sender_name: string; sender_id_type: string; sender_id_number: string; sender_phone: string;
  recipient_name: string; recipient_phone: string; recipient_address: string;
  description: string; weight: number | null;
  flight_id: number | null; flight_number: string | null;
  departure_time: string | null; arrival_time: string | null;
  dep_name: string | null; arr_name: string | null; dep_code: string | null; arr_code: string | null;
  price: number; currency: string; payment_method: string;
  status: "en_attente" | "en_vol" | "arrive" | "livre";
  notes: string; created_by_name: string; created_at: string;
  photo_data?: string | null;
}
interface FlightOption {
  id: number; flight_number: string; type: string;
  departure_time: string; arrival_time: string;
  dep_name: string; dep_city: string; dep_code: string;
  arr_name: string; arr_city: string; arr_code: string;
  seats_available: number;
}
interface Stats { en_attente: number; en_vol: number; arrive: number; livre: number; total: number; }

const STATUS_CONFIG = {
  en_attente: { label: "En attente", color: "bg-orange-100 text-orange-700 border-orange-200", icon: "⏳" },
  en_vol:     { label: "En vol",     color: "bg-blue-100 text-blue-700 border-blue-200",     icon: "✈️" },
  arrive:     { label: "Arrivé",     color: "bg-green-100 text-green-700 border-green-200",  icon: "📦" },
  livre:      { label: "Livré",      color: "bg-purple-100 text-purple-700 border-purple-200", icon: "✅" },
};
const ID_TYPES = [
  { value:"nif",label:"NIF" }, { value:"cin",label:"CIN" },
  { value:"passeport",label:"Passeport" }, { value:"permis",label:"Permis" },
  { value:"nimu",label:"NIMU" }, { value:"autre",label:"Autre" },
];
const PAY_METHODS = [
  { value:"cash",label:"Espèces" }, { value:"card",label:"Carte bancaire" },
  { value:"cheque",label:"Chèque" }, { value:"virement",label:"Virement" },
  { value:"transfert",label:"Dépôt / Transfert" },
];

const token     = () => localStorage.getItem("token") || localStorage.getItem("authToken") || "";
const authH     = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });
const fmtDT     = (d?: string | null) => { if (!d) return "—"; try { return new Date(d).toLocaleString("fr-FR", { dateStyle:"short", timeStyle:"short" }); } catch { return d ?? "—"; } };
const fmtD      = (d?: string | null) => { if (!d) return "—"; try { return new Date(d).toLocaleDateString("fr-FR"); } catch { return d ?? "—"; } };
const fmtMoney  = (n: number, cur: string) => `${Number(n).toFixed(2)} ${(cur||"USD").toUpperCase()}`;
const payLabel  = (m: string) => PAY_METHODS.find(p => p.value === m)?.label ?? m;
const idLabel   = (v: string) => ID_TYPES.find(t => t.value === v)?.label ?? v?.toUpperCase();
const emptyForm = () => ({
  sender_name:"", sender_id_type:"nif", sender_id_number:"", sender_phone:"",
  recipient_name:"", recipient_phone:"", recipient_address:"",
  description:"", weight:"", flight_id:"", flightType:"plane",
  price:"", currency:"USD", payment_method:"cash", notes:"",
  photo_data:"",
});

/* ══════════════════════════════════════════════════════════════
   RECEIPT — petit popup style ticket thermique (comme réservation)
══════════════════════════════════════════════════════════════ */
function printColisReceipt(c: Colis) {
  const statusLabel = STATUS_CONFIG[c.status]?.label ?? c.status;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(c.tracking_code)}&bgcolor=ffffff&color=1e3a5f`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Reçu Colis — ${c.tracking_code}</title>
  <meta charset="UTF-8"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;background:#f5f5f5;padding:20px}
    .wrap{max-width:320px;margin:0 auto;background:#fff;padding:20px;box-shadow:0 2px 10px rgba(0,0,0,.12)}
    .header{text-align:center;margin-bottom:14px}
    .logo-text{font-weight:bold;font-size:16px;color:#1e3a5f;letter-spacing:1px}
    .sub{font-size:11px;color:#666;margin-top:3px;line-height:1.5}
    hr{border:none;border-top:1px dashed #ccc;margin:10px 0}
    .section-title{font-weight:bold;font-size:12px;color:#1e3a5f;margin:8px 0 4px;text-transform:uppercase;letter-spacing:.5px}
    .line{margin:3px 0;font-size:12px;color:#333;display:flex;justify-content:space-between;gap:6px}
    .line span:last-child{font-weight:bold;text-align:right}
    .code-box{text-align:center;background:#f0f4ff;border:1px dashed #2563eb;border-radius:6px;padding:8px;margin:10px 0}
    .tracking{font-family:monospace;font-size:15px;font-weight:bold;color:#1e3a5f;letter-spacing:2px}
    .total-val{color:#d32f2f;font-weight:bold;font-size:15px}
    .status-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:bold;margin-top:4px}
    .status-en_attente{background:#fff7ed;color:#c2410c;border:1px solid #fdba74}
    .status-en_vol    {background:#eff6ff;color:#1d4ed8;border:1px solid #93c5fd}
    .status-arrive    {background:#f0fdf4;color:#166534;border:1px solid #86efac}
    .status-livre     {background:#faf5ff;color:#6b21a8;border:1px solid #d8b4fe}
    .qr{text-align:center;margin:14px 0}
    .footer{font-size:10px;text-align:center;color:#666;margin-top:12px;line-height:1.6}
    .controls{text-align:center;margin-top:14px;padding-top:12px;border-top:1px solid #eee}
    button{padding:9px 18px;margin:0 5px;background:#1e3a5f;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px}
    button:hover{background:#2563eb}
    @media print{
      body{background:#fff;padding:0}
      .wrap{box-shadow:none;max-width:80mm}
      .controls{display:none}
    }
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="logo-text">✈ TROGON AIRWAYS</div>
    <div class="sub">
      Reçu de transport de colis<br/>
      ${new Date().toLocaleDateString("fr-FR",{weekday:"long",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})}
    </div>
  </div>

  <hr/>

  <div class="line"><span>Agent:</span><span>${c.created_by_name || "Agent"}</span></div>

  <hr/>

  <div class="code-box">
    <div style="font-size:10px;color:#555;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px">Code de suivi</div>
    <div class="tracking">${c.tracking_code}</div>
    <div class="status-badge status-${c.status}">${STATUS_CONFIG[c.status]?.icon ?? ""} ${statusLabel}</div>
  </div>

  <hr/>

  <div class="section-title">📤 Expéditeur</div>
  <div class="line"><span>Nom:</span><span>${c.sender_name}</span></div>
  ${c.sender_id_number ? `<div class="line"><span>${idLabel(c.sender_id_type)}:</span><span style="font-family:monospace">${c.sender_id_number}</span></div>` : ""}
  ${c.sender_phone    ? `<div class="line"><span>Tél:</span><span>${c.sender_phone}</span></div>` : ""}

  <hr/>

  <div class="section-title">📥 Destinataire</div>
  <div class="line"><span>Nom:</span><span>${c.recipient_name}</span></div>
  ${c.recipient_phone   ? `<div class="line"><span>Tél:</span><span>${c.recipient_phone}</span></div>` : ""}
  ${c.recipient_address ? `<div class="line"><span>Adresse:</span><span>${c.recipient_address}</span></div>` : ""}

  ${c.flight_number ? `
  <hr/>
  <div class="section-title">✈️ Vol associé</div>
  <div class="line"><span>Vol N°:</span><span>${c.flight_number}</span></div>
  <div class="line"><span>Trajet:</span><span>${c.dep_name||""} (${c.dep_code||""}) → ${c.arr_name||""} (${c.arr_code||""})</span></div>
  <div class="line"><span>Départ:</span><span>${fmtDT(c.departure_time)}</span></div>
  ` : ""}

  ${c.description || c.weight ? `
  <hr/>
  <div class="section-title">📦 Colis</div>
  ${c.description ? `<div class="line"><span>Description:</span><span>${c.description}</span></div>` : ""}
  ${c.weight      ? `<div class="line"><span>Poids:</span><span>${c.weight} kg</span></div>` : ""}
  ` : ""}

  <hr/>

  <div class="section-title">💰 Paiement</div>
  <div class="line"><span>TOTAL:</span><span class="total-val">${Number(c.price).toFixed(2)} ${(c.currency||"USD").toUpperCase()}</span></div>
  <div class="line"><span>Mode:</span><span>${payLabel(c.payment_method)}</span></div>
  <div class="line"><span>Date:</span><span>${fmtD(c.created_at)}</span></div>

  <div class="qr">
    <img src="${qr}" alt="QR ${c.tracking_code}" width="130" height="130"
         style="border:1px solid #e2e8f0;border-radius:8px;padding:4px"/>
    <div style="font-size:10px;color:#999;margin-top:4px;letter-spacing:1px">${c.tracking_code}</div>
  </div>

  <div class="footer">
    <strong>IMPORTANT</strong><br/>
    • Conservez ce reçu jusqu'à livraison<br/>
    • Le code QR permet de tracer votre colis<br/>
    • Présentez ce reçu lors de la récupération<br/>
    <br/>
    TROGON Airways • Tél: +509 3341 0404<br/>
    www.steveairways.com
  </div>

  <div class="controls">
    <button onclick="window.print()">🖨️ Imprimer</button>
    <button onclick="window.close()">Fermer</button>
  </div>
</div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=420,height=900");
  if (win) { win.document.write(html); win.document.close(); }
  else      { alert("Autorisez les popups pour imprimer le reçu."); }
}

/* ══════════════════════════════════════════════════════════════
   PHOTO PICKER — réutilisable dans formulaire et détail
══════════════════════════════════════════════════════════════ */
function PhotoPicker({
  value, onChange, label = "Photo du colis"
}: { value: string; onChange: (b64: string) => void; label?: string }) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => onChange(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-600">{label}</label>
      {value ? (
        <div className="relative">
          <img src={value} alt="Photo" className="w-full max-h-44 object-cover rounded-xl border border-slate-200 shadow-sm" />
          <button type="button" onClick={() => onChange("")}
            className="absolute top-2 right-2 rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600 transition-colors">
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button type="button" onClick={() => cameraRef.current?.click()}
            className="flex-1 flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 py-4 text-xs text-slate-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors">
            <Camera className="h-5 w-5" />
            Prendre une photo
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex-1 flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 py-4 text-xs text-slate-500 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
            <Upload className="h-5 w-5" />
            Importer une photo
          </button>
        </div>
      )}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function ColisPage() {
  const [colis, setColis]           = useState<Colis[]>([]);
  const [stats, setStats]           = useState<Stats>({ en_attente:0, en_vol:0, arrive:0, livre:0, total:0 });
  const [allFlights, setAllFlights] = useState<FlightOption[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showModal, setShowModal]   = useState(false);
  const [showDetail, setShowDetail] = useState<Colis | null>(null);
  const [editingColis, setEditingColis] = useState<Colis | null>(null);
  const [form, setForm]             = useState(emptyForm());
  const [saving, setSaving]         = useState(false);
  const [statusLoading, setStatusLoading] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  // Photo saved separately on delivery-verify
  const [photoSavingId, setPhotoSavingId] = useState<number | null>(null);
  // Photo preview lightbox
  const [photoPreview, setPhotoPreview] = useState<{ src: string; code: string } | null>(null);

  const filteredFlights = allFlights.filter(f => f.type === form.flightType);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterStatus) params.set("status", filterStatus);
      const [colisRes, statsRes, flRes] = await Promise.all([
        fetch(`${API}/api/colis?${params}`, { headers: authH() }),
        fetch(`${API}/api/colis/stats`,      { headers: authH() }),
        fetch(`${API}/api/colis/flights-list`, { headers: authH() }),
      ]);
      if (colisRes.ok) { const d = await colisRes.json(); setColis(d.colis || []); }
      if (statsRes.ok) { const d = await statsRes.json(); setStats(d.stats); }
      if (flRes.ok)    { const d = await flRes.json();    setAllFlights(d.flights || []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* --- Refresh showDetail after status change ---- */
  const refreshDetail = async (id: number) => {
    try {
      const res = await fetch(`${API}/api/colis?search=`, { headers: authH() });
      if (res.ok) {
        const d = await res.json();
        const updated = (d.colis || []).find((c: Colis) => c.id === id);
        if (updated) setShowDetail(updated);
      }
    } catch {}
  };

  const handleSave = async () => {
    if (!form.sender_name.trim() || !form.recipient_name.trim()) {
      alert("Nom expéditeur et destinataire requis."); return;
    }
    setSaving(true);
    try {
      // On exclut photo_data du body principal — envoi séparé après création
      const { photo_data, flightType, ...rest } = form;
      const body = {
        ...rest,
        weight:    form.weight    ? parseFloat(form.weight as string)    : null,
        price:     parseFloat(form.price as string) || 0,
        flight_id: form.flight_id ? parseInt(form.flight_id as string)   : null,
      };
      const url    = editingColis ? `${API}/api/colis/${editingColis.id}` : `${API}/api/colis`;
      const method = editingColis ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: authH(), body: JSON.stringify(body) });
      if (!res.ok) {
        let errMsg = `Erreur serveur (${res.status})`;
        try { const e = await res.json(); errMsg = e.error || e.details || errMsg; } catch {}
        throw new Error(errMsg);
      }
      const data = await res.json();
      // Si photo sélectionnée, on l'enregistre séparément
      if (photo_data) {
        const colisId = editingColis?.id ?? data.colis?.id;
        if (colisId) {
          await fetch(`${API}/api/colis/${colisId}/photo`, {
            method: "PUT", headers: authH(),
            body: JSON.stringify({ photo_data }),
          });
        }
      }
      setShowModal(false); setEditingColis(null); setForm(emptyForm()); fetchData();
    } catch (e: any) { alert("Erreur: " + e.message); }
    finally { setSaving(false); }
  };

  const handleStatus = async (id: number, status: string) => {
    setStatusLoading(id);
    try {
      await fetch(`${API}/api/colis/${id}/status`, {
        method:"PUT", headers: authH(), body: JSON.stringify({ status }),
      });
      await fetchData();
      await refreshDetail(id);
    } catch (e: any) { alert(e.message); }
    finally { setStatusLoading(null); }
  };

  /* Save photo independently (used in detail modal delivery verification) */
  const savePhotoForColis = async (id: number, photo: string) => {
    setPhotoSavingId(id);
    try {
      await fetch(`${API}/api/colis/${id}/photo`, {
        method:"PUT", headers: authH(), body: JSON.stringify({ photo_data: photo }),
      });
      await fetchData();
      await refreshDetail(id);
    } catch (e: any) { alert("Erreur sauvegarde photo: " + e.message); }
    finally { setPhotoSavingId(null); }
  };

  const handleDelete = async (id: number) => {
    await fetch(`${API}/api/colis/${id}`, { method:"DELETE", headers: authH() });
    setDeleteConfirm(null); fetchData();
  };

  const openCreate = () => { setEditingColis(null); setForm(emptyForm()); setShowModal(true); };
  const openEdit   = (c: Colis) => {
    setEditingColis(c);
    const flType = allFlights.find(f => f.id === c.flight_id)?.type || "plane";
    setForm({
      sender_name:c.sender_name, sender_id_type:c.sender_id_type||"nif",
      sender_id_number:c.sender_id_number||"", sender_phone:c.sender_phone||"",
      recipient_name:c.recipient_name, recipient_phone:c.recipient_phone||"",
      recipient_address:c.recipient_address||"", description:c.description||"",
      weight:c.weight?String(c.weight):"", flight_id:c.flight_id?String(c.flight_id):"",
      flightType:flType, price:String(c.price||""), currency:c.currency||"USD",
      payment_method:c.payment_method||"cash", notes:c.notes||"",
      photo_data:c.photo_data||"",
    });
    setShowModal(true);
  };

  const statCards = [
    { key:"total",     label:"Total colis",  value:stats.total,      icon:Package,      grad:"from-slate-600 to-slate-700" },
    { key:"en_attente",label:"En attente",   value:stats.en_attente, icon:AlertCircle,  grad:"from-orange-500 to-orange-600" },
    { key:"en_vol",    label:"En vol",       value:stats.en_vol,     icon:Plane,        grad:"from-blue-500 to-blue-600" },
    { key:"arrive",    label:"Arrivés",      value:stats.arrive,     icon:PackageCheck, grad:"from-green-500 to-green-600" },
    { key:"livre",     label:"Livrés",       value:stats.livre,      icon:CheckCircle,  grad:"from-purple-500 to-purple-600" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg">
              <Package className="h-5 w-5 text-white" />
            </div>
            Gestion des Colis
          </h1>
          <p className="mt-1 text-sm text-slate-500">Enregistrez, suivez et gérez tous les colis transportés</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all">
          <Plus className="h-4 w-4" /> Nouveau colis
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {statCards.map(({ key, label, value, icon: Icon, grad }) => (
          <div key={key}
            onClick={() => setFilterStatus(filterStatus === key || key==="total" ? "" : key)}
            className={`cursor-pointer rounded-2xl bg-gradient-to-br ${grad} p-4 text-white shadow-md transition-all hover:scale-105 hover:shadow-lg ${filterStatus===key?"ring-4 ring-white/60":""}`}>
            <Icon className="mb-2 h-5 w-5 opacity-80" />
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs font-medium opacity-80">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par code, nom, pièce..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-400">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        <button onClick={fetchData}
          className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors">
          <RefreshCw className="h-4 w-4" /> Actualiser
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {loading ? (
          <div className="flex h-48 items-center justify-center gap-3 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" /> Chargement...
          </div>
        ) : colis.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-400">
            <Package className="h-10 w-10 opacity-40" />
            <p className="font-medium">Aucun colis trouvé</p>
            <button onClick={openCreate} className="mt-2 text-sm text-blue-600 hover:underline">Créer le premier colis →</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 text-left">Code suivi</th>
                  <th className="px-4 py-3 text-center">Photo</th>
                  <th className="px-4 py-3 text-left">Expéditeur</th>
                  <th className="px-4 py-3 text-left">Destinataire</th>
                  <th className="px-4 py-3 text-left">Vol</th>
                  <th className="px-4 py-3 text-left">Montant</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {colis.map(c => {
                  const sc = STATUS_CONFIG[c.status];
                  return (
                    <tr key={c.id} className="group transition-colors hover:bg-blue-50/40">
                      <td className="px-4 py-3">
                        <button onClick={() => setShowDetail(c)} className="font-mono font-bold text-blue-700 hover:underline">
                          {c.tracking_code}
                        </button>
                      </td>
                      {/* ── Photo thumbnail ── */}
                      <td className="px-4 py-3 text-center">
                        {c.photo_data ? (
                          <button
                            onClick={() => setPhotoPreview({ src: c.photo_data!, code: c.tracking_code })}
                            className="group relative mx-auto block h-12 w-12 overflow-hidden rounded-xl border-2 border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all"
                            title="Voir la photo du colis">
                            <img src={c.photo_data} alt="colis" className="h-full w-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all rounded-xl">
                              <span className="text-white text-lg opacity-0 group-hover:opacity-100 transition-opacity">🔍</span>
                            </div>
                          </button>
                        ) : (
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-300" title="Aucune photo">
                            <Camera className="h-5 w-5" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{c.sender_name}</div>
                        {c.sender_id_number && <div className="text-xs text-slate-400">{c.sender_id_type?.toUpperCase()}: {c.sender_id_number}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{c.recipient_name}</div>
                        {c.recipient_phone && <div className="text-xs text-slate-400">{c.recipient_phone}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {c.flight_number
                          ? <div><div className="font-medium text-slate-700">{c.flight_number}</div><div className="text-xs text-slate-400">{c.dep_name} → {c.arr_name}</div></div>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{fmtMoney(c.price, c.currency)}</td>
                      <td className="px-4 py-3">
                        <div className="relative inline-block">
                          <select value={c.status} onChange={e => handleStatus(c.id, e.target.value)}
                            disabled={statusLoading===c.id}
                            className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold appearance-none pr-6 ${sc.color}`}>
                            {Object.entries(STATUS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                          </select>
                          {statusLoading===c.id
                            ? <Loader2 className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin" />
                            : <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{fmtDT(c.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => printColisReceipt(c)} title="Reçu"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-100 hover:text-blue-600 transition-colors">
                            <Printer className="h-4 w-4" />
                          </button>
                          <button onClick={() => openEdit(c)} title="Modifier"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-100 hover:text-amber-600 transition-colors">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteConfirm(c.id)} title="Supprimer"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-100 hover:text-red-600 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ MODAL CRÉATION / ÉDITION ══ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5" />
                <h2 className="text-lg font-bold">{editingColis ? "Modifier le colis" : "Enregistrer un nouveau colis"}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1 hover:bg-white/20 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* ─ Expéditeur ─ */}
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-orange-600">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs">📤</span>
                  Expéditeur
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Nom complet *</label>
                    <input value={form.sender_name} onChange={e => setForm(f=>({...f,sender_name:e.target.value}))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      placeholder="Jean Pierre Dupont" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Type pièce d'identité</label>
                    <select value={form.sender_id_type} onChange={e => setForm(f=>({...f,sender_id_type:e.target.value}))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400">
                      {ID_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">N° de pièce</label>
                    <input value={form.sender_id_number} onChange={e => setForm(f=>({...f,sender_id_number:e.target.value}))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                      placeholder="123-456-789" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Téléphone</label>
                    <input value={form.sender_phone} onChange={e => setForm(f=>({...f,sender_phone:e.target.value}))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                      placeholder="+509 3XXX-XXXX" />
                  </div>
                </div>
              </section>

              {/* ─ Destinataire ─ */}
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-blue-600">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs">📥</span>
                  Destinataire
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Nom complet *</label>
                    <input value={form.recipient_name} onChange={e => setForm(f=>({...f,recipient_name:e.target.value}))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      placeholder="Marie Claire Joseph" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Téléphone</label>
                    <input value={form.recipient_phone} onChange={e => setForm(f=>({...f,recipient_phone:e.target.value}))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                      placeholder="+509 3XXX-XXXX" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Adresse / Destination</label>
                    <input value={form.recipient_address} onChange={e => setForm(f=>({...f,recipient_address:e.target.value}))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                      placeholder="Cap-Haïtien, Rue principale" />
                  </div>
                </div>
              </section>

              {/* ─ Colis + Vol ─ */}
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-600">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs">📦</span>
                  Colis & Transport
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Description du colis</label>
                    <input value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                      placeholder="Vêtements, médicaments, documents..." />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Poids (kg)</label>
                    <input type="number" step="0.1" min="0" value={form.weight}
                      onChange={e => setForm(f=>({...f,weight:e.target.value}))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                      placeholder="0.5" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Notes internes</label>
                    <input value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                      placeholder="Notes supplémentaires..." />
                  </div>

                  {/* Type de vol */}
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-semibold text-slate-600">Type de vol</label>
                    <div className="mb-3 flex gap-2">
                      <button type="button"
                        onClick={() => setForm(f=>({...f,flightType:"plane",flight_id:""}))}
                        className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${form.flightType==="plane"?"bg-blue-600 border-blue-600 text-white shadow-md":"border-slate-200 text-slate-500 hover:border-blue-300"}`}>
                        <Plane className="h-4 w-4" /> Avion
                      </button>
                      <button type="button"
                        onClick={() => setForm(f=>({...f,flightType:"helicopter",flight_id:""}))}
                        className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${form.flightType==="helicopter"?"bg-indigo-600 border-indigo-600 text-white shadow-md":"border-slate-200 text-slate-500 hover:border-indigo-300"}`}>
                        <span className="text-base">🚁</span> Hélicoptère
                      </button>
                    </div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Vol {form.flightType==="plane"?"avion":"hélicoptère"} disponible
                    </label>
                    {filteredFlights.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-4 text-center text-xs text-slate-400">
                        Aucun vol {form.flightType==="plane"?"avion":"hélicoptère"} disponible
                      </div>
                    ) : (
                      <select value={form.flight_id} onChange={e => setForm(f=>({...f,flight_id:e.target.value}))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                        <option value="">— Choisir un vol —</option>
                        {filteredFlights.map(fl => (
                          <option key={fl.id} value={fl.id}>
                            {fl.flight_number} · {fl.dep_name||fl.dep_city} → {fl.arr_name||fl.arr_city} · {new Date(fl.departure_time).toLocaleDateString("fr-FR")} · {fl.seats_available} place(s)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </section>

              {/* ─ Paiement ─ */}
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-green-700">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs">💰</span>
                  Paiement
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Montant</label>
                    <input type="number" step="0.01" min="0" value={form.price}
                      onChange={e => setForm(f=>({...f,price:e.target.value}))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                      placeholder="0.00" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Devise</label>
                    <select value={form.currency} onChange={e => setForm(f=>({...f,currency:e.target.value}))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400">
                      <option>USD</option><option>HTG</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Méthode</label>
                    <select value={form.payment_method} onChange={e => setForm(f=>({...f,payment_method:e.target.value}))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400">
                      {PAY_METHODS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              {/* ─ Photo du colis (prise lors de l'enregistrement) ─ */}
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs">📷</span>
                  Photo du colis <span className="ml-1 text-xs font-normal normal-case text-slate-400">(optionnel – utilisée pour la vérification à la livraison)</span>
                </h3>
                <PhotoPicker
                  value={form.photo_data}
                  onChange={b64 => setForm(f=>({...f,photo_data:b64}))}
                  label=""
                />
              </section>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Annuler
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60">
                  {saving
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...</>
                    : <><CheckCircle className="h-4 w-4" /> {editingColis ? "Enregistrer" : "Créer le colis"}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL DÉTAIL / LIVRAISON ══ */}
      {showDetail && (
        <DetailModal
          colis={showDetail}
          statusLoading={statusLoading}
          photoSavingId={photoSavingId}
          onClose={() => setShowDetail(null)}
          onStatus={handleStatus}
          onPrint={printColisReceipt}
          onEdit={c => { setShowDetail(null); openEdit(c); }}
          onSavePhoto={savePhotoForColis}
        />
      )}

      {/* ══ PHOTO PREVIEW LIGHTBOX ══ */}
      {photoPreview && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setPhotoPreview(null)}>
          <div
            className="relative max-w-2xl w-full rounded-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between bg-black/70 px-4 py-3 backdrop-blur-sm">
              <div>
                <div className="text-xs text-white/60 uppercase tracking-wider">Photo du colis</div>
                <div className="font-mono text-sm font-bold text-white tracking-widest">{photoPreview.code}</div>
              </div>
              <button
                onClick={() => setPhotoPreview(null)}
                className="rounded-full bg-white/10 p-2 text-white hover:bg-white/25 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Full image */}
            <img
              src={photoPreview.src}
              alt={`Photo ${photoPreview.code}`}
              className="w-full max-h-[75vh] object-contain bg-black"
            />
            {/* Footer hint */}
            <div className="bg-black/70 px-4 py-2 text-center text-xs text-white/50">
              Cliquez en dehors ou sur ✕ pour fermer
            </div>
          </div>
        </div>
      )}

      {/* ══ CONFIRM DELETE ══ */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-7 w-7 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Supprimer ce colis ?</h3>
            <p className="mt-1 text-sm text-slate-500">Cette action est irréversible.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Annuler
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   DETAIL MODAL — avec vérification photo à la livraison
══════════════════════════════════════════════════════════════ */
function DetailModal({
  colis, statusLoading, photoSavingId, onClose, onStatus, onPrint, onEdit, onSavePhoto
}: {
  colis: Colis;
  statusLoading: number | null;
  photoSavingId: number | null;
  onClose: () => void;
  onStatus: (id: number, status: string) => void;
  onPrint: (c: Colis) => void;
  onEdit: (c: Colis) => void;
  onSavePhoto: (id: number, photo: string) => void;
}) {
  const sc = STATUS_CONFIG[colis.status];
  const [localPhoto, setLocalPhoto] = useState<string>(colis.photo_data || "");
  const isArrived = colis.status === "arrive";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 text-white">
          <div>
            <div className="text-xs opacity-80">Détails colis</div>
            <div className="font-mono text-lg font-bold tracking-widest">{colis.tracking_code}</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/20"><X className="h-5 w-5" /></button>
        </div>

        {/* Progress bar */}
        <div className="flex border-b border-slate-100">
          {Object.entries(STATUS_CONFIG).map(([k,v],i) => {
            const statuses = Object.keys(STATUS_CONFIG);
            const curIdx = statuses.indexOf(colis.status);
            return (
              <div key={k} className={`flex-1 py-3 text-center text-xs font-semibold transition-colors ${i<curIdx?"bg-green-50 text-green-600":i===curIdx?"bg-blue-50 text-blue-700":"text-slate-400"}`}>
                <div className="text-base">{v.icon}</div>
                <div>{v.label}</div>
              </div>
            );
          })}
        </div>

        <div className="p-5 space-y-4">
          {/* Infos */}
          <div className="grid grid-cols-2 gap-3">
            <InfoBox title="📤 Expéditeur" name={colis.sender_name}
              sub={[idLabel(colis.sender_id_type)+": "+(colis.sender_id_number||"—"), colis.sender_phone||""].filter(s=>s&&!s.endsWith(": —")).join(" • ")} />
            <InfoBox title="📥 Destinataire" name={colis.recipient_name}
              sub={[colis.recipient_phone, colis.recipient_address].filter(Boolean).join(" • ")} />
          </div>

          {colis.flight_number && (
            <div className="rounded-xl bg-blue-50 p-3 text-sm">
              <div className="font-semibold text-blue-800">✈ Vol: {colis.flight_number}</div>
              <div className="text-blue-600">{colis.dep_name} ({colis.dep_code}) → {colis.arr_name} ({colis.arr_code})</div>
              <div className="text-xs text-blue-500 mt-1">🛫 {fmtDT(colis.departure_time)} &nbsp;|&nbsp; 🛬 {fmtDT(colis.arrival_time)}</div>
            </div>
          )}

          {colis.description && (
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <span className="font-semibold">📦 Description: </span>{colis.description}
              {colis.weight ? <span className="ml-2 text-slate-400">• {colis.weight} kg</span> : null}
            </div>
          )}

          <div className="rounded-xl bg-amber-50 p-3 flex justify-between items-center">
            <div className="text-xs text-amber-700 font-semibold">Montant</div>
            <div className="text-lg font-bold text-amber-800">{fmtMoney(colis.price, colis.currency)}</div>
          </div>

          {/* ── PHOTO + VÉRIFICATION LIVRAISON ── */}
          {isArrived ? (
            <div className="rounded-xl border-2 border-green-300 bg-green-50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white text-sm">📦</div>
                <div>
                  <div className="font-bold text-green-800 text-sm">Colis arrivé — Vérification avant livraison</div>
                  <div className="text-xs text-green-600">Comparez la photo enregistrée avec le colis physique, puis marquez comme Livré.</div>
                </div>
              </div>
              {/* Photo du colis */}
              {localPhoto ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-green-700 uppercase tracking-wider">📷 Photo enregistrée du colis</div>
                  <img src={localPhoto} alt="Photo colis" className="w-full max-h-52 object-cover rounded-xl border-2 border-green-300 shadow" />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setLocalPhoto(""); }}
                      className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors">
                      Remplacer la photo
                    </button>
                    <button
                      onClick={() => { onStatus(colis.id, "livre"); onClose(); }}
                      disabled={statusLoading===colis.id}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-60 transition-colors">
                      {statusLoading===colis.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "✅"}
                      Confirmer livraison
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">⚠️ Aucune photo enregistrée</div>
                  <p className="text-xs text-amber-600">Prenez une photo du colis pour vérifier avant de le livrer.</p>
                  <PhotoPicker
                    value={localPhoto}
                    onChange={b64 => { setLocalPhoto(b64); onSavePhoto(colis.id, b64); }}
                    label="Photo de vérification"
                  />
                  <button
                    onClick={() => { onStatus(colis.id, "livre"); onClose(); }}
                    disabled={statusLoading===colis.id}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-green-400 bg-white py-2.5 text-sm font-bold text-green-700 hover:bg-green-50 disabled:opacity-60 transition-colors">
                    {statusLoading===colis.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "✅"}
                    Livrer sans photo
                  </button>
                </div>
              )}
              {photoSavingId === colis.id && (
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <Loader2 className="h-3 w-3 animate-spin" /> Sauvegarde photo…
                </div>
              )}
            </div>
          ) : colis.photo_data ? (
            /* Si non arrivé mais photo existe, on la montre discrètement */
            <div className="rounded-xl bg-slate-50 p-3 space-y-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">📷 Photo du colis</div>
              <img src={colis.photo_data} alt="Photo colis" className="w-full max-h-40 object-cover rounded-xl border border-slate-200" />
            </div>
          ) : null}

          {/* Mise à jour statut */}
          {colis.status !== "arrive" && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Mettre à jour le statut</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(STATUS_CONFIG).map(([k,v]) => (
                  <button key={k} onClick={() => onStatus(colis.id, k)}
                    disabled={colis.status===k || statusLoading===colis.id}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${colis.status===k ? v.color+" cursor-default" : "border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600"}`}>
                    {v.icon} {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={() => onPrint(colis)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
              <Printer className="h-4 w-4" /> Imprimer le reçu
            </button>
            <button onClick={() => onEdit(colis)}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
              <Edit2 className="h-4 w-4" /> Modifier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ title, name, sub }: { title: string; name: string; sub: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-xs font-bold text-slate-400 mb-1">{title}</div>
      <div className="font-semibold text-slate-800">{name}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}