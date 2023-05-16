require('dotenv').config()
const Sequelize = require('sequelize');
const runelite = require('runelite');
const db = require('./db')
const notifications = require("./notification")
const useragent = "Price Checker for price drops (DEV)";

itemsMap = {}

f2pIcon = '\u{1F193}';
p2pIcon = '\u{1F4B0}';

lastMessageIds = {}
notifyTimeOut = (process.env.NOTIFY_TIME_OUT * 60 * 60) * 1000

async function main() {

    await db.sync()
    await setupMap()
    await db.initDB()

    // This function will be on loop every 5 minutes i guess
    setInterval(doRun, (60 * 1000) * process.env.CHECK_EVERY_MIN)
    await doRun()
}

async function setupMap() {
    // Fetch all items base info so we know the name of the item
    itemsMap = await runelite.mapping({
        useragent,
    });
}

async function doRun() {
    const itemList = await getLatestPrices()

    const itemMap = itemList.reduce((acc, obj) => {
        acc[obj.itemId] = obj;
        return acc;
    }, {});

    // Find price difference!
    averagePrices = await db.getAverage()
    await searchPriceDrop(averagePrices, itemMap)
    await insertPrices(itemList)
    await cleanUp();
}

async function searchPriceDrop(averagePrices, latestPrices) {

    for (const averagePrice of averagePrices) {
        avg = Number(averagePrice["dataValues"]["averageLow"])
        count = averagePrice["dataValues"]["COUNT"]
        itemId = averagePrice["dataValues"]["itemId"]

        currentPrice = latestPrices[itemId].low
        percentage = calculatePercentageDifference(avg, currentPrice)
        margin = avg - currentPrice;
        buyLimit = itemsMap[itemId].limit

        if (avg > currentPrice && percentage > process.env.PERCENTAGE && count > process.env.MINIMUM_COUNT && margin >= process.env.MARGIN && buyLimit >= process.env.BUY_LIMIT) {
            icon = getIcon(itemId)
            url = "https://platinumtokens.com/item/" + itemsMap[itemId].name.replaceAll(" ", "-").toLowerCase()
            msg = `<a href="${url}">${itemsMap[itemId].name} ${icon}</a>\n<B>AVG:</B> ${avg.toFixed(2)}\n<B>Price:</B> ${currentPrice}\n<B>Percentage:</B> ${percentage.toFixed(2)}%\n<B>Count: </B>${count}`

            data = {
                url: url,
                name: itemsMap[itemId].name,
                icon: icon, avg: avg.toFixed(2),
                currentPrice: currentPrice,
                percentage: percentage.toFixed(2),
                count: count
            }

            // notify!
            if (!checkItemTimeout(itemId)) {
                notifications.sendDiscordMessage(data);
                console.log(`Item is members: ${itemsMap[itemId].members}`)
                if (itemsMap[itemId].members) {
                    notifications.sendMessage(process.env.TELEGRAM_P2P_CHAT, msg)
                } else {
                    notifications.sendMessage(process.env.TELEGRAM_F2P_CHAT, msg)
                }
                console.log(msg)
                lastMessageIds[itemId] = { time: Date.now() }
            } else {
                console.log(`Already notified about ${itemsMap[itemId].name}`)
            }
        }
    }
}

function getIcon(itemId) {
    if (itemsMap[itemId].members) {
        return p2pIcon
    } else {
        return f2pIcon
    }
}

function checkItemTimeout(itemId) {
    if (lastMessageIds[itemId]) {
        return Date.now() - lastMessageIds[itemId].time < notifyTimeOut
    } else {
        return false;
    }

}

function calculatePercentageDifference(oldValue, newValue) {
    const diff = Math.abs(newValue - oldValue);
    const percentageDiff = (diff / oldValue) * 100;
    return percentageDiff;
}

async function insertPrices(itemList) {
    await db.prices.bulkCreate(itemList, { ignoreDuplicates: true, logging: false, })
}

async function cleanUp() {
    const cutoffDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
    const result = await db.prices.destroy({
        where: {
            lowTime: {
                [Sequelize.Op.lt]: cutoffDate
            }
        },
        returning: true
    });
    const numRowsDeleted = result[0];
    console.log(`${numRowsDeleted} rows were deleted.`);
}

async function getLatestPrices() {
    const latest = await runelite.latest({
        useragent,
    });

    const itemList = []

    for (const [itemId, obj] of Object.entries(latest)) {
        if (obj.low) {
            itemList.push({ itemId: itemId, lowTime: obj.lowTime * 1000, low: obj.low })
        }
    }
    return itemList;
}


main();