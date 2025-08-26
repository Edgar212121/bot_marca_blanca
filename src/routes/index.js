import express from 'express';
import { bot, session } from './../bot';
import { getIpAction } from '../helpers';
import { messages } from '../messages';
import path from "path";
import { keyboards } from '../keyboards';

const routes = express.Router();

const getHandle = async (req, res) => {

  await getIpAction(req);

  await bot.telegram.sendMessage(
    req.params.id,
    messages.agreed,
    keyboards.getReplyKeyboard()
  );

  const sessionKey = `${req.params.id}:${req.params.id}`;

  const currSession = await session.getSession(sessionKey);

  await session.saveSession(sessionKey, { ...currSession, listenPressButton: true });

  res.redirect(302, process.env.REDIRECT_URL);
};

const getTestHandle = async (req, res) => {
  res.send(200, "it works");
};

routes.get('/user-ip/:id', getHandle);
routes.get('/test/', getTestHandle);
routes.get('*', (req, res) => {
  res.sendFile(path.join(__dirname + '/../../public/404.html'));
});

export default routes;
