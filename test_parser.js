const chatService = require('./backend/service/chatService');
async function test() {
    try {
        const result = await chatService.processChatCommand("Auto-DM link when people comment 'drop'");
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error(e);
    }
}
test();
