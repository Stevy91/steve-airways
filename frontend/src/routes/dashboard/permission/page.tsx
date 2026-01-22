import React, { useState } from "react";

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

  /* ---------- TOGGLE ---------- */
  const togglePermission = (id: string, value: boolean) => {
    setChecked((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const toggleGroup = (group: PermissionGroup, value: boolean) => {
    const updates: Record<string, boolean> = {
      [group.id]: value,
    };

    group.children.forEach((child) => {
      updates[child.id] = value;
    });

    setChecked((prev) => ({ ...prev, ...updates }));
  };

  /* ---------- BUILD PAYLOAD ---------- */
  const buildPermissionsPayload = () => {
    const payload: Record<string, boolean> = {};

    Object.entries(permissionMap).forEach(([checkboxId, backendKey]) => {
      payload[backendKey] = !!checked[checkboxId];
    });

    return payload;
  };

  /* ---------- API CALL ---------- */
  const savePermissions = async () => {
    try {
      setLoading(true);
      setSuccess(false);

      const permissions = buildPermissionsPayload();

      const res = await fetch("https://steve-airways.onrender.com/api/roles/permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: 1, // À remplacer par l'ID réel de l'utilisateur
          permissions,
        }),
      });

      if (!res.ok) throw new Error("Erreur API");

      setSuccess(true);
    } catch (err) {
      console.error("Erreur envoi permissions :", err);
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     RENDER
======================= */
  return (
    <div style={{ padding: 20 }}>
      <h2>Gestion des permissions</h2>

      {permissionsData.map((group: PermissionGroup) => {
        const isGroupChecked =
          group.children.length === 0
            ? checked[group.id] || false
            : group.children.every((c) => checked[c.id]);

        return (
          <div key={group.id} style={{ marginBottom: 10 }}>
            <label>
              <input
                type="checkbox"
                checked={isGroupChecked}
                onChange={(e) => toggleGroup(group, e.target.checked)}
              />{" "}
              <strong>{group.label}</strong>
            </label>

            <div style={{ marginLeft: 25, marginTop: 5 }}>
              {group.children.map((child) => (
                <label key={child.id} style={{ display: "block" }}>
                  <input
                    type="checkbox"
                    checked={checked[child.id] || false}
                    onChange={(e) =>
                      togglePermission(child.id, e.target.checked)
                    }
                  />{" "}
                  {child.label}
                </label>
              ))}
            </div>
          </div>
        );
      })}

      <button onClick={savePermissions} disabled={loading} className="rounded-md bg-amber-500 px-4 pb-1 pt-2 text-white hover:bg-amber-600">
        {loading ? "Enregistrement..." : "Enregistrer permissions"}
      </button>

      {success && <p style={{ color: "green" }}>Permissions enregistrées ✅</p>}

      {/* DEBUG */}
      <pre style={{ marginTop: 20 }}>
        {JSON.stringify(buildPermissionsPayload(), null, 2)}
      </pre>
    </div>
  );
}
