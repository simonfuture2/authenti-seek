import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { user } = useAuth();

  const uploadImages = async (files: File[]): Promise<string[]> => {
    if (!user) {
      toast.error("You must be logged in to upload images");
      return [];
    }

    setUploading(true);
    setUploadProgress(0);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);

        uploadedUrls.push(urlData.publicUrl);
        setUploadProgress(((i + 1) / files.length) * 100);
      }

      if (uploadedUrls.length > 0) {
        toast.success(`${uploadedUrls.length} image(s) uploaded successfully`);
      }

      return uploadedUrls;
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload images");
      return [];
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteImage = async (url: string): Promise<boolean> => {
    try {
      // Extract the path from the URL
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/product-images/");
      if (pathParts.length < 2) return false;

      const filePath = pathParts[1];

      const { error } = await supabase.storage
        .from("product-images")
        .remove([filePath]);

      if (error) {
        console.error("Delete error:", error);
        toast.error("Failed to delete image");
        return false;
      }

      toast.success("Image deleted");
      return true;
    } catch (error) {
      console.error("Delete error:", error);
      return false;
    }
  };

  return {
    uploadImages,
    deleteImage,
    uploading,
    uploadProgress,
  };
}
