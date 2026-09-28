const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('mdsdata', 'Stock_now_user', 'Stock@n951', {
    host: '202.84.32.13',
  dialect: 'mysql' /* one of 'mysql' | 'mariadb' | 'postgres' | 'mssql' */,
          pool: {
            idle: 3000, // milliseconds
            evict: 1000, // milliseconds
        },
  dialectOptions:{
    useUTC: false,
    dateStrings: true,

    typeCast: function (field, next) {
        // console.log('sss')
      return next()
    }
  }
});

module.exports = sequelize;
