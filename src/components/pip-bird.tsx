export function PipBird({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      aria-hidden="true"
    >
      <ellipse cx="60" cy="108" rx="28" ry="6" fill="#edd9bc" />
      <ellipse cx="60" cy="68" rx="34" ry="30" fill="#f4c95d" />
      <ellipse cx="86" cy="62" rx="16" ry="14" fill="#f4c95d" />
      <path d="M98 58c12 2 16 8 14 12-8 1-16-2-20-8 2-3 4-4 6-4z" fill="#e36a5d" />
      <circle cx="90" cy="58" r="3.5" fill="#2c2416" />
      <path
        d="M38 78c-14 8-18 20-8 24 10-6 16-14 16-22z"
        fill="#e36a5d"
      />
      <path
        d="M46 96c8 10 22 10 30 0"
        fill="none"
        stroke="#2c2416"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
