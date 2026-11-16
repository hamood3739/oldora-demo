/* OLDORA sound controls. Short two-tone chime prototype; replace with approved recording when hosted. */
(()=>{'use strict';
const key='oldora_sound_settings';
function settings(){try{return {...{messages:true,listings:true},...JSON.parse(localStorage.getItem(key)||'{}')}}catch{return {messages:true,listings:true}}}
function save(next){localStorage.setItem(key,JSON.stringify(next));}
let audio;
function play(kind){if(!settings()[kind])return;try{
 const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
 audio=audio||new C();if(audio.state==='suspended')audio.resume().catch(()=>{});
 const now=audio.currentTime;
 [[880,0,.095],[1174.66,.105,.17]].forEach(([hz,delay,duration])=>{
  const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=hz;
  gain.gain.setValueAtTime(0,now+delay);gain.gain.linearRampToValueAtTime(.09,now+delay+.012);
  gain.gain.exponentialRampToValueAtTime(.001,now+delay+duration);
  osc.connect(gain).connect(audio.destination);osc.start(now+delay);osc.stop(now+delay+duration+.02);
 });
 }catch(e){console.warn('Sound unavailable',e)}}
function render(){const root=document.getElementById('oldoraSoundSettings');if(!root)return;const ar=document.documentElement.lang==='ar',s=settings();
 root.querySelector('h2').textContent=ar?'الأصوات':'Sounds';
 for(const kind of ['messages','listings']){const input=root.querySelector('[data-sound="'+kind+'"]');input.checked=!!s[kind];root.querySelector('[data-label="'+kind+'"]').textContent=kind==='messages'?(ar?'أصوات الرسائل':'Message sounds'):(ar?'أصوات الإعلانات':'Listing sounds');}
 root.querySelector('#oldoraSoundTest').textContent=ar?'استمع للنغمة':'Test sound';
}
function init(){const mount=document.getElementById('oldoraSoundMount');if(!mount)return;
 const section=document.createElement('section');section.id='oldoraSoundSettings';section.innerHTML='<h2></h2><label><input type="checkbox" data-sound="messages"><span data-label="messages"></span></label><label><input type="checkbox" data-sound="listings"><span data-label="listings"></span></label><button type="button" id="oldoraSoundTest"></button>';
 mount.append(section);section.querySelectorAll('input').forEach(el=>el.addEventListener('change',()=>{save({...settings(),[el.dataset.sound]:el.checked});render()}));
 section.querySelector('#oldoraSoundTest').addEventListener('click',()=>{const before=settings();if(!before.messages){save({...before,messages:true});play('messages');save(before)}else play('messages')});
 render();new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
}
window.OLDORASound={play,settings};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();