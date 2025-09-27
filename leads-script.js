// Leads Management JavaScript
let leadsData = [];
let filteredLeads = [];
let currentPage = 1;
const leadsPerPage = 10;

// DOM Elements
const leadsTableBody = document.getElementById('leadsTableBody');
const leadsTableContainer = document.getElementById('leadsTableContainer');
const leadsLoading = document.getElementById('leadsLoading');
const leadsSearch = document.getElementById('leadsSearch');
const statusFilter = document.getElementById('statusFilter');
const sourceFilter = document.getElementById('sourceFilter');
const exportLeads = document.getElementById('exportLeads');
const leadModal = document.getElementById('leadModal');
const leadModalBody = document.getElementById('leadModalBody');
const closeLeadModal = document.getElementById('closeLeadModal');
const updateLead = document.getElementById('updateLead');
const cancelLead = document.getElementById('cancelLead');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const currentPageSpan = document.getElementById('currentPage');
const totalPagesSpan = document.getElementById('totalPages');

// Stats elements
const totalLeads = document.getElementById('totalLeads');
const newLeads = document.getElementById('newLeads');
const contactedLeads = document.getElementById('contactedLeads');
const convertedLeads = document.getElementById('convertedLeads');

// Initialize the leads management system
document.addEventListener('DOMContentLoaded', function() {
    initializeLeads();
    setupEventListeners();
});

function initializeLeads() {
    // Ensure modal is hidden on page load
    initializeModal();
    showLoading();
    loadLeadsData();
}

// Initialize modal state
function initializeModal() {
    if (leadModal) {
        leadModal.style.display = 'none';
        // Clear any existing modal content
        if (leadModalBody) {
            leadModalBody.innerHTML = '';
        }
    }
    try { 
        document.body.classList.remove('no-scroll'); 
    } catch (e) {}
    
    // Ensure update button is hidden initially
    if (updateLead) {
        updateLead.style.display = 'none';
    }
}

function setupEventListeners() {
    // Ensure modal is hidden when setting up event listeners
    initializeModal();
    
    // Search functionality
    leadsSearch.addEventListener('input', debounce(handleSearch, 300));
    
    // Filter functionality
    statusFilter.addEventListener('change', handleFilter);
    sourceFilter.addEventListener('change', handleFilter);
    
    // Export functionality
    exportLeads.addEventListener('click', handleExport);
    
    // Modal functionality
    closeLeadModal.addEventListener('click', closeModal);
    cancelLead.addEventListener('click', closeModal);
    updateLead.addEventListener('click', handleUpdateLead);
    
    // Pagination
    prevPage.addEventListener('click', () => changePage(-1));
    nextPage.addEventListener('click', () => changePage(1));
    
    // Close modal on outside click
    leadModal.addEventListener('click', (e) => {
        if (e.target === leadModal) {
            closeModal();
        }
    });
}

// Load leads data from Firebase or localStorage
function normalizeLeads(raw) {
    if (!raw) return [];
    // Accept array or object keyed by id
    let list = [];
    if (Array.isArray(raw)) {
        list = raw.filter(Boolean);
    } else if (typeof raw === 'object') {
        list = Object.keys(raw).map(id => ({ id, ...raw[id] }));
    }
    // Ensure stable id and date fields
    return list.map(item => ({
        id: item.id || cryptoRandomId(),
        name: item.name || '',
        email: item.email || '',
        phone: item.phone || '',
        interest: item.interest || 'general',
        source: item.source || 'contact-form',
        status: item.status || 'new',
        message: item.message || '',
        date: item.date || item.createdAt || new Date().toISOString(),
        createdAt: item.createdAt || item.date || new Date().toISOString(),
        updatedAt: item.updatedAt || item.date || new Date().toISOString()
    }));
}

function leadsListToObject(list) {
    const obj = {};
    list.forEach(l => {
        obj[l.id] = { ...l };
        delete obj[l.id].id;
    });
    return obj;
}

function cryptoRandomId() {
    try {
        const buf = new Uint8Array(8);
        crypto.getRandomValues(buf);
        return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        return 'id_' + Math.random().toString(36).slice(2, 10);
    }
}

function loadLeadsData() {
    try {
        if (window.exoticFirebase && window.exoticFirebase.db) {
            // Load from Firebase
            window.exoticFirebase.db.ref('leads').on('value', snap => {
                const remote = snap.val();
                leadsData = normalizeLeads(remote);
                filteredLeads = [...leadsData];
                hideLoading();
                updateStats();
                renderLeads();
            });
        } else {
            // Load from localStorage
            const stored = localStorage.getItem('exoticLeads');
            leadsData = stored ? normalizeLeads(JSON.parse(stored)) : [];
            filteredLeads = [...leadsData];
            hideLoading();
            updateStats();
            renderLeads();
        }
    } catch (error) {
        console.error('Error loading leads data:', error);
        leadsData = [];
        filteredLeads = [];
        hideLoading();
        updateStats();
        renderLeads();
    }
}

// Loading state management
function showLoading() {
    if (leadsLoading) {
        leadsLoading.style.display = 'flex';
    }
    if (leadsTableContainer) {
        leadsTableContainer.style.display = 'none';
    }
}

function hideLoading() {
    if (leadsLoading) {
        leadsLoading.style.display = 'none';
    }
    if (leadsTableContainer) {
        leadsTableContainer.style.display = 'block';
    }
}

// Save leads data to Firebase or localStorage
function saveLeadsData() {
    try {
        if (window.exoticFirebase && window.exoticFirebase.db) {
            // Save to Firebase as object keyed by id to avoid sparse arrays
            const toSave = leadsListToObject(leadsData);
            window.exoticFirebase.db.ref('leads').set(toSave);
        } else {
            // Save to localStorage
            localStorage.setItem('exoticLeads', JSON.stringify(leadsListToObject(leadsData)));
        }
    } catch (error) {
        console.error('Error saving leads data:', error);
    }
}

// Update statistics
function updateStats() {
    const today = new Date().toDateString();
    const newToday = leadsData.filter(lead => 
        new Date(lead.date).toDateString() === today
    ).length;
    
    const contacted = leadsData.filter(lead => 
        lead.status === 'contacted' || lead.status === 'qualified' || lead.status === 'converted'
    ).length;
    
    const converted = leadsData.filter(lead => 
        lead.status === 'converted'
    ).length;
    
    totalLeads.textContent = leadsData.length;
    newLeads.textContent = newToday;
    contactedLeads.textContent = contacted;
    convertedLeads.textContent = converted;
}

// Render leads table
function renderLeads() {
    if (!leadsTableBody) return;
    
    const startIndex = (currentPage - 1) * leadsPerPage;
    const endIndex = startIndex + leadsPerPage;
    const pageLeads = filteredLeads.slice(startIndex, endIndex);
    
    leadsTableBody.innerHTML = '';
    
    if (pageLeads.length === 0) {
        leadsTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center" style="padding: 40px; color: var(--light-gray);">
                    <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    No leads found
                </td>
            </tr>
        `;
        return;
    }
    
    pageLeads.forEach(lead => {
        const row = createLeadRow(lead);
        leadsTableBody.appendChild(row);
    });
    
    updatePagination();
}

// Create a lead table row
function createLeadRow(lead) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td class="lead-name">${lead.name}</td>
        <td><a href="mailto:${lead.email}" class="lead-email">${lead.email}</a></td>
        <td class="lead-phone">${lead.phone || 'N/A'}</td>
        <td><span class="lead-interest">${lead.interest || 'General'}</span></td>
        <td><span class="lead-source">${lead.source || 'Unknown'}</span></td>
        <td><span class="lead-status ${lead.status || 'new'}">${lead.status || 'new'}</span></td>
        <td class="lead-date">${formatDate(lead.date)}</td>
        <td class="lead-actions">
            <div class="quick-actions">
                <button class="qa-btn qa-new" onclick="changeLeadStatusQuick('${lead.id}', 'new')" title="Mark as New" ${lead.status === 'new' ? 'disabled' : ''}>New</button>
                <button class="qa-btn qa-contacted" onclick="changeLeadStatusQuick('${lead.id}', 'contacted')" title="Mark as Contacted" ${lead.status === 'contacted' ? 'disabled' : ''}>Contacted</button>
                <button class="qa-btn qa-qualified" onclick="changeLeadStatusQuick('${lead.id}', 'qualified')" title="Mark as Qualified" ${lead.status === 'qualified' ? 'disabled' : ''}>Qualified</button>
                <button class="qa-btn qa-converted" onclick="changeLeadStatusQuick('${lead.id}', 'converted')" title="Mark as Converted" ${lead.status === 'converted' ? 'disabled' : ''}>Converted</button>
                <button class="qa-btn qa-lost" onclick="changeLeadStatusQuick('${lead.id}', 'lost')" title="Mark as Lost" ${lead.status === 'lost' ? 'disabled' : ''}>Lost</button>
            </div>
            <div class="action-group">
                <button class="action-btn view" onclick="viewLead('${lead.id}')" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit" onclick="editLead('${lead.id}')" title="Edit Lead">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="deleteLead('${lead.id}')" title="Delete Lead">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;
    return row;
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Handle search
function handleSearch() {
    const searchTerm = leadsSearch.value.toLowerCase().trim();
    
    // Show brief loading for search
    showLoading();
    
    // Simulate a small delay for better UX
    setTimeout(() => {
        if (!searchTerm) {
            filteredLeads = [...leadsData];
        } else {
            filteredLeads = leadsData.filter(lead => {
                const searchFields = [
                    lead.name,
                    lead.email,
                    lead.phone,
                    lead.interest,
                    lead.source,
                    lead.message
                ].map(field => (field || '').toString().toLowerCase());
                
                return searchFields.some(field => field.includes(searchTerm));
            });
        }
        
        currentPage = 1;
        hideLoading();
        renderLeads();
    }, 300);
}

// Handle filter changes
function handleFilter() {
    const statusFilterValue = statusFilter.value;
    const sourceFilterValue = sourceFilter.value;
    
    // Show brief loading for filter
    showLoading();
    
    // Simulate a small delay for better UX
    setTimeout(() => {
        filteredLeads = leadsData.filter(lead => {
            const statusMatch = statusFilterValue === 'all' || lead.status === statusFilterValue;
            const sourceMatch = sourceFilterValue === 'all' || lead.source === sourceFilterValue;
            return statusMatch && sourceMatch;
        });
        
        currentPage = 1;
        hideLoading();
        renderLeads();
    }, 200);
}

// View lead details
function viewLead(leadId) {
    const lead = leadsData.find(l => l.id === leadId);
    if (!lead) return;
    
    leadModalBody.innerHTML = `
        <form class="lead-detail-form" id="leadDetailForm">
            <div class="form-group">
                <label>Name</label>
                <input type="text" value="${lead.name}" readonly>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" value="${lead.email}" readonly>
            </div>
            <div class="form-group">
                <label>Phone</label>
                <input type="tel" value="${lead.phone || ''}" readonly>
            </div>
            <div class="form-group">
                <label>Interest</label>
                <input type="text" value="${lead.interest || ''}" readonly>
            </div>
            <div class="form-group">
                <label>Source</label>
                <input type="text" value="${lead.source || ''}" readonly>
            </div>
            <div class="form-group">
                <label>Status</label>
                <input type="text" value="${lead.status || 'new'}" readonly>
            </div>
            <div class="form-group full">
                <label>Message</label>
                <textarea readonly>${lead.message || ''}</textarea>
            </div>
            <div class="form-group">
                <label>Date</label>
                <input type="text" value="${formatDate(lead.date)}" readonly>
            </div>
        </form>
    `;
    
    leadModal.style.display = 'block';
    try { document.body.classList.add('no-scroll'); } catch (e) {}
    if (updateLead) updateLead.style.display = 'none';
    if (cancelLead) cancelLead.textContent = 'Close';
    renderStatusActions(lead);
    enableModalScrollTrap();
}

// Edit lead
function editLead(leadId) {
    const lead = leadsData.find(l => l.id === leadId);
    if (!lead) return;
    
    leadModalBody.innerHTML = `
        <form class="lead-detail-form" id="leadDetailForm">
            <input type="hidden" id="leadId" value="${lead.id}">
            <div class="form-group">
                <label>Name</label>
                <input type="text" id="leadName" value="${lead.name}" required>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="leadEmail" value="${lead.email}" required>
            </div>
            <div class="form-group">
                <label>Phone</label>
                <input type="tel" id="leadPhone" value="${lead.phone || ''}">
            </div>
            <div class="form-group">
                <label>Interest</label>
                <select id="leadInterest">
                    <option value="general" ${lead.interest === 'general' ? 'selected' : ''}>General Inquiry</option>
                    <option value="test-drive" ${lead.interest === 'test-drive' ? 'selected' : ''}>Test Drive</option>
                    <option value="quote" ${lead.interest === 'quote' ? 'selected' : ''}>Quote Request</option>
                    <option value="purchase" ${lead.interest === 'purchase' ? 'selected' : ''}>Purchase Interest</option>
                    <option value="service" ${lead.interest === 'service' ? 'selected' : ''}>Service</option>
                </select>
            </div>
            <div class="form-group">
                <label>Source</label>
                <select id="leadSource">
                    <option value="contact-form" ${lead.source === 'contact-form' ? 'selected' : ''}>Contact Form</option>
                    <option value="test-drive" ${lead.source === 'test-drive' ? 'selected' : ''}>Test Drive</option>
                    <option value="quote-request" ${lead.source === 'quote-request' ? 'selected' : ''}>Quote Request</option>
                    <option value="phone" ${lead.source === 'phone' ? 'selected' : ''}>Phone</option>
                    <option value="walk-in" ${lead.source === 'walk-in' ? 'selected' : ''}>Walk-in</option>
                </select>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select id="leadStatus">
                    <option value="new" ${lead.status === 'new' ? 'selected' : ''}>New</option>
                    <option value="contacted" ${lead.status === 'contacted' ? 'selected' : ''}>Contacted</option>
                    <option value="qualified" ${lead.status === 'qualified' ? 'selected' : ''}>Qualified</option>
                    <option value="converted" ${lead.status === 'converted' ? 'selected' : ''}>Converted</option>
                    <option value="lost" ${lead.status === 'lost' ? 'selected' : ''}>Lost</option>
                </select>
            </div>
            <div class="form-group full">
                <label>Message</label>
                <textarea id="leadMessage">${lead.message || ''}</textarea>
            </div>
        </form>
    `;
    
    leadModal.style.display = 'block';
    try { document.body.classList.add('no-scroll'); } catch (e) {}
    if (updateLead) updateLead.style.display = 'block';
    if (cancelLead) cancelLead.textContent = 'Cancel';
    renderStatusActions(lead, true);
    enableModalScrollTrap();
}

// Handle lead update
function handleUpdateLead() {
    const leadIdElement = document.getElementById('leadId');
    if (!leadIdElement) {
        console.error('Lead ID element not found. Modal may not be in edit mode.');
        alert('Error: Cannot update lead. Please try editing the lead again.');
        return;
    }
    
    const leadId = leadIdElement.value;
    const lead = leadsData.find(l => l.id === leadId);
    
    if (!lead) {
        console.error('Lead not found with ID:', leadId);
        return;
    }
    
    // Get form elements with error handling
    const nameElement = document.getElementById('leadName');
    const emailElement = document.getElementById('leadEmail');
    const phoneElement = document.getElementById('leadPhone');
    const interestElement = document.getElementById('leadInterest');
    const sourceElement = document.getElementById('leadSource');
    const statusElement = document.getElementById('leadStatus');
    const messageElement = document.getElementById('leadMessage');
    
    // Check if all required elements exist
    if (!nameElement || !emailElement || !phoneElement || !interestElement || !sourceElement || !statusElement || !messageElement) {
        console.error('One or more form elements not found. Modal may not be in edit mode.');
        alert('Error: Form elements not found. Please try editing the lead again.');
        return;
    }
    
    // Update lead data
    lead.name = nameElement.value;
    lead.email = emailElement.value;
    lead.phone = phoneElement.value;
    lead.interest = interestElement.value;
    lead.source = sourceElement.value;
    lead.status = statusElement.value;
    lead.message = messageElement.value;
    lead.updatedAt = new Date().toISOString();
    
    // Save data
    saveLeadsData();
    
    // Update filtered leads
    const leadIndex = filteredLeads.findIndex(l => l.id === leadId);
    if (leadIndex !== -1) {
        filteredLeads[leadIndex] = lead;
    }
    
    // Update display
    updateStats();
    renderLeads();
    closeModal();
    
    showNotification('Lead updated successfully', 'success');
}

// Render quick status actions in modal footer
function renderStatusActions(lead, isEdit = false) {
    const footer = document.querySelector('.lead-modal .modal-footer');
    if (!footer) return;
    // Clear existing actions except the trailing buttons
    footer.innerHTML = `
        <div class="status-actions">
            <button class="chip ${lead.status === 'new' ? 'active' : ''}" data-status="new">New</button>
            <button class="chip ${lead.status === 'contacted' ? 'active' : ''}" data-status="contacted">Contacted</button>
            <button class="chip ${lead.status === 'qualified' ? 'active' : ''}" data-status="qualified">Qualified</button>
            <button class="chip ${lead.status === 'converted' ? 'active' : ''}" data-status="converted">Converted</button>
            <button class="chip ${lead.status === 'lost' ? 'active' : ''}" data-status="lost">Lost</button>
        </div>
        ${isEdit ? '<button class="btn-secondary" id="cancelLead">Cancel</button><button class="btn-primary" id="updateLead">Update Lead</button>' : '<button class="btn-secondary" id="cancelLead">Close</button>'}
    `;
    // Re-wire footer buttons
    const cancelBtn = document.getElementById('cancelLead');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    const updateBtn = document.getElementById('updateLead');
    if (updateBtn) updateBtn.addEventListener('click', handleUpdateLead);

    const chips = footer.querySelectorAll('.chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            const newStatus = chip.getAttribute('data-status');
            changeLeadStatusQuick(lead.id, newStatus);
        });
    });
}

function changeLeadStatusQuick(leadId, newStatus) {
    const idx = leadsData.findIndex(l => l.id === leadId);
    if (idx === -1) return;
    leadsData[idx].status = newStatus;
    leadsData[idx].updatedAt = new Date().toISOString();
    saveLeadsData();
    // Update UI
    const fidx = filteredLeads.findIndex(l => l.id === leadId);
    if (fidx !== -1) filteredLeads[fidx] = leadsData[idx];
    updateStats();
    renderLeads();
    // Update chips active state
    const footer = document.querySelector('.lead-modal .modal-footer');
    if (footer) {
        footer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        const activeChip = footer.querySelector(`.chip[data-status="${newStatus}"]`);
        if (activeChip) activeChip.classList.add('active');
    }
    showNotification(`Status updated to ${newStatus}`, 'success');
}

// Delete lead
function deleteLead(leadId) {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    
    leadsData = leadsData.filter(lead => lead.id !== leadId);
    filteredLeads = filteredLeads.filter(lead => lead.id !== leadId);
    
    saveLeadsData();
    updateStats();
    renderLeads();
    
    showNotification('Lead deleted successfully', 'success');
}

// Close modal
function closeModal() {
    leadModal.style.display = 'none';
    try { document.body.classList.remove('no-scroll'); } catch (e) {}
    disableModalScrollTrap();
}

// Trap scroll inside modal body
let modalScrollTrapHandlersAttached = false;
function enableModalScrollTrap() {
    if (modalScrollTrapHandlersAttached) return;
    const overlay = document.querySelector('.lead-modal');
    const body = document.querySelector('.lead-modal .modal-body');
    if (!overlay || !body) return;

    const preventScroll = (e) => {
        // Allow if target is within modal body and can scroll further
        const target = e.target.closest('.modal-body');
        if (target) {
            const canScroll = target.scrollHeight > target.clientHeight;
            const atTop = target.scrollTop === 0;
            const atBottom = Math.ceil(target.scrollTop + target.clientHeight) >= target.scrollHeight;

            if (!canScroll) {
                e.preventDefault();
            } else {
                const deltaY = e.deltaY !== undefined ? e.deltaY : (e.touches && e.touches.length ? -e.touches[0].clientY : 0);
                if ((deltaY < 0 && atTop) || (deltaY > 0 && atBottom)) {
                    e.preventDefault();
                }
            }
            return;
        }
        // Outside modal body -> block
        e.preventDefault();
    };

    overlay.addEventListener('wheel', preventScroll, { passive: false });
    overlay.addEventListener('touchmove', preventScroll, { passive: false });
    modalScrollTrapHandlersAttached = true;
}

function disableModalScrollTrap() {
    const overlay = document.querySelector('.lead-modal');
    if (!overlay) return;
    // Clone to remove listeners
    const newOverlay = overlay.cloneNode(true);
    overlay.parentNode.replaceChild(newOverlay, overlay);
    modalScrollTrapHandlersAttached = false;
}

// Handle export
function handleExport() {
    const csvContent = generateCSV(filteredLeads);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification('Leads exported successfully', 'success');
}

// Generate CSV content
function generateCSV(leads) {
    const headers = ['Name', 'Email', 'Phone', 'Interest', 'Source', 'Status', 'Message', 'Date'];
    const csvRows = [headers.join(',')];
    
    leads.forEach(lead => {
        const row = [
            `"${lead.name || ''}"`,
            `"${lead.email || ''}"`,
            `"${lead.phone || ''}"`,
            `"${lead.interest || ''}"`,
            `"${lead.source || ''}"`,
            `"${lead.status || ''}"`,
            `"${(lead.message || '').replace(/"/g, '""')}"`,
            `"${lead.date || ''}"`
        ];
        csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);
    
    currentPageSpan.textContent = currentPage;
    totalPagesSpan.textContent = totalPages;
    
    prevPage.disabled = currentPage === 1;
    nextPage.disabled = currentPage === totalPages || totalPages === 0;
}

// Change page
function changePage(direction) {
    const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        // Show brief loading for pagination
        showLoading();
        
        setTimeout(() => {
            currentPage = newPage;
            hideLoading();
            renderLeads();
        }, 150);
    }
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#00ff88' : '#4488ff'};
        color: #000;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 3000;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideInRight 0.3s ease-out;
        font-weight: 600;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
