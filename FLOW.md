# Telegram bot workflow 
Technologies:
- Express
- Telegraf
- MongoDB
- Redis

Express is used to create the web server. It implements a single API method for determining users IP address.
MongoDB is used to store information about users, users IP addresses and transactions.
Redis is used to store user sessions; they contain information about the user's current exchange.
Telegraf framework is used to use Telegram API.

Scene is the key concept of the bot. By using scenes, we guide the user through the steps of the exchange, we are able to move through the stages of the exchange, both forward and backward, remember the current stage for the user, exit the exchange and start it again.

Next will be a description of the scenes (stages of the bot):

### read

The first scene after the bot starts, displays a message about the need to read Terms of Use of the exchange. On the keyboard, the user has one button `Read`, to go to the next scene. At this scene, the user is identified. If it is a new user, he is stored in the database. A session is created for the user.

### start

The scene starts after pressing the `Read` button, a message about the need to agree to the conditions is sent to the user with a link to the Terms of Use of the exchange bot. Clicking on the link is mandatory, otherwise it is impossible to continue and start exchanging. When clicking on the link, a GET request is sent to the express server along the path `/ user-ip /: id`, where `id` is the unique user ID in Telegram. From the request parameters (`request`), the user IP data is read and stored in the table `Visit` in database and associated with the user. After that, in the browser the user is redirected to the address specified in the `REDIRECT_URL` variable. A message is sent to the Telegram about the possibility to start an exchange and a button, which will transfer to the first currency exchange scene – scene of currency 'from' selection.

### currFrom

At the beginning of the scene, a request is made to the ChangeNOW API to get available currencies for exchange:
```
GET: /currencies?active=true
```
Received currencies are cached in the user's session. A message is sent to the chat about choosing a currency to exchange, a keyboard appears with popular currencies. The user selects the currency by pressing the button or by entering a ticker of the desired currency. The received ticker is validated, in case of an error a message is displayed. The scene waits until a valid currency ticker is entered. After selecting the 'from' currency, a request is made for the transfer of full information on the 'from' currency using CN API:
```
GET: /currencies/:ticker
```
Currency information is stored in the user session, the transition to the currency 'to' selection scene takes place.

### curTo

A message about choosing the currency 'to' is sent to the chat, a keyboard with popular currencies appears. If the chosen currency 'from' is in popular category, the button will be checked. The principle of currency 'to' selection is similar to the previous scene. The ticker is validated, information on currency 'to' is requested. Next, the possibility of exchanging a pair from-to is checked. By using CN API, the pairs available for exchange are requested:
```
GET: /market-info/available-pairs/
```
If the pair is not avaialable for exchange, the user is prompted to select the currency 'to' again. If successful, the amount to enter scene is launched.

### amount

A request is made for the minimum amount for an exchange pair:
```
GET: /min-amount/from_to
```
A message is displayed to the user with a minimum amount for exchange and a proposal to enter the amount. The scene expects a valid integer or float to be entered, which must be at least equal to the minimum amount. If the entered amount is invalid, an error message is sent to the user.
A keyboard with buttons is displayed: return to the previous step, complete the exchange, and write to support.
If the amount is successfully entered, the user goes to the address input scene.

### estimateExchange

At the beginning of the scene, a request is made for the expected amount that the user will receive.
```
GET: /exchange-amount/amount/from_to
```
A message is displayed to the user with the amount and a proposal to enter the recipient address.
The scene expects an address for the currency 'to', it is validated for only English letters and numbers.
After entering and validating the address, it is saved in the session and a transition to the transaction data confirmation scene takes place.

### addInfo

In this scene, the need to enter an extra id for the currency 'to' is checked. The principle of proccess is similar to the scene of the input address. If the field is not required, control immediately passes to the next scene.


### checkAgree

The final scene of creating an exchange.
At the beginning, a message with data to create a transaction is displayed to the user. The user confirms the creation of the transaction by pressing the `Confirm` button. A request is sent to create a transaction to CN API:
```
POST: /transactions/api_key

request params: 
{
  userId,
  amount,
  extraId,
  ip,
  from,
  to,
  address
}

```
The created transaction is saved to the database, a connection between the transaction and the user is created.
Messages are sent to the user with transaction information.
In case of a request error, a transaction creation error message is displayed, the user returns to the previous scene.


The StatusWorker object is responsible for checking statuses and notifications of status changes. At specified intervals, it checks the status of transactions whose status is not completed. Check workflow:
1. Take a transaction from the database
2. Send a request to CN API:
    ```
    GET: /transactions/:transaction_id
    ```
3. Compare the status of the received transaction information with the one in the database
4. If the status has changed, we update the transaction information, the user is notified about the status change, the transaction data is updated.  
   If the status has not changed after the specified interval, repeat from step 1.
5. Repeat from step 1, until the transaction status is  `confirming`, `exchanging`, `sending` or `waiting`.

When the user clicks the `Start new exchange` button, the process begins with the `curTo` scene.

