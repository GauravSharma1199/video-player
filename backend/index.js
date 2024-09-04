import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuIdV4 } from "uuid";
import path from "path";
import fs from "fs";
import { exec } from "child_process";


const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  })
);
const fileSourceDir = "../uploads";
// Multer Middleware
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(fileSourceDir)){
        fs.mkdirSync(fileSourceDir, {recursive: true})
    }
    cb(null, fileSourceDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = uuIdV4() + path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix);
  },
});

// Multer Configuration
const upload = multer({ storage: storage });

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); //Watch it
  res.header(
    "Access-Control-Allow-Methods",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(fileSourceDir));

app.get("/", (req, res) => {
  return res.json({
    message: "Hello world",
  });
});

app.post("/upload", upload.single("file"), (req, res) => {
    console.log("File uploaded Successfully");
    
  const lessonId = uuIdV4();
  const videoPath = req.file.path;
  console.log(`video: ${videoPath}`);
  const outputPath = `${fileSourceDir}/courses/${lessonId}`;
  const hlsPath = `${outputPath}/index.m3u8`;
  console.log(`hls: ${hlsPath}`);

  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  // command to convert video to HLS format using ffmpeg

  const ffmpegCommand = `ffmpeg -i ${videoPath} -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 ${hlsPath}`;

  //   run the ffmpeg command, usually run in a separate process through message broker
  exec(ffmpegCommand, (err, stdout, stderr) => {
    if (err) {
      console.error(`exec ${ffmpegCommand} failed`);
      return res.json({
        error: "failed to execute ffmpeg command",
      });
    }
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
    const videoUrl = `http://localhost:3000/uploads/courses/${lessonId}/index.m3u8`;
    return res.json([
        {
          message: "File Uploaded Successfully",
        },
        {
          message: "Video converted to HLS format",
          video: videoUrl,
          lessonId: lessonId,
        },
      ]);
  });

  
});

app.listen(3000, () => {
  console.log("App listening on Port 3000 !!");
});
