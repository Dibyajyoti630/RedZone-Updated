export default function FeaturesIcon({ size = 16, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M12 6l1.2-2.2 2.3.5.5 2.3L18 8l2.2-1.2 1.4 2-1.6 1.8.6 2.3 2.4.4v2.5l-2.4.4-.6 2.3 1.6 1.8-1.4 2L18 20l-2 1.4-2.3-.6L12 24l-1.8-1.6-2.3.6L6 21.4 4 20l-2.2 1.2-1.4-2 1.6-1.8L1.4 15 0 14.6v-2.5L1.4 11l.6-2.3L.4 6.9l1.4-2L4 6l2-1.4 2.3.6L10.2 8 12 6z" stroke="currentColor" strokeWidth="1.4" opacity="0.25"/>
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M12 9.2V12l2 1.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}


