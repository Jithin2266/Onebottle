document.addEventListener('DOMContentLoaded', () => {
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

    // Render tasks on load
    renderTasks();

    // Quick Select: Today logic
    const todayCheckbox = document.getElementById('today-task');
    const startDateInput = document.getElementById('start-date');
    const completionDateInput = document.getElementById('completion-date');
    
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
        }
    });

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function renderTasks() {
        taskList.innerHTML = '';

        if (tasks.length === 0) {
            taskList.innerHTML = `
                <div class="empty-state">
                    <p>No tasks yet. Create one to get started!</p>
                </div>
            `;
            return;
        }

        // Sort by completed status first, then by priority (descending)
        const sortedTasks = [...tasks].sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            return priorityMap[b.priority] - priorityMap[a.priority];
        });

        const todayStr = new Date().toISOString().split('T')[0];

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
});
