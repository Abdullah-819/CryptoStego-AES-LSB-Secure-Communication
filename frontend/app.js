const encodeState = {
  originalImage: null,
  encodedBlob: null,
  isProcessing: false,
  capacityBits: 0,
  originalEntropy: 0
};

const decodeState = {
  stegoImage: null,
  isProcessing: false
};

const ui = {
  loader: document.getElementById('loader'),
  tabs: {
    encode: document.getElementById('encodeTab'),
    decode: document.getElementById('decodeTab')
  },
  sections: {
    encode: document.getElementById('encodeSection'),
    decode: document.getElementById('decodeSection')
  },
  sentinel: {
    box: document.getElementById('sentinelHeader'),
    score: document.getElementById('stegoScore'),
    capacity: document.getElementById('capacityValue'),
    entropy: document.getElementById('entropyValue'),
    charCount: document.getElementById('charCount')
  },
  encode: {
    drop: document.getElementById('dropAreaEncode'),
    input: document.getElementById('encodeImage'),
    preview: document.getElementById('encodePreview'),
    message: document.getElementById('message'),
    password: document.getElementById('password'),
    btn: document.getElementById('encodeBtn'),
    vizBtn: document.getElementById('visualizeBtn'),
    progress: document.getElementById('encodeProgress'),
    vizOutput: document.getElementById('visualOutput')
  },
  decode: {
    drop: document.getElementById('dropAreaDecode'),
    input: document.getElementById('decodeImage'),
    preview: document.getElementById('decodePreview'),
    password: document.getElementById('decodePassword'),
    btn: document.getElementById('decodeBtn'),
    progress: document.getElementById('decodeProgress'),
    output: document.getElementById('decodedMessage')
  }
};

window.addEventListener('load', () => {
  setTimeout(() => {
    ui.loader.style.opacity = '0';
    setTimeout(() => ui.loader.style.display = 'none', 500);
  }, 1200);
});

ui.tabs.encode.addEventListener('click', () => switchTab('encode'));
ui.tabs.decode.addEventListener('click', () => switchTab('decode'));

function switchTab(tab) {
  const isEncode = tab === 'encode';
  ui.tabs.encode.classList.toggle('active', isEncode);
  ui.tabs.decode.classList.toggle('active', !isEncode);
  ui.sections.encode.classList.toggle('active-section', isEncode);
  ui.sections.decode.classList.toggle('active-section', !isEncode);
}

function handleImageSelect(input, preview, callback) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    preview.src = e.target.result;
    preview.style.display = 'block';
    preview.previousElementSibling.classList.add('hidden');
    if (callback) callback(file);
  };
  reader.readAsDataURL(file);
}

function setupDropZone(dropZone, input, preview, callback) {
  dropZone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => handleImageSelect(input, preview, callback));

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-active');
  });

  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-active'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-active');
    if (e.dataTransfer.files.length) {
      input.files = e.dataTransfer.files;
      handleImageSelect(input, preview, callback);
    }
  });
}

async function analyzeImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch('/analyze', {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    if (response.ok) {
      encodeState.capacityBits = data.capacity * 8;
      encodeState.originalEntropy = data.entropy;
      
      ui.sentinel.box.classList.remove('hidden');
      ui.sentinel.capacity.textContent = (data.capacity / 1024).toFixed(1) + ' KB';
      ui.sentinel.entropy.textContent = data.entropy.toFixed(2);
      updateSentinel();
    }
  } catch (e) {
    console.error(e);
  }
}

function updateSentinel() {
  const currentLen = ui.encode.message.value.length * 8;
  const maxLen = encodeState.capacityBits;

  ui.sentinel.charCount.textContent = `${ui.encode.message.value.length} / ${Math.floor(maxLen / 8)} Bytes`;

  if (maxLen === 0) return;

  const ratio = currentLen / maxLen;
  let score = 100 - (ratio * 50);
  
  if (ratio > 1) {
    score = 0;
    ui.sentinel.score.style.color = '#f43f5e';
  } else if (ratio > 0.7) {
    ui.sentinel.score.style.color = '#f59e0b';
  } else {
    ui.sentinel.score.style.color = '#10b981';
  }

  ui.sentinel.score.textContent = Math.round(score) + '%';
}

ui.encode.message.addEventListener('input', updateSentinel);

setupDropZone(ui.encode.drop, ui.encode.input, ui.encode.preview, (file) => {
  encodeState.originalImage = file;
  ui.encode.vizBtn.disabled = true;
  analyzeImage(file);
});

setupDropZone(ui.decode.drop, ui.decode.input, ui.decode.preview, (file) => {
  decodeState.stegoImage = file;
});

ui.encode.btn.addEventListener('click', async () => {
  if (encodeState.isProcessing) return;

  const message = ui.encode.message.value.trim();
  const password = ui.encode.password.value;

  if (!encodeState.originalImage || !message || !password) {
    showToast('Missing required fields');
    return;
  }

  encodeState.isProcessing = true;
  ui.encode.progress.style.width = '20%';
  
  const formData = new FormData();
  formData.append('image', encodeState.originalImage);
  formData.append('message', message);
  formData.append('password', password);

  try {
    ui.encode.progress.style.width = '50%';
    const response = await fetch('/encode', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const blob = await response.blob();
      encodeState.encodedBlob = blob;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'stego_adaptive.png';
      a.click();
      
      ui.encode.progress.style.width = '100%';
      ui.encode.vizBtn.disabled = false;
      showToast('Adaptive Encryption Complete!');
    } else {
      const err = await response.json();
      showToast(err.error);
      ui.encode.progress.style.width = '0';
    }
  } catch (e) {
    showToast('Network error');
  } finally {
    encodeState.isProcessing = false;
  }
});

ui.encode.vizBtn.addEventListener('click', async () => {
  if (!encodeState.originalImage || !encodeState.encodedBlob) return;

  const formData = new FormData();
  formData.append('original', encodeState.originalImage);
  formData.append('encoded', encodeState.encodedBlob, 'encoded.png');

  try {
    const response = await fetch('/visualize', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      ui.encode.vizOutput.innerHTML = `
        <div class="visual-result-card">
          <p style="margin-bottom:15px; font-size:0.9rem; color:#94a3b8;">
            LSB Heatmap (Adaptive Mapping): Click & Hold to Inspect
          </p>
          <div class="img-magnifier-container">
            <img id="vizImg" src="${url}">
            <div id="vizLens" class="img-magnifier-glass"></div>
          </div>
        </div>
      `;
      
      setTimeout(() => initMagnifier('vizImg', 'vizLens'), 100);
      ui.encode.vizOutput.scrollIntoView({ behavior: 'smooth' });
    }
  } catch (e) {
    showToast('Visualization failed');
  }
});

function initMagnifier(imgID, lensID) {
  const img = document.getElementById(imgID);
  const lens = document.getElementById(lensID);
  const zoom = 10;

  function moveMagnifier(e) {
    const pos = getCursorPos(e);
    let x = pos.x;
    let y = pos.y;

    if (x > img.width) x = img.width;
    if (x < 0) x = 0;
    if (y > img.height) y = img.height;
    if (y < 0) y = 0;

    lens.style.left = x + "px";
    lens.style.top = y + "px";
    lens.style.backgroundPosition = "-" + (x * zoom - lens.offsetWidth / 2) + "px -" + (y * zoom - lens.offsetHeight / 2) + "px";
  }

  function getCursorPos(e) {
    let a, x = 0, y = 0;
    e = e || window.event;
    a = img.getBoundingClientRect();
    x = e.pageX - a.left;
    y = e.pageY - a.top;
    x = x - window.pageXOffset;
    y = y - window.pageYOffset;
    return { x: x, y: y };
  }

  lens.style.backgroundImage = "url('" + img.src + "')";
  lens.style.backgroundSize = (img.width * zoom) + "px " + (img.height * zoom) + "px";

  img.onmousemove = moveMagnifier;
  img.onmousedown = () => lens.style.display = 'block';
  img.onmouseup = () => lens.style.display = 'none';
  img.onmouseleave = () => lens.style.display = 'none';
}

ui.decode.btn.addEventListener('click', async () => {
  if (decodeState.isProcessing) return;

  const password = ui.decode.password.value;
  if (!decodeState.stegoImage || !password) {
    showToast('Image and password required');
    return;
  }

  decodeState.isProcessing = true;
  ui.decode.progress.style.width = '30%';

  const formData = new FormData();
  formData.append('image', decodeState.stegoImage);
  formData.append('password', password);

  try {
    const response = await fetch('/decode', {
      method: 'POST',
      body: formData
    });

    ui.decode.progress.style.width = '70%';
    const data = await response.json();

    if (response.ok) {
      ui.decode.output.textContent = data.message;
      ui.decode.progress.style.width = '100%';
      showToast('Decryption successful!');
    } else {
      ui.decode.output.textContent = 'Failed: ' + data.error;
      ui.decode.progress.style.width = '0';
    }
  } catch (e) {
    showToast('Communication error');
  } finally {
    decodeState.isProcessing = false;
  }
});

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = msg;
  toast.style = 'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(8px); color: white; padding: 12px 24px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); z-index: 10000; font-size: 0.9rem; pointer-events: none; animation: slideUp 0.3s ease-out;';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}