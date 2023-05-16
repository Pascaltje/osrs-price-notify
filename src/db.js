const { Sequelize, DataTypes, Op } = require('sequelize');


const sequelize = new Sequelize(process.env.DB_DATABASE, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT /* one of 'mysql' | 'postgres' | 'sqlite' | 'mariadb' | 'mssql' | 'db2' | 'snowflake' | 'oracle' */
});

const prices = sequelize.define('prices', {
    // Model attributes are defined here
    itemId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    lowTime: {
        type: DataTypes.DATE,
        allowNull: false
    },
    low: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    // Other model options go here
    indexes: [{
        unique: true,
        fields: ['itemId', 'lowTime']
    }]
});

async function getAverage() {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const result = await prices.findAll({
        attributes: ['itemId', [sequelize.fn('avg', sequelize.col('low')), 'averageLow'], [sequelize.fn('count', sequelize.col('low')), 'COUNT']],
        where: {
            lowTime: {
                [Op.gt]: twentyFourHoursAgo
            }
        },
        group: ['itemId']
    });
    return result;

}

async function initDB() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

async function sync() {
    try {
        await sequelize.sync()
        console.log('Database successfully synchronized!');
    } catch (error) {
        console.error('Unable to sync the database:', error);
    }
}


async function close() {
    await sequelize.close();
}




module.exports = {
    initDB: initDB,
    sync: sync,
    prices: prices,
    getAverage: getAverage,
    close: close
};