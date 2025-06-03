import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
    {
        title:{
            type: String,
            required: true,
            trim: true,
        },
        content:{
            type: String,
            default: "",
        },
        language:{
            type: String,
            required: true,
            trim: true,
        },
        owner:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        collaborators:[
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User"
                },
                permission: {
                    type: String,
                    enum: ["read","write","admin"],
                    default: 'read'
                }
            }
        ],
        isPublic: {
            type: Boolean,
            default: false,
        },
        lastEditedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref:"User"
        },
        folderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Folder"
        }
    },
    {timestamps: true}
)

const Document = mongoose.model('Document', documentSchema)
export default Document