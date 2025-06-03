import mongoose from "mongoose";
import bcrypt from "bcrypt";
const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        passwordHash: {
            type: String,
            required: true,
        },
        avatar: {
            type: String,
            default: "",
        },
        lastActive: {
            type: Date,
            default: Date.now,
        },
    },
    {timestamps: true}
);

userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.passwordHash)
};

userSchema.pre('save', async function(next){
    if (!this.isModified('passwordHash')) {
        return next()
    }

    const salt = await bcrypt.genSalt(10)
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt)
    next()
})

const User = mongoose.model("User", userSchema)
export default User