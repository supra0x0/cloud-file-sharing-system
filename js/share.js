// =========================================================
// SFS - SHARE PAGE
// Secure File Sharing System
// =========================================================

import {
    db
} from "./firebase.js";

import {
    doc,
    getDoc,
    updateDoc,
    increment,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";


// =========================================================
// ELEMENTS
// =========================================================

const loadingState =
    document.getElementById("loadingState");

const fileInfo =
    document.getElementById("fileInfo");

const errorState =
    document.getElementById("errorState");

const errorMessage =
    document.getElementById("errorMessage");

const fileName =
    document.getElementById("fileName");

const fileType =
    document.getElementById("fileType");

const fileSize =
    document.getElementById("fileSize");

const uploadDate =
    document.getElementById("uploadDate");

const sharedBy =
    document.getElementById("sharedBy");

const downloadCount =
    document.getElementById("downloadCount");

const protectedFile =
    document.getElementById("protectedFile");

const unprotectedFile =
    document.getElementById("unprotectedFile");

const downloadBtn =
    document.getElementById("downloadBtn");

const filePasswordForm =
    document.getElementById("filePasswordForm");

const sharePassword =
    document.getElementById("sharePassword");

const passwordMessage =
    document.getElementById("passwordMessage");

const toggleSharePassword =
    document.getElementById(
        "toggleSharePassword"
    );

const expirationMessage =
    document.getElementById(
        "expirationMessage"
    );


// =========================================================
// GLOBAL VARIABLES
// =========================================================

let sharedFile = null;
let shareDocument = null;


// =========================================================
// GET SHARE ID FROM URL
// =========================================================
//
// Example:
//
// share.html?id=ABC123
//
// =========================================================

const urlParams =
    new URLSearchParams(
        window.location.search
    );

const shareId =
    urlParams.get("id");


// =========================================================
// START
// =========================================================

loadSharedFile();


// =========================================================
// LOAD SHARED FILE
// =========================================================

async function loadSharedFile() {

    if (!shareId) {

        showError(
            "No valid share link was provided."
        );

        return;
    }


    try {

        // Search shareLinks collection

        const shareQuery =
            query(
                collection(
                    db,
                    "shareLinks"
                ),
                where(
                    "token",
                    "==",
                    shareId
                ),
                where(
                    "active",
                    "==",
                    true
                )
            );


        const snapshot =
            await getDocs(
                shareQuery
            );


        if (
            snapshot.empty
        ) {

            showError(
                "This share link is invalid or no longer available."
            );

            return;
        }


        // Get first matching share link

        const shareDoc =
            snapshot.docs[0];


        shareDocument = {
            id:
                shareDoc.id,

            ...shareDoc.data()
        };


        // Check expiration

        if (
            shareDocument.expiresAt
        ) {

            const expiration =
                shareDocument.expiresAt.toDate();


            if (
                new Date() >
                expiration
            ) {

                showError(
                    "This share link has expired."
                );

                return;
            }


            showExpiration(
                expiration
            );

        }


        // Get actual file

        const fileReference =
            doc(
                db,
                "files",
                shareDocument.fileId
            );


        const fileSnapshot =
            await getDoc(
                fileReference
            );


        if (
            !fileSnapshot.exists()
        ) {

            showError(
                "This file has been deleted by the owner."
            );

            return;
        }


        sharedFile = {

            id:
                fileSnapshot.id,

            ...fileSnapshot.data()

        };


        // Display file

        displayFile(
            sharedFile
        );


    } catch (error) {

        console.error(
            "Share loading error:",
            error
        );


        showError(
            "Unable to load this shared file."
        );

    }

}


// =========================================================
// DISPLAY FILE
// =========================================================

function displayFile(file) {

    loadingState.classList.add(
        "hidden"
    );

    errorState.classList.add(
        "hidden"
    );

    fileInfo.classList.remove(
        "hidden"
    );


    // File name

    fileName.textContent =
        file.fileName;


    // File type

    fileType.textContent =
        getFileType(
            file.fileType,
            file.fileName
        );


    // File size

    fileSize.textContent =
        formatFileSize(
            file.fileSize
        );


    // Upload date

    uploadDate.textContent =
        formatDate(
            file.createdAt
        );


    // Owner

    sharedBy.textContent =
        file.ownerName ||
        "SFS User";


    // Downloads

    downloadCount.textContent =
        file.downloadCount || 0;


    // Password protection

    if (
        file.protected
    ) {

        protectedFile.classList.remove(
            "hidden"
        );

        unprotectedFile.classList.add(
            "hidden"
        );

    } else {

        protectedFile.classList.add(
            "hidden"
        );

        unprotectedFile.classList.remove(
            "hidden"
        );

    }

}


// =========================================================
// UNPROTECTED DOWNLOAD
// =========================================================

if (downloadBtn) {

    downloadBtn.addEventListener(
        "click",
        async () => {

            await downloadSharedFile();

        }
    );

}


// =========================================================
// PASSWORD PROTECTED DOWNLOAD
// =========================================================

if (filePasswordForm) {

    filePasswordForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const password =
                sharePassword.value;


            if (!password) {

                showPasswordMessage(
                    "Please enter the file password.",
                    false
                );

                return;
            }


            try {

                showPasswordMessage(
                    "Checking password...",
                    true
                );


                // Hash entered password

                const enteredHash =
                    await hashPassword(
                        password
                    );


                // Compare with stored hash

                if (
                    enteredHash !==
                    sharedFile.passwordHash
                ) {

                    showPasswordMessage(
                        "Incorrect password.",
                        false
                    );

                    return;
                }


                showPasswordMessage(
                    "Password correct. Starting download...",
                    true
                );


                await downloadSharedFile();


            } catch (error) {

                console.error(
                    "Password verification error:",
                    error
                );


                showPasswordMessage(
                    "Unable to verify password.",
                    false
                );

            }

        }
    );

}


// =========================================================
// DOWNLOAD SHARED FILE
// =========================================================

async function downloadSharedFile() {

    if (!sharedFile) return;


    // =====================================================
    // CHECK DOWNLOAD LIMIT
    // =====================================================

    if (
        shareDocument.downloadLimit &&
        shareDocument.downloadLimit > 0
    ) {

        const currentDownloads =
            sharedFile.downloadCount || 0;


        if (
            currentDownloads >=
            shareDocument.downloadLimit
        ) {

            showError(
                "This file has reached its maximum download limit."
            );

            return;
        }

    }


    try {

        // Update file download count

        await updateDoc(
            doc(
                db,
                "files",
                sharedFile.id
            ),
            {

                downloadCount:
                    increment(1)

            }
        );


        // Update displayed count

        const newCount =
            (sharedFile.downloadCount || 0) +
            1;


        downloadCount.textContent =
            newCount;


        sharedFile.downloadCount =
            newCount;


        // Open file

        const link =
            document.createElement(
                "a"
            );


        link.href =
            sharedFile.downloadURL;

        link.target =
            "_blank";

        link.rel =
            "noopener noreferrer";


        document.body.appendChild(
            link
        );


        link.click();

        link.remove();


    } catch (error) {

        console.error(
            "Download error:",
            error
        );


        showError(
            "Unable to download this file."
        );

    }

}


// =========================================================
// SHOW ERROR
// =========================================================

function showError(message) {

    loadingState.classList.add(
        "hidden"
    );

    fileInfo.classList.add(
        "hidden"
    );

    errorState.classList.remove(
        "hidden"
    );


    if (errorMessage) {

        errorMessage.textContent =
            message;

    }

}


// =========================================================
// SHOW EXPIRATION
// =========================================================

function showExpiration(
    expirationDate
) {

    if (!expirationMessage)
        return;


    const timeLeft =
        expirationDate.getTime() -
        Date.now();


    // Show warning only if less than 24 hours remain

    if (
        timeLeft <=
        24 * 60 * 60 * 1000
    ) {

        expirationMessage.classList.remove(
            "hidden"
        );


        expirationMessage.textContent =
            `⏱️ This share link expires on ${expirationDate.toLocaleString(
                "en-IN"
            )}.`;

    }

}


// =========================================================
// SHOW PASSWORD MESSAGE
// =========================================================

function showPasswordMessage(
    message,
    success
) {

    if (!passwordMessage)
        return;


    passwordMessage.textContent =
        message;


    passwordMessage.style.color =
        success
            ? "#16a34a"
            : "#dc2626";

}


// =========================================================
// SHOW / HIDE PASSWORD
// =========================================================

if (toggleSharePassword) {

    toggleSharePassword.addEventListener(
        "click",
        () => {

            if (
                sharePassword.type ===
                "password"
            ) {

                sharePassword.type =
                    "text";

                toggleSharePassword.textContent =
                    "Hide";

            } else {

                sharePassword.type =
                    "password";

                toggleSharePassword.textContent =
                    "Show";

            }

        }
    );

}


// =========================================================
// HASH PASSWORD
// =========================================================

async function hashPassword(
    password
) {

    const encoder =
        new TextEncoder();


    const data =
        encoder.encode(
            password
        );


    const hash =
        await crypto.subtle.digest(
            "SHA-256",
            data
        );


    return Array.from(
        new Uint8Array(hash)
    )
        .map(
            byte =>
                byte
                    .toString(16)
                    .padStart(
                        2,
                        "0"
                    )
        )
        .join("");

}


// =========================================================
// FILE SIZE
// =========================================================

function formatFileSize(
    bytes
) {

    if (!bytes)
        return "0 KB";


    const units = [
        "Bytes",
        "KB",
        "MB",
        "GB"
    ];


    const index =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );


    return (
        parseFloat(
            (
                bytes /
                Math.pow(
                    1024,
                    index
                )
            ).toFixed(2)
        ) +
        " " +
        units[index]
    );

}


// =========================================================
// FILE TYPE
// =========================================================

function getFileType(
    mimeType,
    name
) {

    if (
        mimeType &&
        mimeType !== "Unknown"
    ) {

        return mimeType;

    }


    const extension =
        name
            .split(".")
            .pop()
            .toUpperCase();


    return extension || "FILE";

}


// =========================================================
// DATE FORMAT
// =========================================================

function formatDate(
    timestamp
) {

    if (
        !timestamp ||
        !timestamp.toDate
    ) {

        return "-";

    }


    return timestamp
        .toDate()
        .toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

}