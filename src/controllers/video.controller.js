import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {Comment} from "../models/comment.model.js"
import {User} from "../models/user.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {deleteFromCloudinary, uploadOnCloudinary, } from "../utils/cloudinary.js"

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
    if (!mongoose.isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid videoId")
    }

    const video = await Video.findById(videoId).populate("owner","username avatar fullName")
    
    if(!video){
    throw new ApiError(500, "error while fetching the video")
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
    //TODO: update video details like title, description, thumbnail
   const {title, description} = req.body

   const thumbnailLocalPath = req.file?.path
   const preUpdateVideo = await Video.findById(videoId)
  let thumbnail = preUpdateVideo.thumbnail;
  if(thumbnailLocalPath){
   thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

 const publicId = getPublicIdFromUrl(preUpdateVideo.thumbnail)

  if(publicId && thumbnail) {await deleteFromCloudinary(publicId)}
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
    //TODO: delete video
    const video = await Video.findById(videoId)


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
