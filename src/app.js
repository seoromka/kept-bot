'use strict';

const { Telegraf } = require('telegraf');
const express = require('express');
const expressApp = express();

const TOKEN = process.env.TOKEN;
const PORT = process.env.PORT;
const URL = process.env.URL;

const bot = new Telegraf(TOKEN)

bot.telegram.setWebhook(URL + '/bot')
expressApp.use(bot.webhookCallback('/bot'));

expressApp.get('/', (req, res) => {
    res.send('bot');
});
expressApp.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

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
    {name: '🥗 Винегрет с опятами', price: 60, type: 'salad'},
    {name: '🥗 Салат с индейкой', price: 70, type: 'salad'},
    {name: '🥗 Салат с кальмаром и огурцом', price: 66, type: 'salad'},
    {name: '🍲 Уха ростовская', price: 85, type: 'soup'},
    {name: '🍲 Суп баварский', price: 80, type: 'soup'},
    {name: '🍲 Мисо-суп', price: 80, type: 'soup'},
    {name: '🍽 Спагетти Болоньезе', price: 122, type: 'plate_food'},
    {name: '🍽 Куриные котлетки', price: 132, type: 'plate_food'},
    {name: '🍽 Биточки из трески', price: 143, type: 'plate_food'},
    {name: '🍰 Красный бархат', price: 55, type: 'dessert'},
];

let USERS = {};//{1: {first_name: 'Test1'}, 2: {first_name: 'Test2'}, 3: {first_name: 'Test3'}}
let POLLS = {};//{1: {1: [0,3,6], 2: [1,3,5], 3: [0,3,6]}};
let POLLS_MESSAGES = {};

bot.on('poll_answer', (ctx) => {
    const { user, poll_id, option_ids } = ctx.pollAnswer;

    if (! POLLS[poll_id]) {
        POLLS[poll_id] = [];
    }

    POLLS[poll_id][user.id] = option_ids;
    USERS[user.id] = user;
});

bot.command('menu', (ctx) => {
    USERS = {}
    POLLS = {};

    const text = menu.map(({ name, price }) => `${name} (${price}руб.)`);

    ctx.telegram.sendPoll(ctx.message.chat.id, 'Что покушаем?', text, {
        is_anonymous: false,
        allows_multiple_answers: true,
    }).then(res => {
        POLLS_MESSAGES[ctx.message.chat.id] = res.message_id;
    });
});

bot.command('stop', (ctx) => {
    const text = getPollResult();
    const invoice = getInvoice();

    ctx.reply(text + "\n\n------------------\n☎ 32-12-03\n\n" + invoice, {
        parse_mode: 'HTML'
    });

    if (POLLS_MESSAGES[ctx.message.chat.id]) {
        ctx.telegram.stopPoll(ctx.message.chat.id, POLLS_MESSAGES[ctx.message.chat.id]);
        delete POLLS_MESSAGES[ctx.message.chat.id];
    }

    USERS = {}
    POLLS = {};
});

bot.command('result', (ctx) => {
    const text = getPollResult();

    ctx.reply(text, {
        parse_mode: 'HTML'
    });
});

//bot.launch();

function getPollResult() {
    const messages = [];

    for (let poll_id in POLLS) {
        let totalPrice = 0;
        for (let user_id in POLLS[poll_id]) {
            const list = POLLS[poll_id][user_id];
            if (list.length === 0) {
                continue;
            }
            const user = USERS[user_id];
            messages.push(`<b>${user.first_name} ${user.last_name ?? ''}</b> @${user.username}`)
            list.forEach(answer => {
                messages.push(`- ${menu[answer].name}`);
            });
            const price = calcPrice(list);
            totalPrice += price.value;
            messages.push(`Итого: ${price.value} руб. (${price.desc})\n`)
        }

        messages.push(`<b>Всего: ${totalPrice} руб.</b>`)
    }
    if (messages.length === 0) {
        messages.push('Вызови /menu');
    }

    return messages.join("\n");
}

function calcPrice(list) {
    const prices = [];
    const tmp = [];

    list.forEach(answer => {
        prices.push(menu[answer].price);
        tmp.push(menu[answer].type);
    });

    for (let i = sets.length - 1; i >= 0; i--) {
        const set = sets[i];
        if (compareArray(set.types, tmp)) {
            return {
                value: set.price,
                desc: set.name
            }
        }
    }

    return {
        value: prices.reduce((t, i) => t + i, 0),
        desc: prices.map(i => `${i} руб.`).join(' + '),
    };
}

function compareArray(a, b) {
    a.sort();
    b.sort();
    return a.length === b.length && a.every((v, i) => v === b[i])
}

function getInvoice() {
    const pull = [];

    for (let poll_id in POLLS) {
        for (let user_id in POLLS[poll_id]) {
            const list = POLLS[poll_id][user_id];
            let isPush =false;
            for (const key in pull) {
                let item = pull[key];
                if (compareArray(item.list, list)) {
                    item.users.push(user_id);
                    isPush = true;
                    break;
                }
            }

            if (! isPush) {
                pull.push({users: [user_id], list});
            }
        }
    }

    const messages = [];

    pull.forEach(({ users, list }) => {
        const names = users.map(user_id => {
            const user = USERS[user_id];
            return `${user.first_name} ${user.last_name ?? ''}`;
        });

        list.forEach(answer => {
            messages.push(`- ${menu[answer].name}`);
        });

        messages.push(`<b>Кол-во: ${users.length}</b> (${names.join(', ')})\n`);
    })

    return messages.join('\n');
}
