// === fonction pour afiché une vue demandé ===

function showView(view, id) {
    // on recupere les vue disponible
    const views = document.querySelectorAll(".views > div");
    // on recupere les button disponible
    const viewsButtons = document.querySelectorAll(".topbar button");
    // on créer un temoin pour savoir si la vue demandé a aité trouvé
    let viewExists = false;
    // on recupere les pamamaitre de page pour les maitre a joure plus tard
    const params = new URLSearchParams(window.location.search);
    // pour chaque vue ...
    views.forEach((e) => {
        // on verifie si c'est la vue que qui a étais demandé
        if (e.classList.contains(`${view}`)) {
            // si c'est le cas alore on l'afiche
            e.classList.remove("none");
            // on temoigne
            viewExists = true;
            // on met a joure les paramaitre de page
            params.set("page", view);
            params.set("id", id);
            const newUrl = window.location.pathname + "?" + params.toString(); // ligne généré par l'ia
            window.history.replaceState({}, "", newUrl); // ligne généré par l'ia
        } else {
            // si se n'ai pas le cas on la cache
            e.classList.add("none");
        }
    });
    // pour chaque button...
    viewsButtons.forEach((e) => {
        // on verrifie si c'est le button de la vue demandé
        if (e.classList.contains(`${view}button`)) {
            // si c'est le cas on le selectionne
            e.classList.add("selected");
        } else {
            // si se n'ai pas le cas alore on le dé-selectionne
            e.classList.remove("selected");
        }
    });
    // on verrifie si la vue demandé n'a pas aité trouvé
    if (!viewExists) {
        // si la vu demandé na pas aité trouvé un demande la vue aceuil
        showView("home");
    }
}

// === fonction pour initialisé les button des vue ===

async function initViewButton() {
    const params = new URLSearchParams(window.location.search);
    //on recupere le button de la vue home
    document
        .querySelector(".topbar .homebutton")
        // si on clique sur le button...
        .addEventListener("click", () => {
            // on demande la vu home
            showView("home");
        });
    //on recopere le button de la vu logs
    document
        .querySelector(".topbar .logsbutton")
        //si on clique sur le button...
        .addEventListener("click", () => {
            //demandé la vu logs
            showView("logs");
        });
    //on recopere le button de la vu admin
    document
        .querySelector(".topbar .adminbutton")
        //si on clique sur le button...
        .addEventListener("click", () => {
            //demandé la vu logs
            showView("admin");
        });
}

// === function pour automatisé le parsage des donné json avec fetch
async function fetchJson(url, options = {}) {
    // fonction généré par l'ia
    // demandé les donné au serveur a l'url demandé et avec les option demandé
    const res = await fetch(url, options);
    //  returné les donné pré parsé
    return res.json();
}

// === function pour recuperer le prochain scanne rfid ===
function getScannerRfid() {
    // fonction généré par l'ia
    // creation d'une promise pour recuperer les donné
    return new Promise((resolve, reject) => {
        // creation d'un SSE pour que le serveur puice m'envoille l'rfid quand il veut
        const source = new EventSource("/getScannerRfid");
        // definire se que il faut faire quand le serveur envois l'rfid
        source.onmessage = (event) => {
            // parse les donné json envoillé par le serveur
            const data = JSON.parse(event.data);
            //fermé la connection
            source.close();
            // resoudre la promise avec les donné envoillé par le serveur
            resolve(data);
        };
        // definire se qui se passe en cas d'erreur
        source.onerror = (err) => {
            // afiché l'erreur dans la console
            console.error("Erreur SSE :", err);
            // fermé la connection
            source.close();
            // rejeté la promise avec l'erreur
            reject(err);
        };
    });
}

// === function pour recuperer les statistique d'utilisateur ===
async function getUserStats() {
    // fonction généré par l'ia
    // echapé les potentiel erreur
    try {
        // demandé les stats au serveur
        const data = await fetchJson(
            `/getUserStats?data=${encodeURIComponent(JSON.stringify({}))}`,
        );
        // verifier si le serveur a bien returné les stats
        if (data && data[0]) {
            //enregistré les stats
            pageData.total_users = data[0].total_users || 0;
            pageData.total_admins = data[0].total_admins || 0;
        }
        // si il i a eu une erreur...
    } catch (err) {
        // afiché l'erreur dans la console
        console.error(err);
    }
}

// === function pour recuperer les statistique de badge ===
async function getBadgeStats() {
    // fonction généré par l'ia
    // échapé les potenciel erreur
    try {
        // demandé les donné au serveur
        const data = await fetchJson(
            `/getBadgeStats?data=${encodeURIComponent(JSON.stringify({}))}`,
        );
        // verrifier si le serveur a bien returné quelque chose dans une list
        if (data && data[0]) {
            //si c'est le cas alore, si c'est un object avec une veriable contenent les nombre total de badge alore enregistre le nombre total de badge sinon returné 0
            pageData.total_badges = data[0].total_badges || 0;
        }
        // si il i a eu une erreur
    } catch (err) {
        // afiché l'erreur dans la console
        console.error(err);
    }
}

// === function pour recuperer les logs d'acces autorisé ===

async function getAccesslogs() {
    try {
        // demandé les logs pour les 30 dergnier joure au serveur
        const data = await fetchJson(
            `/getAccesslogs?data=${encodeURIComponent(
                JSON.stringify({ days: 30 }),
            )}`,
        );
        // enregistré les donné ressu
        pageData.logs = data;
        // si il i a eu une erreur...
    } catch (err) {
        // afiché l'erreur dans la console
        console.error(err);
    }
}

// === function pour recuperer les logs d'acces refusé ===

async function getFailedAccesslogs() {
    // echapé les potenciel erreur
    try {
        // demandé les logs pour les 30 dergnier joure
        const data = await fetchJson(
            `/getFailedAccesslogs?data=${encodeURIComponent(
                JSON.stringify({ days: 30 }),
            )}`,
        );
        // enregistre les donné ressu
        pageData.failed_logs = data;
    } catch (err) {
        console.error(err);
    }
}

// === fonction pour recherché un utilisateur par son nom ou son prénom ===

async function searchUsers(query) {
    const tbody = document.querySelector(
        ".views .beautiful .searchresulttable tbody",
    );

    try {
        const data = await fetchJson(
            `/searchUsersByQuery?data=${encodeURIComponent(
                JSON.stringify({
                    query: query,
                    number: 500,
                }),
            )}`,
        );
        tbody.innerHTML = "";

        data.forEach((e) => {
            const tr = document.createElement("tr");
            tbody.appendChild(tr);
            const td = {
                firstname: document.createElement("td"),
                lastname: document.createElement("td"),
                status: document.createElement("td"),
                button: document.createElement("td"),
            };

            tr.appendChild(td.lastname);
            tr.appendChild(td.firstname);
            tr.appendChild(td.status);
            tr.appendChild(td.button);

            td.lastname.textContent = e.lastname;
            td.firstname.textContent = e.firstname;

            if (e.isadmin === 0) {
                td.status.textContent = "Utilisateur";
                tr.classList.add("user");
            } else {
                td.status.textContent = "Administrateur";
                tr.classList.add("admin");
            }

            const button = document.createElement("button");
            td.button.appendChild(button);
            button.textContent = "Voire plus";
            button.addEventListener("click", () => {
                showView("user");
            });
        });
    } catch (err) {
        console.error(err);
    }
}

// === fonction pour initialisé la bare de recharche des utilisateur ===

async function initSearchUserBar() {
    document
        .querySelector(".views .beautiful .searchusersform input")
        .addEventListener("input", (e) => {
            searchUsers(e.target.value);
        });
}

// === fonction pour ajouté un utilisateur ===

async function addUser(firstname, lastname, isadmin) {
    // fonction généré par l'ia
    // essaie d’exécuter le code et capture les erreurs
    try {
        // envoie les données au serveur via fetch en POST
        const res = await fetch("/addUser", {
            // méthode POST pour envoyer des données
            method: "POST",
            // on précise que le corps est du JSON
            headers: { "Content-Type": "application/json" },
            // corps de la requête converti en JSON
            body: JSON.stringify({
                firstname: firstname,
                lastname: lastname,
                isadmin: isadmin, // checkbox convertie en 1/0 si fait avant
            }),
        });

        // si la requête a réussi
        if (res.ok) {
            // affiche une notification rapide en haut à droite
            Swal.fire({
                toast: true,
                position: "top-end", // position de la notif
                icon: "success", // icône succès
                title: "Utilisateur ajouté", // texte de la notif
                showConfirmButton: false, // pas de bouton
                timer: 1500, // disparaît après 1.5s
            });
            // re-recherché les utilisateur avec le text de la bare de recherche d'utilisateur
            searchUsers(
                // petit bout de code ajouté par moi
                document.querySelector(
                    ".views .beautiful .searchusersform input",
                ).value,
            );
        } else {
            // si la requête a échoué côté serveur
            Swal.fire({
                toast: true,
                position: "top-end", // position de la notif
                icon: "error", // icône erreur
                title: "Erreur lors de l'ajout", // texte de la notif
                showConfirmButton: false, // pas de bouton
                timer: 1500, // disparaît après 1.5s
            });
        }
    } catch (err) {
        // si la requête a échoué côté JS (réseau, serveur inaccessible, etc)
        Swal.fire({
            toast: true,
            position: "top-end", // position de la notif
            icon: "error", // icône erreur
            title: "Impossible de contacter le serveur", // texte de la notif
            showConfirmButton: false, // pas de bouton
            timer: 1500, // disparaît après 1.5s
        });
        // affiche l’erreur dans la console pour debug
        console.error(err);
    }
}

// === fonction pour initialisé le formulaire d'ajout d'utilisateur ===

async function initAddUserForm() {
    document
        .querySelector(".views .beautiful .adduserform")
        .addEventListener("submit", function (event) {
            event.preventDefault();
            addUser(
                this.firstname.value,
                this.lastname.value,
                this.isadmin.checked ? 1 : 0,
            );
        });
}

// === fonction pour maitre a joure les statistique ===
async function updateStats() {
    // recuperer les balise des statistique
    const usersDiv = document.querySelector(
        ".views > .home .stat-card.users > h2",
    );
    const adminDiv = document.querySelector(
        ".views > .home .stat-card.admins > h2",
    );
    const badgesDiv = document.querySelector(
        ".views > .home .stat-card.badges > h2",
    );
    const logsDiv = document.querySelector(
        ".views > .home .stat-card.logs > h2",
    );
    const failedlogsDiv = document.querySelector(
        ".views > .home .stat-card.failedlogs > h2",
    );

    // m'aitre a joure les balise
    usersDiv.textContent = pageData.total_users;
    adminDiv.textContent = pageData.total_admins;
    badgesDiv.textContent = pageData.total_badges;
    logsDiv.textContent = pageData.logs.length;
    failedlogsDiv.textContent = pageData.failed_logs.length;
}

// === fonction pour maitre a joure la table de logs
async function updateLogsTable() {
    // recuperer le tableau
    const tbody = document.querySelector(
        ".views > .beautiful .logstable tbody",
    );
    // vidé le tableau
    tbody.innerHTML = "";
    // definire la list pour stoquer les logs regroupé
    let allLogs = [];
    // pour chaque logs de connection refusé
    pageData.failed_logs.forEach((e) => {
        // faire une copy du logs
        const cpe = { ...e };
        // precisé que c'est un logs refusé avent de...
        cpe.success = false;
        // ajouté le logs a la list de logs regroupé
        allLogs.push(e);
    });
    // pour chaque logs de connection autorisé
    pageData.logs.forEach((e) => {
        // faire une copy du logs
        let cpe = e;
        // precisé que c'est un logs autorisé avent de...
        cpe.success = true;
        // ajouté le logs a la list de logs regroupé
        allLogs.push(e);
    });
    // trillé la list de logs regroupé selon l'atribut date de chaque element du plus recent au moin recent
    allLogs.sort((a, b) => new Date(b.date) - new Date(a.date)); // ligne généré par l'ia
    // pour chaque element de la list regroupé
    allLogs.forEach((e) => {
        // créer une ligne de tableau
        const tr = document.createElement("tr");
        // ajouté saite ligne au tableau de logs
        tbody.appendChild(tr);
        // créer tout les case de la ligne
        const td = {
            lastname: document.createElement("td"),
            firstname: document.createElement("td"),
            rfid: document.createElement("td"),
            date: document.createElement("td"),
            time: document.createElement("td"),
            status: document.createElement("td"),
        };
        // ajouté tout les case a la ligne du tableau
        tr.appendChild(td.lastname);
        tr.appendChild(td.firstname);
        tr.appendChild(td.rfid);
        tr.appendChild(td.date);
        tr.appendChild(td.time);
        tr.appendChild(td.status);

        // ajouté les donné au element nom prénom et badge
        td.lastname.textContent = e.lastname || "-";
        td.firstname.textContent = e.firstname || "-";
        td.rfid.textContent = e.rfid;
        // verrifier si c'est un log reusie
        if (e.success) {
            // si c'est le cas alore ajouté autorisé a l'element status et definire la ligne comme reusie
            td.status.textContent = "autorisé";
            tr.classList.add("success");
        } else {
            // si non ajouté refusé a l'element status et definire la ligne comme échouer
            td.status.textContent = "refusé";
            tr.classList.add("failed");
        }
        // ajouté les donné a l'element date
        td.date.textContent = new Date(e.date).toLocaleDateString("fr-FR", {
            timeZone: "Europe/Paris",
        });
        // ajouté les donné a l'element heure
        td.time.textContent = new Date(e.date).toLocaleTimeString("fr-FR", {
            timeZone: "Europe/Paris",
            hour12: false,
        });
    });
}

// === fonction pour initialisé la page utilisateur ===

async function initUserPage(id) {
    //--------------------------------------------------------------------------------------------------------
    
}

// === fonction pour initialisé la page ===

async function initPage() {
    // recuperer les paramaitre de l'url et...
    const params = new URLSearchParams(window.location.search);
    // recuperer dans les paramaitre de l'url la valeur page
    const page = params.get("page");
    // verrifier si la valeur est defini
    if (page) {
        // si c'est le cas on demande la vue precise dans la valeur page
        showView(page);
    } else {
        // si se n'ai pas le cas on demande la vu home
        showView("home");
    }
    // on initialise les button des vue
    initViewButton();
    initSearchUserBar();
    await Promise.all([
        getUserStats(),
        getBadgeStats(),
        getAccesslogs(),
        getFailedAccesslogs(),
    ]);
    updateStats();
    updateLogsTable();
    searchUsers("");
    initAddUserForm();
}

// initialisé la page
const pageData = {
    total_users: 0,
    total_admins: 0,
    total_badges: 0,
    logs: [],
    failed_logs: [],
};
initPage();
