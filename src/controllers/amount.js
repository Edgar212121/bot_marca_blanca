import Scene from 'telegraf/scenes/base';
import { getMinimumDepositAmount } from '../api';
import { keyboards } from '../keyboards';
import { messages } from '../messages';
import scenes from '../constants/scenes';
import buttons from '../constants/buttons';
import { pause } from '../helpers';
import { safeReply, safeReplyWithHTML } from '../helpers';
import { app } from '../app';

const amount = new Scene(scenes.amount);

amount.enter(async (ctx) => {
  try {
    const { tradingData } = ctx.session;
    
    // Verificar que tenemos los datos necesarios
    if (!tradingData || !tradingData.currFrom || !tradingData.currTo) {
      await safeReply(ctx, 'Error: Información de monedas no encontrada. Reiniciando...');
      await ctx.scene.enter(scenes.startNewExchange);
      return;
    }

    const { currFrom, currTo } = tradingData;
    const tradePair = `${currFrom.ticker}_${currTo.ticker}`;
    
    // ✅ MEJORADO: Manejo de errores para getMinimumDepositAmount
    let minAmount = null;
    let minAmountMsg = '';
    
    try {
      console.log(`🔍 Getting minimum amount for pair: ${tradePair}`);
      const minAmountResponse = await getMinimumDepositAmount(tradePair);
      
      if (minAmountResponse && minAmountResponse.minAmount) {
        minAmount = parseFloat(minAmountResponse.minAmount);
        minAmountMsg = `Minimal amount - <b>${minAmount}</b>`;
        console.log(`✅ Min amount obtained: ${minAmount} ${currFrom.ticker.toUpperCase()}`);
      } else {
        console.log(`⚠️ No minimum amount found for pair ${tradePair}`);
        minAmountMsg = '';
      }
    } catch (error) {
      console.log(`❌ Error getting minimum amount for ${tradePair}:`, error.message);
      minAmountMsg = '';
      // No bloquear el flujo, continuar sin monto mínimo
    }

    // Guardar minAmount en la sesión
    ctx.session.tradingData = { ...tradingData, minAmount };

    await app.analytics.trackEnterAmount(ctx);
    await safeReplyWithHTML(ctx,
      `Enter the amount of <b>${currFrom.ticker.toUpperCase()}</b> you would like to exchange.\n${minAmountMsg}`,
      keyboards.getAmountKeyboard(ctx)
    );
    
  } catch (error) {
    console.log('❌ Error in amount.enter:', error);
    await safeReply(ctx, 'Error interno. Reiniciando...');
    await ctx.scene.enter(scenes.startNewExchange);
  }
});

amount.hears([/[.,0-9a-zA-Zа-яА-Я]+/gi, buttons.back], async ctx => {
  if (await app.msgInterceptor.interceptedByMsgAge(ctx)) { return; }
  
  try {
    const { text } = ctx.message;
    const { tradingData } = ctx.session;

    if (text === buttons.back) {
      ctx.session.tradingData = {
        ...tradingData,
        currTo: '',
      };

      delete ctx.session.tradingData.minAmount;
      await ctx.scene.enter(scenes.currTo);
      return;
    }

    // ✅ MEJORADO: Mejor validación del formato del monto
    console.log(`💰 Processing amount input: "${text}"`);
    
    // Limpiar input: remover espacios y caracteres no numéricos excepto comas y puntos
    const cleanText = text.trim().replace(/[^\d.,]/g, '');
    if (!cleanText) {
      await safeReply(ctx, messages.numErr);
      return;
    }
    
    // Convertir a número
    const formattingAmount = Number(cleanText.replace(',', '.'));
    
    console.log(`🔢 Cleaned text: "${cleanText}" → Number: ${formattingAmount}`);

    // ✅ MEJORADO: Validaciones más robustas
    if (!formattingAmount || isNaN(formattingAmount) || formattingAmount <= 0) {
      console.log(`❌ Invalid amount: ${formattingAmount}`);
      await safeReply(ctx, messages.numErr);
      return;
    }

    // Verificar si parece una dirección (contiene 0x)
    if (text.match(/0x[\da-f]/i)) {
      console.log(`❌ Detected wallet address instead of amount: ${text}`);
      await safeReply(ctx, messages.numErr);
      return;
    }

    // ✅ MEJORADO: Verificación del monto mínimo con mejor manejo
    if (tradingData.minAmount) {
      const minAmount = parseFloat(tradingData.minAmount);
      console.log(`📊 Comparing: ${formattingAmount} >= ${minAmount} (${formattingAmount >= minAmount})`);
      
      if (minAmount && formattingAmount < minAmount) {
        console.log(`❌ Amount below minimum: ${formattingAmount} < ${minAmount}`);
        await safeReply(ctx, 
          `Oops! Wrong amount.\n\n` +
          `Your amount: ${formattingAmount} ${tradingData.currFrom.ticker.toUpperCase()}\n` +
          `Minimum required: ${minAmount} ${tradingData.currFrom.ticker.toUpperCase()}`
        );
        await pause(500);
        await ctx.scene.reenter();
        return;
      }
    } else {
      console.log(`⚠️ No minimum amount set, allowing ${formattingAmount}`);
    }

    // ✅ ÉXITO: Monto válido
    console.log(`✅ Amount accepted: ${formattingAmount} ${tradingData.currFrom.ticker.toUpperCase()}`);
    
    ctx.session.tradingData = { ...tradingData, amount: formattingAmount };
    await ctx.scene.enter(scenes.estExch);

  } catch (error) {
    console.log('❌ Error in amount.hears:', error);
    await safeReply(ctx, 'Error procesando el monto. Intenta nuevamente.');
  }
});

export default amount;