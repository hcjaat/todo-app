// Array to store tasks as objects
// { text: string, completed: boolean, createdAt: timestamp, completedAt: timestamp|null }
let tasks = [];

const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');
const taskCountBadge = document.getElementById('taskCountBadge');
const saveStatus = document.getElementById('saveStatus');

// Local Storage helpers
function loadTasks() {
    const stored = localStorage.getItem('tasks');
    tasks = stored ? JSON.parse(stored) : [];
    renderTasks();
}
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Render tasks in the list
function renderTasks() {
    taskList.innerHTML = '';
    // Get search value (case-insensitive)
    const searchValue = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();

    // Filter logic
    const filter = window.currentFilter || 'all';
    // Sorting logic
    const sort = window.currentSort || 'priority';
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    let filteredTasks = tasks.filter(task => {
        if (filter === 'completed') return task.completed;
        if (filter === 'incomplete') return !task.completed;
        return true;
    });
    // Search filter
    filteredTasks = filteredTasks.filter(task => !searchValue || task.text.toLowerCase().includes(searchValue));
    // Sorting
    let sortedTasks = filteredTasks.slice();
    if (sort === 'priority') {
        sortedTasks.sort((a, b) => {
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            return new Date(a.createdAt) - new Date(b.createdAt);
        });
    } else if (sort === 'created') {
        sortedTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // newest first
    } else if (sort === 'alpha') {
        sortedTasks.sort((a, b) => a.text.localeCompare(b.text));
    }
    // Map from rendered (sorted/filtered) index to real index in tasks
    const indexMap = sortedTasks.map(st => tasks.findIndex(t => t === st));
    sortedTasks.forEach((task, renderIndex) => {
        const realIndex = indexMap[renderIndex];
        const li = document.createElement('li');
        li.className = 'task-item';
        if (task.completed) li.classList.add('completed-task');

        // Main row: checkbox, text/edit, edit, delete
        const mainRow = document.createElement('div');
        mainRow.className = 'task-main';

        // Checkbox for completed status (SVG check)
        const checkbox = document.createElement('label');
        checkbox.className = 'task-checkbox';
        checkbox.style.cursor = 'pointer';
        const realCheckbox = document.createElement('input');
        realCheckbox.type = 'checkbox';
        realCheckbox.checked = !!task.completed;
        realCheckbox.style.display = 'none';
        realCheckbox.addEventListener('change', function() {
            toggleTaskCompleted(realIndex, realCheckbox.checked);
        });
        // SVG check icon
        const checkSvg = document.createElement('span');
        checkSvg.className = 'icon';
        checkSvg.innerHTML = realCheckbox.checked
          ? `<svg viewBox="0 0 20 20" fill="#43a047" width="22" height="22"><circle cx="10" cy="10" r="10" fill="#e3eafc"/><path d="M6 10.5l3 3 5-5" stroke="#43a047" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`
          : `<svg viewBox="0 0 20 20" fill="#e3eafc" width="22" height="22"><circle cx="10" cy="10" r="10" fill="#e3eafc" stroke="#b0bec5" stroke-width="1.5"/></svg>`;
        realCheckbox.addEventListener('change', function() {
            checkSvg.innerHTML = realCheckbox.checked
              ? `<svg viewBox="0 0 20 20" fill="#43a047" width="22" height="22"><circle cx="10" cy="10" r="10" fill="#e3eafc"/><path d="M6 10.5l3 3 5-5" stroke="#43a047" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`
              : `<svg viewBox="0 0 20 20" fill="#e3eafc" width="22" height="22"><circle cx="10" cy="10" r="10" fill="#e3eafc" stroke="#b0bec5" stroke-width="1.5"/></svg>`;
        });
        checkbox.appendChild(realCheckbox);
        checkbox.appendChild(checkSvg);
        mainRow.appendChild(checkbox);

        // Priority badge (SVG icon)
        const badge = document.createElement('span');
        badge.className = 'priority-badge priority-' + (task.priority || 'medium');
        let priSvg = '';
        if ((task.priority || 'medium') === 'high') priSvg = '<svg class="icon" viewBox="0 0 20 20" width="18" height="18"><path d="M10 2L2 18h16L10 2z" fill="#e53935" stroke="#b71c1c" stroke-width="1.2"/></svg>';
        else if ((task.priority || 'medium') === 'medium') priSvg = '<svg class="icon" viewBox="0 0 20 20" width="18" height="18"><circle cx="10" cy="10" r="8" fill="#fb8c00" stroke="#ef6c00" stroke-width="1.2"/></svg>';
        else priSvg = '<svg class="icon" viewBox="0 0 20 20" width="18" height="18"><rect x="4" y="4" width="12" height="12" rx="3" fill="#43a047" stroke="#2e7d32" stroke-width="1.2"/></svg>';
        badge.innerHTML = priSvg + ' ' + (task.priority || 'medium').charAt(0).toUpperCase() + (task.priority || 'medium').slice(1);
        mainRow.appendChild(badge);

        // Task text or edit input
        if (task.isEditing) {
            // Text input
            const input = document.createElement('input');
            input.type = 'text';
            input.value = task.text;
            input.className = 'edit-input';
            input.autofocus = true;
            // Priority dropdown
            const prioritySelect = document.createElement('select');
            prioritySelect.className = 'priority-select';
            ['high','medium','low'].forEach(val => {
                const opt = document.createElement('option');
                opt.value = val;
                opt.textContent = val.charAt(0).toUpperCase() + val.slice(1);
                if (task.priority === val) opt.selected = true;
                prioritySelect.appendChild(opt);
            });
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') saveEditTask(realIndex, input.value, prioritySelect.value);
                if (e.key === 'Escape') cancelEditTask(realIndex);
            });
            prioritySelect.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') saveEditTask(realIndex, input.value, prioritySelect.value);
                if (e.key === 'Escape') cancelEditTask(realIndex);
            });
            // Save/cancel icons
            const saveBtn = document.createElement('button');
            saveBtn.className = 'save-btn';
            saveBtn.title = 'Save';
            saveBtn.innerHTML = '💾';
            saveBtn.onclick = () => saveEditTask(realIndex, input.value, prioritySelect.value);
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'cancel-btn';
            cancelBtn.title = 'Cancel';
            cancelBtn.innerHTML = '✖';
            cancelBtn.onclick = () => cancelEditTask(realIndex);

            const editBox = document.createElement('span');
            editBox.className = 'edit-box';
            editBox.appendChild(input);
            editBox.appendChild(prioritySelect);
            editBox.appendChild(saveBtn);
            editBox.appendChild(cancelBtn);
            mainRow.appendChild(editBox);
        } else {
            const span = document.createElement('span');
            span.className = 'task-text';
            span.textContent = task.text;
            if (task.completed) {
                span.classList.add('completed');
            }
            mainRow.appendChild(span);
            // Edit icon (SVG)
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.title = 'Edit';
            editBtn.innerHTML = '<span class="icon"><svg viewBox="0 0 20 20" width="20" height="20"><path d="M3 17l2.5-2.5L14.5 5.5a1.5 1.5 0 0 1 2.1 2.1L7.6 16.6 3 17z" fill="#fff" stroke="#1976d2" stroke-width="1.3"/><path d="M13.5 6.5l2 2" stroke="#1976d2" stroke-width="1.3"/></svg></span>';
            editBtn.onclick = () => editTask(realIndex);
            mainRow.appendChild(editBtn);
        }

        // Delete button (SVG)
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.title = 'Delete';
        deleteBtn.innerHTML = '<span class="icon"><svg viewBox="0 0 20 20" width="20" height="20"><rect x="5" y="7" width="10" height="9" rx="2" fill="#e3eafc" stroke="#e53935" stroke-width="1.3"/><path d="M8 9v5M12 9v5" stroke="#e53935" stroke-width="1.3"/><rect x="8" y="4" width="4" height="2" rx="1" fill="#e53935"/></svg></span>';
        deleteBtn.addEventListener('click', function() {
            li.classList.add('removing');
            setTimeout(() => deleteTask(realIndex), 280);
        });
        mainRow.appendChild(deleteBtn);

        li.appendChild(mainRow);

        // Timestamp info
        const timeInfo = document.createElement('div');
        timeInfo.className = 'task-time';
        timeInfo.innerHTML =
            `<span>Created: ${formatTime(task.createdAt)}</span>` +
            (task.completed && task.completedAt ? `<span> | Completed: ${formatTime(task.completedAt)}</span>` : '');
        li.appendChild(timeInfo);

        // Filter: only show if matches search
        if (!searchValue || task.text.toLowerCase().includes(searchValue)) {
            taskList.appendChild(li);
        }
    });
    // Show count of visible tasks
    const visibleCount = sortedTasks.length;
    if (taskCountBadge) {
        taskCountBadge.textContent = visibleCount;
    }
    // Highlight active filter button
    ['filterAllBtn','filterCompletedBtn','filterIncompleteBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.remove('active');
    });
    const activeBtn = document.getElementById(
        filter === 'completed' ? 'filterCompletedBtn' : filter === 'incomplete' ? 'filterIncompleteBtn' : 'filterAllBtn'
    );
    if (activeBtn) activeBtn.classList.add('active');
} 

// Add a new task
function addTask() {
    const text = taskInput.value.trim();
    const priority = document.getElementById('prioritySelect').value;
    if (text === '') {
        alert('Task cannot be empty.');
        return;
    }
    const isDuplicate = tasks.some(task => task.text.trim().toLowerCase() === text.toLowerCase());
    if (isDuplicate) {
        alert('Task already exists.');
        return;
    }
    const now = new Date().toISOString();
    tasks.push({
        text,
        priority,
        completed: false,
        createdAt: now,
        completedAt: null,
        isEditing: false
    });
    saveTasks();
    taskInput.value = '';
    renderTasks();
    showSaveStatus('Task saved!');
}


// Delete a single task
// Undo state
let lastDeletedTask = null;
let lastDeletedIndex = null;
let undoTimeout = null;

function deleteTask(index) {
    // Store deleted task and index for undo
    lastDeletedTask = { ...tasks[index] };
    lastDeletedIndex = index;
    tasks.splice(index, 1);
    saveTasks();
    renderTasks();
    showUndoToast();
}

function showUndoToast() {
    const undoToast = document.getElementById('undoToast');
    if (!undoToast) return;
    undoToast.innerHTML = 'Task deleted! <button id="undoBtn">Undo</button>';
    undoToast.style.display = 'flex';
    setTimeout(() => undoToast.classList.add('show'), 10);
    // Remove previous timeout if any
    if (undoTimeout) clearTimeout(undoTimeout);
    // Hide after 5s
    undoTimeout = setTimeout(hideUndoToast, 5000);
    // Undo button logic
    document.getElementById('undoBtn').onclick = function() {
        undoRestore();
        hideUndoToast();
    };
}

function hideUndoToast() {
    const undoToast = document.getElementById('undoToast');
    if (!undoToast) return;
    undoToast.classList.remove('show');
    setTimeout(() => { undoToast.style.display = 'none'; }, 400);
    lastDeletedTask = null;
    lastDeletedIndex = null;
}

function undoRestore() {
    if (lastDeletedTask !== null && lastDeletedIndex !== null) {
        tasks.splice(lastDeletedIndex, 0, lastDeletedTask);
        saveTasks();
        renderTasks();
        lastDeletedTask = null;
        lastDeletedIndex = null;
    }
}

// Toggle completed status
function toggleTaskCompleted(index, isChecked) {
    tasks[index].completed = isChecked;
    tasks[index].completedAt = isChecked ? new Date().toISOString() : null;
    saveTasks();
    renderTasks();
}

// Edit task
function editTask(index) {
    tasks[index].isEditing = true;
    renderTasks();
}
function saveEditTask(index, newText, newPriority) {
    tasks[index].text = newText.trim();
    if (newPriority) tasks[index].priority = newPriority;
    tasks[index].isEditing = false;
    saveTasks();
    renderTasks();
}
function cancelEditTask(index) {
    tasks[index].isEditing = false;
    renderTasks();
}

// Format time
function formatTime(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleString();
}

// THEME TOGGLE LOGIC
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = document.getElementById('themeIcon');
function setTheme(mode) {
    if (mode === 'light') {
        document.body.classList.add('light-theme');
        themeIcon.textContent = '☀️';
    } else {
        document.body.classList.remove('light-theme');
        themeIcon.textContent = '🌙';
    }
    localStorage.setItem('theme', mode);
}
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    setTheme(isLight ? 'light' : 'dark');
}
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
    // On load, restore theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') setTheme('light');
    else setTheme('dark');
}

// Add event listener for Add button
addTaskBtn.addEventListener('click', addTask);

// Add event listener for Enter key on input
if (taskInput) {
    taskInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            addTask();
        }
    });
}

// Add event listener for Delete All Tasks button
const deleteAllBtn = document.getElementById('deleteAllBtn');
if (deleteAllBtn) {
    deleteAllBtn.addEventListener('click', function() {
        if (tasks.length === 0) return;
        if (!confirm('Are you sure you want to delete all tasks?')) return;
        tasks = [];
        saveTasks();
        renderTasks();
        showSaveStatus('All tasks deleted!');
    });
}

// Show save status message
function showSaveStatus(msg) {
    if (!saveStatus) return;
    saveStatus.textContent = msg;
    saveStatus.classList.add('visible');
    setTimeout(() => {
        saveStatus.classList.remove('visible');
    }, 1100);
}

// Filter buttons
window.currentFilter = 'all';
['filterAllBtn','filterCompletedBtn','filterIncompleteBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
        btn.addEventListener('click', function() {
            if (id === 'filterCompletedBtn') window.currentFilter = 'completed';
            else if (id === 'filterIncompleteBtn') window.currentFilter = 'incomplete';
            else window.currentFilter = 'all';
            renderTasks();
        });
    }
});
// Sort dropdown
window.currentSort = 'priority';
const sortSelect = document.getElementById('sortSelect');
if (sortSelect) {
    sortSelect.addEventListener('change', function() {
        window.currentSort = sortSelect.value;
        renderTasks();
    });
}
// Live search: filter as user types
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', function() {
        renderTasks();
    });
}

// Load tasks and render on page load
window.addEventListener('DOMContentLoaded', function() {
    loadTasks();
});
