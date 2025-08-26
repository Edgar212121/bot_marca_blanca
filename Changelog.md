# Upgrades:

## 2.0.0 -> 2.0.1: 2022-04-26

1) fix for missing network in one of currencies; 

2) add amplitude analytics; env: AMPLITUDE_API_KEY

3) customized allCurrencies link. env: 
CURRENCIES_LIST_LINK=https://changenow.io/currencies


## 1.0.0 -> 2.0.0: 2022-04-22
### Stack changes:
*upgrade: module versions

+add: eslint

+add: timestamps to log file

### Bottleneck and stability solutions:
+change: transaction status check lasts first 3 hours only;

+add: provide http://changenow.io/currencies link on start of exchange;

+fix: resolve bottleneck with bot stopping;

+fix: prevent reaching telegram spam limits; bot will not send more than 20 messages per second;

+fix: prevent bot crash if user deleted ot has blocked our bot;

+add "/pleasedontdie" endpoint for bot_health monitoring;

### UEx improvements:
+fix: allow numbers in currency names ("USDTERC20");

+add: allow multiple search results. Example: "usdt" query was leading to Omni. now it shows USDT on all possible networks;

+add: fuzzy search of currencies. From now on we support typos in currency names

+add: provide link "/status_[tran_id]" to user, so user can click and ping tran status in the future;

*fix: "back" buton on currency_to cene;


### Onboarding after long offline:
+change: allow users to start exchange without forced visit to Terms Of Service;

+add: notify users with "sorry i was offline" if we see messages in past months. only last day messages are processed;
