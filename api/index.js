const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const Minio = require('minio');

const app = express();

// إجبار السيرفر على قبول جميع الطلبات من أي مكان
app.use(cors({ origin: '*' }));
app.use(express.json());

// إعدادات Minio
const minioClient = new Minio.Client({
    endPoint: 'fra1.digitaloceanspaces.com',
    port: 443,
    useSSL: true,
    accessKey: 'DO00MJCWX3PM6T32ER2F',
    secretKey: 'QQYAbxncIiO71vdreKqgTAraEjmIxsFok+r0eq3L5lo'
});

// 🟢 مسار فحص السيرفر (Test Endpoint)
app.get('/api/test', (req, res) => {
    res.status(200).json({ success: true, message: "السيرفر شغال والـ CORS مفتوح بنجاح! 🚀" });
});

// 🔴 مسار التحميل
app.post('/api/download', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: "الرجاء إرسال رابط يوتيوب" });

        console.log("1. جاري جلب معلومات الفيديو...");
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title;

        console.log(`2. اسم الأغنية: ${title} - جاري سحب الصوت...`);
        const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
        
        const randomStr = Math.random().toString(36).substring(2, 15);
        const fileName = `songs/${Date.now()}_${randomStr}.mp3`;

        console.log("3. جاري الرفع إلى مساحة Minio...");
        await minioClient.putObject('athar-assets', fileName, stream, {
            'x-amz-acl': 'public-read',
            'Content-Type': 'audio/mpeg'
        });

        const finalUrl = `https://athar-assets.fra1.digitaloceanspaces.com/${fileName}`;
        console.log("4. تمت العملية بنجاح! الرابط:", finalUrl);

        res.status(200).json({ success: true, url: finalUrl, title: title });
    } catch (error) {
        console.error("❌ حدث خطأ:", error.message);
        // إرجاع الخطأ الحقيقي للمتصفح حتى نعرف المشكلة
        res.status(500).json({ error: error.message || "حدث خطأ داخلي في السيرفر" });
    }
});

module.exports = app;