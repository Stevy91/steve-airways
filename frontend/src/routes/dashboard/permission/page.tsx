import React, { useState } from "react";
const permissionsData = [
  {
    id: "dashboard",
    label: "0 - TABLEAU DE BORD",
    children: []
  },
  {
    id: "user",
    label: "1 - UTILISATEUR",
    children: [
      { id: "flights", label: "1.1 - Listes Flights Plane" },
      { id: "bookings-plane", label: "1.2 - Listes bookings Plane" },
      { id: "flights-helico", label: "1.3 - Listes Flights Helico" },
      { id: "bookings-helico", label: "1.4 - Listes bookings Helico" },
      { id: "user", label: "1.5 - Users" },
      { id: "addFlights", label: "1.6 - Add Flights" },
      { id: "editFlights", label: "1.6 - Edit Flights" },
      { id: "listPassager", label: "1.6 - Listes Passagers" },
      { id: "editBookings", label: "1.6 - Edit Bookings" },
      { id: "imprimerTicket", label: "1.6 - Imprimer Ticket" },
    ]
  },
 

];


type PermissionGroup = {
  id: string;
  label: string;
  children: { id: string; label: string }[];
};

export default function PermissionsPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const togglePermission = (id: string, value: boolean) => {
    setChecked(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const toggleGroup = (group: PermissionGroup, value: boolean) => {
    const updates: Record<string, boolean> = {
      [group.id]: value
    };

    group.children.forEach(child => {
      updates[child.id] = value;
    });

    setChecked(prev => ({ ...prev, ...updates }));
  };

  return (
    <div>
      {permissionsData.map((group: PermissionGroup) => {
        const isGroupChecked =
          group.children.length === 0
            ? checked[group.id] || false
            : group.children.every(c => checked[c.id]);

        return (
          <div key={group.id}>
            <label>
              <input
                type="checkbox"
                checked={isGroupChecked}
                onChange={e => toggleGroup(group, e.target.checked)}
              />
              {group.label}
            </label>

            <div style={{ marginLeft: 20 }}>
              {group.children.map(child => (
                <label key={child.id}>
                  <input
                    type="checkbox"
                    checked={checked[child.id] || false}
                    onChange={e =>
                      togglePermission(child.id, e.target.checked)
                    }
                  />
                  {child.label}<br></br>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
