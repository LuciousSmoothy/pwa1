/**
 * Main Application Logic for Event & Reminder PWA
 */

// Global state
let deferredPrompt;
let currentLocation = null;
let mediaRecorder = null;
let audioChunks = [];

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
    setupEventForm();
    setupReminderForm();
    setupDeviceFeatures();
    setupAnalytics();
    setupPWAInstall();

    // Load initial data
    await loadEvents();
    await loadReminders();
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
