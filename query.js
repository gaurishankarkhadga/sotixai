require('dotenv').config({ path: 'backend/.env' });
const mongoose = require('mongoose');
const { CommentToDmSetting } = require('./backend/model/Instaautomation');
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const doc = await CommentToDmSetting.findOne({ userId: "27942403838705784" });
  console.log(JSON.stringify(doc, null, 2));
  mongoose.disconnect();
}
run();
