require('dotenv').config();
const mongoose = require('mongoose');
const { generateDynamicC2DReply } = require('./service/aiService');

async function testAI() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        
        console.log('Testing generateDynamicC2DReply...');
        // Test with a dummy user ID (even if not found, it should use the fallback prompt)
        const dummyUserId = new mongoose.Types.ObjectId().toString();
        
        const reply1 = await generateDynamicC2DReply(
            dummyUserId,
            "how do I buy this?",
            "fan_user",
            "Say something super casual"
        );
        console.log('--- TEST 1 ---');
        console.log('Result:', reply1);
        
        const reply2 = await generateDynamicC2DReply(
            dummyUserId,
            "how do I buy this?",
            "fan_user",
            "Say something super casual"
        );
        console.log('--- TEST 2 ---');
        console.log('Result:', reply2);
        
        if (reply1 === reply2) {
            console.log('WARNING: Replies are identical. Dynamics might be failing.');
        } else {
            console.log('SUCCESS: Replies are dynamic and different!');
        }
        
    } catch (err) {
        console.error('Test Failed:', err.message);
    } finally {
        mongoose.disconnect();
    }
}

testAI();
