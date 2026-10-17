const submit=document.getElementById('submit'), keyBtn=document.getElementById('keyBtn'),
      overlay=document.getElementById('overlay'), modal=document.getElementById('modal'),
      pw4=document.getElementById('pw4');
const usbCells=[...document.querySelectorAll('#usbCells .cell')];
const pwCells=[...document.querySelectorAll('#pwCells .cell')];
const allCells=[...usbCells,...pwCells];
let done=false, cleared=false, rec=null, listening=false;

const norm=s=>s.normalize('NFKC').trim().toLowerCase();
const active=g=>g.filter(c=>!c.classList.contains('gone'));
const valueOf=g=>active(g).map(c=>c.value).join('');

function update(){
  submit.disabled = done || allCells.some(c=>!c.classList.contains('gone') && c.value==='');
}

allCells.forEach(cell=>{
  const group=usbCells.includes(cell)?usbCells:pwCells;
  cell.addEventListener('input',e=>{
    if(e.isComposing) return;
    fill(cell,group);
  });
  cell.addEventListener('compositionend',()=>fill(cell,group));
  cell.addEventListener('keydown',e=>{
    const list=active(group), i=list.indexOf(cell);
    if(e.key==='Backspace' && cell.value==='' && i>0){ list[i-1].value=''; list[i-1].focus(); update(); e.preventDefault(); }
    else if(e.key==='ArrowLeft' && i>0){ list[i-1].focus(); }
    else if(e.key==='ArrowRight' && i<list.length-1){ list[i+1].focus(); }
  });
  cell.addEventListener('focus',()=>cell.select());
});

// 入力された文字を1文字ずつ各ボックスに振り分ける(貼り付けにも対応)
function fill(cell,group){
  const chars=[...cell.value.normalize('NFKC')].filter(ch=>ch.trim()!=='');
  const list=active(group);
  let i=list.indexOf(cell);
  cell.value='';
  for(const ch of chars){
    if(i>=list.length) break;
    list[i].value=ch; i++;
  }
  const next=list[Math.min(i,list.length-1)];
  if(next) next.focus();
  update();
}

keyBtn.addEventListener('click',()=>{
  if(done) return;
  startListening();
});

// ---- 音声認識:鍵を押したあとに「USB」と言うとパスワードの4つ目のボックスだけが消える ----
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const toHira=s=>s.replace(/[\u30A1-\u30F6]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
const isUSB=t=>{
  const n=toHira(t.normalize('NFKC').toLowerCase()).replace(/[\s、。,.\-ー]/g,'');
  return /usb|ゆうえすび|ゆえすび/.test(n);
};
function startListening(){
  if(!SR || listening || done || cleared) return;
  try{
    rec=new SR();
    rec.lang='ja-JP';
    rec.continuous=true;
    rec.interimResults=true;
    rec.onresult=e=>{
      for(let i=e.resultIndex;i<e.results.length;i++){
        if(isUSB(e.results[i][0].transcript)){ clearBoxes(); return; }
      }
    };
    rec.onend=()=>{ if(listening && !cleared && !done){ try{rec.start();}catch(_){} } };
    rec.onerror=e=>{
      if(e.error==='not-allowed'||e.error==='service-not-allowed'){
        listening=false; console.warn('マイクが許可されていません');
      }
    };
    listening=true;
    rec.start();
  }catch(err){ listening=false; console.warn(err); }
}
function stopListening(){
  listening=false;
  if(rec){ try{rec.stop();}catch(_){} }
}
function clearBoxes(){
  cleared=true;
  stopListening();
  pw4.value='';
  pw4.classList.add('gone');
  update();
}

// 画像が読み込めない場合は代替アイコンを表示
document.getElementById('keyImg').addEventListener('error',function(){
  this.style.display='none';
  document.getElementById('keyFallback').style.display='block';
});

submit.addEventListener('click',()=>{
  if(submit.disabled) return;
  done=true;
  stopListening();
  [...allCells,submit,keyBtn].forEach(e=>e.disabled=true);
  const ok = norm(valueOf(usbCells))==='6' && norm(valueOf(pwCells))==='leg';
  modal.className='modal '+(ok?'ok':'ng');
  document.getElementById('mTitle').textContent = ok?'正解!':'間違っています';
  document.getElementById('mText').textContent = ok?'おめでとうございます!':'残念ながら不正解です。';
  overlay.classList.add('show');
});
document.getElementById('closeBtn').addEventListener('click',()=>overlay.classList.remove('show'));