import { COLORS } from '@/lib/constants';

interface StartHereIconProps {
  isActive?: boolean;
}

export default function StartHereIcon({ isActive = false }: StartHereIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      height="16"
      width="16"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke={isActive ? COLORS.START_CURSOR : COLORS.SECONDARY}
        strokeWidth="2"
        fill={isActive ? COLORS.START_CURSOR : 'none'}
      />
      <path
        d="M10 8.5l5 3.5-5 3.5z"
        fill={isActive ? '#FFFFFF' : COLORS.SECONDARY}
      />
    </svg>
  );
}
