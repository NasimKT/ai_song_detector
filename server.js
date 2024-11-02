// server.mjs
import express from "express";
import axios from "axios";
import fs from "fs";
import path from "path";
import multer from "multer";
import cors from "cors";

const client_id = "10e600ca-ef26-48d4-86c6-20beed620ce0";
const client_secret = "a7hsTd7SlErZdoUU86lDMrFcE1KSszM-KRjLe-tIBLA";
const auth_url = "https://api.ircamamplify.io/oauth/token";
const manager_url = "https://storage.ircamamplify.io/manager/";
const storage_url = "https://storage.ircamamplify.io";
const aiDetectorUrl = "https://api.ircamamplify.io/aidetector/";

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for frontend requests
app.use(cors());

// Multer setup for file uploads
const upload = multer({ dest: "uploads/" });

// Function to get authentication token
const getAuthToken = async () => {
    const payload = { client_id, client_secret, grant_type: "client_credentials" };
    const authResponse = await axios.post(auth_url, payload);
    return authResponse.data.id_token;
};

app.post("/api/upload-audio", upload.single("audioFile"), async (req, res) => {
    let id_token;
    try {
        // Step 1: Get Authentication Token
        console.log("Requesting authentication token...");
        id_token = await getAuthToken();
        console.log("Authentication successful. ID Token:", id_token);

        const headers = { Authorization: `Bearer ${id_token}` };

        // Step 2: Create a new IAS object
        console.log("Creating IAS object...");
        const managerResponse = await axios.post(manager_url, {}, { headers });
        const ias_id = managerResponse.data.id;
        console.log("IAS object created with ID:", ias_id);

        // Step 3: Upload the Local File to the IAS Object
        const filePath = path.resolve(req.file.path);
        const fileSize = fs.statSync(filePath).size;
        const headersForUpload = {
            Authorization: `Bearer ${id_token}`,
            "Content-Type": "application/octet-stream",
            "Content-Length": fileSize,
        };
        const put_url = `${storage_url}/${ias_id}/${req.file.originalname}`;
        console.log("Uploading file to:", put_url);

        const fileStream = fs.createReadStream(filePath);
        await axios.put(put_url, fileStream, { headers: headersForUpload });
        console.log("File uploaded successfully.");

        // Step 4: Retrieve the IAS URL
        console.log("Retrieving IAS URL...");
        const iasResponse = await axios.get(`${manager_url}${ias_id}`, { headers });
        const ias_url = iasResponse.data.ias;
        console.log("IAS URL:", ias_url);

        // Step 5: Check if the audio is AI-generated
        console.log("Checking if audio is AI-generated...");
        const aiResponse = await axios.post(aiDetectorUrl, { audioUrlList: [ias_url] }, { headers });
        const jobId = aiResponse.data.id;
        console.log("AI detection job created. Job ID:", jobId);

        // Step 6: Poll for job completion status
        let processStatus = null;
        let jobInfo = null; // Initialize jobInfo to capture job details
        while (processStatus !== "success" && processStatus !== "error") {
            console.log("Polling for job status...");
            await new Promise(r => setTimeout(r, 5000));
            const statusResponse = await axios.get(`${aiDetectorUrl}/${jobId}`, { headers });
            jobInfo = statusResponse.data.job_infos; // Save job information
            processStatus = jobInfo.job_status;
            console.log("Job status:", processStatus);
        }

        const report = jobInfo.report_info.report;
        console.log("AI Detection Report:", report);

        // Respond with the detection result
        res.json({ ias_url, aiReport: report.resultList[0] });
    } catch (error) {
        console.error("Error in backend:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "An error occurred during IAS URL creation or AI detection." });
    } finally {
        if (req.file) fs.unlinkSync(req.file.path); // Clean up the uploaded file
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
