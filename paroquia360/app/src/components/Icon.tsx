const P: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  cal: 'M3 7.5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3V18a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM3 9.5h18M8 2.5v4M16 2.5v4',
  swap: 'M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
  users: 'M5.5 8a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0-7 0M2.5 20c.6-3.5 3.3-5.5 6.5-5.5s5.9 2 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.7.7 2.8 2.4 3 5.2',
  arrow: 'M7 17 17 7M8 7h9v9',
  arrowl: 'M17 17 7 7M7 16V7h9',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  out: 'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3',
  heart: 'M12 20s-7-4.4-8.6-8.8C2.3 8 4.2 5 7.3 5c1.9 0 3.1 1 4.7 2.8C13.6 6 14.8 5 16.7 5c3.1 0 5 3 3.9 6.2C19 15.6 12 20 12 20z',
  layers: 'm12 3 9 5-9 5-9-5zM3 13l9 5 9-5',
};
export function Icon({ name, size = 20 }: { name: keyof typeof P | string; size?: number }) {
  return (
    <svg className="i" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={P[name] ?? ''} />
    </svg>
  );
}
