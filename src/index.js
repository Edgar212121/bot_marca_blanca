import express from 'express';
import 'dotenv/config';
import "./services/Logger";
import { connectDatabase } from './connectDB';
import routes from './routes';
import StatusWorker from './services/StatusWorker';
import { bot, initBot } from './bot';

const app = express();

var log = console.log;
console.log = function () {
    var first_parameter = arguments[0];
    var other_parameters = Array.prototype.slice.call(arguments, 1);

    function formatConsoleDate (date) {
        var hour = date.getHours();
        var minutes = date.getMinutes();
        var seconds = date.getSeconds();
        var milliseconds = date.getMilliseconds();

        return '[' +
               ((hour < 10) ? '0' + hour: hour) +
               ':' +
               ((minutes < 10) ? '0' + minutes: minutes) +
               ':' +
               ((seconds < 10) ? '0' + seconds: seconds) +
               '.' +
               ('00' + milliseconds).slice(-3) +
               '] ';
    }
    log.apply(console, [formatConsoleDate(new Date()) + first_parameter].concat(other_parameters));
};

app.use('/', routes);

app.use(bot.webhookCallback(`/${process.env.API_BOT_KEY}`));

app.listen(process.env.APP_PORT, async () => {
  logger.info(`Server listening on ${process.env.APP_HOST}:${process.env.APP_PORT}`);
  await initBot();
  await connectDatabase(process.env.DB_HOST, process.env.DB_PORT, process.env.DB_NAME);
  await StatusWorker.run();
});

process.on('uncaughtException', (err) => {

  logger.error(`message: ${err.message} stack: ${err.stack}`, () => {
    process.exit(1);
  });

});
