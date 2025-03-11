// Navbar Component Class
export class Navbar {
    constructor(containerId = 'app-navbar') {
        this.containerId = containerId;
        this.currentUser = null;
        this.isDarkMode = localStorage.getItem('darkMode') === 'true';
    }

    // Initialize the navbar
    init() {
        this.render();
        // Wait for DOM to be ready before attaching event listeners
        requestAnimationFrame(() => {
            this.attachEventListeners();
            this.checkActiveLink();
            this.applyTheme();
        });
    }

    // Apply theme based on localStorage
    applyTheme() {
        if (this.isDarkMode) {
            document.body.classList.add('dark-theme');
            const themeToggle = document.getElementById('themeToggle');
            if (themeToggle) {
                themeToggle.classList.add('dark');
            }
        }
    }

    // Render the navbar HTML
    render() {
        const navbar = document.createElement('nav');
        navbar.id = this.containerId;
        navbar.className = 'navbar';
        
        navbar.innerHTML = `
            <a href="index.html" class="navbar-brand">
                <i class="fas fa-tasks"></i>
                Project Manager
            </a>

            <div class="navbar-menu" id="navbarMenu">
                <a href="index.html" class="nav-link">
                    <i class="fas fa-home"></i>
                    Dashboard
                </a>
                <a href="profile.html" class="nav-link">
                    <i class="fas fa-user"></i>
                    Profile
                </a>
                <a href="achievements.html" class="nav-link">
                    <i class="fas fa-trophy"></i>
                    Achievements
                </a>
                <a href="invitations.html" class="nav-link">
                    <i class="fas fa-envelope"></i>
                    Invitations
                </a>
            </div>

            <div class="user-menu" id="userMenu">
                <div class="user-avatar" id="userInitial">A</div>
                <div class="theme-toggle" id="themeToggle">
                    <i class="fas fa-sun"></i>
            </div>

            <button class="hamburger-menu" id="hamburgerMenu">
                <span></span>
            </button>
            
            <div class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <div class="sidebar-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="sidebar-info">
                        <h3 class="sidebar-name" id="sidebarName">Loading...</h3>
                        <p class="sidebar-email" id="sidebarEmail">loading...</p>
                    </div>
                </div>
                <div class="sidebar-nav">
                    <div class="sidebar-links">
                        <a href="/" class="sidebar-link">
                            <i class="fas fa-home"></i>
                            <span>Dashboard</span>
                        </a>
                        <a href="/project-dashboard.html" class="sidebar-link">
                            <i class="fas fa-project-diagram"></i>
                            <span>Projects</span>
                        </a>
                        <a href="/achievements.html" class="sidebar-link">
                            <i class="fas fa-trophy"></i>
                            <span>Achievements</span>
                        </a>
                        <a href="/invitations.html" class="sidebar-link">
                            <i class="fas fa-envelope"></i>
                            <span>Invitations</span>
                        </a>
                        <a href="/profile.html" class="sidebar-link">
                            <i class="fas fa-user"></i>
                            <span>Profile</span>
                        </a>
                    </div>
                    <div class="sidebar-footer">
                        <button class="sidebar-link logout-link" onclick="handleLogout()">
                            <i class="fas fa-sign-out-alt"></i>
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertBefore(navbar, document.body.firstChild);
    }

    // Update user information
    updateUserInfo(user) {
        this.currentUser = user;
        if (!user) return;

        const userInitial = document.getElementById('userInitial');
        const sidebarName = document.getElementById('sidebarName');
        const sidebarEmail = document.getElementById('sidebarEmail');

        if (userInitial) {
            userInitial.textContent = user.name.charAt(0).toUpperCase();
        }
        if (sidebarName) {
            sidebarName.textContent = user.name;
        }
        if (sidebarEmail) {
            sidebarEmail.textContent = user.email;
        }
    }

    // Handle logout
    async handleLogout() {
        try {
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    // Attach event listeners
    attachEventListeners() {
        const hamburgerMenu = document.getElementById('hamburgerMenu');
        const sidebar = document.getElementById('sidebar');
        const themeToggle = document.getElementById('themeToggle');

        // Hamburger menu toggle
        if (hamburgerMenu && sidebar) {
            hamburgerMenu.addEventListener('click', () => {
                hamburgerMenu.classList.toggle('active');
                sidebar.classList.toggle('show');
            });
        }

        // Theme toggle
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                themeToggle.classList.toggle('dark');
                document.body.classList.toggle('dark-theme');
                this.isDarkMode = document.body.classList.contains('dark-theme');
                localStorage.setItem('darkMode', this.isDarkMode);
            });
        }

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (sidebar && hamburgerMenu && 
                !sidebar.contains(e.target) && 
                !hamburgerMenu.contains(e.target) &&
                sidebar.classList.contains('show')) {
                sidebar.classList.remove('show');
                hamburgerMenu.classList.remove('active');
            }
        });

        // Update theme toggle on system preference change
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('darkMode')) { // Only if user hasn't set a preference
                const shouldBeDark = e.matches;
                if (themeToggle) {
                    themeToggle.classList.toggle('dark', shouldBeDark);
                }
                document.body.classList.toggle('dark-theme', shouldBeDark);
            }
        });
    }

    // Check and set active link based on current page
    checkActiveLink() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });
    }
}