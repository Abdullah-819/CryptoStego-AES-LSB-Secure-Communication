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
  currentStatus: document.getElementById('currentStatus'),
  processStep: document.getElementById('processStep'),
  
  // Sidebar Tabs
  tabs: {
    encode: document.getElementById('encodeTab'),
    decode: document.getElementById('decodeTab')
  },
  
  // Sidebar Modules
  modules: {
    encode: document.getElementById('encodeInputs'),
    decode: document.getElementById('decodeInputs')
  },

  // System Metrics
  metrics: {
    capacity: document.getElementById('capacityValue'),
    entropy: document.getElementById('entropyValue'),
    score: document.getElementById('stegoScore'),
    charCount: document.getElementById('charCount')
  },

  // Progress UI
  progress: {
    circle: document.getElementById('progressCircle'),
    percentage: document.getElementById('progressPercentage'),
    linear: document.getElementById('linearProgressFill')
  },

  // Cards & Tabs
  cards: {
    resultsTab: document.getElementById('resultsTabBtn'),
    vizTab: document.getElementById('vizTabBtn'),
    resultsContent: document.getElementById('resultsContent'),
    vizContent: document.getElementById('vizContent'),
    emptyResults: document.getElementById('emptyResults')
  },

  // Encode Specific
  encode: {
    drop: document.getElementById('dropAreaEncode'),
    input: document.getElementById('encodeImage'),
    preview: document.getElementById('encodePreview'),
    message: document.getElementById('message'),
    password: document.getElementById('password'),
    btn: document.getElementById('encodeBtn'),
    vizOutput: document.getElementById('visualOutput')
  },

  // Decode Specific
  decode: {
    drop: document.getElementById('dropAreaDecode'),
    input: document.getElementById('decodeImage'),
    preview: document.getElementById('decodePreview'),
    password: document.getElementById('decodePassword'),
    btn: document.getElementById('decodeBtn'),
    container: document.getElementById('decodedMessageContainer'),
    output: document.getElementById('decodedMessage')
  }
};

// Initial State
window.addEventListener('load', () => {
  setTimeout(() => {
    ui.loader.style.opacity = '0';
    setTimeout(() => ui.loader.style.display = 'none', 500);
  }, 1000);
  
  // Set circle radius/circumference
  const radius = ui.progress.circle.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  ui.progress.circle.style.strokeDasharray = `${circumference} ${circumference}`;
  ui.progress.circle.style.strokeDashoffset = circumference;
});

// Sidebar Tab Switching
ui.tabs.encode.addEventListener('click', () => switchSidebarModule('encode'));
ui.tabs.decode.addEventListener('click', () => switchSidebarModule('decode'));

function switchSidebarModule(module) {
  const isEncode = module === 'encode';
  ui.tabs.encode.classList.toggle('active', isEncode);
  ui.tabs.decode.classList.toggle('active', !isEncode);
  ui.modules.encode.classList.toggle('active', isEncode);
  ui.modules.decode.classList.toggle('active', !isEncode);
  
  ui.currentStatus.textContent = isEncode ? 'Encoding' : 'Decoding';
  resetProgress();
}

// Right Panel Tab Switching
ui.cards.resultsTab.addEventListener('click', () => switchContentTab('results'));
ui.cards.vizTab.addEventListener('click', () => switchContentTab('viz'));

function switchContentTab(tab) {
  const isResults = tab === 'results';
  ui.cards.resultsTab.classList.toggle('active', isResults);
  ui.cards.vizTab.classList.toggle('active', !isResults);
  ui.cards.resultsContent.classList.toggle('active', isResults);
  ui.cards.vizContent.classList.toggle('active', !isResults);
}

// Progress Updates
function setProgress(percent, stepText) {
  percent = Math.min(100, Math.max(0, percent));
  
  // Update Percentage Text
  ui.progress.percentage.textContent = `${Math.round(percent)}%`;
  
  // Update Linear Fill
  ui.progress.linear.style.width = `${percent}%`;
  
  // Update Circle
  const radius = ui.progress.circle.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100 * circumference);
  ui.progress.circle.style.strokeDashoffset = offset;
  
  if (stepText) ui.processStep.textContent = stepText;
}

function resetProgress() {
  setProgress(0, 'Waiting for input...');
}

// Image Handling
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

// Analysis API
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
      
      ui.metrics.capacity.textContent = (data.capacity / 1024).toFixed(1) + ' KB';
      ui.metrics.entropy.textContent = data.entropy.toFixed(2);
      updateSentinel();
      ui.processStep.textContent = 'Analysis Complete. Ready to encode.';
    }
  } catch (e) {
    console.error(e);
  }
}

function updateSentinel() {
  const currentLen = ui.encode.message.value.length * 8;
  const maxLen = encodeState.capacityBits;

  ui.metrics.charCount.textContent = `${ui.encode.message.value.length} / ${Math.floor(maxLen / 8)} B`;

  if (maxLen === 0) return;

  const ratio = currentLen / maxLen;
  let score = 100 - (ratio * 50);
  
  if (ratio > 1) {
    score = 0;
    ui.metrics.score.style.color = '#f43f5e';
  } else if (ratio > 0.7) {
    ui.metrics.score.style.color = '#f59e0b';
  } else {
    ui.metrics.score.style.color = '#10b981';
  }

  ui.metrics.score.textContent = Math.round(score) + '%';
}

ui.encode.message.addEventListener('input', updateSentinel);

setupDropZone(ui.encode.drop, ui.encode.input, ui.encode.preview, (file) => {
  encodeState.originalImage = file;
  ui.cards.vizTab.disabled = true;
  analyzeImage(file);
});

setupDropZone(ui.decode.drop, ui.decode.input, ui.decode.preview, (file) => {
  decodeState.stegoImage = file;
  ui.processStep.textContent = 'Decryption image loaded.';
});

// Core Actions
ui.encode.btn.addEventListener('click', async () => {
  if (encodeState.isProcessing) return;

  const message = ui.encode.message.value.trim();
  const password = ui.encode.password.value;

  if (!encodeState.originalImage || !message || !password) {
    showToast('Missing required fields');
    return;
  }

  encodeState.isProcessing = true;
  setProgress(20, 'Encrypting using AES-256...');
  
  const formData = new FormData();
  formData.append('image', encodeState.originalImage);
  formData.append('message', message);
  formData.append('password', password);

  try {
    setProgress(50, 'Embedding bits into LSB-1...');
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
      a.download = 'stego_output.png';
      a.click();
      
      setProgress(100, 'Security Export Successful!');
      ui.cards.vizTab.disabled = false;
      showToast('Encoded Image Exported!');
      
      // Automatic visualization request
      requestVisualization();
    } else {
      const err = await response.json();
      showToast(err.error);
      setProgress(0, 'Failed.');
    }
  } catch (e) {
    showToast('Network error');
    setProgress(0, 'Error.');
  } finally {
    encodeState.isProcessing = false;
  }
});

async function requestVisualization() {
  if (!encodeState.originalImage || !encodeState.encodedBlob) return;
  
  ui.processStep.textContent = 'Generating LSB difference map...';
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
        <div class="img-magnifier-container">
          <img id="vizImg" src="${url}" style="max-width:100%; border-radius:12px;">
          <div id="vizLens" class="img-magnifier-glass"></div>
        </div>
      `;
      
      ui.cards.emptyResults.classList.add('hidden');
      switchContentTab('viz');
      setTimeout(() => initMagnifier('vizImg', 'vizLens'), 200);
    }
  } catch (e) {
    console.error('Viz failed', e);
  }
}

ui.decode.btn.addEventListener('click', async () => {
  if (decodeState.isProcessing) return;

  const password = ui.decode.password.value;
  if (!decodeState.stegoImage || !password) {
    showToast('Image and password required');
    return;
  }

  decodeState.isProcessing = true;
  setProgress(30, 'Extracting LSB patterns...');

  const formData = new FormData();
  formData.append('image', decodeState.stegoImage);
  formData.append('password', password);

  try {
    const response = await fetch('/decode', {
      method: 'POST',
      body: formData
    });

    setProgress(70, 'AES Decryption in progress...');
    const data = await response.json();

    if (response.ok) {
      ui.decode.output.textContent = data.message;
      ui.decode.container.classList.remove('hidden');
      ui.cards.emptyResults.classList.add('hidden');
      switchContentTab('results');
      setProgress(100, 'Message Recovered!');
      showToast('Extraction Complete!');
    } else {
      ui.decode.output.textContent = 'Failed: ' + data.error;
      setProgress(0, 'Authentication Failed.');
      showToast(data.error);
    }
  } catch (e) {
    showToast('Communication error');
  } finally {
    decodeState.isProcessing = false;
  }
});

function initMagnifier(imgID, lensID) {
  const img = document.getElementById(imgID);
  const lens = document.getElementById(lensID);
  if (!img || !lens) return;
  
  const zoom = 5;

  function moveMagnifier(e) {
    const pos = getCursorPos(e);
    let x = pos.x;
    let y = pos.y;

    if (x > img.width) x = img.width;
    if (x < 0) x = 0;
    if (y > img.height) y = img.height;
    if (y < 0) y = 0;

    lens.style.left = (x - lens.offsetWidth / 2) + "px";
    lens.style.top = (y - lens.offsetHeight / 2) + "px";
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
  lens.style.display = 'block';

  img.addEventListener('mousemove', moveMagnifier);
  img.addEventListener('touchmove', moveMagnifier);
}

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = msg;
  toast.style = 'position: fixed; bottom: 30px; right: 30px; background: rgba(30, 41, 59, 0.9); backdrop-filter: blur(10px); color: white; padding: 15px 25px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); z-index: 10000; font-size: 0.9rem; animation: slideIn 0.3s ease-out; box-shadow: 0 10px 30px rgba(0,0,0,0.3);';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// Global fade animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
`;
document.head.appendChild(style);