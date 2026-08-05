import type { SVGProps } from 'react';

/** Kleines Markendetail — bewusst dezent, nie grossflächig eingesetzt. */
export default function StarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M12 2.5c.9 3.2 1.9 5.6 3.1 6.8 1.2 1.2 3.6 2.2 6.9 3-3.3.8-5.7 1.8-6.9 3-1.2 1.2-2.2 3.6-3.1 6.8-.9-3.2-1.9-5.6-3.1-6.8-1.2-1.2-3.6-2.2-6.9-3 3.3-.8 5.7-1.8 6.9-3 1.2-1.2 2.2-3.6 3.1-6.8Z" />
    </svg>
  );
}
