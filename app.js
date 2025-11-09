/**
 * Main Application Logic for Event & Reminder PWA
 */

// Global state
let deferredPrompt;
let currentLocation = null;
let mediaRecorder = null;
let audioChunks = [];
let currentDate = new Date();
let currentView = 'month'; // 'month', 'week', or 'day'
let selectedDayDate = null;

/**
 * Initialize the application
 */
async function initApp() {
    console.log('Initializing app...');

    // Wait for database to be ready
    if (!db.db) {
        await db.init();
    }

    // Set up event listeners
    setupTabNavigation();
    setupCalendar();
    setupDayView();
    setupEventModal();
    setupEventForm();
    setupReminderForm();
    setupDeviceFeatures();
    setupAnalytics();
    setupPWAInstall();

    // Load initial data
    await loadEvents();
    await loadReminders();
    await renderCalendar();
    await updateAnalytics();
    await checkDeviceCapabilities();

    console.log('App initialized successfully');
}

/**
 * Toast notification system
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * Tab Navigation
 */
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            // Update active button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Update active content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${targetTab}-tab`) {
                    content.classList.add('active');

                    // Update analytics when switching to analytics tab
                    if (targetTab === 'analytics') {
                        updateAnalytics();
                    }
                }
            });
        });
    });
}

/**
 * Calendar Setup
 */
function setupCalendar() {
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const todayBtn = document.getElementById('todayBtn');
    const monthViewBtn = document.getElementById('monthViewBtn');
    const weekViewBtn = document.getElementById('weekViewBtn');

    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    todayBtn.addEventListener('click', () => {
        currentDate = new Date();
        renderCalendar();
    });

    monthViewBtn.addEventListener('click', () => {
        currentView = 'month';
        monthViewBtn.classList.add('active');
        weekViewBtn.classList.remove('active');
        document.getElementById('calendarGrid').style.display = 'grid';
        document.getElementById('weekView').style.display = 'none';
        renderCalendar();
    });

    weekViewBtn.addEventListener('click', () => {
        currentView = 'week';
        weekViewBtn.classList.add('active');
        monthViewBtn.classList.remove('active');
        document.getElementById('calendarGrid').style.display = 'none';
        document.getElementById('weekView').style.display = 'block';
        renderCalendar();
    });
}

/**
 * Render Calendar
 */
async function renderCalendar() {
    if (currentView === 'month') {
        await renderMonthView();
    } else {
        await renderWeekView();
    }
}

/**
 * Render Month View
 */
async function renderMonthView() {
    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonth = document.getElementById('currentMonth');

    // Update month/year header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    currentMonth.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

    // Get all events
    const events = await db.getAll('events');

    // Get first day of month and last day
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Get days from previous month to fill in
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const daysFromPrevMonth = startingDayOfWeek;

    // Calculate total cells needed
    const totalCells = daysFromPrevMonth + daysInMonth;
    const daysFromNextMonth = (7 - (totalCells % 7)) % 7;

    // Clear calendar
    calendarGrid.innerHTML = '';

    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });

    // Add days from previous month
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        const date = new Date(year, month - 1, day);
        calendarGrid.appendChild(createDayCell(date, events, true));
    }

    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        calendarGrid.appendChild(createDayCell(date, events, false));
    }

    // Add days from next month
    for (let day = 1; day <= daysFromNextMonth; day++) {
        const date = new Date(year, month + 1, day);
        calendarGrid.appendChild(createDayCell(date, events, true));
    }
}

/**
 * Create Day Cell
 */
function createDayCell(date, events, isOtherMonth) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day';

    if (isOtherMonth) {
        cell.classList.add('other-month');
    }

    // Check if today
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
        cell.classList.add('today');
    }

    // Add day number
    const dayNumber = document.createElement('div');
    dayNumber.className = 'calendar-day-number';
    dayNumber.textContent = date.getDate();
    cell.appendChild(dayNumber);

    // Filter events for this day
    const dayEvents = events.filter(event => {
        const eventDate = new Date(event.startDate);
        return eventDate.toDateString() === date.toDateString();
    }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    // Add events
    const eventsContainer = document.createElement('div');
    eventsContainer.className = 'calendar-events';

    const maxEventsToShow = 3;
    dayEvents.slice(0, maxEventsToShow).forEach(event => {
        const eventEl = document.createElement('div');
        eventEl.className = `calendar-event category-${event.category}`;
        eventEl.textContent = event.title;
        eventEl.addEventListener('click', (e) => {
            e.stopPropagation();
            showEventDetails(event);
        });
        eventsContainer.appendChild(eventEl);
    });

    // Show "X more" if there are more events
    if (dayEvents.length > maxEventsToShow) {
        const moreEl = document.createElement('div');
        moreEl.className = 'calendar-event-more';
        moreEl.textContent = `+${dayEvents.length - maxEventsToShow} more`;
        moreEl.addEventListener('click', (e) => {
            e.stopPropagation();
            showDayEvents(date, dayEvents);
        });
        eventsContainer.appendChild(moreEl);
    }

    cell.appendChild(eventsContainer);

    // Click on day to create event
    cell.addEventListener('click', () => {
        createEventForDate(date);
    });

    return cell;
}

/**
 * Render Week View
 */
async function renderWeekView() {
    const weekView = document.getElementById('weekView');
    const currentMonth = document.getElementById('currentMonth');

    // Get start of week (Sunday)
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    // Get end of week (Saturday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    // Update header
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    currentMonth.textContent = `Week of ${monthNames[startOfWeek.getMonth()]} ${startOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;

    // Get all events
    const events = await db.getAll('events');

    // Clear week view
    weekView.innerHTML = '';

    // Add each day
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);

        const dayEl = document.createElement('div');
        dayEl.className = 'week-day';

        const today = new Date();
        if (date.toDateString() === today.toDateString()) {
            dayEl.classList.add('today');
        }

        const headerEl = document.createElement('div');
        headerEl.className = 'week-day-header';
        headerEl.textContent = `${dayNames[i]}, ${monthNames[date.getMonth()]} ${date.getDate()}`;
        dayEl.appendChild(headerEl);

        // Filter events for this day
        const dayEvents = events.filter(event => {
            const eventDate = new Date(event.startDate);
            return eventDate.toDateString() === date.toDateString();
        }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'week-events';

        if (dayEvents.length === 0) {
            const noEvents = document.createElement('p');
            noEvents.textContent = 'No events';
            noEvents.style.color = 'var(--text-secondary)';
            noEvents.style.fontStyle = 'italic';
            eventsContainer.appendChild(noEvents);
        } else {
            dayEvents.forEach(event => {
                const eventEl = document.createElement('div');
                eventEl.className = `week-event category-${event.category}`;

                const titleEl = document.createElement('div');
                titleEl.className = 'week-event-title';
                titleEl.textContent = event.title;

                const timeEl = document.createElement('div');
                timeEl.className = 'week-event-time';
                const startTime = new Date(event.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                const endTime = new Date(event.endDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                timeEl.textContent = `${startTime} - ${endTime}`;

                eventEl.appendChild(titleEl);
                eventEl.appendChild(timeEl);

                eventEl.addEventListener('click', () => {
                    showEventDetails(event);
                });

                eventsContainer.appendChild(eventEl);
            });
        }

        dayEl.appendChild(eventsContainer);
        weekView.appendChild(dayEl);
    }
}

/**
 * Show Event Details (Opens edit modal)
 */
function showEventDetails(event) {
    openEventModalForEdit(event);
}

/**
 * Show Day Events
 */
function showDayEvents(date, events) {
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    let message = `Events on ${dateStr}:\n\n`;

    events.forEach((event, index) => {
        const startTime = new Date(event.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        message += `${index + 1}. ${event.title} (${startTime})\n`;
    });

    alert(message);
}

/**
 * Day View Setup
 */
function setupDayView() {
    const backToCalendarBtn = document.getElementById('backToCalendar');
    const createEventBtn = document.getElementById('createEventBtn');

    backToCalendarBtn.addEventListener('click', () => {
        showCalendarView();
    });

    createEventBtn.addEventListener('click', () => {
        if (selectedDayDate) {
            openEventModal(selectedDayDate);
        }
    });
}

/**
 * Show Day View
 */
async function showDayView(date) {
    selectedDayDate = date;
    currentView = 'day';

    // Hide calendar views
    document.getElementById('calendarGrid').style.display = 'none';
    document.getElementById('weekView').style.display = 'none';
    document.getElementById('dayView').style.display = 'block';

    // Render day view
    await renderDayView(date);
}

/**
 * Show Calendar View
 */
function showCalendarView() {
    currentView = 'month';
    document.getElementById('calendarGrid').style.display = 'grid';
    document.getElementById('weekView').style.display = 'none';
    document.getElementById('dayView').style.display = 'none';

    // Reset view buttons
    document.getElementById('monthViewBtn').classList.add('active');
    document.getElementById('weekViewBtn').classList.remove('active');
}

/**
 * Render Day View
 */
async function renderDayView(date) {
    const dayViewDate = document.getElementById('dayViewDate');
    const dayViewGrid = document.getElementById('dayViewGrid');

    // Update header
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    dayViewDate.textContent = `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

    // Get events for this day
    const events = await db.getAll('events');
    const dayEvents = events.filter(event => {
        const eventDate = new Date(event.startDate);
        return eventDate.toDateString() === date.toDateString();
    });

    // Clear grid
    dayViewGrid.innerHTML = '';

    // Create hourly time slots (12 AM to 11 PM)
    const currentHour = new Date().getHours();
    const currentDay = new Date().toDateString();
    const isToday = date.toDateString() === currentDay;

    for (let hour = 0; hour < 24; hour++) {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';

        // Time label
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        timeLabel.textContent = `${displayHour} ${ampm}`;

        // Time block
        const timeBlock = document.createElement('div');
        timeBlock.className = 'time-block';
        timeBlock.dataset.hour = hour;

        if (isToday && hour === currentHour) {
            timeBlock.classList.add('current-hour');
        }

        // Find events in this hour
        const hourEvents = dayEvents.filter(event => {
            const eventStart = new Date(event.startDate);
            return eventStart.getHours() === hour;
        });

        // Add events to this hour
        hourEvents.forEach(event => {
            const eventEl = document.createElement('div');
            eventEl.className = `day-view-event category-${event.category}`;
            eventEl.draggable = true;
            eventEl.dataset.eventId = event.id;

            const titleEl = document.createElement('div');
            titleEl.className = 'day-view-event-title';
            titleEl.textContent = event.title;

            const timeEl = document.createElement('div');
            timeEl.className = 'day-view-event-time';
            const startTime = new Date(event.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const endTime = new Date(event.endDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            timeEl.textContent = `${startTime} - ${endTime}`;

            eventEl.appendChild(titleEl);
            eventEl.appendChild(timeEl);

            // Click to edit
            eventEl.addEventListener('click', (e) => {
                e.stopPropagation();
                showEventDetails(event);
            });

            // Drag and drop handlers
            eventEl.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                e.dataTransfer.setData('eventId', event.id);
                e.dataTransfer.effectAllowed = 'move';
                eventEl.style.opacity = '0.5';
            });

            eventEl.addEventListener('dragend', (e) => {
                eventEl.style.opacity = '1';
            });

            timeBlock.appendChild(eventEl);
        });

        // Click to create event at this time
        timeBlock.addEventListener('click', () => {
            const clickedDate = new Date(date);
            clickedDate.setHours(hour, 0, 0, 0);
            openEventModal(clickedDate, hour);
        });

        // Drop zone handlers
        timeBlock.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            timeBlock.classList.add('drag-over');
        });

        timeBlock.addEventListener('dragleave', () => {
            timeBlock.classList.remove('drag-over');
        });

        timeBlock.addEventListener('drop', async (e) => {
            e.preventDefault();
            timeBlock.classList.remove('drag-over');

            const eventId = parseInt(e.dataTransfer.getData('eventId'));
            if (!eventId) return;

            // Move event to this hour
            await moveEventToHour(eventId, date, hour);
        });

        dayViewGrid.appendChild(timeLabel);
        dayViewGrid.appendChild(timeBlock);
    }

    // Scroll to 5 AM by default (or current hour if today)
    const scrollToHour = isToday ? Math.max(currentHour - 2, 0) : 5;
    const scrollTarget = dayViewGrid.querySelector(`[data-hour="${scrollToHour}"]`);
    if (scrollTarget) {
        setTimeout(() => {
            scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

/**
 * Move Event To Hour (Drag & Drop)
 */
async function moveEventToHour(eventId, date, newHour) {
    try {
        // Get the event
        const event = await db.get('events', eventId);
        if (!event) {
            showToast('Event not found', 'error');
            return;
        }

        // Calculate the duration
        const oldStart = new Date(event.startDate);
        const oldEnd = new Date(event.endDate);
        const durationMs = oldEnd - oldStart;

        // Create new start date with the new hour
        const newStart = new Date(date);
        newStart.setHours(newHour, oldStart.getMinutes(), 0, 0);

        // Calculate new end date
        const newEnd = new Date(newStart.getTime() + durationMs);

        // Format dates
        const formatDate = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        // Update event
        event.startDate = formatDate(newStart);
        event.endDate = formatDate(newEnd);

        await db.update('events', event);
        await db.logActivity('event_moved', `Moved event: ${event.title} to ${newHour}:00`, { eventId });

        showToast('Event rescheduled', 'success');

        // Refresh day view
        await renderDayView(selectedDayDate);
        await loadEvents();
    } catch (error) {
        console.error('Error moving event:', error);
        showToast('Failed to move event', 'error');
    }
}

/**
 * Event Modal Setup
 */
function setupEventModal() {
    const modal = document.getElementById('eventModal');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelModal');
    const deleteBtn = document.getElementById('deleteEventBtn');
    const modalForm = document.getElementById('modalEventForm');
    const modalDurationSection = document.getElementById('modalDurationSection');
    const modalCustomEndSection = document.getElementById('modalCustomEndSection');
    const modalRecurrenceEndSection = document.getElementById('modalRecurrenceEndSection');
    const modalEndTimeOptions = document.getElementsByName('modalEndTimeOption');
    const modalRecurrence = document.getElementById('modalEventRecurrence');

    // Handle radio button toggle
    modalEndTimeOptions.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'duration') {
                modalDurationSection.style.display = 'block';
                modalCustomEndSection.style.display = 'none';
            } else {
                modalDurationSection.style.display = 'none';
                modalCustomEndSection.style.display = 'block';
            }
        });
    });

    // Handle recurrence dropdown
    modalRecurrence.addEventListener('change', (e) => {
        if (e.target.value === 'none') {
            modalRecurrenceEndSection.style.display = 'none';
        } else {
            modalRecurrenceEndSection.style.display = 'block';
        }
    });

    // Close modal
    const closeModalFn = () => {
        modal.style.display = 'none';
        modalForm.reset();
        modalDurationSection.style.display = 'block';
        modalCustomEndSection.style.display = 'none';
        modalRecurrenceEndSection.style.display = 'none';
        document.querySelector('input[name="modalEndTimeOption"][value="duration"]').checked = true;
        document.getElementById('modalEventId').value = '';
        document.getElementById('modalTitle').textContent = 'Create Event';
        deleteBtn.style.display = 'none';
    };

    closeBtn.addEventListener('click', closeModalFn);
    cancelBtn.addEventListener('click', closeModalFn);

    // Delete event
    deleteBtn.addEventListener('click', async () => {
        const eventId = parseInt(document.getElementById('modalEventId').value);
        if (!eventId) return;

        if (!confirm('Are you sure you want to delete this event?')) {
            return;
        }

        try {
            await db.delete('events', eventId);
            await db.logActivity('event_deleted', `Deleted event ID: ${eventId}`, { eventId });
            showToast('Event deleted successfully', 'success');
            closeModalFn();
            await loadEvents();
            await updateAnalytics();

            // Refresh current view
            if (currentView === 'day' && selectedDayDate) {
                await renderDayView(selectedDayDate);
            } else {
                await renderCalendar();
            }
        } catch (error) {
            console.error('Error deleting event:', error);
            showToast('Failed to delete event', 'error');
        }
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModalFn();
        }
    });

    // Handle form submission
    modalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleModalEventSubmit();
        closeModalFn();
    });
}

/**
 * Open Event Modal (for creating new event)
 */
function openEventModal(date, hour = null) {
    const modal = document.getElementById('eventModal');

    // Reset form for new event
    document.getElementById('modalTitle').textContent = 'Create Event';
    document.getElementById('modalEventId').value = '';
    document.getElementById('deleteEventBtn').style.display = 'none';

    // Populate date fields
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    document.getElementById('modalEventStartDate').value = dateStr;
    document.getElementById('modalEventEndDate').value = dateStr;

    // Set time if hour provided
    if (hour !== null) {
        const timeStr = String(hour).padStart(2, '0') + ':00';
        document.getElementById('modalEventStartTime').value = timeStr;
    }

    modal.style.display = 'flex';
}

/**
 * Open Event Modal For Editing
 */
function openEventModalForEdit(event) {
    const modal = document.getElementById('eventModal');

    // Set modal to edit mode
    document.getElementById('modalTitle').textContent = 'Edit Event';
    document.getElementById('modalEventId').value = event.id;
    document.getElementById('deleteEventBtn').style.display = 'block';

    // Populate all fields
    document.getElementById('modalEventTitle').value = event.title;
    document.getElementById('modalEventDescription').value = event.description || '';

    // Parse start date/time
    const startDate = new Date(event.startDate);
    const startYear = startDate.getFullYear();
    const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
    const startDay = String(startDate.getDate()).padStart(2, '0');
    const startHours = String(startDate.getHours()).padStart(2, '0');
    const startMinutes = String(startDate.getMinutes()).padStart(2, '0');

    document.getElementById('modalEventStartDate').value = `${startYear}-${startMonth}-${startDay}`;
    document.getElementById('modalEventStartTime').value = `${startHours}:${startMinutes}`;

    // Parse end date/time
    const endDate = new Date(event.endDate);
    const endYear = endDate.getFullYear();
    const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
    const endDay = String(endDate.getDate()).padStart(2, '0');
    const endHours = String(endDate.getHours()).padStart(2, '0');
    const endMinutes = String(endDate.getMinutes()).padStart(2, '0');

    document.getElementById('modalEventEndDate').value = `${endYear}-${endMonth}-${endDay}`;
    document.getElementById('modalEventEndTime').value = `${endHours}:${endMinutes}`;

    // Set category
    document.getElementById('modalEventCategory').value = event.category;

    // Set recurrence
    document.getElementById('modalEventRecurrence').value = event.recurrence || 'none';
    if (event.recurrence && event.recurrence !== 'none') {
        document.getElementById('modalRecurrenceEndSection').style.display = 'block';
        if (event.recurrenceEnd) {
            const recEndDate = new Date(event.recurrenceEnd);
            const recYear = recEndDate.getFullYear();
            const recMonth = String(recEndDate.getMonth() + 1).padStart(2, '0');
            const recDay = String(recEndDate.getDate()).padStart(2, '0');
            document.getElementById('modalRecurrenceEnd').value = `${recYear}-${recMonth}-${recDay}`;
        }
    } else {
        document.getElementById('modalRecurrenceEndSection').style.display = 'none';
    }

    // Set location
    document.getElementById('modalEventLocation').checked = !!event.location;

    // Set duration vs custom based on if it's a simple duration
    // For now, default to custom
    document.querySelector('input[name="modalEndTimeOption"][value="custom"]').checked = true;
    document.getElementById('modalDurationSection').style.display = 'none';
    document.getElementById('modalCustomEndSection').style.display = 'block';

    modal.style.display = 'flex';
}

/**
 * Handle Modal Event Submit
 */
async function handleModalEventSubmit() {
    // Check if editing or creating
    const eventId = document.getElementById('modalEventId').value;
    const isEditing = !!eventId;

    // Get start date and time
    const startDate = document.getElementById('modalEventStartDate').value;
    const startTime = document.getElementById('modalEventStartTime').value;

    if (!startDate || !startTime) {
        showToast('Please fill in start date and time', 'error');
        return;
    }

    const startDateTime = `${startDate}T${startTime}`;
    let endDateTime;

    // Determine end time based on selected option
    const endTimeOption = document.querySelector('input[name="modalEndTimeOption"]:checked').value;

    if (endTimeOption === 'duration') {
        // Calculate end time based on duration
        const duration = parseFloat(document.getElementById('modalEventDuration').value);
        const startDateObj = new Date(startDateTime);
        const endDateObj = new Date(startDateObj.getTime() + (duration * 60 * 60 * 1000));

        // Format to YYYY-MM-DDTHH:MM
        const year = endDateObj.getFullYear();
        const month = String(endDateObj.getMonth() + 1).padStart(2, '0');
        const day = String(endDateObj.getDate()).padStart(2, '0');
        const hours = String(endDateObj.getHours()).padStart(2, '0');
        const minutes = String(endDateObj.getMinutes()).padStart(2, '0');
        endDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    } else {
        // Use custom end date/time
        const endDate = document.getElementById('modalEventEndDate').value;
        const endTime = document.getElementById('modalEventEndTime').value;

        if (!endDate || !endTime) {
            showToast('Please fill in end date and time', 'error');
            return;
        }

        endDateTime = `${endDate}T${endTime}`;
    }

    // Get recurrence settings
    const recurrence = document.getElementById('modalEventRecurrence').value;
    const recurrenceEnd = recurrence !== 'none' ? document.getElementById('modalRecurrenceEnd').value : null;

    const eventData = {
        title: document.getElementById('modalEventTitle').value,
        description: document.getElementById('modalEventDescription').value,
        startDate: startDateTime,
        endDate: endDateTime,
        category: document.getElementById('modalEventCategory').value,
        location: document.getElementById('modalEventLocation').checked ? currentLocation : null,
        recurrence: recurrence,
        recurrenceEnd: recurrenceEnd
    };

    try {
        if (isEditing) {
            // Update existing event
            eventData.id = parseInt(eventId);
            await db.update('events', eventData);
            await db.logActivity('event_updated', `Updated event: ${eventData.title}`, { eventId: eventData.id });

            // If recurrence was added, generate future instances
            if (recurrence !== 'none') {
                await generateRecurringEventsFromExisting(eventData);
                showToast('Event updated with recurrence!', 'success');
            } else {
                showToast('Event updated successfully!', 'success');
            }
        } else {
            // Create new event(s)
            if (recurrence !== 'none') {
                // Generate recurring events
                await generateRecurringEvents(eventData);
                showToast('Recurring event created successfully!', 'success');
            } else {
                await db.add('events', eventData);
                await db.logActivity('event_created', `Created event: ${eventData.title}`);
                showToast('Event created successfully!', 'success');
            }
        }

        // Refresh views
        await loadEvents();
        await updateAnalytics();

        // Refresh current view
        if (currentView === 'day' && selectedDayDate) {
            await renderDayView(selectedDayDate);
        } else {
            await renderCalendar();
        }
    } catch (error) {
        console.error('Error saving event:', error);
        showToast('Failed to save event', 'error');
    }
}

/**
 * Generate Recurring Events
 */
async function generateRecurringEvents(baseEvent) {
    const startDate = new Date(baseEvent.startDate);
    const endDate = new Date(baseEvent.endDate);
    const eventDuration = endDate - startDate;

    // Calculate when to stop creating events
    const stopDate = baseEvent.recurrenceEnd ? new Date(baseEvent.recurrenceEnd) : new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());

    let currentDate = new Date(startDate);
    const events = [];

    // Generate events based on recurrence type
    while (currentDate <= stopDate) {
        const eventStartDate = new Date(currentDate);
        const eventEndDate = new Date(currentDate.getTime() + eventDuration);

        events.push({
            ...baseEvent,
            startDate: eventStartDate.toISOString().slice(0, 16),
            endDate: eventEndDate.toISOString().slice(0, 16)
        });

        // Move to next occurrence
        switch (baseEvent.recurrence) {
            case 'daily':
                currentDate.setDate(currentDate.getDate() + 1);
                break;
            case 'weekly':
                currentDate.setDate(currentDate.getDate() + 7);
                break;
            case 'monthly':
                currentDate.setMonth(currentDate.getMonth() + 1);
                break;
            default:
                return; // Stop if invalid recurrence
        }

        // Safety limit: don't create more than 365 events
        if (events.length >= 365) {
            break;
        }
    }

    // Save all events
    for (const event of events) {
        await db.add('events', event);
    }

    await db.logActivity('recurring_events_created', `Created ${events.length} recurring events: ${baseEvent.title}`, { count: events.length });
}

/**
 * Generate Recurring Events From Existing Event
 * (Used when editing an event to add recurrence)
 */
async function generateRecurringEventsFromExisting(baseEvent) {
    const startDate = new Date(baseEvent.startDate);
    const endDate = new Date(baseEvent.endDate);
    const eventDuration = endDate - startDate;

    // Calculate when to stop creating events
    const stopDate = baseEvent.recurrenceEnd ? new Date(baseEvent.recurrenceEnd) : new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());

    // Start from the NEXT occurrence (not the current event)
    let currentDate = new Date(startDate);

    // Move to first future occurrence
    switch (baseEvent.recurrence) {
        case 'daily':
            currentDate.setDate(currentDate.getDate() + 1);
            break;
        case 'weekly':
            currentDate.setDate(currentDate.getDate() + 7);
            break;
        case 'monthly':
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
        default:
            return; // Stop if invalid recurrence
    }

    const events = [];

    // Generate future recurring events (excluding the current one which already exists)
    while (currentDate <= stopDate) {
        const eventStartDate = new Date(currentDate);
        const eventEndDate = new Date(currentDate.getTime() + eventDuration);

        events.push({
            ...baseEvent,
            id: undefined, // Remove the id so it creates new events
            startDate: eventStartDate.toISOString().slice(0, 16),
            endDate: eventEndDate.toISOString().slice(0, 16)
        });

        // Move to next occurrence
        switch (baseEvent.recurrence) {
            case 'daily':
                currentDate.setDate(currentDate.getDate() + 1);
                break;
            case 'weekly':
                currentDate.setDate(currentDate.getDate() + 7);
                break;
            case 'monthly':
                currentDate.setMonth(currentDate.getMonth() + 1);
                break;
            default:
                return; // Stop if invalid recurrence
        }

        // Safety limit: don't create more than 365 events
        if (events.length >= 365) {
            break;
        }
    }

    // Save all future events
    for (const event of events) {
        await db.add('events', event);
    }

    await db.logActivity('recurring_events_generated', `Generated ${events.length} future recurring events from edited event: ${baseEvent.title}`, { count: events.length });
}

/**
 * Create Event For Date (Updated to show day view)
 */
function createEventForDate(date) {
    showDayView(date);
}

/**
 * Event Form Setup
 */
function setupEventForm() {
    const form = document.getElementById('eventForm');
    const addToCalendarBtn = document.getElementById('addToCalendarBtn');
    const durationSection = document.getElementById('durationSection');
    const customEndSection = document.getElementById('customEndSection');
    const endTimeOptions = document.getElementsByName('endTimeOption');

    // Handle radio button toggle
    endTimeOptions.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'duration') {
                durationSection.style.display = 'block';
                customEndSection.style.display = 'none';
                // Clear custom end fields
                document.getElementById('eventEndDate').value = '';
                document.getElementById('eventEndTime').value = '';
            } else {
                durationSection.style.display = 'none';
                customEndSection.style.display = 'block';
            }
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get start date and time
        const startDate = document.getElementById('eventStartDate').value;
        const startTime = document.getElementById('eventStartTime').value;

        if (!startDate || !startTime) {
            showToast('Please fill in start date and time', 'error');
            return;
        }

        const startDateTime = `${startDate}T${startTime}`;
        let endDateTime;

        // Determine end time based on selected option
        const endTimeOption = document.querySelector('input[name="endTimeOption"]:checked').value;

        if (endTimeOption === 'duration') {
            // Calculate end time based on duration
            const duration = parseFloat(document.getElementById('eventDuration').value);
            const startDateObj = new Date(startDateTime);
            const endDateObj = new Date(startDateObj.getTime() + (duration * 60 * 60 * 1000));

            // Format to YYYY-MM-DDTHH:MM
            const year = endDateObj.getFullYear();
            const month = String(endDateObj.getMonth() + 1).padStart(2, '0');
            const day = String(endDateObj.getDate()).padStart(2, '0');
            const hours = String(endDateObj.getHours()).padStart(2, '0');
            const minutes = String(endDateObj.getMinutes()).padStart(2, '0');
            endDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
        } else {
            // Use custom end date/time
            const endDate = document.getElementById('eventEndDate').value;
            const endTime = document.getElementById('eventEndTime').value;

            if (!endDate || !endTime) {
                showToast('Please fill in end date and time', 'error');
                return;
            }

            endDateTime = `${endDate}T${endTime}`;
        }

        const eventData = {
            title: document.getElementById('eventTitle').value,
            description: document.getElementById('eventDescription').value,
            startDate: startDateTime,
            endDate: endDateTime,
            category: document.getElementById('eventCategory').value,
            location: document.getElementById('eventLocation').checked ? currentLocation : null
        };

        try {
            const eventId = await db.add('events', eventData);
            await db.logActivity('event_created', `Created event: ${eventData.title}`, { eventId });

            showToast('Event created successfully!', 'success');
            form.reset();
            // Reset to duration option
            document.querySelector('input[name="endTimeOption"][value="duration"]').checked = true;
            durationSection.style.display = 'block';
            customEndSection.style.display = 'none';
            await loadEvents();
            await updateAnalytics();
        } catch (error) {
            console.error('Error creating event:', error);
            showToast('Failed to create event', 'error');
        }
    });

    // Add to device calendar functionality
    addToCalendarBtn.addEventListener('click', async () => {
        const title = document.getElementById('eventTitle').value;
        const description = document.getElementById('eventDescription').value;
        const startDate = document.getElementById('eventStartDate').value;
        const startTime = document.getElementById('eventStartTime').value;

        if (!title || !startDate || !startTime) {
            showToast('Please fill in title, start date, and start time', 'error');
            return;
        }

        const startDateTime = `${startDate}T${startTime}`;
        let endDateTime;

        // Determine end time based on selected option
        const endTimeOption = document.querySelector('input[name="endTimeOption"]:checked').value;

        if (endTimeOption === 'duration') {
            // Calculate end time based on duration
            const duration = parseFloat(document.getElementById('eventDuration').value);
            const startDateObj = new Date(startDateTime);
            const endDateObj = new Date(startDateObj.getTime() + (duration * 60 * 60 * 1000));

            // Format to YYYY-MM-DDTHH:MM
            const year = endDateObj.getFullYear();
            const month = String(endDateObj.getMonth() + 1).padStart(2, '0');
            const day = String(endDateObj.getDate()).padStart(2, '0');
            const hours = String(endDateObj.getHours()).padStart(2, '0');
            const minutes = String(endDateObj.getMinutes()).padStart(2, '0');
            endDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
        } else {
            // Use custom end date/time
            const endDate = document.getElementById('eventEndDate').value;
            const endTime = document.getElementById('eventEndTime').value;

            if (!endDate || !endTime) {
                showToast('Please fill in end date and time', 'error');
                return;
            }

            endDateTime = `${endDate}T${endTime}`;
        }

        try {
            // Create ICS file for calendar
            const icsContent = generateICS(title, description, startDateTime, endDateTime);
            const blob = new Blob([icsContent], { type: 'text/calendar' });
            const url = URL.createObjectURL(blob);

            // Download the ICS file
            const a = document.createElement('a');
            a.href = url;
            a.download = `event-${Date.now()}.ics`;
            a.click();

            URL.revokeObjectURL(url);
            showToast('Calendar file downloaded! Open it to add to your calendar.', 'success');
        } catch (error) {
            console.error('Error creating calendar event:', error);
            showToast('Failed to create calendar event', 'error');
        }
    });
}

/**
 * Generate ICS calendar file
 */
function generateICS(title, description, startDate, endDate) {
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Event PWA//Event//EN
BEGIN:VEVENT
UID:${Date.now()}@eventpwa.com
DTSTAMP:${formatDate(new Date().toISOString())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${title}
DESCRIPTION:${description || ''}
END:VEVENT
END:VCALENDAR`;
}

/**
 * Load and display events
 */
async function loadEvents() {
    try {
        const events = await db.getAll('events');
        const eventsList = document.getElementById('eventsList');

        if (events.length === 0) {
            eventsList.innerHTML = '<p class="empty-state">No events yet. Create your first event above!</p>';
            return;
        }

        // Sort by start date
        events.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        eventsList.innerHTML = events.map(event => `
            <div class="event-item">
                <h4>${escapeHtml(event.title)}</h4>
                ${event.description ? `<p>${escapeHtml(event.description)}</p>` : ''}
                <p><strong>Start:</strong> ${formatDateTime(event.startDate)}</p>
                <p><strong>End:</strong> ${formatDateTime(event.endDate)}</p>
                <div class="event-meta">
                    <span class="meta-tag category-${event.category}">${event.category}</span>
                    ${event.location ? '<span class="meta-tag">📍 Has Location</span>' : ''}
                </div>
                ${event.location ? `
                    <div class="location-info">
                        <strong>Location:</strong> ${event.location.latitude.toFixed(4)}, ${event.location.longitude.toFixed(4)}
                    </div>
                ` : ''}
                <button class="delete-btn" onclick="deleteEvent(${event.id})">Delete</button>
            </div>
        `).join('');

        // Also update calendar view
        await renderCalendar();
    } catch (error) {
        console.error('Error loading events:', error);
        showToast('Failed to load events', 'error');
    }
}

/**
 * Delete an event
 */
async function deleteEvent(id) {
    if (!confirm('Are you sure you want to delete this event?')) {
        return;
    }

    try {
        await db.delete('events', id);
        await db.logActivity('event_deleted', `Deleted event ID: ${id}`, { eventId: id });
        showToast('Event deleted successfully', 'success');
        await loadEvents();
        await updateAnalytics();
    } catch (error) {
        console.error('Error deleting event:', error);
        showToast('Failed to delete event', 'error');
    }
}

/**
 * Reminder Form Setup
 */
function setupReminderForm() {
    const form = document.getElementById('reminderForm');
    const captureLocationBtn = document.getElementById('captureLocationBtn');
    const locationStatus = document.getElementById('locationStatus');

    captureLocationBtn.addEventListener('click', async () => {
        try {
            locationStatus.textContent = 'Getting location...';
            const position = await getCurrentPosition();
            currentLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
            };
            locationStatus.textContent = `✓ Location captured (${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)})`;
            showToast('Location captured successfully!', 'success');
        } catch (error) {
            console.error('Error getting location:', error);
            locationStatus.textContent = '✗ Failed to get location';
            showToast('Failed to get location', 'error');
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const listName = document.getElementById('listName').value;
        const category = document.getElementById('listCategory').value;
        const itemsText = document.getElementById('reminderItems').value;
        const items = itemsText.split('\n').filter(item => item.trim() !== '');

        const reminderData = {
            name: listName,
            category: category,
            items: items,
            location: currentLocation
        };

        try {
            const reminderId = await db.add('reminders', reminderData);
            await db.logActivity('reminder_created', `Created reminder list: ${listName}`, { reminderId });

            showToast('Reminder list created successfully!', 'success');
            form.reset();
            locationStatus.textContent = '';
            currentLocation = null;
            await loadReminders();
            await updateAnalytics();
        } catch (error) {
            console.error('Error creating reminder:', error);
            showToast('Failed to create reminder', 'error');
        }
    });
}

/**
 * Load and display reminders
 */
async function loadReminders() {
    try {
        const reminders = await db.getAll('reminders');
        const remindersList = document.getElementById('remindersList');

        if (reminders.length === 0) {
            remindersList.innerHTML = '<p class="empty-state">No reminders yet. Create your first list above!</p>';
            return;
        }

        remindersList.innerHTML = reminders.map(reminder => `
            <div class="reminder-item">
                <h4>${escapeHtml(reminder.name)}</h4>
                <div class="event-meta">
                    <span class="meta-tag category-${reminder.category}">${reminder.category}</span>
                    ${reminder.location ? '<span class="meta-tag">📍 Has Location</span>' : ''}
                </div>
                ${reminder.location ? `
                    <div class="location-info">
                        <strong>Location:</strong> ${reminder.location.latitude.toFixed(4)}, ${reminder.location.longitude.toFixed(4)}
                    </div>
                ` : ''}
                <ul class="reminder-items-list">
                    ${reminder.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
                </ul>
                <p class="text-secondary">Created: ${formatDateTime(reminder.createdAt)}</p>
                <button class="delete-btn" onclick="deleteReminder(${reminder.id})">Delete</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading reminders:', error);
        showToast('Failed to load reminders', 'error');
    }
}

/**
 * Delete a reminder
 */
async function deleteReminder(id) {
    if (!confirm('Are you sure you want to delete this reminder list?')) {
        return;
    }

    try {
        await db.delete('reminders', id);
        await db.logActivity('reminder_deleted', `Deleted reminder ID: ${id}`, { reminderId: id });
        showToast('Reminder list deleted successfully', 'success');
        await loadReminders();
        await updateAnalytics();
    } catch (error) {
        console.error('Error deleting reminder:', error);
        showToast('Failed to delete reminder', 'error');
    }
}

/**
 * Device Features Setup
 */
function setupDeviceFeatures() {
    // Camera
    const takePictureBtn = document.getElementById('takePictureBtn');
    takePictureBtn.addEventListener('click', takePicture);

    // Audio Recording
    const startRecordingBtn = document.getElementById('startRecordingBtn');
    const stopRecordingBtn = document.getElementById('stopRecordingBtn');
    startRecordingBtn.addEventListener('click', startRecording);
    stopRecordingBtn.addEventListener('click', stopRecording);

    // Geolocation
    const getLocationBtn = document.getElementById('getLocationBtn');
    getLocationBtn.addEventListener('click', displayLocation);
}

/**
 * Camera functionality
 */
async function takePicture() {
    try {
        // Check if mediaDevices is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showToast('Camera not supported on this device', 'error');
            return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        });

        // Create video element
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.style.maxWidth = '100%';

        const cameraPreview = document.getElementById('cameraPreview');
        cameraPreview.innerHTML = '';
        cameraPreview.appendChild(video);

        // Create capture button
        const captureBtn = document.createElement('button');
        captureBtn.textContent = 'Capture Photo';
        captureBtn.className = 'btn btn-primary';
        captureBtn.style.marginTop = '10px';
        cameraPreview.appendChild(captureBtn);

        captureBtn.addEventListener('click', () => {
            // Create canvas to capture frame
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);

            // Convert to blob and save
            canvas.toBlob(async (blob) => {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const mediaData = {
                        type: 'image',
                        data: reader.result,
                        timestamp: new Date().toISOString()
                    };

                    await db.add('media', mediaData);
                    await db.logActivity('photo_captured', 'Captured a photo');

                    // Display captured image
                    const img = document.createElement('img');
                    img.src = reader.result;
                    cameraPreview.innerHTML = '';
                    cameraPreview.appendChild(img);

                    // Stop stream
                    stream.getTracks().forEach(track => track.stop());

                    showToast('Photo captured and saved!', 'success');
                };
                reader.readAsDataURL(blob);
            });
        });

        await db.logActivity('camera_opened', 'Opened camera');
    } catch (error) {
        console.error('Error accessing camera:', error);
        showToast('Failed to access camera: ' + error.message, 'error');
    }
}

/**
 * Audio Recording functionality
 */
async function startRecording() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showToast('Audio recording not supported on this device', 'error');
            return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();

            reader.onloadend = async () => {
                const mediaData = {
                    type: 'audio',
                    data: reader.result,
                    timestamp: new Date().toISOString()
                };

                await db.add('media', mediaData);
                await db.logActivity('audio_recorded', 'Recorded audio');

                // Display audio player
                const audio = document.createElement('audio');
                audio.controls = true;
                audio.src = reader.result;

                const audioPreview = document.getElementById('audioPreview');
                audioPreview.innerHTML = '';
                audioPreview.appendChild(audio);

                showToast('Audio recording saved!', 'success');
            };

            reader.readAsDataURL(audioBlob);

            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();

        document.getElementById('startRecordingBtn').disabled = true;
        document.getElementById('stopRecordingBtn').disabled = false;

        showToast('Recording started...', 'info');
        await db.logActivity('recording_started', 'Started audio recording');
    } catch (error) {
        console.error('Error starting recording:', error);
        showToast('Failed to start recording: ' + error.message, 'error');
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();

        document.getElementById('startRecordingBtn').disabled = false;
        document.getElementById('stopRecordingBtn').disabled = true;

        showToast('Recording stopped', 'info');
    }
}

/**
 * Geolocation functionality
 */
async function displayLocation() {
    try {
        const locationPreview = document.getElementById('locationPreview');
        locationPreview.innerHTML = '<div class="spinner"></div>';

        const position = await getCurrentPosition();

        locationPreview.innerHTML = `
            <p><strong>Latitude:</strong> ${position.coords.latitude}</p>
            <p><strong>Longitude:</strong> ${position.coords.longitude}</p>
            <p><strong>Accuracy:</strong> ${position.coords.accuracy} meters</p>
            <p><strong>Altitude:</strong> ${position.coords.altitude || 'N/A'}</p>
            <p><strong>Speed:</strong> ${position.coords.speed || 'N/A'}</p>
            <p><strong>Timestamp:</strong> ${new Date(position.timestamp).toLocaleString()}</p>
        `;

        await db.logActivity('location_retrieved', 'Retrieved current location');
        showToast('Location retrieved successfully!', 'success');
    } catch (error) {
        console.error('Error getting location:', error);
        document.getElementById('locationPreview').innerHTML = `<p>Error: ${error.message}</p>`;
        showToast('Failed to get location', 'error');
    }
}

/**
 * Get current position helper
 */
function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }

        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    });
}

/**
 * Check device capabilities
 */
async function checkDeviceCapabilities() {
    const capabilitiesInfo = document.getElementById('capabilitiesInfo');

    const capabilities = {
        'Camera': !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        'Microphone': !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        'Geolocation': !!navigator.geolocation,
        'Service Worker': 'serviceWorker' in navigator,
        'IndexedDB': !!window.indexedDB,
        'Notifications': 'Notification' in window,
        'Online Status': 'onLine' in navigator,
        'Battery API': 'getBattery' in navigator,
        'Vibration': 'vibrate' in navigator,
        'Device Orientation': 'DeviceOrientationEvent' in window,
        'Touch Screen': 'ontouchstart' in window,
        'Web Share API': 'share' in navigator
    };

    const html = Object.entries(capabilities).map(([key, value]) => `
        <p>
            <strong>${key}:</strong>
            <span style="color: ${value ? 'green' : 'red'}">
                ${value ? '✓ Supported' : '✗ Not Supported'}
            </span>
        </p>
    `).join('');

    capabilitiesInfo.innerHTML = html;
}

/**
 * Analytics Setup
 */
function setupAnalytics() {
    const exportDataBtn = document.getElementById('exportDataBtn');
    const clearDataBtn = document.getElementById('clearDataBtn');

    exportDataBtn.addEventListener('click', async () => {
        try {
            const data = await db.exportData();
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `event-pwa-export-${Date.now()}.json`;
            a.click();

            URL.revokeObjectURL(url);
            showToast('Data exported successfully!', 'success');
            await db.logActivity('data_exported', 'Exported all data');
        } catch (error) {
            console.error('Error exporting data:', error);
            showToast('Failed to export data', 'error');
        }
    });

    clearDataBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete ALL data? This cannot be undone!')) {
            return;
        }

        try {
            await db.clearAll();
            showToast('All data cleared successfully', 'success');
            await loadEvents();
            await loadReminders();
            await updateAnalytics();
        } catch (error) {
            console.error('Error clearing data:', error);
            showToast('Failed to clear data', 'error');
        }
    });
}

/**
 * Update analytics dashboard
 */
async function updateAnalytics() {
    try {
        const analytics = await db.getAnalytics();

        // Update stats
        document.getElementById('totalEvents').textContent = analytics.totalEvents;
        document.getElementById('upcomingEvents').textContent = analytics.upcomingEvents;
        document.getElementById('totalReminders').textContent = analytics.totalReminders;

        // Category breakdown
        const categoryBreakdown = document.getElementById('categoryBreakdown');
        const total = analytics.totalEvents;

        if (total === 0) {
            categoryBreakdown.innerHTML = '<p class="empty-state">No data to display</p>';
        } else {
            const html = Object.entries(analytics.categoryBreakdown).map(([category, count]) => {
                const percentage = (count / total) * 100;
                return `
                    <div class="category-bar">
                        <div class="category-bar-label">
                            <span>${category}</span>
                            <span>${count} (${percentage.toFixed(1)}%)</span>
                        </div>
                        <div class="category-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                `;
            }).join('');
            categoryBreakdown.innerHTML = html;
        }

        // Recent activity
        const recentActivity = document.getElementById('recentActivity');
        if (analytics.recentActivity.length === 0) {
            recentActivity.innerHTML = '<p class="empty-state">No recent activity</p>';
        } else {
            const html = analytics.recentActivity.map(activity => `
                <div class="activity-item">
                    <strong>${activity.type.replace('_', ' ').toUpperCase()}:</strong>
                    ${activity.description}
                    <br>
                    <small>${formatDateTime(activity.timestamp)}</small>
                </div>
            `).join('');
            recentActivity.innerHTML = html;
        }
    } catch (error) {
        console.error('Error updating analytics:', error);
    }
}

/**
 * PWA Install Prompt
 */
function setupPWAInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;

        const installPrompt = document.getElementById('installPrompt');
        installPrompt.style.display = 'block';

        const installBtn = document.getElementById('installBtn');
        installBtn.addEventListener('click', async () => {
            installPrompt.style.display = 'none';

            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                showToast('App installed successfully!', 'success');
            }

            deferredPrompt = null;
        });
    });

    window.addEventListener('appinstalled', () => {
        showToast('App installed successfully!', 'success');
        db.logActivity('app_installed', 'PWA installed to device');
    });
}

/**
 * Utility Functions
 */
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
