import { listPosts, getPost, createPost, updatePost, deletePost } from './api.js';
import { $, renderGrid, renderSkeleton, toggleComposer, showPreview, fillDetailDialog, openDetail, closeDetail, toast, setDetailEditing } from './dom.js';

// ------- 全局状态 -------
let CURRENT_LIST = [];
let CURRENT_DETAIL_ID = null;
let LIST_ABORT = null;
let DETAIL_ABORT = null;
let DIRTY_DETAIL = false;

// ------- 初始化 -------
(async function init(){
  bindConnectivity();
  bindToolbar();
  bindComposer();
  bindDetail();
  bindKeyboard();
  await refreshList();
  handleHashChange();
  window.addEventListener('hashchange', handleHashChange);
})();

// ------- 网络状态 -------
function bindConnectivity(){
  const bar = $('#netbar');
  const sync = ()=>{ bar.hidden = navigator.onLine; };
  window.addEventListener('online', sync);
  window.addEventListener('offline', sync);
  sync();
}

// ------- 顶栏 -------
function bindToolbar(){
  $('#btnRefresh').addEventListener('click', ()=> refreshList(true));
  $('#btnNew').addEventListener('click', ()=> toggleComposer(true));
}

// ------- 发布面板 -------
function bindComposer(){
  const dz = $('#dropZone');
  $('#composerClose').addEventListener('click', ()=> toggleComposer(false));
  $('#fileInput').addEventListener('change', (e)=> showPreview(e.target.files[0]));
  $('#btnReset').addEventListener('click', ()=>{
    $('#titleInput').value=''; $('#contentInput').value=''; $('#fileInput').value=''; showPreview(null);
  });
  $('#btnPublish').addEventListener('click', onPublish);

  // 拖拽
  ['dragenter','dragover'].forEach(ev=> dz.addEventListener(ev, e=>{ e.preventDefault(); dz.classList.add('dragover'); }));
  ['dragleave','drop'].forEach(ev=> dz.addEventListener(ev, e=>{ e.preventDefault(); dz.classList.remove('dragover'); }));
  dz.addEventListener('drop', (e)=>{
    const f = e.dataTransfer?.files?.[0];
    if(f){ $('#fileInput').files = e.dataTransfer.files; showPreview(f); }
  });

  // 粘贴
  document.addEventListener('paste', (e)=>{
    const f = [...(e.clipboardData?.files||[])][0];
    if(f){ toggleComposer(true); $('#fileInput').files = e.clipboardData.files; showPreview(f); }
  });
}

async function onPublish(){
  const title = $('#titleInput').value.trim();
  const content = $('#contentInput').value.trim();
  const file = $('#fileInput').files[0] || null;
  if(!title){ toast('标题必填',false); return; }
  try{
    const btn = $('#btnPublish'); btn.disabled = true;
    await createPost({ title, content, file });
    toast('发布成功', true);
    toggleComposer(false);
    $('#btnReset').click();
    await refreshList();
  }catch(e){ toast('发布失败：'+e.message,false); }
  finally{ $('#btnPublish').disabled = false; }
}

// ------- 详情对话框 -------
function bindDetail(){
  $('#detailClose').addEventListener('click', tryCloseDetail);
  $('#detailForm').addEventListener('close', ()=> closeDetail());
  $('#detailTitle').addEventListener('input', ()=> DIRTY_DETAIL = true);
  $('#detailContent').addEventListener('input', ()=> DIRTY_DETAIL = true);
  $('#detailFile').addEventListener('change', ()=> DIRTY_DETAIL = true);

  $('#btnEdit').addEventListener('click', ()=> { setDetailEditing(true); DIRTY_DETAIL = true; });
  $('#btnSave').addEventListener('click', onSaveDetail);
  $('#btnDelete').addEventListener('click', onDeleteDetail);
}

function tryCloseDetail(){
  if(DIRTY_DETAIL && !confirm('有未保存的更改，确定要关闭吗？')) return;
  DIRTY_DETAIL = false; closeDetail();
  history.replaceState(null,'', location.pathname); // 清理 hash
}

async function onSaveDetail(e){
  e.preventDefault();
  if(!CURRENT_DETAIL_ID) return;
  const title = $('#detailTitle').value.trim();
  const content = $('#detailContent').value.trim();
  const file = $('#detailFile').files[0] || null;
  if(!title){ toast('标题必填', false); return; }
  try{
    const btn = $('#btnSave'); btn.disabled = true;
    await updatePost({ id: CURRENT_DETAIL_ID, title, content, file });
    toast('更新成功', true);
    DIRTY_DETAIL = false;
    setDetailEditing(false);
    closeDetail();
    history.replaceState(null,'', location.pathname);
    await refreshList();
  }catch(err){ toast('更新失败：'+err.message, false); }
  finally{ $('#btnSave').disabled = false; }
}

async function onDeleteDetail(e){
  e.preventDefault();
  if(!CURRENT_DETAIL_ID) return;
  if(!confirm('确认删除？')) return;
  try{
    const btn = $('#btnDelete'); btn.disabled = true;
    await deletePost(CURRENT_DETAIL_ID);
    toast('删除成功', true);
    DIRTY_DETAIL = false; closeDetail();
    history.replaceState(null,'', location.pathname);
    await refreshList();
  }catch(err){ toast('删除失败：'+err.message,false); }
  finally{ $('#btnDelete').disabled = false; }
}

// ------- 列表刷新 -------
async function refreshList(forceSkeleton=false){
  try{
    if(LIST_ABORT){ LIST_ABORT.abort(); }
    LIST_ABORT = new AbortController();
    if(forceSkeleton){ $('#empty').hidden = true; renderSkeleton($('#skeleton')); $('#skeleton').ariaHidden = 'false'; }

    const list = await listPosts();
    CURRENT_LIST = list;
    $('#skeleton').innerHTML = ''; $('#skeleton').ariaHidden = 'true';
    renderGrid($('#grid'), list, { onOpen: openDetailById });
    $('#empty').hidden = list.length > 0;
  }catch(e){
    if(e.name === 'AbortError') return;
    toast('获取列表失败：'+e.message, false);
  }
}

// ------- 打开详情（支持 hash 深链） -------
async function openDetailById(id){
  try{
    if(DETAIL_ABORT) DETAIL_ABORT.abort();
    DETAIL_ABORT = new AbortController();
    const post = await getPost(id);
    CURRENT_DETAIL_ID = id;
    fillDetailDialog(post);
    setDetailEditing(false);
    openDetail();
    DIRTY_DETAIL = false;
    location.hash = `#/post/${encodeURIComponent(id)}`;
  }catch(e){ toast('获取详情失败：'+e.message,false); }
}

// hash 路由
function handleHashChange(){
  const m = location.hash.match(/^#\/post\/([^#?]+)/);
  if(m && m[1]) openDetailById(decodeURIComponent(m[1]));
}

// ------- 键盘快捷键 -------
function bindKeyboard(){
  document.addEventListener('keydown', (e)=>{
    if(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if(e.key.toLowerCase()==='n'){ toggleComposer(true); }
    if(e.key.toLowerCase()==='r'){ refreshList(true); }
    if(e.key==='Escape'){ tryCloseDetail(); toggleComposer(false); }
  });
}
