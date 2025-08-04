const { createApp, ref, computed } = Vue;

const app = createApp({
  data() {
    return {
      habits: [],
      newHabit: { name: '', frequency: 'Daily', completedDates: [], messages: [] },
      showModal: false,
      // Detail view state
      showHabitDetail: false,
      selectedHabit: null,
      selectedDate: '',
      messageInput: '',
      // Calendar state
      today: new Date(),
      calendarMonth: new Date().getMonth(),
      calendarYear: new Date().getFullYear(),
      // Expanded habit view state
      expandedHabitId: null,
      renameInput: '',
      // Drag and drop state
      draggingIdx: null,
      dragOverIdx: null,
      dragTouchTimer: null,
      dragTouchStartY: null,
      dragTouchIdx: null,
      // Menu state
      menuOpen: false,
      // PWA installation
      deferredPrompt: null,
      canInstall: false,
      isRunningAsPWA: false,
      // Full Year Calendar feature
      selectedFullCalendarYear: null,
      monthNames: [
        'January','February','March','April','May','June',
        'July','August','September','October','November','December'
      ],
    };
  },
  computed: {
    calendarMonthName() {
      return new Date(this.calendarYear, this.calendarMonth).toLocaleString('default', { month: 'long' });
    },
    getDaysInMonth() {
      return (year, month) => new Date(year, month + 1, 0).getDate();
    },
    calendarBlanks() {
      const firstDay = new Date(this.calendarYear, this.calendarMonth, 1).getDay();
      return (firstDay === 0 ? 6 : firstDay - 1);
    },
    calendarDates() {
      const days = [];
      const daysInMonth = this.getDaysInMonth(this.calendarYear, this.calendarMonth);
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(this.calendarYear, this.calendarMonth, d);
        const iso = date.toISOString().split('T')[0];
        days.push({ day: d, date: iso });
      }
      return days;
    },
    safeMessages() {
      // Only show messages for the expanded habit, latest first
      if (!this.expandedHabitId) return [];
      const habit = this.habits.find(h => h.id === this.expandedHabitId);
      return habit && habit.messages ? [...habit.messages].sort((a, b) => b.timestamp - a.timestamp) : [];
    },
    last7Days() {
      const days = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        days.push(`${yyyy}-${mm}-${dd}`);
      }
      return days;
    },
    shouldShowInstallButton() {
      return !this.isRunningAsPWA && this.canInstall;
    }
  },
  methods: {
    addHabit() {
      if (this.newHabit.name) {
        this.habits.push({ ...this.newHabit, id: Date.now() });
        this.newHabit = { name: '', frequency: 'Daily', completedDates: [], messages: [] };
        this.showModal = false;
        this.saveHabits();
      }
    },
    toggleComplete(habit, date) {
      const h = this.habits.find(x => x.id === habit.id);
      if (h) {
        const index = h.completedDates.indexOf(date);
        if (index === -1) {
          h.completedDates.push(date);
        } else {
          h.completedDates.splice(index, 1);
        }
        this.saveHabits();
      }
    },
    isHabitCompleted(habit, date) {
      const h = this.habits.find(x => x.id === habit.id);
      return h ? h.completedDates.includes(date) : false;
    },
    openHabitDetail(habit) {
      this.selectedHabit = { ...habit };
      this.showHabitDetail = true;
      this.renameInput = habit.name;
      // Default to today
      const todayIso = new Date(this.calendarYear, this.calendarMonth, this.today.getDate()).toISOString().split('T')[0];
      this.selectedDate = todayIso;
      this.messageInput = '';
    },
    closeHabitDetail() {
      this.showHabitDetail = false;
      this.selectedHabit = null;
      this.selectedDate = '';
      this.messageInput = '';
    },
    toggleCompleteDetail(habit, date) {
      this.toggleComplete(habit, date);
    },
    sendMessage() {
      if (!this.expandedHabitId) return;
      const text = this.messageInput.trim();
      if (!text) return;
      const habit = this.habits.find(h => h.id === this.expandedHabitId);
      if (!habit) return;
      if (!habit.messages) habit.messages = [];
      habit.messages.push({
        text,
        timestamp: Date.now()
      });
      this.messageInput = '';
      this.saveHabits();
    },
    getMessages(habit) {
      return habit && habit.messages ? habit.messages : [];
    },
    formatTimestamp(ts) {
      const d = new Date(ts);
      return d.toLocaleString();
    },
    prevMonth() {
      if (this.calendarMonth === 0) {
        this.calendarMonth = 11;
        this.calendarYear -= 1;
      } else {
        this.calendarMonth -= 1;
      }
    },
    nextMonth() {
      if (this.calendarMonth === 11) {
        this.calendarMonth = 0;
        this.calendarYear += 1;
      } else {
        this.calendarMonth += 1;
      }
    },
    confirmRename() {
      const newName = this.renameInput.trim();
      // Use expandedHabitId if present, otherwise selectedHabit (for modal)
      let habit = null;
      if (this.expandedHabitId) {
        habit = this.habits.find(h => h.id === this.expandedHabitId);
      } else if (this.selectedHabit) {
        habit = this.habits.find(h => h.id === this.selectedHabit.id);
      }
      if (!habit) return;
      if (newName && habit.name !== newName) {
        habit.name = newName;
        this.saveHabits();
      }
    },
    deleteHabit() {
      let habitId = null;
      if (this.expandedHabitId) {
        habitId = this.expandedHabitId;
      } else if (this.selectedHabit) {
        habitId = this.selectedHabit.id;
      }
      if (!habitId) return;
      if (confirm('Are you sure you want to delete this habit?')) {
        this.habits = this.habits.filter(h => h.id !== habitId);
        this.closeExpandHabit();
        this.closeHabitDetail();
        this.saveHabits();
      }
    },
    toggleExpandHabit(habit) {
      if (this.expandedHabitId === habit.id) {
        this.expandedHabitId = null;
      } else {
        this.expandedHabitId = habit.id;
        this.renameInput = habit.name;
        this.messageInput = '';
        // Set default year for full calendar
        const years = this.habitCompletionYears(habit);
        if (years.length) this.selectedFullCalendarYear = years[years.length - 1];
        else this.selectedFullCalendarYear = new Date().getFullYear();
        // Ensure the toggle property exists and is false by default
        if (typeof habit._showFullYearCalendar !== 'boolean') {
          this.$set ? this.$set(habit, '_showFullYearCalendar', false) : (habit._showFullYearCalendar = false);
        }
      }
    },
    closeExpandHabit() {
      this.expandedHabitId = null;
      this.messageInput = '';
    },
    saveHabits() {
      // Save habits to localStorage or your persistence layer
      localStorage.setItem('habits', JSON.stringify(this.habits));
    },
    isFutureDate(date) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const d = new Date(date + 'T00:00:00');
      return d > today;
    },
    onDragStart(idx, e) {
      this.draggingIdx = idx;
      e.dataTransfer.effectAllowed = 'move';
      // For Firefox compatibility
      e.dataTransfer.setData('text/plain', idx);
    },
    onDragOver(idx, e) {
      if (this.draggingIdx !== null && idx !== this.draggingIdx) {
        this.dragOverIdx = idx;
      }
    },
    onDrop(idx, e) {
      if (this.draggingIdx !== null && idx !== this.draggingIdx) {
        const moved = this.habits.splice(this.draggingIdx, 1)[0];
        this.habits.splice(idx, 0, moved);
        this.saveHabits();
      }
      this.draggingIdx = null;
      this.dragOverIdx = null;
    },
    onDragEnd() {
      this.draggingIdx = null;
      this.dragOverIdx = null;
    },
    // Touch support for mobile (long press to start drag)
    onTouchStart(idx, e) {
      this.dragTouchIdx = idx;
      this.dragTouchStartY = e.touches[0].clientY;
      this.dragTouchTimer = setTimeout(() => {
        this.draggingIdx = idx;
      }, 300); // 300ms long press
    },
    onTouchMove(e) {
      if (this.draggingIdx !== null) {
        const y = e.touches[0].clientY;
        // Find the closest habit index to the current Y
        const habitEls = Array.from(document.querySelectorAll('[draggable="true"]'));
        let closestIdx = null;
        let minDist = Infinity;
        habitEls.forEach((el, i) => {
          const rect = el.getBoundingClientRect();
          const dist = Math.abs(rect.top + rect.height / 2 - y);
          if (dist < minDist) {
            minDist = dist;
            closestIdx = i;
          }
        });
        if (closestIdx !== null && closestIdx !== this.draggingIdx) {
          this.dragOverIdx = closestIdx;
        }
      } else {
        clearTimeout(this.dragTouchTimer);
      }
    },
    onTouchEnd(e) {
      clearTimeout(this.dragTouchTimer);
      if (this.draggingIdx !== null && this.dragOverIdx !== null && this.draggingIdx !== this.dragOverIdx) {
        const moved = this.habits.splice(this.draggingIdx, 1)[0];
        this.habits.splice(this.dragOverIdx, 0, moved);
        this.saveHabits();
      }
      this.draggingIdx = null;
      this.dragOverIdx = null;
      this.dragTouchIdx = null;
      this.dragTouchStartY = null;
    },
    toggleImportant(habit) {
      habit.important = !habit.important;
      this.saveHabits();
    },
    exportHabits() {
      this.menuOpen = false;
      const data = JSON.stringify(this.habits, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'beelyt-habits.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    },
    triggerImport() {
      this.menuOpen = false;
      this.$refs.importInput.value = '';
      this.$refs.importInput.click();
    },
    handleImportFile(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const imported = JSON.parse(evt.target.result);
          if (Array.isArray(imported)) {
            // Optionally: merge or replace
            imported.forEach(h => {
              if (!this.habits.some(existing => existing.id === h.id)) {
                this.habits.push(h);
              }
            });
            this.saveHabits();
            alert('Habits imported!');
          } else {
            alert('Invalid file format.');
          }
        } catch {
          alert('Failed to import.');
        }
      };
      reader.readAsText(file);
    },
    shareHabits() {
      this.menuOpen = false;
      const data = JSON.stringify(this.habits, null, 2);
      if (navigator.share) {
        const blob = new Blob([data], { type: 'application/json' });
        const file = new File([blob], 'beelyt-habits.json', { type: 'application/json' });
        navigator.share({
          title: 'Beelyt Habits',
          text: 'Here are my Beelyt habits!',
          files: [file]
        }).catch(() => {});
      } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(data).then(() => {
          alert('Habits JSON copied to clipboard!');
        });
      }
    },
    supportBeelyt() {
      this.menuOpen = false;
      window.open('https://buymeacoffee.com/austinwin', '_blank');
    },
    toggleMenu(e) {
      this.menuOpen = !this.menuOpen;
    },
    handleClickOutside(e) {
      // Only close if menu is open and click is outside the menu/hamburger
      if (!this.menuOpen) return;
      const menu = document.querySelector('nav[aria-label="Menu"], nav[role="menu"], nav[aria-expanded]');
      const btn = document.querySelector('button[aria-label="Open menu"]');
      if (
        this.menuOpen &&
        !e.target.closest('.relative') // .relative wraps both button and menu
      ) {
        this.menuOpen = false;
      }
    },
    shareBeelyt() {
      // Close the menu
      this.menuOpen = false;
      
      // Share data
      const shareData = {
        title: 'Beelyt - Habit Tracker',
        text: 'Track your habits with Beelyt - a simple and effective habit tracker!',
        url: window.location.href
      };
      
      // Check if the Web Share API is supported
      if (navigator.share) {
        // Use a flag to track if native sharing was initiated
        let shareInitiated = true;
        
        navigator.share(shareData)
          .then(() => {
            // Only show success toast when sharing completes
            //this.showToast('Shared successfully!');
            console.log('Shared successfully!');
          })
          .catch((err) => {
            console.error('Error sharing:', err);
            // Only use fallback if it's not user cancellation
            if (err.name !== 'AbortError') {
              this.fallbackShare();
            }
          });
      } else {
        // Fallback for browsers that don't support the Web Share API
        this.fallbackShare();
      }
    },
    
    // Fallback sharing method
    fallbackShare() {
      // Try to use the Clipboard API first (better for PWAs)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(window.location.href)
          .then(() => {
            this.showToast('URL copied to clipboard! Share it with your friends.');
          })
          .catch(err => {
            console.error('Clipboard API failed:', err);
            this.fallbackCopyUsingExecCommand();
          });
      } else {
        this.fallbackCopyUsingExecCommand();
      }
    },
    
    // Additional fallback for older browsers
    fallbackCopyUsingExecCommand() {
      try {
        // Create a visually hidden but focused textarea element
        const dummy = document.createElement('textarea');
        dummy.style.position = 'fixed';
        dummy.style.top = '0';
        dummy.style.left = '0';
        dummy.style.width = '1px';
        dummy.style.height = '1px';
        dummy.style.opacity = '0';
        dummy.value = window.location.href;
        
        document.body.appendChild(dummy);
        
        // This helps on iOS to ensure the element is properly visible and focusable
        dummy.style.visibility = 'visible';
        dummy.focus();
        dummy.select();
        
        // Try to copy
        const successful = document.execCommand('copy');
        document.body.removeChild(dummy);
        
        if (successful) {
          this.showToast('URL copied to clipboard! Share it with your friends.');
        } else {
          // If execCommand fails, show the manual dialog
          this.showManualShareInstructions();
        }
      } catch (err) {
        console.error('execCommand error:', err);
        this.showManualShareInstructions();
      }
    },
    
    // Show manual share instructions (simplified version for better mobile compatibility)
    showManualShareInstructions() {
      // Create a modal with the URL and instructions
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]';
      
      // Make the URL input read-only but selectable
      const shareUrl = window.location.href;
      
      modal.innerHTML = `
        <div class="bg-white p-4 rounded-lg w-11/12 max-w-md">
          <h3 class="text-lg font-bold mb-2">Share Beelyt</h3>
          <p class="mb-2">Copy this URL to share:</p>
          <div class="relative mb-4">
            <input type="text" readonly value="${shareUrl}" 
                   class="bg-gray-100 p-2 pr-16 rounded w-full border border-gray-300 select-all" 
                   onclick="this.select()">
            <button id="copy-btn" class="absolute right-1 top-1 bg-blue-500 text-white px-2 py-1 rounded text-sm">
              Copy
            </button>
          </div>
          <button class="bg-green-500 text-white px-4 py-2 rounded w-full" id="close-modal">
            Close
          </button>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Handle copy button click
      const copyBtn = modal.querySelector('#copy-btn');
      copyBtn.addEventListener('click', () => {
        const input = modal.querySelector('input');
        input.select();
        input.setSelectionRange(0, 99999); // For mobile devices
        
        try {
          document.execCommand('copy');
          copyBtn.textContent = 'Copied!';
          copyBtn.classList.remove('bg-blue-500');
          copyBtn.classList.add('bg-green-500');
        } catch (err) {
          copyBtn.textContent = 'Failed';
          copyBtn.classList.remove('bg-blue-500');
          copyBtn.classList.add('bg-red-500');
        }
      });
      
      // Add click listener to close the modal
      modal.querySelector('#close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    },
    
    // Toast notification function
    showToast(message) {
      // Create toast element if it doesn't exist
      let toast = document.getElementById('toast-notification');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg opacity-0 transition-opacity duration-300 z-[9999] max-w-xs text-center';
        document.body.appendChild(toast);
      }
      
      // Set message and show toast
      toast.textContent = message;
      toast.style.opacity = '1';
      
      // Hide toast after 3 seconds
      setTimeout(() => {
        toast.style.opacity = '0';
      }, 3000);
    },
    
    // Check if app is running as PWA
    checkIfRunningAsPWA() {
      // Method 1: Check if display-mode is standalone or fullscreen
      const isDisplayModePWA = window.matchMedia('(display-mode: standalone)').matches || 
                              window.matchMedia('(display-mode: fullscreen)').matches ||
                              window.matchMedia('(display-mode: minimal-ui)').matches;
      
      // Method 2: Check for iOS PWA
      const isIOSPWA = window.navigator.standalone === true;
      
      // Method 3: Check for presence of serviceWorker in navigator
      const hasServiceWorker = 'serviceWorker' in navigator;
      
      // If either condition is true, we're in PWA mode
      this.isRunningAsPWA = isDisplayModePWA || isIOSPWA;
      
      console.log('Running as PWA:', this.isRunningAsPWA);
      return this.isRunningAsPWA;
    },
    
    // Install PWA functionality
    installPWA() {
      this.menuOpen = false;
      
      // If we're already running as a PWA, no need to show installation instructions
      if (this.isRunningAsPWA) {
        this.showToast('Beelyt is already installed!');
        return;
      }
      
      if (this.deferredPrompt) {
        // Show the install prompt
        this.deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        this.deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            this.showToast('Thank you for installing Beelyt!');
            this.canInstall = false;
          } else {
            console.log('User dismissed the install prompt');
          }
          // Clear the saved prompt as it can't be used again
          this.deferredPrompt = null;
        });
      } else {
        // If running as installed PWA or can't install
        this.showInstallInstructions();
      }
    },
    
    showInstallInstructions() {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      const isChrome = /Chrome/.test(navigator.userAgent);
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      
      let instructions = '';
      
      if (isIOS && isSafari) {
        instructions = `
          <ol class="list-decimal pl-5 mb-4 space-y-2 text-sm">
            <li>Tap the share button <span class="inline-block px-2 py-1 bg-gray-200 rounded">⎙</span> at the bottom of your screen</li>
            <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
            <li>Tap <strong>Add</strong> in the top right corner</li>
          </ol>
        `;
      } else if (isAndroid && isChrome) {
        instructions = `
          <ol class="list-decimal pl-5 mb-4 space-y-2 text-sm">
            <li>Tap the menu button <span class="inline-block px-2 py-1 bg-gray-200 rounded">⋮</span> in the top right</li>
            <li>Tap <strong>Add to Home screen</strong></li>
            <li>Follow the prompts to install</li>
          </ol>
        `;
      } else {
        instructions = `
          <p class="mb-4 text-sm">To install this app:</p>
          <ol class="list-decimal pl-5 mb-4 space-y-2 text-sm">
            <li>Open this site in Chrome or Safari on your mobile device</li>
            <li>Access the browser's menu</li>
            <li>Select the option to add to home screen or install</li>
          </ol>
        `;
      }
      
      // Create the modal with installation instructions
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]';
      
      modal.innerHTML = `
        <div class="bg-white p-4 rounded-lg w-11/12 max-w-md">
          <h3 class="text-lg font-bold mb-2">Install Beelyt</h3>
          ${instructions}
          <button class="bg-green-500 text-white px-4 py-2 rounded w-full" id="close-modal">
            Got it
          </button>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Add click listener to close the modal
      modal.querySelector('#close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    },

    // --- Full Year Calendar Feature Methods ---

    habitCompletionYears(habit) {
      // Get all years from completedDates
      if (!habit || !habit.completedDates || habit.completedDates.length === 0) return [];
      const years = habit.completedDates.map(date => new Date(date).getFullYear());
      const minYear = Math.min(...years);
      const maxYear = Math.max(...years, new Date().getFullYear());
      const arr = [];
      for (let y = minYear; y <= maxYear; y++) arr.push(y);
      return arr;
    },
    selectFullCalendarYear(year) {
      this.selectedFullCalendarYear = year;
    },
    monthsOfYear(year, habit) {
      const now = new Date();
      if (year === now.getFullYear()) {
        return Array.from({length: now.getMonth() + 1}, (_, i) => i + 1);
      }
      return Array.from({length: 12}, (_, i) => i + 1);
    },
    blanksForMonth(year, month) {
      // 0=Sun, 1=Mon...
      const first = new Date(year, month - 1, 1);
      let day = first.getDay();
      day = day === 0 ? 7 : day; // Make Sunday=7
      return Array(day - 1).fill(0);
    },
    daysOfMonth(year, month) {
      const days = [];
      const last = new Date(year, month, 0).getDate();
      for (let d = 1; d <= last; d++) {
        const date = new Date(year, month - 1, d);
        const iso = date.toISOString().slice(0, 10);
        days.push({ day: d, date: iso });
      }
      return days;
    },

    // --- End Full Year Calendar Feature Methods ---
  },
  watch: {
    expandedHabitId(newVal) {
      // When opening a habit, set default year to latest
      if (newVal) {
        const habit = this.habits.find(h => h.id === newVal);
        const years = this.habitCompletionYears(habit);
        if (years.length) this.selectedFullCalendarYear = years[years.length - 1];
        else this.selectedFullCalendarYear = new Date().getFullYear();
      }
    },
    // ...existing code...
  },
  mounted() {
    // Load habits from localStorage if available
    const stored = localStorage.getItem('habits');
    if (stored) {
      this.habits = JSON.parse(stored);
    }
    
    // Check if running as PWA
    this.checkIfRunningAsPWA();
    
    // Listen for display-mode changes
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (evt) => {
      if (evt.matches) {
        this.isRunningAsPWA = true;
        this.canInstall = false;
      }
    });
    
    // Listen for the beforeinstallprompt event to detect if the app can be installed
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Save the event so it can be triggered later
      this.deferredPrompt = e;
      // Only show install button if not already running as PWA
      if (!this.isRunningAsPWA) {
        this.canInstall = true;
      }
    });
    
    // Listen for app installed event
    window.addEventListener('appinstalled', (evt) => {
      this.canInstall = false;
      this.showToast('Beelyt installed successfully!');
    });
    
    document.addEventListener('click', this.handleClickOutside, true);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside, true);
  }
}).mount('#app');