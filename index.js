const express = require("express");
const aws = require("aws-sdk");
const multer = require("multer");
const fs = require("fs");
require("dotenv").config();

const app = express();
const s3 = new aws.S3();

app.use(express.json());

const upload = multer({ dest: "./uploads" });

// get data stored from s3
app.get("*", async (req, res) => {
  let filename = req.path.slice(1);

  try {
    let s3File = await s3
      .getObject({
        Bucket: process.env.BUCKET,
        Key: filename,
      })
      .promise();

    res.set("Content-type", s3File.ContentType);
    res.send(s3File.Body.toString()).end();
  } catch (error) {
    if (error.code === "NoSuchKey") {
      console.log(`No such key ${filename}`);
      res.sendStatus(404).end();
    } else {
      console.log(error);
      res.sendStatus(500).end();
    }
  }
});

//put the file in cloud
app.put("*", upload.single("image"), async (req, res) => {
  let filename = req.file;
  let filepath = req.file.path;

  const data = await s3
    .upload({
      Body: fs.createReadStream(filepath),
      Bucket: process.env.BUCKET,
      Key: filename,
    })
    .promise();

  fs.unlinkSync(filepath);

  res.status(200).json({ msg: data });
});

// post image just experimenting
app.post("*", upload.single("image"), (req, res) => {
  //   const data = req.path.slice(1);
  //   console.log(req.body);
  const { name } = req.body;
  console.log(name);
  console.log(req.file.originalname);
  res.send({ msg: req.file.path });
  fs.unlinkSync(req.file.path);
});

// curl -i -XDELETE https://some-app.cyclic.app/myFile.txt
app.delete("*", async (req, res) => {
  let filename = req.path.slice(1);

  await s3
    .deleteObject({
      Bucket: process.env.BUCKET,
      Key: filename,
    })
    .promise();

  res.set("Content-type", "text/plain");
  res.send("ok").end();
});

// start server
app.listen(8080, () => {
  console.log("Server Stated");
});
