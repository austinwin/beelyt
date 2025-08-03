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
        navigator.share(shareData)
          .then(() => {
            // Show success message
            this.showToast('Shared successfully!');
          })
          .catch(error => {
            console.error('Error sharing:', error);
            this.fallbackShare();
          });
      } else {
        // Fallback for browsers that don't support the Web Share API
        this.fallbackShare();
      }
    },
    // Fallback sharing method
    fallbackShare() {
      // Create a temporary input to copy the URL
      const dummy = document.createElement('input');
      document.body.appendChild(dummy);
      dummy.value = window.location.href;
      dummy.select();
      document.execCommand('copy');
      document.body.removeChild(dummy);
      
      this.showToast('URL copied to clipboard! Share it with your friends.');
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
  },
  mounted() {
    // Load habits from localStorage if available
    const stored = localStorage.getItem('habits');
    if (stored) {
      this.habits = JSON.parse(stored);
    }
    document.addEventListener('click', this.handleClickOutside, true);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside, true);
  }
}).mount('#app');
