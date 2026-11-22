/* OLDORA private chat attachments - isolated feature branch, no observer. */
(() => {
  'use strict';
  const BUCKET = 'oldora-private-chat';
  const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
  const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
  const MAX_VIDEO_EDGE = 1920;
  const MAX_VIDEO_SHORT_EDGE = 1080;
  function isArabic() { return document.documentElement.lang === 'ar'; }
  function statusText(ar,en) { progress.textContent = isArabic() ? ar : en; }
  function videoDimensions(file) {
    return new Promise((resolve,reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      const cleanup = () => { video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url); };
      video.preload = 'metadata';
      video.onloadedmetadata = () => { const w=video.videoWidth,h=video.videoHeight; cleanup(); w&&h ? resolve({w,h}) : reject(Error('Video dimensions unavailable')); };
      video.onerror = () => { cleanup(); reject(Error('Video metadata could not be read')); };
      video.src = url;
    });
  }
  function uploadLarge(file,path,mime) {
    return new Promise(async (resolve,reject) => {
      if (!window.tus?.Upload) { reject(Error('Resumable upload library unavailable')); return; }
      const {data,error} = await db.auth.getSession();
      if (error || !data?.session?.access_token) { reject(error || Error('Sign in again')); return; }
      const upload = new window.tus.Upload(file, {
        endpoint:'https://hakjlkltjwvatzgasvos.storage.supabase.co/storage/v1/upload/resumable',
        retryDelays:[0,3000,5000,10000,20000],
        headers:{authorization:'Bearer '+data.session.access_token,'x-upsert':'false'},
        uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,
        metadata:{bucketName:BUCKET,objectName:path,contentType:mime,cacheControl:'3600'},
        chunkSize:6*1024*1024,
        onProgress:(done,total)=>statusText('جارٍ رفع الفيديو... '+Math.round(done/total*100)+'٪','Uploading video... '+Math.round(done/total*100)+'%'),
        onError:reject,onSuccess:resolve
      });
      upload.start();
    });
  }
  const MIME = new Set(['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/webm']);
  const form = document.getElementById('sendForm');
  if (!form || typeof db === 'undefined') return;
  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,.mov,.mp4,.webm';
  picker.hidden = true;
  picker.id = 'oldoraChatAttachmentInput';
  const attach = document.createElement('button');
  attach.type = 'button';
  attach.id = 'oldoraChatAttach';
  attach.textContent = '📎';
  attach.title = 'Attach photo or video';
  attach.setAttribute('aria-label','Attach photo or video');
  attach.style.cssText = 'flex:none;border:1px solid #59482f;border-radius:7px;background:#26221c;color:#c4a46a;font-size:22px;min-height:44px;padding:5px 11px';
  const progress = document.createElement('span');
  progress.id = 'oldoraChatUploadStatus';
  progress.setAttribute('role','status');
  progress.style.cssText = 'display:block;color:#c4a46a;font-size:12px;margin-top:5px';
  form.insertBefore(attach, form.querySelector('#send'));
  form.after(progress);
  form.append(picker);
  let displayedConversation = null;
  let rendering = false;
  const signedCache = new Map();
  async function renderAttachments() {
    if (!active || rendering || !user) return;
    rendering = true;
    const conversation = active;
    if (displayedConversation !== conversation) {
      document.querySelectorAll('.oldora-attachment-bubble').forEach(node => node.remove());
      displayedConversation = conversation;
      signedCache.clear();
    }
    try {
      const {data,error} = await db.from('oldora_chat_attachments')
        .select('id,conversation_id,sender_id,storage_path,mime_type,created_at')
        .eq('conversation_id',conversation).order('created_at',{ascending:true}).limit(100);
      if (error) throw error;
      if (conversation !== active) return;
      const existing = new Set(Array.from(document.querySelectorAll('.oldora-attachment-bubble')).map(node => node.dataset.attachmentId));
      const currentIds = new Set((data || []).map(item => item.id));
      document.querySelectorAll('.oldora-attachment-bubble').forEach(node => { if (!currentIds.has(node.dataset.attachmentId)) node.remove(); });
      const container = document.getElementById('messages');
      const bottomBefore = container.scrollHeight - container.scrollTop - container.clientHeight < 70;
      const topBefore = container.scrollTop;
      for (const item of data || []) {
        if (existing.has(item.id)) continue;
        let cached = signedCache.get(item.storage_path);
        if (!cached || cached.expires < Date.now()) {
          const {data: signed,error: signError} = await db.storage.from(BUCKET).createSignedUrl(item.storage_path, 300);
          if (signError || !signed?.signedUrl || conversation !== active) continue;
          cached = {url:signed.signedUrl,expires:Date.now()+240000};
          signedCache.set(item.storage_path,cached);
        }
        if (conversation !== active) return;
        const bubble = document.createElement('div');
        bubble.className = 'bubble oldora-attachment-bubble ' + (item.sender_id === user.id ? 'mine' : 'theirs');
        bubble.dataset.attachmentId = item.id;
        const media = document.createElement(item.mime_type.startsWith('image/') ? 'img' : 'video');
        media.src = cached.url;
        media.style.cssText = 'display:block;max-width:100%;max-height:260px;border-radius:8px';
        if (media.tagName === 'VIDEO') { media.controls = true; media.preload = 'metadata'; }
        else { media.alt = 'Chat image'; media.loading = 'lazy'; }
        const time = document.createElement('small');
        time.textContent = new Date(item.created_at).toLocaleString();
        bubble.append(media,time);
        container.append(bubble);
      }
      if (bottomBefore) container.scrollTop = container.scrollHeight;
      else container.scrollTop = topBefore;
    } catch (e) { console.warn('Attachment display unavailable:',e); }
    finally { rendering = false; }
  }
  window.addEventListener('oldora:messages-refreshed', event => {
    if (event.detail?.conversationId === active) void renderAttachments();
  });
  attach.onclick = () => { if (!active || !user) return; picker.click(); };
  picker.onchange = async () => {
    const file = picker.files?.[0];
    picker.value = '';
    if (!file || !active || !user) return;
    const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const inferred = ({mov:'video/quicktime',mp4:'video/mp4',webm:'video/webm',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif'})[ext];
    const mime = MIME.has(file.type) ? file.type : (!file.type && inferred ? inferred : '');
    const isVideo = mime.startsWith('video/');
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxBytes) {
      statusText(isVideo ? 'الحد الأقصى للفيديو 100 ميجابايت.' : 'الحد الأقصى للصورة 20 ميجابايت.',isVideo ? 'Video limit: 100 MB.' : 'Image limit: 20 MB.');
      return;
    }
    if (!file.size || !MIME.has(mime)) {
      statusText('صيغة الملف غير مدعومة. جرّب MP4 أو MOV.','Unsupported format. Try MP4 or MOV.');
      return;
    }
    if (isVideo) {
      try {
        statusText('جارٍ فحص دقة الفيديو...','Checking video resolution...');
        const {w,h} = await videoDimensions(file);
        if (Math.max(w,h)>MAX_VIDEO_EDGE || Math.min(w,h)>MAX_VIDEO_SHORT_EDGE) {
          statusText('دقة الفيديو تتجاوز 1080p. اختر فيديو بدقة 1080p أو 720p.','Video exceeds 1080p. Choose 1080p or 720p.');
          return;
        }
      } catch(e) {
        statusText('تعذر قراءة دقة الفيديو. جرّب فيديو MP4 أو MOV آخر.','Could not read video resolution. Try another MP4 or MOV.');
        return;
      }
    }
    const conversation = active;
    const sender = user.id;
    const extension = ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','video/mp4':'mp4','video/quicktime':'mov','video/webm':'webm'})[mime];
    const path = conversation + '/' + sender + '/' + crypto.randomUUID() + '.' + extension;
    attach.disabled = true;
    statusText('جارٍ رفع المرفق...','Uploading attachment...');
    try {
      if (file.size > 6*1024*1024) await uploadLarge(file,path,mime);
      else {
        const {error: uploadError} = await db.storage.from(BUCKET).upload(path,file,{contentType:mime,upsert:false});
        if (uploadError) throw uploadError;
      }
      const {error: saveError} = await db.from('oldora_chat_attachments').insert({
        conversation_id:conversation,sender_id:sender,storage_path:path,mime_type:mime,file_size:file.size
      });
      if (saveError) {
        throw saveError;
      }
      statusText('تم إرسال المرفق.','Attachment sent.');
      await renderAttachments();
    } catch (e) {
      statusText('فشل رفع المرفق: '+(e?.message||'حاول مجدداً.'),'Attachment failed: '+(e?.message||'Please retry.'));
    } finally { attach.disabled = false; }
  };
})();
