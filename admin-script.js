// Admin Dashboard JavaScript
class AdminDashboard {
    constructor() {
        this.cars = [];
        this.currentEditingId = null;
        this.confirmAction = null;
        this.init();
    }

    init() {
        this.loadCars();
        this.setupEventListeners();
        this.updateDashboard();
        this.renderCarsTable();
        this.loadLeadsStats();
    }

    setupEventListeners() {
        // Sidebar navigation
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                this.showSection(section);
            });
        });

        // Car form submission
        document.getElementById('carForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCarSubmit();
        });

        // Search functionality
        document.getElementById('adminSearch').addEventListener('input', (e) => {
            this.filterCars(e.target.value);
        });

        // Category filter
        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.filterCars(document.getElementById('adminSearch').value, e.target.value);
        });

        // Modal close
        document.getElementById('confirmModal').addEventListener('click', (e) => {
            if (e.target.id === 'confirmModal') {
                this.closeConfirmModal();
            }
        });
    }

    // Section Navigation
    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
        });

        // Remove active class from menu items
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });

        // Show selected section
        document.getElementById(sectionId).classList.add('active');
        document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');

        // Load section-specific data
        switch(sectionId) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'cars':
                this.renderCarsTable();
                break;
            case 'add-car':
                // Only reset form if not editing
                if (!this.currentEditingId) {
                    this.resetForm();
                }
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
        }
    }

    // Car Management
    loadCars() {
        const savedCars = localStorage.getItem('exoticOneCars');
        if (savedCars) {
            this.cars = JSON.parse(savedCars);
        } else {
            // No local data; start empty and rely on Firebase listener
            this.cars = [];
        }
    }

    saveCars() {
        // Persist only to Firebase to avoid localStorage quota issues
        try {
            if (window.exoticFirebase && window.exoticFirebase.db) {
                window.exoticFirebase.db.ref('cars').set(this.cars);
            }
        } catch(e) {
            console.warn('Firebase save failed', e);
            this.showNotification('Save failed. Check connection.', 'error');
        }
    }

    generateId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    }

    async handleCarSubmit() {
        this.showLoading('Uploading media and saving car...');
        const formData = new FormData(document.getElementById('carForm'));
        const draft = {
            id: String(this.currentEditingId || this.generateId()),
            name: formData.get('name'),
            year: parseInt(formData.get('year')),
            category: formData.get('category'),
            image: this.getImagePreview(),
            video: this.getVideoPreview(),
            specs: {
                engine: formData.get('engine'),
                horsepower: formData.get('horsepower'),
                acceleration: formData.get('acceleration'),
                topSpeed: formData.get('topSpeed'),
                batteryCapacity: formData.get('batteryCapacity') || '',
                mileage: formData.get('mileage') || ''
            },
            description: formData.get('description') || '',
            features: formData.get('features') ? formData.get('features').split(',').map(f => f.trim()).filter(f => f) : []
        };

        // Validation
        if (!this.validateCarData(draft)) {
            return;
        }

        // Upload media to Firebase Storage (if any). Preserve existing URLs when editing.
        const existing = this.currentEditingId
            ? this.cars.find(c => String(c.id) === String(this.currentEditingId))
            : null;
        let uploadedImageUrl = (existing && existing.image) || draft.image || '';
        let uploadedVideoUrl = (existing && existing.video) || draft.video || '';
        try {
            if (window.exoticFirebase && window.exoticFirebase.storage) {
                // Ensure auth is ready (anonymous sign-in)
                if (window.exoticFirebase.auth && !window.exoticFirebase.auth.currentUser) {
                    await window.exoticFirebase.auth.signInAnonymously().catch(() => {});
                }
                const storage = window.exoticFirebase.storage;
                const imageInput = document.getElementById('carImage');
                if (imageInput && imageInput.files && imageInput.files[0]) {
                    const file = imageInput.files[0];
                    const path = `cars/${draft.id}/image_${Date.now()}_${file.name}`;
                    const ref = storage.ref(path);
                    await ref.put(file);
                    uploadedImageUrl = await ref.getDownloadURL();
                }
                const videoInput = document.getElementById('carVideo');
                if (videoInput && videoInput.files && videoInput.files[0]) {
                    const file = videoInput.files[0];
                    const path = `cars/${draft.id}/video_${Date.now()}_${file.name}`;
                    const ref = storage.ref(path);
                    await ref.put(file);
                    uploadedVideoUrl = await ref.getDownloadURL();
                }
            }
        } catch (e) {
            this.hideLoading();
            this.showNotification('Media upload failed. Please try again.', 'error');
            console.error('Upload error', e);
            return;
        }

        const carData = { ...draft, image: uploadedImageUrl, video: uploadedVideoUrl };

        if (this.currentEditingId) {
            // Update existing car
            const index = this.cars.findIndex(car => String(car.id) === String(this.currentEditingId));
            if (index !== -1) {
                this.cars[index] = carData;
                this.showNotification('Car updated successfully!', 'success');
            }
        } else {
            // Add new car
            this.cars.push(carData);
            this.showNotification('Car added successfully!', 'success');
        }

        await this.saveCars();
        this.resetForm();
        this.showSection('cars');
        this.renderCarsTable();
        this.updateDashboard();
        this.hideLoading();

        // Redirect to public page with deep-link to the saved/edited car
        try {
            const idParam = encodeURIComponent(carData.id);
            window.open(`index.html?carId=${idParam}`, '_blank');
        } catch (e) {}
    }

    validateCarData(carData) {
        // Validate root fields
        if (!carData.name || carData.name.toString().trim() === '') {
            this.showNotification('Please fill in the name field', 'error');
            return false;
        }
        if (!carData.year || carData.year < 2000 || carData.year > 2030) {
            this.showNotification('Please enter a valid year between 2000-2030', 'error');
            return false;
        }
        if (!carData.category || carData.category.toString().trim() === '') {
            this.showNotification('Please fill in the category field', 'error');
            return false;
        }

        // Validate specs fields
        const specs = carData.specs || {};
        if (!specs.engine || specs.engine.toString().trim() === '') {
            this.showNotification('Please fill in the engine field', 'error');
            return false;
        }
        if (!specs.horsepower || specs.horsepower.toString().trim() === '') {
            this.showNotification('Please fill in the horsepower field', 'error');
            return false;
        }
        if (!specs.acceleration || specs.acceleration.toString().trim() === '') {
            this.showNotification('Please fill in the acceleration field', 'error');
            return false;
        }
        if (!specs.topSpeed || specs.topSpeed.toString().trim() === '') {
            this.showNotification('Please fill in the top speed field', 'error');
            return false;
        }

        return true;
    }

    editCar(carId) {
        const car = this.cars.find(c => String(c.id) === String(carId));
        if (!car) {
            console.error('Car not found with ID:', carId);
            this.showNotification('Car not found!', 'error');
            return;
        }

        this.currentEditingId = carId;
        
        // Show the section and populate the form
        this.showSection('add-car');
        document.getElementById('formTitle').textContent = 'Edit Car';
        this.populateForm(car);
    }

    populateForm(car) {
        const nameField = document.getElementById('carName');
        const yearField = document.getElementById('carYear');
        const categoryField = document.getElementById('carCategory');
        const engineField = document.getElementById('engineType');
        const horsepowerField = document.getElementById('horsepower');
        const accelerationField = document.getElementById('acceleration');
        const topSpeedField = document.getElementById('topSpeed');
        const batteryField = document.getElementById('batteryCapacity');
        const mileageField = document.getElementById('mileage');
        const descriptionField = document.getElementById('carDescription');
        const featuresField = document.getElementById('carFeatures');

        if (nameField) nameField.value = car.name || '';
        if (yearField) yearField.value = car.year || '';
        if (categoryField) categoryField.value = car.category || '';
        if (engineField) engineField.value = car.specs?.engine || '';
        if (horsepowerField) horsepowerField.value = car.specs?.horsepower || '';
        if (accelerationField) accelerationField.value = car.specs?.acceleration || '';
        if (topSpeedField) topSpeedField.value = car.specs?.topSpeed || '';
        if (batteryField) batteryField.value = car.specs?.batteryCapacity || '';
        if (mileageField) mileageField.value = car.specs?.mileage || '';
        if (descriptionField) descriptionField.value = car.description || '';
        if (featuresField) featuresField.value = car.features ? car.features.join(', ') : '';

        // Update image preview
        if (car.image) {
            this.updateImagePreview(car.image);
        }

        // Update video preview
        if (car.video) {
            this.updateVideoPreview(car.video);
        }
    }

    deleteCar(carId) {
        this.confirmAction = () => {
            const index = this.cars.findIndex(car => String(car.id) === String(carId));
            if (index !== -1) {
                this.cars.splice(index, 1);
                this.saveCars();
                this.renderCarsTable();
                this.updateDashboard();
                this.showNotification('Car deleted successfully!', 'success');
            }
            this.closeConfirmModal();
        };

        this.showConfirmModal(
            'Delete Car',
            'Are you sure you want to delete this car? This action cannot be undone.',
            'Delete'
        );
    }

    resetForm() {
        document.getElementById('carForm').reset();
        this.currentEditingId = null;
        document.getElementById('formTitle').textContent = 'Add New Car';
        this.clearImagePreview();
        this.clearVideoPreview();
    }

    // Image and Video Handling
    previewImage(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.updateImagePreview(e.target.result);
                // Persist preview in a hidden field for submit
                document.getElementById('carImage').dataset.dataUrl = e.target.result;
            };
            reader.readAsDataURL(input.files[0]);
        }
    }

    previewVideo(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.updateVideoPreview(e.target.result);
                document.getElementById('carVideo').dataset.dataUrl = e.target.result;
            };
            reader.readAsDataURL(input.files[0]);
        }
    }

    updateImagePreview(src) {
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = `<img src="${src}" alt="Car preview" style="max-width: 100%; max-height: 100%; object-fit: cover;">`;
    }

    updateVideoPreview(src) {
        const preview = document.getElementById('videoPreview');
        preview.innerHTML = `<video src="${src}" controls style="max-width: 100%; max-height: 100%; object-fit: cover;"></video>`;
    }

    clearImagePreview() {
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = '<i class="fas fa-image"></i><span>No image selected</span>';
    }

    clearVideoPreview() {
        const preview = document.getElementById('videoPreview');
        preview.innerHTML = '<i class="fas fa-video"></i><span>No video selected</span>';
    }

    getImagePreview() {
        const input = document.getElementById('carImage');
        if (input.dataset.dataUrl) return input.dataset.dataUrl;
        return '';
    }

    getVideoPreview() {
        const input = document.getElementById('carVideo');
        if (input.dataset.dataUrl) return input.dataset.dataUrl;
        return '';
    }

    // Table Rendering
    renderCarsTable() {
        const tbody = document.getElementById('carsTableBody');
        tbody.innerHTML = '';

        if (this.cars.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <i class="fas fa-car"></i>
                        <h3>No cars found</h3>
                        <p>Add your first car to get started</p>
                    </td>
                </tr>
            `;
            return;
        }

        this.cars.forEach(car => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    ${car.image ? 
                        `<img src="${car.image}" alt="${car.name}" class="car-image-small">` : 
                        '<div class="car-image-small" style="background: var(--tertiary-black); display: flex; align-items: center; justify-content: center;"><i class="fas fa-image"></i></div>'
                    }
                </td>
                <td>
                    <div class="car-name-cell">${car.name}</div>
                    <div style="color: var(--light-gray); font-size: 12px;">${car.year}</div>
                </td>
                <td>
                    <span class="car-category-badge">${car.category}</span>
                </td>
                <td class="car-specs-cell">
                    <div>${car.specs.horsepower}</div>
                    <div>${car.specs.acceleration}</div>
                    <div>${car.specs.topSpeed}</div>
                    <div>${car.specs.batteryCapacity || ''}</div>
                    <div>${car.specs.mileage || ''}</div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="admin.editCar('${car.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="admin.deleteCar('${car.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    filterCars(searchTerm = '', category = 'all') {
        let filteredCars = this.cars;

        if (searchTerm) {
            filteredCars = filteredCars.filter(car => 
                car.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                car.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                car.specs.engine.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (category !== 'all') {
            filteredCars = filteredCars.filter(car => car.category === category);
        }

        // Update table with filtered results
        const tbody = document.getElementById('carsTableBody');
        tbody.innerHTML = '';

        if (filteredCars.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <i class="fas fa-search"></i>
                        <h3>No cars found</h3>
                        <p>Try adjusting your search criteria</p>
                    </td>
                </tr>
            `;
            return;
        }

        filteredCars.forEach(car => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    ${car.image ? 
                        `<img src="${car.image}" alt="${car.name}" class="car-image-small">` : 
                        '<div class="car-image-small" style="background: var(--tertiary-black); display: flex; align-items: center; justify-content: center;"><i class="fas fa-image"></i></div>'
                    }
                </td>
                <td>
                    <div class="car-name-cell">${car.name}</div>
                    <div style="color: var(--light-gray); font-size: 12px;">${car.year}</div>
                </td>
                <td>
                    <span class="car-category-badge">${car.category}</span>
                </td>
                <td class="car-specs-cell">
                    <div>${car.specs.horsepower}</div>
                    <div>${car.specs.acceleration}</div>
                    <div>${car.specs.topSpeed}</div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="admin.editCar('${car.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="admin.deleteCar('${car.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Dashboard Updates
    updateDashboard() {
        document.getElementById('totalCars').textContent = this.cars.length;
        
        // Load analytics data
        this.loadActivity();
        // Sync from Firebase latest (optional pull)
        try {
            if (window.exoticFirebase && window.exoticFirebase.db) {
                window.exoticFirebase.db.ref('cars').once('value', snap => {
                    const remote = snap.val();
                    if (Array.isArray(remote)) {
                        this.cars = remote;
                        this.renderCarsTable();
                    }
                });
                // Realtime listener
                window.exoticFirebase.db.ref('cars').on('value', snap => {
                    const remote = snap.val();
                    if (Array.isArray(remote)) {
                        this.cars = remote;
                        this.renderCarsTable();
                        document.getElementById('totalCars').textContent = this.cars.length;
                    }
                });
            }
        } catch(e) {
            console.warn('Firebase read failed; using local data', e);
        }
    }

    loadActivity() {
        const activityList = document.getElementById('activityList');
        activityList.innerHTML = '';
    }

    loadAnalytics() {
        // Simple analytics - in a real app, this would connect to analytics APIs
        const categoryData = this.cars.reduce((acc, car) => {
            acc[car.category] = (acc[car.category] || 0) + 1;
            return acc;
        }, {});

        // Create simple charts (in a real app, use Chart.js or similar)
        console.log('Analytics data:', categoryData);
    }

    // Modal Functions
    showConfirmModal(title, message, buttonText = 'Confirm') {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmButton').textContent = buttonText;
        document.getElementById('confirmModal').style.display = 'block';
    }

    closeConfirmModal() {
        document.getElementById('confirmModal').style.display = 'none';
        this.confirmAction = null;
    }

    executeConfirmAction() {
        if (this.confirmAction) {
            this.confirmAction();
        }
    }

    // Utility Functions
    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    showLoading(text = 'Processing...') {
        const overlay = document.getElementById('loadingOverlay');
        const label = document.getElementById('loadingText');
        if (label) label.textContent = text;
        if (overlay) overlay.style.display = 'flex';
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // Data Management
    exportData() {
        const dataStr = JSON.stringify(this.cars, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'exotic-one-cars.json';
        link.click();
        URL.revokeObjectURL(url);
        this.showNotification('Data exported successfully!', 'success');
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const importedCars = JSON.parse(e.target.result);
                        if (Array.isArray(importedCars)) {
                            this.cars = importedCars;
                            this.saveCars();
                            this.renderCarsTable();
                            this.updateDashboard();
                            this.showNotification('Data imported successfully!', 'success');
                        } else {
                            this.showNotification('Invalid file format!', 'error');
                        }
                    } catch (error) {
                        this.showNotification('Error reading file!', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    clearAllData() {
        this.confirmAction = () => {
            this.cars = [];
            this.saveCars();
            this.renderCarsTable();
            this.updateDashboard();
            this.showNotification('All data cleared!', 'warning');
            this.closeConfirmModal();
        };

        this.showConfirmModal(
            'Clear All Data',
            'Are you sure you want to clear all car data? This action cannot be undone.',
            'Clear All'
        );
    }

    createBackup() {
        const backup = {
            cars: this.cars,
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
        
        const dataStr = JSON.stringify(backup, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `exotic-one-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        this.showNotification('Backup created successfully!', 'success');
    }

    restoreBackup() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const backup = JSON.parse(e.target.result);
                        if (backup.cars && Array.isArray(backup.cars)) {
                            this.cars = backup.cars;
                            this.saveCars();
                            this.renderCarsTable();
                            this.updateDashboard();
                            this.showNotification('Backup restored successfully!', 'success');
                        } else {
                            this.showNotification('Invalid backup file!', 'error');
                        }
                    } catch (error) {
                        this.showNotification('Error reading backup file!', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }
    // Leads Management Methods
    loadLeadsStats() {
        try {
            if (window.exoticFirebase && window.exoticFirebase.db) {
                // Load from Firebase
                window.exoticFirebase.db.ref('leads').on('value', snap => {
                    const leads = snap.val() || [];
                    this.updateLeadsStats(leads);
                    this.updateRecentLeads(leads);
                });
            } else {
                // Load from localStorage
                const stored = localStorage.getItem('exoticLeads');
                const leads = stored ? JSON.parse(stored) : [];
                this.updateLeadsStats(leads);
                this.updateRecentLeads(leads);
            }
        } catch (error) {
            console.error('Error loading leads stats:', error);
        }
    }

    updateLeadsStats(leads) {
        const today = new Date().toDateString();
        const newToday = leads.filter(lead => 
            new Date(lead.date).toDateString() === today
        ).length;
        
        const contacted = leads.filter(lead => 
            lead.status === 'contacted' || lead.status === 'qualified' || lead.status === 'converted'
        ).length;
        
        const converted = leads.filter(lead => 
            lead.status === 'converted'
        ).length;
        
        // Update stats in dashboard
        const totalLeadsEl = document.getElementById('adminTotalLeads');
        const newLeadsEl = document.getElementById('adminNewLeads');
        const contactedLeadsEl = document.getElementById('adminContactedLeads');
        const convertedLeadsEl = document.getElementById('adminConvertedLeads');
        
        if (totalLeadsEl) totalLeadsEl.textContent = leads.length;
        if (newLeadsEl) newLeadsEl.textContent = newToday;
        if (contactedLeadsEl) contactedLeadsEl.textContent = contacted;
        if (convertedLeadsEl) convertedLeadsEl.textContent = converted;
    }

    updateRecentLeads(leads) {
        const recentLeadsList = document.getElementById('recentLeadsList');
        if (!recentLeadsList) return;
        
        // Get 5 most recent leads
        const recentLeads = leads
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
        
        if (recentLeads.length === 0) {
            recentLeadsList.innerHTML = '<p style="color: var(--light-gray); text-align: center; padding: 20px;">No leads yet</p>';
            return;
        }
        
        recentLeadsList.innerHTML = recentLeads.map(lead => `
            <div class="lead-item">
                <div class="lead-info">
                    <h4>${lead.name}</h4>
                    <p>${lead.email}</p>
                    <span class="lead-source">${lead.source || 'Unknown'}</span>
                </div>
                <div class="lead-meta">
                    <span class="lead-status ${lead.status || 'new'}">${lead.status || 'new'}</span>
                    <span class="lead-date">${this.formatDate(lead.date)}</span>
                </div>
            </div>
        `).join('');
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Global Functions
function goToMainSite() {
    window.open('index.html', '_blank');
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = 'index.html';
    }
}

function showSection(sectionId) {
    admin.showSection(sectionId);
}

function resetForm() {
    admin.resetForm();
}

function previewImage(input) {
    admin.previewImage(input);
}

function previewVideo(input) {
    admin.previewVideo(input);
}

function closeConfirmModal() {
    if (admin) admin.closeConfirmModal();
}

function executeConfirmAction() {
    if (admin) admin.executeConfirmAction();
}

// Initialize Admin Dashboard
function refreshLeadsStats() {
    if (admin) admin.loadLeadsStats();
}

let admin;
document.addEventListener('DOMContentLoaded', function() {
    admin = new AdminDashboard();
});
