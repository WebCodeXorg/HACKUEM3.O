import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getFirestore, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const storage = getStorage(app);
const db = getFirestore(app);

let currentUser = null;

// Handle authentication state
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        // Load existing profile data
        loadProfileData(user);
    } else {
        window.location.href = 'login.html';
    }
});

async function loadProfileData(user) {
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            document.getElementById('fullName').value = data.fullName || '';
            document.getElementById('title').value = data.title || '';
            document.getElementById('phone').value = data.phone || '';
            document.getElementById('location').value = data.location || '';
            if (data.photoURL) {
                document.getElementById('profilePreview').src = data.photoURL;
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Handle image preview
document.getElementById('profileImage').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('profilePreview').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Handle form submission
document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitButton = document.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

    try {
        let photoURL = currentUser.photoURL;

        // Handle image upload if a new image was selected
        const imageFile = document.getElementById('profileImage').files[0];
        if (imageFile) {
            const storageRef = ref(storage, `profile-images/${currentUser.uid}`);
            await uploadBytes(storageRef, imageFile);
            photoURL = await getDownloadURL(storageRef);
        }

        // Update auth profile
        await updateProfile(currentUser, {
            displayName: document.getElementById('fullName').value,
            photoURL: photoURL
        });

        // Update Firestore profile
        await updateDoc(doc(db, 'users', currentUser.uid), {
            fullName: document.getElementById('fullName').value,
            title: document.getElementById('title').value,
            phone: document.getElementById('phone').value,
            location: document.getElementById('location').value,
            photoURL: photoURL,
            updatedAt: new Date()
        });

        alert('Profile updated successfully!');
        window.location.href = 'profile.html';

    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Error updating profile. Please try again.');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Update Profile';
    }
});