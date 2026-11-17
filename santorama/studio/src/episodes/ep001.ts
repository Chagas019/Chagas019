// EP001 — São Maximiliano Maria Kolbe: "O homem que escolheu morrer por amor"
import timings from '../../public/ep001/timings.json';
import events from '../../public/ep001/events.json';
import type {EpisodeConfig} from '../core/Episode';
import {S1Gancho, S2Quem, S3Missao, S4Guerra, S5Escolha} from '../scenes/ep001/ScenesA';
import {S6Sacrificio, S7UltimaProva, S8Mensagem, S9Versiculo, S10Final} from '../scenes/ep001/ScenesB';

export const ep001: EpisodeConfig = {
  id: 'EP001-Kolbe',
  audio: 'ep001/mix.wav',
  timings: timings as any,
  events,
  overlap: 10,
  scenes: {
    's1-gancho': S1Gancho,
    's2-quem': S2Quem,
    's3-missao': S3Missao,
    's4-guerra': S4Guerra,
    's5-escolha': S5Escolha,
    's6-sacrificio': S6Sacrificio,
    's7-ultima-prova': S7UltimaProva,
    's8-mensagem': S8Mensagem,
    's9-versiculo': S9Versiculo,
    's10-final': S10Final,
  },
};
