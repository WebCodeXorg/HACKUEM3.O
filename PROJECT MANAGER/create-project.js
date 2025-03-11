import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBZs0zgqe8fJitJv8F_T4bpNkN2be2TziA",
    authDomain: "projectmanager-2129b.firebaseapp.com",
    projectId: "projectmanager-2129b",
    storageBucket: "projectmanager-2129b.firebasestorage.app",
    messagingSenderId: "311655550491",
    appId: "1:311655550491:web:0f912487759148e57d32be"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let teamMembers = [];
let currentUser = null;

const projectTypes = [
    { id: 'web', name: 'Web Development', icon: 'fa-globe' },
    { id: 'mobile', name: 'Mobile App', icon: 'fa-mobile-alt' },
    { id: 'desktop', name: 'Desktop Application', icon: 'fa-desktop' },
    { id: 'api', name: 'API Development', icon: 'fa-code' },
    { id: 'other', name: 'Other', icon: 'fa-project-diagram' }
];

const priorityLevels = [
    { id: 'low', name: 'Low', color: '#28a745', icon: 'fa-angle-down' },
    { id: 'medium', name: 'Medium', color: '#ffc107', icon: 'fa-equals' },
    { id: 'high', name: 'High', color: '#fd7e14', icon: 'fa-angle-up' },
    { id: 'urgent', name: 'Urgent', color: '#dc3545', icon: 'fa-exclamation' }
];

function initializeProjectCards() {
    const typeContainer = document.getElementById('projectTypeCards');
    const priorityContainer = document.getElementById('priorityCards');

    // Create project type cards
    typeContainer.innerHTML = projectTypes.map(type => `
        <div class="type-card" data-type="${type.id}">
            <i class="fas ${type.icon}"></i>
            <span>${type.name}</span>
        </div>
    `).join('');

    // Create priority cards
    priorityContainer.innerHTML = priorityLevels.map(priority => `
        <div class="priority-card" data-priority="${priority.id}" style="border-color: ${priority.color}">
            <i class="fas ${priority.icon}" style="color: ${priority.color}"></i>
            <span style="color: ${priority.color}">${priority.name}</span>
        </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.type-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            document.getElementById('projectType').value = card.dataset.type;
        });
    });

    document.querySelectorAll('.priority-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.priority-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            document.getElementById('priority').value = card.dataset.priority;
        });
    });
}

// Check authentication state
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('adminEmail').textContent = user.email;
        initializeProjectCards(); // Initialize the card options
    } else {
        window.location.href = 'login.html';
    }
});

// Handle member addition
document.getElementById('addMemberBtn').addEventListener('click', () => {
    const emailInput = document.getElementById('memberEmail');
    const email = emailInput.value.trim();

    if (email && !teamMembers.some(m => m.email === email)) {
        teamMembers.push({
            email,
            status: 'pending',
            role: 'member'
        });
        emailInput.value = '';
        updateMembersList();
    }
});

// Handle form submission
document.getElementById('createProjectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const projectType = document.getElementById('projectType').value;
    const priority = document.getElementById('priority').value;

    if (!projectType || projectType === 'Select Project Type') {
        alert('Please select a project type');
        return;
    }

    if (!priority || priority === 'Select Priority Level') {
        alert('Please select a priority level');
        return;
    }

    try {
        const projectData = {
            name: document.getElementById('projectName').value,
            description: document.getElementById('projectDescription').value,
            type: projectType,
            priority: priority,
            startDate: document.getElementById('startDate').value,
            dueDate: document.getElementById('dueDate').value,
            budget: parseFloat(document.getElementById('budget').value) || 0,
            technology: document.getElementById('technology').value,
            status: 'active',
            progress: 0,
            createdBy: {
                email: currentUser.email,
                uid: currentUser.uid,
                role: 'admin'
            },
            createdAt: serverTimestamp(),
            members: [...teamMembers, {
                email: currentUser.email,
                status: 'accepted',
                role: 'admin'
            }],
            timeline: getTimelineItems()
        };

        // Show loading state
        const submitBtn = document.querySelector('.btn-create');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

        // Add project to Firestore
        const projectRef = await addDoc(collection(db, 'projects'), projectData);

        // Create invitations for team members
        const invitationPromises = teamMembers.map(member => 
            addDoc(collection(db, 'invitations'), {
                projectId: projectRef.id,
                projectName: projectData.name,
                toEmail: member.email,
                fromEmail: currentUser.email,
                status: 'pending',
                createdAt: serverTimestamp()
            })
        );

        await Promise.all(invitationPromises);

        // Show success message
        alert('Project created successfully! Team members will receive invitations.');
        window.location.href = 'index.html';

    } catch (error) {
        console.error('Error creating project:', error);
        alert('Error creating project. Please try again.');
        
        // Reset button state
        const submitBtn = document.querySelector('.btn-create');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-plus"></i> Create Project';
    }
});

function getTimelineItems() {
    const timelineItems = [];
    const timelineNodes = document.querySelectorAll('.timeline-item');
    
    timelineNodes.forEach(item => {
        const titleInput = item.querySelector('.timeline-title');
        const descriptionInput = item.querySelector('.timeline-description');
        const dateInput = item.querySelector('.timeline-date');
        
        // Check if all required elements exist and have values
        if (titleInput && descriptionInput && dateInput && 
            titleInput.value && descriptionInput.value && dateInput.value) {
            timelineItems.push({
                title: titleInput.value.trim(),
                description: descriptionInput.value.trim(),
                date: dateInput.value
            });
        }
    });
    
    return timelineItems;
}

function updateMembersList() {
    const list = document.getElementById('membersList');
    list.innerHTML = teamMembers.map(member => `
        <div class="member-item">
            <div class="member-info">
                <i class="fas fa-user-circle"></i>
                <span title="${member.email}">${member.email}</span>
                <span class="member-status">(Invitation Pending)</span>
            </div>
            <button type="button" class="member-remove" data-email="${member.email}">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');

    // Add remove button handlers
    list.querySelectorAll('.member-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const email = btn.dataset.email;
            teamMembers = teamMembers.filter(m => m.email !== email);
            updateMembersList();
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Project Type Card Selection
    const typeCards = document.querySelectorAll('.type-card');
    const projectTypeInput = document.getElementById('projectType');

    typeCards.forEach(card => {
        card.addEventListener('click', () => {
            typeCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            projectTypeInput.value = card.dataset.type;
        });
    });

    // Priority Card Selection
    const priorityCards = document.querySelectorAll('.priority-card');
    const priorityInput = document.getElementById('priority');

    priorityCards.forEach(card => {
        card.addEventListener('click', () => {
            priorityCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            priorityInput.value = card.dataset.priority;
        });
    });

    // Timeline functionality
    const addTimelineBtn = document.getElementById('addTimeline');
    const timelineContainer = document.getElementById('timelineItems');
    let timelineItemCount = 0;

    function createTimelineItem() {
        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';
        const itemId = `timeline-${timelineItemCount}`;
        timelineItem.dataset.timelineId = itemId;
        
        timelineItem.innerHTML = `
            <div class="grid-2">
                <div class="form-group">
                    <label class="form-label" for="${itemId}-title">Timeline Title*</label>
                    <input type="text" id="${itemId}-title" class="timeline-title form-control" required placeholder="e.g., Design Phase">
                </div>
                <div class="form-group">
                    <label class="form-label" for="${itemId}-description">Description</label>
                    <textarea id="${itemId}-description" class="timeline-description form-control" rows="2" placeholder="Describe this phase"></textarea>
                </div>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label class="form-label" for="${itemId}-start-date">Start Date*</label>
                    <input type="date" id="${itemId}-start-date" class="timeline-start-date form-control" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="${itemId}-end-date">End Date*</label>
                    <input type="date" id="${itemId}-end-date" class="timeline-end-date form-control" required>
                </div>
            </div>
            <button type="button" class="btn-remove-timeline" onclick="this.closest('.timeline-item').remove()">
                <i class="fas fa-trash"></i> Remove
            </button>
        `;
        timelineContainer.appendChild(timelineItem);
        timelineItemCount++;

        // Add slide-up animation
        timelineItem.style.animation = 'slideUp 0.3s ease forwards';
    }

    // Function to remove timeline item
    window.removeTimelineItem = function(button) {
        const timelineItem = button.closest('.timeline-item');
        if (timelineItem) {
            timelineItem.remove();
        }
    };

    // Add timeline item when button is clicked
    addTimelineBtn.addEventListener('click', createTimelineItem);

    // Function to get all timeline items
    function getTimelineItems() {
        const items = [];
        const timelineItems = document.querySelectorAll('.timeline-item');
        
        timelineItems.forEach(item => {
            // Find input elements within this timeline item
            const titleInput = item.querySelector('.timeline-title');
            const startDateInput = item.querySelector('.timeline-start-date');
            const endDateInput = item.querySelector('.timeline-end-date');
            const descriptionInput = item.querySelector('.timeline-description');
            
            // Only add if we have at least title and duration
            if (titleInput && titleInput.value && startDateInput && startDateInput.value && endDateInput && endDateInput.value) {
                items.push({
                    title: titleInput.value,
                    startDate: startDateInput.value,
                    endDate: endDateInput.value,
                    description: descriptionInput ? descriptionInput.value : ''
                });
            }
        });
        
        return items;
    }

    // Form submission
    const createProjectForm = document.getElementById('createProjectForm');
    if (createProjectForm) {
        createProjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                // Validate project type and priority
                const projectType = document.getElementById('projectType').value;
                const priority = document.getElementById('priority').value;
                
                if (!projectType || !priority) {
                    throw new Error('Please select project type and priority level');
                }

                const projectData = {
                    name: document.getElementById('projectName').value,
                    description: document.getElementById('projectDescription').value,
                    type: projectType,
                    priority: priority,
                    startDate: document.getElementById('startDate').value,
                    dueDate: document.getElementById('dueDate').value,
                    budget: document.getElementById('budget').value || null,
                    technology: document.getElementById('technology').value || '',
                    timeline: getTimelineItems()
                };

                // Validate required fields
                if (!projectData.name || !projectData.description || 
                    !projectData.startDate || !projectData.dueDate) {
                    throw new Error('Please fill in all required fields');
                }

                console.log('Project Data:', projectData);
                // Add your API call here
                
            } catch (error) {
                console.error('Error creating project:', error);
                alert(error.message);
            }
        });
    }

    // Create an initial timeline item
    createTimelineItem();
});

// In your form submission handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const timelineItems = getTimelineItems();
        // Validate if there are any timeline items
        if (timelineItems.length === 0) {
            throw new Error('Please add at least one timeline item');
        }
        
        // Rest of your form submission code
        // ...existing code...
        
    } catch (error) {
        console.error('Error creating project:', error);
        alert(error.message);
    }
});