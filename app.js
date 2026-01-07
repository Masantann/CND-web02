import { listPosts, getPost, createPost, updatePost, deletePost } from './api.js';

document.addEventListener('alpine:init', () => {
  Alpine.data('auroraApp', () => ({
    // State
    posts: [],
    loading: true,
    showComposer: false,
    isDragging: false,
    isPublishing: false,

    // Detail Modal State
    detailOpen: false,
    detailPost: {}, // {id, title, content, mediaUrl, createdAt, newFile?}
    isEditing: false,

    // Composer State
    newPost: {
      title: '',
      content: '',
      file: null,
      filePreview: null,
      fileIsVideo: false
    },

    // Toast Queue
    toasts: [],

    // Masonry Instance
    msnry: null,

    // Lifecycle
    async initApp() {
      this.handleHashChange();
      window.addEventListener('hashchange', () => this.handleHashChange());
      window.addEventListener('resize', () => this.layoutGrid());
      await this.refreshList();
    },

    // Masonry Layout Logic
    initMasonry() {
      const grid = document.getElementById('masonry-grid');
      if (this.msnry) {
        this.msnry.destroy();
      }

      // Wait for images to load before layout to avoid overlap
      imagesLoaded(grid, () => {
        this.msnry = new Masonry(grid, {
          itemSelector: '.grid-item',
          columnWidth: '.grid-sizer',
          percentPosition: true,
          gutter: 24 // Match Tailwind gap-6 (24px) - note: gutter in masonry logic is tricky, usually better to use padding in CSS
        });

        // Hack: Tailwind gap is better handled by padding in items.
        // Since we used margin-bottom in HTML, Masonry handles vertical.
        // Horizontal gap is handled by width calc in HTML (md:w-[48%]).
        // Let's just trigger layout.
        this.msnry.layout();
      });
    },

    layoutGrid() {
      if (this.msnry) this.msnry.layout();
    },

    // Actions
    async refreshList() {
      this.loading = true;
      try {
        this.posts = await listPosts();
        // Wait for DOM update then layout
        this.$nextTick(() => {
          this.initMasonry();
        });
      } catch (e) {
        this.showToast(e.message, 'error');
      } finally {
        this.loading = false;
      }
    },

    // --- Composer Logic ---
    handleFileSelect(e) {
      const file = e.target.files[0];
      this.processFile(file);
    },
    handleDrop(e) {
      this.isDragging = false;
      const file = e.dataTransfer.files[0];
      this.processFile(file);
    },
    processFile(file) {
      if (!file) return;
      this.newPost.file = file;
      this.newPost.fileIsVideo = file.type.startsWith('video/');
      this.newPost.filePreview = URL.createObjectURL(file);
    },
    clearFile() {
      this.newPost.file = null;
      this.newPost.filePreview = null;
    },
    closeComposer() {
      this.showComposer = false;
      setTimeout(() => {
        this.newPost = { title: '', content: '', file: null, filePreview: null, fileIsVideo: false };
      }, 300); // Wait for transition
    },
    async publishPost() {
      if (!this.newPost.title) return;
      this.isPublishing = true;
      try {
        await createPost({
          title: this.newPost.title,
          content: this.newPost.content,
          file: this.newPost.file
        });
        this.showToast('Note published successfully', 'success');
        this.closeComposer();
        await this.refreshList();
      } catch (e) {
        this.showToast('Failed to publish: ' + e.message, 'error');
      } finally {
        this.isPublishing = false;
      }
    },

    // --- Detail Logic ---
    async openDetail(post) {
      this.detailPost = { ...post }; // Shallow copy
      this.detailOpen = true;
      this.isEditing = false;
      window.location.hash = `/post/${post.id}`;

      // Fetch full details (in case list is partial)
      try {
        const fullPost = await getPost(post.id);
        this.detailPost = { ...this.detailPost, ...fullPost };
      } catch (e) {
        console.error("Fetch detail bg error", e);
      }
    },
    closeDetail() {
      this.detailOpen = false;
      this.isEditing = false;
      history.replaceState(null, '', window.location.pathname);
    },
    handleDetailFileChange(e) {
      const file = e.target.files[0];
      if (file) {
        this.detailPost.newFile = file;
        // Preview immediate update
        this.detailPost.mediaUrl = URL.createObjectURL(file);
      }
    },
    async saveDetail() {
      try {
        await updatePost({
          id: this.detailPost.id,
          title: this.detailPost.title,
          content: this.detailPost.content,
          file: this.detailPost.newFile
        });
        this.showToast('Changes saved', 'success');
        this.isEditing = false;
        await this.refreshList();
      } catch (e) {
        this.showToast('Save failed: ' + e.message, 'error');
      }
    },
    async deleteDetail() {
      if (!confirm('Are you sure you want to delete this note?')) return;
      try {
        await deletePost(this.detailPost.id);
        this.showToast('Note deleted', 'success');
        this.closeDetail();
        await this.refreshList();
      } catch (e) {
        this.showToast('Delete failed: ' + e.message, 'error');
      }
    },

    // --- Helpers ---
    handleHashChange() {
      const hash = window.location.hash;
      const match = hash.match(/#\/post\/(.+)/);
      if (match && match[1]) {
        // If posts loaded, find local; else fetch
        const id = decodeURIComponent(match[1]);
        const local = this.posts.find(p => p.id === id);
        if (local) {
          this.openDetail(local);
        } else {
          getPost(id).then(p => {
            this.detailPost = p;
            this.detailOpen = true;
          }).catch(() => {/* ignore hash err */ });
        }
      } else {
        this.detailOpen = false;
      }
    },
    isVideo(url) {
      return url && /\.(mp4|webm|ogg)$/i.test(url);
    },
    formatDate(isoStr) {
      if (!isoStr) return '';
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' · ' +
        d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    },
    showToast(text, type = 'success') {
      const id = Date.now();
      this.toasts.push({ id, text, type });
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== id);
      }, 3000);
    }
  }));
});