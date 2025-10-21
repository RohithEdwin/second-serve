const mongoose = require("mongoose");
const Schema = mongoose.Schema
const passportLocalMongoose = require('passport-local-mongoose');

const  orphanageSchema = new Schema({
    description: {
        type: String,
    },
    image: {
       type: String,
       set: (v) => v === "" ? "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.justdial.com%2FDimapur%2FOrphanages-For-Children%2Fnct-10960119&psig=AOvVaw0-Y1frDQjVYhhSNCMnhuGl&ust=1757690864589000&source=images&cd=vfe&opi=89978449&ved=0CBUQjRxqFwoTCPjk5vuC0Y8DFQAAAAAdAAAAABAL"
        : v,
    },
    email:{
        type: String,
        required: true,
        unique: true
    },
    role: {
        type: String,
        default: 'orphanage'
    },
    phone:{
        type: Number,
        required: true,
    }, 
    address: {
        type: String,
    },
    location:{
        type: String,
        default: "Ballari"
    },
    childrenCount: {
        type: Number,
        min: 0,
        default: 0
    },
    status: {
        type: String,
        enum: ['incomplete', 'pending', 'verified', 'rejected'],
        default: 'incomplete'
    },
})

orphanageSchema.plugin(passportLocalMongoose);
const orphanages = mongoose.model("orphanages", orphanageSchema);
module.exports = orphanages;