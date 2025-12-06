import { COLORS } from '@/lib/constants';

interface SpeakerIconProps {
  isPlaying?: boolean;
  isLoading?: boolean;
}

export default function SpeakerIcon({ isPlaying = false, isLoading = false }: SpeakerIconProps) {
  const color = isPlaying ? COLORS.PRIMARY : COLORS.SECONDARY;

  if (isLoading) {
    // ローディング中はスピナー表示
    return (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        height="16"
        width="16"
        className="animate-spin"
      >
        <circle
          cx="8"
          cy="8"
          r="6"
          stroke={COLORS.NEUTRAL}
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M14 8a6 6 0 0 0-6-6"
          stroke={color}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      height="16"
      width="16"
    >
      {/* スピーカー本体 */}
      <path
        d="M2 5.5h2.5L8 2.5v11l-3.5-3H2a.5.5 0 0 1-.5-.5V6a.5.5 0 0 1 .5-.5Z"
        fill={color}
      />
      {/* 音波（再生中のみ表示） */}
      {isPlaying && (
        <>
          <path
            d="M10 5.5c.8.8 1.2 1.6 1.2 2.5s-.4 1.7-1.2 2.5"
            stroke={color}
            strokeWidth="1.2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M12 3.5c1.3 1.3 2 2.8 2 4.5s-.7 3.2-2 4.5"
            stroke={color}
            strokeWidth="1.2"
            strokeLinecap="round"
            fill="none"
          />
        </>
      )}
    </svg>
  );
}
