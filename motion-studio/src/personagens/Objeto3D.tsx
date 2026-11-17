// Objeto 3D (React Three Fiber via @remotion/three). Dono: agente PERSONAGENS.
import React from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useCurrentFrame, useVideoConfig} from 'remotion';

export const Objeto3D: React.FC<{cor: string; corEmissiva: string; tamanho: number}> = ({cor, corEmissiva, tamanho}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  return (
    <ThreeCanvas width={tamanho} height={tamanho} camera={{position: [0, 0, 5], fov: 40}}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} />
      <pointLight position={[-4, -2, 2]} intensity={30} color={corEmissiva} />
      <mesh rotation={[t * 0.6, t * 0.9, 0]} position={[0, Math.sin(t * 2) * 0.12, 0]}>
        <icosahedronGeometry args={[1.25, 0]} />
        <meshStandardMaterial color={cor} roughness={0.25} metalness={0.6} flatShading />
      </mesh>
    </ThreeCanvas>
  );
};
