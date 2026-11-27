export function VaakMark({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="6"
        fill="#C5F36B"
        stroke="#151515"
        strokeWidth="2.5"
      />
      <path
        d="M9 10.5L15 22L16.5 18.5"
        stroke="#151515"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23 10.5L17 22"
        stroke="#151515"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="9" r="2" fill="#C5B8FF" stroke="#151515" strokeWidth="1.5" />
    </svg>
  );
}
