// Mockup de celular. Dono: agente PEÇAS.
import React from 'react';

export const Celular: React.FC<{altura: number; children?: React.ReactNode; fundoTela?: string}> = ({altura, children, fundoTela = '#0E0C22'}) => {
  const largura = altura * 0.49;
  const borda = altura * 0.018;
  const raio = altura * 0.075;
  return (
    <div
      style={{
        width: largura,
        height: altura,
        borderRadius: raio,
        padding: borda,
        background: 'linear-gradient(145deg, #3A3A4A 0%, #121218 60%, #2A2A36 100%)',
        boxShadow: `0 ${altura * 0.05}px ${altura * 0.12}px rgba(0,0,0,0.55), inset 0 0 0 2px rgba(255,255,255,0.08)`,
      }}
    >
      <div style={{position: 'relative', width: '100%', height: '100%', borderRadius: raio - borda, background: fundoTela, overflow: 'hidden'}}>
        <div
          style={{
            position: 'absolute',
            top: altura * 0.016,
            left: '50%',
            transform: 'translateX(-50%)',
            width: largura * 0.3,
            height: altura * 0.032,
            borderRadius: 999,
            background: '#000',
            zIndex: 10,
          }}
        />
        {children}
      </div>
    </div>
  );
};
