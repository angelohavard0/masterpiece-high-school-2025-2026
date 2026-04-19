// ========== FONCTIONS UTILITAIRES ==========
async function isConnected() {
    // généré par l'ia
    try {
        const res = await fetch("/isConnected");
        const data = await res.json();
        return data.value;
    } catch (err) {
        console.error("Erreur :", err);
        return false;
    }
}

function getScannerRfid() {
    // généré par l'ia
    return new Promise((resolve, reject) => {
        const source = new EventSource("/getScannerRfid");
        source.onmessage = (event) => {
            const data = JSON.parse(event.data);
            source.close();
            resolve(data);
        };
        source.onerror = (err) => {
            console.error("Erreur SSE :", err);
            source.close();
            reject(err);
        };
    });
}

async function fetchJson(url, options = {}) {
    // généré par l'ia
    const res = await fetch(url, options);
    return res.json();
}

function escapeHtml(text) {
    // généré par l'ia
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function updateLiveTime() {
    // généré par l'ia
    const el = document.getElementById("liveTime");
    if (el)
        el.textContent = new Date().toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
}

// ========== GESTION DES VUES ==========
let currentView = "logs";
let currentUserId = null;
let scanSource = null;
let logsSource = null;
let userLogsSource = null;

// Données partagées
let logs = [];
let failedLogs = [];
let userStats = { total_users: 0, total_admins: 0 };
let totalBadges = 0;
let currentUser = null;
let userBadges = [];

function showView(view, userId = null) {
    // généré par l'ia
    // Masquer toutes les vues
    document
        .querySelectorAll(".page-view")
        .forEach((v) => v.classList.add("hidden"));

    // Afficher la vue demandée
    document.getElementById(`view-${view}`).classList.remove("hidden");

    // Mettre à jour le bouton actif dans la sidebar
    document
        .querySelectorAll(".sidebar button")
        .forEach((b) => b.classList.remove("active"));
    document
        .getElementById(`btn${view.charAt(0).toUpperCase() + view.slice(1)}`)
        ?.classList.add("active");

    // Mettre à jour l'URL sans recharger
    const url = userId ? `/?page=${view}&id=${userId}` : `/?page=${view}`;
    window.history.pushState({ page: view, userId }, "", url);

    currentView = view;
    if (userId) currentUserId = userId;

    // Charger les données spécifiques à la vue
    loadViewData(view, userId);
}

async function loadViewData(view, userId) {
    // généré par l'ia
    switch (view) {
        case "logs":
            await Promise.all([
                getUserStats(),
                getBadgeStats(),
                getAccesslogs(),
                getFailedAccesslogs(),
            ]);
            displayLogs();
            connectSSE();
            break;

        case "admin":
            if (!(await isConnected())) {
                showView("logs");
                return;
            }
            await Promise.all([getAdminStats(), searchUsers("")]);
            setupAdminListeners();
            break;

        case "user":
            if (!(await isConnected()) || !userId) {
                showView("admin");
                return;
            }
            await loadUserData(userId);
            connectUserLogsSSE();
            break;
    }
}

// ========== FONCTIONS VUE LOGS ==========
async function getUserStats() {
    // généré par l'ia
    try {
        const data = await fetchJson(
            `/getUserStats?data=${encodeURIComponent(JSON.stringify({}))}`,
        );
        if (data && data[0]) {
            userStats = data[0];
            updateLogsStats();
        }
    } catch (err) {
        console.error(err);
    }
}

async function getBadgeStats() {
    // généré par l'ia
    try {
        const data = await fetchJson(
            `/getBadgeStats?data=${encodeURIComponent(JSON.stringify({}))}`,
        );
        if (data && data[0]) {
            totalBadges = data[0].total_badges || 0;
        }
    } catch (err) {
        console.error(err);
    }
}

async function getAccesslogs() {
    // généré par l'ia
    try {
        const data = await fetchJson(
            `/getAccesslogs?data=${encodeURIComponent(
                JSON.stringify({ days: 30 }),
            )}`,
        );
        logs = data;
        updateLogsStats();
        displayLogs();
    } catch (err) {
        console.error(err);
    }
}

async function getFailedAccesslogs() {
    // généré par l'ia
    try {
        const data = await fetchJson(
            `/getFailedAccesslogs?data=${encodeURIComponent(
                JSON.stringify({ days: 30 }),
            )}`,
        );
        failedLogs = data;
        updateLogsStats();
        displayLogs();
    } catch (err) {
        console.error(err);
        return [];
    }
}

function updateLogsStats() {
    // généré par l'ia
    const totalUsersEl = document.getElementById("totalUsers");
    const totalLogsEl = document.getElementById("totalLogs");
    const failedLogsEl = document.getElementById("failedLogs");

    if (totalUsersEl) {
        totalUsersEl.textContent = userStats.total_users || 0;
    }
    if (totalLogsEl) {
        totalLogsEl.textContent = logs.length;
    }
    if (failedLogsEl) {
        failedLogsEl.textContent = failedLogs.length;
    }
}

function displayLogs() {
    // généré par l'ia
    const logsTable = document.getElementById("logsTable");
    const noLogsMessage = document.getElementById("noLogsMessage");

    if (!logsTable) return;

    const allLogs = [];

    logs.forEach((l) => {
        allLogs.push({
            firstname: l.firstname || "-",
            lastname: l.lastname || "-",
            rfid: l.rfid,
            date: l.date,
            status: "success",
            log: l.log,
        });
    });

    failedLogs.forEach((l) => {
        allLogs.push({
            firstname: "-",
            lastname: "-",
            rfid: l.rfid,
            date: l.date,
            status: "error",
            log: "Badge inconnu",
        });
    });

    allLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (allLogs.length === 0) {
        logsTable.innerHTML = "";
        if (noLogsMessage) noLogsMessage.classList.remove("hidden");
        return;
    }

    if (noLogsMessage) noLogsMessage.classList.add("hidden");
    logsTable.innerHTML = allLogs
        .map(
            (
                l,
            ) => `<tr class="${l.status === "success" ? "success-row" : "error-row"}">
        <td>${escapeHtml(l.lastname)}</td>
        <td>${escapeHtml(l.firstname)}</td>
        <td><code>${escapeHtml(l.rfid)}</code></td>
        <td>${escapeHtml(new Date(l.date).toLocaleDateString("fr-FR"))}</td>
        <td>${escapeHtml(new Date(l.date).toLocaleTimeString("fr-FR"))}</td>
        <td><span style="color:${l.status === "success" ? "var(--success)" : "var(--error)"};font-weight:500">
            <i class="fa-solid fa-${l.status === "success" ? "check-circle" : "exclamation-circle"}"></i> 
            ${l.status === "success" ? "Autorisé" : "Refusé"}
        </span></td>
     </tr>`,
        )
        .join("");
}

// ========== FONCTIONS VUE ADMIN ==========
async function getAdminStats() {
    // généré par l'ia
    try {
        const [userData, badgeData] = await Promise.all([
            fetchJson(
                `/getUserStats?data=${encodeURIComponent(JSON.stringify({}))}`,
            ),
            fetchJson(
                `/getBadgeStats?data=${encodeURIComponent(JSON.stringify({}))}`,
            ),
        ]);

        if (userData && userData[0]) {
            userStats = userData[0];
            document.getElementById("adminTotalUsers").textContent =
                userStats.total_users || 0;
            document.getElementById("adminTotalAdmins").textContent =
                userStats.total_admins || 0;
        }

        if (badgeData && badgeData[0]) {
            document.getElementById("adminTotalBadges").textContent =
                badgeData[0].total_badges || 0;
        }
    } catch (err) {
        console.error(err);
    }
}

async function searchUsers(query) {
    // généré par l'ia
    const tbody = document.getElementById("usersTable");
    const noMsg = document.getElementById("noUsersMessage");

    try {
        const data = await fetchJson(
            `/searchUsersByQuery?data=${encodeURIComponent(
                JSON.stringify({
                    query: query,
                    number: 500,
                }),
            )}`,
        );

        if (!data.length) {
            tbody.innerHTML = "";
            if (noMsg) noMsg.classList.remove("hidden");
            return;
        }

        if (noMsg) noMsg.classList.add("hidden");
        tbody.innerHTML = data
            .map(
                (u) => `<tr>
            <td>${escapeHtml(u.firstname)}</td>
            <td>${escapeHtml(u.lastname)}</td>
            <td>${
                u.isadmin === 1
                    ? '<span class="status-badge admin"><i class="fa-solid fa-user-tie"></i> Administrateur</span>'
                    : '<span class="status-badge user"><i class="fa-solid fa-user"></i> Membre</span>'
            }
            </td>
            <td>
                <button class="view-btn" onclick="showView('user', ${u.id})">
                    <i class="fa-solid fa-eye"></i> Voir plus
                </button>
            </td>
        </tr>`,
            )
            .join("");
    } catch (err) {
        console.error(err);
    }
}

function setupAdminListeners() {
    // généré par l'ia
    const form = document.getElementById("userForm");
    if (form) {
        form.removeEventListener("submit", handleAddUser);
        form.addEventListener("submit", handleAddUser);
    }

    const searchInput = document.getElementById("searchUser");
    if (searchInput) {
        searchInput.removeEventListener("input", handleSearch);
        searchInput.addEventListener("input", handleSearch);
    }
}

async function handleAddUser(e) {
    // généré par l'ia
    e.preventDefault();

    const firstname = document.getElementById("firstname").value.trim();
    const lastname = document.getElementById("lastname").value.trim();
    const isAdmin = document.getElementById("isAdmin").checked;

    if (!firstname || !lastname) {
        Swal.fire({
            title: "Erreur",
            text: "Le prénom et le nom sont requis",
            icon: "error",
            timer: 2000,
            showConfirmButton: false,
        });
        return;
    }

    try {
        const response = await fetch("/addUser", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                firstname: firstname,
                lastname: lastname,
                isadmin: isAdmin ? 1 : 0,
            }),
        });

        if (response.ok) {
            document.getElementById("userForm").reset();
            document.getElementById("isAdmin").checked = false;

            await Promise.all([
                getAdminStats(),
                searchUsers(document.getElementById("searchUser").value),
            ]);

            Swal.fire({
                title: "Succès",
                text: "Utilisateur ajouté avec succès",
                icon: "success",
                timer: 1500,
                showConfirmButton: false,
            });
        } else {
            throw new Error("Erreur lors de l'ajout");
        }
    } catch (err) {
        console.error("Erreur fetch :", err);
        Swal.fire({
            title: "Erreur",
            text: "Impossible d'ajouter l'utilisateur",
            icon: "error",
            timer: 2000,
            showConfirmButton: false,
        });
    }
}

function handleSearch(e) {
    // généré par l'ia
    searchUsers(e.target.value);
}

// ========== FONCTIONS VUE UTILISATEUR ==========
async function loadUserData(userId) {
    // généré par l'ia
    try {
        const [userData, badgesData, logsData] = await Promise.all([
            fetchJson(
                `/getUserById?data=${encodeURIComponent(JSON.stringify({ id: userId }))}`,
            ),
            fetchJson(
                `/getBadgesByUser_id?data=${encodeURIComponent(JSON.stringify({ user_id: userId }))}`,
            ),
            fetchJson(
                `/getAccesslogsByUser_id?data=${encodeURIComponent(JSON.stringify({ id: userId, days: 30 }))}`,
            ),
        ]);

        currentUser = userData[0];
        userBadges = badgesData;

        const adminBadge =
            currentUser.isadmin === 1
                ? ' <span class="status-badge admin" style="margin-left:10px"><i class="fa-solid fa-user-tie"></i> Administrateur</span>'
                : "";
        document.getElementById("userFullName").innerHTML =
            `${escapeHtml(currentUser.firstname)} ${escapeHtml(currentUser.lastname)}${adminBadge}`;

        displayBadges();
        displayUserLogs(logsData);

        setupUserListeners();
    } catch (err) {
        console.error(err);
    }
}

function displayBadges() {
    // généré par l'ia
    const badgesDiv = document.getElementById("badgeList");

    if (!userBadges.length) {
        badgesDiv.innerHTML =
            '<div class="info-message"><i class="fa-solid fa-id-card"></i> Aucun badge associé</div>';
        return;
    }

    badgesDiv.innerHTML = userBadges
        .map(
            (b) => `<div class="badge-item">
            <div class="badge-header"><i class="fa-solid fa-id-card"></i><span>Badge</span></div>
            <div class="badge-uid">${escapeHtml(b.rfid)}</div>
            <div class="badge-actions">
                <button class="badge-btn delete" onclick="deleteBadge(${b.id}, '${b.rfid}')">
                    <i class="fa-solid fa-trash"></i> Supprimer
                </button>
            </div>
        </div>`,
        )
        .join("");
}

function displayUserLogs(logsData) {
    // généré par l'ia
    const tbody = document.getElementById("userLogsTable");

    if (!logsData.length) {
        tbody.innerHTML =
            '<tr><td colspan="4" class="empty-message">Aucun passage</td></tr>';
        return;
    }

    tbody.innerHTML = logsData
        .map(
            (l) => `<tr class="success-row">
        <td><code>${escapeHtml(l.rfid)}</code></td>
        <td>${escapeHtml(new Date(l.date).toLocaleDateString("fr-FR"))}</td>
        <td>${escapeHtml(new Date(l.date).toLocaleTimeString("fr-FR"))}</td>
        <td><span style="color:var(--success)">
            <i class="fa-solid fa-check-circle"></i> Autorisé
        </span></td>
     </tr>`,
        )
        .join("");
}

function setupUserListeners() {
    // généré par l'ia
    const deleteBtn = document.getElementById("deleteUser");
    if (deleteBtn) {
        deleteBtn.removeEventListener("click", handleDeleteUser);
        deleteBtn.addEventListener("click", handleDeleteUser);
    }
}

async function handleDeleteUser() {
    // généré par l'ia
    if (!currentUser) return;

    const result = await Swal.fire({
        title: `Supprimer l'utilisateur ${currentUser.firstname} ${currentUser.lastname} ?`,
        text: "Cette action est irréversible",
        showCancelButton: true,
        confirmButtonText: "Supprimer",
        cancelButtonText: "Annuler",
        confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    try {
        const res = await fetch(
            `/deleteUsersById?data=${encodeURIComponent(JSON.stringify({ id: currentUser.id }))}`,
            { method: "DELETE" },
        );

        if (res.ok) showView("admin");
    } catch (err) {
        console.error(err);
    }
}

async function deleteBadge(badgeId, rfid) {
    // généré par l'ia
    const result = await Swal.fire({
        title: `Supprimer le badge ${rfid} ?`,
        showCancelButton: true,
        confirmButtonText: "Supprimer",
        cancelButtonText: "Annuler",
        confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    try {
        const res = await fetch(
            `/deleteBadgesById?data=${encodeURIComponent(JSON.stringify({ id: badgeId }))}`,
            { method: "DELETE" },
        );

        if (res.ok) {
            userBadges = userBadges.filter((b) => b.id !== badgeId);
            displayBadges();
            Swal.fire({
                title: "Badge supprimé",
                icon: "success",
                timer: 1500,
                showConfirmButton: false,
            });
        }
    } catch (err) {
        console.error(err);
    }
}

// ========== FONCTIONS SCAN ==========
function startScan() {
    // généré par l'ia
    if (scanSource) {
        scanSource.close();
    }

    document.getElementById("scanButton").classList.add("hidden");
    document.getElementById("cancelScanButton").classList.remove("hidden");
    document.getElementById("scanResult").classList.remove("hidden");
    document.getElementById("scannedBadgeUid").value = "";

    scanSource = new EventSource("/getScannerRfid");

    scanSource.onmessage = (event) => {
        try {
            const rfid = JSON.parse(event.data);
            document.getElementById("scannedBadgeUid").value = rfid;
            scanSource.close();
            scanSource = null;
        } catch (err) {
            console.error("Erreur parsing RFID:", err);
        }
    };

    scanSource.onerror = (err) => {
        console.error("Erreur SSE scan:", err);
        scanSource.close();
        scanSource = null;
        cancelScan();

        Swal.fire({
            title: "Erreur de scan",
            text: "Problème de connexion avec le scanner",
            icon: "error",
            timer: 2000,
            showConfirmButton: false,
        });
    };
}

function cancelScan() {
    // généré par l'ia
    if (scanSource) {
        scanSource.close();
        scanSource = null;
    }

    document.getElementById("scanButton").classList.remove("hidden");
    document.getElementById("cancelScanButton").classList.add("hidden");
    document.getElementById("scanResult").classList.add("hidden");
    document.getElementById("scannedBadgeUid").value = "";
}

async function addScannedBadge() {
    // généré par l'ia
    const uid = document.getElementById("scannedBadgeUid").value.trim();
    if (!uid || !currentUser) {
        Swal.fire({
            title: "Erreur",
            text: "Aucun badge scanné",
            icon: "error",
            timer: 1500,
            showConfirmButton: false,
        });
        return;
    }

    if (userBadges.some((b) => b.rfid === uid)) {
        Swal.fire({
            title: "Badge déjà existant",
            text: "Ce badge est déjà associé à cet utilisateur",
            icon: "warning",
            timer: 2000,
            showConfirmButton: false,
        });
        return;
    }

    const confirm = await Swal.fire({
        title: `Ajouter le badge ${uid} ?`,
        text: `À ${currentUser.firstname} ${currentUser.lastname}`,
        showCancelButton: true,
        confirmButtonText: "Ajouter",
        cancelButtonText: "Annuler",
    });

    if (!confirm.isConfirmed) return;

    try {
        const res = await fetch("/addBadgesByUser_idAndRfid", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: currentUser.id,
                rfid: uid,
            }),
        });

        if (res.ok) {
            cancelScan();
            userBadges.push({ id: Date.now(), rfid: uid });
            displayBadges();
            Swal.fire({
                title: "Badge ajouté",
                icon: "success",
                timer: 1500,
                showConfirmButton: false,
            });
        } else {
            const error = await res.text();
            throw new Error(error || "Erreur lors de l'ajout");
        }
    } catch (err) {
        console.error("Erreur ajout badge:", err);
        Swal.fire({
            title: "Erreur",
            text: err.message || "Impossible d'ajouter le badge",
            icon: "error",
            timer: 2000,
            showConfirmButton: false,
        });
    }
}

// ========== FONCTIONS SSE CORRIGÉES ==========
function connectSSE() {
    // généré par l'ia
    if (logsSource) {
        logsSource.close();
    }

    logsSource = new EventSource("/notifAccesLog");

    logsSource.onmessage = (event) => {
        // Rafraîchir les logs quand un nouvel accès est détecté
        if (currentView === "logs") {
            Promise.all([getAccesslogs(), getFailedAccesslogs()]).then(() => {
                displayLogs();
            });
        }
    };

    logsSource.onerror = (err) => {
        console.error("Erreur SSE logs :", err);
        if (logsSource) {
            logsSource.close();
            logsSource = null;
        }
        // Reconnexion automatique après 5 secondes
        setTimeout(() => {
            if (currentView === "logs") {
                connectSSE();
            }
        }, 5000);
    };
}

function connectUserLogsSSE() {
    // généré par l'ia
    if (userLogsSource) {
        userLogsSource.close();
    }

    userLogsSource = new EventSource("/notifAccesLog");

    userLogsSource.onmessage = async (event) => {
        // Rafraîchir les logs de l'utilisateur quand un nouvel accès est détecté
        if (currentView === "user" && currentUserId) {
            try {
                const logsData = await fetchJson(
                    `/getAccesslogsByUser_id?data=${encodeURIComponent(
                        JSON.stringify({ id: currentUserId, days: 30 }),
                    )}`,
                );
                displayUserLogs(logsData);
                
                // Mettre à jour le compteur de logs dans les stats si nécessaire
                const userLogsCount = document.getElementById("userLogsCount");
                if (userLogsCount) {
                    userLogsCount.textContent = logsData.length;
                }
            } catch (err) {
                console.error("Erreur lors du rafraîchissement des logs utilisateur:", err);
            }
        }
    };

    userLogsSource.onerror = (err) => {
        console.error("Erreur SSE logs utilisateur:", err);
        if (userLogsSource) {
            userLogsSource.close();
            userLogsSource = null;
        }
        // Reconnexion automatique après 5 secondes
        setTimeout(() => {
            if (currentView === "user" && currentUserId) {
                connectUserLogsSSE();
            }
        }, 5000);
    };
}

// ========== INITIALISATION ==========
window.addEventListener("popstate", (event) => {
    // généré par l'ia
    const params = new URLSearchParams(window.location.search);
    const page = params.get("page") || "logs";
    const userId = params.get("id");
    showView(page, userId);
});

window.addEventListener("beforeunload", function () {
    // généré par l'ia
    if (scanSource) {
        scanSource.close();
    }
    if (logsSource) {
        logsSource.close();
    }
    if (userLogsSource) {
        userLogsSource.close();
    }
});

// Démarrage
setInterval(updateLiveTime, 1000);
updateLiveTime();

// Exposer les fonctions nécessaires globalement
window.showView = showView;
window.startScan = startScan;
window.cancelScan = cancelScan;
window.addScannedBadge = addScannedBadge;
window.deleteBadge = deleteBadge;

// Lire l'URL initiale
const params = new URLSearchParams(window.location.search);
const initialPage = params.get("page") || "logs";
const initialUserId = params.get("id");
showView(initialPage, initialUserId);