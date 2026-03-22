/*  ========================================================
    Familiekring — Private Family Journal App
    ========================================================
    All data is stored in localStorage. This is a self-contained
    client-side application. For production use, replace the
    storage layer with a real backend / database.
    ======================================================== */

(function () {
    'use strict';

    // ── Storage keys ──
    const KEYS = {
        users: 'fk_users',
        posts: 'fk_posts',
        session: 'fk_session',
    };

    // ── Default admin account (created on first visit) ──
    const DEFAULT_ADMIN = {
        id: generateId(),
        name: 'Admin',
        email: 'admin@familiekring.nl',
        password: 'admin123',      // Change on first login!
        role: 'admin',
        status: 'approved',
        createdAt: new Date().toISOString(),
    };

    // ── Helpers ──
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    }

    function getStore(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || null;
        } catch {
            return null;
        }
    }

    function setStore(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    function getUsers() {
        return getStore(KEYS.users) || [];
    }

    function getPosts() {
        return getStore(KEYS.posts) || [];
    }

    function saveUsers(users) {
        setStore(KEYS.users, users);
    }

    function savePosts(posts) {
        setStore(KEYS.posts, posts);
    }

    function getCurrentUser() {
        return getStore(KEYS.session);
    }

    function setCurrentUser(user) {
        setStore(KEYS.session, user);
    }

    function clearSession() {
        localStorage.removeItem(KEYS.session);
    }

    function getInitials(name) {
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }

    function formatDate(iso) {
        const d = new Date(iso);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        const hours = d.getHours().toString().padStart(2, '0');
        const mins = d.getMinutes().toString().padStart(2, '0');
        return `${day}-${month}-${year} om ${hours}:${mins}`;
    }

    function showToast(message) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ── Initialise default admin if no users exist ──
    function initData() {
        const users = getUsers();
        if (users.length === 0) {
            saveUsers([DEFAULT_ADMIN]);
        }
    }

    // ── DOM references ──
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const loginScreen   = $('#login-screen');
    const appScreen     = $('#app-screen');
    const loginForm     = $('#login-form');
    const registerForm  = $('#register-form');
    const pendingMsg    = $('#pending-message');
    const showRegLink   = $('#show-register');
    const showLoginLink = $('#show-login');
    const backToLogin   = $('#back-to-login');
    const userGreeting  = $('#user-greeting');
    const adminBtn      = $('#admin-btn');
    const logoutBtn     = $('#logout-btn');
    const newPostBtn    = $('#new-post-btn');
    const postsFeed     = $('#posts-feed');
    const emptyFeed     = $('#empty-feed');

    // Modals
    const postModal     = $('#post-modal');
    const postForm      = $('#post-form');
    const modalTitle    = $('#modal-title');
    const postText      = $('#post-text');
    const postPhoto     = $('#post-photo');
    const uploadPlaceholder = $('#upload-placeholder');
    const uploadPreview = $('#upload-preview');
    const previewImg    = $('#preview-img');
    const removePhotoBtn = $('#remove-photo');
    const modalClose    = $('#modal-close');
    const cancelPost    = $('#cancel-post');

    const adminModal    = $('#admin-modal');
    const adminClose    = $('#admin-close');
    const adminUsersList = $('#admin-users-list');

    const deleteModal   = $('#delete-modal');
    const cancelDelete  = $('#cancel-delete');
    const confirmDelete = $('#confirm-delete');

    // ── State ──
    let editingPostId = null;
    let deletingPostId = null;
    let currentPhotoData = null;

    // ══════════════════════════════════════════════
    //  AUTH
    // ══════════════════════════════════════════════

    function showScreen(screen) {
        loginScreen.classList.remove('active');
        appScreen.classList.remove('active');
        screen.classList.add('active');
    }

    showRegLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        pendingMsg.classList.add('hidden');
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        pendingMsg.classList.add('hidden');
    });

    backToLogin.addEventListener('click', () => {
        pendingMsg.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    // Login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = $('#login-email').value.trim().toLowerCase();
        const password = $('#login-password').value;

        const users = getUsers();
        const user = users.find(u => u.email === email && u.password === password);

        if (!user) {
            showToast('Ongeldig e-mailadres of wachtwoord');
            return;
        }
        if (user.status !== 'approved') {
            showToast('Je account wacht nog op goedkeuring');
            return;
        }

        setCurrentUser(user);
        loginForm.reset();
        enterApp(user);
    });

    // Register
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = $('#reg-name').value.trim();
        const email = $('#reg-email').value.trim().toLowerCase();
        const password = $('#reg-password').value;

        const users = getUsers();
        if (users.find(u => u.email === email)) {
            showToast('Er bestaat al een account met dit e-mailadres');
            return;
        }

        const newUser = {
            id: generateId(),
            name,
            email,
            password,
            role: 'member',
            status: 'pending',
            createdAt: new Date().toISOString(),
        };

        users.push(newUser);
        saveUsers(users);
        registerForm.reset();
        registerForm.classList.add('hidden');
        pendingMsg.classList.remove('hidden');
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        clearSession();
        showScreen(loginScreen);
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        pendingMsg.classList.add('hidden');
    });

    // Enter app
    function enterApp(user) {
        showScreen(appScreen);
        userGreeting.textContent = `Hallo, ${user.name.split(' ')[0]}`;
        adminBtn.style.display = user.role === 'admin' ? 'inline-flex' : 'none';
        renderFeed();
    }

    // Auto-login on page load
    function checkSession() {
        const user = getCurrentUser();
        if (user && user.status === 'approved') {
            // Re-validate from store (admin may have revoked)
            const users = getUsers();
            const fresh = users.find(u => u.id === user.id && u.status === 'approved');
            if (fresh) {
                setCurrentUser(fresh);
                enterApp(fresh);
                return;
            }
        }
        clearSession();
        showScreen(loginScreen);
    }

    // ══════════════════════════════════════════════
    //  POSTS / FEED
    // ══════════════════════════════════════════════

    function renderFeed() {
        const posts = getPosts().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const user = getCurrentUser();

        if (posts.length === 0) {
            postsFeed.innerHTML = '';
            emptyFeed.classList.remove('hidden');
            return;
        }

        emptyFeed.classList.add('hidden');
        postsFeed.innerHTML = posts.map(post => {
            const isOwner = user && user.id === post.authorId;
            const isAdmin = user && user.role === 'admin';

            const actionsHtml = (isOwner || isAdmin) ? `
                <div class="post-actions">
                    ${isOwner ? `<button class="btn-icon" title="Bewerken" onclick="app.editPost('${post.id}')">
                        <i class="fas fa-pen"></i>
                    </button>` : ''}
                    <button class="btn-icon" title="Verwijderen" onclick="app.deletePost('${post.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>` : '';

            const imageHtml = post.photo
                ? `<img src="${post.photo}" alt="Foto" class="post-image">`
                : '';

            const textHtml = post.text
                ? `<div class="post-text">${escapeHtml(post.text)}</div>`
                : '';

            const editedTag = post.editedAt
                ? ` <span style="font-style:italic;">(bewerkt ${formatDate(post.editedAt)})</span>`
                : '';

            return `
            <article class="post-card" data-id="${post.id}">
                <div class="post-header">
                    <div class="post-author-info">
                        <div class="author-avatar">${getInitials(post.authorName)}</div>
                        <div>
                            <div class="author-name">${escapeHtml(post.authorName)}</div>
                            <div class="post-time">
                                <i class="fas fa-clock"></i> ${formatDate(post.createdAt)}${editedTag}
                            </div>
                        </div>
                    </div>
                    ${actionsHtml}
                </div>
                ${imageHtml}
                ${textHtml}
            </article>`;
        }).join('');
    }

    // ══════════════════════════════════════════════
    //  POST MODAL (Create / Edit)
    // ══════════════════════════════════════════════

    function openPostModal(post) {
        editingPostId = post ? post.id : null;
        modalTitle.textContent = post ? 'Bericht bewerken' : 'Nieuw bericht';
        postText.value = post ? post.text || '' : '';
        currentPhotoData = post ? post.photo || null : null;

        if (currentPhotoData) {
            previewImg.src = currentPhotoData;
            uploadPreview.classList.remove('hidden');
            uploadPlaceholder.classList.add('hidden');
        } else {
            uploadPreview.classList.add('hidden');
            uploadPlaceholder.classList.remove('hidden');
        }

        postPhoto.value = '';
        postModal.classList.remove('hidden');
    }

    function closePostModal() {
        postModal.classList.add('hidden');
        editingPostId = null;
        currentPhotoData = null;
        postForm.reset();
        uploadPreview.classList.add('hidden');
        uploadPlaceholder.classList.remove('hidden');
    }

    newPostBtn.addEventListener('click', () => openPostModal(null));
    modalClose.addEventListener('click', closePostModal);
    cancelPost.addEventListener('click', closePostModal);
    postModal.querySelector('.modal-overlay').addEventListener('click', closePostModal);

    // Photo preview
    postPhoto.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showToast('Foto mag maximaal 5 MB zijn');
            postPhoto.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            currentPhotoData = ev.target.result;
            previewImg.src = currentPhotoData;
            uploadPreview.classList.remove('hidden');
            uploadPlaceholder.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    });

    removePhotoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        currentPhotoData = null;
        postPhoto.value = '';
        uploadPreview.classList.add('hidden');
        uploadPlaceholder.classList.remove('hidden');
    });

    // Submit post
    postForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = postText.value.trim();
        const photo = currentPhotoData;

        if (!text && !photo) {
            showToast('Voeg tekst of een foto toe');
            return;
        }

        const user = getCurrentUser();
        const posts = getPosts();

        if (editingPostId) {
            // Edit existing
            const idx = posts.findIndex(p => p.id === editingPostId);
            if (idx === -1) return;
            if (posts[idx].authorId !== user.id) {
                showToast('Je kunt alleen je eigen berichten bewerken');
                return;
            }
            posts[idx].text = text;
            posts[idx].photo = photo;
            posts[idx].editedAt = new Date().toISOString();
            showToast('Bericht bijgewerkt');
        } else {
            // New post
            posts.push({
                id: generateId(),
                authorId: user.id,
                authorName: user.name,
                text,
                photo,
                createdAt: new Date().toISOString(),
                editedAt: null,
            });
            showToast('Bericht geplaatst');
        }

        savePosts(posts);
        closePostModal();
        renderFeed();
    });

    // ══════════════════════════════════════════════
    //  EDIT / DELETE
    // ══════════════════════════════════════════════

    window.app = {
        editPost(id) {
            const user = getCurrentUser();
            const post = getPosts().find(p => p.id === id);
            if (!post || post.authorId !== user.id) {
                showToast('Je kunt alleen je eigen berichten bewerken');
                return;
            }
            openPostModal(post);
        },

        deletePost(id) {
            deletingPostId = id;
            deleteModal.classList.remove('hidden');
        },
    };

    cancelDelete.addEventListener('click', () => {
        deleteModal.classList.add('hidden');
        deletingPostId = null;
    });

    deleteModal.querySelector('.modal-overlay').addEventListener('click', () => {
        deleteModal.classList.add('hidden');
        deletingPostId = null;
    });

    confirmDelete.addEventListener('click', () => {
        const user = getCurrentUser();
        let posts = getPosts();
        const post = posts.find(p => p.id === deletingPostId);

        if (!post) return;

        // Only the author or admin can delete
        if (post.authorId !== user.id && user.role !== 'admin') {
            showToast('Je kunt alleen je eigen berichten verwijderen');
            deleteModal.classList.add('hidden');
            deletingPostId = null;
            return;
        }

        posts = posts.filter(p => p.id !== deletingPostId);
        savePosts(posts);
        deleteModal.classList.add('hidden');
        deletingPostId = null;
        showToast('Bericht verwijderd');
        renderFeed();
    });

    // ══════════════════════════════════════════════
    //  ADMIN PANEL
    // ══════════════════════════════════════════════

    adminBtn.addEventListener('click', () => {
        renderAdminPanel();
        adminModal.classList.remove('hidden');
    });

    adminClose.addEventListener('click', () => adminModal.classList.add('hidden'));
    adminModal.querySelector('.modal-overlay').addEventListener('click', () => adminModal.classList.add('hidden'));

    function renderAdminPanel() {
        const users = getUsers();
        const current = getCurrentUser();

        // Sort: pending first, then approved
        const sorted = [...users].sort((a, b) => {
            if (a.status === 'pending' && b.status !== 'pending') return -1;
            if (a.status !== 'pending' && b.status === 'pending') return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        adminUsersList.innerHTML = sorted.map(user => {
            const isSelf = user.id === current.id;
            const badgeClass = user.role === 'admin' ? 'admin-badge' : user.status;

            let badgeText;
            if (user.role === 'admin') badgeText = 'Beheerder';
            else if (user.status === 'approved') badgeText = 'Goedgekeurd';
            else badgeText = 'Wachtend';

            let actionButtons = '';
            if (!isSelf) {
                if (user.status === 'pending') {
                    actionButtons = `
                        <button class="btn btn-success btn-small" onclick="app.approveUser('${user.id}')">
                            <i class="fas fa-check"></i> Goedkeuren
                        </button>
                        <button class="btn btn-danger btn-small" onclick="app.rejectUser('${user.id}')">
                            <i class="fas fa-times"></i>
                        </button>`;
                } else if (user.role !== 'admin') {
                    actionButtons = `
                        <button class="btn btn-danger btn-small" onclick="app.removeUser('${user.id}')">
                            <i class="fas fa-user-minus"></i> Verwijderen
                        </button>`;
                }
            }

            return `
            <div class="admin-user-card">
                <div class="admin-user-info">
                    <div class="author-avatar">${getInitials(user.name)}</div>
                    <div class="admin-user-details">
                        <h4>${escapeHtml(user.name)}</h4>
                        <span>${escapeHtml(user.email)}</span>
                    </div>
                </div>
                <div class="admin-user-actions">
                    <span class="status-badge ${badgeClass}">${badgeText}</span>
                    ${actionButtons}
                </div>
            </div>`;
        }).join('');
    }

    // Admin actions on window.app
    window.app.approveUser = function (id) {
        const users = getUsers();
        const user = users.find(u => u.id === id);
        if (user) {
            user.status = 'approved';
            saveUsers(users);
            renderAdminPanel();
            showToast(`${user.name} is goedgekeurd`);
        }
    };

    window.app.rejectUser = function (id) {
        let users = getUsers();
        const user = users.find(u => u.id === id);
        if (user) {
            users = users.filter(u => u.id !== id);
            saveUsers(users);
            renderAdminPanel();
            showToast(`${user.name} is afgewezen`);
        }
    };

    window.app.removeUser = function (id) {
        let users = getUsers();
        const user = users.find(u => u.id === id);
        if (user) {
            users = users.filter(u => u.id !== id);
            saveUsers(users);
            // Also remove their posts
            let posts = getPosts().filter(p => p.authorId !== id);
            savePosts(posts);
            renderAdminPanel();
            renderFeed();
            showToast(`${user.name} is verwijderd`);
        }
    };

    // ══════════════════════════════════════════════
    //  INIT
    // ══════════════════════════════════════════════

    initData();
    checkSession();

})();
