import express from "express";
import axios from "axios";
import fs from "fs";
import path from "path";
import multer from "multer";
import cors from "cors";

const client_id = "";
const client_secret = "";
const auth_url = "https://api.ircamamplify.io/oauth/token";
const manager_url = "https://storage.ircamamplify.io/manager/";
const storage_url = "https://storage.ircamamplify.io";
const aiDetectorUrl = "https://api.ircamamplify.io/aidetector/";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

const upload = multer({ dest: "uploads/" });

const getAuthToken = async () => {
    const payload = { client_id, client_secret, grant_type: "client_credentials" };
    const authResponse = await axios.post(auth_url, payload);
    return authResponse.data.id_token;
};

app.post("/api/upload-audio", upload.single("audioFile"), async (req, res) => {
    let id_token;
    try {
        console.log("Requesting authentication token...");
        id_token = await getAuthToken();
        console.log("Authentication successful. ID Token:", id_token);

        const headers = { Authorization: `Bearer ${id_token}` };

        console.log("Creating IAS object...");
        const managerResponse = await axios.post(manager_url, {}, { headers });
        const ias_id = managerResponse.data.id;
        console.log("IAS object created with ID:", ias_id);

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

        console.log("Retrieving IAS URL...");
        const iasResponse = await axios.get(`${manager_url}${ias_id}`, { headers });
        const ias_url = iasResponse.data.ias;
        console.log("IAS URL:", ias_url);

        console.log("Checking if audio is AI-generated...");
        const aiResponse = await axios.post(aiDetectorUrl, { audioUrlList: [ias_url] }, { headers });
        const jobId = aiResponse.data.id;
        console.log("AI detection job created. Job ID:", jobId);

        let processStatus = null;
        let jobInfo = null;
        while (processStatus !== "success" && processStatus !== "error") {
            console.log("Polling for job status...");
            await new Promise(r => setTimeout(r, 5000));
            const statusResponse = await axios.get(`${aiDetectorUrl}/${jobId}`, { headers });
            jobInfo = statusResponse.data.job_infos;
            processStatus = jobInfo.job_status;
            console.log("Job status:", processStatus);
        }

        const report = jobInfo.report_info.report;
        console.log("AI Detection Report:", report);

        res.json({ ias_url, aiReport: report.resultList[0] });
    } catch (error) {
        console.error("Error in backend:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "An error occurred during IAS URL creation or AI detection." });
    } finally {
        if (req.file) fs.unlinkSync(req.file.path);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
