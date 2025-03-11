import { Navbar } from './components/navbar.js';
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    collection,
    query,
    where,
    getDocs,
    updateDoc,
    doc,
    onSnapshot,
    Timestamp,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Initialize navbar
const navbar = new Navbar('app-navbar');
navbar.init();

// DOM Elements
const invitationsList = document.getElementById('invitationsList');
const filterButtons = document.querySelectorAll('.filter-btn');

// Current filter
let currentFilter = 'all';
let currentInvitations = [];

// Check authentication and load invitations
onAuthStateChanged(auth, async (user) => {
    if (user) {
        setupInvitationsListener(user);
    } else {
        window.location.href = 'login.html';
    }
});

function setupInvitationsListener(user) {
    // Listen for invitations in real-time
    const invitationsQuery = query(
        collection(db, 'invitations'),
        where('recipientEmail', '==', user.email)
    );

    onSnapshot(invitationsQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const invitation = { id: change.doc.id, ...change.doc.data() };

            if (change.type === 'added') {
                currentInvitations.push(invitation);
                // Show notification for new invitations
                if (!invitation.seen) {
                    showNotification('New Project Invitation', `You have been invited to join ${invitation.projectName}`);
                }
            } else if (change.type === 'modified') {
                const index = currentInvitations.findIndex(i => i.id === invitation.id);
                if (index !== -1) {
                    currentInvitations[index] = invitation;
                }
            } else if (change.type === 'removed') {
                currentInvitations = currentInvitations.filter(i => i.id !== invitation.id);
            }
        });

        updateInvitationsUI();
    });
}

function updateInvitationsUI() {
    const filteredInvitations = filterInvitations(currentInvitations);
    
    if (filteredInvitations.length === 0) {
        invitationsList.innerHTML = `
            <div class="no-invitations">
                <i class="fas fa-inbox fa-3x"></i>
                <p>No invitations found</p>
            </div>
        `;
        return;
    }

    invitationsList.innerHTML = filteredInvitations.map(invitation => `
        <div class="invitation-card ${!invitation.seen ? 'invitation-new' : ''}" id="invitation-${invitation.id}">
            ${!invitation.seen ? '<div class="notification-badge">New</div>' : ''}
            <div class="invitation-header">
                <div class="invitation-project">${invitation.projectName}</div>
                <div class="invitation-date">${formatDate(invitation.sentAt)}</div>
            </div>
            <div class="invitation-details">
                <div class="invitation-from">
                    <div class="inviter-avatar">
                        ${invitation.senderName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div>${invitation.senderName}</div>
                        <small>${invitation.senderEmail}</small>
                    </div>
                </div>
                <p>${invitation.message || 'You have been invited to join this project.'}</p>
            </div>
            ${invitation.status === 'pending' ? `
                <div class="invitation-actions">
                    <button class="action-btn accept" onclick="handleInvitation('${invitation.id}', 'accepted')">
                        <i class="fas fa-check"></i> Accept
                    </button>
                    <button class="action-btn decline" onclick="handleInvitation('${invitation.id}', 'declined')">
                        <i class="fas fa-times"></i> Decline
                    </button>
                </div>
            ` : `
                <div class="invitation-status status-${invitation.status}">
                    ${capitalizeFirst(invitation.status)}
                </div>
            `}
        </div>
    `).join('');
}

function filterInvitations(invitations) {
    if (currentFilter === 'all') return invitations;
    return invitations.filter(invitation => invitation.status === currentFilter);
}

// Event Listeners for filter buttons
filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        currentFilter = button.dataset.filter;
        updateInvitationsUI();
    });
});

// Handle invitation response
window.handleInvitation = async function(invitationId, response) {
    try {
        const invitationRef = doc(db, 'invitations', invitationId);
        const invitation = currentInvitations.find(i => i.id === invitationId);
        
        if (!invitation) return;

        // Update invitation status
        await updateDoc(invitationRef, {
            status: response,
            respondedAt: Timestamp.now()
        });

        if (response === 'accepted') {
            // Add user to project members
            const projectRef = doc(db, 'projects', invitation.projectId);
            const projectDoc = await getDoc(projectRef);
            
            if (projectDoc.exists()) {
                const currentMembers = projectDoc.data().members || [];
                if (!currentMembers.includes(invitation.recipientEmail)) {
                    await updateDoc(projectRef, {
                        members: [...currentMembers, invitation.recipientEmail]
                    });
                }
            }
        }

        // Show success message
        showNotification(
            'Invitation Response',
            `You have ${response} the invitation to ${invitation.projectName}`
        );

    } catch (error) {
        console.error('Error handling invitation:', error);
        alert('Error processing invitation response. Please try again.');
    }
};

// Helper Functions
function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString(undefined, options);
}

function capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
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