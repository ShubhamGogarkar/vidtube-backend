import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Video} from "../models/video.model.js"
import {Comment} from "../models/comment.model.js"
import {Tweet} from "../models/tweet.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    const userId = req.user?._id

    if (!userId) {
    throw new ApiError(401, "Unauthorized request")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const videoExists = await Video.findById(videoId)
    if (!videoExists) {
    throw new ApiError(404, "Video does not exist")
    }

    const like = await Like.findOne({
        video:videoId,
        likedBy:userId
    })

    let isLiked;
    if(like)
    {
        await Like.findByIdAndDelete(like._id)
        isLiked = false;
    }
    else
    {
        await Like.create({
            video: videoId,
            likedBy: userId
        })
        isLiked = true;

    }
    return res
    .status(200)
    .json( new ApiResponse(200,{isLiked},"like toggle successful"))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    const userId = req.user?._id

    if (!userId) {
    throw new ApiError(401, "Unauthorized request")
    }

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }

    const commentExists = await Comment.findById(commentId)
    if (!commentExists) {
    throw new ApiError(404, "Comment does not exist")
    }

    const like = await Like.findOne({
        comment:commentId,
        likedBy:userId
    })

    let isLiked;
    if(like)
    {
        await Like.findByIdAndDelete(like._id)
        isLiked = false;
    }
    else
    {
        await Like.create({
            comment: commentId,
            likedBy: userId
        })
        isLiked = true;

    }
    return res
    .status(200)
    .json( new ApiResponse(200,{isLiked},"like toggle successful"))
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    const userId = req.user?._id

    if (!userId) {
    throw new ApiError(401, "Unauthorized request")
    }

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id")
    }

    const tweetExists = await Tweet.findById(tweetId)
    if (!tweetExists) {
    throw new ApiError(404, "Tweet does not exist")
    }

    const like = await Like.findOne({
        tweet:tweetId,
        likedBy:userId
    })

    let isLiked;
    if(like)
    {
        await Like.findByIdAndDelete(like._id)
        isLiked = false;
    }
    else
    {
        await Like.create({
            tweet: tweetId,
            likedBy: userId
        })
        isLiked = true;

    }
    return res
    .status(200)
    .json( new ApiResponse(200,{isLiked},"like toggle successful"))
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const userId = req.user?._id

    if (!userId) {
    throw new ApiError(401, "Unauthorized request")
    }

    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(userId),
                video: { $exists: true }
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
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
                                        username: 1,
                                        avatar: 1,
                                        _id: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $unwind: "$owner"
                    },
                    {
                        $project: {
                            title: 1,
                            description: 1,
                            thumbnail: 1,
                            owner: 1,
                            views: 1,
                            duration: 1,
                            videoFile: 1
                        }

                    }
                ]
            }
        },
        {
            $unwind: "$video"
        }
    ])

    return res
    .status(200)
    .json( new ApiResponse(200,{likedVideos},"liked videos fetched successfully"))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}