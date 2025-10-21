const mongoose = require("mongoose");
const initData = require("./admin.js");
const Donor = require("../models/donors.js")

const MONGO_URL = "mongodb://127.0.0.1:27017/secondserve";

main()
    .then(() => {
        console.log("connected to DB");
    })
    .catch((err) => {
     console.log(err);
    });

async function main(){
    await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
    //await Donor.deleteMany({});
    await Donor.insertMany(initData.data);
    console.log("data was initialized");
};

initDB();