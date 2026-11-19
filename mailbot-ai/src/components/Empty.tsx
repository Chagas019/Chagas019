import type { ReactNode } from 'react';
import { Mascot } from './Mascot';

export function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card empty enter">
      <div style={{ width: 84, height: 84, margin: '0 auto', position: 'relative' }}><Mascot size="small" /></div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
