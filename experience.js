(() => {
 'use strict';
 const $=id=>document.getElementById(id),root=document.documentElement;
 const defaults={font:'outfit',size:100,color:'#f7f0e8',rainbow:false,background:'#07070d',date:true,weather:true};
 const fonts={outfit:'Outfit',orbitron:'Orbitron',serif:'Cormorant',mono:'ShareMono'};
 const get=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
 function validateClock(value){
  const v={...defaults};if(!value||typeof value!=='object')return v;
  if(Object.hasOwn(fonts,value.font))v.font=value.font;
  if(Number.isFinite(value.size))v.size=Math.min(120,Math.max(65,value.size));
  for(const k of ['color','background'])if(/^#[0-9a-f]{6}$/i.test(value[k]))v[k]=value[k];
  for(const k of ['rainbow','date','weather'])if(typeof value[k]==='boolean')v[k]=value[k];return v;
 }
 let prefs=validateClock(get('lk_clock_v2',defaults)),installPrompt=null;
 function apply(){
  root.style.setProperty('--clock-font',fonts[prefs.font]);root.style.setProperty('--clock-size',prefs.size/100);
  root.style.setProperty('--clock-color',prefs.color);root.style.setProperty('--scene-bg',prefs.background);
  document.querySelector('meta[name=theme-color]').content=prefs.background;
  document.body.classList.toggle('clock-rainbow',prefs.rainbow);document.body.classList.toggle('hide-date',!prefs.date);document.body.classList.toggle('hide-weather',!prefs.weather);
  $('clockFont').value=prefs.font;$('clockSize').value=prefs.size;$('clockSizeValue').textContent=prefs.size+'%';
  $('clockColor').value=prefs.color;$('backgroundColor').value=prefs.background;$('clockRainbow').checked=prefs.rainbow;$('showDate').checked=prefs.date;$('showWeather').checked=prefs.weather;
  try{localStorage.setItem('lk_clock_v2',JSON.stringify(prefs))}catch{}
  requestAnimationFrame(fitClock);
 }
 function fitClock(){
  const node=document.querySelector('.time-block'),time=$('time'),seconds=$('seconds');
  const width=time.scrollWidth+(getComputedStyle(seconds).display==='none'?0:seconds.scrollWidth)+parseFloat(getComputedStyle(node).gap);
  node.style.transform=`scale(${Math.min(1,(innerWidth-32)/Math.max(1,width))})`;
 }
 for(const [id,key] of [['clockFont','font'],['clockSize','size'],['clockColor','color'],['clockRainbow','rainbow'],['backgroundColor','background'],['showDate','date'],['showWeather','weather']]){
  $(id).addEventListener('input',()=>{prefs[key]=['rainbow','date','weather'].includes(key)?$(id).checked:key==='size'?Number($(id).value):$(id).value;if(key==='color')prefs.rainbow=false;apply()});
 }
 const tabs=[...document.querySelectorAll('[role=tab]')];
 function selectTab(tab){tabs.forEach(t=>{const chosen=t===tab;t.setAttribute('aria-selected',String(chosen));t.tabIndex=chosen?0:-1;$(t.getAttribute('aria-controls')).hidden=!chosen});}
 tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>selectTab(tab));tab.addEventListener('keydown',e=>{let n=i;if(e.key==='ArrowRight')n=(i+1)%tabs.length;else if(e.key==='ArrowLeft')n=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')n=0;else if(e.key==='End')n=tabs.length-1;else return;e.preventDefault();selectTab(tabs[n]);tabs[n].focus()})});
 const canonical=new URL('./',location.href).href;$('shareUrl').value=canonical;
 $('copyLink').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(canonical);$('shareStatus').textContent='Link gekopieerd · plak hem in WhatsApp of een bericht.'}catch{$('shareUrl').focus();$('shareUrl').select();$('shareStatus').textContent='Selecteer en kopieer de link hierboven.'}});
 $('shareApp').addEventListener('click',async()=>{if(navigator.share){try{await navigator.share({title:'Luxe Klok',text:'Mijn luxe klok met geluidseffecten, radio en Spotify',url:canonical});$('shareStatus').textContent='Deelvenster geopend.'}catch(e){if(e.name!=='AbortError')$('copyLink').click()}}else $('copyLink').click()});
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installStatus').textContent='Je kunt Luxe Klok nu als app installeren.'});
 window.addEventListener('appinstalled',()=>{installPrompt=null;$('installStatus').textContent='Luxe Klok is geïnstalleerd.'});
 $('installApp').addEventListener('click',async()=>{
  if(matchMedia('(display-mode: standalone)').matches||navigator.standalone){$('installStatus').textContent='Deze klok is al als app geopend.';return;}
  if(installPrompt){const p=installPrompt;installPrompt=null;await p.prompt();const result=await p.userChoice;$('installStatus').textContent=result.outcome==='accepted'?'Installatie aangevraagd.':'Installatie overgeslagen. Je kunt later opnieuw installeren.';return;}
  $('installStatus').textContent=/iPhone|iPad|iPod/.test(navigator.userAgent)?'Safari: tik op Deel → Zet op beginscherm.':'Chrome: open het menu ⋮ → App installeren of Toevoegen aan startscherm. Open daarna de klok vanaf je beginscherm.';
 });
 $('exportSettings').addEventListener('click',()=>{
  const data={version:2,clock:prefs,sound:window.LuxeSound.getPreferences(),basics:{showSeconds:$('showSeconds').checked,use24h:$('use24h').checked,keepAwake:$('keepAwake').checked}};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='mijn-luxe-klok.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('settingsStatus').textContent='Je instellingen zijn geëxporteerd.';
 });
 $('importSettings').addEventListener('click',()=>$('settingsFile').click());
 $('settingsFile').addEventListener('change',async()=>{
  try{
   const file=$('settingsFile').files[0];if(!file)return;if(file.size>20000)throw Error('size');
   const data=JSON.parse(await file.text());if(data.version!==2||!data.clock||!data.sound)throw Error('format');
   const sound=data.sound,clean={};
   const options={effect:['bars','waves','ring','aura'],mood:['calm','lounge','party'],color:['rainbow','aurora','fire','gold','ocean','custom']};
   for(const k of Object.keys(options))if(options[k].includes(sound[k]))clean[k]=sound[k];
   for(const [k,min,max] of [['sensitivity',25,400],['intensity',10,200]])if(Number.isFinite(sound[k]))clean[k]=Math.max(min,Math.min(max,sound[k]));
   if(typeof sound.night==='boolean')clean.night=sound.night;if(/^#[0-9a-f]{6}$/i.test(sound.effectColor))clean.effectColor=sound.effectColor;
   localStorage.setItem('lk_clock_v2',JSON.stringify(validateClock(data.clock)));localStorage.setItem('lk_sound_v2',JSON.stringify(clean));
   for(const k of ['showSeconds','use24h','keepAwake'])if(typeof data.basics?.[k]==='boolean')localStorage.setItem('lk_'+k,JSON.stringify(data.basics[k]));
   location.reload();
  }catch{$('settingsStatus').textContent='Dit is geen geldig Luxe Klok-instellingenbestand.';}
 });
 new ResizeObserver(fitClock).observe($('time'));window.addEventListener('resize',fitClock);document.fonts?.ready.then(fitClock);
 apply();
})();
