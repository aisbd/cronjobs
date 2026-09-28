require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

// Database configuration
const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'stocknow',
  logging: false, // Disabled SQL query logging
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Define Fundamentals model
const Fundamentals = sequelize.define('fundamentals', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  code: {
    type: DataTypes.CHAR(50),
    allowNull: false
  },
  meta_key: {
    type: DataTypes.CHAR(100),
    allowNull: false
  },
  meta_value: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  meta_value_a: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  meta_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  is_latest: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0,
    validate: {
      isIn: [[0, 1]]
    }
  }
}, {
  tableName: 'fundamentals',
  timestamps: true, // This will add createdAt and updatedAt
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define News model
const News = sequelize.define('news', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  market_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  instrument_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  prefix: {
    type: DataTypes.STRING(45),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  details: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  bn: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  post_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  expire_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  is_active: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1
  },
  updated: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isUpdated: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: Sequelize.NOW
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  notified: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1
  },
  trash: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0
  },
  processed: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'news',
  timestamps: false // We're handling timestamps manually with updated_at
});

// Define PartialNews model
const PartialNews = sequelize.define('partial_news', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  code: {
    type: DataTypes.STRING(45),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  parts: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  },
  post_date: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'partial_news',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Test the connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Connection to database has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

// Initialize database connection
// testConnection();

module.exports = {
  sequelize,
  Sequelize,
  DataTypes,
  Fundamentals,
  News,
  PartialNews
};
