module.exports = {
  escapeHtml: (text) => {
    if (!text) return '';
    return text.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  formatMovieInfo: (meeting, voting) => {
    const filmInfo = voting.film ? { ...meeting, ...voting } : meeting;
    const ratingBlock = voting.average
      ? `│ ⭐ <b>Рейтинг:</b> ${voting.average.toFixed(1)}/10\n` +
      `│ 👥 <b>Оценок:</b> ${Object.keys(voting.ratings).length}\n` +
      `├───────────────\n`
      : '';

    return `
🎬 <b>${filmInfo.film.toUpperCase()}</b>

📝 <b>О фильме:</b>
├────────────────
│ 🎥 <b>Режиссер:</b> ${filmInfo.director}
│ 🎭 <b>Жанр:</b> ${filmInfo.genre}
│ 🌎 <b>Страна:</b> ${filmInfo.country}
│ 📅 <b>Год:</b> ${filmInfo.year}
│ 📖 <b>Описание:</b> ${filmInfo.description || ' '}
${ratingBlock}
🗓 <b>Дата встречи:</b> ${filmInfo.date}
⏰ <b>Время:</b> ${filmInfo.time}
📍 <b>Место:</b> ${filmInfo.place}

🔢 <b>Обсуждение №${filmInfo.discussionNumber}</b>
    `.trim();
  }
};
