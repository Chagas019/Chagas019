// Registro de composições. Dono: agente CÓDIGO. Organização: uma pasta por projeto, um formato por composição.
import React from 'react';
import {Composition, Folder} from 'remotion';
import {FORMATOS, FPS} from './config/formatos';
import {duracaoTotal} from './cenas/tipos';
import {Demo} from './projetos/demo/Demo';
import {planoDemo} from './projetos/demo/cenas';
import {Teste3D} from './projetos/Teste3D';
import {ConfieEmCristo} from './projetos/confie-em-cristo/ConfieEmCristo';
import {planoConfie} from './projetos/confie-em-cristo/cenas';

export const Root: React.FC = () => (
  <>
    <Folder name="Demo">
      <Composition id="Demo-Vertical" component={Demo} durationInFrames={duracaoTotal(planoDemo)} fps={FPS} {...FORMATOS.vertical} />
      <Composition id="Demo-Horizontal" component={Demo} durationInFrames={duracaoTotal(planoDemo)} fps={FPS} {...FORMATOS.horizontal} />
    </Folder>
    <Folder name="ConfieEmCristo">
      <Composition id="ConfieEmCristo-Vertical" component={ConfieEmCristo} durationInFrames={duracaoTotal(planoConfie)} fps={FPS} {...FORMATOS.vertical} />
    </Folder>
    <Folder name="Testes">
      <Composition id="Teste-3D" component={Teste3D} durationInFrames={FPS * 4} fps={FPS} {...FORMATOS.horizontal} />
    </Folder>
  </>
);
