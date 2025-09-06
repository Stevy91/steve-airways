import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("https://steve-airways-production.up.railway.app"); // Ton backend

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    // Récup initial
    fetchNotifications();

    // Écouter les nouvelles notifications
    socket.on("new-notification", (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    });

    return () => {
      socket.off("new-notification");
    };
  }, []);

  const fetchNotifications = async () => {
    const res = await fetch("https://steve-airways-production.up.railway.app/api/notifications");
    const data = await res.json();
    if (data.success) setNotifications(data.notifications);
  };

  const markAsSeen = async (id: number) => {
    await fetch(`https://steve-airways-production.up.railway.app/api/notifications/${id}/seen`, { method: "PATCH" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, seen: true } : n))
    );
  };

  return (
    <div>
      <h2>Notifications</h2>
      <ul>
        {notifications.map((n) => (
          <li key={n.id} style={{ fontWeight: n.seen ? "normal" : "bold" }}>
            {n.message} - {new Date(n.createdAt || n.created_at).toLocaleString()}
            {!n.seen && <button onClick={() => markAsSeen(n.id)}>Marquer comme lue</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
