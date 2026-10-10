export function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#143D2B" />
      <path d="M32 50V16" stroke="#E8C547" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M32 20c8-6 16-4 18 2-8 1-14 6-18 12-4-6-10-11-18-12 2-6 10-8 18-2Z"
        fill="#3FA36A"
      />
      <path
        d="M32 28c6-4 12-3 14 1-6 1-10 4-14 9-4-5-8-8-14-9 2-4 8-5 14-1Z"
        fill="#E8C547"
      />
    </svg>
  );
}
