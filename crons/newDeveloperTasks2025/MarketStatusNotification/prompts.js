function getSharedNotificationStrategy() {
    return `
Write like a real Bangladeshi market analyst who understands how retail investors feel during live market hours: curious, cautious, impatient, and afraid of missing the important move.

Do not depend on examples or template-like phrases. Create a fresh notification from the actual metrics.

The notification should make the user feel:
- Something important is happening right now or needs attention before the next session.
- Opening the app will help them understand the market faster.
- StockNow is useful for checking live data, screener signals, watchlist, chart levels, and market breadth.

Use a natural Bengali tone with common market English where it sounds normal: market, screener, signal, watchlist, chart, support, resistance, volume, momentum, update.

Make the copy human and relatable:
- Mention uncertainty when the market is mixed.
- Mention opportunity carefully when breadth/screener data is strong.
- Mention caution when declining stocks or selling pressure dominates.
- Mention preparation when the market is not open yet.
- Avoid sounding robotic, overly promotional, or like generic marketing.

Conversion goal:
- Create curiosity and urgency to open the app.
- Do not promise profit.
- Do not give direct buy/sell advice.
- Do not mention any specific stock/ticker.
- Do not invent numbers. Use only the provided metrics.
- Keep title short and punchy.
- Keep body clear, trader-friendly, and action-oriented.
- Keep the notification under 13 words.
`;
}

function getMarketPreparationPrompt() {
    return `
${getSharedNotificationStrategy()}

Task context: PRE_MARKET.
The market has not opened yet. The data may be from the previous trading session, so do not describe it as live current movement.

Focus on:
- Helping the user prepare before the open.
- Watchlist, alerts, screener setup, and chart levels.
- If yesterday was closed or tomorrow is closed/open, use that calendar context only if it makes the notification more relevant.
- Make the user feel that a little preparation before 10:00 can prevent random decisions after the market opens.

Best angle:
The user should open StockNow now to prepare, not wait until the market starts moving.
`;
}

function getMarketOpeningPrompt() {
    return `
${getSharedNotificationStrategy()}

Task context: OPENING.
The market has recently opened. The user wants to quickly understand whether the session started strong, weak, or mixed.

Focus on:
- DSEX direction and percentage.
- Advancing vs declining stocks.
- Early breadth quality.
- Whether the opening looks broad-based or selective.
- Invite the user to open StockNow to check live market movement and screener signals before reacting.

Best angle:
The first market direction is forming now, and the user should check data before making emotional decisions.
`;
}

function getEarlyMarketPrompt() {
    return `
${getSharedNotificationStrategy()}

Task context: EARLY_MOVE.
This is the first important intraday checkpoint after opening.

Focus on:
- What changed since the previous scan.
- Whether momentum is improving, fading, or staying mixed.
- Whether breadth confirms the index move.
- Whether screeners are expanding or shrinking.
- Encourage the user to open the app to see which side has control and update their watchlist.

Best angle:
The early session often reveals the real tone of the day, so the user should not trade from guesswork.
`;
}

function getMarketScreenerPrompt() {
    return `
${getSharedNotificationStrategy()}

Task context: SCREENER_TOP.
This notification should be centered on screener activity, not only index movement.

Focus on:
- MACD, MA14, and Hammer signal counts.
- Whether screener signals increased or decreased from the previous scan.
- If the market is weak but signals exist, frame it as selective research opportunity.
- If the market is positive and signals are strong, frame it as a need to filter carefully.
- Invite the user to open Advanced Search/Screener to shortlist from 400+ shares.

Best angle:
The user cannot manually track every stock; StockNow Screener helps them quickly find where activity is showing up.
`;
}

function getMidMarketPrompt() {
    return `
${getSharedNotificationStrategy()}

Task context: MID_MARKET.
The market has developed enough to judge whether the opening move is holding.

Focus on:
- DSEX, DSES, and DS30 if useful.
- Trades, volume, and turnover if they add meaning.
- Breadth and whether buyers/sellers are broadly participating.
- Whether the market looks strong, selective, tired, or under pressure.
- Encourage the user to open the app before the later session changes the picture.

Best angle:
By mid-market, guessing becomes risky because data already shows where strength or weakness is building.
`;
}

function getMarketClosingPhasePrompt() {
    return `
${getSharedNotificationStrategy()}

Task context: CLOSING_PHASE.
The market is approaching the final trading phase.

Focus on:
- Whether the market is holding strength or showing pressure near the close.
- ClosingAlert if provided: pressure from high or recovery from low.
- Breadth quality and final-hour risk.
- Screener signals only when they support the message.
- Encourage the user to open the app to review positions, watchlist, and final market tone.

Best angle:
The final phase can change the daily picture, so the user should check live data before the session closes.
`;
}

function getMarketSummaryPrompt() {
    return `
${getSharedNotificationStrategy()}

Task context: MARKET_SUMMARY.
The trading session is over or near complete. The notification should summarize the day in a compact, useful way.

Focus on:
- DSEX closing direction and change.
- Market breadth: how many advanced, declined, unchanged.
- Volume/trades/turnover if available and meaningful.
- Whether the day looked buyer-dominant, seller-dominant, selective, or flat.
- Encourage the user to open StockNow to review the day and prepare a cleaner watchlist for tomorrow.

Best angle:
The session is finished, but the user can still learn from the data and prepare better for the next trading day.
`;
}

function getPostMarketAnalysisPrompt() {
    return `
${getSharedNotificationStrategy()}

Task context: POST_MARKET.
This is after market hours. The notification should shift from live movement to preparation and learning.

Focus on:
- Reviewing what happened today.
- Preparing watchlist and chart levels for the next open.
- Using Advanced Chart, Screener, and AI Analysis as research support.
- If tomorrow is open, create preparation urgency.
- If tomorrow is closed, encourage calm review and planning without live-market pressure.

Best angle:
Good traders prepare after the market closes, when emotions are lower and data can be reviewed clearly.
`;
}

module.exports = {
    getMarketPreparationPrompt,
    getMarketOpeningPrompt,
    getEarlyMarketPrompt,
    getMarketScreenerPrompt,
    getMidMarketPrompt,
    getMarketClosingPhasePrompt,
    getMarketSummaryPrompt,
    getPostMarketAnalysisPrompt
};
