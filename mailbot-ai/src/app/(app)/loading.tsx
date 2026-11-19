export default function Loading() {
  return (
    <div className="page" aria-busy="true" aria-label="Carregando">
      <div className="topbar"><div className="skel" style={{ width: 140, height: 22 }} /></div>
      <div className="skel" style={{ height: 180, borderRadius: 28 }} />
      <div className="grid grid-4" style={{ marginTop: 12 }}>
        {[0, 1, 2, 3].map((i) => <div key={i} className="skel" style={{ height: 78, borderRadius: 18 }} />)}
      </div>
      <div className="stack" style={{ marginTop: 26 }}>
        {[0, 1, 2].map((i) => <div key={i} className="skel" style={{ height: 112, borderRadius: 20 }} />)}
      </div>
    </div>
  );
}
