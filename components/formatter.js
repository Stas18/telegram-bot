module.exports = {
  /**
 * Экранирует специальные HTML-символы для безопасного отображения в Telegram
 * Преобразует: & → &amp;, < → &lt;, > → &gt;, " → &quot;, ' → &#039;
 * 
 * @param {string} text - Текст для экранирования
 * @returns {string} - Экранированный текст или пустая строка если входной текст пустой
 * 
 * @example
 * escapeHtml('<script>alert("xss")</script>') // возвращает "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
 * escapeHtml(null) // возвращает ""
 */
  escapeHtml: (text) => {
    if (!text) return '';
    return text.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  /**
 * Форматирует информацию о фильме для отображения в Telegram
 * Создает структурированное сообщение с данными о фильме и результатами голосования
 * 
 * @param {Object} meeting - Объект с основной информацией о встрече
 * @param {string} meeting.film - Название фильма
 * @param {string} meeting.director - Режиссер
 * @param {string} meeting.genre - Жанр
 * @param {string} meeting.country - Страна
 * @param {number} meeting.year - Год выпуска
 * @param {string} meeting.date - Дата встречи
 * @param {string} meeting.time - Время встречи
 * @param {string} meeting.place - Место встречи
 * @param {number} meeting.discussionNumber - Номер обсуждения
 * 
 * @param {Object} voting - Объект с результатами голосования
 * @param {string} voting.film - Название фильма (опционально, дублирует meeting.film)
 * @param {number} voting.average - Средняя оценка
 * @param {Object} voting.ratings - Объект с индивидуальными оценками
 * @param {number} Object.keys(voting.ratings).length - Количество оценок
 * 
 * @returns {string} - Отформатированная строка с информацией о фильме в HTML-формате
 * 
 * @example
 * formatMovieInfo(
 *   { film: "Матрица", director: "Вачовски", ... },
 *   { average: 8.5, ratings: { user1: 9, user2: 8 } }
 * )
 */
  formatMovieInfo: (meeting, voting) => {
    const filmInfo = voting.film ? { ...meeting, ...voting } : meeting;
    const ratingBlock = voting.average
      ? `│ ⭐ <b>Рейтинг:</b> ${voting.average.toFixed(1)}/10\n` +
      `│ 👥 <b>Оценок:</b> ${Object.keys(voting.ratings).length}\n` +
      `├───────────────\n`
      : '';

    const castBlock = filmInfo.cast ? `│ 👥 <b>В главных ролях:</b> ${filmInfo.cast}\n` : '';

    return `
🎬 <b>${filmInfo.film.toUpperCase()}</b>

📝 <b>О фильме:</b>
├────────────────
│ 🎥 <b>Режиссер:</b> ${filmInfo.director}
│ 🎭 <b>Жанр:</b> ${filmInfo.genre}
│ 🌎 <b>Страна:</b> ${filmInfo.country}
│ 📅 <b>Год:</b> ${filmInfo.year}
${castBlock}${ratingBlock}
🗓 <b>Дата встречи:</b> ${filmInfo.date}
⏰ <b>Время:</b> ${filmInfo.time}
📍 <b>Место:</b> ${filmInfo.place}

🔢 <b>Обсуждение №${filmInfo.discussionNumber}</b>
  `.trim();
  }
};
