import mongoose, {Schema} from "mongoose"

const playlistSchema = new Schema({
  name:{
    type:  String,
    required: true
  },
  
  description:{
    type:  String,
    required: true  
  },

 video:[{
  type: Schema.Types.ObjectId,
  ref:"Video"
 }],

 owner:{
    type: Schema.Types.ObjectId,
    ref:"User"
 }


},{timestamps: true})

playlistSchema.index({ video: 1 })

export const Playlist = mongoose.model("Playlist", playlistSchema)