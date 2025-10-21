const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const donor = require("./donors.js")
const orphanages = require("./orphanages.js");

const donationSchema = new Schema({
    donorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'donor',
        required: true
    },
    orphanageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'orphanages',
        required: true
    },
    foodType: {
        type: String,
        required: true,
    },
    pickupAddress: {
        type: String,
        required: true,
    },
    pickupDate: {
        type: Date,
        required: true
    },
    pickupTime: {
        type: String,
        required: true
    },
    donorPhone: {
        type: String,
        required: true,
    },
     status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected','received'],
        default: 'pending'
    },
});

module.exports = mongoose.model('donation', donationSchema);
