import { PlaneIcon } from "lucide-react";

export function NoFlightIcon({ size = 24, color = "currentColor" }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <PlaneIcon size={size} color={color} />
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        style={{ position: "absolute", top: 0, left: 0 }}
        fill="none"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Ligne de haut-droite à bas-gauche */}
        <line x1="12" y1="0" x2="12" y2="24" stroke="#0041b9" strokeWidth="2" />
      </svg>
    </div>
  );
}
