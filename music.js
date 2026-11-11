(() => {
 'use strict';
 const $=id=>document.getElementById(id),media=$('radioAudio');
 const stations={radio2:{name:'NPO Radio 2',url:'https://icecast.omroep.nl/radio2-bb-mp3',cors:true},'3fm':{name:'NPO 3FM',url:'https://icecast.omroep.nl/3fm-bb-mp3',cors:true},radio5:{name:'NPO Radio 5',url:'https://icecast.omroep.nl/radio5-bb-mp3',cors:true},groovesalad:{name:'SomaFM · Groove Salad',url:'https://ice2.somafm.com/groovesalad-128-mp3',cors:true},paradise:{name:'Radio Paradise',url:'https://stream.radioparadise.com/aac-320',cors:false}};
 let generation=0,radioContext=null,radioSource=null,radioAnalyser=null,currentCors=false,currentName='',visualizing=false;
 const setStatus=text=>$('radioStatus').textContent=text;
 // Default to a stream with CORS support for direct audio visualisation.
 $('radioStation').value='radio2';
 function stop(){generation++;media.pause();media.removeAttribute('src');media.load();window.LuxeSound.stopRadio();visualizing=false;setStatus('Radio uit');}
 function station(){
  if($('radioStation').value!=='custom')return stations[$('radioStation').value];
  let url;try{url=new URL($('radioUrl').value)}catch{throw Error('Voer een geldige HTTPS-stream in.');}
  if(url.protocol!=='https:'||url.username||url.password)throw Error('Gebruik een HTTPS-stream zonder inloggegevens.');
  return {name:'Eigen radio',url:url.href,cors:true};
 }
 function resetMediaSourcePolicy(cors){
  // A media element that has been connected to Web Audio always needs CORS.
  // Use a fresh element to keep ordinary non-CORS streams audible.
  let element=$('radioAudio');
  if(radioSource && !cors){radioContext?.close().catch(()=>{});radioContext=radioSource=radioAnalyser=null;const fresh=document.createElement('audio');fresh.id='radioAudio';fresh.preload='none';element.replaceWith(fresh);element=fresh;bindMedia(element);}
  if(cors)element.crossOrigin='anonymous';else element.removeAttribute('crossorigin');
  return element;
 }
 async function play(){
  // Stop the old element before switching or changing its cross-origin mode.
  const old=$('radioAudio');old.pause();window.LuxeSound.stopRadio();visualizing=false;
  const request=++generation;
  try{
   const s=station(),element=resetMediaSourcePolicy(s.cors);currentCors=s.cors;currentName=s.name;
   element.src=s.url;element.volume=Number($('radioVolume').value)/100;setStatus('Verbinden met '+s.name+'…');
   await element.play();if(request!==generation){element.pause();return;}
   setStatus('Speelt · '+s.name);
  }catch(e){if(request===generation)setStatus(e.message.startsWith('Gebruik')||e.message.startsWith('Voer')?e.message:'Kan deze zender niet afspelen. Probeer een andere stream of controleer je verbinding.');}
 }
 function stopCurrent(){generation++;const element=$('radioAudio');element.pause();element.removeAttribute('src');element.load();window.LuxeSound.stopRadio();visualizing=false;setStatus('Radio uit');}
 function bindMedia(element){
  element.addEventListener('error',()=>{window.LuxeSound.stopRadio();visualizing=false;setStatus('Stream niet beschikbaar. Een eigen stream moet HTTPS en voor effecten ook CORS ondersteunen.');});
  element.addEventListener('waiting',()=>{if(element.currentSrc)setStatus('Radio buffert…');});
  element.addEventListener('playing',()=>setStatus('Speelt · '+currentName));
  element.addEventListener('pause',()=>{window.LuxeSound.stopRadio();visualizing=false;});
  element.addEventListener('ended',()=>{window.LuxeSound.stopRadio();visualizing=false;setStatus('Radio gestopt');});
 }
 bindMedia(media);
 $('radioPlay').addEventListener('click',play);$('radioStop').addEventListener('click',stopCurrent);
 $('radioVolume').addEventListener('input',()=>{$('radioAudio').volume=Number($('radioVolume').value)/100;$('radioVolumeValue').textContent=$('radioVolume').value+'%';});
 $('radioVisualize').addEventListener('click',async()=>{
  const element=$('radioAudio');if(element.paused){setStatus('Start eerst de radio.');return;}
  if(!currentCors){setStatus('Deze zender staat directe analyse niet toe. Kies NPO Radio 2 of schakel de microfoon in bij Effecten.');return;}
  if(document.body.dataset.soundMode==='radio'){window.LuxeSound.stopRadio();visualizing=false;setStatus('Speelt · '+currentName+' · effecten uit');return;}
  try{
   const Audio=window.AudioContext||window.webkitAudioContext;
   if(!radioContext){radioContext=new Audio();radioSource=radioContext.createMediaElementSource(element);radioAnalyser=radioContext.createAnalyser();radioAnalyser.fftSize=2048;radioAnalyser.smoothingTimeConstant=.78;radioSource.connect(radioAnalyser);radioAnalyser.connect(radioContext.destination);}
   await radioContext.resume();if(element.paused)return;
   window.LuxeSound.connectRadio(radioAnalyser,radioContext.sampleRate);visualizing=true;setStatus('Speelt · '+currentName+' · directe geluidseffecten aan');
  }catch{setStatus('Directe effecten niet beschikbaar. Gebruik de microfoon bij Effecten.');}
 });
 function spotifyUrl(value){
  let u;try{u=new URL(value.trim())}catch{throw Error('Plak een volledige Spotify-link.');}
  if(u.protocol!=='https:'||u.hostname!=='open.spotify.com'||u.username||u.password)throw Error('Gebruik een link van open.spotify.com.');
  const match=u.pathname.match(/^\/(?:intl-[a-z]{2}\/)?(?:embed\/)?(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]{22})\/?$/);
  if(!match)throw Error('Deze Spotify-link wordt niet herkend. Kies een nummer, album of playlist.');
  return `https://open.spotify.com/embed/${match[1]}/${match[2]}`;
 }
 $('spotifyLoad').addEventListener('click',()=>{
  try{
   const src=spotifyUrl($('spotifyInput').value);stopCurrent();const iframe=document.createElement('iframe');iframe.title='Spotify-speler';iframe.src=src;iframe.allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';iframe.allowFullscreen=true;
   $('spotifyPlayer').replaceChildren(iframe);$('spotifyStatus').textContent='Speel af in de Spotify-speler. Effecten kunnen via de microfoon reageren. Sluit de speler hier om Spotify te stoppen.';
  }catch(e){$('spotifyStatus').textContent=e.message;}
 });
 $('spotifyClear').addEventListener('click',()=>{$('spotifyPlayer').replaceChildren();$('spotifyInput').value='';$('spotifyStatus').textContent='Spotify-speler gesloten.';});
 $('radioPlay').addEventListener('click',()=>{$('spotifyPlayer').replaceChildren();});
 window.addEventListener('pagehide',()=>{stopCurrent();radioContext?.close().catch(()=>{});});
})();
