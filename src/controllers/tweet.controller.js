import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {Like} from "../models/like.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    
    const { content } = req.body
    if (!content?.trim()) {
        throw new ApiError(400, "Content is required")
    }
    const tweet = await Tweet.create({
        content,
        owner: req.user._id
    })
    return res.status(201).json(new ApiResponse(201, tweet, "Tweet created successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {

    const { userId } = req.params
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id")
    }
   const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    { $project: { username: 1 , _id: 1 } }
                ]
            }
        },
        {
            $unwind: "$owner"
        },
        {$lookup: {
            from: "likes",
            localField: "_id",
            foreignField: "tweet",
            as: "likes",
                   },
        },

        {
            $addFields: {
            isLiked: {
            $in: [
                     new mongoose.Types.ObjectId(req.user._id),
                     "$likes.likedBy",
                 ],
                      },
                        },
        },

        {
            $project: {
            likes: 0,
                      },
        },
    ])


    return res.status(200).json(new ApiResponse(200, tweets, "User tweets fetched successfully"))
})

const updateTweet = asyncHandler(async (req, res) => {

    const { tweetId } = req.params
    const { content } = req.body
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }
    if (!content?.trim()) {
        throw new ApiError(400, "Content is required")
    }
    


    const tweet = await Tweet.findOneAndUpdate(
        {  
        _id: tweetId,
        owner: req.user._id
    },
        {  $set:{ content} },
        { returnDocument: 'after'}
    )
    if (!tweet) {
        throw new ApiError(404, "Tweet not found or you're not authorized to update it ")
    }
    return res.status(200).json(new ApiResponse(200, tweet, "Tweet updated successfully"))
})

const deleteTweet = asyncHandler(async (req, res) => {
   
    const {tweetId} = req.params
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }
      const tweet = await Tweet.findOneAndDelete({
        _id: tweetId,
        owner: req.user._id
    })

    if (!tweet) {
        throw new ApiError(404, "Tweet not found or you're not authorized to delete it")
    }

     await Like.deleteMany({ tweet: tweetId })

    return res
   .status(200)
   .json( new ApiResponse(200,{},"Tweet deleted successfully"))

})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
