export default function ShieldIcon({ className = "", size = 18 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 3.5l6 2.1v5.4c0 4.1-2.6 7.9-6 9-3.4-1.1-6-5-6-9V5.6l6-2.1z"
        fill="currentColor"
        opacity="0.15"
      />
      <path
        d="M12 3l6.5 2.3v5.7c0 4.4-2.8 8.5-6.5 9.7C8.3 19.5 5.5 15.4 5.5 11V5.3L12 3z"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 12.5l2 2 3-3"
        stroke="currentColor"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}


