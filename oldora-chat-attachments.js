/* OLDORA private chat attachments - isolated feature branch, no observer. */
(() => {
  'use strict';
  const BUCKET = 'oldora-private-chat';
  const MAX_BYTES = 20 * 1024 * 1024;
  const MIME = new Set(['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/webm']);
  const form = document.getElementById('sendForm');
  if (!form || !window.db) return;
  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm';
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
  const originalRefresh = window.refresh;
  let rendering = false;
  async function renderAttachments() {
    if (!window.active || rendering || !window.user) return;
    rendering = true;
    const conversation = window.active;
    try {
      const {data,error} = await db.from('oldora_chat_attachments')
        .select('id,conversation_id,sender_id,storage_path,mime_type,created_at')
        .eq('conversation_id',conversation).order('created_at',{ascending:true}).limit(100);
      if (error) throw error;
      if (conversation !== window.active) return;
      document.querySelectorAll('.oldora-attachment-bubble').forEach(node => node.remove());
      const container = document.getElementById('messages');
      for (const item of data || []) {
        const {data: signed,error: signError} = await db.storage.from(BUCKET).createSignedUrl(item.storage_path, 300);
        if (signError || !signed?.signedUrl || conversation !== window.active) continue;
        const bubble = document.createElement('div');
        bubble.className = 'bubble oldora-attachment-bubble ' + (item.sender_id === user.id ? 'mine' : 'theirs');
        const media = document.createElement(item.mime_type.startsWith('image/') ? 'img' : 'video');
        media.src = signed.signedUrl;
        media.style.cssText = 'display:block;max-width:100%;max-height:260px;border-radius:8px';
        if (media.tagName === 'VIDEO') { media.controls = true; media.preload = 'metadata'; }
        else { media.alt = 'Chat image'; media.loading = 'lazy'; }
        const time = document.createElement('small');
        time.textContent = new Date(item.created_at).toLocaleString();
        bubble.append(media,time);
        container.append(bubble);
      }
    } catch (e) { console.warn('Attachment display unavailable:',e); }
    finally { rendering = false; }
  }
  if (typeof originalRefresh === 'function') {
    window.refresh = async function (...args) { await originalRefresh(...args); await renderAttachments(); };
  }
  attach.onclick = () => { if (!window.active || !window.user) return; picker.click(); };
  picker.onchange = async () => {
    const file = picker.files?.[0];
    picker.value = '';
    if (!file || !window.active || !window.user) return;
    if (!MIME.has(file.type) || file.size > MAX_BYTES || file.size === 0) {
      progress.textContent = 'Unsupported file or file larger than 20 MB.';
      return;
    }
    const conversation = window.active;
    const sender = window.user.id;
    const extension = ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','video/mp4':'mp4','video/quicktime':'mov','video/webm':'webm'})[file.type];
    const path = conversation + '/' + sender + '/' + crypto.randomUUID() + '.' + extension;
    attach.disabled = true;
    progress.textContent = 'Uploading attachment...';
    try {
      const {error: uploadError} = await db.storage.from(BUCKET).upload(path,file,{contentType:file.type,upsert:false});
      if (uploadError) throw uploadError;
      const {error: saveError} = await db.from('oldora_chat_attachments').insert({
        conversation_id:conversation,sender_id:sender,storage_path:path,mime_type:file.type,file_size:file.size
      });
      if (saveError) throw saveError;
      progress.textContent = 'Attachment sent.';
      await renderAttachments();
    } catch (e) {
      progress.textContent = 'Attachment failed: ' + (e?.message || 'Please retry.');
    } finally { attach.disabled = false; }
  };
})();
