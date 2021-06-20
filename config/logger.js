
const {
    createLogger,
    transports,
    format
} = require('winston');
require('winston-mongodb');
//require('dotenv').config();
require('dotenv');

const winstonLogger = createLogger({
    transports: [
        
        new transports.MongoDB({
//            level: 'error',
            //db: process.env.MONGODB,
            //db: 'mongodb://localhost:27017/nodejs',
            db: process.env.MONGODB_FOR_NODEJS_LOG,
            options: {
                useUnifiedTopology: true
            },
            collection: 'logs',
            format: format.combine(format.timestamp(), format.json())
        })
    ]
});

// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
/* if (process.env.NODE_ENV !== 'production') {
    winstonLogger.add(new transports.Console({
      format: format.simple(),
    }));
   }
*/
module.exports = winstonLogger;