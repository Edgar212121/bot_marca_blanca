import rp from 'request-promise';
import { string_similarity, isAvailableCurr } from './helpers';

const _apiRequest = async options => {
  try {
    options = {
      ...options,
      headers: options.headers || { 'Content-Type': 'application/json' },
      json: options.json || true,
      method: options.method || 'GET',
    };

    logger.info({
      label: `${options.method}`,
      message: `${options.uri}`,
    });

    return await rp(options);
  } catch (err) {
    logger.error(err);
  }
};

const _apiRequestUnsafe = async options => {
  try {
    options = {
      ...options,
      headers: options.headers || { 'Content-Type': 'application/json' },
      json: options.json || true,
      method: options.method || 'GET',
    };

    logger.info({
      label: `${options.method}`,
      message: `${options.uri}`,
    });

    return await rp(options);
  } catch (err) {
    logger.error(err);
    throw err;
  }
};

export const getAllCurrencies = async () => {
  const options = {
    uri: `${process.env.CN_API_URL}/currencies?active=true?api_key=${process.env.CN_API_KEY}`,
    headers: {
      'Content-Type': 'application/json'
    },
    json: true
  };

  return await _apiRequest(options);
};

export const getPairs = async () => {
  const options = {
    uri: `${process.env.CN_API_URL}/market-info/available-pairs/?api_key=${process.env.CN_API_KEY}`,
  };

  return await _apiRequest(options);
};

export const getMinimumDepositAmount = async pair => {
  const options = {
    uri: `${process.env.CN_API_URL}/min-amount/${pair}?api_key=${process.env.CN_API_KEY}`,
  };

  return await _apiRequest(options);
};

export const getCurrInfo = async cur => {
  const options = {
    uri: `${process.env.CN_API_URL}/currencies/${cur}?api_key=${process.env.CN_API_KEY}`,
  };

  return await _apiRequest(options);
};

export const getExchAmount = async (amount, fromTo) => {
  const options = {
    uri: `${process.env.CN_API_URL}/exchange-amount/${amount}/${fromTo}?api_key=${process.env.CN_API_KEY}`,
  };
  try {
    return await _apiRequestUnsafe(options);
  }
  catch (e) {
    logger.error("err:" + e.message);
    return e.message
  }

};

export const sendTransactionData = async data => {
  const options = {
    method: 'POST',
    uri: `${process.env.CN_API_URL}/transactions/${process.env.CN_API_KEY}`,
    body: data,
  };

  return await _apiRequest(options);
};

export const getTransactionStatus = async id => {
  const options = {
    uri: `${process.env.CN_API_URL}/transactions/${id}/${process.env.CN_API_KEY}`,
  };

  return await _apiRequest(options);
};

class ContentApi {
  constructor(apiUrl) {
    if (ContentApi.instance instanceof ContentApi) {
      return ContentApi.instance;
    }
    this.apiUrl = apiUrl;
    this.lastContentCurrenciesRefresh = 0;
    this.lastContentCurrenciesResponse = null;
    this.lastAllCurrenciesRefresh = 0;
    this.lastAllCurrenciesResponse = null;
    ContentApi.instance = this;
    return this;
  }


  async getContentCurrenciesFromApi() {
    console.log("request contentApi.currencies");
    const options = {
      uri: `${this.apiUrl}/currencies?_locale=en&_limit=-1&_is_site=true`,
      headers: {
        'Content-Type': 'application/json'
      },
      json: true
    };

    return _apiRequest(options);
  }

  async getContentCurrencies() {
    if (this.lastContentCurrenciesRefresh < Date.now() - 8 * 60 * 60 * 1000) {
      const list = await this.getContentCurrenciesFromApi();
      this.lastContentCurrenciesResponse = list.sort(function (a, b) {
        return a.position - b.position;
      });
      this.lastContentCurrenciesRefresh = Date.now();
    }
    return this.lastContentCurrenciesResponse;
  }

  async getAllCurrencies() {
    if (this.lastAllCurrenciesRefresh < Date.now() - 8 * 60 * 60 * 1000) {
      const list = await getAllCurrencies();
      this.lastAllCurrenciesResponse = list.sort(function (a, b) {
        return a.position - b.position;
      });
      this.lastAllCurrenciesRefresh = Date.now();
    }
    return this.lastAllCurrenciesResponse;
  }

  async proposeAwailableCurrs(name) {
    let contentCurrencies = await this.getContentCurrencies();
    let res = new Array();
    contentCurrencies.forEach(c => {
      if (c.ticker.toLowerCase() === name.toLowerCase() ||
        c.name.toLowerCase() === name.toLowerCase() ||
        c.current_ticker === name.toLowerCase()
      ) {
        res.push("\n\n /" + c.ticker + " = " + c.current_ticker.toUpperCase() + " (" + c.name + ") on " + c.network.toUpperCase() + " network");
      }
    });
    return res;
  }

  async getFuzzyCurrAlternatives(name) {
    let allContentCurrencies = await this.getContentCurrencies();
    let allCurrencies = await getAllCurrencies();
    let res = new Array();
    allContentCurrencies.forEach(c => {
      let tickerSimilarity = string_similarity(name.toLowerCase(), c.ticker.toLowerCase());
      let nameSimilarity = string_similarity(name.toLowerCase(), c.name.toLowerCase());
      let current_tickerSimilarity = string_similarity(name.toLowerCase(), c.current_ticker.toLowerCase());
      const currIndex = isAvailableCurr(c.ticker.toLowerCase(), allCurrencies);
      if (currIndex !== -1) {
        if (current_tickerSimilarity > 0.45 ||
          tickerSimilarity > 0.45 ||
          nameSimilarity > 0.45
        ) {
          try {
            if (!c.network) {
              res.push("\n\n /" + c.ticker + " = " + c.current_ticker.toUpperCase() + " (" + c.name + ") ");
            } else {
              res.push("\n\n /" + c.ticker + " = " + c.current_ticker.toUpperCase() + " (" + c.name + ") on " + c.network.toUpperCase() + " network");
            }
          } catch (error) {
            console.log("error while search for query:" + name);
            console.error(error);
          }
        }
      }
    });
    return res;
  }
}

export const content_api = new ContentApi("https://content-api.changenow.io");