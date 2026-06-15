// FOR DEMO PURPOSES
let mockSystemSettingsStore = {
    barangayName: "Barangay San Jose",
    municipality: "Pandi",
    province: "Bulacan",
    address: "Purok 2, Main Street, San Jose",
    contactNumber: "+63 912 345 6789",
    publicEmail: "info@barangaysanjose.gov.ph",
    workingHours: "8:00 AM - 5:00 PM (Monday - Friday)"
};

let mockAdministratorsCache = [
    { id: "adm_1", empId: "EMP-001", name: "Juan Dela Cruz", email: "juan.delacruz@barangay.gov.ph", phone: "0917-111-2222", role: "Super Admin", status: "Active" },
    { id: "adm_2", empId: "EMP-005", name: "Maria Santos", email: "maria.santos@barangay.gov.ph", phone: "0918-333-4444", role: "Staff", status: "Active" }
];

let activeAdminSearchFilterQuery = "";

// --- NEW MODAL TRACKERS & HELPERS ---
let currentEditAdminId = null;
let currentDeleteAdminId = null;

window.openModal = function(modalId) {
    document.getElementById('custom-modal-overlay').style.display = 'block';
    document.getElementById(modalId).style.display = 'flex';
};

window.closeModals = function() {
    document.getElementById('custom-modal-overlay').style.display = 'none';
    document.querySelectorAll('.custom-modal').forEach(m => m.style.display = 'none');
    currentEditAdminId = null;
    currentDeleteAdminId = null;
};
// ------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    setupMobileMenuBurger();
    setupTabNavigation();
    setupSaveLogic();
    setupAdminManagementActions();
    setupLogoutRedirectAction();

    const adminNameEl = document.getElementById('auth-admin-name');
    if (adminNameEl) adminNameEl.textContent = "Admin User";
    
    hydrateConfigurationFields();
    renderAdministratorsTableRoster();
});

// Sidebar Sliding Logic
function setupMobileMenuBurger() {
    const burgerBtn = document.getElementById('menu-toggle');
    const sidebarMenu = document.getElementById('sidebar');
    
    if (burgerBtn && sidebarMenu) {
        burgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebarMenu.classList.toggle('mobile-visible');
        });

        document.addEventListener('click', (e) => {
            if (sidebarMenu.classList.contains('mobile-visible') && !sidebarMenu.contains(e.target) && e.target !== burgerBtn) {
                sidebarMenu.classList.remove('mobile-visible');
            }
        });
    }
}

function setupTabNavigation() {
    const tabs = document.querySelectorAll(".settings-tab-btn");
    const panes = document.querySelectorAll(".settings-tab-pane");

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            tabs.forEach((t) => t.classList.remove("active"));
            panes.forEach((p) => (p.style.display = "none"));

            tab.classList.add("active");
            const targetId = tab.getAttribute("data-target");
            const targetPane = document.getElementById(targetId);
            if (targetPane) targetPane.style.display = "block";
        });
    });
}

function hydrateConfigurationFields() {
    document.getElementById('setting-brgy-name').value = mockSystemSettingsStore?.barangayName || "";
    document.getElementById('setting-municipality').value = mockSystemSettingsStore?.municipality || "";
    document.getElementById('setting-province').value = mockSystemSettingsStore?.province || "";
    document.getElementById('setting-address').value = mockSystemSettingsStore?.address || "";
    document.getElementById('setting-contact').value = mockSystemSettingsStore?.contactNumber || "";
    document.getElementById('setting-email').value = mockSystemSettingsStore?.publicEmail || "";
    document.getElementById('setting-hours').value = mockSystemSettingsStore?.workingHours || "";
}

function checkEmptyFields() {
    const fields = [
        { id: 'setting-brgy-name', name: "Barangay Name", type: "text" },
        { id: 'setting-municipality', name: "Municipality", type: "text" },
        { id: 'setting-province', name: "Province", type: "text" },
        { id: 'setting-address', name: "Complete Address", type: "text" },
        { id: 'setting-contact', name: "Official Contact Number", type: "phone" },
        { id: 'setting-email', name: "Official Email Address", type: "email" },
        { id: 'setting-hours', name: "Standard Office Working Hours", type: "text" }
    ];

    // Strengthened Regex Patterns
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    // Accommodates formats such as +63 912 345 6789, 0917-111-2222, and standard landlines
    const phoneRegex = /^(?:\+63|0)[0-9\-\s]{9,13}$/;

    for (let field of fields) {
        const input = document.getElementById(field.id);
        const val = input ? input.value.trim() : "";

        if (val === "") {
            alert(`Save Blocked: The "${field.name}" field cannot be left blank.`);
            input.focus();
            return false;
        }

        if (field.type === "email" && !emailRegex.test(val)) {
            alert(`Save Blocked: "${field.name}" requires a valid email format (e.g., info@barangay.gov.ph).`);
            input.focus();
            return false;
        }

        if (field.type === "phone" && !phoneRegex.test(val)) {
            alert(`Save Blocked: "${field.name}" must be a valid Philippine contact number format.`);
            input.focus();
            return false;
        }
    }
    return true; 
}

function setupSaveLogic() {
    const saveBtn = document.getElementById("btn-save-settings");
    const saveBtnText = document.getElementById("save-btn-text");
    
    if (saveBtn && saveBtnText) {
        saveBtn.addEventListener("click", (e) => {
            e.preventDefault();

            if (!checkEmptyFields()) return;

            const originalText = saveBtnText.innerText;
            saveBtnText.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`;
            saveBtn.disabled = true;

            // Commit to mock database
            mockSystemSettingsStore.barangayName = document.getElementById("setting-brgy-name").value.trim();
            mockSystemSettingsStore.municipality = document.getElementById("setting-municipality").value.trim();
            mockSystemSettingsStore.province = document.getElementById("setting-province").value.trim();
            mockSystemSettingsStore.address = document.getElementById("setting-address").value.trim();
            mockSystemSettingsStore.contactNumber = document.getElementById("setting-contact").value.trim();
            mockSystemSettingsStore.publicEmail = document.getElementById("setting-email").value.trim();
            mockSystemSettingsStore.workingHours = document.getElementById("setting-hours").value.trim();
            
            setTimeout(() => {
                saveBtnText.innerHTML = "Configurations Saved";
                saveBtn.style.backgroundColor = "#10B981"; 

                setTimeout(() => {
                    saveBtnText.innerHTML = originalText;
                    saveBtn.style.backgroundColor = ""; 
                    saveBtn.disabled = false;
                }, 800);
            }, 300);
        });
    }
}

// --- UPDATED MODAL-DRIVEN MANAGEMENT ACTIONS ---
function setupAdminManagementActions() {
    const inviteBtn = document.getElementById('btn-add-admin');
    const searchInput = document.getElementById('search-admin');
    const saveAdminBtn = document.getElementById('btn-save-admin');
    const confirmDeleteBtn = document.getElementById('btn-confirm-delete');

    // Strict validation patterns for administrative data entry
    const empIdRegex = /^EMP-\d{3,4}$/i;
    const nameRegex = /^[A-Za-zÑñ\s\-.,]+$/;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const phoneRegex = /^(?:\+63|0)[0-9\-\s]{9,13}$/;

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            activeAdminSearchFilterQuery = e.target.value.toLowerCase().trim();
            renderAdministratorsTableRoster();
        });
    }
    
    // Open Form for NEW Admin
    if (inviteBtn) {
        inviteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            currentEditAdminId = null; 
            document.getElementById('modal-title').innerHTML = "<i class='fas fa-user-plus'></i> Invite New Admin";
            
            // Clear all fields
            document.getElementById('modal-emp-id').value = "";
            document.getElementById('modal-emp-id').disabled = false; // Allow typing
            document.getElementById('modal-name').value = "";
            document.getElementById('modal-email').value = "";
            document.getElementById('modal-phone').value = "";
            document.getElementById('modal-role').value = "Staff";
            
            openModal('admin-form-modal');
        });
    }

    // Save Button inside the Modal (Handles both Add & Edit)
    if (saveAdminBtn) {
        saveAdminBtn.addEventListener('click', () => {
            const empId = document.getElementById('modal-emp-id').value.trim();
            const name = document.getElementById('modal-name').value.trim();
            const email = document.getElementById('modal-email').value.trim();
            const phone = document.getElementById('modal-phone').value.trim();
            const role = document.getElementById('modal-role').value;

            // Form Validations
            if (!empIdRegex.test(empId)) return alert("Employee ID must follow 'EMP-XXX' format.");
            if (!nameRegex.test(name)) return alert("Full Name is required (letters only).");
            if (!emailRegex.test(email)) return alert("A valid email address is required.");
            if (!phoneRegex.test(phone)) return alert("A valid Philippine contact number is required.");

            if (currentEditAdminId) {
                // Updating an existing admin
                const admin = mockAdministratorsCache.find(a => a.id === currentEditAdminId);
                if (admin) {
                    admin.empId = empId.toUpperCase();
                    admin.name = name;
                    admin.email = email;
                    admin.phone = phone;
                    admin.role = role;
                }
            } else {
                // Creating a new admin
                mockAdministratorsCache.push({
                    id: "adm_" + Date.now(),
                    empId: empId.toUpperCase(),
                    name: name,
                    email: email,
                    phone: phone,
                    role: role,
                    status: "Active"
                });
            }

            renderAdministratorsTableRoster();
            closeModals();
        });
    }

    // Confirm Delete Button inside Danger Modal
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            if (currentDeleteAdminId) {
                mockAdministratorsCache = mockAdministratorsCache.filter(a => a.id !== currentDeleteAdminId);
                renderAdministratorsTableRoster();
            }
            closeModals();
        });
    }
}

function renderAdministratorsTableRoster() {
    const tbody = document.getElementById('admins-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    const filteredAdmins = mockAdministratorsCache.filter(adm => {
        return !activeAdminSearchFilterQuery || 
               adm.name.toLowerCase().includes(activeAdminSearchFilterQuery) || 
               adm.email.toLowerCase().includes(activeAdminSearchFilterQuery);
    });

    if (filteredAdmins.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="table-empty-state"><i class="fas fa-users-slash" style="display:block; margin-bottom:6px; opacity:0.4;"></i>No administrative accounts match your search parameters.</td></tr>`;
        return;
    }

    filteredAdmins.forEach(adm => {
        let roleBadgeClass = adm.role === "Super Admin" ? "badge super-admin" : "badge staff-admin";
        
        const rowHTML = document.createElement('tr');
        rowHTML.innerHTML = `
            <td><strong>${adm.empId}</strong></td>
            <td><strong style="color: var(--text-main); font-weight: 600;">${adm.name}</strong></td>
            <td>${adm.email}</td>
            <td>${adm.phone}</td>
            <td><span class="${roleBadgeClass}">${adm.role}</span></td>
            <td><span class="badge active-status">${adm.status}</span></td>
            <td>
                <button class="btn-icon" title="Modify Access Key" onclick="window.editAdminAccountRoleScope('${adm.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-icon text-crimson" title="Revoke Authorization" onclick="window.revokeAdminAccountPrivileges('${adm.id}')"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(rowHTML);
    });
}

// Open Form for EDITING
window.editAdminAccountRoleScope = function(adminId) {
    const admin = mockAdministratorsCache.find(a => a.id === adminId);
    if (!admin) return;

    currentEditAdminId = adminId;
    document.getElementById('modal-title').innerHTML = "<i class='fas fa-user-edit'></i> Edit Administrator";
    
    // Populate form with existing data
    document.getElementById('modal-emp-id').value = admin.empId;
    document.getElementById('modal-emp-id').disabled = true; // Lock the ID from being changed
    document.getElementById('modal-name').value = admin.name;
    document.getElementById('modal-email').value = admin.email;
    document.getElementById('modal-phone').value = admin.phone;
    document.getElementById('modal-role').value = admin.role;

    openModal('admin-form-modal');
};

// Inline Action: Open DANGER modal
window.revokeAdminAccountPrivileges = function(adminId) {
    const admin = mockAdministratorsCache.find(a => a.id === adminId);
    if (!admin) return;

    currentDeleteAdminId = adminId;
    document.getElementById('delete-confirm-text').innerHTML = `Are you sure you want to completely revoke system access for <strong>${admin.name}</strong>? This action will remove them from the active roster.`;
    
    openModal('confirm-delete-modal');
};

function setupLogoutRedirectAction() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = "../auth/index.html";
        });
    }
}