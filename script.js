const video = document.querySelector('#camera');
const stage = document.querySelector('#cameraStage');
const placeholder = document.querySelector('#cameraPlaceholder');
const cameraBtn = document.querySelector('#cameraBtn');
const captureBtn = document.querySelector('#captureBtn');
const countdown = document.querySelector('#countdown');
const shotsRow = document.querySelector('#shotsRow');
const stripSlots = document.querySelector('#stripSlots');
const photoStrip = document.querySelector('#photoStrip');
const downloadBtn = document.querySelector('#downloadBtn');
const shots = [null, null, null, null];
let stream = null;
let mirrored = false;
let busy = false;

function setStatus(text) { document.querySelector('#cameraStatus').textContent = text; }
function refreshShots() {
  const count = shots.filter(Boolean).length;
  document.querySelector('#shotCount').textContent = `${count} / 4`;
  document.querySelector('#captureHint').textContent = count === 4 ? '사진이 준비됐어요. 마음에 안 드는 컷을 눌러 다시 찍을 수 있어요.' : count ? '좋아요! 남은 컷도 촬영해볼까요?' : '준비되면 촬영을 시작해보세요';
  shotsRow.innerHTML = '';
  shots.forEach((shot, i) => {
    const tile = document.createElement('div');
    tile.className = shot ? 'shot-thumb' : 'shot-empty';
    if (shot) { const img = document.createElement('img'); img.src = shot; img.alt = `${i + 1}번째 사진`; tile.append(img); const label = document.createElement('span'); label.textContent = `${i + 1} · 다시 찍기`; tile.append(label); tile.title = '눌러서 이 컷 다시 찍기'; tile.addEventListener('click', () => retake(i)); }
    else tile.textContent = `${i + 1}`;
    shotsRow.append(tile);
  });
  stripSlots.innerHTML = '';
  shots.forEach((shot, i) => {
    if (shot) { const img = document.createElement('img'); img.src = shot; img.alt = `${i + 1}번째 컷`; stripSlots.append(img); }
    else { const empty = document.createElement('div'); empty.className = i ? '' : 'empty-slot'; empty.textContent = i ? `0${i + 1}` : '사진을 찍으면\n여기에 보여요'; stripSlots.append(empty); }
  });
  captureBtn.disabled = !stream || busy || count === 4;
  downloadBtn.disabled = count !== 4;
}
async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) { setStatus('이 브라우저에서는 카메라를 사용할 수 없어요'); alert('카메라는 HTTPS 또는 localhost에서 사용할 수 있어요.'); return; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
    video.srcObject = stream; video.classList.add('active'); stage.classList.add('has-camera'); placeholder.hidden = true;
    cameraBtn.innerHTML = '<span>✓</span> 카메라 연결됨'; cameraBtn.disabled = true; setStatus('카메라가 준비됐어요'); refreshShots();
  } catch (error) { setStatus('카메라 연결에 실패했어요'); alert(error.name === 'NotAllowedError' ? '브라우저에서 카메라 권한을 허용해주세요.' : '카메라를 시작할 수 없어요. 다른 앱에서 사용 중인지 확인해주세요.'); }
}
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function countIn() { for (let n = 3; n > 0; n--) { countdown.textContent = n; await wait(850); } countdown.textContent = '✦'; await wait(250); countdown.textContent = ''; }
function takePhoto(index) {
  if (!video.videoWidth) return;
  const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (mirrored) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  shots[index] = canvas.toDataURL('image/jpeg', .94); refreshShots();
}
async function captureAll() {
  if (busy || !stream) return;
  busy = true; captureBtn.disabled = true;
  for (let i = 0; i < 4; i++) if (!shots[i]) { await countIn(); takePhoto(i); if (i < 3 && shots.slice(i + 1).some(s => !s)) await wait(600); }
  busy = false; refreshShots();
}
async function retake(index) { if (!stream || busy) return; busy = true; refreshShots(); await countIn(); takePhoto(index); busy = false; refreshShots(); }
function updateCaption() { const value = document.querySelector('#captionInput').value; document.querySelector('#captionPreview').textContent = value || 'little moments'; document.querySelector('#captionLength').textContent = value.length; }
function saveImage() {
  const canvas = document.querySelector('#exportCanvas'); const ctx = canvas.getContext('2d');
  const width = 900, pad = 44, gap = 22, imageH = 570, top = 44, captionH = 95;
  canvas.width = width; canvas.height = pad * 2 + top + imageH * 4 + gap * 3 + captionH;
  const colors = { cream:'#f2e9dc', pink:'#f2dadd', blue:'#dce8eb', lemon:'#eee9c9', lavender:'#e6dff0' };
  const theme = document.querySelector('.swatch.active').dataset.theme;
  ctx.fillStyle = colors[theme]; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const filter = document.querySelector('.filter-chip.selected').dataset.filter;
  const filterValue = filter === 'mono' ? 'grayscale(1)' : filter === 'warm' ? 'sepia(.17) saturate(1.15) brightness(1.03)' : 'none';
  const imgs = shots.map(src => { const image = new Image(); image.src = src; return image; });
  const draw = () => {
    imgs.forEach((img, i) => { const y = pad + top + i * (imageH + gap); ctx.save(); ctx.beginPath(); ctx.rect(pad, y, width - pad * 2, imageH); ctx.clip(); ctx.filter = filterValue; const scale = Math.max((width - pad * 2) / img.width, imageH / img.height); const w = img.width * scale, h = img.height * scale; ctx.drawImage(img, (width - w) / 2, y + (imageH - h) / 2, w, h); ctx.restore(); });
    ctx.fillStyle = '#74685d'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.font = '30px "Gowun Dodum", sans-serif'; ctx.fillText(document.querySelector('#captionInput').value || 'little moments', pad + 4, canvas.height - 52);
    ctx.textAlign = 'right'; ctx.font = '22px "DM Sans", sans-serif'; ctx.fillText(new Date().toLocaleDateString('ko-KR'), width - pad - 4, canvas.height - 52);
    const link = document.createElement('a'); link.download = `네컷일기-${new Date().toISOString().slice(0,10)}.png`; link.href = canvas.toDataURL('image/png'); link.click();
  };
  let loaded = 0; imgs.forEach(img => { img.onload = () => { if (++loaded === imgs.length) draw(); }; });
}

cameraBtn.addEventListener('click', startCamera);
captureBtn.addEventListener('click', captureAll);
document.querySelector('#mirrorBtn').addEventListener('click', () => { mirrored = !mirrored; stage.classList.toggle('mirrored', mirrored); });
document.querySelectorAll('.swatch').forEach(btn => btn.addEventListener('click', () => { document.querySelector('.swatch.active')?.classList.remove('active'); btn.classList.add('active'); photoStrip.className = `photo-strip theme-${btn.dataset.theme} filter-${document.querySelector('.filter-chip.selected').dataset.filter}`; }));
document.querySelectorAll('.filter-chip').forEach(btn => btn.addEventListener('click', () => { document.querySelector('.filter-chip.selected')?.classList.remove('selected'); btn.classList.add('selected'); photoStrip.classList.remove('filter-none','filter-warm','filter-mono'); photoStrip.classList.add(`filter-${btn.dataset.filter}`); }));
document.querySelector('#captionInput').addEventListener('input', updateCaption);
downloadBtn.addEventListener('click', saveImage);
document.querySelector('#resetBtn').addEventListener('click', () => { if (stream) stream.getTracks().forEach(track => track.stop()); stream = null; shots.fill(null); video.srcObject = null; video.classList.remove('active'); stage.classList.remove('has-camera','mirrored'); placeholder.hidden = false; mirrored = false; cameraBtn.disabled = false; cameraBtn.innerHTML = '<span>◎</span> 카메라 켜기'; setStatus('카메라를 연결해주세요'); document.querySelector('#captionInput').value = ''; updateCaption(); refreshShots(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
document.querySelector('#datePreview').textContent = new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit' });
refreshShots();

// 저장 완료 안내 뒤 촬영 전 화면으로 부드럽게 돌아갑니다.
function saveImage() {
  const overlay = document.querySelector('#savingOverlay');
  const title = document.querySelector('#savingTitle');
  const message = document.querySelector('#savingMessage');
  const mark = document.querySelector('#savingMark');
  overlay.classList.remove('done');
  overlay.setAttribute('aria-hidden', 'false');
  title.textContent = '사진을 저장하고 있어요';
  message.textContent = '오늘의 네 컷을 예쁘게 정리하는 중이에요.';
  mark.textContent = '✦';
  requestAnimationFrame(() => overlay.classList.add('visible'));
  const canvas = document.querySelector('#exportCanvas');
  const ctx = canvas.getContext('2d');
  const width = 900, pad = 44, gap = 22, imageH = 570, top = 44, captionH = 95;
  canvas.width = width; canvas.height = pad * 2 + top + imageH * 4 + gap * 3 + captionH;
  const colors = { cream:'#f2e9dc', pink:'#f2dadd', blue:'#dce8eb', lemon:'#eee9c9', lavender:'#e6dff0' };
  ctx.fillStyle = colors[document.querySelector('.swatch.active').dataset.theme]; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const filter = document.querySelector('.filter-chip.selected').dataset.filter;
  const filterValue = filter === 'mono' ? 'grayscale(1)' : filter === 'warm' ? 'sepia(.17) saturate(1.15) brightness(1.03)' : 'none';
  const imgs = shots.map(src => { const image = new Image(); image.src = src; return image; });
  let loaded = 0;
  const completeSave = () => {
    imgs.forEach((img, i) => {
      const y = pad + top + i * (imageH + gap);
      ctx.save(); ctx.beginPath(); ctx.rect(pad, y, width - pad * 2, imageH); ctx.clip(); ctx.filter = filterValue;
      const scale = Math.max((width - pad * 2) / img.width, imageH / img.height);
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (width - w) / 2, y + (imageH - h) / 2, w, h); ctx.restore();
    });
    ctx.fillStyle = '#74685d'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.font = '30px "Gowun Dodum", sans-serif';
    ctx.fillText(document.querySelector('#captionInput').value || 'little moments', pad + 4, canvas.height - 52);
    ctx.textAlign = 'right'; ctx.font = '22px "DM Sans", sans-serif'; ctx.fillText(new Date().toLocaleDateString('ko-KR'), width - pad - 4, canvas.height - 52);
    const link = document.createElement('a'); link.download = `네컷일기-${new Date().toISOString().slice(0,10)}.png`; link.href = canvas.toDataURL('image/png'); link.click();
    title.textContent = '사진이 저장됐어요'; message.textContent = '잠시 후 처음 화면으로 돌아갈게요.'; mark.textContent = '✓'; overlay.classList.add('done');
    window.setTimeout(() => {
      document.querySelector('#resetBtn').click();
      overlay.classList.remove('visible', 'done'); overlay.setAttribute('aria-hidden', 'true');
    }, 1800);
  };
  imgs.forEach(img => { img.onload = () => { if (++loaded === imgs.length) completeSave(); }; img.onerror = () => { title.textContent = '저장에 실패했어요'; message.textContent = '잠시 후 다시 시도해주세요.'; overlay.classList.add('done'); }; });
}

document.querySelector('#resetBtn').addEventListener('click', () => {
  document.querySelector('.swatch.active')?.classList.remove('active');
  document.querySelector('[data-theme="cream"]').classList.add('active');
  document.querySelector('.filter-chip.selected')?.classList.remove('selected');
  document.querySelector('[data-filter="none"]').classList.add('selected');
  photoStrip.className = 'photo-strip theme-cream filter-none';
  document.querySelector('#datePreview').textContent = new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit' });
});
