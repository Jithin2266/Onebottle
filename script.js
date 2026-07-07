document.addEventListener('DOMContentLoaded', () => {
    // Register Service Worker for PWA / APK support
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('ServiceWorker registered with scope:', registration.scope))
            .catch(error => console.log('ServiceWorker registration failed:', error));
    }

    const taskForm = document.getElementById('task-form');
    const taskList = document.getElementById('task-list');

    // Priority mapping for sorting
    const priorityMap = {
        'Urgent': 4,
        'High': 3,
        'Medium': 2,
        'Low': 1
    };

    // Initialize tasks from local storage
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    
    // Google Calendar State
    let gcalAccessToken = null;
    window.pendingSyncTaskId = null;

    // Render tasks on load
    renderTasks();

    // Quick Select: Today logic
    const todayCheckbox = document.getElementById('today-task');
    const startDateInput = document.getElementById('start-date');
    const completionDateInput = document.getElementById('completion-date');
    
    // Prevent selecting past dates
    if (startDateInput && completionDateInput) {
        const todayStr = new Date().toISOString().split('T')[0];
        startDateInput.min = todayStr;
        completionDateInput.min = todayStr;
    }
    
    if (todayCheckbox) {
        todayCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                const today = new Date().toISOString().split('T')[0];
                startDateInput.value = today;
                completionDateInput.value = today;
            } else {
                startDateInput.value = '';
                completionDateInput.value = '';
            }
        });
    }

    // Handle form submission
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const taskName = document.getElementById('task-name').value;
        const startDate = document.getElementById('start-date').value;
        const completionDate = document.getElementById('completion-date').value;
        const priority = document.getElementById('priority').value;
        const category = document.getElementById('category').value;
        const reminder = document.getElementById('reminder').checked;

        const newTask = {
            id: Date.now().toString(),
            name: taskName,
            startDate,
            completionDate,
            priority,
            category,
            reminder,
            completed: false,
            createdAt: new Date().toISOString()
        };

        tasks.push(newTask);
        saveTasks();
        renderTasks();
        taskForm.reset();
        
        // Reset priority back to Medium
        document.getElementById('priority').value = 'Medium';
    });

    // Delete or Complete Task functionality
    taskList.addEventListener('click', (e) => {
        const item = e.target.closest('.task-item');
        if (!item) return;
        
        const id = item.dataset.id;

        if (e.target.closest('.delete-btn')) {
            // Add a small fade out animation class
            item.style.opacity = '0';
            item.style.transform = 'translateX(20px)';
            
            setTimeout(() => {
                tasks = tasks.filter(t => t.id !== id);
                saveTasks();
                renderTasks();
            }, 300); // Wait for transition
        } else if (e.target.closest('.complete-btn')) {
            const task = tasks.find(t => t.id === id);
            if (task) {
                task.completed = !task.completed;
                saveTasks();
                renderTasks();
            }
        } else if (e.target.closest('.tomorrow-btn')) {
            const task = tasks.find(t => t.id === id);
            if (task) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const tomorrowStr = tomorrow.toISOString().split('T')[0];
                task.startDate = tomorrowStr;
                task.completionDate = tomorrowStr;
                saveTasks();
                renderTasks();
            }
        }
    });

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function renderTasks() {
        taskList.innerHTML = '';

        const todayStr = new Date().toISOString().split('T')[0];

        // Only show tasks meant for today or earlier
        const currentTasks = tasks.filter(task => task.startDate <= todayStr);

        if (currentTasks.length === 0) {
            taskList.innerHTML = `
                <div class="empty-state">
                    <p>No tasks for today. Create one to get started!</p>
                </div>
            `;
            return;
        }

        // Sort by completed status first, then by priority (descending)
        const sortedTasks = [...currentTasks].sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            return priorityMap[b.priority] - priorityMap[a.priority];
        });

        sortedTasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
            taskElement.dataset.id = task.id;
            taskElement.dataset.priority = task.priority;
            
            // Set styles for smooth deletion
            taskElement.style.transition = 'all 0.3s ease';

            const reminderIcon = task.reminder ? '🔔' : '';
            
            const isOverdue = !task.completed && task.completionDate < todayStr;
            const isDueToday = !task.completed && task.completionDate === todayStr;
            
            let statusBadge = '';
            if (isOverdue) {
                statusBadge = `<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border-color: rgba(239, 68, 68, 0.5);">⚠️ Overdue</span>`;
            } else if (isDueToday) {
                statusBadge = `<span class="badge" style="background: rgba(234, 179, 8, 0.2); color: #eab308; border-color: rgba(234, 179, 8, 0.5);">⏳ Due Today</span>`;
            }

            taskElement.innerHTML = `
                <div class="task-header">
                    <div class="task-title">${task.name} ${reminderIcon}</div>
                    <div class="badges">
                        <span class="badge priority-${task.priority}">${task.priority}</span>
                        <span class="badge category">${task.category}</span>
                        ${statusBadge}
                    </div>
                </div>
                <div class="task-details">
                    <span>📅 Start: ${formatDate(task.startDate)}</span>
                    <span>🏁 Due: ${formatDate(task.completionDate)}</span>
                </div>
                
                <div class="task-actions">
                    ${!task.completed ? `
                    <button onclick="syncTaskToGCal('${task.id}')" class="btn-icon gcal-btn" title="${task.gcalEventId ? 'Already synced to Google Calendar' : 'Sync to Google Calendar'}" style="font-size: 1.1rem; margin-right: 0.5rem; display: flex; align-items: center; opacity: ${task.gcalEventId ? '0.5' : '1'}; cursor: ${task.gcalEventId ? 'default' : 'pointer'};">
                        ${task.gcalEventId ? '✅' : '📅'}
                    </button>
                    <button class="tomorrow-btn">Move to Tomorrow</button>
                    ` : ''}
                    <button class="btn-icon complete-btn check" title="${task.completed ? 'Mark as incomplete' : 'Mark as complete'}">
                        ${task.completed ? '✅' : '✓'}
                    </button>
                    <button class="btn-icon delete-btn" title="Delete Task">
                        🗑️
                    </button>
                </div>
            `;
            taskList.appendChild(taskElement);
        });
        
        updateStatistics();
    }

    function updateStatistics() {
        const todayStr = new Date().toISOString().split('T')[0];
        
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        const pending = tasks.filter(t => !t.completed).length;
        const overdue = tasks.filter(t => !t.completed && t.completionDate < todayStr).length;
        const dueToday = tasks.filter(t => !t.completed && t.completionDate === todayStr).length;

        const statTotal = document.getElementById('stat-total');
        if (statTotal) {
            statTotal.innerText = total;
            document.getElementById('stat-completed').innerText = completed;
            document.getElementById('stat-pending').innerText = pending;
            document.getElementById('stat-due-today').innerText = dueToday;
            document.getElementById('stat-overdue').innerText = overdue;
        }
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        // We use split to avoid timezone shifting issues
        const [year, month, day] = dateString.split('-');
        return new Date(year, month - 1, day).toLocaleDateString(undefined, options);
    }

    // Reminders and Notifications
    function checkReminders() {
        if (Notification.permission !== "granted") return;
        const todayStr = new Date().toISOString().split('T')[0];
        let reminderTasks = [];
        
        tasks.forEach(task => {
            if (!task.completed && task.reminder && task.completionDate <= todayStr) {
                reminderTasks.push(task.name);
            }
        });

        if (reminderTasks.length > 0) {
            const displayTasks = reminderTasks.slice(0, 3);
            const extra = reminderTasks.length > 3 ? `\n...and ${reminderTasks.length - 3} more` : '';
            
            new Notification("Daily Clock Reminder", {
                body: `You have ${reminderTasks.length} pending task(s) due!\n- ${displayTasks.join('\n- ')}${extra}`,
                icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Check_green_icon.svg/512px-Check_green_icon.svg.png"
            });
        }
    }

    // Request Notification permission and schedule checks
    if ("Notification" in window) {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                // Check once shortly after load
                setTimeout(checkReminders, 2000);
                // Then check every hour
                setInterval(checkReminders, 60 * 60 * 1000);
            }
        });
    }

    // In-App Toast Reminders for Delayed/Overdue Tasks
    function checkInAppReminders() {
        const todayStr = new Date().toISOString().split('T')[0];
        const overdueTasks = tasks.filter(task => !task.completed && task.completionDate < todayStr);
        
        if (overdueTasks.length > 0) {
            showToast(`⚠️ You have ${overdueTasks.length} delayed task(s) that need your attention!`);
        }
    }

    function showToast(message) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<span>${message}</span>`;
        
        // Click to dismiss
        toast.addEventListener('click', () => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        });
        
        container.appendChild(toast);
        
        // Auto dismiss after 7 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.add('fade-out');
                setTimeout(() => toast.remove(), 300);
            }
        }, 7000);
    }
    
    // Check for in-app reminders shortly after load
    setTimeout(checkInAppReminders, 1500);

    // Google Calendar API Setup
    window.initGoogleAuth = function() {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: '522920449959-4k6a784pu618csfpt58p6rae7b0onm7c.apps.googleusercontent.com',
            scope: 'https://www.googleapis.com/auth/calendar.events',
            callback: (response) => {
                if (response.error) {
                    console.error("GCal OAuth Error:", response);
                    showToast("❌ Google Calendar login failed.");
                    return;
                }
                gcalAccessToken = response.access_token;
                
                if (window.pendingSyncTaskId) {
                    executeGCalSync(window.pendingSyncTaskId);
                    window.pendingSyncTaskId = null;
                } else {
                    showToast("✅ Successfully connected to Google Calendar!");
                }
            }
        });
    };

    window.syncTaskToGCal = function(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (!task || task.gcalEventId) return; // Do nothing if already synced

        if (!gcalAccessToken) {
            window.pendingSyncTaskId = taskId;
            tokenClient.requestAccessToken();
            return;
        }
        executeGCalSync(taskId);
    };

    function executeGCalSync(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        // GCal requires exclusive end dates for all-day events
        const endObj = new Date(task.completionDate);
        endObj.setDate(endObj.getDate() + 1);
        const endStr = endObj.toISOString().split('T')[0];

        const event = {
            'summary': task.name,
            'description': `Priority: ${task.priority}\nCategory: ${task.category}`,
            'start': { 'date': task.startDate },
            'end': { 'date': endStr },
            'reminders': {
                'useDefault': false,
                'overrides': [
                    {'method': 'email', 'minutes': 24 * 60}, // Email 1 day before
                    {'method': 'popup', 'minutes': 60},      // Popup alert 1 hour before
                ],
            }
        };

        showToast("⏳ Syncing to Google Calendar...");

        fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${gcalAccessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                showToast(`❌ Sync Error: ${data.error.message}`);
            } else {
                showToast(`✅ Added "${task.name}" with alerts!`);
                task.gcalEventId = data.id; // Mark as synced
                saveTasks();
                renderTasks();
            }
        })
        .catch(err => {
            console.error("GCal Sync Exception:", err);
            showToast("❌ Connection error while syncing.");
        });
    }

});
