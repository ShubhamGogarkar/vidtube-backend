import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {Like} from "../models/like.model.js"
import {Video} from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
  
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    const commentAggregate = Comment.aggregate([
        { $match: { video: new mongoose.Types.ObjectId(videoId) } },
        { $sort: { createdAt: -1 } },
        { $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
            pipeline: [
                { $project: { username: 1, avatar: 1 } }
            ]
        }},
        { $unwind: "$owner" },
    ])

    const comments = await Comment.aggregatePaginate(commentAggregate, options)

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comments fetched successfully"))

})

const addComment = asyncHandler(async (req, res) => {
  
    const {videoId} = req.params
    const {content} = req.body
    if (!content) {
        throw new ApiError(400, "Content is required")
    }

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    const comment = await Comment.create({
        video: videoId,
        content: content.trim(),
        owner: req.user._id
    })

    return res.status(201).json(new ApiResponse(201, comment, "Comment added successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
  
    const {commentId} = req.params
    const {content} = req.body
    
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }
    if (!content?.trim()) {
        throw new ApiError(400, "Content is required")
    }

    const comment = await Comment.findOneAndUpdate(
        { _id: commentId, owner: req.user._id },
        { content: content.trim() },
        { returnDocument: 'after' }
    )

    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    return res.status(200).json(new ApiResponse(200, comment, "Comment updated successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
  
    const {commentId} = req.params

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }

    const comment = await Comment.findOneAndDelete(
        { _id: commentId, owner: req.user._id }
    )

    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    await Like.deleteMany({ comment: commentId })

    return res.status(200).json(new ApiResponse(200, null, "Comment deleted successfully"))
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }
