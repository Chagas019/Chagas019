import os from 'node:os';
import { HANDLERS } from './handlers.js';
import { claimNext, completeJob, failJob, recoverStale, type Job } from './queue.js';
import { logger } from '../lib/logger.js';
import { PermanentError } from '../lib/errors.js';

/** Executor da fila. Respeita lanes (um job por agente por vez) e concorrência máxima global. */
export class Worker {
  private id = `${os.hostname()}:${process.pid}`;
  private running = new Set<Promise<void>>();
  private timer: NodeJS.Timeout | null = null;
  private stopped = false;

  constructor(private maxConcurrent = 3, private intervalMs = 2000) {}

  start() {
    recoverStale(0);
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
    logger.info('Worker iniciado', { id: this.id, maxConcurrent: this.maxConcurrent });
  }

  async stop() {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    await Promise.allSettled([...this.running]);
  }

  async tick() {
    while (!this.stopped && this.running.size < this.maxConcurrent) {
      const job = claimNext(this.id);
      if (!job) return;
      const p = this.execute(job).finally(() => this.running.delete(p));
      this.running.add(p);
    }
  }

  /** Executa até esvaziar a fila (útil em scripts e testes). */
  async drain(maxJobs = 100) {
    for (let i = 0; i < maxJobs; i++) {
      const job = claimNext(this.id);
      if (!job) return i;
      await this.execute(job);
    }
    return maxJobs;
  }

  private async execute(job: Job) {
    const handler = HANDLERS[job.type];
    try {
      if (!handler) throw new PermanentError(`Tipo de tarefa desconhecido: ${job.type}`);
      const result = await handler(job.payload, job);
      completeJob(job.id, result);
    } catch (e) {
      failJob(job, e);
    }
  }
}
