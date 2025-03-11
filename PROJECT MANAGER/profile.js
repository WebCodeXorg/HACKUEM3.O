import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, doc, getDoc, getDocs, query, updateDoc, where, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Navbar } from './components/navbar.js';

// Initialize navbar
const navbar = new Navbar('app-navbar');
navbar.init();

// DOM Elements
const userNameElements = document.querySelectorAll('#userName');
const userEmailElement = document.getElementById('userEmail');
const userBioElement = document.getElementById('userBio');
const userInitialElement = document.getElementById('userInitial');
const editProfileBtn = document.getElementById('editProfileBtn');
const editProfileModal = document.getElementById('editProfileModal');
const editProfileForm = document.getElementById('editProfileForm');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Stats Elements
const totalProjectsElement = document.getElementById('totalProjects');
const completedProjectsElement = document.getElementById('completedProjects');
const teamsJoinedElement = document.getElementById('teamsJoined');
const completionRateElement = document.getElementById('completionRate');

// Progress Bars
const projectMasterProgress = document.getElementById('projectMasterProgress');
const teamPlayerProgress = document.getElementById('teamPlayerProgress');
const efficiencyProgress = document.getElementById('efficiencyProgress');

let userData = null;
let projectCreationChart, completionRateChart, teamJoinChart;

// Profile data management
async function loadUserProfile(uid) {
    try {
        // Show loading state
        document.querySelectorAll('.profile-name, .profile-email span, .profile-role').forEach(el => {
            if (el) el.textContent = 'Loading...';
        });

        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            userData = userDoc.data();
            displayUserInfo(userData);
            await Promise.all([
                loadProjectStats(uid),
                loadAchievements(uid),
                loadRecentActivity(uid)
            ]);
        } else {
            showToast('User profile not found', 'error');
            setTimeout(() => {
                window.location.href = './login/login.html';
            }, 2000);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Error loading profile data', 'error');
    }
}

function displayUserInfo(userData) {
    try {
        // Safely update elements if they exist
        if (userNameElements) {
            userNameElements.forEach(el => {
                if (el) el.textContent = userData.name;
            });
        }
        
        const sidebarName = document.getElementById('sidebarName');
        const sidebarEmail = document.getElementById('sidebarEmail');
        
        if (sidebarName) sidebarName.textContent = userData.name;
        if (sidebarEmail) sidebarEmail.textContent = userData.email;
        if (userEmailElement) userEmailElement.textContent = userData.email;
        if (userBioElement) userBioElement.textContent = userData.bio || 'No bio added yet';
        if (userInitialElement) userInitialElement.textContent = userData.name.charAt(0).toUpperCase();

        // Display social media links
        displaySocialLinks(userData.socialLinks);

        // Update navbar with user data
        if (navbar && typeof navbar.updateUserInfo === 'function') {
            navbar.updateUserInfo({
                name: userData.name,
                email: userData.email
            });
        }
    } catch (error) {
        console.error('Error displaying user info:', error);
        showToast('Error updating display', 'error');
    }
}

// Function to display social media links
function displaySocialLinks(socialLinks = {}) {
    const socialMediaContainer = document.getElementById('socialMediaLinks');
    if (!socialMediaContainer) return;

    socialMediaContainer.className = 'social-links-container';
    socialMediaContainer.innerHTML = '';

    const socialPlatforms = {
        github: { icon: 'fab fa-github', label: 'GitHub', color: '#333' },
        linkedin: { icon: 'fab fa-linkedin-in', label: 'LinkedIn', color: '#0077b5' },
        twitter: { icon: 'fab fa-twitter', label: 'Twitter', color: '#1da1f2' },
        instagram: { icon: 'fab fa-instagram', label: 'Instagram', color: '#e1306c' },
        website: { icon: 'fas fa-globe', label: 'Website', color: '#2ecc71' }
    };

    Object.entries(socialPlatforms).forEach(([platform, info]) => {
        const link = document.createElement('a');
        const hasLink = socialLinks && socialLinks[platform] && socialLinks[platform].trim() !== '';
        
        link.href = hasLink ? socialLinks[platform] : '#';
        link.target = hasLink ? '_blank' : '_self';
        link.rel = 'noopener noreferrer';
        link.className = `social-link ${platform} ${hasLink ? 'active' : 'inactive'}`;
        link.innerHTML = `<i class="${info.icon}"></i>`;
        link.title = hasLink ? `Visit ${info.label}` : `Add ${info.label}`;
        
        if (!hasLink) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                openModal();
            });
        }
        
        socialMediaContainer.appendChild(link);
    });
}

// Function to initialize edit profile button
function initializeEditProfileButton() {
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            window.location.href = 'edit-profile.html';
        });
    }
}

// Initialize auth state listener
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            await loadUserProfile(user.uid);
        } catch (error) {
            console.error('Error loading user data:', error);
            showToast('Error loading profile data. Please try again.', 'error');
        }
    } else {
        window.location.href = './login/login.html';
    }
});

// Initialize charts
function initializeCharts() {
    try {
        const ctx1 = document.getElementById('projectCreationChart')?.getContext('2d');
        const ctx2 = document.getElementById('completionRateChart')?.getContext('2d');
        const ctx3 = document.getElementById('teamJoinChart')?.getContext('2d');

        if (ctx1) {
            projectCreationChart = new Chart(ctx1, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Projects Created',
                        data: [],
                        borderColor: '#4a90e2',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }

        if (ctx2) {
            completionRateChart = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Completion Rate',
                        data: [],
                        backgroundColor: '#2ecc71',
                        borderRadius: 6,
                        maxBarThickness: 50
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: false,
                        },
                        legend: {
                            position: 'top',
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    }
                }
            });
        }

        if (ctx3) {
            teamJoinChart = new Chart(ctx3, {
                type: 'doughnut',
                data: {
                    labels: ['Individual', 'Team'],
                    datasets: [{
                        data: [0, 0],
                        backgroundColor: ['#f1c40f', '#e74c3c']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    } catch (error) {
        console.error('Error initializing charts:', error);
    }
}

async function loadProjectStats(userId) {
    try {
        const projectsQuery = query(
            collection(db, 'projects'),
            where('userId', '==', userId)
        );
        const projectsSnapshot = await getDocs(projectsQuery);
        const projects = projectsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Calculate stats
        const totalProjects = projects.length;
        const completedProjects = projects.filter(p => p.status === 'completed').length;
        const teamsJoined = new Set(projects.flatMap(p => p.members || [])).size;
        const completionRate = totalProjects ? Math.round((completedProjects / totalProjects) * 100) : 0;

        // Animate numbers
        animateNumber(totalProjectsElement, totalProjects);
        animateNumber(completedProjectsElement, completedProjects);
        animateNumber(teamsJoinedElement, teamsJoined);
        animateNumber(completionRateElement, completionRate, '%');

        // Update charts
        updateChartData(projects);

    } catch (error) {
        console.error('Error loading project stats:', error);
        showToast('Error loading project statistics', 'error');
    }
}

function updateChartData(projects) {
    if (!projects) return;

    try {
        // Project Creation Timeline
        if (projectCreationChart) {
            const dates = [...new Set(projects.map(p => p.createdAt?.toDate().toLocaleDateString()))]
                .sort((a, b) => new Date(a) - new Date(b));
            
            const projectCounts = dates.map(date => 
                projects.filter(p => p.createdAt?.toDate().toLocaleDateString() === date).length
            );

            projectCreationChart.data.labels = dates;
            projectCreationChart.data.datasets[0].data = projectCounts;
            projectCreationChart.update();
        }

        // Completion Rate Over Time
        if (completionRateChart) {
            const monthlyStats = {};
            projects.forEach(project => {
                if (project.createdAt) {
                    const month = project.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    if (!monthlyStats[month]) {
                        monthlyStats[month] = { total: 0, completed: 0 };
                    }
                    monthlyStats[month].total++;
                    if (project.status === 'completed') {
                        monthlyStats[month].completed++;
                    }
                }
            });

            const labels = Object.keys(monthlyStats);
            const data = labels.map(month => 
                (monthlyStats[month].completed / monthlyStats[month].total) * 100
            );

            completionRateChart.data.labels = labels;
            completionRateChart.data.datasets[0].data = data;
            completionRateChart.update();
        }

        // Team vs Individual Projects
        if (teamJoinChart) {
            const teamProjects = projects.filter(p => p.members?.length > 1).length;
            const individualProjects = projects.length - teamProjects;

            teamJoinChart.data.datasets[0].data = [individualProjects, teamProjects];
            teamJoinChart.update();
        }
    } catch (error) {
        console.error('Error updating charts:', error);
    }
}

async function loadAchievements(userId) {
    try {
        const projectsQuery = query(
            collection(db, 'projects'),
            where('userId', '==', userId)
        );
        const projectsSnapshot = await getDocs(projectsQuery);
        const projects = projectsSnapshot.docs.map(doc => doc.data());

        const completedProjects = projects.filter(p => p.status === 'completed').length;
        const teamsJoined = new Set(projects.flatMap(p => p.members || [])).size;
        const completionRate = projects.length ? (completedProjects / projects.length) * 100 : 0;

        // Animate progress bars
        setTimeout(() => {
            projectMasterProgress.style.width = `${Math.min((completedProjects / 10) * 100, 100)}%`;
            teamPlayerProgress.style.width = `${Math.min((teamsJoined / 5) * 100, 100)}%`;
            efficiencyProgress.style.width = `${Math.min((completionRate / 90) * 100, 100)}%`;
        }, 500);

    } catch (error) {
        console.error('Error loading achievements:', error);
        showToast('Error loading achievements', 'error');
    }
}

async function loadRecentActivity(uid) {
    try {
        const activityQuery = query(
            collection(db, 'activity'),
            where('userId', '==', uid),
            orderBy('timestamp', 'desc'),
            limit(5)
        );
        
        const activitySnap = await getDocs(activityQuery);
        const activityList = document.getElementById('activityList');
        activityList.innerHTML = '';

        if (activitySnap.empty) {
            activityList.innerHTML = '<div class="activity-item">No recent activity</div>';
            return;
        }

        activitySnap.forEach(doc => {
            const activity = doc.data();
            const activityDate = activity.timestamp.toDate();
            
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <div>
                    <strong>${activity.type}</strong>
                    <p>${activity.description}</p>
                    <small>${formatDate(activityDate)}</small>
                </div>
            `;
            activityList.appendChild(activityItem);
        });
    } catch (error) {
        console.error('Error loading activity:', error);
    }
}

function animateNumber(element, target, suffix = '') {
    const duration = 1500;
    const steps = 60;
    const stepDuration = duration / steps;
    let currentValue = 0;
    const increment = target / steps;

    const timer = setInterval(() => {
        currentValue += increment;
        if (currentValue >= target) {
            element.textContent = target + suffix;
            clearInterval(timer);
        } else {
            element.textContent = Math.round(currentValue) + suffix;
        }
    }, stepDuration);
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${message}
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Remove all modal-related code and keep only essential event listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    initializeEditProfileButton();
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.href = './login/login.html';
                showToast('Logged out successfully');
            } catch (error) {
                console.error('Error logging out:', error);
                showToast('Error logging out', 'error');
            }
        });
    }
});

// Hamburger Menu Toggle
const hamburgerMenu = document.querySelector('.hamburger-menu');
const sidebar = document.querySelector('.sidebar');

hamburgerMenu.addEventListener('click', () => {
    hamburgerMenu.classList.toggle('active');
    sidebar.classList.toggle('show');
});

// Close sidebar when clicking outside
document.addEventListener('click', (e) => {
    if (!hamburgerMenu.contains(e.target) && !sidebar.contains(e.target)) {
        hamburgerMenu.classList.remove('active');
        sidebar.classList.remove('show');
    }
});

// Edit Profile Form Submit
editProfileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = editProfileForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        const updatedData = {
            name: document.getElementById('editName').value,
            bio: document.getElementById('editBio').value,
            updatedAt: serverTimestamp()
        };

        await updateDoc(doc(db, 'users', auth.currentUser.uid), updatedData);
        userData = { ...userData, ...updatedData };
        
        // Update UI elements
        userNameElements.forEach(el => el.textContent = updatedData.name);
        userInitialElement.textContent = updatedData.name.charAt(0).toUpperCase();
        userBioElement.textContent = updatedData.bio || 'No bio added yet';

        showToast('Profile updated successfully');
        closeModal();
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Error updating profile', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Save Changes';
    }
});

// Form validation with animations
function validateField(input) {
    const formGroup = input.closest('.form-group');
    const label = formGroup.querySelector('label');
    
    if (input.value.trim() === '') {
        formGroup.classList.add('error');
        label.style.color = 'var(--error-color)';
        return false;
    } else {
        formGroup.classList.remove('error');
        label.style.color = 'var(--primary-color)';
        return true;
    }
}

// Handle form submission with animations
document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const inputs = e.target.querySelectorAll('.form-control');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!validateField(input)) {
            isValid = false;
            input.classList.add('shake');
            setTimeout(() => input.classList.remove('shake'), 500);
        }
    });
    
    if (!isValid) return;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Updating...';
    
    try {
        const updatedData = {
            name: document.getElementById('editName').value,
            bio: document.getElementById('editBio').value,
            updatedAt: serverTimestamp()
        };

        await updateDoc(doc(db, 'users', auth.currentUser.uid), updatedData);
        userData = { ...userData, ...updatedData };
        
        // Update UI elements
        userNameElements.forEach(el => el.textContent = updatedData.name);
        userInitialElement.textContent = updatedData.name.charAt(0).toUpperCase();
        userBioElement.textContent = updatedData.bio || 'No bio added yet';

        showToast('Profile updated successfully');
        closeModal();
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Error updating profile', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Save Changes';
    }
});

// Add input animations
document.querySelectorAll('.form-control').forEach(input => {
    input.addEventListener('focus', () => {
        input.closest('.form-group').classList.add('focused');
    });
    
    input.addEventListener('blur', () => {
        input.closest('.form-group').classList.remove('focused');
        validateField(input);
    });
});

// Add form animation handlers
document.querySelectorAll('.form-control').forEach(input => {
    input.addEventListener('focus', (e) => {
        e.target.closest('.form-group').classList.add('focused');
    });

    input.addEventListener('blur', (e) => {
        const group = e.target.closest('.form-group');
        if (!e.target.value) {
            group.classList.remove('focused');
        }
    });

    // Validate on input
    input.addEventListener('input', (e) => {
        validateField(e.target);
    });
});

// Enhance form submission with animations
const form = document.querySelector('form');
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    let isValid = true;
    form.querySelectorAll('.form-group').forEach(group => {
        if (group.classList.contains('error')) {
            isValid = false;
        }
    });

    if (!isValid) return;

    // Show loading state on button
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';

    try {
        // ...existing update profile logic...
        
        // Show success message with animation
        showMessage('Profile updated successfully!', 'success');
    } catch (error) {
        showMessage('Error updating profile: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
});

function showMessage(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} fade`;
    alertDiv.textContent = message;
    form.insertAdjacentElement('beforebegin', alertDiv);
    setTimeout(() => alertDiv.classList.add('show'), 10);
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 300);
    }, 3000);
}

// Enhance form validation
function showValidationError(input, message) {
    const formGroup = input.parentElement;
    formGroup.classList.add('error');
    const errorDiv = formGroup.querySelector('.error-message') || document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    if (!formGroup.querySelector('.error-message')) {
        formGroup.appendChild(errorDiv);
    }
    formGroup.classList.add('shake');
    setTimeout(() => formGroup.classList.remove('shake'), 500);
}

function clearValidationError(input) {
    const formGroup = input.parentElement;
    formGroup.classList.remove('error');
    const errorDiv = formGroup.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.remove();
    }
}

function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours === 0) {
            const minutes = Math.floor(diff / (1000 * 60));
            return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        }
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (days < 7) {
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString();
    }
}