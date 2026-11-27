export function VaakMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect width="32" height="32" rx="8" fill="var(--mv-accent)" />
      <path
        d="M8.5 10.5L14.5 22L16 19"
        stroke="var(--mv-accent-text)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23.5 10.5L17.5 22"
        stroke="currentColor"
        strokeOpacity="0.65"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="9.5" r="1.75" fill="var(--mv-accent-text)" />
    </svg>
  );
}
