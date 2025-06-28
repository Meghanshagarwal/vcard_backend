const express = require("express");
const serverless = require("serverless-http");
const cors = require("cors");
const multer = require("multer");
const XLSX = require("xlsx");
const Papa = require("papaparse");
const { nanoid } = require("nanoid");
const { MongoClient } = require("mongodb");

const upload = multer({ storage: multer.memoryStorage() });
const app = express();

app.use(cors());
app.use(express.json());

function parseCSV(buffer) {
  const csvText = buffer.toString("utf-8");
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  return {
    data: result.data,
    headers: result.meta.fields || [],
    errors: result.errors?.map((e) => e.message) || [],
  };
}

function parseExcel(buffer) {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length === 0) return { data: [], headers: [], errors: ["Empty file"] };

    const headers = jsonData[0].map((h) => String(h || "").trim()).filter((h) => h);
    const data = jsonData.slice(1).filter(row => row.some(cell => cell)).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || "";
      });
      return obj;
    });

    return { data, headers, errors: [] };
  } catch (error) {
    return { data: [], headers: [], errors: [error.message] };
  }
}

async function connectToMongo() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  return client.db("vcards_icul");
}

app.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const fileExtension = req.file.originalname.split(".").pop().toLowerCase();
    let parseResult;

    if (fileExtension === "csv") {
      parseResult = parseCSV(req.file.buffer);
    } else if (["xlsx", "xls"].includes(fileExtension)) {
      parseResult = parseExcel(req.file.buffer);
    } else {
      return res.status(400).json({ error: "Unsupported file format" });
    }

    if (parseResult.errors.length > 0) {
      return res.status(400).json({ error: "File parsing failed", details: parseResult.errors });
    }

    if (parseResult.data.length === 0) {
      return res.status(400).json({ error: "No valid data found in file" });
    }

    const batchId = nanoid();
    const db = await connectToMongo();

    await db.collection("batches").insertOne({
      batchId,
      fileName: req.file.originalname,
      totalContacts: parseResult.data.length,
      processedContacts: 0,
      status: "uploaded",
      rawData: JSON.stringify(parseResult.data),
      createdAt: new Date(),
    });

    res.json({
      batchId,
      headers: parseResult.headers,
      preview: parseResult.data.slice(0, 5),
      totalContacts: parseResult.data.length,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = serverless(app);
