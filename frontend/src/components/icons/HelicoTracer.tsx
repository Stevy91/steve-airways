import { FC } from "react";

interface NoHelicopterIconProps {
  size?: number;
  color?: string;
}

const NoHelicopterIcon: FC<NoHelicopterIconProps> = ({ size = 48, color = "#000" }) => {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {/* Hélicoptère SVG simple */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Corps */}
        <rect x="16" y="28" width="32" height="12" rx="2" fill={color} />
        {/* Rotor */}
        <line x1="32" y1="12" x2="32" y2="28" stroke={color} strokeWidth="3" />
        <line x1="16" y1="12" x2="48" y2="12" stroke={color} strokeWidth="3" />
        {/* Queue */}
        <rect x="44" y="32" width="12" height="4" fill={color} />
        {/* Pattes d'atterrissage */}
        <line x1="20" y1="40" x2="20" y2="44" stroke={color} strokeWidth="2" />
        <line x1="44" y1="40" x2="44" y2="44" stroke={color} strokeWidth="2" />
      </svg>

      {/* Ligne diagonale rouge */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        style={{ position: "absolute", top: 0, left: 0 }}
        fill="none"
      >
        <line x1="0" y1="0" x2="64" y2="64" stroke="#dc2626" strokeWidth="4" />
      </svg>
    </div>
  );
};

export default NoHelicopterIcon;
