const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const donorSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    role: {
        type: String,
        enum: ['donor', 'admin'],
        default: 'donor'
    },
    phone: {
        type: String,
        required: true,
        match: [/^\d{10}$/, 'Please fill a valid 10-digit phone number'],
        unique: true
    },
});

donorSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model('donor', donorSchema);
