import { auth, db } from '../firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, updateDoc, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM Elements
const loginForm = document.getElementById('loginForm');
const passwordToggle = document.getElementById('passwordToggle');
const passwordInput = document.getElementById('password');

// Password Toggle Functionality
passwordToggle.addEventListener('click', function() {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.querySelector('i').className = `fas fa-${type === 'password' ? 'eye' : 'eye-slash'}`;
});

// Login Form Submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // Authenticate user
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update user login statistics
        await updateDoc(doc(db, 'users', user.uid), {
            loginCount: increment(1),
            lastLoginDate: serverTimestamp()
        });

        // Redirect to dashboard
        window.location.href = '../index.html';
    } catch (error) {
        console.error('Login error:', error.message);
        alert(error.message);
    }
});
