import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos
    const channelId = req.user?._id
     if (!channelId) {
        throw new ApiError(401, "Unauthorized request")
    }

    const [totalVideos, totalSubscribers, totalViews, totalLikes] = await Promise.all([
    Video.countDocuments({owner: channelId}),
    Subscription.countDocuments({channel: channelId}),
    Video.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(channelId) } },
        { $group: { _id: null, totalViews: { $sum: "$views" } } }
    ]),
    Video.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(channelId) } },
    {
        $lookup: {
            from: "likes",
            localField: "_id",
            foreignField: "video",
            as: "likes"
        }
    },
    { $group: { _id: null, totalLikes: { $sum: { $size: "$likes" } } } }
])
])

    const stats = {
        totalVideos,
        totalSubscribers,
        totalViews: totalViews[0] ? totalViews[0].totalViews : 0,
        totalLikes: totalLikes[0] ? totalLikes[0].totalLikes : 0
    }

    res.status(200).json(new ApiResponse(200, stats , "Channel stats fetched successfully"))
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const channelId = req.user?._id

     if (!channelId) {
        throw new ApiError(401, "Unauthorized request")
    }

    const videos = await Video.find({owner: channelId}).sort({createdAt: -1})

    res.status(200).json(new ApiResponse(200, videos , "Channel videos fetched successfully"))
})

export {
    getChannelStats, 
    getChannelVideos
    }