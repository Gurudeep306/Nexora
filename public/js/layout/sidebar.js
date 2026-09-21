/**
 * Nexora Sidebar Component
 * Clean, modern, accessible sidebar with collapse/expand, tooltips, and role-based visibility
 * Fixed & Optimized Version v2.0
 */

class NexoraSidebar {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.userRole = options.userRole || 'student';
    this.userName = options.userName || 'User';
    this.userAvatar = options.userAvatar || null;
    this.onNavigate = options.onNavigate || null;
    this.collapsed = false;
    this.mobileOpen = false;
    this.sidebar = null;
    
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.loadState();
    this.updateActiveState();
  }

  render() {
    // Create sidebar element
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    sidebar.id = 'sidebar';
    sidebar.setAttribute('role', 'navigation');
    sidebar.setAttribute('aria-label', 'Main navigation');
    
    sidebar.innerHTML = `
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="sidebar-logo-icon">N</div>
          <span class="sidebar-logo-text">Nexora</span>
        </div>
        <button class="sidebar-toggle-btn" id="sidebar-toggle" aria-label="Toggle sidebar" title="Toggle sidebar (Ctrl+B)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      </div>
      
      <div class="sidebar-search">
        <div class="sidebar-search-wrapper">
          <span class="sidebar-search-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input type="search" class="sidebar-search-input" placeholder="Search..." aria-label="Search navigation" />
        </div>
      </div>
      
      <nav class="sidebar-nav" id="sidebar-nav" role="menu">
        ${this.renderNavSections()}
      </nav>
      
      <div class="sidebar-profile" id="sidebar-profile" role="button" tabindex="0" aria-label="User profile">
        <div class="sidebar-profile-avatar">
          ${this.userAvatar ? `<img src="${this.userAvatar}" alt="${this.userName}'s avatar" />` : this.userName.charAt(0).toUpperCase()}
        </div>
        <div class="sidebar-profile-info">
          <div class="sidebar-profile-name">${this.userName}</div>
          <div class="sidebar-profile-role">${this.userRole}</div>
        </div>
        <svg class="sidebar-profile-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      
      <div class="sidebar-footer">
        ${this.renderFooterItems()}
      </div>
    `;
    
    this.container.insertBefore(sidebar, this.container.firstChild);
    this.sidebar = sidebar;
  }

  renderNavSections() {
    if (typeof SIDEBAR_CONFIG === 'undefined') {
      console.warn('SIDEBAR_CONFIG not loaded. Using fallback navigation.');
      return this.renderFallbackNav();
    }

    return SIDEBAR_CONFIG.sections.map(section => {
      const visibleItems = section.items.filter(item => 
        !item.roles || item.roles.includes(this.userRole)
      );
      
      if (visibleItems.length === 0) return '';
      
      return `
        <div class="sidebar-section">
          <div class="sidebar-section-title">
            <span>${section.title}</span>
          </div>
          ${visibleItems.map(item => this.renderNavItem(item)).join('')}
        </div>
      `;
    }).join('');
  }

  renderFallbackNav() {
    // Fallback navigation if config is not loaded
    const fallbackItems = [
      { id: 'home', label: 'Home', icon: 'home', route: '/' },
      { id: 'problems', label: 'Problems', icon: 'code', route: '/problems' },
      { id: 'learn', label: 'Learn', icon: 'book', route: '/learn' },
      { id: 'contests', label: 'Contests', icon: 'trophy', route: '/contests' },
      { id: 'settings', label: 'Settings', icon: 'settings', route: '/settings' }
    ];

    return `
      <div class="sidebar-section">
        <div class="sidebar-section-title">
          <span>Navigation</span>
        </div>
        ${fallbackItems.map(item => this.renderNavItem(item)).join('')}
      </div>
    `;
  }

  renderNavItem(item) {
    const icon = this.getIcon(item.icon);
    const isActive = window.location.pathname === item.route || 
                     window.location.pathname.startsWith(item.route + '/');
    const hasSubmenu = item.children && item.children.length > 0;
    
    return `
      <a href="${item.route}" 
         class="sidebar-nav-item ${isActive ? 'active' : ''} ${hasSubmenu ? 'expandable' : ''}" 
         data-nav-id="${item.id}"
         data-route="${item.route}"
         data-tooltip="${item.label}"
         role="menuitem"
         ${isActive ? 'aria-current="page"' : ''}>
        <span class="sidebar-nav-item-icon">${icon}</span>
        <span class="sidebar-nav-item-text">${item.label}</span>
        ${item.badge ? `<span class="sidebar-nav-item-badge">${item.badge}</span>` : ''}
      </a>
      ${hasSubmenu ? this.renderSubmenu(item.children) : ''}
    `;
  }

  renderSubmenu(children) {
    return `
      <div class="sidebar-submenu">
        ${children.map(child => `
          <a href="${child.route}" 
             class="sidebar-nav-item" 
             data-nav-id="${child.id}"
             data-route="${child.route}"
             data-tooltip="${child.label}"
             role="menuitem">
            <span class="sidebar-nav-item-icon">${this.getIcon(child.icon)}</span>
            <span class="sidebar-nav-item-text">${child.label}</span>
          </a>
        `).join('')}
      </div>
    `;
  }

  renderFooterItems() {
    if (typeof SIDEBAR_CONFIG === 'undefined') return '';

    const footerItems = SIDEBAR_CONFIG.footerItems || [];
    
    return footerItems.map(item => {
      if (item.roles && !item.roles.includes(this.userRole)) return '';
      
      const icon = this.getIcon(item.icon);
      
      return `
        <button class="sidebar-footer-item" 
                data-nav-id="${item.id}"
                data-tooltip="${item.label}"
                role="menuitem">
          <span class="sidebar-footer-item-icon">${icon}</span>
          <span class="sidebar-footer-item-text">${item.label}</span>
        </button>
      `;
    }).join('');
  }

  getIcon(iconName) {
    if (typeof SIDEBAR_ICONS !== 'undefined' && SIDEBAR_ICONS[iconName]) {
      return SIDEBAR_ICONS[iconName];
    }
    
    // Fallback icons
    const fallbackIcons = {
      home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
      code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
      book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
      trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
      settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
      search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
      help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
      moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
      sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
    };
    
    return fallbackIcons[iconName] || fallbackIcons.help;
  }

  bindEvents() {
    // Toggle collapse
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }
    
    // Navigation clicks
    const navItems = document.querySelectorAll('.sidebar-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const route = item.dataset.route;
        
        if (!route) return;
        
        if (route === '/logout') {
          e.preventDefault();
          this.handleLogout();
          return;
        }
        
        // Close mobile sidebar after navigation
        if (window.innerWidth <= 1024) {
          this.closeMobile();
        }
        
        if (this.onNavigate) {
          this.onNavigate(route);
        }
        
        this.updateActiveState();
      });
    });
    
    // User profile click
    const profileElement = document.getElementById('sidebar-profile');
    if (profileElement) {
      profileElement.addEventListener('click', () => {
        this.navigateTo('/profile');
      });
      
      profileElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.navigateTo('/profile');
        }
      });
    }
    
    // Footer items click
    const footerItems = document.querySelectorAll('.sidebar-footer-item');
    footerItems.forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.navId;
        if (action === 'logout') {
          this.handleLogout();
        } else if (action === 'theme') {
          this.toggleTheme();
        }
      });
    });
    
    // Search functionality
    const searchInput = document.querySelector('.sidebar-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    }
    
    // Keyboard shortcut for toggle (Ctrl+B)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        this.toggle();
      }
      
      // Escape to close mobile sidebar
      if (e.key === 'Escape' && this.mobileOpen) {
        this.closeMobile();
      }
    });
    
    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (window.innerWidth > 1024) {
          this.mobileOpen = false;
          document.body.classList.remove('sidebar-mobile-open');
          this.hideOverlay();
        }
      }, 150);
    });
  }

  toggle() {
    this.collapsed = !this.collapsed;
    document.body.classList.toggle('sidebar-collapsed', this.collapsed);
    
    // Also toggle on sidebar element for CSS selectors
    if (this.sidebar) {
      this.sidebar.classList.toggle('collapsed', this.collapsed);
    }
    
    this.saveState();
  }

  collapse() {
    this.collapsed = true;
    document.body.classList.add('sidebar-collapsed');
    if (this.sidebar) {
      this.sidebar.classList.add('collapsed');
    }
    this.saveState();
  }

  expand() {
    this.collapsed = false;
    document.body.classList.remove('sidebar-collapsed');
    if (this.sidebar) {
      this.sidebar.classList.remove('collapsed');
    }
    this.saveState();
  }

  openMobile() {
    this.mobileOpen = true;
    document.body.classList.add('sidebar-mobile-open');
    if (this.sidebar) {
      this.sidebar.classList.add('mobile-open');
    }
    this.showOverlay();
  }

  closeMobile() {
    this.mobileOpen = false;
    document.body.classList.remove('sidebar-mobile-open');
    if (this.sidebar) {
      this.sidebar.classList.remove('mobile-open');
    }
    this.hideOverlay();
  }

  toggleMobile() {
    if (this.mobileOpen) {
      this.closeMobile();
    } else {
      this.openMobile();
    }
  }

  showOverlay() {
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      document.body.appendChild(overlay);
      
      overlay.addEventListener('click', () => this.closeMobile());
    }
    
    requestAnimationFrame(() => {
      overlay.classList.add('visible');
    });
  }

  hideOverlay() {
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) {
      overlay.classList.remove('visible');
    }
  }

  navigateTo(route) {
    if (this.onNavigate) {
      this.onNavigate(route);
    } else {
      window.location.href = route;
    }
  }

  handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
      fetch('/auth/logout', { method: 'POST' })
        .then(() => {
          window.location.href = '/login';
        })
        .catch(err => {
          console.error('Logout error:', err);
          window.location.href = '/login';
        });
    }
  }

  toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    try {
      localStorage.setItem('nexora-theme', isDark ? 'dark' : 'light');
    } catch (e) {
      console.warn('Could not save theme preference:', e);
    }
  }

  updateActiveState() {
    const currentPath = window.location.pathname;
    const navItems = document.querySelectorAll('.sidebar-nav-item');
    
    navItems.forEach(item => {
      const route = item.dataset.route;
      if (!route) return;
      
      const isActive = currentPath === route || currentPath.startsWith(route + '/');
      item.classList.toggle('active', isActive);
      item.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  }

  handleSearch(query) {
    const navItems = document.querySelectorAll('.sidebar-nav-item');
    const normalizedQuery = query.toLowerCase().trim();
    
    navItems.forEach(item => {
      const label = item.querySelector('.sidebar-nav-item-text');
      if (!label) return;
      
      const text = label.textContent.toLowerCase();
      const match = !normalizedQuery || text.includes(normalizedQuery);
      
      item.style.display = match ? '' : 'none';
    });
    
    // Show/hide section titles based on visible items
    document.querySelectorAll('.sidebar-section').forEach(section => {
      const visibleItems = section.querySelectorAll('.sidebar-nav-item:not([style*="display: none"])');
      section.style.display = visibleItems.length > 0 ? '' : 'none';
    });
  }

  saveState() {
    try {
      localStorage.setItem('nexora-sidebar-collapsed', this.collapsed);
    } catch (e) {
      console.warn('Could not save sidebar state:', e);
    }
  }

  loadState() {
    try {
      const savedCollapsed = localStorage.getItem('nexora-sidebar-collapsed');
      
      if (savedCollapsed === 'true') {
        this.collapsed = true;
        document.body.classList.add('sidebar-collapsed');
        if (this.sidebar) {
          this.sidebar.classList.add('collapsed');
        }
      }
      
      // Load theme preference
      const savedTheme = localStorage.getItem('nexora-theme');
      if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
      }
    } catch (e) {
      console.warn('Could not load sidebar state:', e);
    }
  }

  // Update badge count for a nav item
  updateBadge(itemId, count) {
    const navItem = document.querySelector(`[data-nav-id="${itemId}"]`);
    if (!navItem) return;
    
    let badge = navItem.querySelector('.sidebar-nav-item-badge');
    
    if (count <= 0) {
      if (badge) badge.remove();
      return;
    }
    
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'sidebar-nav-item-badge';
      navItem.appendChild(badge);
      navItem.classList.add('has-badge');
    }
    
    badge.textContent = count > 99 ? '99+' : count;
  }

  // Highlight a nav item temporarily (e.g., for notifications)
  flashItem(itemId) {
    const navItem = document.querySelector(`[data-nav-id="${itemId}"]`);
    if (!navItem) return;
    
    navItem.style.animation = 'none';
    navItem.offsetHeight; // Trigger reflow
    navItem.style.animation = 'sidebarPulse 0.5s ease 3';
    
    setTimeout(() => {
      navItem.style.animation = '';
    }, 1500);
  }

  // Destroy the sidebar
  destroy() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.remove();
    this.hideOverlay();
  }
}

// Add pulse animation for flash effect
const sidebarStyle = document.createElement('style');
sidebarStyle.textContent = `
  @keyframes sidebarPulse {
    0%, 100% { background: transparent; }
    50% { background: var(--primary-bg); }
  }
`;
document.head.appendChild(sidebarStyle);

// Initialize sidebar when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Get user data from page or API
  const userData = window.NEXORA_USER || {
    name: 'User',
    role: 'student',
    avatar: null
  };
  
  // Create global sidebar instance
  window.nexoraSidebar = new NexoraSidebar({
    userName: userData.name,
    userRole: userData.role,
    userAvatar: userData.avatar,
    onNavigate: (route) => {
      console.log('Navigating to:', route);
    }
  });
  
  // Expose mobile toggle for hamburger menu buttons
  window.toggleSidebarMobile = () => {
    if (window.nexoraSidebar) {
      window.nexoraSidebar.toggleMobile();
    }
  };
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NexoraSidebar;
}