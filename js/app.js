const { createApp, ref, computed } = Vue;

const app = createApp({
  setup() {
    const store = createHabitStore();
    const habits = ref(store.habits);
    const newHabit = ref({ name: '', frequency: 'Daily', completedDates: [], messages: [] });
    const showModal = ref(false);

    // Detail view state
    const showHabitDetail = ref(false);
    const selectedHabit = ref(null);
    const selectedDate = ref('');
    const messageInput = ref('');

    // Calendar state
    const today = new Date();
    const calendarMonth = ref(today.getMonth());
    const calendarYear = ref(today.getFullYear());

    const calendarMonthName = computed(() =>
      new Date(calendarYear.value, calendarMonth.value).toLocaleString('default', { month: 'long' })
    );

    function getDaysInMonth(year, month) {
      return new Date(year, month + 1, 0).getDate();
    }

    const calendarBlanks = computed(() => {
      const firstDay = new Date(calendarYear.value, calendarMonth.value, 1).getDay();
      return (firstDay === 0 ? 6 : firstDay - 1);
    });

    const calendarDates = computed(() => {
      const days = [];
      const daysInMonth = getDaysInMonth(calendarYear.value, calendarMonth.value);
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(calendarYear.value, calendarMonth.value, d);
        const iso = date.toISOString().split('T')[0];
        days.push({ day: d, date: iso });
      }
      return days;
    });

    // Add habit
    const addHabit = () => {
      if (newHabit.value.name) {
        store.addHabit(newHabit.value);
        habits.value = createHabitStore().habits;
        newHabit.value = { name: '', frequency: 'Daily', completedDates: [], messages: [] };
        showModal.value = false;
      }
    };

    // Toggle complete for main view
    const toggleComplete = (habit, date) => {
      store.toggleComplete(habit, date);
      habits.value = createHabitStore().habits;
    };

    const isHabitCompleted = (habit, date) => {
      return store.isHabitCompleted(habit, date);
    };

    // Detail view logic
    function openHabitDetail(habit) {
      selectedHabit.value = { ...habit };
      showHabitDetail.value = true;
      renameInput.value = habit.name;
      // Default to today
      const todayIso = new Date(calendarYear.value, calendarMonth.value, today.getDate()).toISOString().split('T')[0];
      selectedDate.value = todayIso;
      messageInput.value = '';
    }

    function closeHabitDetail() {
      showHabitDetail.value = false;
      selectedHabit.value = null;
      selectedDate.value = '';
      messageInput.value = '';
    }

    function toggleCompleteDetail(date) {
      store.toggleComplete(selectedHabit.value, date);
      habits.value = createHabitStore().habits;
    }

    function sendMessage() {
      const text = messageInput.value.trim();
      if (text) {
        store.addMessage(selectedHabit.value, text);
        habits.value = createHabitStore().habits;
        messageInput.value = '';
      }
    }

    function getMessages(habit) {
      return store.getMessages(habit);
    }

    const safeMessages = computed(() => {
      const msgs = getMessages(selectedHabit.value);
      return Array.isArray(msgs) ? msgs.slice(0, 4) : [];
    });

    function formatTimestamp(ts) {
      const d = new Date(ts);
      return d.toLocaleString();
    }

    function prevMonth() {
      if (calendarMonth.value === 0) {
        calendarMonth.value = 11;
        calendarYear.value -= 1;
      } else {
        calendarMonth.value -= 1;
      }
    }

    function nextMonth() {
      if (calendarMonth.value === 11) {
        calendarMonth.value = 0;
        calendarYear.value += 1;
      } else {
        calendarMonth.value += 1;
      }
    }

    const renaming = ref(false);
    const renameInput = ref('');

    function confirmRename() {
      const newName = renameInput.value.trim();
      if (newName && selectedHabit.value.name !== newName) {
        store.renameHabit(selectedHabit.value.id, newName);
        habits.value = createHabitStore().habits;
        selectedHabit.value.name = newName;
      }
    }

    function deleteHabit() {
      if (confirm('Are you sure you want to delete this habit?')) {
        store.deleteHabit(selectedHabit.value.id);
        habits.value = createHabitStore().habits;
        closeHabitDetail();
      }
    }

    const last7Days = computed(() => {
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
});

    function getLast7Days() {
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
    }

    return {
      habits,
      newHabit,
      showModal,
      addHabit,
      toggleComplete,
      isHabitCompleted,
      getLast7Days,
      last7Days,
      // Detail view
      showHabitDetail,
      selectedHabit,
      openHabitDetail,
      closeHabitDetail,
      calendarMonth,
      calendarYear,
      calendarMonthName,
      calendarBlanks,
      calendarDates,
      selectedDate,
      toggleCompleteDetail,
      messageInput,
      sendMessage,
      getMessages,
      safeMessages,
      formatTimestamp,
      prevMonth,
      nextMonth,
      // Rename and delete
      renameInput,
      confirmRename,
      deleteHabit,
    };
  },
}).mount('#app');