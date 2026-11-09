/**
 * TaskVault — Frontend Interaction Script
 * Cognifyz Full Stack Development Internship - Task 5
 * RESTful API Integration using Vanilla JS Fetch API
 */

// Application State
const state = {
    tasks: [],
    filterStatus: 'all',
    filterPriority: 'all',
    searchQuery: '',
    sortBy: 'newest',
    activeTaskIdForDelete: null,
    isOnline: true
};

// DOM Elements
const elements = {
    // Stat counters
    countTotal: document.getElementById('countTotal'),
    countPending: document.getElementById('countPending'),
    countInProgress: document.getElementById('countInProgress'),
    countCompleted: document.getElementById('countCompleted'),
    statCards: document.querySelectorAll('.stat-card'),

    // Toolbar
    searchInput: document.getElementById('searchInput'),
    btnClearSearch: document.getElementById('btnClearSearch'),
    statusFilter: document.getElementById('statusFilter'),
    priorityFilter: document.getElementById('priorityFilter'),
    sortBy: document.getElementById('sortBy'),
    activeFilterTags: document.getElementById('activeFilterTags'),
    btnResetFilters: document.getElementById('btnResetFilters'),
    visibleTaskCount: document.getElementById('visibleTaskCount'),
    totalTaskCount: document.getElementById('totalTaskCount'),

    // Task Grid & States
    skeletonGrid: document.getElementById('skeletonGrid'),
    taskGrid: document.getElementById('taskGrid'),
    emptyState: document.getElementById('emptyState'),
    emptyStateTitle: document.getElementById('emptyStateTitle'),
    emptyStateDesc: document.getElementById('emptyStateDesc'),
    btnEmptyAction: document.getElementById('btnEmptyAction'),

    // Header Actions
    btnRefresh: document.getElementById('btnRefresh'),
    btnOpenCreateModal: document.getElementById('btnOpenCreateModal'),
    apiStatusBadge: document.getElementById('apiStatusBadge'),
    apiStatusText: document.getElementById('apiStatusText'),

    // Create / Edit Modal
    taskModal: document.getElementById('taskModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalSubtitle: document.getElementById('modalSubtitle'),
    taskForm: document.getElementById('taskForm'),
    taskIdInput: document.getElementById('taskIdInput'),
    taskTitleInput: document.getElementById('taskTitleInput'),
    taskPriorityInput: document.getElementById('taskPriorityInput'),
    taskStatusInput: document.getElementById('taskStatusInput'),
    taskDescInput: document.getElementById('taskDescInput'),
    titleCharCounter: document.getElementById('titleCharCounter'),
    descCharCounter: document.getElementById('descCharCounter'),
    titleFieldError: document.getElementById('titleFieldError'),
    modalAlert: document.getElementById('modalAlert'),
    btnCloseModal: document.getElementById('btnCloseModal'),
    btnCancelModal: document.getElementById('btnCancelModal'),
    btnSubmitTask: document.getElementById('btnSubmitTask'),
    btnSubmitSpinner: document.getElementById('btnSubmitSpinner'),
    btnSubmitText: document.getElementById('btnSubmitText'),

    // View Details Modal
    detailsModal: document.getElementById('detailsModal'),
    detailsIdTag: document.getElementById('detailsIdTag'),
    detailsTitle: document.getElementById('detailsTitle'),
    detailsDesc: document.getElementById('detailsDesc'),
    detailsPriorityBadge: document.getElementById('detailsPriorityBadge'),
    detailsStatusBadge: document.getElementById('detailsStatusBadge'),
    detailsCreatedAt: document.getElementById('detailsCreatedAt'),
    detailsUpdatedAt: document.getElementById('detailsUpdatedAt'),
    detailsFullId: document.getElementById('detailsFullId'),
    btnCloseDetailsModal: document.getElementById('btnCloseDetailsModal'),
    btnCloseDetailsBtn: document.getElementById('btnCloseDetailsBtn'),
    btnEditFromDetails: document.getElementById('btnEditFromDetails'),

    // Delete Modal
    deleteModal: document.getElementById('deleteModal'),
    deleteTaskTitlePreview: document.getElementById('deleteTaskTitlePreview'),
    btnCancelDelete: document.getElementById('btnCancelDelete'),
    btnConfirmDelete: document.getElementById('btnConfirmDelete'),
    btnDeleteSpinner: document.getElementById('btnDeleteSpinner'),
    btnDeleteText: document.getElementById('btnDeleteText'),

    // Toast Container
    toastContainer: document.getElementById('toastContainer')
};

// ==========================================================================
// Toast Notification Engine
// ==========================================================================

function showToast(message, type = 'info', duration = 3800) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `
            <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>`;
    } else if (type === 'error') {
        iconSvg = `
            <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>`;
    } else {
        iconSvg = `
            <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>`;
    }

    toast.innerHTML = iconSvg;

    const msgSpan = document.createElement('span');
    msgSpan.className = 'toast-message';
    msgSpan.textContent = message;
    toast.appendChild(msgSpan);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Dismiss notification');
    closeBtn.onclick = () => removeToast(toast);
    toast.appendChild(closeBtn);

    elements.toastContainer.appendChild(toast);

    const timer = setTimeout(() => {
        removeToast(toast);
    }, duration);

    toast.dataset.timer = timer;
}

function removeToast(toast) {
    if (toast.dataset.timer) clearTimeout(toast.dataset.timer);
    toast.classList.add('toast-hiding');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 200);
}

// Update API Status Indicator in Header
function setApiStatus(isOnline, customLabel = null) {
    state.isOnline = isOnline;
    if (isOnline) {
        elements.apiStatusBadge.classList.remove('offline');
        elements.apiStatusText.textContent = customLabel || 'Connected';
    } else {
        elements.apiStatusBadge.classList.add('offline');
        elements.apiStatusText.textContent = customLabel || 'Offline';
    }
}

// ==========================================================================
// RESTful API Service (Using Fetch API)
// ==========================================================================

const api = {
    // 1. GET /api/tasks - Retrieve all tasks
    async fetchTasks() {
        try {
            const response = await fetch('/api/tasks');
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP error ${response.status}`);
            }
            const data = await response.json();
            setApiStatus(true, 'Connected');
            return data;
        } catch (error) {
            setApiStatus(false, 'Disconnected');
            console.error('Fetch tasks error:', error);
            throw error;
        }
    },

    // 2. GET /api/tasks/<id> - Retrieve single task by ID
    async fetchTaskById(id) {
        try {
            const response = await fetch(`/api/tasks/${encodeURIComponent(id)}`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Task not found (${response.status})`);
            }
            const data = await response.json();
            setApiStatus(true);
            return data;
        } catch (error) {
            console.error(`Fetch task ${id} error:`, error);
            throw error;
        }
    },

    // 3. POST /api/tasks - Create new task
    async createTask(payload) {
        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || `Failed to create task (${response.status})`);
            }
            setApiStatus(true);
            return data;
        } catch (error) {
            console.error('Create task error:', error);
            throw error;
        }
    },

    // 4. PUT /api/tasks/<id> - Update existing task
    async updateTask(id, payload) {
        try {
            const response = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || `Failed to update task (${response.status})`);
            }
            setApiStatus(true);
            return data;
        } catch (error) {
            console.error(`Update task ${id} error:`, error);
            throw error;
        }
    },

    // 5. DELETE /api/tasks/<id> - Delete task
    async deleteTask(id) {
        try {
            const response = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
                method: 'DELETE'
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || `Failed to delete task (${response.status})`);
            }
            setApiStatus(true);
            return data;
        } catch (error) {
            console.error(`Delete task ${id} error:`, error);
            throw error;
        }
    }
};

// ==========================================================================
// Formatting & Utilities
// ==========================================================================

function formatDateTime(isoString) {
    if (!isoString) return 'Just now';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return isoString;
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return isoString;
    }
}

function getPriorityBadgeElement(priority) {
    const span = document.createElement('span');
    const prio = (priority || 'Medium').toLowerCase();
    span.className = `badge badge-prio-${prio}`;
    span.textContent = priority || 'Medium';
    return span;
}

function getStatusBadgeElement(status) {
    const span = document.createElement('span');
    const norm = (status || 'Pending').toLowerCase().replace(/\s+/g, '');
    span.className = `badge badge-status-${norm}`;

    const dot = document.createElement('span');
    dot.className = 'badge-dot';
    span.appendChild(dot);

    const label = document.createTextNode(` ${status || 'Pending'}`);
    span.appendChild(label);
    return span;
}

// ==========================================================================
// Statistics & Filter Calculation
// ==========================================================================

function updateStatistics() {
    const total = state.tasks.length;
    const pending = state.tasks.filter(t => t.status === 'Pending').length;
    const inProgress = state.tasks.filter(t => t.status === 'In Progress').length;
    const completed = state.tasks.filter(t => t.status === 'Completed').length;

    elements.countTotal.textContent = total;
    elements.countPending.textContent = pending;
    elements.countInProgress.textContent = inProgress;
    elements.countCompleted.textContent = completed;
    elements.totalTaskCount.textContent = total;

    // Highlight active stat card if filtering by status
    elements.statCards.forEach(card => {
        const filterVal = card.dataset.filter;
        if (state.filterStatus === filterVal) {
            card.classList.add('active-filter');
        } else {
            card.classList.remove('active-filter');
        }
    });
}

function getFilteredTasks() {
    let result = [...state.tasks];

    // Status filter
    if (state.filterStatus && state.filterStatus !== 'all') {
        result = result.filter(t => t.status === state.filterStatus);
    }

    // Priority filter
    if (state.filterPriority && state.filterPriority !== 'all') {
        result = result.filter(t => t.priority === state.filterPriority);
    }

    // Search query filter (by title or description)
    if (state.searchQuery.trim()) {
        const query = state.searchQuery.toLowerCase().trim();
        result = result.filter(t =>
            (t.title && t.title.toLowerCase().includes(query)) ||
            (t.description && t.description.toLowerCase().includes(query))
        );
    }

    // Sort order
    if (state.sortBy === 'newest') {
        result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (state.sortBy === 'oldest') {
        result.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    } else if (state.sortBy === 'priority-desc') {
        const weight = { 'High': 3, 'Medium': 2, 'Low': 1 };
        result.sort((a, b) => (weight[b.priority] || 0) - (weight[a.priority] || 0));
    } else if (state.sortBy === 'title-asc') {
        result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    return result;
}

function renderFilterTags() {
    elements.activeFilterTags.innerHTML = '';
    let hasFilters = false;

    if (state.filterStatus !== 'all') {
        hasFilters = true;
        const tag = createFilterTag(`Status: ${state.filterStatus}`, () => {
            state.filterStatus = 'all';
            elements.statusFilter.value = 'all';
            applyFiltersAndRender();
        });
        elements.activeFilterTags.appendChild(tag);
    }

    if (state.filterPriority !== 'all') {
        hasFilters = true;
        const tag = createFilterTag(`Priority: ${state.filterPriority}`, () => {
            state.filterPriority = 'all';
            elements.priorityFilter.value = 'all';
            applyFiltersAndRender();
        });
        elements.activeFilterTags.appendChild(tag);
    }

    if (state.searchQuery.trim()) {
        hasFilters = true;
        const tag = createFilterTag(`"${state.searchQuery}"`, () => {
            state.searchQuery = '';
            elements.searchInput.value = '';
            elements.btnClearSearch.classList.add('hidden');
            applyFiltersAndRender();
        });
        elements.activeFilterTags.appendChild(tag);
    }

    if (hasFilters) {
        elements.btnResetFilters.classList.remove('hidden');
    } else {
        elements.btnResetFilters.classList.add('hidden');
    }
}

function createFilterTag(label, onRemove) {
    const tag = document.createElement('span');
    tag.className = 'filter-tag';
    tag.textContent = label;

    const removeBtn = document.createElement('span');
    removeBtn.className = 'filter-tag-remove';
    removeBtn.innerHTML = '&times;';
    removeBtn.setAttribute('title', 'Remove filter');
    removeBtn.onclick = onRemove;

    tag.appendChild(removeBtn);
    return tag;
}

// ==========================================================================
// Rendering Tasks (Using Safe DOM Methods)
// ==========================================================================

function renderTasks() {
    const filtered = getFilteredTasks();
    elements.visibleTaskCount.textContent = filtered.length;

    // Check empty states
    if (filtered.length === 0) {
        elements.taskGrid.classList.add('hidden');
        elements.emptyState.classList.remove('hidden');

        if (state.tasks.length === 0) {
            elements.emptyStateTitle.textContent = 'Vault is Empty';
            elements.emptyStateDesc.textContent = 'You do not have any tasks recorded yet. Create your first task to get started!';
            elements.btnEmptyAction.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Create First Task</span>`;
            elements.btnEmptyAction.onclick = () => openCreateModal();
        } else {
            elements.emptyStateTitle.textContent = 'No matching tasks';
            elements.emptyStateDesc.textContent = 'No tasks matched your search or filter combination. Try adjusting or resetting your filters.';
            elements.btnEmptyAction.innerHTML = `<span>Reset All Filters</span>`;
            elements.btnEmptyAction.onclick = () => resetAllFilters();
        }
        return;
    }

    elements.emptyState.classList.add('hidden');
    elements.taskGrid.classList.remove('hidden');
    elements.taskGrid.innerHTML = '';

    // Render task cards safely
    filtered.forEach(task => {
        const card = createTaskCardElement(task);
        elements.taskGrid.appendChild(card);
    });
}

function createTaskCardElement(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.setAttribute('data-status', task.status || 'Pending');
    card.setAttribute('data-id', task.id);

    // 1. Header: Badges & ID
    const cardHeader = document.createElement('div');
    cardHeader.className = 'task-card-header';

    const badgesGroup = document.createElement('div');
    badgesGroup.className = 'badges-group';
    badgesGroup.appendChild(getPriorityBadgeElement(task.priority));
    badgesGroup.appendChild(getStatusBadgeElement(task.status));
    cardHeader.appendChild(badgesGroup);

    const idBadge = document.createElement('span');
    idBadge.className = 'task-id-badge';
    idBadge.textContent = task.id;
    cardHeader.appendChild(idBadge);
    card.appendChild(cardHeader);

    // 2. Body: Title & Description
    const cardBody = document.createElement('div');
    cardBody.className = 'task-card-body';

    const titleEl = document.createElement('h3');
    titleEl.className = 'task-title';
    titleEl.textContent = task.title; // Safe DOM textContent
    titleEl.title = 'Click to view task details';
    titleEl.onclick = () => viewTaskDetails(task.id);
    cardBody.appendChild(titleEl);

    const descEl = document.createElement('p');
    descEl.className = 'task-description';
    if (task.description && task.description.trim()) {
        descEl.textContent = task.description; // Safe DOM textContent
    } else {
        descEl.textContent = 'No additional description provided.';
        descEl.classList.add('empty');
    }
    cardBody.appendChild(descEl);
    card.appendChild(cardBody);

    // 3. Footer: Date & Actions
    const cardFooter = document.createElement('div');
    cardFooter.className = 'task-card-footer';

    const dateInfo = document.createElement('div');
    dateInfo.className = 'task-date-info';
    dateInfo.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span>${formatDateTime(task.created_at)}</span>`;
    cardFooter.appendChild(dateInfo);

    const actionsGroup = document.createElement('div');
    actionsGroup.className = 'task-actions';

    // Quick Status Cycle Button
    const statusCycleBtn = document.createElement('button');
    statusCycleBtn.className = 'btn-card-action action-status-toggle';
    statusCycleBtn.type = 'button';

    let nextStatus = 'In Progress';
    let nextStatusLabel = 'Start';
    if (task.status === 'Pending') {
        nextStatus = 'In Progress';
        nextStatusLabel = 'Start';
    } else if (task.status === 'In Progress') {
        nextStatus = 'Completed';
        nextStatusLabel = 'Complete';
    } else if (task.status === 'Completed') {
        nextStatus = 'Pending';
        nextStatusLabel = 'Reopen';
    }

    statusCycleBtn.title = `Advance status to ${nextStatus}`;
    statusCycleBtn.innerHTML = `<span>${nextStatusLabel}</span>`;
    statusCycleBtn.onclick = (e) => {
        e.stopPropagation();
        quickStatusUpdate(task.id, nextStatus);
    };
    actionsGroup.appendChild(statusCycleBtn);

    // Edit Button
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-card-action';
    editBtn.type = 'button';
    editBtn.title = 'Edit task';
    editBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>`;
    editBtn.onclick = (e) => {
        e.stopPropagation();
        openEditModal(task);
    };
    actionsGroup.appendChild(editBtn);

    // Delete Button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-card-action action-delete';
    deleteBtn.type = 'button';
    deleteBtn.title = 'Delete task';
    deleteBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>`;
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        openDeleteModal(task);
    };
    actionsGroup.appendChild(deleteBtn);

    cardFooter.appendChild(actionsGroup);
    card.appendChild(cardFooter);

    return card;
}

// ==========================================================================
// Filter & Search Handlers
// ==========================================================================

function applyFiltersAndRender() {
    renderFilterTags();
    renderTasks();
}

function resetAllFilters() {
    state.filterStatus = 'all';
    state.filterPriority = 'all';
    state.searchQuery = '';
    state.sortBy = 'newest';

    elements.statusFilter.value = 'all';
    elements.priorityFilter.value = 'all';
    elements.sortBy.value = 'newest';
    elements.searchInput.value = '';
    elements.btnClearSearch.classList.add('hidden');

    updateStatistics();
    applyFiltersAndRender();
}

// ==========================================================================
// Operations: Load, Create, Update, Delete
// ==========================================================================

async function loadTasks(showRefreshFeedback = false) {
    try {
        if (showRefreshFeedback) {
            elements.btnRefresh.querySelector('.icon-refresh').classList.add('spinning');
        } else {
            elements.skeletonGrid.classList.remove('hidden');
            elements.taskGrid.classList.add('hidden');
            elements.emptyState.classList.add('hidden');
        }

        const tasks = await api.fetchTasks();
        state.tasks = tasks;

        updateStatistics();
        applyFiltersAndRender();

        if (showRefreshFeedback) {
            showToast('Tasks synchronized from TaskVault API', 'success');
        }
    } catch (error) {
        showToast(`Failed to load tasks: ${error.message}`, 'error');
    } finally {
        elements.skeletonGrid.classList.add('hidden');
        elements.btnRefresh.querySelector('.icon-refresh').classList.remove('spinning');
    }
}

// Quick status advance directly from task card
async function quickStatusUpdate(taskId, newStatus) {
    try {
        const updatedTask = await api.updateTask(taskId, { status: newStatus });
        // Update local state
        const index = state.tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
            state.tasks[index] = updatedTask;
        }
        updateStatistics();
        applyFiltersAndRender();
        showToast(`Status updated to "${newStatus}"`, 'success');
    } catch (error) {
        showToast(`Failed to update status: ${error.message}`, 'error');
    }
}

// ==========================================================================
// Create / Edit Modal Management
// ==========================================================================

function openCreateModal() {
    elements.taskIdInput.value = '';
    elements.modalTitle.textContent = 'Create New Task';
    elements.modalSubtitle.textContent = 'Fill in details to submit via POST /api/tasks.';
    elements.btnSubmitText.textContent = 'Create Task';

    elements.taskTitleInput.value = '';
    elements.taskPriorityInput.value = 'Medium';
    elements.taskStatusInput.value = 'Pending';
    elements.taskDescInput.value = '';

    elements.titleCharCounter.textContent = '0 / 150';
    elements.descCharCounter.textContent = '0 / 500';
    elements.titleFieldError.textContent = '';
    elements.modalAlert.classList.add('hidden');

    elements.taskModal.classList.remove('hidden');
    setTimeout(() => elements.taskTitleInput.focus(), 100);
}

function openEditModal(task) {
    elements.taskIdInput.value = task.id;
    elements.modalTitle.textContent = 'Edit Task';
    elements.modalSubtitle.textContent = `Modifying task ${task.id} via PUT /api/tasks/${task.id}.`;
    elements.btnSubmitText.textContent = 'Save Changes';

    elements.taskTitleInput.value = task.title || '';
    elements.taskPriorityInput.value = task.priority || 'Medium';
    elements.taskStatusInput.value = task.status || 'Pending';
    elements.taskDescInput.value = task.description || '';

    elements.titleCharCounter.textContent = `${(task.title || '').length} / 150`;
    elements.descCharCounter.textContent = `${(task.description || '').length} / 500`;
    elements.titleFieldError.textContent = '';
    elements.modalAlert.classList.add('hidden');

    elements.taskModal.classList.remove('hidden');
    setTimeout(() => elements.taskTitleInput.focus(), 100);
}

function closeTaskModal() {
    elements.taskModal.classList.add('hidden');
    elements.taskForm.reset();
    elements.modalAlert.classList.add('hidden');
    elements.titleFieldError.textContent = '';
    setModalLoading(false);
}

function setModalLoading(isLoading) {
    if (isLoading) {
        elements.btnSubmitSpinner.classList.remove('hidden');
        elements.btnSubmitTask.disabled = true;
    } else {
        elements.btnSubmitSpinner.classList.add('hidden');
        elements.btnSubmitTask.disabled = false;
    }
}

// Handle Form Submission (Create or Update)
async function handleTaskFormSubmit(e) {
    e.preventDefault();

    const title = elements.taskTitleInput.value.trim();
    const priority = elements.taskPriorityInput.value;
    const status = elements.taskStatusInput.value;
    const description = elements.taskDescInput.value.trim();
    const taskId = elements.taskIdInput.value;

    // Client-side validation
    if (!title) {
        elements.titleFieldError.textContent = 'Please enter a task title.';
        elements.taskTitleInput.focus();
        return;
    }
    elements.titleFieldError.textContent = '';
    elements.modalAlert.classList.add('hidden');

    const payload = {
        title: title,
        priority: priority,
        status: status,
        description: description
    };

    setModalLoading(true);

    try {
        if (taskId) {
            // Update: PUT /api/tasks/<id>
            const updated = await api.updateTask(taskId, payload);
            const index = state.tasks.findIndex(t => t.id === taskId);
            if (index !== -1) {
                state.tasks[index] = updated;
            }
            showToast(`Task "${updated.title}" updated successfully`, 'success');
        } else {
            // Create: POST /api/tasks
            const created = await api.createTask(payload);
            state.tasks.unshift(created);
            showToast(`Task "${created.title}" created successfully`, 'success');
        }

        closeTaskModal();
        updateStatistics();
        applyFiltersAndRender();
    } catch (error) {
        elements.modalAlert.textContent = error.message;
        elements.modalAlert.classList.remove('hidden');
    } finally {
        setModalLoading(false);
    }
}

// ==========================================================================
// View Details Modal (Uses GET /api/tasks/<id>)
// ==========================================================================

async function viewTaskDetails(taskId) {
    try {
        // Fetch fresh task data from API endpoint GET /api/tasks/<id>
        const task = await api.fetchTaskById(taskId);

        elements.detailsIdTag.textContent = task.id;
        elements.detailsFullId.textContent = task.id;
        elements.detailsTitle.textContent = task.title;

        elements.detailsPriorityBadge.innerHTML = '';
        elements.detailsPriorityBadge.appendChild(getPriorityBadgeElement(task.priority));

        elements.detailsStatusBadge.innerHTML = '';
        elements.detailsStatusBadge.appendChild(getStatusBadgeElement(task.status));

        elements.detailsDesc.textContent = task.description && task.description.trim()
            ? task.description
            : 'No description provided for this task.';

        elements.detailsCreatedAt.textContent = formatDateTime(task.created_at);
        elements.detailsUpdatedAt.textContent = formatDateTime(task.updated_at || task.created_at);

        // Edit button inside details modal
        elements.btnEditFromDetails.onclick = () => {
            closeDetailsModal();
            openEditModal(task);
        };

        elements.detailsModal.classList.remove('hidden');
    } catch (error) {
        showToast(`Could not load task details: ${error.message}`, 'error');
    }
}

function closeDetailsModal() {
    elements.detailsModal.classList.add('hidden');
}

// ==========================================================================
// Delete Modal Management (Uses DELETE /api/tasks/<id>)
// ==========================================================================

function openDeleteModal(task) {
    state.activeTaskIdForDelete = task.id;
    elements.deleteTaskTitlePreview.textContent = task.title;
    elements.deleteModal.classList.remove('hidden');
}

function closeDeleteModal() {
    elements.deleteModal.classList.add('hidden');
    state.activeTaskIdForDelete = null;
    elements.btnDeleteSpinner.classList.add('hidden');
    elements.btnConfirmDelete.disabled = false;
}

async function handleConfirmDelete() {
    const taskId = state.activeTaskIdForDelete;
    if (!taskId) return;

    elements.btnDeleteSpinner.classList.remove('hidden');
    elements.btnConfirmDelete.disabled = true;

    try {
        const result = await api.deleteTask(taskId);
        state.tasks = state.tasks.filter(t => t.id !== taskId);

        closeDeleteModal();
        updateStatistics();
        applyFiltersAndRender();
        showToast(result.message || 'Task deleted successfully', 'success');
    } catch (error) {
        showToast(`Delete failed: ${error.message}`, 'error');
        closeDeleteModal();
    }
}

// ==========================================================================
// Event Listeners & Initialization
// ==========================================================================

function initEventListeners() {
    // Top actions
    elements.btnRefresh.addEventListener('click', () => loadTasks(true));
    elements.btnOpenCreateModal.addEventListener('click', openCreateModal);

    // Search input
    elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        if (state.searchQuery.length > 0) {
            elements.btnClearSearch.classList.remove('hidden');
        } else {
            elements.btnClearSearch.classList.add('hidden');
        }
        applyFiltersAndRender();
    });

    elements.btnClearSearch.addEventListener('click', () => {
        state.searchQuery = '';
        elements.searchInput.value = '';
        elements.btnClearSearch.classList.add('hidden');
        elements.searchInput.focus();
        applyFiltersAndRender();
    });

    // Filters & Sort
    elements.statusFilter.addEventListener('change', (e) => {
        state.filterStatus = e.target.value;
        updateStatistics();
        applyFiltersAndRender();
    });

    elements.priorityFilter.addEventListener('change', (e) => {
        state.filterPriority = e.target.value;
        applyFiltersAndRender();
    });

    elements.sortBy.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        applyFiltersAndRender();
    });

    elements.btnResetFilters.addEventListener('click', resetAllFilters);

    // Stat cards interactive filter click
    elements.statCards.forEach(card => {
        card.addEventListener('click', () => {
            const filterVal = card.dataset.filter;
            state.filterStatus = filterVal;
            elements.statusFilter.value = filterVal;
            updateStatistics();
            applyFiltersAndRender();
        });
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });
    });

    // Form inputs character counters & validation
    elements.taskTitleInput.addEventListener('input', (e) => {
        elements.titleCharCounter.textContent = `${e.target.value.length} / 150`;
        if (elements.titleFieldError.textContent && e.target.value.trim()) {
            elements.titleFieldError.textContent = '';
        }
    });

    elements.taskDescInput.addEventListener('input', (e) => {
        elements.descCharCounter.textContent = `${e.target.value.length} / 500`;
    });

    // Create/Edit Modal events
    elements.taskForm.addEventListener('submit', handleTaskFormSubmit);
    elements.btnCloseModal.addEventListener('click', closeTaskModal);
    elements.btnCancelModal.addEventListener('click', closeTaskModal);

    // Details Modal events
    elements.btnCloseDetailsModal.addEventListener('click', closeDetailsModal);
    elements.btnCloseDetailsBtn.addEventListener('click', closeDetailsModal);

    // Delete Modal events
    elements.btnCancelDelete.addEventListener('click', closeDeleteModal);
    elements.btnConfirmDelete.addEventListener('click', handleConfirmDelete);

    // Close modals on clicking overlay backdrop
    [elements.taskModal, elements.detailsModal, elements.deleteModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeTaskModal();
                closeDetailsModal();
                closeDeleteModal();
            }
        });
    });

    // Keyboard ESC key handler
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeTaskModal();
            closeDetailsModal();
            closeDeleteModal();
        }
    });
}

// App Launch
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    loadTasks();
});
