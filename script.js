// ==================== DOM ELEMENTS ====================
const compressTab = document.getElementById('compressTab');
const mergeTab = document.getElementById('mergeTab');
const splitTab = document.getElementById('splitTab');
const imageTab = document.getElementById('imageTab');
const extractTab = document.getElementById('extractTab');
const compressMode = document.getElementById('compressMode');
const mergeMode = document.getElementById('mergeMode');
const splitMode = document.getElementById('splitMode');
const imageMode = document.getElementById('imageMode');
const extractMode = document.getElementById('extractMode');

// --- Compress ---
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileNameDisplay = document.getElementById('fileName');
const compressBtn = document.getElementById('compressBtn');
const qualitySelect = document.getElementById('qualitySelect');

// --- Merge ---
const mergeDropZone = document.getElementById('mergeDropZone');
const mergeFileInput = document.getElementById('mergeFileInput');
const mergeFileList = document.getElementById('mergeFileList');
const fileListItems = document.getElementById('fileListItems');
const mergeBtn = document.getElementById('mergeBtn');

// --- Split ---
const splitDropZone = document.getElementById('splitDropZone');
const splitFileInput = document.getElementById('splitFileInput');
const splitFileInfo = document.getElementById('splitFileInfo');
const splitFileName = document.getElementById('splitFileName');
const pageRangeInput = document.getElementById('pageRange');
const splitBtn = document.getElementById('splitBtn');

// --- Image ---
const imageDropZone = document.getElementById('imageDropZone');
const imageFileInput = document.getElementById('imageFileInput');
const imageFileInfo = document.getElementById('imageFileInfo');
const imageFileName = document.getElementById('imageFileName');
const imageFormat = document.getElementById('imageFormat');
const imageDpi = document.getElementById('imageDpi');
const imageBtn = document.getElementById('imageBtn');

// --- Extract Text ---
const extractDropZone = document.getElementById('extractDropZone');
const extractFileInput = document.getElementById('extractFileInput');
const extractFileInfo = document.getElementById('extractFileInfo');
const extractFileName = document.getElementById('extractFileName');
const extractRange = document.getElementById('extractRange');
const extractBtn = document.getElementById('extractBtn');

// ==================== STATE ====================
let currentFile = null;      // Compress
let mergeFiles = [];         // Merge
let splitFile = null;        // Split
let imageFile = null;        // Image
let extractFile = null;      // Extract Text

// ==================== TAB SWITCHING ====================
function switchTab(activeTab) {
    [compressTab, mergeTab, splitTab, imageTab, extractTab].forEach(t => t.classList.remove('active'));
    activeTab.classList.add('active');
    compressMode.style.display = (activeTab === compressTab) ? 'block' : 'none';
    mergeMode.style.display = (activeTab === mergeTab) ? 'block' : 'none';
    splitMode.style.display = (activeTab === splitTab) ? 'block' : 'none';
    imageMode.style.display = (activeTab === imageTab) ? 'block' : 'none';
    extractMode.style.display = (activeTab === extractTab) ? 'block' : 'none';
}

compressTab.addEventListener('click', () => switchTab(compressTab));
mergeTab.addEventListener('click', () => switchTab(mergeTab));
splitTab.addEventListener('click', () => switchTab(splitTab));
imageTab.addEventListener('click', () => switchTab(imageTab));
extractTab.addEventListener('click', () => switchTab(extractTab));

// ==================== COMPRESS LOGIC ====================
fileInput.addEventListener('change', function(e) {
    if (e.target.files[0]) handleCompressFile(e.target.files[0]);
});

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); });
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const f = e.dataTransfer.files[0];
    if (f && f.type === 'application/pdf') handleCompressFile(f);
    else alert('Please drop a PDF!');
});

function handleCompressFile(file) {
    currentFile = file;
    fileInfo.style.display = 'block';
    fileNameDisplay.textContent = `📎 ${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`;
    compressBtn.textContent = '🗜️ Compress PDF';
    compressBtn.disabled = false;
}

compressBtn.addEventListener('click', async function(e) {
    e.preventDefault();
    if (!currentFile) return alert('Select a PDF first.');
    compressBtn.disabled = true;
    compressBtn.textContent = '⏳ Compressing...';
    try {
        const fd = new FormData();
        fd.append('file', currentFile);
        fd.append('quality', qualitySelect.value);
        const res = await fetch('http://127.0.0.1:8000/compress-pdf/', { method: 'POST', body: fd });
        if (!res.ok) throw new Error(await res.text());
        const blob = await res.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'compressed_' + currentFile.name;
        link.click();
        URL.revokeObjectURL(link.href);
        compressBtn.textContent = '✅ Done!';
        setTimeout(() => { compressBtn.textContent = '🗜️ Compress PDF'; compressBtn.disabled = false; }, 2000);
    } catch (err) {
        alert('Error: ' + err.message);
        compressBtn.textContent = '❌ Retry';
        compressBtn.disabled = false;
    }
});

// ==================== MERGE LOGIC ====================
mergeFileInput.addEventListener('change', function(e) {
    for (let f of e.target.files) addMergeFile(f);
    mergeFileInput.value = '';
});

mergeDropZone.addEventListener('dragover', (e) => { e.preventDefault(); mergeDropZone.classList.add('dragover'); });
mergeDropZone.addEventListener('dragleave', (e) => { e.preventDefault(); mergeDropZone.classList.remove('dragover'); });
mergeDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    mergeDropZone.classList.remove('dragover');
    for (let f of e.dataTransfer.files) {
        if (f.type === 'application/pdf') addMergeFile(f);
        else alert('Skipping non-PDF: ' + f.name);
    }
});

function addMergeFile(file) {
    if (mergeFiles.some(f => f.name === file.name && f.size === file.size)) {
        alert(`"${file.name}" already in list.`);
        return;
    }
    mergeFiles.push(file);
    renderMergeList();
}

function renderMergeList() {
    fileListItems.innerHTML = '';
    if (mergeFiles.length === 0) { mergeFileList.style.display = 'none'; return; }
    mergeFileList.style.display = 'block';
    mergeFiles.forEach((file, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${i+1}. ${file.name} (${(file.size/1024/1024).toFixed(2)} MB)</span><button data-index="${i}">✕</button>`;
        li.querySelector('button').addEventListener('click', (e) => {
            mergeFiles.splice(parseInt(e.target.dataset.index), 1);
            renderMergeList();
        });
        fileListItems.appendChild(li);
    });
}

mergeBtn.addEventListener('click', async function(e) {
    e.preventDefault();
    if (mergeFiles.length < 2) return alert('Add at least 2 PDFs.');
    mergeBtn.disabled = true;
    mergeBtn.textContent = '⏳ Merging...';
    try {
        const fd = new FormData();
        mergeFiles.forEach(f => fd.append('files', f));
        const res = await fetch('http://127.0.0.1:8000/merge-pdf/', { method: 'POST', body: fd });
        if (!res.ok) throw new Error(await res.text());
        const blob = await res.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'merged_output.pdf';
        link.click();
        URL.revokeObjectURL(link.href);
        mergeFiles = [];
        renderMergeList();
        mergeBtn.textContent = '✅ Merged!';
        setTimeout(() => { mergeBtn.textContent = '🔗 Merge All PDFs'; mergeBtn.disabled = false; }, 2000);
    } catch (err) {
        alert('Error: ' + err.message);
        mergeBtn.textContent = '❌ Retry';
        mergeBtn.disabled = false;
    }
});

// ==================== SPLIT LOGIC ====================
splitFileInput.addEventListener('change', function(e) {
    if (e.target.files[0]) handleSplitFile(e.target.files[0]);
});

splitDropZone.addEventListener('dragover', (e) => { e.preventDefault(); splitDropZone.classList.add('dragover'); });
splitDropZone.addEventListener('dragleave', (e) => { e.preventDefault(); splitDropZone.classList.remove('dragover'); });
splitDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    splitDropZone.classList.remove('dragover');
    const f = e.dataTransfer.files[0];
    if (f && f.type === 'application/pdf') handleSplitFile(f);
    else alert('Please drop a PDF!');
});

function handleSplitFile(file) {
    splitFile = file;
    splitFileInfo.style.display = 'block';
    splitFileName.textContent = `📎 ${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`;
    splitBtn.textContent = '✂️ Split PDF';
    splitBtn.disabled = false;
}

splitBtn.addEventListener('click', async function(e) {
    e.preventDefault();
    if (!splitFile) return alert('Select a PDF first.');
    const range = pageRangeInput.value.trim();
    if (!range) return alert('Please enter a page range (e.g. 1-3, 5, 7-10).');

    splitBtn.disabled = true;
    splitBtn.textContent = '⏳ Splitting...';

    try {
        const fd = new FormData();
        fd.append('file', splitFile);
        fd.append('range', range);
        const res = await fetch('http://127.0.0.1:8000/split-pdf/', { method: 'POST', body: fd });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || 'Server error');
        }
        const blob = await res.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'split_' + splitFile.name;
        link.click();
        URL.revokeObjectURL(link.href);
        splitBtn.textContent = '✅ Done!';
        setTimeout(() => { splitBtn.textContent = '✂️ Split PDF'; splitBtn.disabled = false; }, 2000);
    } catch (err) {
        alert('Error: ' + err.message);
        splitBtn.textContent = '❌ Retry';
        splitBtn.disabled = false;
    }
});

// ==================== PDF TO IMAGES LOGIC ====================
imageFileInput.addEventListener('change', function(e) {
    if (e.target.files[0]) handleImageFile(e.target.files[0]);
});

imageDropZone.addEventListener('dragover', (e) => { e.preventDefault(); imageDropZone.classList.add('dragover'); });
imageDropZone.addEventListener('dragleave', (e) => { e.preventDefault(); imageDropZone.classList.remove('dragover'); });
imageDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    imageDropZone.classList.remove('dragover');
    const f = e.dataTransfer.files[0];
    if (f && f.type === 'application/pdf') handleImageFile(f);
    else alert('Please drop a PDF!');
});

function handleImageFile(file) {
    imageFile = file;
    imageFileInfo.style.display = 'block';
    imageFileName.textContent = `📎 ${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`;
    imageBtn.textContent = '🖼️ Convert to Images (ZIP)';
    imageBtn.disabled = false;
}

imageBtn.addEventListener('click', async function(e) {
    e.preventDefault();
    if (!imageFile) return alert('Select a PDF first.');

    imageBtn.disabled = true;
    imageBtn.textContent = '⏳ Converting...';

    try {
        const fd = new FormData();
        fd.append('file', imageFile);
        fd.append('format', imageFormat.value);
        fd.append('dpi', imageDpi.value);

        const res = await fetch('http://127.0.0.1:8000/pdf-to-images/', { method: 'POST', body: fd });
        if (!res.ok) throw new Error(await res.text());

        const blob = await res.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const baseName = imageFile.name.replace(/\.pdf$/i, '');
        link.download = `images_${baseName}.zip`;
        link.click();
        URL.revokeObjectURL(link.href);

        imageBtn.textContent = '✅ Done!';
        setTimeout(() => { imageBtn.textContent = '🖼️ Convert to Images (ZIP)'; imageBtn.disabled = false; }, 2000);
    } catch (err) {
        alert('Error: ' + err.message);
        imageBtn.textContent = '❌ Retry';
        imageBtn.disabled = false;
    }
});

// ==================== EXTRACT TEXT LOGIC ====================
extractFileInput.addEventListener('change', function(e) {
    if (e.target.files[0]) handleExtractFile(e.target.files[0]);
});

extractDropZone.addEventListener('dragover', (e) => { e.preventDefault(); extractDropZone.classList.add('dragover'); });
extractDropZone.addEventListener('dragleave', (e) => { e.preventDefault(); extractDropZone.classList.remove('dragover'); });
extractDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    extractDropZone.classList.remove('dragover');
    const f = e.dataTransfer.files[0];
    if (f && f.type === 'application/pdf') handleExtractFile(f);
    else alert('Please drop a PDF!');
});

function handleExtractFile(file) {
    extractFile = file;
    extractFileInfo.style.display = 'block';
    extractFileName.textContent = `📎 ${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`;
    extractBtn.textContent = '📄 Extract Text (.txt)';
    extractBtn.disabled = false;
}

extractBtn.addEventListener('click', async function(e) {
    e.preventDefault();
    if (!extractFile) return alert('Select a PDF first.');

    extractBtn.disabled = true;
    extractBtn.textContent = '⏳ Extracting...';

    try {
        const fd = new FormData();
        fd.append('file', extractFile);
        const range = extractRange.value.trim();
        fd.append('range', range); // sends blank if empty

        const res = await fetch('http://127.0.0.1:8000/extract-text/', { method: 'POST', body: fd });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || 'Server error');
        }

        const blob = await res.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const baseName = extractFile.name.replace(/\.pdf$/i, '');
        link.download = `text_${baseName}.txt`;
        link.click();
        URL.revokeObjectURL(link.href);

        extractBtn.textContent = '✅ Done!';
        setTimeout(() => { extractBtn.textContent = '📄 Extract Text (.txt)'; extractBtn.disabled = false; }, 2000);
    } catch (err) {
        alert('Error: ' + err.message);
        extractBtn.textContent = '❌ Retry';
        extractBtn.disabled = false;
    }
});