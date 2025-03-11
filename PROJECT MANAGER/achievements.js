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
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Navbar } from './components/navbar.js';

// Initialize navbar
const navbar = new Navbar('app-navbar');
navbar.init();

// DOM Elements
const totalAchievements = document.getElementById('totalAchievements');
const totalPoints = document.getElementById('totalPoints');
const currentRank = document.getElementById('currentRank');
const achievementGrids = {
    productivity: document.getElementById('productivityAchievements'),
    teamwork: document.getElementById('teamworkAchievements'),
    milestone: document.getElementById('milestoneAchievements'),
    expert: document.getElementById('expertAchievements')
};

// Achievement definitions
const achievements = {
    productivity: [
        {
            id: 'fast_completer',
            name: 'Fast Completer',
            description: 'Complete 5 tasks before their due date',
            target: 5,
            points: 100,
            reward: 'Early Bird Badge',
            icon: '⚡'
        },
        {
            id: 'task_master',
            name: 'Task Master',
            description: 'Complete 50 tasks',
            target: 50,
            points: 200,
            reward: 'Task Master Badge',
            icon: '✓'
        },
        {
            id: 'efficiency_expert',
            name: 'Efficiency Expert',
            description: 'Maintain 90% completion rate for tasks',
            target: 90,
            points: 300,
            reward: 'Efficiency Badge',
            icon: '📈'
        }
    ],
    teamwork: [
        {
            id: 'team_player',
            name: 'Team Player',
            description: 'Join 5 different project teams',
            target: 5,
            points: 150,
            reward: 'Team Player Badge',
            icon: '👥'
        },
        {
            id: 'collaborator',
            name: 'Super Collaborator',
            description: 'Complete 20 tasks with team members',
            target: 20,
            points: 250,
            reward: 'Collaboration Badge',
            icon: '🤝'
        },
        {
            id: 'team_leader',
            name: 'Team Leader',
            description: 'Lead 3 successful projects',
            target: 3,
            points: 400,
            reward: 'Leadership Badge',
            icon: '👑'
        }
    ],
    milestone: [
        {
            id: 'first_project',
            name: 'First Steps',
            description: 'Complete your first project',
            target: 1,
            points: 50,
            reward: 'Starter Badge',
            icon: '🎯'
        },
        {
            id: 'project_master',
            name: 'Project Master',
            description: 'Complete 10 projects',
            target: 10,
            points: 500,
            reward: 'Master Badge',
            icon: '🏆'
        },
        {
            id: 'perfect_score',
            name: 'Perfect Score',
            description: 'Complete a project with 100% task completion',
            target: 1,
            points: 300,
            reward: 'Perfectionist Badge',
            icon: '⭐'
        }
    ],
    expert: [
        {
            id: 'versatile_manager',
            name: 'Versatile Manager',
            description: 'Complete projects in 4 different categories',
            target: 4,
            points: 400,
            reward: 'Versatility Badge',
            icon: '🌟'
        },
        {
            id: 'deadline_keeper',
            name: 'Deadline Keeper',
            description: 'Complete 20 projects before deadline',
            target: 20,
            points: 600,
            reward: 'Timekeeper Badge',
            icon: '⏰'
        },
        {
            id: 'project_legend',
            name: 'Project Legend',
            description: 'Earn 2000 achievement points',
            target: 2000,
            points: 1000,
            reward: 'Legend Badge',
            icon: '🌠'
        }
    ]
};

// Rank thresholds
const ranks = [
    { name: 'Novice', threshold: 0 },
    { name: 'Apprentice', threshold: 500 },
    { name: 'Professional', threshold: 1000 },
    { name: 'Expert', threshold: 2000 },
    { name: 'Master', threshold: 3500 },
    { name: 'Legend', threshold: 5000 }
];

let userAchievements = {};
let userStats = {
    totalPoints: 0,
    completedTasks: 0,
    completedProjects: 0,
    teamJoined: 0
};

// Check authentication and load achievements
onAuthStateChanged(auth, async (user) => {
    if (user) {
        await loadUserAchievements(user);
        setupRealtimeListeners(user);
    } else {
        window.location.href = 'login.html';
    }
});

async function loadUserAchievements(user) {
    try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            userAchievements = userDoc.data().achievements || {};
            userStats = userDoc.data().stats || {
                totalPoints: 0,
                completedTasks: 0,
                completedProjects: 0,
                teamJoined: 0
            };
        }

        updateAchievementsUI();
        updateStatsUI();
        checkForNewAchievements();
    } catch (error) {
        console.error('Error loading achievements:', error);
    }
}

function setupRealtimeListeners(user) {
    // Listen for project completions
    const projectsQuery = query(collection(db, 'projects'), 
        where('userId', '==', user.uid));

    onSnapshot(projectsQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'modified') {
                const project = change.doc.data();
                if (project.status === 'completed') {
                    checkProjectAchievements(project);
                }
            }
        });
    });

    // Listen for task completions
    const tasksQuery = query(collection(db, 'tasks'),
        where('assignee', '==', user.email));

    onSnapshot(tasksQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'modified') {
                const task = change.doc.data();
                if (task.completed) {
                    checkTaskAchievements(task);
                }
            }
        });
    });
}

function updateAchievementsUI() {
    // Update each achievement category
    Object.entries(achievements).forEach(([category, categoryAchievements]) => {
        achievementGrids[category].innerHTML = categoryAchievements.map(achievement => {
            const userProgress = userAchievements[achievement.id] || { progress: 0, unlocked: false };
            const progress = Math.min((userProgress.progress / achievement.target) * 100, 100);
            
            return `
                <div class="achievement-card ${userProgress.unlocked ? 'unlocked' : 'locked'}">
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-description">${achievement.description}</div>
                    <div class="achievement-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <div class="progress-text">
                            ${userProgress.progress} / ${achievement.target}
                        </div>
                    </div>
                    ${userProgress.unlocked ? 
                        `<div class="reward-badge">
                            ${achievement.reward} (+${achievement.points} points)
                        </div>` : ''}
                </div>
            `;
        }).join('');
    });
}

function updateStatsUI() {
    const unlockedCount = Object.values(userAchievements)
        .filter(a => a.unlocked).length;
    const totalCount = Object.values(achievements)
        .flat().length;

    totalAchievements.textContent = `${unlockedCount}/${totalCount}`;
    totalPoints.textContent = userStats.totalPoints;
    currentRank.textContent = calculateRank(userStats.totalPoints);
}

function calculateRank(points) {
    for (let i = ranks.length - 1; i >= 0; i--) {
        if (points >= ranks[i].threshold) {
            return ranks[i].name;
        }
    }
    return ranks[0].name;
}

async function checkForNewAchievements() {
    // Check productivity achievements
    const tasksQuery = query(collection(db, 'tasks'),
        where('assignee', '==', auth.currentUser.email));
    const tasksSnapshot = await getDocs(tasksQuery);
    const tasks = tasksSnapshot.docs.map(doc => doc.data());

    // Check team achievements
    const projectsQuery = query(collection(db, 'projects'),
        where('members', 'array-contains', auth.currentUser.email));
    const projectsSnapshot = await getDocs(projectsQuery);
    const projects = projectsSnapshot.docs.map(doc => doc.data());

    checkProductivityAchievements(tasks);
    checkTeamAchievements(projects);
    checkMilestoneAchievements(projects);
    checkExpertAchievements(projects);
}

async function unlockAchievement(achievementId, category) {
    const achievement = achievements[category].find(a => a.id === achievementId);
    if (!achievement) return;

    userAchievements[achievementId] = {
        unlocked: true,
        progress: achievement.target,
        unlockedAt: new Date().toISOString()
    };

    userStats.totalPoints += achievement.points;

    try {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            achievements: userAchievements,
            stats: userStats
        });

        // Show notification
        showNotification(
            'Achievement Unlocked!',
            `${achievement.name} - ${achievement.reward}`
        );

        updateAchievementsUI();
        updateStatsUI();
    } catch (error) {
        console.error('Error unlocking achievement:', error);
    }
}

function showNotification(title, message) {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(title, {
                    body: message,
                    icon: '/favicon.ico'
                });
            }
        });
    }
}

// Achievement check functions
function checkProductivityAchievements(tasks) {
    const completedTasks = tasks.filter(t => t.completed).length;
    const earlyTasks = tasks.filter(t => {
        return t.completed && new Date(t.completedAt) < new Date(t.dueDate);
    }).length;

    updateAchievementProgress('fast_completer', 'productivity', earlyTasks);
    updateAchievementProgress('task_master', 'productivity', completedTasks);

    if (tasks.length > 0) {
        const completionRate = (completedTasks / tasks.length) * 100;
        updateAchievementProgress('efficiency_expert', 'productivity', completionRate);
    }
}

function checkTeamAchievements(projects) {
    const uniqueTeams = new Set(projects.map(p => p.id)).size;
    const teamTasks = projects.reduce((acc, p) => acc + (p.completedTeamTasks || 0), 0);
    const ledProjects = projects.filter(p => p.leaderId === auth.currentUser.uid && p.status === 'completed').length;

    updateAchievementProgress('team_player', 'teamwork', uniqueTeams);
    updateAchievementProgress('collaborator', 'teamwork', teamTasks);
    updateAchievementProgress('team_leader', 'teamwork', ledProjects);
}

function checkMilestoneAchievements(projects) {
    const completedProjects = projects.filter(p => p.status === 'completed');
    const perfectProjects = completedProjects.filter(p => p.completionRate === 100).length;

    updateAchievementProgress('first_project', 'milestone', completedProjects.length > 0 ? 1 : 0);
    updateAchievementProgress('project_master', 'milestone', completedProjects.length);
    updateAchievementProgress('perfect_score', 'milestone', perfectProjects);
}

function checkExpertAchievements(projects) {
    const uniqueCategories = new Set(projects.map(p => p.type)). size;
    const onTimeProjects = projects.filter(p => {
        return p.status === 'completed' && new Date(p.completedAt) <= new Date(p.dueDate);
    }).length;

    updateAchievementProgress('versatile_manager', 'expert', uniqueCategories);
    updateAchievementProgress('deadline_keeper', 'expert', onTimeProjects);
    updateAchievementProgress('project_legend', 'expert', userStats.totalPoints);
}

function updateAchievementProgress(achievementId, category, progress) {
    const achievement = achievements[category].find(a => a.id === achievementId);
    if (!achievement) return;

    const currentProgress = userAchievements[achievementId] || { progress: 0, unlocked: false };
    
    if (!currentProgress.unlocked && progress >= achievement.target) {
        unlockAchievement(achievementId, category);
    } else if (!currentProgress.unlocked) {
        userAchievements[achievementId] = {
            ...currentProgress,
            progress: Math.max(currentProgress.progress, progress)
        };
        updateAchievementsUI();
    }
}