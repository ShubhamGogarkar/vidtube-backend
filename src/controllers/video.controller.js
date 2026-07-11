import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination

     const matchStage = {
    isPublished: true, // usually only show published videos publicly
  }

  function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
  
  // text search on title/description
  if (query) {
    matchStage.$or = [
      { title: { $regex: escapeRegex(query), $options: "i" } },
      { description: { $regex: escapeRegex(query), $options: "i" } },
    ]
  }

  // filter by owner
  if (userId) {
    if (!mongoose.isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid userId")
    }
    matchStage.owner = new mongoose.Types.ObjectId(userId)
  }

  const pipeline = [
    { $match: matchStage },
  ]

  // sorting — whitelist fields to avoid arbitrary key injection
  const allowedSortFields = ["createdAt", "views", "duration", "title"]
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt"
  const sortOrder = sortType === "asc" ? 1 : -1

  pipeline.push({ $sort: { [sortField]: sortOrder } })

  const options = {
  page: parseInt(page, 10),
  limit: parseInt(limit, 10)
  }

  const videoAggregate = Video.aggregate(pipeline)
  const videos = await Video.aggregatePaginate(videoAggregate, options)

  if(!videos)
  {
    throw new ApiError(500, 'error while getting the videos')
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"))
    
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    console.log(req.files)
     if (!req.files?.video?.[0] || !req.files?.thumbnail?.[0]) {
    throw new ApiError(400, "video and thumbnail are required");
  }
    
  const videoLocalPath = req.files?.video?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    const videoFile = await uploadOnCloudinary(videoLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if(!videoFile)
      {
        throw new ApiError(400, "video file is required");
      }

    const video = await Video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    title,
    description,
    duration: videoFile.duration,
    owner:req.user._id
  }) 

  const createdVideo = await Video.findById(video._id)

  if(!createdVideo)
  {
    throw new ApiError(500, "something went wrong while uploading the video")
  }
  
  return res.status(201).json(
    new ApiResponse(201,createdVideo, "video uploaded successfully")
  )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
