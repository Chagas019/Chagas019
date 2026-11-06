# Compõe a trilha instrumental + efeitos sonoros e mixa com a voz (duck automático).
import numpy as np, wave, sys
SR=48000; DUR=36.0; N=int(SR*DUR)
rng=np.random.default_rng(7)
def t_(d): return np.arange(int(SR*d))/SR
def add(buf,x,at,g=1.0):
    i=int(at*SR); x=x[:max(0,len(buf)-i)]; buf[i:i+len(x)]+=x*g
def lp(x,a):  # filtro passa-baixa de 1 polo (a: 0..1)
    y=np.empty_like(x); s=0.0
    for i in range(len(x)): s+=a*(x[i]-s); y[i]=s
    return y
def lp_fast(x,cut):
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/np.sqrt(1+(f/cut)**4); return np.fft.irfft(X,len(x))
def hp_fast(x,cut):
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/np.sqrt(1+(cut/np.maximum(f,1))**4); return np.fft.irfft(X,len(x))
def reverb(x,dur=2.2,mix=.3):
    ir=rng.standard_normal(int(SR*dur))*np.exp(-np.arange(int(SR*dur))/SR*3.2); ir=lp_fast(ir,6000); ir/=np.sqrt((ir**2).sum())
    n=len(x)+len(ir); L=1<<int(np.ceil(np.log2(n)))
    y=np.fft.irfft(np.fft.rfft(x,L)*np.fft.rfft(ir,L),L)[:len(x)]
    return x*(1-mix)+y*mix*3
def midi(m): return 440*2**((m-69)/12)
BPM=112; B=60/BPM; BAR=4*B
# D  A  Bm  G
CH=[[50,62,66,69,74],[45,61,64,69,73],[47,62,66,71,74],[43,62,67,71,74]]
music=np.zeros(N); drums=np.zeros(N)
nbars=int(DUR/BAR)+1
def env_adsr(d,a=.01,r=.2):
    t=t_(d); e=np.minimum(1,t/a)*np.exp(-np.maximum(0,t-a)/r); return e
# PAD (supersaw filtrado)
for b in range(nbars):
    t0=b*BAR; ch=CH[b%4]; d=BAR+.3; tt=t_(d)
    x=np.zeros(len(tt))
    for m in ch[1:]:
        for det in (-.11,-.04,0,.05,.12):
            f=midi(m+det); ph=rng.random()
            x+=2*((tt*f+ph)%1)-1
    e=np.minimum(1,tt/.35)*np.minimum(1,(d-tt)/.3)
    add(music,x*e*.012,t0)
music=lp_fast(music,2400)
# intro mais escuro: abre o filtro ao longo dos primeiros 7 s
open_=np.clip(np.arange(N)/SR/7.2,0.25,1)
music=music*open_+lp_fast(music,700)*(1-open_)
# PLUCK arpejo (colcheias) a partir do compasso 2
pl=np.zeros(N)
for b in range(1,nbars):
    ch=CH[b%4]; seq=[ch[1],ch[2],ch[3],ch[4],ch[3]+12,ch[4],ch[2],ch[3]]
    for k,m in enumerate(seq):
        tt=t_(.5); f=midi(m+12)
        x=np.sin(2*np.pi*f*tt)+.35*np.sin(4*np.pi*f*tt)+.12*np.sin(6*np.pi*f*tt)
        add(pl,x*env_adsr(.5,.003,.12)*.05,b*BAR+k*B/2)
# eco de colcheia pontuada
d=int(SR*B*.75); ech=pl.copy(); ech[d:]+=pl[:-d]*.35; ech[2*d:]+=pl[:-2*d]*.15
music+=ech
# BAIXO
bass=np.zeros(N)
for b in range(2,nbars):
    r=CH[b%4][0]-12
    for k in range(8):
        tt=t_(B/2); f=midi(r)
        x=np.sin(2*np.pi*f*tt)+.25*np.sin(4*np.pi*f*tt)
        add(bass,x*env_adsr(B/2,.005,.18)*.09*(1 if k%2==0 else .7),b*BAR+k*B/2)
music+=bass
# BATERIA
def kick():
    tt=t_(.35); f=45+80*np.exp(-tt*28); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*9)
def clap():
    tt=t_(.25); n=hp_fast(rng.standard_normal(len(tt)),1200); return n*np.exp(-tt*22)
def hat():
    tt=t_(.06); n=hp_fast(rng.standard_normal(len(tt)),7000); return n*np.exp(-tt*70)
start_k=4*BAR*0+3.25
for b in range(nbars):
    for k in range(4):
        t0=b*BAR+k*B
        if t0>=3.25 and t0<34.0: add(drums,kick(),t0,.30)
        if t0>=7.3 and t0<34.0 and k in(1,3): add(drums,clap(),t0,.06)
        for h in range(4):
            th=t0+h*B/4
            if th>=10.7 and th<34.0: add(drums,hat(),th,.035 if h%2 else .015)
# quebra antes do final (silencia bateria 28.2–29.0)
m=np.ones(N); i0,i1=int(28.2*SR),int(29.0*SR); m[i0:i1]=0; drums*=m
music+=drums
# acorde final sustentado
tt=t_(6.0); x=np.zeros(len(tt))
for mm in [50,57,62,66,69,74,78]:
    for det in (-.08,0,.08): x+=np.sin(2*np.pi*midi(mm+det)*tt)
add(music,x*np.exp(-tt*.55)*np.minimum(1,tt/.05)*.02,30.0)
music=reverb(music,2.0,.25)
# ---------- efeitos ----------
fx=np.zeros(N)
def whoosh(d=.45,up=True):
    tt=t_(d); n=rng.standard_normal(len(tt)); out=np.zeros(len(tt)); seg=256
    for s in range(0,len(tt),seg):
        k=s/len(tt); fc=(600+5000*k) if up else (5600-5000*k); x=n[s:s+seg]
        out[s:s+seg]=x
    out=hp_fast(lp_fast(out,3500),400); e=np.sin(np.pi*tt/d)**2; return out*e
def riser(d):
    tt=t_(d); n=hp_fast(rng.standard_normal(len(tt)),800)*(tt/d)**2
    s=np.sin(2*np.pi*np.cumsum(200+1800*(tt/d)**2)/SR)*(tt/d)**3*.3; return n*.5+s
def impact():
    tt=t_(2.5); f=38+60*np.exp(-tt*10); boom=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*2.2)
    n=lp_fast(rng.standard_normal(len(tt)),2500)*np.exp(-tt*6)*.5; return boom+n
def bell(f,d=1.4):
    tt=t_(d); x=np.sin(2*np.pi*f*tt)+.4*np.sin(2*np.pi*f*2.76*tt)+.2*np.sin(2*np.pi*f*5.4*tt); return x*np.exp(-tt*3.5)
def pop():
    tt=t_(.5); return hp_fast(rng.standard_normal(len(tt)),2500)*np.exp(-tt*14)
for w in [3.05,10.55,15.65,20.55,26.35]: add(fx,whoosh(),w-.22,.22)
add(fx,riser(2.0),5.3,.10); add(fx,impact(),7.28,.55)
add(fx,riser(1.6),27.4,.10); add(fx,impact(),28.98,.45)
for i,tb in enumerate([21.3,21.9,22.5,23.15,23.75]): add(fx,bell(midi(74+[0,2,4,7,9][i])),tb,.05)
for tb in [11.15,11.85,12.55,13.2]: add(fx,bell(midi(86),.6),tb,.025)
for k in range(14): add(fx,pop(),28.95+rng.random()*1.2,.05*rng.random())
add(fx,bell(midi(81),3.0),30.0,.05); add(fx,bell(midi(86),3.0),32.6,.04)
for tb in [1.55,8.0,16.0,18.0,29.6]: add(fx,bell(midi(93),.8),tb,.015)
fx=reverb(fx,1.6,.3)
# ---------- voz + duck ----------
w=wave.open(sys.argv[1]); v=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(np.float64)/32768
v=np.pad(v,(0,max(0,N-len(v))))[:N]
# leve brilho e compressão na voz
v=v+hp_fast(v,3500)*.25; v=np.tanh(v*1.6)/np.tanh(1.6)
envv=np.convolve(np.abs(v),np.ones(2400)/2400,'same'); duck=1-np.clip(envv/0.05,0,1)*.55
duck=np.convolve(duck,np.ones(4800)/4800,'same')
L=v*.9+music*duck*.85+fx*.9
fade=np.ones(N); fade[:int(.8*SR)]=np.linspace(0,1,int(.8*SR)); fade[-int(1.2*SR):]=np.linspace(1,0,int(1.2*SR)); L*=fade
L=L/np.max(np.abs(L))*.89
vo=reverb(v,.9,.08)
out=(np.clip(L,-1,1)*32767).astype(np.int16)
st=np.stack([out,out],1)
wo=wave.open(sys.argv[2],'w'); wo.setnchannels(2); wo.setsampwidth(2); wo.setframerate(SR); wo.writeframes(st.tobytes()); wo.close()
print('ok')
