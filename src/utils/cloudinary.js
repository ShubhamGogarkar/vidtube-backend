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
          //upload the file on cloudinary
          const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type:"auto"
          })
          //file has been uploaded successfully
          // console.log("file upload successful on cloudinary:", response.url);
          fs.unlinkSync(localFilePath)
          return response;
          

        
      } catch (error) {
        fs.unlinkSync(localFilePath)
        console.log("file upload on cloudinary failed : ", error)
        return null;
      }

    }

    const deleteFromCloudinary = async (publicId, resourceType = "auto") => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      invalidate: true, // Purges cached copies from the CDN
      resource_type: resourceType
    });
    console.log(result); // Returns: { result: 'ok' }
    return true;
  } catch (error) {
    console.error('Deletion failed:', error);
    return false;
  }
};

    export {uploadOnCloudinary, deleteFromCloudinary}