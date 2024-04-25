const express = require("express");
const cors = require("cors");
const sharp = require("sharp");
const fs = require("fs");
const archiver = require("archiver");
const app = express();
const port = 3000;

const multer = require("multer");
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({
  storage: storage,
  limits: { fileSize: 1000 * 1024 * 1024 },
});

// Enable CORS
app.use(cors());

app.use(express.json({ limit: "1000mb" }));
app.use(express.urlencoded({ limit: "1000mb", extended: true }));

// Initialize compression module 
const compression = require('compression'); 
  
// Compress all HTTP responses 
app.use(compression()); 

const myConsole = new console.Console(fs.createWriteStream("./error.txt"));

////////////////////////////////////// ----------------- BULK RESIZE API ------------------- /////////////////////////////////////////////////////////
////////////////////////////////////// ----------------- BULK RESIZE API ------------------- /////////////////////////////////////////////////////////
////////////////////////////////////// ----------------- BULK RESIZE API ------------------- /////////////////////////////////////////////////////////

app.post("/bulk-resize", upload.array("files[]"), async (req, res) => {
  const files = req.files;

  const options = JSON.parse(req.body.options);

  let optimizedImageBuffer_arr = [];

  try {
    var promises = files.map(async function (image, index) {
      const img_info = JSON.parse(req.body[`${index}_img`]);

      const imageBuffer = Buffer.from(image.buffer);

      const new_width = Math.round(
        Math.min(img_info.width * (options.scale / 100))
      );
      const new_height = Math.round(
        Math.min((new_width * img_info.height) / img_info.width)
      );

      switch (options.format) {
        case "jpg":
          await sharp(imageBuffer)
            .resize(new_width, new_height)
            .jpeg({
              quality: options.quality,
            })
            .toBuffer()
            .then((data) => {
              optimizedImageBuffer_arr.push(data);
            })
            .catch(function (err) {
              myConsole.error(err);
            });
          break;
        case "png":
          await sharp(imageBuffer)
            .resize(new_width, new_height)
            .png({ quality: options.quality, effort: 1 })
            .toBuffer()
            .then((data) => {
              optimizedImageBuffer_arr.push(data);
            })
            .catch(function (err) {
              myConsole.error(err);
            });
          break;
        case "webp":
          await sharp(imageBuffer)
            .resize(new_width, new_height)
            .webp({
              quality: options.quality,
              alphaQuality: options.quality,
              effort: 0,
            })
            .toBuffer()
            .then((data) => {
              optimizedImageBuffer_arr.push(data);
            })
            .catch(function (err) {
              myConsole.error(err);
            });
          break;
        case "avif":
          await sharp(imageBuffer)
            .resize(new_width, new_height)
            .avif({ quality: options.quality, effort: 1 })
            .toBuffer()
            .then((data) => {
              optimizedImageBuffer_arr.push(data);
            })
            .catch(function (err) {
              myConsole.error(err);
            });
          break;
        case "tiff":
          await sharp(imageBuffer)
            .resize(new_width, new_height)
            .tiff({
              quality: options.quality,
              compression: "lzw",
              bitdepth: 1,
            })
            .toBuffer()
            .then((data) => {
              optimizedImageBuffer_arr.push(data);
            })
            .catch(function (err) {
              myConsole.error(err);
            });
          break;
        default:
          await sharp(imageBuffer)
            .resize(new_width, new_height)
            .jpeg({ quality: options.quality })
            .toBuffer()
            .then((data) => {
              optimizedImageBuffer_arr.push(data);
            })
            .catch(function (err) {
              myConsole.error(err);
            });
          break;
      }
    });

    Promise.all(promises).then(function () {
      let count = 0;
      // let final_base64_str = "";
      fs.mkdir("temp", (error) => {
        if (error) {
          myConsole.log(error);
        } else {
          optimizedImageBuffer_arr.forEach(async (chunk, i) => {
            fs.appendFile(
              `temp/${i}_img.${options.format}`,
              Buffer.from(chunk),
              function (err) {
                if (err) {
                  myConsole.log(err);
                } else {
                  // console.log(chunk.length);
                }
              }
            );
            count++;

            if (count == optimizedImageBuffer_arr.length) {
              await zipDirectory("temp/", "target.zip");
              const final_base64_str = fs.readFileSync("target.zip", {
                encoding: "base64",
              });

              res.setHeader("Content-Type", "application/json");
              res.send({ data: final_base64_str });

              fs.rmSync("temp/", { recursive: true, force: true });
              fs.unlinkSync("target.zip");
            }
          });
        }
      });
    });
  } catch (error) {
    myConsole.log(error);
  }
});

function zipDirectory(sourceDir, outPath) {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const stream = fs.createWriteStream(outPath);

  return new Promise((resolve, reject) => {
    archive
      .directory(sourceDir, false)
      .on("error", (err) => reject(err))
      .pipe(stream);

    stream.on("close", () => resolve());
    archive.finalize();
  });
}

////////////////////////////////////// ----------------- OPTIMIZE IMAGE API ------------------- /////////////////////////////////////////////////////////
////////////////////////////////////// ----------------- OPTIMIZE IMAGE API ------------------- /////////////////////////////////////////////////////////
////////////////////////////////////// ----------------- OPTIMIZE IMAGE API ------------------- /////////////////////////////////////////////////////////

app.post("/optimize-image", async (req, res) => {
  try {
    const { imageData, options } = req.body;

    const imageBuffer = Buffer.from(imageData, "base64");

    let optimizedImageBuffer;

    switch (options.format) {
      case "jpg":
        optimizedImageBuffer = await sharp(imageBuffer)
          .resize(options.width, options.height)
          .jpeg({
            quality: options.quality,
          })
          .toBuffer();
        break;
      case "png":
        optimizedImageBuffer = await sharp(imageBuffer)
          .resize(options.width, options.height)
          .png({ quality: options.quality, effort: 1 })
          .toBuffer();
      case "webp":
        optimizedImageBuffer = await sharp(imageBuffer)
          .resize(options.width, options.height)
          .webp({
            quality: options.quality,
            alphaQuality: options.quality,
            effort: 0,
            smartSubsample: true,
          })
          .sharpen()
          .toBuffer();
        break;
      case "avif":
        optimizedImageBuffer = await sharp(imageBuffer)
          .resize(options.width, options.height)
          .avif({ quality: options.quality, effort: 0 })
          .toBuffer();
        break;
      case "tiff":
        optimizedImageBuffer = await sharp(imageBuffer)
          .resize(options.width, options.height)
          .tiff({ quality: options.quality, compression: "lzw", bitdepth: 1 })
          .toBuffer();
        break;

      default:
        optimizedImageBuffer = await sharp(imageBuffer)
          .resize(options.width, options.height)
          .jpeg({ quality: options.quality })
          .toBuffer();
        break;
    }

    // Set appropriate response headers
    res.setHeader("Content-Type", "application/json");
    // res.setHeader("Content-Length", optimizedImageBuffer.byteLength);

    res.send({ data: optimizedImageBuffer.toString("base64") });
  } catch (error) {
    console.error("Error optimizing image:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

const server = app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

server.timeout = 6000000;
