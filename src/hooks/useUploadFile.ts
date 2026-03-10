import { useMutation } from "@tanstack/react-query";
import { BlossomUploader } from '@nostrify/nostrify/uploaders';

import { useCurrentUser } from "./useCurrentUser";
import { useAppContext } from "./useAppContext";

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

      // Ensure trailing slash for Blossom server URL
      const serverUrl = config.blossomServer.endsWith('/')
        ? config.blossomServer
        : config.blossomServer + '/';

      const uploader = new BlossomUploader({
        servers: [serverUrl],
        signer: user.signer,
      });

      const tags = await uploader.upload(file);
      return tags;
    },
  });
}
