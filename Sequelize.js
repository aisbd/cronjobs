const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('stocknow', 'root', 'nevergonnagetit', {
  host: '10.10.0.10',
  dialect: 'mysql' ,/* one of 'mysql' | 'mariadb' | 'postgres' | 'mssql' */
   timezone: '+06:00', // for writing to database
    logging: false ,// disable logging
  dialectOptions:{
    // useUTC: false,
    dateStrings: true,

    typeCast: function (field, next) {
        // console.log('sss')
      return next()   
    }
  }
});

sequelize.define('Filter', {}, {underscored: true});

sequelize.define('instrument', {
  code: {
    type: DataTypes.STRING,
    allowNull: false
  },     
  circuit_down: {
    type: DataTypes.FLOAT,
    allowNull: false
  },      
  circuit_up: {
    type: DataTypes.FLOAT,
    allowNull: false
  },        
  floor: {
    type: DataTypes.FLOAT,
    allowNull: false
  },      

}, {underscored: true, timestamps: false});

sequelize.define('correlation', {
  code: {
    type: DataTypes.STRING,
    allowNull: false
  },    
  correlation: {
    type: DataTypes.STRING,
    allowNull: false
  },  
  value: {
    type: DataTypes.DOUBLE,
    allowNull: false
  },  
}, {underscored: true, timestamps: false});

sequelize.define('Mismatch', {
  // Model attributes are defined here
  code: {
    type: DataTypes.STRING,
    allowNull: false
  },
  meta: {
    type: DataTypes.STRING
    // allowNull defaults to true
  },
  dse: {
    type: DataTypes.STRING
    // allowNull defaults to true
  },
  stocknow: {
    type: DataTypes.STRING
    // allowNull defaults to true
  },
  approved: {
    type: DataTypes.STRING
    // allowNull defaults to true
  },

}, {
    underscored: true
  // Other model options go here
});

module.exports = sequelize;