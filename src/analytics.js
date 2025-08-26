import * as Amplitude from '@amplitude/node';
import { app } from './app';
class Analytics {
    constructor() {
    }

    async trackEventByUser(userId, event) {

    }

    async trackEvent(ctx, event) {
        var userId = app.sessionAdapter.readUserId(ctx);
        await this.trackEventByUser(userId, event);
    }

    async trackWelcomeScreen(ctx) {
        console.log("track enter welcome screen");
    }

    async trackStart(ctx) {
        console.log("track enter start screen");
    }

    async trackRead(ctx) {
        console.log("track enter read screen");
    }

    async trackCurFrom(ctx) {
        console.log("track enter curFrom screen");
    }

    async trackCurTo(ctx) {
        console.log("track enter curTo screen");
    }

    async trackEnterAmount(ctx) {
        console.log("track enter amount screen");
    }

    async trackEstimate(ctx) {
        console.log("track enter estimate screen");
    }

    async trackCheckAgree(ctx) {
        console.log("track enter checkAgree screen");
    }

    async trackTranCreate(ctx) {
        console.log("track tran create");
    }

    async trackTranUpdate(userId, tranStatus) {
        console.log("track tran update to status:" + tranStatus);
    }
}

export const analytics = new Analytics();
