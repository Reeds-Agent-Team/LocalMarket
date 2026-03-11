import { useMutation } from "@tanstack/react-query";
import { BlossomUploader } from '@nostrify/nostrify/uploaders';

import { useCurrentUser } from "./useCurrentUser";
import { useAppContext } from "./useAppContext";
import { compressImage } from "@/lib/compressImage";

export function useUploadFile() {
  const { user } = useCurrentUser();
  const { config } = useAppContext();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) {
        throw new Error('Must be logged in to upload files');
      }

      if (!config.blossomServer) {
        throw new Error(
          'No media server configured. Scan your market QR code to connect.'
        );
      }

      // Compress before upload — phone photos can be 8MB+, compress to ~300KB
      const compressed = await compressImage(file);

      // Ensure trailing slash for Blossom server URL
      const serverUrl = config.blossomServer.endsWith('/')
        ? config.blossomServer
        : config.blossomServer + '/';

      const uploader = new BlossomUploader({
        servers: [serverUrl],
        signer: user.signer,
      });

      const tags = await uploader.upload(compressed);
      return tags;
    },
  });
}
