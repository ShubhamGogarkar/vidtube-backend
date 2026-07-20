import mongoose , {ObjectId} from "mongoose"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },

    fullName: {
        type: String,
        index: true,
        trim: true,
        required: true,
        
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },

    password: {
        type: String,
        required: [true, "password is required"]
    },

    avatar:{
      type: String, 
      required: true,
    },
   
    coverImage:{
      type: String,

    },

    watchHistory:[
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video"
      }
    ],

    refreshToken:{
      type: String,
       
    }



    

}, {timestamps: true});


UserSchema.pre("save", async function(next) {
  if(!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 12)
  
})

UserSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

UserSchema.methods.generateAccessToken = function(){
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
  )
}


UserSchema.methods.generateRefreshToken = function(){
  return jwt.sign(
    {
      _id: this._id,
     
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    }
  )
}

export const User = mongoose.model('User', UserSchema);