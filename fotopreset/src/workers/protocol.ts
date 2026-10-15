import type { Adjustments } from '../engine/adjustments';
import type { ExportOptions, LoadInfo } from '../engine/core';

export type Request =
  | { id: number; type: 'load'; blob: Blob }
  | { id: number; type: 'original' }
  | { id: number; type: 'render'; adjustments: Adjustments }
  | { id: number; type: 'thumbnail'; adjustments: Adjustments }
  | { id: number; type: 'export'; options: ExportOptions }
  | { id: number; type: 'dispose' };

export type Response =
  | { id: number; type: 'loaded'; info: LoadInfo }
  | { id: number; type: 'image'; width: number; height: number; buffer: ArrayBuffer }
  | { id: number; type: 'blob'; blob: Blob }
  | { id: number; type: 'progress'; fraction: number }
  | { id: number; type: 'done' }
  | { id: number; type: 'error'; message: string };
