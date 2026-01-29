import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logError } from "@/lib/errorHandler";

export function useCertificateImageUpload() {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  /**
   * Convert a data URL to a Blob
   */
  const dataUrlToBlob = useCallback((dataUrl: string): Blob => {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }, []);

  /**
   * Upload certificate image from canvas data URL to Supabase storage
   * Returns the public URL of the uploaded image
   */
  const uploadCertificateImage = useCallback(
    async (
      dataUrl: string,
      certificateId: string,
      serialNumber: string
    ): Promise<string | null> => {
      if (!user) {
        toast.error("You must be logged in to upload certificate images");
        return null;
      }

      setUploading(true);

      try {
        const blob = dataUrlToBlob(dataUrl);
        const fileName = `${user.id}/${certificateId}/${serialNumber}.png`;

        const { error: uploadError } = await supabase.storage
          .from("certificate-images")
          .upload(fileName, blob, {
            cacheControl: "3600",
            upsert: true,
            contentType: "image/png",
          });

        if (uploadError) {
          logError(uploadError, "useCertificateImageUpload.upload");
          toast.error("Failed to upload certificate image");
          return null;
        }

        const { data: urlData } = supabase.storage
          .from("certificate-images")
          .getPublicUrl(fileName);

        return urlData.publicUrl;
      } catch (error) {
        logError(error, "useCertificateImageUpload.uploadCertificateImage");
        toast.error("Failed to upload certificate image");
        return null;
      } finally {
        setUploading(false);
      }
    },
    [user, dataUrlToBlob]
  );

  /**
   * Delete a certificate image from storage
   */
  const deleteCertificateImage = useCallback(
    async (certificateId: string, serialNumber: string): Promise<boolean> => {
      if (!user) return false;

      try {
        const fileName = `${user.id}/${certificateId}/${serialNumber}.png`;

        const { error } = await supabase.storage
          .from("certificate-images")
          .remove([fileName]);

        if (error) {
          logError(error, "useCertificateImageUpload.delete");
          return false;
        }

        return true;
      } catch (error) {
        logError(error, "useCertificateImageUpload.deleteCertificateImage");
        return false;
      }
    },
    [user]
  );

  return {
    uploadCertificateImage,
    deleteCertificateImage,
    uploading,
  };
}
