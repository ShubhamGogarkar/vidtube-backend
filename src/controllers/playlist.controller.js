import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {User} from "../models/user.model.js"
import {Video} from "../models/video.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    if(!name || !description) {
        throw new ApiError(400, "Name and description are required")
    }

    const trimmedName = name.trim()
    const trimmedDescription = description.trim()

    if(trimmedName.length < 3 || trimmedName.length > 50) {
        throw new ApiError(400, "Playlist name must be between 3 and 50 characters")
    }

    if(trimmedDescription.length < 3 || trimmedDescription.length > 200) {
        throw new ApiError(400, "Playlist description must be between 3 and 200 characters")
    }

    const playlist = await Playlist.create({
        name: trimmedName,
        description: trimmedDescription,
        owner: req.user._id
    })

    return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created successfully"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params


    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id")
    }

    const user = await User.findById(userId)
    if (!user) {
        throw new ApiError(404, "User not found")
    }

    const playlists = await Playlist.aggregate([
    {
        $match: { owner: new mongoose.Types.ObjectId(userId) }
    },
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
                        avatar: 1
                    }
                }
            ]
        }
    },
    {
        $addFields: {
            totalVideos: { $size: "$video" }
        }
    }
    ])
    
    return res
        .status(200)
        .json(new ApiResponse(200, playlists, "User playlists fetched successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

      if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    const playlist = await Playlist.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(playlistId) }
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
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: { $first: "$owner" }
                        }
                    },
                    {
                        $project: {
                            thumbnail: 1,
                            title: 1,
                            duration: 1,
                            views: 1,
                            owner: 1
                        }
                    }
                ]
            }
        },
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
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: { $first: "$owner" }
            }
        }
    ])
    if (!playlist[0]) {
        throw new ApiError(404, "Playlist not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist[0], "Playlist fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist id or video id")
    }

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You don't have permission to modify this playlist")
    }

    if (playlist.video.some((v) => v.toString() === videoId)) {
        throw new ApiError(400, "Video already exists in the playlist")
    }

    playlist.video.push(videoId)
    await playlist.save()

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Video added to playlist successfully"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
   
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist id or video id")
    }

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You don't have permission to modify this playlist")
    }

    if (!playlist.video.some((v) => v.toString() === videoId)) {
        throw new ApiError(400, "Video does not exist in the playlist")
    }

    playlist.video = playlist.video.filter((v) => v.toString() !== videoId)
    await playlist.save()

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Video removed from playlist successfully"))
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You don't have permission to delete this playlist")
    }

    await Playlist.findByIdAndDelete(playlistId)

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Playlist deleted successfully"))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body

    if(!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }
    
    if (!name && !description) {
    throw new ApiError(400, "At least one of name or description is required")
    }
    
    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You don't have permission to update this playlist")
    }

    if(name) {
        const trimmedName = name.trim()
        if(trimmedName.length < 3 || trimmedName.length > 50) {
            throw new ApiError(400, "Playlist name must be between 3 and 50 characters")
        }
        playlist.name = trimmedName
    }

    if(description) {
        const trimmedDescription = description.trim()
        if(trimmedDescription.length < 3 || trimmedDescription.length > 200) {
            throw new ApiError(400, "Playlist description must be between 3 and 200 characters")
        }
        playlist.description = trimmedDescription
    }

    await playlist.save()

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist updated successfully"))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
