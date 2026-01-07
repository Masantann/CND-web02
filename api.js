import { LA, URLS } from './config.js';

const JSON_HDR = { 'Content-Type': 'application/json' };
const RE_VIDEO = /\.(mp4|webm|ogg)$/i;
const MAX_IMAGE_PX = 1600; // 客户端压缩最大边
const MAX_FILE_MB = 32;    // 最大 32MB

export const isVideoUrl = (url) => RE_VIDEO.test(url || "");

// 通用 fetch（超时 + Abort + 安全解析 + 重试）
async function fetchWithCtrl(input, init = {}, { timeout = 12000, expectJson = true, retry = 0 } = {}){
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(new Error('请求超时')), timeout);
  try{
    const res = await fetch(input, { ...init, signal: ctrl.signal });
    if(!res.ok){
      const text = await res.text().catch(()=>`${res.status} ${res.statusText}`);
      throw new Error(text || `${res.status} ${res.statusText}`);
    }
    if(!expectJson) return res;
    const txt = await res.text();
    return txt ? JSON.parse(txt) : {};
  }catch(err){
    if(retry > 0) return fetchWithCtrl(input, init, { timeout, expectJson, retry: retry-1 });
    throw err.name === 'AbortError' ? new Error('请求已取消/超时') : err;
  }finally{
    clearTimeout(id);
  }
}

// 图片压缩（视频直传）
async function maybeCompressImage(file){
  if(!file || !file.type.startsWith('image/')) return file;
  const bitmap = await createImageBitmap(file).catch(()=>null);
  if(!bitmap) return file;
  const { width, height } = bitmap;
  const maxSide = Math.max(width, height);
  if(maxSide <= MAX_IMAGE_PX) return file;
  const scale = MAX_IMAGE_PX / maxSide;
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, file.type.includes('png') ? 'image/png' : 'image/jpeg', 0.86));
  return blob || file;
}

// File -> base64
export function fileToBase64(file){
  return new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result||"");
      const m = s.match(/^data:(.+);base64,(.+)$/);
      if(!m) return reject(new Error('无法解析文件为 base64'));
      resolve({ contentType:m[1], base64:m[2] });
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// 大小/类型校验
function validateFile(file){
  if(!file) return;
  const sizeMb = file.size / (1024*1024);
  if(sizeMb > MAX_FILE_MB) throw new Error(`文件过大（${sizeMb.toFixed(1)}MB），上限 ${MAX_FILE_MB}MB`);
  if(!(file.type.startsWith('image/') || file.type.startsWith('video/')))
    throw new Error('仅支持图片或视频');
}

// 上传 Blob，返回 { blobUrl }
export async function uploadMedia(file){
  validateFile(file);
  const toUpload = isVideoUrl(file.name) ? file : await maybeCompressImage(file);
  const upFile = toUpload instanceof File ? toUpload : new File([toUpload], file.name, { type: file.type });
  const { contentType, base64 } = await fileToBase64(upFile);
  const fileName = Date.now() + '-' + file.name.replace(/\s+/g,'_');
  const res = await fetchWithCtrl(URLS.upload, {
    method:'POST', headers: JSON_HDR, body: JSON.stringify({ fileName, contentType, base64 })
  });
  return res; // { blobUrl }
}

// 标准化列表
function normalizeList(list){
  const arr = Array.isArray(list) ? list : (list.value || []);
  return arr.map(x => ({
    id: x.id ?? x._id ?? x.pk ?? '',
    title: x.title || '',
    content: x.content || '',
    mediaUrl: x.imageUrl || x.mediaUrl || '',
    createdAt: x.createdAt || x._ts || x.timestamp || ''
  })).sort((a,b)=> (new Date(b.createdAt||0)) - (new Date(a.createdAt||0)));
}

// API：列表
export async function listPosts(){
  const list = await fetchWithCtrl(LA.list, { method:'GET' }, { retry:1 });
  return normalizeList(list);
}

// API：详情
export async function getPost(id){
  const x = await fetchWithCtrl(LA.get + `&id=${encodeURIComponent(id)}`, { method:'GET' }, { retry:1 });
  return {
    id: x.id ?? x._id ?? id,
    title: x.title || '',
    content: x.content || '',
    mediaUrl: x.imageUrl || x.mediaUrl || '',
    createdAt: x.createdAt || x._ts || x.timestamp || ''
  };
}

// API：创建
export async function createPost({ title, content, file }){
  const body = { title, content, imageUrl:'' };
  if(file){ const { blobUrl } = await uploadMedia(file); body.imageUrl = blobUrl; }
  return fetchWithCtrl(LA.create, { method:'POST', headers: JSON_HDR, body: JSON.stringify(body) });
}

// API：更新
export async function updatePost({ id, title, content, file }){
  const body = { id, title, content };
  if(file){ const { blobUrl } = await uploadMedia(file); body.imageUrl = blobUrl; }
  await fetchWithCtrl(LA.update, { method:'PUT', headers: JSON_HDR, body: JSON.stringify(body) }, { expectJson:false });
  return { ok:true };
}

// API：删除
export async function deletePost(id){
  await fetchWithCtrl(LA.del + `&id=${encodeURIComponent(id)}`, { method:'DELETE' }, { expectJson:false });
  return { ok:true };
}
