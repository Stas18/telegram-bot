// Псевдоним для filmsManager для обратной совместимости
const filmsManager = require('./filmsManager');

const historyManager = {
  load: () => {
    // Возвращаем последнюю запись для обратной совместимости
    const films = filmsManager.load();
    return films.length > 0 ? films[films.length - 1] : null;
  },
  
  // Сохраняем как новую запись в films
  save: (entry) => {
    const films = filmsManager.load();
    films.push(entry);
    filmsManager.save(films);
    return entry;
  },
  
  // Обновляем последнюю запись
  update: function(entry) {
    const films = filmsManager.load();
    if (films.length > 0) {
      films[films.length - 1] = entry;
    } else {
      films.push(entry);
    }
    filmsManager.save(films);
    return entry;
  }
};

module.exports = historyManager;