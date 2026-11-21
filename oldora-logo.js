/* Approved bilingual OLDORA logo artwork; original files remain unchanged. */
(()=>{'use strict';
const files={en:'assets/IMG_1991.png',ar:'assets/819971CF-FDB0-4A94-86FA-7DC50DC8A9CD.png'};
function init(){
 const style=document.createElement('style');
 style.textContent='.oldora-official-logo{display:block;width:clamp(72px,17vw,130px);height:auto;aspect-ratio:1/1;object-fit:cover;object-position:center center;border-radius:50%;clip-path:circle(47% at 50% 50%);background:transparent}.oldora-official-logo.large{width:clamp(130px,35vw,210px);height:clamp(130px,35vw,210px);margin:0 auto 12px}.oldora-logo-link{display:inline-flex;align-items:center;text-decoration:none}.oldora-logo-heading{display:none!important}header .oldora-official-logo{width:clamp(62px,12vw,96px);height:clamp(62px,12vw,96px)}';
 document.head.append(style);
 let target=null,large=false;
 if(document.querySelector('body>.logo')&&document.querySelector('body>h1')){target=document.querySelector('body>.logo');large=true;document.querySelector('body>h1').classList.add('oldora-logo-heading')}
 else if(document.querySelector('header .hourglass')){target=document.querySelector('header .hourglass');large=true;const h=document.querySelector('header h1');if(h)h.classList.add('oldora-logo-heading')}
 else {target=document.querySelector('header a.logo')||document.querySelector('header a[href="./"]');}
 if(!target)return;
 const isLink=target.tagName==='A';
 target.textContent='';
 if(isLink)target.classList.add('oldora-logo-link');
 const ns='http://www.w3.org/2000/svg';
 const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 710 710');svg.setAttribute('role','img');svg.setAttribute('aria-label','OLDORA logo');svg.classList.add('oldora-official-logo');if(large)svg.classList.add('large');svg.style.overflow='visible';
 const defs=document.createElementNS(ns,'defs'),clip=document.createElementNS(ns,'clipPath'),circle=document.createElementNS(ns,'circle');
 const clipId='oldora-emblem-clip';clip.setAttribute('id',clipId);circle.setAttribute('cx','355');circle.setAttribute('cy','355');circle.setAttribute('r','340');clip.append(circle);defs.append(clip);svg.append(defs);
 const image=document.createElementNS(ns,'image');image.setAttribute('width','710');image.setAttribute('clip-path','url(#'+clipId+')');image.setAttribute('preserveAspectRatio','none');svg.append(image);target.append(svg);
 function update(){const lang=document.documentElement.lang==='ar'?'ar':'en';if(lang==='ar'){image.setAttribute('href',files.ar);image.setAttribute('x','0');image.setAttribute('y','0');image.setAttribute('height','710')}else{image.setAttribute('href',files.en);image.setAttribute('x','0');image.setAttribute('y','-425');image.setAttribute('height','1536')}svg.setAttribute('aria-label',lang==='ar'?'شعار أولدورا':'OLDORA logo');}
 update();new MutationObserver(update).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 window.addEventListener('storage',e=>{if(e.key==='oldora_language')update()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();