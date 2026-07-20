import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    const userId = req.user?._id
    
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id")
    }

    const channelExists = await User.findById(channelId)
    if (!channelExists) {
    throw new ApiError(404, "Channel does not exist")
    }

    if (channelId.toString() === userId.toString()) {
    throw new ApiError(400, "You cannot subscribe to yourself")
    }


    const subscription = await Subscription.findOne({
        channel:channelId,
        subscriber:userId
    })

    let isSubscribed;
    if(subscription)
    {
        await Subscription.findByIdAndDelete(subscription._id)
        isSubscribed = false;
    }
    else
    {
        await Subscription.create({
            channel: channelId,
            subscriber: userId
        })
        isSubscribed = true;

    }
    return res
    .status(200)
    .json( new ApiResponse(200,{isSubscribed},"subscription toggle successful"))
})


const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id")
    }

    const channelExists = await User.findById(channelId)
    if (!channelExists) {
    throw new ApiError(404, "Channel does not exist")
    }

    const subscribers = await Subscription.aggregate([
    {
        $match: {
            channel: new mongoose.Types.ObjectId(channelId)
        }
    },
    {
        $lookup: {
            from: "users",
            localField: "subscriber",
            foreignField: "_id",
            as: "subscribers"
        }
    },
    {
        $unwind: "$subscribers"
    },
    {
        $replaceRoot: { newRoot: "$subscribers" }
    },
    {
            $project: {
                username: 1,
                fullName: 1,
                avatar: 1
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200,subscribers,"subscribers fetch successful"))

})


const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber id")
    }

    const subscriberExists = await User.findById(subscriberId)
    if (!subscriberExists) {
    throw new ApiError(404, "subscriber does not exist")
    }

    const subscribedTo = await Subscription.aggregate([
    {
        $match: {
            subscriber: new mongoose.Types.ObjectId(subscriberId)
        }
    },
    {
        $lookup: {
            from: "users",
            localField: "channel",
            foreignField: "_id",
            as: "subscribedTo"
        }
    },
    {
        $unwind: "$subscribedTo"
    },
    {
        $replaceRoot: { newRoot: "$subscribedTo" }
    },
    {
            $project: {
                username: 1,
                fullName: 1,
                avatar: 1
            }
        }
    ])

    return res
    .status(200)
    .json( new ApiResponse(200,subscribedTo,"channels user has subscribed to fetched successfully"))

})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}