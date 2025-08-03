function createHabitStore() {
  let habits = getFromLocalStorage('habits', []);

  function addHabit(habit) {
    habits.push({ id: Date.now(), ...habit, important: false, completedDates: [], messages: [] });
    saveToLocalStorage('habits', habits);
  }

  function updateHabit(updatedHabit) {
    habits = habits.map(h => (h.id === updatedHabit.id ? { ...updatedHabit, important: updatedHabit.important ?? false } : h));
    saveToLocalStorage('habits', habits);
  }

  function toggleImportant(habit) {
    habit.important = !habit.important;
    updateHabit(habit);
  }

  function toggleComplete(habit, date) {
    const completedDates = habit.completedDates || [];
    if (completedDates.includes(date)) {
      habit.completedDates = completedDates.filter(d => d !== date);
    } else {
      habit.completedDates = [...completedDates, date];
    }
    updateHabit(habit);
  }

  function isHabitCompleted(habit, date) {
    return habit.completedDates.includes(date);
  }

  function addMessage(habit, text) {
    if (!habit.messages) habit.messages = [];
    habit.messages.unshift({ text, timestamp: Date.now() });
    updateHabit(habit);
  }

  function getMessages(habit) {
    return Array.isArray(habit?.messages) ? habit.messages : [];
  }

  function deleteHabit(habitId) {
    habits = habits.filter(h => h.id !== habitId);
    saveToLocalStorage('habits', habits);
  }

  function renameHabit(habitId, newName) {
    habits = habits.map(h => h.id === habitId ? { ...h, name: newName } : h);
    saveToLocalStorage('habits', habits);
  }

  return {
    habits,
    addHabit,
    updateHabit,
    toggleComplete,
    isHabitCompleted,
    addMessage,
    getMessages,
    deleteHabit,
    renameHabit,
    toggleImportant
  };
}