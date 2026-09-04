import { useState, useEffect } from "react";
import { Trash2, Upload, Save, X, ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface GalleryPhotoItem {
  id: string;
  photo_url: string;
  caption?: string | null;
  created_at?: string;
}

interface GalleryManagerModalProps {
  photo: GalleryPhotoItem;
  userId: string;
  open: boolean;
  onClose: () => void;
  onPhotoUpdated: (updatedPhoto: GalleryPhotoItem) => void;
  onPhotoDeleted: (photoId: string) => void;
}

export const GalleryManagerModal = ({
  photo,
  userId,
  open,
  onClose,
  onPhotoUpdated,
  onPhotoDeleted,
}: GalleryManagerModalProps) => {
  const [caption, setCaption] = useState<string>(photo.caption || "");
  const [savingCaption, setSavingCaption] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setCaption(photo.caption || "");
  }, [photo]);

  // Extract storage path from public URL if valid, e.g. userId/gallery/filename.jpg
  const getStoragePathFromUrl = (url: string) => {
    try {
      const parts = url.split("business-assets/");
      if (parts.length > 1) return parts[1];
    } catch {
      // fallback
    }
    return null;
  };

  const handleSaveCaption = async () => {
    setSavingCaption(true);
    try {
      const { error } = await supabase
        .from("gallery_photos")
        .update({ caption: caption.trim() || null })
        .eq("id", photo.id);

      if (error) {
        toast.error("Failed to update caption: " + error.message);
        return;
      }

      onPhotoUpdated({ ...photo, caption: caption.trim() || null });
      toast.success("Caption saved!");
    } catch (err: any) {
      toast.error("Failed to save caption: " + (err.message || "Unknown error"));
    } finally {
      setSavingCaption(false);
    }
  };

  const handleReplacePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReplacing(true);
    const toastId = toast.loading("Replacing photo...");

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const newPath = `${userId}/gallery/${Date.now()}.${ext}`;

      // 1. Upload new image first
      const { error: uploadErr } = await supabase.storage
        .from("business-assets")
        .upload(newPath, file, { upsert: true });

      if (uploadErr) {
        toast.dismiss(toastId);
        toast.error("Upload failed: " + uploadErr.message);
        setReplacing(false);
        e.target.value = "";
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("business-assets").getPublicUrl(newPath);
      const newUrl = publicUrlData.publicUrl;

      // 2. Update database row
      const { error: dbErr } = await supabase
        .from("gallery_photos")
        .update({ photo_url: newUrl })
        .eq("id", photo.id);

      if (dbErr) {
        toast.dismiss(toastId);
        toast.error("Database update failed: " + dbErr.message);
        setReplacing(false);
        e.target.value = "";
        return;
      }

      // 3. Update local state
      onPhotoUpdated({ ...photo, photo_url: newUrl });
      toast.dismiss(toastId);
      toast.success("Photo replaced!");

      // 4. Safely remove old storage object if path exists
      const oldStoragePath = getStoragePathFromUrl(photo.photo_url);
      if (oldStoragePath) {
        await supabase.storage.from("business-assets").remove([oldStoragePath]);
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error("Replace failed: " + (err.message || "Unknown error"));
    } finally {
      setReplacing(false);
      e.target.value = "";
    }
  };

  const handleDeletePhoto = async () => {
    setDeleting(true);
    const toastId = toast.loading("Deleting photo...");

    try {
      // 1. Delete DB row first
      const { error: dbErr } = await supabase
        .from("gallery_photos")
        .delete()
        .eq("id", photo.id);

      if (dbErr) {
        toast.dismiss(toastId);
        toast.error("Delete failed: " + dbErr.message);
        setDeleting(false);
        return;
      }

      // 2. Safely remove storage object
      const storagePath = getStoragePathFromUrl(photo.photo_url);
      if (storagePath) {
        await supabase.storage.from("business-assets").remove([storagePath]);
      }

      // 3. Update local state and close
      onPhotoDeleted(photo.id);
      toast.dismiss(toastId);
      toast.success("Photo deleted!");
      onClose();
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error("Delete failed: " + (err.message || "Unknown error"));
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-3xl max-w-md p-5 sm:p-6 overflow-hidden">
        <DialogHeader className="border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" />
            <DialogTitle className="text-base font-bold text-foreground">
              Manage Gallery Photo
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground text-left mt-0.5">
            View, replace, or update captions for this photo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Full Image Preview */}
          <div className="aspect-square w-full rounded-2xl overflow-hidden bg-secondary border border-border relative">
            <img src={photo.photo_url} alt="" className="w-full h-full object-cover" />
          </div>

          {/* Caption Input */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">
              Caption (Optional)
            </Label>
            <div className="flex gap-2">
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption, e.g. Signature Fade Haircut..."
                className="h-11 rounded-xl bg-secondary border-0 text-xs flex-1"
              />
              <Button
                type="button"
                onClick={handleSaveCaption}
                disabled={savingCaption || caption === (photo.caption || "")}
                className="h-11 rounded-xl font-bold text-xs gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {savingCaption ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>

          {/* Action buttons (Replace & Delete) */}
          <div className="flex gap-3 pt-2 border-t border-border">
            <label className="flex-1 h-11 rounded-xl text-xs font-bold bg-secondary border border-border text-foreground hover:bg-secondary/80 flex items-center justify-center gap-1.5 cursor-pointer tap-scale">
              <Upload className="w-3.5 h-3.5 text-primary" />
              {replacing ? "Replacing…" : "Replace Photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={replacing || deleting}
                onChange={handleReplacePhoto}
              />
            </label>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting || replacing}
              onClick={handleDeletePhoto}
              className="flex-1 h-11 rounded-xl font-bold text-xs gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleting ? "Deleting…" : "Delete Photo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
