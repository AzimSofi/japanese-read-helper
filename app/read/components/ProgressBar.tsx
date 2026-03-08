'use client';

interface ProgressBarProps {
  progress: number;
  visible?: boolean;
}

export default function ProgressBar({
  progress,
  visible = true,
}: ProgressBarProps) {
  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">

      <div className="h-0.5 w-full">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${Math.min(100, Math.max(0, progress))}%`,
            backgroundColor: '#007AFF',
            opacity: 0.8,
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
    </div>
  );
}
