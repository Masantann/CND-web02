import { isVideoUrl } from './api.js';

export const $  = (s,root=document)=>root.querySelector(s);
export const $$ = (s,root=document)=>Array.from(root.querySelectorAll(s));
export const escapeHtml = (s)=>String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
export const fmtDate = (v)=>{ try{ return v? new Date(v).toLocaleString(): '' }catch{ return '' } };

let toastTimer;
export function toast(text, ok=true){
  const el = $('#toast');
  el.textContent = text;
  el.style.background = ok ? '#0b1220' : '#4a0e1a';
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> el.classList.remove('show'), 2000);
}

/* 骨架屏 */
export function renderSkeleton(container, count=6){
  container.innerHTML = '';
  const frag = document.createDocumentFragment();
  for(let i=0;i<count;i++){
    const el = document.createElement('article');
    el.className = 'skel';
    el.innerHTML = `
      <div class="skel__media"></div>
      <div class="skel__body">
        <div class="skel__line" style="width:70%"></div>
        <div class="skel__line" style="width:90%"></div>
      </div>`;
    frag.appendChild(el);
  }
  container.appendChild(frag);
}

/* 视频时长 */
function fmtVideoDuration(sec){
  if(!isFinite(sec) || sec <= 0) return '--:--';
  const s = Math.round(sec);
  const h = Math.floor(s/3600);
  const m = Math.floor((s%3600)/60);
  const ss = s%60;
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}` 
           : `${m}:${String(ss).padStart(2,'0')}`;
}

/* 卡片 */
export function cardEl(post, { onOpen }){
  const el = document.createElement('article');
  el.className = 'card';
  el.setAttribute('data-id', post.id);

  const isVid = !!post.mediaUrl && isVideoUrl(post.mediaUrl);
  el.innerHTML = `
    <div class="card__media" role="button" tabindex="0" aria-label="打开详情">
      ${post.mediaUrl
        ? (isVid
            ? `<video src="${post.mediaUrl}" preload="metadata" playsinline muted></video>`
            : `<img src="${post.mediaUrl}" loading="lazy" alt="media"/>`)
        : `<img src="data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='#0b0f14'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%238aa' font-size='16'>无媒体</text></svg>`
          )}" alt="无媒体"/>`
      }
    </div>
    <div class="card__body">
      <div class="card__title">${escapeHtml(post.title)}</div>
      <div class="card__content">${escapeHtml(post.content).slice(0,140)}${post.content.length>140?'…':''}</div>
    </div>
    <div class="card__foot">
      <span class="badge">${fmtDate(post.createdAt)}</span>
      <button class="linkbtn" aria-label="查看详情">查看详情</button>
    </div>`;

  // 打开详情
  const open = ()=> onOpen(post.id);
  el.querySelector('.linkbtn').addEventListener('click', open);
  const media = el.querySelector('.card__media');
  media.addEventListener('click', open);
  media.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); open(); } });

  // 视频叠层
  if(isVid){
    const flag = document.createElement('div'); flag.className='vflag'; flag.textContent='视频';
    const play = document.createElement('div'); play.className='vplay';
    const dur  = document.createElement('div'); dur.className='vduration'; dur.textContent='--:--';
    media.append(flag, play, dur);
    const v = media.querySelector('video');
    if(v){
      v.preload = 'metadata';
      v.addEventListener('loadedmetadata', ()=>{ dur.textContent = fmtVideoDuration(v.duration); }, { once:true });
      v.addEventListener('error', ()=> dur.remove(), { once:true });
    }
  }
  return el;
}

/* 渲染网格 */
export function renderGrid(container, posts, handlers){
  container.innerHTML = '';
  const frag = document.createDocumentFragment();
  for(const p of posts){
    try{ frag.appendChild(cardEl(p, handlers)); }
    catch(err){ console.error('渲染卡片失败', err); }
  }
  container.appendChild(frag);
}

/* 发布面板开关（锁滚动，避免点透） */
export function toggleComposer(show){
  $('#composer').setAttribute('aria-hidden', show ? 'false' : 'true');
  document.body.classList.toggle('modal-open', !!show);
  if(show){ setTimeout(()=> $('#titleInput')?.focus(), 0); }
}

/* 预览 */
export function showPreview(file){
  const box = $('#preview');
  box.innerHTML = '';
  if(!file){ box.style.display='none'; return; }
  const url = URL.createObjectURL(file);
  const node = isVideoUrl(file.name) ? document.createElement('video') : document.createElement('img');
  node.src = url; node.controls = isVideoUrl(file.name);
  const revoke = ()=> URL.revokeObjectURL(url);
  node.onload = revoke; node.onloadedmetadata = revoke;
  box.appendChild(node);
  box.style.display='block';
}

/* 详情填充 */
export function fillDetailDialog(post){
  $('#detailTitle').value = post.title||'';
  $('#detailContent').value = post.content||'';
  $('#detailId').textContent = `ID: ${post.id}`;
  $('#detailTime').textContent = `创建时间：${fmtDate(post.createdAt)}`;

  const m = $('#detailMedia');
  m.innerHTML = '';
  if(post.mediaUrl){
    const node = isVideoUrl(post.mediaUrl) ? document.createElement('video') : document.createElement('img');
    node.src = post.mediaUrl; if(node.tagName==='VIDEO') node.controls = true;
    m.appendChild(node);
  }
}

/* 打开/关闭详情 */
export function openDetail(){ const d = $('#detailDialog'); if(!d.open) d.showModal(); }
export function closeDetail(){ const d = $('#detailDialog'); if(d.open) d.close(); }

/* 编辑态切换（默认只读） */
export function setDetailEditing(edit){
  $('#detailTitle').disabled   = !edit;
  $('#detailContent').disabled = !edit;
  $('#detailFile').disabled    = !edit;
  $('#btnSave').hidden         = !edit;
  $('#btnEdit').hidden         = !!edit;
}
