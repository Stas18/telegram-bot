const { DEFAULT_POST_TEMPLATE } = require('../config/vk-config');

module.exports = {
    /**
     * Форматирует данные встречи в текст поста для VK
     */
    formatPostContent: function (meetingData) {
        const {
            film = 'Не указано',
            director = 'Не указано',
            year = 'Не указано',
            genre = 'Не указано',
            country = 'Не указано',
            cast = '',
            date = 'Не указано',
            time = 'Не указано',
            place = 'Не указано',
            discussionNumber = 'Не указано'
        } = meetingData;

        // Определяем день недели
        const dayOfWeek = this.getDayOfWeek(date);

        // Форматируем информацию о актерах, если она есть
        const formattedCast = cast ?
            `В главных ролях: ${cast}\n\n` :
            '';

        return DEFAULT_POST_TEMPLATE
            .replace('{discussionNumber}', discussionNumber)
            .replace('{date}', date)
            .replace('{dayOfWeek}', dayOfWeek)
            .replace('{film}', film)
            .replace('{director}', director)
            .replace('{year}', year)
            .replace('{genre}', genre)
            .replace('{country}', country)
            .replace('{cast}', formattedCast)
            .replace('{place}', place)
            .replace('{time}', time);
    },

    /**
     * Определяет день недели по дате
     */
    getDayOfWeek: function (dateString) {
        const days = ['ВОСКРЕСЕНЬЕ', 'ПОНЕДЕЛЬНИК', 'ВТОРНИК', 'СРЕДА', 'ЧЕТВЕРГ', 'ПЯТНИЦА', 'СУББОТА'];

        try {
            const [day, month, year] = dateString.split('.');
            const date = new Date(`${year}-${month}-${day}`);
            return days[date.getDay()] || 'ДЕНЬ';
        } catch (error) {
            return 'ДЕНЬ';
        }
    },

    /**
     * Валидирует данные встречи для публикации
     */
    validateMeetingData: function (meetingData) {
        const requiredFields = ['film', 'director', 'date', 'time', 'place', 'discussionNumber'];
        const missingFields = requiredFields.filter(field => !meetingData[field] || meetingData[field] === 'Не указано');

        if (missingFields.length > 0) {
            return {
                valid: false,
                missingFields: missingFields
            };
        }

        return {
            valid: true,
            missingFields: []
        };
    }
};
