import { useState, useEffect } from "react";
import { Settings, Save, Building, DollarSign, Ticket, RefreshCcw } from "lucide-react";
import { useTheme } from "../../../contexts/theme-context";
import toast from "react-hot-toast";

const API = "https://steve-airways.onrender.com";

type Setting = { id: number; setting_key: string; setting_value: string; setting_group: string; description: string; };

const GROUP_ICONS: Record<string, any> = {
  general: Building,
  finance: DollarSign,
  booking: Ticket,
};

const GROUP_LABELS: Record<string, string> = {
  general: "Informations générales",
  finance: "Paramètres financiers",
  booking: "Réservations",
};

export default function SettingsPage() {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [settings, setSettings] = useState<Setting[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("token");

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/settings`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setSettings(data.settings || []);
      const initial: Record<string, string> = {};
      (data.settings || []).forEach((s: Setting) => { initial[s.setting_key] = s.setting_value; });
      setEdits(initial);
    } catch { toast.error("Impossible de charger les paramètres"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsArray = Object.entries(edits).map(([setting_key, setting_value]) => ({ setting_key, setting_value }));
      const res = await fetch(`${API}/api/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ settings: settingsArray }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Paramètres sauvegardés !");
      fetchSettings();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const groups = [...new Set(settings.map(s => s.setting_group))];

  const cardBg = dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200";
  const textMain = dark ? "text-white" : "text-gray-900";
  const textSub = dark ? "text-slate-400" : "text-gray-500";
  const inputCls = `w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${dark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-gray-50 border-gray-300 text-gray-900"}`;

  const hasChanges = settings.some(s => edits[s.setting_key] !== s.setting_value);

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500">
            <Settings className="text-white" size={22} />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${textMain}`}>Paramètres</h1>
            <p className={`text-sm ${textSub}`}>Configuration globale du système</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchSettings} className={`p-2 rounded-xl border ${dark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
            <RefreshCcw size={16} />
          </button>
          {hasChanges && (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:opacity-90 disabled:opacity-50">
              <Save size={16} /> {saving ? "Sauvegarde..." : "Sauvegarder"}
            </button>
          )}
        </div>
      </div>

      {hasChanges && (
        <div className={`p-3 rounded-xl border text-sm ${dark ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" : "bg-yellow-50 border-yellow-200 text-yellow-700"}`}>
          ⚠️ Vous avez des modifications non sauvegardées.
        </div>
      )}

      {groups.map(group => {
        const Icon = GROUP_ICONS[group] || Settings;
        const groupSettings = settings.filter(s => s.setting_group === group);
        return (
          <div key={group} className={`rounded-2xl border overflow-hidden ${cardBg}`}>
            <div className={`flex items-center gap-3 px-6 py-4 border-b ${dark ? "border-slate-700 bg-slate-700/30" : "border-gray-100 bg-gray-50"}`}>
              <Icon size={18} className="text-blue-500" />
              <h2 className={`font-semibold ${textMain}`}>{GROUP_LABELS[group] || group}</h2>
            </div>
            <div className="p-6 space-y-4">
              {groupSettings.map(s => (
                <div key={s.setting_key} className="grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-4 sm:items-center">
                  <div className="sm:col-span-1">
                    <p className={`text-sm font-medium ${textMain}`}>{s.description || s.setting_key}</p>
                    <p className={`text-xs ${textSub}`}>{s.setting_key}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      className={inputCls}
                      value={edits[s.setting_key] ?? s.setting_value}
                      onChange={e => setEdits(prev => ({ ...prev, [s.setting_key]: e.target.value }))}
                    />
                    {edits[s.setting_key] !== s.setting_value && (
                      <p className="text-xs text-blue-500 mt-1">Modifié (valeur originale: {s.setting_value})</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <button onClick={handleSave} disabled={saving || !hasChanges}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-all">
        <Save size={18} /> {saving ? "Sauvegarde en cours..." : "Sauvegarder tous les paramètres"}
      </button>
    </div>
  );
}
