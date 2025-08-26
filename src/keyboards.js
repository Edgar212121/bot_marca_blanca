import Markup from 'telegraf/markup';
import buttons from './constants/buttons';
import popularCurrs from './constants/popularCurrs';

class Keyboards{  
  getMainKeyboard() {
    return Markup.keyboard([buttons.accept])
      .oneTime()
      .resize()
      .extra();
  }
  getReplyKeyboard () {
    return Markup.keyboard([buttons.start])
      .oneTime()
      .resize()
      .extra();
  }  
  getFromKeyboard  (chosenCurr) {
    const popularCurrsWithActive = { ...popularCurrs, [chosenCurr]:  `✅ ${popularCurrs[chosenCurr]}`};
    const { btc, eth, bch, ltc, xmr, zec } = popularCurrsWithActive;
    const fullKb = [[btc, eth], [bch, ltc], [xmr, zec], [buttons.cancel], [buttons.help]];
  
    return Markup.keyboard(fullKb)
      .resize()
      .extra();
  }
  
  getToKeyboard (chosenCurr) {
    const popularCurrsWithActive = { ...popularCurrs, [chosenCurr]:  `✅ ${popularCurrs[chosenCurr]}`};
    const { btc, eth, bch, ltc, xmr, zec } = popularCurrsWithActive;
    const fullKb = [
      [btc, eth],
      [bch, ltc],
      [xmr, zec],
      [buttons.back, buttons.cancel],
      [buttons.help]
    ];
  
    return Markup.keyboard(fullKb)
      .resize()
      .extra();
  }
  
  getAmountKeyboard  ()  {
    return Markup.keyboard([[buttons.back, buttons.cancel], [buttons.help]])
      .resize()
      .extra();
  }
  
  getExtraIDKeyboard ()  {
    return Markup.keyboard([[buttons.back, buttons.next], [buttons.cancel], [buttons.help]])
      .resize()
      .extra();
  }
  
  getAgreeKeyboard  () {
    return Markup.keyboard([[buttons.back, buttons.confirm ], [buttons.help]])
      .resize()
      .extra();
  }
  
  getBackKeyboard ()  {
    return Markup.keyboard([[buttons.startNew], [buttons.help]])
      .resize()
      .extra();
  }
  
  getStartEmptyKeyboard () {
    // return Markup.removeKeyboard().extra();
    return Markup.keyboard([[buttons.startNew], [buttons.help]])
      .resize()
      .extra();
  }
}
export const keyboards = new Keyboards();
