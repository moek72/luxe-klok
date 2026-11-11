(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('soundCanvas'), ctx = canvas.getContext('2d');
  const root = document.documentElement;
  const toggle = $('btnSound'), demoButton = $('btnDemo'), status = $('soundStatus');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const defaults = {effect:'bars', mood:'party', color:'rainbow', sensitivity:150, intensity:100, effectColor:'#a879ff', night:false};
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('lk_sound_v2')) || {}; } catch { /* defaults */ }
  const prefs = {...defaults};
  for (const [key, values] of Object.entries({effect:['bars','waves','ring','aura'], mood:['calm','lounge','party'], color:['rainbow','aurora','fire','gold','ocean','custom']})) {
    if (values.includes(saved[key])) prefs[key] = saved[key];
  }
  for (const [key, min, max] of [['sensitivity',25,400],['intensity',10,200]]) {
    if (Number.isFinite(saved[key])) prefs[key] = Math.max(min, Math.min(max, saved[key]));
  }
  prefs.night = saved.night === true;
  if (/^#[0-9a-f]{6}$/i.test(saved.effectColor)) prefs.effectColor=saved.effectColor;
  let mode = 'off', generation = 0, audio = null, stream = null, analyser = null, source = null;
  let bins, waveform, raf = 0, width = 0, height = 0, lastTime = 0, energy = 0, bass = 0, colorShift = 0;
  let bands = new Float32Array(56);
  let clockBounds; let analysisRate=48000;
  function persist() { try { localStorage.setItem('lk_sound_v2', JSON.stringify(prefs)); } catch { /* optional */ } }
  function setStatus(message) { status.textContent = message; }
  function updateControls() {
    document.querySelectorAll('[data-effect]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.effect === prefs.effect)));
    $('effectColor').value=prefs.effectColor;
    $('soundMood').value = prefs.mood; $('soundColor').value = prefs.color;
    $('sensitivity').value = prefs.sensitivity; $('intensity').value = prefs.intensity;
    $('sensitivityValue').textContent = `${prefs.sensitivity}%`; $('intensityValue').textContent = `${prefs.intensity}%`;
    $('nightMode').checked = prefs.night; document.body.classList.toggle('night', prefs.night);
    toggle.setAttribute('aria-pressed', String(mode === 'mic'));
    toggle.textContent = mode === 'mic' ? 'Microfoon uitzetten' : mode === 'pending' ? 'Aanvraag annuleren' : 'Microfoon inschakelen';
    $('sceneCaption').textContent = mode === 'demo' ? 'Voorbeeld · microfoon uit' : '';
    document.body.dataset.soundMode=mode;
    demoButton.setAttribute('aria-pressed', String(mode === 'demo'));
    demoButton.textContent = mode === 'demo' ? 'Demo stoppen' : 'Demo bekijken';
  }
  function measure() {
    width = canvas.clientWidth; height = canvas.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    clockBounds = document.querySelector('.time-block').getBoundingClientRect();
  }
  function stop(message = 'Microfoon uit · kies een effect en zet geluid aan') {
    generation++;
    cancelAnimationFrame(raf); raf = 0;
    stream?.getTracks().forEach(t => t.stop()); stream = null;
    source?.disconnect(); source = null;
    if (audio) { audio.close().catch(() => {}); audio = null; }
    analyser = null; mode = 'off'; energy = bass = 0; bands.fill(0);
    ctx.clearRect(0,0,width,height);
    root.style.removeProperty('--sound-hue');
    updateControls(); setStatus(message);
  }
  async function startMic() {
    if (mode === 'mic' || mode === 'pending') { stop(); return; }
    stop();
    if (!isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus('Microfoon vereist HTTPS of localhost. Je kunt wel de demo bekijken.'); return;
    }
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) { setStatus('Deze browser ondersteunt geen geluidsanalyse. Probeer Chrome of de demo.'); return; }
    const request = generation; mode = 'pending'; updateControls();
    setStatus('Geef microfoontoegang in je browser · je kunt de aanvraag annuleren');
    let localAudio, localStream;
    try {
      // Resume in the click gesture, including on mobile Safari.
      localAudio = new Audio(); audio = localAudio;
      await localAudio.resume();
      if (request !== generation) return;
      localStream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false, noiseSuppression:false, autoGainControl:false}, video:false});
      if (request !== generation || document.hidden) { localStream.getTracks().forEach(t => t.stop()); return; }
      stream = localStream;
      analyser = localAudio.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = .78;
      source = localAudio.createMediaStreamSource(stream); source.connect(analyser);
      // No destination connection: microphone audio is neither played nor recorded.
      bins = new Uint8Array(analyser.frequencyBinCount); waveform = new Uint8Array(analyser.fftSize);
      stream.getTracks().forEach(t => t.addEventListener('ended', () => { if (request === generation) stop('Microfoon gestopt · tik om opnieuw te verbinden'); }));
      localAudio.addEventListener('statechange', () => {
        if (request === generation && mode === 'mic' && localAudio.state !== 'running') stop('Geluidsanalyse onderbroken · tik om opnieuw te starten');
      });
      analysisRate=localAudio.sampleRate; mode = 'mic'; updateControls(); setStatus('Microfoon aan · reageert op geluid om je heen'); begin();
    } catch (e) {
      localStream?.getTracks().forEach(t => t.stop());
      if (request !== generation) return;
      stop(e.name === 'NotAllowedError' ? 'Microfoon geweigerd · sta toegang toe in je browser of bekijk de demo' : e.name === 'NotFoundError' ? 'Geen microfoon gevonden · bekijk de demo' : 'Microfoon niet beschikbaar · probeer opnieuw of bekijk de demo');
    }
  }
  function startDemo() {
    const wasDemo = mode === 'demo'; stop(); if (wasDemo) return;
    mode = 'demo'; updateControls(); setStatus('DEMO · voorbeeldbeweging, microfoon uit'); begin();
  }
  function begin() { measure(); lastTime = 0; raf = requestAnimationFrame(draw); }
  function sample(t) {
    const gain = prefs.sensitivity / 100;
    if (mode === 'mic' || mode === 'radio') {
      analyser.getByteFrequencyData(bins); analyser.getByteTimeDomainData(waveform);
      let squares = 0;
      for (const v of waveform) squares += ((v - 128) / 128) ** 2;
      const target = Math.min(1, Math.max(0, Math.sqrt(squares / waveform.length) - .004) * 9 * gain);
      energy += (target - energy) * (target > energy ? .4 : .12);
      const step = analysisRate / analyser.fftSize;
      for (let i = 0; i < bands.length; i++) {
        const low = Math.floor(45 * (14000/45) ** (i / bands.length) / step);
        const high = Math.max(low + 1, Math.ceil(45 * (14000/45) ** ((i+1) / bands.length) / step));
        let sum = 0, count = 0;
        for (let j = low; j < Math.min(high,bins.length); j++) { sum += bins[j]; count++; }
        const v = Math.min(1, Math.max(0,(count ? sum / count / 255 : 0)-.05) * gain * 1.35);
        bands[i] += (v - bands[i]) * .35;
      }
      bass += ((bands[0]+bands[1]+bands[2]+bands[3])/4 - bass) * .25;
    } else {
      energy = .22 + .23 * (.5 + .5 * Math.sin(t*3)); bass = .3 + .25 * Math.sin(t*3);
      for (let i=0;i<bands.length;i++) bands[i] = (.1+.75*(.5+.5*Math.sin(i*.43+t*(1+i*.02)))**2)*(.55+.45*Math.sin(t*2)**2);
    }
  }
  function draw(ms) {
    if (!['mic','demo','radio'].includes(mode)) return;
    raf = requestAnimationFrame(draw);
    const interval = reduced.matches ? 1000/12 : 1000/30;
    if (ms - lastTime < interval) return;
    const dt = Math.min(.1, (ms-lastTime)/1000 || .033); lastTime=ms;
    const t = ms/1000;
    sample(t);
    const mood = {calm:.55,lounge:.85,party:1.2}[prefs.mood];
    const strength = prefs.intensity/100 * mood * (prefs.night ? .5 : 1) * (reduced.matches ? .35 : 1);
    colorShift += energy * dt * (prefs.mood === 'party' ? 26 : 8);
    const hue = prefs.color === 'rainbow' ? colorShift % 360 : {aurora:145,fire:16,gold:42,ocean:192,custom:0}[prefs.color];
    ctx.clearRect(0,0,width,height);
    function paint(h,a) {
      if(prefs.color==='custom') { const c=prefs.effectColor; return `rgba(${parseInt(c.slice(1,3),16)},${parseInt(c.slice(3,5),16)},${parseInt(c.slice(5,7),16)},${Math.min(1,a)})`; }
      let shift=h-hue;
      const base=prefs.color==='rainbow'?h:prefs.color==='aurora'?145+shift*.28:prefs.color==='fire'?12+shift*.08:prefs.color==='ocean'?175+shift*.16:42+shift*.025;
      return `hsla(${base},95%,64%,${Math.min(1,a)})`;
    }
    ctx.lineCap='round'; ctx.lineJoin='round';
    const cx = clockBounds.left+clockBounds.width/2, cy = clockBounds.top+clockBounds.height/2;
    // A quiet wash follows the signal without changing the readable time digits.
    const glow = ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(width,height)*.65);
    glow.addColorStop(0,paint(hue,.14*energy*strength)); glow.addColorStop(1,paint(hue,0));
    ctx.fillStyle=glow; ctx.fillRect(0,0,width,height);
    const motion = reduced.matches ? .12 : 1;
    if (prefs.effect === 'bars') {
      const base=height-4, available=height*.62, count=bands.length, bw=width/count;
      for(let i=0;i<count;i++) {
        const h=Math.min(height*.8,Math.max(3,bands[i]*available*strength));
        const g=ctx.createLinearGradient(0,base,0,base-h);
        g.addColorStop(0,paint(hue+i/count*310,.4));g.addColorStop(.65,paint(hue+i/count*310+25,.85));g.addColorStop(1,paint(hue+i/count*310+50,1));
        ctx.fillStyle=g;ctx.shadowColor=paint(hue+i/count*310,.9);ctx.shadowBlur=12*strength;
        ctx.fillRect(i*bw+2,base-h,Math.max(2,bw-4),h);ctx.shadowBlur=0;
        ctx.fillStyle=paint(hue+i/count*310+60,.9);ctx.fillRect(i*bw+2,base-h-6,Math.max(2,bw-4),2);
      }
    } else if(prefs.effect==='waves') {
      const base=height*.72;
      for(let layer=0;layer<6;layer++) {
        const g=ctx.createLinearGradient(0,0,width,0);
        for(let stop=0;stop<=6;stop++)g.addColorStop(stop/6,paint(hue+stop*52+layer*10,.85-layer*.065));
        ctx.beginPath();
        for(let x=0;x<=width;x+=3) {
          const bin=bands[Math.min(bands.length-1,Math.floor(x/width*bands.length))];
          const envelope=Math.sin(x/width*Math.PI);
          const amp=(energy*height*.19+bin*height*.22)*strength*envelope;
          const y=base+Math.sin(x/width*Math.PI*(2.5+layer*.32)+t*(1.3+layer*.12)*motion-layer*.7)*amp+layer*11;
          if(!x)ctx.moveTo(x,y);else ctx.lineTo(x,y);
        }
        ctx.strokeStyle=g;ctx.lineWidth=2.5+layer*.25;ctx.shadowColor=paint(hue+layer*55,.7);ctx.shadowBlur=18;ctx.stroke();ctx.shadowBlur=0;
      }
    } else if(prefs.effect==='ring') {
      const rx=Math.min(width*.39,clockBounds.width*.58+25),ry=Math.min(height*.27,Math.max(clockBounds.height*1.2,95));
      for(let layer=0;layer<4;layer++) {
        for(let i=0;i<180;i++) {
          const angle=i/180*Math.PI*2, next=(i+1)/180*Math.PI*2;
          const bin=bands[Math.floor(i/180*bands.length)], bump=(bin*44+energy*22)*strength;
          const nx=bands[Math.min(bands.length-1,Math.floor((i+1)/180*bands.length))];
          ctx.beginPath();ctx.moveTo(cx+Math.cos(angle)*(rx+layer*9+bump),cy+Math.sin(angle)*(ry+layer*9+bump));
          ctx.lineTo(cx+Math.cos(next)*(rx+layer*9+(nx*44+energy*22)*strength),cy+Math.sin(next)*(ry+layer*9+(nx*44+energy*22)*strength));
          ctx.strokeStyle=paint(hue+i*2+layer*20,(.9-layer*.15)*Math.min(1,strength));ctx.lineWidth=layer?2:3;
          ctx.shadowColor=paint(hue+i*2,.8);ctx.shadowBlur=layer===0?14:0;ctx.stroke();
        }
      }
      ctx.shadowBlur=0;
    } else {
      for(let i=0;i<7;i++) {
        const angle=i/7*Math.PI*2+t*.12*motion;
        const x=width/2+Math.cos(angle)*width*.48,y=height/2+Math.sin(angle)*height*.48;
        const radius=Math.min(width,height)*(.44+energy*.22)*Math.min(1.8,strength);
        const g=ctx.createRadialGradient(x,y,0,x,y,Math.max(1,radius));
        g.addColorStop(0,paint(hue+i*51,(.2+energy*.65+bass*.15)*Math.min(1.5,strength)));g.addColorStop(.55,paint(hue+i*51,.12*energy));g.addColorStop(1,paint(hue,0));
        ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
      }
    }
  }

  document.querySelectorAll('[data-effect]').forEach(b=>b.addEventListener('click',()=>{ prefs.effect=b.dataset.effect; persist(); updateControls(); }));
  toggle.addEventListener('click',startMic); demoButton.addEventListener('click',startDemo);
  for (const [id,key] of [['soundMood','mood'],['soundColor','color'],['sensitivity','sensitivity'],['intensity','intensity'],['nightMode','night'],['effectColor','effectColor']]) {
    $(id).addEventListener('input',()=>{
      prefs[key] = key === 'night' ? $(id).checked : ['sensitivity','intensity'].includes(key) ? Number($(id).value) : $(id).value;
      if(key==='effectColor')prefs.color='custom';
      persist(); updateControls();
    });
  }
  document.addEventListener('visibilitychange',()=>{ if(document.hidden && mode !== 'off') stop('Gepauzeerd · tik op geluid of demo om verder te gaan'); });
  window.addEventListener('pagehide',()=>stop());
  new ResizeObserver(measure).observe(document.querySelector('.time-block'));
  window.addEventListener('resize',measure);
  window.LuxeSound={
    connectRadio(externalAnalyser,rate) {
      stop();analyser=externalAnalyser;analysisRate=rate;bins=new Uint8Array(analyser.frequencyBinCount);waveform=new Uint8Array(analyser.fftSize);
      mode='radio';updateControls();setStatus('Effecten reageren rechtstreeks op radio · microfoon uit');begin();
    },
    stopRadio(){if(mode==='radio')stop();},
    getPreferences(){return {...prefs};},
    importPreferences(values){
      for(const key of ['effect','mood','color','sensitivity','intensity','night','effectColor']) if(values[key]!==undefined)saved[key]=values[key];
      try{localStorage.setItem('lk_sound_v2',JSON.stringify(saved));}catch{}
    }
  };
  updateControls(); measure();
})();
