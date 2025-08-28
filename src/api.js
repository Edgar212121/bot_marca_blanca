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

// ✅ API KEY EN HEADER - MÉTODO CORREGIDO
export const getAllCurrencies = async () => {
  const options = {
    uri: `${process.env.CN_API_URL}/currencies?active=true`,
    headers: {
      'x-changenow-api-key': process.env.CN_API_KEY,
      'Content-Type': 'application/json'
    },
    json: true
  };

  return await _apiRequest(options);
};

export const getPairs = async () => {
  const options = {
    uri: `${process.env.CN_API_URL}/market-info/available-pairs`,
    headers: {
      'x-changenow-api-key': process.env.CN_API_KEY,
      'Content-Type': 'application/json'
    },
  };

  return await _apiRequest(options);
};

export const getMinimumDepositAmount = async pair => {
  const options = {
    uri: `${process.env.CN_API_URL}/min-amount/${pair}`,
    headers: {
      'x-changenow-api-key': process.env.CN_API_KEY,
      'Content-Type': 'application/json'
    },
  };

  return await _apiRequest(options);
};

export const getCurrInfo = async cur => {
  const options = {
    uri: `${process.env.CN_API_URL}/currencies/${cur}`,
    headers: {
      'x-changenow-api-key': process.env.CN_API_KEY,
      'Content-Type': 'application/json'
    },
  };

  return await _apiRequest(options);
};

// ✅ FUNCIÓN CORREGIDA - LA MÁS IMPORTANTE (la que causaba el error del monto)
export const getExchAmount = async (amount, fromTo) => {
  // Validar que el monto sea un número válido
  if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
    logger.error(`Invalid amount: ${amount}`);
    return { error: 'Invalid amount provided' };
  }

  const options = {
    uri: `${process.env.CN_API_URL}/exchange-amount/${amount}/${fromTo}`,
    headers: {
      'x-changenow-api-key': process.env.CN_API_KEY, // ✅ CORREGIDO: Header en lugar de query param
      'Content-Type': 'application/json'
    },
    json: true
  };
  
  try {
    logger.info(`Requesting exchange amount for: ${amount} ${fromTo}`);
    const response = await _apiRequestUnsafe(options);
    
    // Validar la respuesta
    if (response && response.estimatedAmount) {
      logger.info(`Exchange successful: ${amount} → ${response.estimatedAmount}`);
      return response;
    } else {
      logger.error(`Invalid API response: ${JSON.stringify(response)}`);
      return { error: 'Invalid API response' };
    }
  }
  catch (e) {
    logger.error("Exchange amount error: " + e.message);
    logger.error("Status code:", e.statusCode);
    
    // Manejar errores específicos de la API
    if (e.statusCode === 401) {
      return { error: 'API Key unauthorized. Verify your ChangeNow API key.' };
    } else if (e.statusCode === 400) {
      return { error: 'Invalid parameters. Check currency pair and amount.' };
    } else if (e.statusCode === 422) {
      return { error: 'Amount below minimum or invalid currency pair.' };
    } else if (e.statusCode === 500) {
      return { error: 'Service temporarily unavailable. Please try again.' };
    }
    
    return { error: e.message || 'Unknown error occurred' };
  }
};

export const sendTransactionData = async data => {
  const options = {
    method: 'POST',
    uri: `${process.env.CN_API_URL}/transactions`,
    headers: {
      'x-changenow-api-key': process.env.CN_API_KEY,
      'Content-Type': 'application/json'
    },
    body: data,
  };

  return await _apiRequest(options);
};

export const getTransactionStatus = async id => {
  const options = {
    uri: `${process.env.CN_API_URL}/transactions/${id}`,
    headers: {
      'x-changenow-api-key': process.env.CN_API_KEY,
      'Content-Type': 'application/json'
    },
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