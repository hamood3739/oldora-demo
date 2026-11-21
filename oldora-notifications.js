(()=>{'use strict';
if(window.__oldoraNotifications)return;window.__oldoraNotifications=true;
const css=document.createElement('style');css.textContent='#oldoraNotify{position:fixed;top:70px;right:14px;z-index:9999;font:14px Arial,sans-serif}#oldoraNotify button{background:#241f18;color:#e8c98c;border:1px solid #c4a46a;border-radius:24px;padding:11px 15px;cursor:pointer;box-shadow:0 3px 12px #0008}#oldoraNotifyCount{background:#b94c38;color:white;border-radius:30px;padding:2px 6px;margin-inline-start:5px}#oldoraNotifyPanel{background:#181715;color:#f5f0e6;border:1px solid #c4a46a;border-radius:10px;margin-top:6px;padding:12px;max-width:min(320px,85vw);box-shadow:0 4px 18px #0009}#oldoraNotifyPanel a{color:#e8c98c}#oldoraNotifyPanel[hidden],#oldoraNotify[hidden],#oldoraNotifyCount[hidden]{display:none!important}';document.head.append(css);
const root=document.createElement('div');root.id='oldoraNotify';root.hidden=true;root.innerHTML='<button id="oldoraNotifyButton" type="button" aria-label="Notifications">🔔 <span id="oldoraNotifyCount" hidden>0</span></button><div id="oldoraNotifyPanel" hidden><div id="oldoraNotifyText">الرسائل · Messages</div><a id="oldoraNotifyLink" href="messages.html?inbox=1">افتح الرسائل · Open messages</a></div>';document.body.append(root);
const countEl=document.getElementById('oldoraNotifyCount'),panel=document.getElementById('oldoraNotifyPanel'),label=document.getElementById('oldoraNotifyText'),link=document.getElementById('oldoraNotifyLink');
const db=window.supabase?.createClient('https://hakjlkltjwvatzgasvos.supabase.co','sb_publishable_ZHSA7hEPPW7GCZUwZMDWKg_2fewANzb');if(!db)return;
let uid='',busy=false,initialized=false,latest='',lastNotified='';
const store=k=>{try{return localStorage.getItem(k)}catch{return null}},save=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
root.querySelector('button').onclick=()=>{panel.hidden=!panel.hidden;if(!panel.hidden&&uid&&latest){save('oldora-notify-seen:'+uid,latest);countEl.hidden=true}};
link.onclick=()=>{if(uid&&latest)save('oldora-notify-seen:'+uid,latest)};
async function check(){if(busy||document.hidden)return;busy=true;try{
const session=await db.auth.getSession();const user=session.data?.session?.user;if(!user){root.hidden=true;uid='';return}
if(uid!==user.id){uid=user.id;initialized=false;latest='';lastNotified=''}root.hidden=false;
const {data:convs,error}=await db.from('oldora_conversations').select('id,product_id');if(error)return;
const ids=(convs||[]).map(c=>c.id);if(!ids.length){countEl.hidden=true;return}
const {data:rows,error:err}=await db.from('oldora_messages').select('id,conversation_id,sender_id,created_at').in('conversation_id',ids).neq('sender_id',uid).order('created_at',{ascending:false}).limit(100);if(err)return;
const incoming=rows||[];latest=incoming[0]?.id||'';const seen=store('oldora-notify-seen:'+uid);
if(!initialized){initialized=true;lastNotified=latest;if(!seen&&latest)save('oldora-notify-seen:'+uid,latest)}
const unread=seen?incoming.findIndex(m=>String(m.id)===seen):-1;
const count=seen?(unread<0?incoming.length:unread):0;
countEl.hidden=count===0;countEl.textContent=count>99?'99+':String(count);
label.textContent=count?('🔔 '+count+' رسائل جديدة · New messages'):('الرسائل · Messages');
if(count){const conversation=convs.find(c=>c.id===incoming[0].conversation_id);link.href='messages.html?listing='+encodeURIComponent(conversation?.product_id||'')+'&inbox=1';}
if(initialized&&latest&&lastNotified&&latest!==lastNotified){lastNotified=latest;/* Visual notification; audio handled only by active chat to avoid duplicate tones. */}
}catch(e){console.warn('OLDORA notifications unavailable',e)}finally{busy=false}}
check();setInterval(check,6000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});window.addEventListener('pageshow',check);
})();