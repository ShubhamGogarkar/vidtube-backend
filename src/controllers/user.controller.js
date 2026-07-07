import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import {deleteImage, uploadOnCloudinary} from "../utils/cloudinary.js"
import jwt from "jsonwebtoken"


const generateAccessAndRefreshTokens = async(userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({validateBeforeSave: false})

    return {accessToken, refreshToken}
    
  } catch (error) {
    throw new ApiError(500, "error while generating tokens")
  }
}

const getPublicIdFromUrl = (url) => {
 try {
  const parts = url.split('/upload/');
  if (parts.length < 2) return null;

 
  const remainingPath = parts[1].replace(/^v\d+\//, '');

 
  const publicId = remainingPath.substring(0, remainingPath.lastIndexOf('.'));
  
  return publicId;
  
 } catch (error) {
  console.log("error while getting publicId from url to delete image")
  return null
 }
  
};

const registerUser = asyncHandler(async (req, res) => {

   // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

  const {username,fullName,email,password} = req.body;
  console.log(email);
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existedUser) {
    throw new ApiError(409, "user already exists with username or email");
  }


  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  //const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
      coverImageLocalPath = req.files.coverImage[0].path
     }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  
  if(!avatar)
  {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    username: username.toLowerCase(),
    email,
    password
  })

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if(!createdUser)
  {
  throw new ApiError(500, "something went wrong while registering the user")
  }


  return res.status(201).json(
    new ApiResponse(200, createdUser, "user created successfully")
  )
});

const loginUser = asyncHandler(async (req, res) => {

  // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie
    const {email, username, password} = req.body;

    if(!email && !username)
    {
      throw new ApiError(400, "email or username is required")
    }

    const user = await User.findOne({
      $or: [{username},{email}]
    })

    if(!user)
    {
      throw new ApiError(404, "user not found ")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid)
    {
      throw new ApiError(401, "password is incorrect")
    }
    
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
      httpOnly: true,
      secure: true,
    }

    res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser, accessToken, refreshToken
        },
        "user logged in successfully"
      )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{
        refreshToken: undefined
      }
    },
    {
     returnDocument: 'after'
    }
   )

   const options = {
      httpOnly: true,
      secure: true,
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"user logged out"))

})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if(!incomingRefreshToken)
  {
    throw new ApiError(401, "unauthorized request")
  }

try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

  const user = await User.findById(decodedToken?._id)

  if(!user)
  {
    throw new ApiError(401,"invalid refresh Token")
  }

  if(incomingRefreshToken !== user?.refreshToken)
  {
    throw new ApiError(401,"refresh token is expired or used")
  }

  const options = {
      httpOnly: true,
      secure: true,
    }

  const {accessToken, refreshToken: newRefreshToken} = await generateAccessAndRefreshTokens(user._id)

  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", newRefreshToken, options)
  .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )

} catch (error) {
  throw new ApiError(401, error?.message || "invalid refresh token ")
}

})

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const {oldPassword, newPassword} = req.body
  
  const user = await User.findById(req.user?._id)

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect)
  {
    throw new ApiError(400,"the old password entered is incorrect")
  }

  user.password = newPassword
  await user.save({validateBeforeSave: false})

  return res
  .status(200)
  .json( new ApiResponse(200,{},"password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
  .status(200)
  .json( new ApiResponse(200,req.user,"current user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
  const {fullName, email} = req.body
  
  if(!fullName || !email)
  {
    throw new ApiError(400, "all fields are required")
  }

  const user = await User.findByIdAndUpdate(req.user?._id,
    {
      $set:{
        fullName,email
      }
    },{
       returnDocument: 'after'
    }
    
  ).select("-password")




  return res
  .status(200)
  .json( new ApiResponse(200,user,"Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {

  const avatarLocalPath = req.file?.path

  if(!avatarLocalPath)
  {
    throw new ApiError(400, "avatar file is missing")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if(!avatar.url)
    {
    throw new ApiError(400, "error while uploading avatar file")
  }

  const publicId = getPublicIdFromUrl(req.user?.avatar)

  if(publicId) deleteImage(publicId)
  

  const user = await User.findByIdAndUpdate(req.user?._id,
    { 
      $set:{
        avatar: avatar.url
      }
    },{
       returnDocument: 'after'
    }
    
  ).select("-password")


  return res
  .status(200)
  .json( new ApiResponse(200,user,"user avatar updated successfully"))
})

const updateUserCoverImage = asyncHandler(async (req, res) => {

  const coverImageLocalPath = req.file?.path

  if(!coverImageLocalPath)
  {
    throw new ApiError(400, "avatar file is missing")
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if(!coverImage.url)
    {
    throw new ApiError(400, "error while uploading coverImage file")
  }

  const publicId = getPublicIdFromUrl(req.user?.avatar)

  if(publicId) deleteImage(publicId)
  

  const user = await User.findByIdAndUpdate(req.user?._id,
    { 
      $set:{
        coverImage: coverImage.url
      }
    },{
       returnDocument: 'after'
    }
    
  ).select("-password")


  return res
  .status(200)
  .json( new ApiResponse(200,user,"user coverImage updated successfully"))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {

  const {username} = req.params 

  if(!username?.trim())
  {
    throw new ApiError(400, "username is missing")
  }

  const channel = await User.aggregate(
    [
      {
        $match: {
          username: username?.toLowerCase()
        }
      },
      {
        $lookup:{
          from: "subscriptions",
          localField:"_id",
          foreignField:"channel",
          as:"subscribers"
           

        }
      },
      {
        $lookup:{
          from: "subscriptions",
          localField:"_id",
          foreignField:"subscriber",
          as:"subscribedTo"
           

        }
      },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1

            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )



})

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})

export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory};
