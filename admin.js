// ============================================
// ADMIN — Firebase Auth + Storage Upload
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, listAll, deleteObject } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyDYqUo3Yg71iLjrpUKUc_snKwXl4k2CKQo",
    authDomain: "familiekring-81a32.firebaseapp.com",
    projectId: "familiekring-81a32",
    storageBucket: "familiekring-81a32.firebasestorage.app",
    messagingSenderId: "150148207168",
    appId: "1:150148207168:web:2df85620e8d28d069e45a5",
    measurementId: "G-ZB2TDD0W09"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);

// DOM elements
const fab = document.getElementById('adminFab');
const overlay = document.getElementById('adminOverlay');
const modal = document.getElementById('adminModal');
const closeBtn = document.getElementById('adminClose');
const loginView = document.getElementById('adminLogin');
const uploadView = document.getElementById('adminUpload');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('adminLogout');
const dropzone = document.getElementById('uploadDropzone');
const fileInput = document.getElementById('fileInput');
const progressContainer = document.getElementById('uploadProgress');
const progressFill = document.getElementById('uploadProgressFill');
const progressText = document.getElementById('uploadProgressText');
const galleryGrid = document.getElementById('galleryGrid');
const galleryEmpty = document.getElementById('galleryEmpty');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// --- Modal open / close ---
fab.addEventListener('click', () => {
    overlay.classList.add('active');
});

closeBtn.addEventListener('click', closeModal);

overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

function closeModal() {
    overlay.classList.remove('active');
}

// --- Auth state ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        showUploadView();
        loadGallery();
    } else {
        showLoginView();
    }
});

function showLoginView() {
    loginView.classList.remove('admin-hidden');
    uploadView.classList.add('admin-hidden');
    fab.classList.remove('authenticated');
}

function showUploadView() {
    loginView.classList.add('admin-hidden');
    uploadView.classList.remove('admin-hidden');
    fab.classList.add('authenticated');
}

// --- Login ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
        const messages = {
            'auth/invalid-credential': 'Invalid email or password.',
            'auth/user-not-found': 'No account found with this email.',
            'auth/wrong-password': 'Incorrect password.',
            'auth/too-many-requests': 'Too many attempts. Please try again later.',
            'auth/invalid-email': 'Please enter a valid email address.'
        };
        loginError.textContent = messages[err.code] || 'Login failed. Please try again.';
    }
});

// --- Logout ---
logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// --- Drag & drop ---
dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', () => {
    handleFiles(fileInput.files);
    fileInput.value = '';
});

// --- File upload ---
function handleFiles(files) {
    if (!auth.currentUser) return;

    for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
            alert(`"${file.name}" exceeds 10 MB limit.`);
            continue;
        }
        uploadFile(file);
    }
}

function uploadFile(file) {
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `uploads/${timestamp}_${safeName}`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type
    });

    progressContainer.classList.remove('admin-hidden');

    uploadTask.on('state_changed',
        (snapshot) => {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            progressFill.style.width = pct + '%';
            progressText.textContent = `Uploading ${file.name}... ${pct}%`;
        },
        (error) => {
            progressText.textContent = `Upload failed: ${error.message}`;
            setTimeout(() => progressContainer.classList.add('admin-hidden'), 3000);
        },
        async () => {
            progressText.textContent = 'Upload complete!';
            progressFill.style.width = '100%';
            setTimeout(() => {
                progressContainer.classList.add('admin-hidden');
                progressFill.style.width = '0%';
            }, 2000);
            loadGallery();
        }
    );
}

// --- Gallery ---
async function loadGallery() {
    const listRef = ref(storage, 'uploads');
    galleryGrid.innerHTML = '';

    try {
        const result = await listAll(listRef);

        if (result.items.length === 0) {
            galleryEmpty.style.display = 'block';
            return;
        }

        galleryEmpty.style.display = 'none';

        // Sort by name (which includes timestamp prefix)
        const sorted = result.items.sort((a, b) => b.name.localeCompare(a.name));

        for (const itemRef of sorted) {
            const url = await getDownloadURL(itemRef);
            const name = itemRef.name.replace(/^\d+_/, '');
            const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name);

            const el = document.createElement('div');
            el.className = 'gallery-item';

            if (isImage) {
                el.innerHTML = `
                    <img src="${url}" alt="${name}" loading="lazy">
                    <div class="gallery-item-actions">
                        <a href="${url}" target="_blank" rel="noopener"><button class="gallery-action-download" title="Open"><i class="fas fa-external-link-alt"></i></button></a>
                        <button class="gallery-action-delete" title="Delete" data-path="${itemRef.fullPath}"><i class="fas fa-trash"></i></button>
                    </div>
                `;
            } else {
                const icon = getFileIcon(name);
                el.innerHTML = `
                    <div class="gallery-item-file">
                        <i class="fas ${icon}"></i>
                        <span>${name}</span>
                    </div>
                    <div class="gallery-item-actions">
                        <a href="${url}" target="_blank" rel="noopener"><button class="gallery-action-download" title="Download"><i class="fas fa-download"></i></button></a>
                        <button class="gallery-action-delete" title="Delete" data-path="${itemRef.fullPath}"><i class="fas fa-trash"></i></button>
                    </div>
                `;
            }

            // Delete handler
            el.querySelector('.gallery-action-delete').addEventListener('click', async (e) => {
                const path = e.currentTarget.dataset.path;
                if (confirm(`Delete "${name}"?`)) {
                    try {
                        await deleteObject(ref(storage, path));
                        loadGallery();
                    } catch (err) {
                        alert('Delete failed: ' + err.message);
                    }
                }
            });

            galleryGrid.appendChild(el);
        }
    } catch (err) {
        if (err.code === 'storage/object-not-found') {
            galleryEmpty.style.display = 'block';
        } else {
            console.error('Gallery load error:', err);
        }
    }
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        pdf: 'fa-file-pdf',
        doc: 'fa-file-word', docx: 'fa-file-word',
        xls: 'fa-file-excel', xlsx: 'fa-file-excel',
        ppt: 'fa-file-powerpoint', pptx: 'fa-file-powerpoint',
        zip: 'fa-file-archive', rar: 'fa-file-archive',
        txt: 'fa-file-alt', csv: 'fa-file-csv'
    };
    return icons[ext] || 'fa-file';
}
