const path = require("path");
const Client = require("ssh2-sftp-client");
const crypto = require("crypto");
const fs = require("fs").promises;

const getUploadPath = (baseDir, fileType) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.toLocaleString("default", { month: "long" });
  return `${baseDir}/${year}/${month}`;
};

class UploadController {
  static async uploadMediaFile(req, res) {
    try {
      const uploadedFile = req.file;
      if (!uploadedFile) {
        return res.status(400).json({
          status: "error",
          message: "No files were uploaded.",
        });
      }

      const uniqueSuffix =
        Date.now() + "-" + crypto.randomBytes(4).toString("hex");
      const originalName = path.parse(uploadedFile.originalname).name;
      const extension = path.extname(uploadedFile.originalname);
      const uniqueFilename = `${originalName}-${uniqueSuffix}${extension}`;

      const uploadPath = getUploadPath("/home/cloud/upload_images", "images");
      const remoteFilePath = `${uploadPath}/${uniqueFilename}`;

      const sftp = new Client();
      await sftp.connect({
        host: "172.17.42.177",
        port: "22",
        username: "cloud",
        password: "Myrep123!",
      });

      try {
        await sftp.mkdir(uploadPath, true);
        await sftp.put(uploadedFile.buffer, remoteFilePath);
      } catch (error) {
        console.error("SFTP Error:", error);
        throw new Error("Gagal mengunggah file ke server");
      } finally {
        sftp.end();
      }

      const now = new Date();
      const year = now.getFullYear();
      const month = now.toLocaleString("default", { month: "long" });
      const fileUrl = `https://mfs-storage.gslb.oss.myrepublic.co.id/images/${year}/${month}/${uniqueFilename}`;

      return {
        status: "success",
        imageUrl: fileUrl,
        fileName: uniqueFilename,
      };
    } catch (err) {
      console.error("Error uploading media file:", err);
      throw new Error(err.message || "Gagal mengunggah file media");
    }
  }

  static async uploadDocumentFile(req, res) {
    try {
      const uploadedFile = req.file;
      if (!uploadedFile) {
        return res.status(400).json({
          status: "error",
          message: "No files were uploaded.",
        });
      }

      const uniqueSuffix =
        Date.now() + "-" + crypto.randomBytes(4).toString("hex");
      const originalName = path.parse(uploadedFile.originalname).name;
      const extension = path.extname(uploadedFile.originalname);
      const uniqueFilename = `${originalName}-${uniqueSuffix}${extension}`;

      const uploadPath = getUploadPath(
        "/home/cloud/upload_document",
        "document"
      );
      const remoteFilePath = `${uploadPath}/${uniqueFilename}`;

      const sftp = new Client();
      await sftp.connect({
        host: "172.17.42.177",
        port: "22",
        username: "cloud",
        password: "Myrep123!",
      });

      try {
        await sftp.mkdir(uploadPath, true);
        await sftp.put(uploadedFile.buffer, remoteFilePath);
      } catch (error) {
        console.error("SFTP Error:", error);
        throw new Error("Gagal mengunggah file ke server");
      } finally {
        sftp.end();
      }

      const now = new Date();
      const year = now.getFullYear();
      const month = now.toLocaleString("default", { month: "long" });
      const fileUrl = `https://mfs-storage.gslb.oss.myrepublic.co.id/document/${year}/${month}/${uniqueFilename}`;

      return {
        status: "success",
        imageUrl: fileUrl,
        fileName: uniqueFilename,
      };
    } catch (err) {
      console.error("Error uploading document file:", err);
      throw new Error(err.message || "Gagal mengunggah dokumen");
    }
  }

  static async handleImageUpload(req, res, imageType) {
    try {
      const uploadedFile = req.file;
      if (!uploadedFile) {
        return res.status(400).send("No files were uploaded.");
      }

      const uniqueSuffix =
        Date.now() + "-" + crypto.randomBytes(4).toString("hex");
      const originalName = path.parse(uploadedFile.originalname).name;
      const extension = path.extname(uploadedFile.originalname);
      const uniqueFilename = `${imageType}-${originalName}-${uniqueSuffix}${extension}`;

      const uploadPath = getUploadPath("/home/cloud/upload_images", "images");
      const remoteFilePath = `${uploadPath}/${uniqueFilename}`;

      const sftp = new Client();
      await sftp.connect({
        host: "172.17.42.177",
        port: "22",
        username: "cloud",
        password: "Myrep123!",
      });

      await sftp.mkdir(uploadPath, true);
      await sftp.put(uploadedFile.buffer, remoteFilePath);

      sftp.end();

      const now = new Date();
      const year = now.getFullYear();
      const month = now.toLocaleString("default", { month: "long" });
      const imageUrl = `https://mfs-storage.gslb.oss.myrepublic.co.id/images/${year}/${month}/${uniqueFilename}`;
      // const imageUrl = `https://ma-storage.oss.myrepublic.co.id/images/${year}/${month}/${uniqueFilename}`;

      let responseKey;
      switch (imageType) {
        case "file":
          responseKey = "file";
          break;
        default:
          responseKey = "imageUrl";
      }

      res.send({ message: "File berhasil diunggah", [responseKey]: imageUrl });
    } catch (err) {
      console.error(`Error uploading ${imageType} image:`, err);
      res
        .status(500)
        .send(`An error occurred while uploading the ${imageType} image.`);
    }
  }

  static async uploadImageFile(req, res) {
    await UploadController.handleImageUpload(req, res, "file");
  }
}

module.exports = UploadController;
