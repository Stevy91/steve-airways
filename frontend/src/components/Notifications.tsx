import { useEffect, useState } from "react";
import axios from "axios";

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const res = await axios.get("https://steve-airways-production.up.railway.app/api/notifications");
    if (res.data.success) setNotifications(res.data.notifications);
  };

  const markAsSeen = async (id: number) => {
    await axios.patch(`https://steve-airways-production.up.railway.app/api/notifications/${id}/seen`);
    fetchNotifications();
  };

  return (
    <div>
      <h2>Notifications</h2>
      <ul>
        {notifications.map((n) => (
          <li key={n.id} style={{ fontWeight: n.seen ? "normal" : "bold" }}>
            {n.message} - {new Date(n.created_at).toLocaleString()}
            {!n.seen && <button onClick={() => markAsSeen(n.id)}>Marquer comme lue</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
