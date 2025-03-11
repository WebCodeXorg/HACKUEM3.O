import { Navbar } from './components/navbar.js';
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    deleteDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Initialize navbar
const navbar = new Navbar('app-navbar');
navbar.init();

// Get project ID from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('id');

if (!projectId) {
    window.location.href = 'index.html';
}

// DOM Elements
const projectName = document.getElementById('projectName');
const projectDescription = document.getElementById('projectDescription');
const projectDueDate = document.getElementById('projectDueDate');
const projectType = document.getElementById('projectType');
const projectPriority = document.getElementById('projectPriority');
const progressBar = document.getElementById('progressBar');
const progressPercentage = document.getElementById('progressPercentage');
const teamList = document.getElementById('teamList');
const taskList = document.getElementById('taskList');
const addMemberBtn = document.getElementById('addMemberBtn');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskModal = document.getElementById('taskModal');
const memberModal = document.getElementById('memberModal');
const taskForm = document.getElementById('taskForm');
const memberForm = document.getElementById('memberForm');
const assigneeSelect = document.getElementById('assignee');
const closeBtns = document.querySelectorAll('.close');

// Current project data
let currentProject = null;
let currentTasks = [];
let teamMembers = [];
let currentEditingTask = null;

// Check authentication and load project
onAuthStateChanged(auth, async (user) => {
    if (user) {
        await loadProject(user);
        setupRealtimeListeners();
    } else {
        window.location.href = 'login.html';
    }
});

// Load project data
async function loadProject(user) {
    try {
        const projectRef = doc(db, 'projects', projectId);
        const projectSnap = await getDoc(projectRef);
        
        if (!projectSnap.exists()) {
            window.location.href = 'index.html';
            return;
        }

        currentProject = { id: projectSnap.id, ...projectSnap.data() };
        
        // Update UI with project details
        updateProjectUI();
        
        // Load team members
        await loadTeamMembers();
        
        // Load tasks
        await loadTasks();
        
        // Update progress
        updateProgress();
    } catch (error) {
        console.error('Error loading project:', error);
    }
}

function updateProjectUI() {
    projectName.textContent = currentProject.name;
    projectDescription.textContent = currentProject.description;
    projectDueDate.textContent = formatDate(currentProject.dueDate);
    projectType.textContent = currentProject.type;
    projectPriority.textContent = currentProject.priority;
}

async function loadTeamMembers() {
    try {
        teamMembers = [];
        const memberEmails = currentProject.members || [];
        
        for (const email of memberEmails) {
            const userQuery = query(collection(db, 'users'), where('email', '==', email));
            const userSnap = await getDocs(userQuery);
            if (!userSnap.empty) {
                const userData = userSnap.docs[0].data();
                teamMembers.push({
                    id: userSnap.docs[0].id,
                    email: userData.email,
                    name: userData.name
                });
            }
        }
        
        updateTeamUI();
        updateAssigneeSelect();
    } catch (error) {
        console.error('Error loading team members:', error);
    }
}

function updateTeamUI() {
    teamList.innerHTML = teamMembers.map(member => `
        <div class="team-member">
            <div class="member-avatar">
                ${member.name.charAt(0).toUpperCase()}
            </div>
            <div class="member-info">
                <div class="member-name">${member.name}</div>
                <div class="member-email">${member.email}</div>
            </div>
            <button class="action-btn delete" onclick="removeMember('${member.email}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function updateAssigneeSelect() {
    assigneeSelect.innerHTML = teamMembers.map(member => `
        <option value="${member.email}">${member.name}</option>
    `).join('');
}

async function loadTasks() {
    try {
        const tasksQuery = query(collection(db, 'tasks'), where('projectId', '==', projectId));
        const taskSnap = await getDocs(tasksQuery);
        
        currentTasks = taskSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        updateTasksUI();
        updateProgress();
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

function updateTasksUI() {
    taskList.innerHTML = currentTasks.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''}">
            <div class="task-title">
                <div class="task-checkbox ${task.completed ? 'checked' : ''}" 
                     onclick="toggleTask('${task.id}')">
                    ${task.completed ? '<i class="fas fa-check"></i>' : ''}
                </div>
                <div>
                    <div>${task.title}</div>
                    <small>Assigned to: ${getTeamMemberName(task.assignee)}</small>
                </div>
            </div>
            <div class="task-actions">
                <button class="action-btn edit" onclick="editTask('${task.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="deleteTask('${task.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function updateProgress() {
    const totalTasks = currentTasks.length;
    const completedTasks = currentTasks.filter(task => task.completed).length;
    const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    
    progressBar.style.width = `${progress}%`;
    progressPercentage.textContent = `${progress}%`;
}

function setupRealtimeListeners() {
    // Listen for task changes
    const tasksQuery = query(collection(db, 'tasks'), where('projectId', '==', projectId));
    onSnapshot(tasksQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
                const taskIndex = currentTasks.findIndex(t => t.id === change.doc.id);
                const taskData = { id: change.doc.id, ...change.doc.data() };
                
                if (taskIndex === -1) {
                    currentTasks.push(taskData);
                } else {
                    currentTasks[taskIndex] = taskData;
                }
            }
            if (change.type === 'removed') {
                currentTasks = currentTasks.filter(t => t.id !== change.doc.id);
            }
        });
        
        updateTasksUI();
        updateProgress();
    });
}

// Event Listeners
addTaskBtn.addEventListener('click', () => {
    taskModal.style.display = 'block';
});

addMemberBtn.addEventListener('click', () => {
    memberModal.style.display = 'block';
});

closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        taskModal.style.display = 'none';
        memberModal.style.display = 'none';
        resetTaskModal();
    });
});

taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const taskData = {
            projectId: projectId,
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            assignee: document.getElementById('assignee').value,
            dueDate: document.getElementById('taskDueDate').value,
            completed: currentEditingTask ? currentEditingTask.completed : false,
            createdAt: currentEditingTask ? currentEditingTask.createdAt : new Date().toISOString()
        };
        
        if (currentEditingTask) {
            // Update existing task
            await updateDoc(doc(db, 'tasks', currentEditingTask.id), taskData);
        } else {
            // Add new task
            await addDoc(collection(db, 'tasks'), taskData);
        }
        
        taskModal.style.display = 'none';
        resetTaskModal();
    } catch (error) {
        console.error('Error saving task:', error);
        alert('Error saving task. Please try again.');
    }
});

memberForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const email = document.getElementById('memberEmail').value;
        const role = document.getElementById('memberRole').value;
        
        // Check if user exists
        const userQuery = query(collection(db, 'users'), where('email', '==', email));
        const userSnap = await getDocs(userQuery);
        
        if (userSnap.empty) {
            alert('User not found. Please make sure the email is registered.');
            return;
        }
        
        // Add member to project
        const updatedMembers = [...(currentProject.members || [])];
        if (!updatedMembers.includes(email)) {
            updatedMembers.push(email);
            await updateDoc(doc(db, 'projects', projectId), {
                members: updatedMembers
            });
            
            await loadTeamMembers();
        }
        
        memberModal.style.display = 'none';
        memberForm.reset();
    } catch (error) {
        console.error('Error adding team member:', error);
        alert('Error adding team member. Please try again.');
    }
});

// Helper Functions
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function getTeamMemberName(email) {
    const member = teamMembers.find(m => m.email === email);
    return member ? member.name : email;
}

function updateTaskModalForEdit(task) {
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description;
    document.getElementById('assignee').value = task.assignee;
    document.getElementById('taskDueDate').value = task.dueDate;
    
    const submitBtn = taskForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Update Task';
}

function resetTaskModal() {
    taskForm.reset();
    currentEditingTask = null;
    const submitBtn = taskForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Add Task';
}

window.editTask = function(taskId) {
    const task = currentTasks.find(t => t.id === taskId);
    if (task) {
        currentEditingTask = task;
        updateTaskModalForEdit(task);
        taskModal.style.display = 'block';
    }
};

// Make functions available globally
window.toggleTask = async function(taskId) {
    try {
        const task = currentTasks.find(t => t.id === taskId);
        if (task) {
            await updateDoc(doc(db, 'tasks', taskId), {
                completed: !task.completed
            });
        }
    } catch (error) {
        console.error('Error toggling task:', error);
    }
};

window.deleteTask = async function(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        try {
            await deleteDoc(doc(db, 'tasks', taskId));
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Error deleting task. Please try again.');
        }
    }
};

window.removeMember = async function(memberEmail) {
    if (confirm('Are you sure you want to remove this team member?')) {
        try {
            const updatedMembers = currentProject.members.filter(email => email !== memberEmail);
            await updateDoc(doc(db, 'projects', projectId), {
                members: updatedMembers
            });
            await loadTeamMembers();
        } catch (error) {
            console.error('Error removing team member:', error);
            alert('Error removing team member. Please try again.');
        }
    }
};

// Update window click handler
window.addEventListener('click', (e) => {
    if (e.target === taskModal) {
        taskModal.style.display = 'none';
        resetTaskModal();
    }
    if (e.target === memberModal) {
        memberModal.style.display = 'none';
    }
});