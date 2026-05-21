const mongoose = require('mongoose')

const blackListTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: [true, "token is required to be added in blacklist"]
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400  // auto-delete after 24 hours (matches JWT expiry)
    }
}, {
    timestamps: true
})

const tokenBlacklistModel = mongoose.model("blacklistTokens", blackListTokenSchema)

module.exports = tokenBlacklistModel