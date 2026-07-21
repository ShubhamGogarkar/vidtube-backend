import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {Comment} from "../models/comment.model.js"
import {User} from "../models/user.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {deleteFromCloudinary, uploadOnCloudinary, getPublicIdFromUrl } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query


     const matchStage = {
    isPublished: true, 
  }

  function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
  

  if (query) {
    matchStage.$or = [
      { title: { $regex: escapeRegex(query), $options: "i" } },
      { description: { $regex: escapeRegex(query), $options: "i" } },
    ]
  }


  if (userId) {
    if (!mongoose.isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid userId")
    }
    matchStage.owner = new mongoose.Types.ObjectId(userId)
  }

  const pipeline = [
    { $match: matchStage },
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
                fullName: 1,
              },
            },
          ],
        },
      },

      {
        $unwind: {
          path: "$owner",
          preserveNullAndEmptyArrays: true, 
        },
      },
  ]


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
    if(!thumbnail)
      {
        throw new ApiError(400, "thumbnail file is required");
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
   
    if (!mongoose.isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid videoId")
    }

    const video = await Video.findById(videoId).populate("owner","username avatar fullName")
    
    if(!video){
    throw new ApiError(404, "video not found")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"))

})

const updateVideo = asyncHandler(async (req, res) => { 
    const { videoId } = req.params
    if (!mongoose.isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid videoId")
    }
 
   const {title, description} = req.body

   const thumbnailLocalPath = req.file?.path
   const preUpdateVideo = await Video.findById(videoId)

   if(!preUpdateVideo)
   {
    throw new ApiError(404, "Video not found")
   }

    if(!preUpdateVideo.owner.equals(req.user._id)) {
      throw new ApiError(403, "You are not authorized to update this video")
    }

  let thumbnail = preUpdateVideo.thumbnail;
  if(thumbnailLocalPath){
   thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

 const publicId = getPublicIdFromUrl(preUpdateVideo.thumbnail)

  if(publicId && thumbnail) {await deleteFromCloudinary(publicId, "image")}
}

 const video = await Video.findOneAndUpdate({  
        _id: videoId,
        owner: req.user._id
    },
    { 
      $set:{
        thumbnail: thumbnail?.url,
        title,
        description
      }
    },{
       returnDocument: 'after'
    }
    
  )

  if(!video){
    throw new ApiError(500, "Error while updating video")
    }


  return res
  .status(200)
  .json( new ApiResponse(200,video,"video updated successfully"))

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!mongoose.isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid videoId")
    }

    const video = await Video.findById(videoId)

    if(!video) {
      throw new ApiError(404, "Video not found")
    }

    if(!video.owner.equals(req.user._id)) {
      throw new ApiError(403, "You are not authorized to delete this video")
    }

    const videoPublicId = getPublicIdFromUrl(video.videoFile)
    const thumbnailPublicId = getPublicIdFromUrl(video.thumbnail)

    if (videoPublicId) await deleteFromCloudinary(videoPublicId, "video")
    if (thumbnailPublicId) await deleteFromCloudinary(thumbnailPublicId, "image")

    const delVideo = await Video.findOneAndDelete({  
        _id: videoId,
        owner: req.user._id
    })

    if(!delVideo)
    {
      throw new ApiError(404, "Video not found or you're not authorized to delete it")
    }

     await Like.deleteMany({ video: videoId })
     await Comment.deleteMany({ video: videoId })
   return res
   .status(200)
   .json( new ApiResponse(200,{},"Video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
     if (!mongoose.isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid videoId")
    }

    const preUpdateVideo = await Video.findById(videoId)
    
    if(!preUpdateVideo) {
      throw new ApiError(404, "Video not found")
    }

    if(!preUpdateVideo.owner.equals(req.user._id)) {
      throw new ApiError(403, "You are not authorized to change the publish status of this video")
    }

    const video = await Video.findByIdAndUpdate(videoId,{ 
      $set:{
        isPublished: !preUpdateVideo.isPublished,
      }
    },{
       returnDocument: 'after'
    })

    return res
    .status(200)
    .json(new ApiResponse(200,video,"published status updated"))

})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
