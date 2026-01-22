import React, { useState, useEffect } from "react";

/* =======================
   DATA PERMISSIONS
======================= */
const permissionsData = [
  {
    id: "dashboard",
    label: "0 - TABLEAU DE BORD",
    children: [],
  },
  {
    id: "user",
    label: "1 - UTILISATEUR",
    children: [
      { id: "flights", label: "1.1 - Listes Flights Plane" },
      { id: "bookingsplane", label: "1.2 - Listes Bookings Plane" },
      { id: "flightshelico", label: "1.3 - Listes Flights Helico" },
      { id: "bookingshelico", label: "1.4 - Listes Bookings Helico" },
      { id: "listeUsers", label: "1.5 - Users" },
      { id: "addFlights", label: "1.6 - Add Flights" },
      { id: "editFlights", label: "1.7 - Edit Flights" },
      { id: "listPassager", label: "1.8 - Listes Passagers" },
      { id: "editBookings", label: "1.9 - Edit Bookings" },
      { id: "imprimerTicket", label: "2.0 - Imprimer Ticket" },
    ],
  },
];

/* =======================
   MAPPING FRONT → BACK
======================= */
const permissionMap: Record<string, string> = {
  flights: "listeFlightsPlane",
  bookingsplane: "listeBookingsPlane",
  flightshelico: "listeFlightsHelico",
  bookingshelico: "listeBookingsHelico",
  listeUsers: "listeUsers",
  addFlights: "addFlights",
  editFlights: "editFlights",
  listPassager: "listePassagers",
  editBookings: "editBookings",
  imprimerTicket: "imprimerTicket",
};

/* =======================
   TYPES
======================= */
type PermissionGroup = {
  id: string;
  label: string;
  children: { id: string; label: string }[];
};

/* =======================
   COMPONENT
======================= */
export default function PermissionsPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState('3'); // Id utilisateur

  /* ---------- INITIALISATION ---------- */
  useEffect(() => {
    // Initialiser tous les checkboxes à false
    const initialChecked: Record<string, boolean> = {};
    
    permissionsData.forEach(group => {
      initialChecked[group.id] = false;
      group.children.forEach(child => {
        initialChecked[child.id] = false;
      });
    });
    
    setChecked(initialChecked);
  }, []);

  /* ---------- TOGGLE ---------- */
  const togglePermission = (id: string, value: boolean) => {
    setChecked(prev => ({
      ...prev,
      [id]: value,
    }));
  };

  const toggleGroup = (group: PermissionGroup, value: boolean) => {
    const updates: Record<string, boolean> = {};

    // Si le groupe a des enfants, toggle les enfants
    if (group.children.length > 0) {
      group.children.forEach((child) => {
        updates[child.id] = value;
      });
    } else {
      // Sinon toggle le groupe lui-même
      updates[group.id] = value;
    }

    setChecked((prev) => ({ ...prev, ...updates }));
  };

  /* ---------- BUILD PAYLOAD ---------- */
  const buildPermissionsPayload = () => {
    const payload: Record<string, boolean> = {};

    Object.entries(permissionMap).forEach(([checkboxId, backendKey]) => {
      // Utiliser false si non défini
      payload[backendKey] = checked[checkboxId] || false;
    });

    return payload;
  };

  /* ---------- API CALL ---------- */
  const savePermissions = async () => {
    try {
      setLoading(true);
      setSuccess(false);
      setError(null);

      const permissions = buildPermissionsPayload();
      
      console.log("Payload à envoyer :", {
        userId,
        permissions
      });

      const res = await fetch("https://steve-airways.onrender.com/api/roles/permissions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          // Ajoutez l'authentification si nécessaire
          // "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          permissions,
        }),
      });

      const data = await res.json();
      
      console.log("Réponse serveur :", data);

      if (!res.ok) {
        throw new Error(data.message || `Erreur ${res.status}`);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err: any) {
      console.error("Erreur envoi permissions :", err);
      setError(err.message || "Erreur inconnue");
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- CHECKBOX GROUP ---------- */
  const isGroupChecked = (group: PermissionGroup) => {
    if (group.children.length === 0) {
      return checked[group.id] || false;
    }
    return group.children.every((c) => checked[c.id]);
  };

  /* =======================
     RENDER
  ======================= */
  return (
    <div style={{ padding: 20, maxWidth: 800 }}>
      <h2>Gestion des permissions</h2>

      {/* Champ utilisateur */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ marginRight: 10 }}>
          ID Utilisateur:
        </label>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          style={{ padding: 5, border: "1px solid #ccc" }}
        />
      </div>

      {/* Liste des permissions */}
      {permissionsData.map((group: PermissionGroup) => (
        <div key={group.id} style={{ marginBottom: 20, border: "1px solid #eee", padding: 15, borderRadius: 5 }}>
          <label style={{ display: "block", marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={isGroupChecked(group)}
              onChange={(e) => toggleGroup(group, e.target.checked)}
              style={{ marginRight: 10 }}
            />
            <strong>{group.label}</strong>
          </label>

          {group.children.length > 0 && (
            <div style={{ marginLeft: 20 }}>
              {group.children.map((child) => (
                <label key={child.id} style={{ display: "block", marginBottom: 5 }}>
                  <input
                    type="checkbox"
                    checked={checked[child.id] || false}
                    onChange={(e) => togglePermission(child.id, e.target.checked)}
                    style={{ marginRight: 10 }}
                  />
                  {child.label}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Bouton d'enregistrement */}
      <button 
        onClick={savePermissions} 
        disabled={loading}
        style={{
          padding: "10px 20px",
          backgroundColor: "#f59e0b",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? "Enregistrement..." : "Enregistrer permissions"}
      </button>

      {/* Messages */}
      {success && (
        <div style={{ color: "green", marginTop: 10 }}>
          ✅ Permissions enregistrées avec succès
        </div>
      )}
      
      {error && (
        <div style={{ color: "red", marginTop: 10 }}>
          ❌ Erreur: {error}
        </div>
      )}

      {/* DEBUG */}
      <div style={{ marginTop: 30, padding: 15, backgroundColor: "#f5f5f5", borderRadius: 5 }}>
        <h3>Debug - Payload généré:</h3>
        <pre style={{ fontSize: 12 }}>
          {JSON.stringify({
            userId,
            permissions: buildPermissionsPayload()
          }, null, 2)}
        </pre>
        
        <h4>État des checkboxes:</h4>
        <pre style={{ fontSize: 12 }}>
          {JSON.stringify(checked, null, 2)}
        </pre>
      </div>
    </div>
  );
}