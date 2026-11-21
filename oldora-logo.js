/* Approved bilingual OLDORA logo artwork; original files remain unchanged. */
(()=>{'use strict';
const files={en:'assets/IMG_1991.png',ar:'assets/819971CF-FDB0-4A94-86FA-7DC50DC8A9CD.png'};
function init(){
 const style=document.createElement('style');
 style.textContent='.oldora-official-logo{display:block;width:clamp(72px,17vw,130px);height:auto;object-fit:contain;border-radius:50%;clip-path:circle(48% at 50% 50%);background:transparent}.oldora-official-logo.large{width:clamp(130px,35vw,210px);margin:0 auto 12px}.oldora-logo-link{display:inline-flex;align-items:center;text-decoration:none}.oldora-logo-heading{display:none!important}header .oldora-official-logo{width:clamp(62px,12vw,96px)}';
 document.head.append(style);
 let target=null,large=false;
 if(document.querySelector('body>.logo')&&document.querySelector('body>h1')){target=document.querySelector('body>.logo');large=true;document.querySelector('body>h1').classList.add('oldora-logo-heading')}
 else if(document.querySelector('header .hourglass')){target=document.querySelector('header .hourglass');large=true;const h=document.querySelector('header h1');if(h)h.classList.add('oldora-logo-heading')}
 else {target=document.querySelector('header a.logo')||document.querySelector('header a[href="./"]');}
 if(!target)return;
 const isLink=target.tagName==='A';
 target.textContent='';
 if(isLink)target.classList.add('oldora-logo-link');
 const img=document.createElement('img');img.className='oldora-official-logo'+(large?' large':'');img.alt='OLDORA';img.loading='eager';target.append(img);
 function update(){const lang=document.documentElement.lang==='ar'?'ar':'en';const next=files[lang];if(img.getAttribute('src')!==next)img.src=next;img.alt=lang==='ar'?'شعار أولدورا':'OLDORA logo';}
 update();new MutationObserver(update).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 window.addEventListener('storage',e=>{if(e.key==='oldora_language')update()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();