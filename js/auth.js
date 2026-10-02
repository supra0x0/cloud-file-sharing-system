// =========================================================
// SFS - AUTHENTICATION
// Register, Login, Logout & Password Reset
// =========================================================

import {
    auth,
    db
} from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";


// =========================================================
// REGISTER
// =========================================================

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const fullName =
            document.getElementById("fullName").value.trim();

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;

        const confirmPassword =
            document.getElementById("confirmPassword").value;

        const message =
            document.getElementById("registerMessage");


        // Check password match
        if (password !== confirmPassword) {

            message.textContent =
                "Passwords do not match.";

            message.style.color = "#dc2626";

            return;
        }


        // Check password length
        if (password.length < 6) {

            message.textContent =
                "Password must contain at least 6 characters.";

            message.style.color = "#dc2626";

            return;
        }


        try {

            message.textContent =
                "Creating your account...";

            message.style.color = "#667085";


            // Create Firebase account
            const userCredential =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            const user =
                userCredential.user;


            // Add user's name to Firebase Authentication
            await updateProfile(user, {
                displayName: fullName
            });


            // Create user document in Firestore
            await setDoc(
                doc(db, "users", user.uid),
                {
                    uid: user.uid,
                    name: fullName,
                    email: email,
                    createdAt: serverTimestamp()
                }
            );


            message.textContent =
                "Account created successfully!";

            message.style.color = "#16a34a";


            // Go to dashboard
            setTimeout(() => {

                window.location.href =
                    "dashboard.html";

            }, 1000);


        } catch (error) {

            console.error(error);

            message.style.color = "#dc2626";

            message.textContent =
                getAuthErrorMessage(error.code);

        }

    });

}


// =========================================================
// LOGIN
// =========================================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();


        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;

        const message =
            document.getElementById("loginMessage");


        try {

            message.textContent =
                "Logging in...";

            message.style.color = "#667085";


            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


            message.textContent =
                "Login successful!";

            message.style.color = "#16a34a";


            // Go to dashboard
            setTimeout(() => {

                window.location.href =
                    "dashboard.html";

            }, 700);


        } catch (error) {

            console.error(error);

            message.style.color = "#dc2626";

            message.textContent =
                getAuthErrorMessage(error.code);

        }

    });

}


// =========================================================
// LOGOUT
// =========================================================

const logoutBtn =
    document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener("click", async () => {

        try {

            await signOut(auth);

            window.location.href =
                "index.html";

        } catch (error) {

            console.error(
                "Logout error:",
                error
            );

        }

    });

}


// =========================================================
// FORGOT PASSWORD
// =========================================================

const forgotPassword =
    document.getElementById("forgotPassword");

if (forgotPassword) {

    forgotPassword.addEventListener(
        "click",
        async (event) => {

            event.preventDefault();


            const emailInput =
                document.getElementById("email");

            const message =
                document.getElementById("loginMessage");


            const email =
                emailInput.value.trim();


            if (!email) {

                message.textContent =
                    "Enter your email address first.";

                message.style.color =
                    "#dc2626";

                emailInput.focus();

                return;
            }


            try {

                await sendPasswordResetEmail(
                    auth,
                    email
                );


                message.textContent =
                    "Password reset email sent. Check your inbox.";

                message.style.color =
                    "#16a34a";


            } catch (error) {

                console.error(error);

                message.textContent =
                    getAuthErrorMessage(error.code);

                message.style.color =
                    "#dc2626";

            }

        }
    );

}


// =========================================================
// SHOW / HIDE LOGIN PASSWORD
// =========================================================

const togglePassword =
    document.getElementById("togglePassword");

if (togglePassword) {

    togglePassword.addEventListener(
        "click",
        () => {

            const password =
                document.getElementById("password");


            if (password.type === "password") {

                password.type = "text";

                togglePassword.textContent =
                    "Hide";

            } else {

                password.type = "password";

                togglePassword.textContent =
                    "Show";
            }

        }
    );

}


// =========================================================
// SHOW / HIDE REGISTER PASSWORD
// =========================================================

const toggleRegisterPassword =
    document.getElementById("togglePassword");

if (
    toggleRegisterPassword &&
    document.getElementById("confirmPassword")
) {

    toggleRegisterPassword.addEventListener(
        "click",
        () => {

            const password =
                document.getElementById("password");


            if (password.type === "password") {

                password.type = "text";

                toggleRegisterPassword.textContent =
                    "Hide";

            } else {

                password.type = "password";

                toggleRegisterPassword.textContent =
                    "Show";
            }

        }
    );

}


// =========================================================
// SHOW / HIDE CONFIRM PASSWORD
// =========================================================

const toggleConfirmPassword =
    document.getElementById(
        "toggleConfirmPassword"
    );

if (toggleConfirmPassword) {

    toggleConfirmPassword.addEventListener(
        "click",
        () => {

            const password =
                document.getElementById(
                    "confirmPassword"
                );


            if (password.type === "password") {

                password.type = "text";

                toggleConfirmPassword.textContent =
                    "Hide";

            } else {

                password.type = "password";

                toggleConfirmPassword.textContent =
                    "Show";
            }

        }
    );

}


// =========================================================
// AUTH STATE
// =========================================================
//
// Checks whether a user is currently logged in.
// Dashboard pages can use this to protect the page.
// =========================================================

onAuthStateChanged(auth, (user) => {

    const currentPage =
        window.location.pathname;


    // If user is logged in
    if (user) {

        console.log(
            "Logged in user:",
            user.email
        );

    }

});


// =========================================================
// FIREBASE ERROR MESSAGES
// =========================================================

function getAuthErrorMessage(errorCode) {

    switch (errorCode) {

        case "auth/email-already-in-use":
            return "This email is already registered.";

        case "auth/invalid-email":
            return "Please enter a valid email address.";

        case "auth/weak-password":
            return "Password is too weak.";

        case "auth/invalid-credential":
            return "Incorrect email or password.";

        case "auth/user-not-found":
            return "No account found with this email.";

        case "auth/wrong-password":
            return "Incorrect password.";

        case "auth/too-many-requests":
            return "Too many attempts. Please try again later.";

        case "auth/network-request-failed":
            return "Network error. Check your internet connection.";

        default:
            return "Something went wrong. Please try again.";
    }

}