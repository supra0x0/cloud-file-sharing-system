// =========================================================
// SFS - DASHBOARD
// Secure File Sharing System
// Cloudinary Storage Version
// =========================================================

import {
    auth,
    db
} from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    updateDoc,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";


// =========================================================
// CLOUDINARY CONFIGURATION
// =========================================================

const CLOUDINARY_CLOUD_NAME = "rw0k4fao";

const CLOUDINARY_UPLOAD_PRESET = "sfs_upload";

const CLOUDINARY_UPLOAD_URL =
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;


// =========================================================
// GLOBAL VARIABLES
// =========================================================

let currentUser = null;
let allFiles = [];


// =========================================================
// ELEMENTS
// =========================================================

const welcomeUser =
    document.getElementById("welcomeUser");

const logoutBtn =
    document.getElementById("logoutBtn");

const uploadBtn =
    document.getElementById("uploadBtn");

const emptyUploadBtn =
    document.getElementById("emptyUploadBtn");

const uploadModal =
    document.getElementById("uploadModal");

const closeUploadModal =
    document.getElementById("closeUploadModal");

const uploadForm =
    document.getElementById("uploadForm");

const fileInput =
    document.getElementById("fileInput");

const protectFile =
    document.getElementById("protectFile");

const filePasswordGroup =
    document.getElementById("filePasswordGroup");

const filePassword =
    document.getElementById("filePassword");

const uploadMessage =
    document.getElementById("uploadMessage");

const fileList =
    document.getElementById("fileList");

const fileSearch =
    document.getElementById("fileSearch");

const totalFiles =
    document.getElementById("totalFiles");

const sharedFiles =
    document.getElementById("sharedFiles");

const protectedFiles =
    document.getElementById("protectedFiles");

const storageUsed =
    document.getElementById("storageUsed");

const activityList =
    document.getElementById("activityList");


// =========================================================
// CHECK LOGIN
// =========================================================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href =
            "login.html";

        return;
    }

    currentUser = user;

    const displayName =
        user.displayName ||
        user.email.split("@")[0];

    if (welcomeUser) {

        welcomeUser.textContent =
            `Welcome, ${displayName}`;

    }

    await loadFiles();

});


// =========================================================
// LOGOUT
// =========================================================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async () => {

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

        }
    );

}


// =========================================================
// OPEN UPLOAD MODAL
// =========================================================

function openUploadModal() {

    if (!uploadModal) return;

    uploadModal.classList.remove(
        "hidden"
    );

}


if (uploadBtn) {

    uploadBtn.addEventListener(
        "click",
        openUploadModal
    );

}


if (emptyUploadBtn) {

    emptyUploadBtn.addEventListener(
        "click",
        openUploadModal
    );

}


// =========================================================
// CLOSE UPLOAD MODAL
// =========================================================

if (closeUploadModal) {

    closeUploadModal.addEventListener(
        "click",
        () => {

            uploadModal.classList.add(
                "hidden"
            );

            resetUploadForm();

        }
    );

}


if (uploadModal) {

    uploadModal.addEventListener(
        "click",
        (event) => {

            if (
                event.target ===
                uploadModal
            ) {

                uploadModal.classList.add(
                    "hidden"
                );

                resetUploadForm();

            }

        }
    );

}


// =========================================================
// PASSWORD PROTECTION TOGGLE
// =========================================================

if (protectFile) {

    protectFile.addEventListener(
        "change",
        () => {

            if (protectFile.checked) {

                filePasswordGroup.classList.remove(
                    "hidden"
                );

                filePassword.required =
                    true;

            } else {

                filePasswordGroup.classList.add(
                    "hidden"
                );

                filePassword.required =
                    false;

                filePassword.value = "";

            }

        }
    );

}


// =========================================================
// UPLOAD FILE
// =========================================================

if (uploadForm) {

    uploadForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            if (!currentUser) return;


            const file =
                fileInput.files[0];


            if (!file) {

                showUploadMessage(
                    "Please select a file.",
                    false
                );

                return;

            }


            // =================================================
            // FILE SIZE LIMIT - 50 MB
            // =================================================

            const maxSize =
                50 * 1024 * 1024;


            if (file.size > maxSize) {

                showUploadMessage(
                    "File size must be less than 50 MB.",
                    false
                );

                return;

            }


            // =================================================
            // PASSWORD VALIDATION
            // =================================================

            if (
                protectFile.checked &&
                filePassword.value.length < 4
            ) {

                showUploadMessage(
                    "File password must contain at least 4 characters.",
                    false
                );

                return;

            }


            try {

                showUploadMessage(
                    "Uploading file to Cloudinary...",
                    true
                );


                // =================================================
                // CREATE CLOUDINARY FORM DATA
                // =================================================

                const formData =
                    new FormData();


                formData.append(
                    "file",
                    file
                );


                formData.append(
                    "upload_preset",
                    CLOUDINARY_UPLOAD_PRESET
                );


                // Store files inside user's folder
                formData.append(
                    "folder",
                    `sfs/${currentUser.uid}`
                );


                // =================================================
                // UPLOAD TO CLOUDINARY
                // =================================================

                const cloudinaryResponse =
                    await fetch(
                        CLOUDINARY_UPLOAD_URL,
                        {
                            method: "POST",
                            body: formData
                        }
                    );


                if (!cloudinaryResponse.ok) {

                    throw new Error(
                        "Cloudinary upload failed."
                    );

                }


                const cloudinaryData =
                    await cloudinaryResponse.json();


                console.log(
                    "Cloudinary response:",
                    cloudinaryData
                );


                // =================================================
                // GET CLOUDINARY FILE INFORMATION
                // =================================================

                const downloadURL =
                    cloudinaryData.secure_url;


                const publicId =
                    cloudinaryData.public_id;


                const resourceType =
                    cloudinaryData.resource_type ||
                    "raw";


                // =================================================
                // HASH PASSWORD
                // =================================================

                let passwordHash = null;


                if (
                    protectFile.checked
                ) {

                    passwordHash =
                        await hashPassword(
                            filePassword.value
                        );

                }


                // =================================================
                // SAVE FILE INFORMATION
                // TO FIRESTORE
                // =================================================

                const fileDocument =
                    await addDoc(
                        collection(
                            db,
                            "files"
                        ),
                        {

                            fileName:
                                file.name,

                            storagePath:
                                publicId,

                            downloadURL:
                                downloadURL,

                            cloudinaryPublicId:
                                publicId,

                            resourceType:
                                resourceType,

                            fileType:
                                file.type ||
                                "Unknown",

                            fileSize:
                                file.size,

                            ownerId:
                                currentUser.uid,

                            ownerName:
                                currentUser.displayName ||
                                currentUser.email,

                            protected:
                                protectFile.checked,

                            passwordHash:
                                passwordHash,

                            downloadCount:
                                0,

                            shared:
                                false,

                            createdAt:
                                serverTimestamp()

                        }
                    );


                // =================================================
                // SAVE ACTIVITY
                // =================================================

                await addDoc(
                    collection(
                        db,
                        "activity"
                    ),
                    {

                        userId:
                            currentUser.uid,

                        action:
                            "uploaded",

                        fileName:
                            file.name,

                        fileId:
                            fileDocument.id,

                        createdAt:
                            serverTimestamp()

                    }
                );


                showUploadMessage(
                    "File uploaded successfully!",
                    true
                );


                setTimeout(
                    async () => {

                        uploadModal.classList.add(
                            "hidden"
                        );

                        resetUploadForm();

                        await loadFiles();

                    },
                    800
                );


            } catch (error) {

                console.error(
                    "Upload error:",
                    error
                );


                showUploadMessage(
                    "Upload failed. Please try again.",
                    false
                );

            }

        }
    );

}


// =========================================================
// LOAD USER FILES
// =========================================================

async function loadFiles() {

    if (!currentUser) return;


    try {

        const filesQuery =
            query(
                collection(
                    db,
                    "files"
                ),
                where(
                    "ownerId",
                    "==",
                    currentUser.uid
                )
            );


        const snapshot =
            await getDocs(
                filesQuery
            );


        allFiles = [];


        snapshot.forEach(
            (document) => {

                allFiles.push({

                    id:
                        document.id,

                    ...document.data()

                });

            }
        );


        // Newest first

        allFiles.sort(
            (a, b) => {

                const dateA =
                    a.createdAt?.toMillis?.() ||
                    0;

                const dateB =
                    b.createdAt?.toMillis?.() ||
                    0;

                return dateB - dateA;

            }
        );


        updateStatistics();

        displayFiles(
            allFiles
        );

        loadActivity();


    } catch (error) {

        console.error(
            "Error loading files:",
            error
        );

    }

}


// =========================================================
// DISPLAY FILES
// =========================================================

function displayFiles(files) {

    if (!fileList) return;


    fileList.innerHTML = "";


    if (files.length === 0) {

        fileList.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="empty-files"
                >

                    <div class="empty-icon">
                        📂
                    </div>

                    <h3>
                        No files found
                    </h3>

                    <p>
                        Upload a file to get started.
                    </p>

                    <button
                        class="upload-small-btn"
                        id="dynamicUploadBtn"
                    >
                        Upload File
                    </button>

                </td>

            </tr>

        `;


        const dynamicUploadBtn =
            document.getElementById(
                "dynamicUploadBtn"
            );


        if (dynamicUploadBtn) {

            dynamicUploadBtn.addEventListener(
                "click",
                openUploadModal
            );

        }

        return;

    }


    files.forEach(
        (file) => {

            const row =
                document.createElement(
                    "tr"
                );


            const date =
                formatDate(
                    file.createdAt
                );


            const size =
                formatFileSize(
                    file.fileSize
                );


            const protection =
                file.protected
                    ? "🔐 Protected"
                    : "🔓 Public";


            row.innerHTML = `

                <td>

                    <strong>
                        ${escapeHTML(
                            file.fileName
                        )}
                    </strong>

                </td>

                <td>
                    ${size}
                </td>

                <td>
                    ${date}
                </td>

                <td>
                    ${protection}
                </td>

                <td>
                    ${file.downloadCount || 0}
                </td>

                <td>

                    <button
                        class="file-action-btn"
                        data-action="download"
                        data-id="${file.id}"
                        title="Download"
                    >
                        ⬇️
                    </button>

                    <button
                        class="file-action-btn"
                        data-action="share"
                        data-id="${file.id}"
                        title="Share"
                    >
                        🔗
                    </button>

                    <button
                        class="file-action-btn delete-action"
                        data-action="delete"
                        data-id="${file.id}"
                        title="Delete"
                    >
                        🗑️
                    </button>

                </td>

            `;


            fileList.appendChild(
                row
            );

        }
    );

}


// =========================================================
// FILE ACTIONS
// =========================================================

if (fileList) {

    fileList.addEventListener(
        "click",
        async (event) => {

            const button =
                event.target.closest(
                    "button[data-action]"
                );


            if (!button) return;


            const action =
                button.dataset.action;


            const fileId =
                button.dataset.id;


            const file =
                allFiles.find(
                    (item) =>
                        item.id === fileId
                );


            if (!file) return;


            if (
                action === "download"
            ) {

                downloadFile(file);

            }


            if (
                action === "share"
            ) {

                createShareLink(file);

            }


            if (
                action === "delete"
            ) {

                await deleteFile(file);

            }

        }
    );

}


// =========================================================
// DOWNLOAD FILE
// =========================================================

async function downloadFile(file) {

    try {

        const link =
            document.createElement(
                "a"
            );


        link.href =
            file.downloadURL;


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


        alert(
            "Unable to download the file."
        );

    }

}


// =========================================================
// CREATE SHARE LINK
// =========================================================

async function createShareLink(file) {

    try {

        const token =
            generateToken(24);


        await addDoc(
            collection(
                db,
                "shareLinks"
            ),
            {

                fileId:
                    file.id,

                ownerId:
                    currentUser.uid,

                token:
                    token,

                createdAt:
                    serverTimestamp(),

                active:
                    true

            }
        );


        await updateDoc(
            doc(
                db,
                "files",
                file.id
            ),
            {

                shared:
                    true

            }
        );


        const shareURL =
            `${window.location.origin}${window.location.pathname.replace(
                "dashboard.html",
                "share.html"
            )}?id=${token}`;


        await navigator.clipboard.writeText(
            shareURL
        );


        alert(
            `Share link copied!\n\n${shareURL}`
        );


        await loadFiles();


    } catch (error) {

        console.error(
            "Share error:",
            error
        );


        alert(
            "Unable to create share link."
        );

    }

}


// =========================================================
// DELETE FILE
// =========================================================

async function deleteFile(file) {

    if (
        file.ownerId !==
        currentUser.uid
    ) {

        alert(
            "You can only delete files that you uploaded."
        );

        return;

    }


    const confirmDelete =
        confirm(
            `Delete "${file.fileName}"?\n\nThis will remove the file from your SFS dashboard.`
        );


    if (!confirmDelete) return;


    try {

        // =================================================
        // DELETE FIRESTORE RECORD
        // =================================================

        await deleteDoc(
            doc(
                db,
                "files",
                file.id
            )
        );


        // =================================================
        // ADD ACTIVITY
        // =================================================

        await addDoc(
            collection(
                db,
                "activity"
            ),
            {

                userId:
                    currentUser.uid,

                action:
                    "deleted",

                fileName:
                    file.fileName,

                fileId:
                    file.id,

                createdAt:
                    serverTimestamp()

            }
        );


        await loadFiles();


    } catch (error) {

        console.error(
            "Delete error:",
            error
        );


        alert(
            "Unable to delete the file."
        );

    }

}


// =========================================================
// SEARCH FILES
// =========================================================

if (fileSearch) {

    fileSearch.addEventListener(
        "input",
        () => {

            const search =
                fileSearch.value
                    .trim()
                    .toLowerCase();


            const filtered =
                allFiles.filter(
                    (file) =>
                        file.fileName
                            .toLowerCase()
                            .includes(search)
                );


            displayFiles(
                filtered
            );

        }
    );

}


// =========================================================
// FILTER BUTTONS
// =========================================================

const filterButtons =
    document.querySelectorAll(
        ".filter-btn"
    );


filterButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            () => {

                filterButtons.forEach(
                    (btn) =>
                        btn.classList.remove(
                            "active"
                        )
                );


                button.classList.add(
                    "active"
                );


                const filter =
                    button.dataset.filter;


                let filteredFiles =
                    allFiles;


                if (
                    filter === "shared"
                ) {

                    filteredFiles =
                        allFiles.filter(
                            (file) =>
                                file.shared === true
                        );

                }


                if (
                    filter === "protected"
                ) {

                    filteredFiles =
                        allFiles.filter(
                            (file) =>
                                file.protected === true
                        );

                }


                displayFiles(
                    filteredFiles
                );

            }
        );

    }
);


// =========================================================
// UPDATE STATISTICS
// =========================================================

function updateStatistics() {

    if (totalFiles) {

        totalFiles.textContent =
            allFiles.length;

    }


    if (sharedFiles) {

        sharedFiles.textContent =
            allFiles.filter(
                (file) =>
                    file.shared === true
            ).length;

    }


    if (protectedFiles) {

        protectedFiles.textContent =
            allFiles.filter(
                (file) =>
                    file.protected === true
            ).length;

    }


    if (storageUsed) {

        const totalBytes =
            allFiles.reduce(
                (total, file) =>
                    total +
                    (file.fileSize || 0),
                0
            );


        storageUsed.textContent =
            formatFileSize(
                totalBytes
            );

    }

}


// =========================================================
// LOAD RECENT ACTIVITY
// =========================================================

async function loadActivity() {

    if (!activityList) return;


    try {

        const activityQuery =
            query(
                collection(
                    db,
                    "activity"
                ),
                where(
                    "userId",
                    "==",
                    currentUser.uid
                )
            );


        const snapshot =
            await getDocs(
                activityQuery
            );


        const activities = [];


        snapshot.forEach(
            (document) => {

                activities.push(
                    document.data()
                );

            }
        );


        activities.sort(
            (a, b) => {

                const dateA =
                    a.createdAt?.toMillis?.() ||
                    0;

                const dateB =
                    b.createdAt?.toMillis?.() ||
                    0;

                return dateB - dateA;

            }
        );


        const recent =
            activities.slice(
                0,
                5
            );


        if (
            recent.length === 0
        ) {

            activityList.innerHTML = `

                <div class="activity-empty">

                    <span>🕒</span>

                    <p>
                        No recent activity.
                    </p>

                </div>

            `;

            return;

        }


        activityList.innerHTML =
            recent.map(
                (activity) => `

                    <div
                        class="activity-item"
                        style="
                            display:flex;
                            align-items:center;
                            gap:12px;
                            padding:12px 0;
                            border-bottom:1px solid #edf0f5;
                        "
                    >

                        <span>
                            ${getActivityIcon(
                                activity.action
                            )}
                        </span>

                        <div>

                            <strong>
                                ${activity.action}
                            </strong>

                            <p
                                style="
                                    color:#7b8497;
                                    font-size:12px;
                                "
                            >
                                ${escapeHTML(
                                    activity.fileName
                                )}
                            </p>

                        </div>

                    </div>

                `
            )
            .join("");


    } catch (error) {

        console.error(
            "Activity error:",
            error
        );

    }

}


// =========================================================
// RESET UPLOAD FORM
// =========================================================

function resetUploadForm() {

    if (uploadForm) {

        uploadForm.reset();

    }


    if (filePasswordGroup) {

        filePasswordGroup.classList.add(
            "hidden"
        );

    }


    if (filePassword) {

        filePassword.required =
            false;

    }


    if (uploadMessage) {

        uploadMessage.textContent =
            "";

    }

}


// =========================================================
// UPLOAD MESSAGE
// =========================================================

function showUploadMessage(
    message,
    success
) {

    if (!uploadMessage) return;


    uploadMessage.textContent =
        message;


    uploadMessage.style.color =
        success
            ? "#16a34a"
            : "#dc2626";

}


// =========================================================
// FORMAT FILE SIZE
// =========================================================

function formatFileSize(bytes) {

    if (!bytes) return "0 KB";


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
// FORMAT DATE
// =========================================================

function formatDate(timestamp) {

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


// =========================================================
// GENERATE SHARE TOKEN
// =========================================================

function generateToken(length) {

    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";


    let result = "";


    for (
        let i = 0;
        i < length;
        i++
    ) {

        result +=
            characters.charAt(
                Math.floor(
                    Math.random() *
                    characters.length
                )
            );

    }


    return result;

}


// =========================================================
// HASH PASSWORD
// =========================================================

async function hashPassword(password) {

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
// ESCAPE HTML
// =========================================================

function escapeHTML(value) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        value ?? "";


    return div.innerHTML;

}


// =========================================================
// ACTIVITY ICON
// =========================================================

function getActivityIcon(
    action
) {

    switch (action) {

        case "uploaded":
            return "📤";

        case "deleted":
            return "🗑️";

        case "downloaded":
            return "⬇️";

        case "shared":
            return "🔗";

        default:
            return "📌";

    }

}