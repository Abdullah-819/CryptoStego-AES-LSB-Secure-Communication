const encodeState = {
  originalImage: null,
  encodedBlob: null,
  isProcessing: false
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

ui.tabs.encode.addEventListener('click', () => {
  ui.tabs.encode.classList.add('active');
  ui.tabs.decode.classList.remove('active');
  ui.sections.encode.classList.add('active-section');
  ui.sections.decode.classList.remove('active-section');
});

ui.tabs.decode.addEventListener('click', () => {
  ui.tabs.decode.classList.add('active');
  ui.tabs.encode.classList.remove('active');
  ui.sections.decode.classList.add('active-section');
  ui.sections.encode.classList.remove('active-section');
});

function handleImageSelect(input, preview, callback) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    preview.src = e.target.result;
    preview.style.display = 'block';
    preview.previousElementSibling.style.display = 'none';
    if (callback) callback(file);
  };
  reader.readAsDataURL(file);
}

function setupDropZone(dropZone, input, preview, callback) {
  dropZone.addEventListener('click', () => input.click());
  
  input.addEventListener('change', () => {
    handleImageSelect(input, preview, callback);
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-active');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-active');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-active');
    if (e.dataTransfer.files.length) {
      input.files = e.dataTransfer.files;
      handleImageSelect(input, preview, callback);
    }
  });
}

setupDropZone(ui.encode.drop, ui.encode.input, ui.encode.preview, (file) => {
  encodeState.originalImage = file;
  ui.encode.vizBtn.disabled = true;
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
      a.download = 'stego_encrypted.png';
      a.click();
      
      ui.encode.progress.style.width = '100%';
      ui.encode.vizBtn.disabled = false;
      showToast('Encryption & Embedding complete!');
    } else {
      const err = await response.json();
      showToast(err.error || 'Server error during encoding');
      ui.encode.progress.style.width = '0';
    }
  } catch (e) {
    showToast('Network error');
    ui.encode.progress.style.width = '0';
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
          <p style="margin-bottom:10px; font-size:0.85rem; color:#94a3b8;">LSB Modification Heatmap (Red intensity map):</p>
          <img src="${url}" style="max-width:100%; border-radius:12px;">
        </div>
      `;
      ui.encode.vizOutput.scrollIntoView({ behavior: 'smooth' });
    }
  } catch (e) {
    showToast('Visualization failed');
  }
});

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
      ui.decode.output.textContent = 'Decryption Failed: ' + (data.error || 'Invalid credentials');
      ui.decode.progress.style.width = '0';
    }
  } catch (e) {
    showToast('Communication error');
    ui.decode.progress.style.width = '0';
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
  toast.style = 'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(8px); color: white; padding: 12px 24px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5); z-index: 10000; font-size: 0.9rem; pointer-events: none; animation: slideUp 0.3s ease-out;';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}