import { createLogger, format, transports } from 'winston';
const { combine, timestamp, printf } = format;

const initLogger = () => {

    const customFormat = printf(({level, message, label, timestamp}) => {
        const customLabel = label ? `[${label}]` : '';
        return `${timestamp} ${level}: ${customLabel} ${message}`;
    });

    const logger = createLogger({
        format: combine(timestamp(), customFormat, format.colorize()),
        transports: [
            new transports.Console({format: combine(timestamp(), customFormat)})
        ],
        exceptionHandlers: [
            new transports.Console({level: 'error', format: combine(timestamp(), customFormat)})
        ],
        exitOnError: false,
    });

    global.logger = logger;
};


export default initLogger();


