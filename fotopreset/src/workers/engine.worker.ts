/// <reference lib="webworker" />
import { EngineCore } from '../engine/core';
import type { Request, Response } from './protocol';

const core = new EngineCore();
const scope = self as unknown as DedicatedWorkerGlobalScope;

function reply(msg: Response, transfer: Transferable[] = []): void {
  scope.postMessage(msg, transfer);
}

function sendImage(id: number, img: ImageData): void {
  const buffer = img.data.buffer as ArrayBuffer;
  reply({ id, type: 'image', width: img.width, height: img.height, buffer }, [buffer]);
}

scope.onmessage = async (event: MessageEvent<Request>) => {
  const msg = event.data;
  try {
    switch (msg.type) {
      case 'load':
        reply({ id: msg.id, type: 'loaded', info: await core.load(msg.blob) });
        break;
      case 'original':
        sendImage(msg.id, core.original());
        break;
      case 'render':
        sendImage(msg.id, core.render(msg.adjustments));
        break;
      case 'thumbnail':
        reply({ id: msg.id, type: 'blob', blob: await core.thumbnail(msg.adjustments) });
        break;
      case 'export': {
        const blob = await core.export(msg.options, (fraction) =>
          reply({ id: msg.id, type: 'progress', fraction }),
        );
        reply({ id: msg.id, type: 'blob', blob });
        break;
      }
      case 'dispose':
        core.dispose();
        reply({ id: msg.id, type: 'done' });
        break;
    }
  } catch (e) {
    reply({ id: msg.id, type: 'error', message: e instanceof Error ? e.message : String(e) });
  }
};
