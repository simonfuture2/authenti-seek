import React, { useCallback } from "react";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  onFilesSelected: (files: File[]) => void;
  uploading?: boolean;
  uploadProgress?: number;
  maxImages?: number;
  className?: string;
}

export function ImageUpload({
  images,
  onImagesChange,
  onFilesSelected,
  uploading = false,
  uploadProgress = 0,
  maxImages = 5,
  className,
}: ImageUploadProps) {
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const remainingSlots = maxImages - images.length;
      const filesToUpload = files.slice(0, remainingSlots);

      if (filesToUpload.length > 0) {
        onFilesSelected(filesToUpload);
      }

      // Reset input
      e.target.value = "";
    },
    [images.length, maxImages, onFilesSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith("image/")
      );
      const remainingSlots = maxImages - images.length;
      const filesToUpload = files.slice(0, remainingSlots);

      if (filesToUpload.length > 0) {
        onFilesSelected(filesToUpload);
      }
    },
    [images.length, maxImages, onFilesSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const removeImage = useCallback(
    (index: number) => {
      const newImages = images.filter((_, i) => i !== index);
      onImagesChange(newImages);
    },
    [images, onImagesChange]
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Area */}
      {images.length < maxImages && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={cn(
            "relative border-2 border-dashed rounded-lg p-6 transition-colors",
            "border-border hover:border-primary/50 hover:bg-primary/5",
            uploading && "pointer-events-none opacity-50"
          )}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center gap-2 text-center">
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
                <Progress value={uploadProgress} className="w-full max-w-xs" />
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drag & drop images or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Max {maxImages} images • PNG, JPG, WEBP
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((url, index) => (
            <div
              key={url}
              className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted group"
            >
              <img
                src={url}
                alt={`Product image ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(index)}
              >
                <X className="h-3 w-3" />
              </Button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-xs text-white truncate">Image {index + 1}</p>
              </div>
            </div>
          ))}

          {/* Add More Button */}
          {images.length < maxImages && !uploading && (
            <label className="relative aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Add more</span>
            </label>
          )}
        </div>
      )}

      {/* Image count indicator */}
      <p className="text-xs text-muted-foreground text-right">
        {images.length} / {maxImages} images
      </p>
    </div>
  );
}
