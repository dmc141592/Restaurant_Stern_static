import type { SVGProps } from 'react';

export default function MusicOnIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M10.5 5.5 5 7.2v9.1" />
      <path d="M10.5 5.5v10.8" />
      <circle cx="4" cy="17.2" r="1.7" />
      <circle cx="9" cy="16.3" r="1.7" />
      <path d="M14.8 8.2c1.1.9 1.1 3.1 0 4" />
      <path d="M17.2 6.1c2 1.9 2 6.1 0 8" />
    </svg>
  );
}
