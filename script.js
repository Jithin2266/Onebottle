document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('task-form');
    const taskList = document.getElementById('task-list');
    const viewDashboard = document.getElementById('view-dashboard');
    const viewNewTask = document.getElementById('view-new-task');
    const navHome = document.getElementById('nav-home');
    const navAdd = document.getElementById('nav-add');

    // Navigation Logic
    function switchView(viewId) {
        if (viewId === 'home') {
            viewDashboard.classList.add('active-view');
            viewNewTask.classList.remove('active-view');
            navHome.classList.add('active');
            navAdd.classList.remove('active');
            navHome.innerHTML = '<span class="nav-icon">🏠</span> Home';
            navAdd.innerHTML = '<span class="nav-icon">➕</span>';
        } else {
            viewDashboard.classList.remove('active-view');
            viewNewTask.classList.add('active-view');
            navAdd.classList.add('active');
            navHome.classList.remove('active');
            navAdd.innerHTML = '<span class="nav-icon">➕</span> New Task';
            navHome.innerHTML = '<span class="nav-icon">🏠</span>';
        }
    }

    navHome.addEventListener('click', () => switchView('home'));
    navAdd.addEventListener('click', () => switchView('add'));

    // Priority mapping for sorting
    const priorityMap = { 'Urgent': 4, 'High': 3, 'Medium': 2, 'Low': 1 };

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    renderTasks();

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newTask = {
            id: Date.now().toString(),
            name: document.getElementById('task-name').value,
            startDate: document.getElementById('start-date').value,
            completionDate: document.getElementById('completion-date').value,
            priority: document.getElementById('priority').value,
            category: document.getElementById('category').value,
            reminder: document.getElementById('reminder').checked,
            completed: false,
            createdAt: new Date().toISOString()
        };

        tasks.push(newTask);
        saveTasks();
        renderTasks();
        taskForm.reset();
        
        // Go back to home view after adding
        switchView('home');
    });

    taskList.addEventListener('click', (e) => {
        const item = e.target.closest('.task-item');
        if (!item) return;
        const id = item.dataset.id;

        if (e.target.closest('.delete-btn')) {
            item.style.opacity = '0';
            item.style.transform = 'scale(0.9)';
            setTimeout(() => {
                tasks = tasks.filter(t => t.id !== id);
                saveTasks();
                renderTasks();
            }, 300);
        } else if (e.target.closest('.complete-btn')) {
            const task = tasks.find(t => t.id === id);
            if (task) {
                task.completed = !task.completed;
                saveTasks();
                renderTasks();
            }
        }
    });

    function saveTasks() { localStorage.setItem('tasks', JSON.stringify(tasks)); }

    function renderTasks() {
        taskList.innerHTML = '';
        if (tasks.length === 0) {
            taskList.innerHTML = `<div style="text-align:center; color:#8e8e93; margin-top: 2rem;">No tasks yet.</div>`;
            return;
        }

        const sortedTasks = [...tasks].sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            return priorityMap[b.priority] - priorityMap[a.priority];
        });

        const todayStr = new Date().toISOString().split('T')[0];

        sortedTasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = `task-item priority-${task.priority} ${task.completed ? 'completed' : ''}`;
            taskElement.dataset.id = task.id;
            taskElement.style.transition = 'all 0.3s ease';

            const isOverdue = !task.completed && task.completionDate < todayStr;
            const isDueToday = !task.completed && task.completionDate === todayStr;
            
            let statusHTML = '';
            if (isOverdue) statusHTML = `<span class="badge" style="color: #ef4444;">⚠️ Overdue</span>`;
            else if (isDueToday) statusHTML = `<span class="badge" style="color: #eab308;">⏳ Due Today</span>`;
            else statusHTML = `<span class="badge">${task.priority} Priority</span>`;

            taskElement.innerHTML = `
                <div class="task-header">
                    <div class="task-title">${task.name} ${task.reminder ? '🔔' : ''}</div>
                </div>
                <div style="margin: 0.2rem 0 0.5rem 0;">
                    ${statusHTML} <span class="badge">${task.category}</span>
                </div>
                <div class="task-details">
                    <span>${formatDate(task.startDate)} - ${formatDate(task.completionDate)}</span>
                </div>
                <div class="task-actions">
                    <button class="btn-icon complete-btn check" title="Complete">
                        ${task.completed ? '✅' : '✓'}
                    </button>
                    <button class="btn-icon delete-btn" title="Delete">🗑️</button>
                </div>
            `;
            taskList.appendChild(taskElement);
        });
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const options = { month: 'short', day: 'numeric' };
        const [year, month, day] = dateString.split('-');
        return new Date(year, month - 1, day).toLocaleDateString(undefined, options);
    }
    
    // Notifications...
    if ("Notification" in window) {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                setTimeout(checkReminders, 2000);
                setInterval(checkReminders, 60 * 60 * 1000);
            }
        });
    }

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
            new Notification("Daily Clock Reminder", {
                body: `You have ${reminderTasks.length} pending task(s) due!`,
                icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Check_green_icon.svg/512px-Check_green_icon.svg.png"
            });
        }
    }
});
