'use strict';

const { Telegraf } = require('telegraf');

let USERS = {};
let POLLS = {};
let POLLS_MESSAGES = {};

module.exports  = function (token, sets, menu) {
    const bot = new Telegraf(token);
    console.log('bot', token);

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
        const text = getPollResult(sets, menu);
        const invoice = getInvoice(menu);

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
        const text = getPollResult(sets, menu);

        ctx.reply(text, {
            parse_mode: 'HTML'
        });
    });

    return bot;
}

function getPollResult(sets, menu) {
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
            const price = calcPrice(list, sets, menu);
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

function calcPrice(list, sets, menu) {
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

function getInvoice(menu) {
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
