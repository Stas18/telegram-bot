const filmsManager = require('./filmsManager');

/**
 * Менеджер для работы с историей фильмов (последний показанный фильм)
 * Обеспечивает совместимость со старой системой, где хранилась только последняя запись
 * Работает как прокси к filmsManager, ориентируясь на последний элемент массива
 */
const historyManager = {
  /**
   * Загружает последний фильм из истории (для обратной совместимости)
   * В старой системе хранился только текущий/последний фильм
   * 
   * @returns {Object|null} Объект последнего фильма или null если история пуста
   * @example
   * const lastFilm = historyManager.load();
   * if (lastFilm) {
   *   console.log(`Последний фильм: ${lastFilm.title}`);
   * }
   */
  load: () => {
    // Возвращаем последнюю запись для обратной совместимости
    const films = filmsManager.load();
    return films.length > 0 ? films[films.length - 1] : null;
  },

  /**
   * Сохраняет новую запись в историю фильмов
   * Добавляет запись в конец массива films (расширяет историю)
   * 
   * @param {Object} entry - Объект фильма для сохранения
   * @param {number} entry.discussionNumber - Номер обсуждения фильма
   * @param {string} entry.title - Название фильма
   * @param {string} entry.description - Описание фильма
   * @param {Date} entry.date - Дата показа фильма
   * @returns {Object} Сохраненный объект фильма
   * @example
   * const newFilm = { 
   *   discussionNumber: 5, 
   *   title: "Интерстеллар",
   *   date: "2024-12-01"
   * };
   * const savedFilm = historyManager.save(newFilm);
   */
  save: (entry) => {
    const films = filmsManager.load();
    films.push(entry);
    filmsManager.save(films);
    return entry;
  },

  /**
   * Обновляет последнюю запись в истории фильмов
   * Если история пуста - создает новую запись
   * Используется для модификации данных о текущем/последнем фильме
   * 
   * @param {Object} entry - Обновленные данные последнего фильма
   * @param {number} [entry.discussionNumber] - Номер обсуждения
   * @param {string} [entry.title] - Название фильма
   * @param {string} [entry.description] - Описание фильма
   * @param {Date} [entry.date] - Дата показа
   * @returns {Object} Обновленный объект фильма
   * @example
   * // Обновление последнего фильма
   * const updatedFilm = historyManager.update({
   *   title: "Обновленное название",
   *   description: "Новое описание"
   * });
   */
  update: function (entry) {
    const films = filmsManager.load();
    if (films.length > 0) {
      // Заменяем последнюю запись
      films[films.length - 1] = entry;
    } else {
      // Создаем первую запись если история пуста
      films.push(entry);
    }
    filmsManager.save(films);
    return entry;
  }
};

module.exports = historyManager;
