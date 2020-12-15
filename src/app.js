'use strict';

const express = require('express');
const expressApp = express();

const TOKEN = process.env.TOKEN;
const PORT = process.env.PORT;
const URL = process.env.URL;

const sets = [
    {
        name: 'Сет №1',
        price: 189,
        types: ['salad', 'plate_food'],
    },
    {
        name: 'Сет №2',
        price: 239,
        types: ['salad', 'plate_food', 'soup'],
    }
];

const menu = [
    {name: '🥗 !Салат из овощей булгуром', price: 66, type: 'salad'},
    {name: '🥗 Салат коул-слоу с индейкой', price: 65, type: 'salad'},
    {name: '🥗 Сельдь хрустящий', price: 60, type: 'salad'},
    {name: '🍲 Борщ с курицей', price: 75, type: 'soup'},
    {name: '🍲 Гороховый суп с копченостями', price: 75, type: 'soup'},
    {name: '🍲 Мисо-суп', price: 80, type: 'soup'},
    {name: '🍽 Жареная куриная грудинка', price: 138, type: 'plate_food'},
    {name: '🍽 Жаркое из свинины', price: 145, type: 'plate_food'},
    {name: '🍽 Пельмени из трески', price: 146, type: 'plate_food'},
    {name: '🍰 Красный бархат', price: 55, type: 'dessert'},
];

const bot = require('./bot')(TOKEN, sets, menu);

bot.telegram.setWebhook(URL + '/bot')
expressApp.use(bot.webhookCallback('/bot'));

expressApp.get('/', (req, res) => {
    res.send('bot');
});

expressApp.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
