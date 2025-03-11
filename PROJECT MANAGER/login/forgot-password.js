import { auth } from '../firebase-config.js';
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', function() {
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const message = document.getElementById('message');

    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;

        try {
            await sendPasswordResetEmail(auth, email);
            message.textContent = 'Password reset link sent! Please check your email.';
            message.className = 'message success-message show';
            
            // Clear the form
            forgotPasswordForm.reset();

            // Redirect to login page after 3 seconds
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);

        } catch (error) {
            message.textContent = error.message;
            message.className = 'message error-message show';
        }
    });
});
