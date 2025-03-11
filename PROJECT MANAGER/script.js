import { Navbar } from './components/navbar.js';
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Initialize navbar
const navbar = new Navbar('app-navbar');
navbar.init();

// DOM Elements
const addProjectBtn = document.getElementById('addProjectBtn');
const projectModal = document.getElementById('projectModal');
const closeBtn = document.querySelector('.close');
const projectForm = document.getElementById('projectForm');
const projectsList = document.getElementById('projectsList');
const userInfo = document.getElementById('userInfo');
const logoutBtn = document.getElementById('logoutBtn');
const searchInput = document.getElementById('searchProject');
const filterStatus = document.getElementById('filterStatus');
const filterType = document.getElementById('filterType');

// Stats Elements
const totalProjectsEl = document.getElementById('totalProjects');
const completedProjectsEl = document.getElementById('completedProjects');
const inProgressProjectsEl = document.getElementById('inProgressProjects');
const teamProjectsEl = document.getElementById('teamProjects');

// Project data storage
let projects = [];

// Initialize counters with animation
function animateCounter(element, target) {
    const duration = 1500;
    const steps = 60;
    const stepDuration = duration / steps;
    let currentValue = 0;
    
    const increment = target / steps;
    
    const timer = setInterval(() => {
        currentValue += increment;
        element.textContent = Math.round(currentValue);
        
        if (currentValue >= target) {
            element.textContent = target;
            clearInterval(timer);
        }
    }, stepDuration);
}

// Check authentication state
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', user.email)));
        const userData = userDoc.docs[0].data();
        document.querySelector('#userName').textContent = userData.name;
        document.querySelector('#userInitial').textContent = userData.name.charAt(0).toUpperCase();
        loadProjects();
    } else {
        window.location.href = 'login/login.html';
    }
});

// Event Listeners
addProjectBtn.addEventListener('click', () => {
    projectModal.style.display = 'block';
    setTimeout(() => projectModal.classList.add('show'), 10);
});

closeBtn.addEventListener('click', closeModal);
projectForm.addEventListener('submit', handleProjectSubmit);
logoutBtn.addEventListener('click', handleLogout);

window.addEventListener('click', (e) => {
    if (e.target === projectModal) closeModal();
});

// Search and Filter
searchInput.addEventListener('input', filterProjects);
filterStatus.addEventListener('change', filterProjects);
filterType.addEventListener('change', filterProjects);

function filterProjects() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusFilter = filterStatus.value;
    const typeFilter = filterType.value;
    
    const filteredProjects = projects.filter(project => {
        const matchesSearch = project.name.toLowerCase().includes(searchTerm) ||
                            project.description.toLowerCase().includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
        const matchesType = typeFilter === 'all' || project.type === typeFilter;
        
        return matchesSearch && matchesStatus && matchesType;
    });
    
    updateProjectsUI(filteredProjects);
}

function closeModal() {
    projectModal.classList.remove('show');
    setTimeout(() => {
        projectModal.style.display = 'none';
        projectForm.reset();
    }, 300);
}

async function handleProjectSubmit(e) {
    e.preventDefault();
    
    const submitBtn = projectForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

    try {
        const projectData = {
            name: document.getElementById('projectName').value,
            description: document.getElementById('projectDescription').value,
            dueDate: document.getElementById('dueDate').value,
            priority: document.getElementById('priority').value,
            type: document.getElementById('projectType').value,
            status: 'ongoing',
            createdAt: new Date().toISOString(),
            userId: auth.currentUser.uid,
            members: [],
            completed: false
        };

        await addDoc(collection(db, 'projects'), projectData);
        
        // Show success message
        const toast = document.createElement('div');
        toast.className = 'toast success';
        toast.innerHTML = '<i class="fas fa-check-circle"></i> Project created successfully!';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
            closeModal();
            loadProjects();
        }, 2000);

    } catch (error) {
        console.error('Error adding project:', error);
        const toast = document.createElement('div');
        toast.className = 'toast error';
        toast.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error creating project!';
        document.body.appendChild(toast);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Create Project';
    }
}

async function loadProjects() {
    try {
        projectsList.innerHTML = '<div class="loading-projects">Loading projects...</div>';
        
        // Get user's projects
        const q = query(collection(db, 'projects'), where('userId', '==', auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        projects = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Get joined projects
        const joinedQuery = query(collection(db, 'projects'), 
            where('members', 'array-contains', auth.currentUser.email));
        const joinedSnapshot = await getDocs(joinedQuery);
        
        const joinedProjects = joinedSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(project => project.userId !== auth.currentUser.uid);
        
        projects = [...projects, ...joinedProjects];

        // Update stats with animation
        const stats = {
            total: projects.length,
            completed: projects.filter(p => p.status === 'completed').length,
            inProgress: projects.filter(p => p.status === 'ongoing').length,
            team: projects.filter(p => p.type === 'team').length
        };

        animateCounter(totalProjectsEl, stats.total);
        animateCounter(completedProjectsEl, stats.completed);
        animateCounter(inProgressProjectsEl, stats.inProgress);
        animateCounter(teamProjectsEl, stats.team);

        updateProjectsUI(projects);

    } catch (error) {
        console.error('Error loading projects:', error);
        projectsList.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Error loading projects</h3>
                <p>Please try again later</p>
            </div>
        `;
    }
}

function updateProjectsUI(projectsToShow) {
    if (projectsToShow.length === 0) {
        projectsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>No projects found</h3>
                <p>Try adjusting your search or filters</p>
                <button class="new-project-btn" onclick="document.getElementById('newProjectBtn').click()">
                    <i class="fas fa-plus"></i> Create Project
                </button>
            </div>
        `;
        return;
    }

    projectsList.innerHTML = projectsToShow.map((project, index) => `
        <div class="project-card ${project.status} animate-slide-in" 
             style="animation-delay: ${index * 0.1}s">
            <span class="project-type-badge">${project.type}</span>
            <h3>${project.name}</h3>
            <p>${project.description}</p>
            <div class="project-meta">
                <span class="priority ${project.priority}">${project.priority}</span>
                <span class="due-date">Due: ${formatDate(project.dueDate)}</span>
            </div>
            <div class="project-members">
                ${(project.members || []).map(member => `
                    <div class="member-avatar" title="${member}">
                        ${member.charAt(0).toUpperCase()}
                    </div>
                `).join('')}
            </div>
            <div class="project-actions">
                <a href="project-dashboard.html?id=${project.id}" class="action-btn edit">
                    <i class="fas fa-external-link-alt"></i> View Details
                </a>
                ${project.userId === auth.currentUser.uid ? `
                    <button onclick="deleteProject('${project.id}')" class="delete-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button onclick="toggleProjectStatus('${project.id}')" class="status-btn">
                        ${project.status === 'completed' ? 
                          '<i class="fas fa-undo"></i>' : 
                          '<i class="fas fa-check"></i>'}
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

async function handleLogout() {
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error signing out:', error);
    }
}

// Make these functions available globally
window.deleteProject = async function(projectId) {
    if (confirm('Are you sure you want to delete this project?')) {
        try {
            const projectCard = document.querySelector(`[data-project-id="${projectId}"]`);
            projectCard.classList.add('deleting');
            
            await deleteDoc(doc(db, 'projects', projectId));
            
            setTimeout(() => {
                loadProjects();
            }, 300);
        } catch (error) {
            console.error('Error deleting project:', error);
            alert('Error deleting project. Please try again.');
        }
    }
}

window.toggleProjectStatus = async function(projectId) {
    try {
        const projectCard = document.querySelector(`[data-project-id="${projectId}"]`);
        projectCard.classList.add('updating');
        
        const projectRef = doc(db, 'projects', projectId);
        const project = projects.find(p => p.id === projectId);
        
        await updateDoc(projectRef, {
            status: project.status === 'completed' ? 'ongoing' : 'completed'
        });
        
        setTimeout(() => {
            loadProjects();
        }, 300);
    } catch (error) {
        console.error('Error updating project status:', error);
        alert('Error updating project status. Please try again.');
    }
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Dark mode toggle
const darkModeToggle = document.getElementById('darkModeToggle');
darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
});

// Initialize dark mode from localStorage
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
}

// Navbar and User Menu Interactions
const userMenu = document.getElementById('userMenu');
const userDropdown = document.getElementById('userDropdown');
const navMenu = document.getElementById('navMenu');

userMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('show');
    // Add a rotate animation to the user avatar when menu opens
    const avatar = userMenu.querySelector('.user-avatar');
    avatar.style.transform = userDropdown.classList.contains('show') ? 'scale(1.1)' : 'scale(1)';
    avatar.style.transition = 'transform 0.3s ease';
});

// Hide dropdowns when clicking outside
document.addEventListener('click', () => {
    userDropdown.classList.remove('show');
});

// Mobile menu toggle
const mobileMenuBtn = document.createElement('button');
mobileMenuBtn.className = 'mobile-menu-btn';
mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
document.querySelector('.navbar').insertBefore(mobileMenuBtn, navMenu);

mobileMenuBtn.addEventListener('click', () => {
    navMenu.classList.toggle('show');
});

// Active nav link highlighting
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
    if (link.href === window.location.href) {
        link.classList.add('active');
    }
});