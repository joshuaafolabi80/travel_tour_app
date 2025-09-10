// src/utils/cloudinary.js
export const getCloudinaryImageUrl = (imageName, folder = 'destinations') => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  
  if (!cloudName) {
    throw new Error('Cloudinary cloud name is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME in your environment variables.');
  }
  
  return `https://res.cloudinary.com/${cloudName}/image/upload/${folder}/${imageName}`;
};