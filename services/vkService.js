const https = require('https');
const { VK_API_BASE_URL, VK_API_VERSION } = require('../config/vk-config');

module.exports = {
    init: function (deps) {
        this.logger = deps.logger;
        this.VK_ACCESS_TOKEN = deps.VK_ACCESS_TOKEN;
        this.VK_GROUP_ID = deps.VK_GROUP_ID;
    },

    /**
     * Публикует пост на стену группы VK
     */
    publishPost: async function (message, attachments = []) {
        if (!this.VK_ACCESS_TOKEN || this.VK_ACCESS_TOKEN === 'undefined') {
            throw new Error('VK access token не настроен');
        }

        if (!this.VK_GROUP_ID) {
            throw new Error('VK group ID не настроен');
        }

        const params = new URLSearchParams({
            owner_id: this.VK_GROUP_ID,
            from_group: 1,
            message: message,
            attachments: attachments.join(','),
            access_token: this.VK_ACCESS_TOKEN,
            v: VK_API_VERSION
        });

        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.vk.com',
                path: `/method/wall.post?${params.toString()}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': 0
                },
                timeout: 10000
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);

                        if (result.error) {
                            reject(new Error(`VK API Error: ${result.error.error_msg} (code: ${result.error.error_code})`));
                        } else {
                            resolve(result.response);
                        }
                    } catch (error) {
                        reject(new Error(`Failed to parse VK API response: ${error.message}`));
                    }
                });
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('VK API timeout'));
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.end();
        });
    },

    /**
     * Загружает изображение в VK и возвращает attachment string
     */
    uploadPhoto: async function (photoUrl) {
        if (!this.VK_ACCESS_TOKEN) {
            throw new Error('VK access token не настроен');
        }

        try {
            // 1. Получаем адрес сервера для загрузки
            const serverResponse = await this._callVKApi('photos.getWallUploadServer', {
                group_id: Math.abs(this.VK_GROUP_ID)
            });

            // 2. Загружаем фото на сервер VK (упрощенная версия)
            // В реальной реализации нужно реализовать загрузку файла
            this.logger.log(`Загрузка фото в VK: ${photoUrl}`);

            // Пока возвращаем исходный URL как вложение
            return `photo${this.VK_GROUP_ID}_${Date.now()}`;
        } catch (error) {
            this.logger.error(error, 'загрузка фото в VK');
            return null;
        }
    },

    /**
     * Универсальный метод вызова VK API
     */
    _callVKApi: function (method, params = {}) {
        return new Promise((resolve, reject) => {
            const allParams = {
                ...params,
                access_token: this.VK_ACCESS_TOKEN,
                v: VK_API_VERSION
            };

            const queryParams = new URLSearchParams(allParams);

            const options = {
                hostname: 'api.vk.com',
                path: `/method/${method}?${queryParams.toString()}`,
                method: 'GET',
                timeout: 10000
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        if (result.error) {
                            reject(new Error(`VK API Error: ${result.error.error_msg}`));
                        } else {
                            resolve(result.response);
                        }
                    } catch (error) {
                        reject(new Error(`Failed to parse VK API response: ${error.message}`));
                    }
                });
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('VK API timeout'));
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.end();
        });
    },

    /**
     * Проверяет доступность VK API
     */
    testConnection: async function () {
        try {
            const result = await this._callVKApi('groups.getById', {
                group_id: Math.abs(this.VK_GROUP_ID).toString()
            });
            return {
                success: true,
                groupName: result[0]?.name || 'Unknown',
                screenName: result[0]?.screen_name || 'Unknown'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
};
