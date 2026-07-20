import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"



 cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME ,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET ,
    }); 




    const uploadOnCloudinary = async (localFilePath) => {

      try {
          if(!localFilePath) return null
         
          const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type:"auto"
          })
        
          fs.unlinkSync(localFilePath)
          return response;
          

        
      } catch (error) {
        fs.unlinkSync(localFilePath)
        console.error("file upload on cloudinary failed : ", error)
        return null;
      }

    }

    const deleteFromCloudinary = async (publicId, resourceType = "auto") => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
      resource_type: resourceType
    });
    return true;
  } catch (error) {
    console.error('Deletion failed:', error);
    return false;
  }
};

const getPublicIdFromUrl = (url) => {
 try {
  const parts = url.split('/upload/');
  if (parts.length < 2) return null;

 
  const remainingPath = parts[1].replace(/^v\d+\//, '');

 
  const publicId = remainingPath.substring(0, remainingPath.lastIndexOf('.'));
  
  return publicId;
  
 } catch (error) {
  console.error("error while getting publicId from url to delete image:",error)
  return null
 }
  
};

    export {uploadOnCloudinary, deleteFromCloudinary, getPublicIdFromUrl}